
-- Table: wallets (links users to Blink wallets within an economy)
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  blink_wallet_id text NOT NULL,
  wallet_currency text NOT NULL DEFAULT 'BTC' CHECK (wallet_currency IN ('BTC', 'USD')),
  balance_sats bigint NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id, wallet_currency)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Anyone can see wallets in their economy (for flow graphs)
CREATE POLICY "Wallets are readable by economy participants"
  ON public.wallets FOR SELECT
  USING (true);

-- Users can connect their own wallet
CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own wallet
CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can disconnect their own wallet
CREATE POLICY "Users can delete own wallet"
  ON public.wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: blink_api_keys (per-economy Blink API key storage)
CREATE TABLE public.blink_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blink_api_keys ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can read API keys
CREATE POLICY "Only backend can read API keys"
  ON public.blink_api_keys FOR SELECT
  TO service_role
  USING (true);

-- Economy admins can insert their API key
CREATE POLICY "Economy admin can insert API key"
  ON public.blink_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = blink_api_keys.community_id
    AND communities.admin_id = auth.uid()
  ));

-- Economy admins can update their API key
CREATE POLICY "Economy admin can update API key"
  ON public.blink_api_keys FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = blink_api_keys.community_id
    AND communities.admin_id = auth.uid()
  ));

-- Economy admins can delete their API key
CREATE POLICY "Economy admin can delete API key"
  ON public.blink_api_keys FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = blink_api_keys.community_id
    AND communities.admin_id = auth.uid()
  ));

-- Auto-update updated_at
CREATE TRIGGER update_blink_api_keys_updated_at
  BEFORE UPDATE ON public.blink_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also create a table for synced blink transactions (raw data from API)
CREATE TABLE public.blink_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  blink_tx_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('RECEIVE', 'SEND')),
  settlement_amount bigint NOT NULL,
  settlement_currency text NOT NULL DEFAULT 'BTC',
  status text NOT NULL DEFAULT 'SUCCESS',
  is_internal boolean NOT NULL DEFAULT false,
  counterparty_wallet_id uuid REFERENCES public.wallets(id),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  blink_created_at timestamptz NOT NULL,
  UNIQUE(blink_tx_id, wallet_id)
);

ALTER TABLE public.blink_transactions ENABLE ROW LEVEL SECURITY;

-- Transactions are readable within the economy
CREATE POLICY "Blink transactions are publicly readable"
  ON public.blink_transactions FOR SELECT
  USING (true);

-- Only backend can insert synced transactions
CREATE POLICY "Only backend can insert blink transactions"
  ON public.blink_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only backend can update
CREATE POLICY "Only backend can update blink transactions"
  ON public.blink_transactions FOR UPDATE
  TO service_role
  USING (true);
