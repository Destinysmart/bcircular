-- 1. merchants: add merchant_code
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS merchant_code text UNIQUE;

UPDATE public.merchants
SET merchant_code = 'mer_' || encode(gen_random_bytes(6), 'hex')
WHERE merchant_code IS NULL;

ALTER TABLE public.merchants
  ALTER COLUMN merchant_code SET DEFAULT ('mer_' || encode(gen_random_bytes(6), 'hex'));

-- 2. earners: add earner_code
ALTER TABLE public.earners
  ADD COLUMN IF NOT EXISTS earner_code text UNIQUE;

UPDATE public.earners
SET earner_code = 'ear_' || encode(gen_random_bytes(6), 'hex')
WHERE earner_code IS NULL;

ALTER TABLE public.earners
  ALTER COLUMN earner_code SET DEFAULT ('ear_' || encode(gen_random_bytes(6), 'hex'));

-- 3. wallets: add owner linkage + hashed ln-address + encrypted blink key
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS owner_type text CHECK (owner_type IN ('merchant', 'earner')),
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS ln_address_hash text,
  ADD COLUMN IF NOT EXISTS blink_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS wallet_status text NOT NULL DEFAULT 'pending'
    CHECK (wallet_status IN ('pending', 'connected', 'error'));

CREATE INDEX IF NOT EXISTS idx_wallets_owner ON public.wallets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_wallets_ln_hash ON public.wallets(ln_address_hash);
CREATE INDEX IF NOT EXISTS idx_wallets_community_status ON public.wallets(community_id, wallet_status);

-- 4. blink_transactions: add hashed counterparty fingerprint + hashed payment hash
ALTER TABLE public.blink_transactions
  ADD COLUMN IF NOT EXISTS counterparty_ln_hash text,
  ADD COLUMN IF NOT EXISTS payment_hash_sha256 text;

CREATE INDEX IF NOT EXISTS idx_blink_tx_counterparty_hash
  ON public.blink_transactions(community_id, counterparty_ln_hash);
CREATE INDEX IF NOT EXISTS idx_blink_tx_payment_hash
  ON public.blink_transactions(community_id, payment_hash_sha256);

-- 5. earner_wallets bookkeeping table (mirrors how merchants link via wallet_id)
CREATE TABLE IF NOT EXISTS public.earner_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_id uuid NOT NULL,
  community_id uuid NOT NULL,
  wallet_id uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_earner_wallets_earner ON public.earner_wallets(earner_id);

ALTER TABLE public.earner_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Earner wallets are publicly readable"
  ON public.earner_wallets FOR SELECT
  USING (true);

CREATE POLICY "Only backend can insert earner wallets"
  ON public.earner_wallets FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only backend can update earner wallets"
  ON public.earner_wallets FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Only backend can delete earner wallets"
  ON public.earner_wallets FOR DELETE
  TO service_role
  USING (true);

-- 6. economy_wallet_metrics aggregate snapshots
CREATE TABLE IF NOT EXISTS public.economy_wallet_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  total_inflow_sats bigint NOT NULL DEFAULT 0,
  total_outflow_sats bigint NOT NULL DEFAULT 0,
  circular_volume_sats bigint NOT NULL DEFAULT 0,
  circular_transaction_count integer NOT NULL DEFAULT 0,
  total_transaction_count integer NOT NULL DEFAULT 0,
  real_circularity_rate numeric NOT NULL DEFAULT 0,
  active_merchant_wallets integer NOT NULL DEFAULT 0,
  active_earner_wallets integer NOT NULL DEFAULT 0,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_economy_wallet_metrics_community
  ON public.economy_wallet_metrics(community_id, calculated_at DESC);

ALTER TABLE public.economy_wallet_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wallet metrics are publicly readable"
  ON public.economy_wallet_metrics FOR SELECT
  USING (true);

CREATE POLICY "Only backend can insert wallet metrics"
  ON public.economy_wallet_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only backend can update wallet metrics"
  ON public.economy_wallet_metrics FOR UPDATE
  TO service_role
  USING (true);
