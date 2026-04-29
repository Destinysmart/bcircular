
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS public_merchant_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS claim_token_hash text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merchants_wallet_id ON public.merchants(wallet_id);
CREATE INDEX IF NOT EXISTS idx_merchants_public_id ON public.merchants(public_merchant_id);

CREATE OR REPLACE FUNCTION public.generate_merchant_public_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  candidate text;
  exists_already boolean;
BEGIN
  LOOP
    candidate := 'mch_' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    SELECT EXISTS(SELECT 1 FROM public.merchants WHERE public_merchant_id = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_merchant_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.public_merchant_id IS NULL THEN
    NEW.public_merchant_id := public.generate_merchant_public_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_merchant_public_id ON public.merchants;
CREATE TRIGGER trg_assign_merchant_public_id
  BEFORE INSERT OR UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_merchant_public_id();

UPDATE public.merchants
SET public_merchant_id = public.generate_merchant_public_id()
WHERE status = 'approved' AND public_merchant_id IS NULL;

REVOKE SELECT (claim_token_hash) ON public.merchants FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.merchant_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount_sats bigint NOT NULL CHECK (amount_sats > 0),
  memo text,
  payment_request text NOT NULL,
  payment_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  paid_at timestamptz,
  blink_tx_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_invoices_merchant ON public.merchant_invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_invoices_status ON public.merchant_invoices(status);

ALTER TABLE public.merchant_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoices are publicly readable" ON public.merchant_invoices;
CREATE POLICY "Invoices are publicly readable"
  ON public.merchant_invoices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only backend can insert invoices" ON public.merchant_invoices;
CREATE POLICY "Only backend can insert invoices"
  ON public.merchant_invoices FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only backend can update invoices" ON public.merchant_invoices;
CREATE POLICY "Only backend can update invoices"
  ON public.merchant_invoices FOR UPDATE
  TO service_role
  USING (true);

CREATE OR REPLACE VIEW public.merchant_metrics
WITH (security_invoker = true)
AS
SELECT
  m.id              AS merchant_id,
  m.public_merchant_id,
  m.community_id,
  m.name,
  m.category,
  m.wallet_id IS NOT NULL AS wallet_linked,
  COALESCE(SUM(CASE WHEN bt.direction = 'RECEIVE' THEN bt.settlement_amount ELSE 0 END), 0)::bigint AS inflow_sats,
  COALESCE(SUM(CASE WHEN bt.direction = 'SEND'    THEN bt.settlement_amount ELSE 0 END), 0)::bigint AS outflow_sats,
  COALESCE(SUM(CASE WHEN bt.is_internal           THEN bt.settlement_amount ELSE 0 END), 0)::bigint AS internal_sats,
  COUNT(bt.id)::int AS tx_count,
  CASE WHEN COALESCE(SUM(bt.settlement_amount), 0) > 0
       THEN ROUND( (COALESCE(SUM(CASE WHEN bt.is_internal THEN bt.settlement_amount ELSE 0 END), 0)::numeric
                    / SUM(bt.settlement_amount)::numeric) * 100, 1)
       ELSE 0
  END AS circularity_score,
  MAX(bt.blink_created_at) AS last_tx_at
FROM public.merchants m
LEFT JOIN public.blink_transactions bt ON bt.wallet_id = m.wallet_id
WHERE m.status = 'approved'
GROUP BY m.id;

GRANT SELECT ON public.merchant_metrics TO anon, authenticated;
