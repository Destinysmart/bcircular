
-- 1. Merchant secrets table
CREATE TABLE public.merchant_secrets (
  merchant_id uuid PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
  claim_token_hash text,
  pending_blink_api_key_encrypted text,
  pending_ln_address_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.merchant_secrets TO service_role;
ALTER TABLE public.merchant_secrets ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: only service_role (bypasses RLS) can access.

-- 2. Earner secrets table
CREATE TABLE public.earner_secrets (
  earner_id uuid PRIMARY KEY REFERENCES public.earners(id) ON DELETE CASCADE,
  pending_blink_api_key_encrypted text,
  pending_ln_address_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.earner_secrets TO service_role;
ALTER TABLE public.earner_secrets ENABLE ROW LEVEL SECURITY;

-- 3. Migrate data
INSERT INTO public.merchant_secrets (merchant_id, claim_token_hash, pending_blink_api_key_encrypted, pending_ln_address_hash)
SELECT id, claim_token_hash, pending_blink_api_key_encrypted, pending_ln_address_hash
FROM public.merchants
WHERE claim_token_hash IS NOT NULL
   OR pending_blink_api_key_encrypted IS NOT NULL
   OR pending_ln_address_hash IS NOT NULL;

INSERT INTO public.earner_secrets (earner_id, pending_blink_api_key_encrypted, pending_ln_address_hash)
SELECT id, pending_blink_api_key_encrypted, pending_ln_address_hash
FROM public.earners
WHERE pending_blink_api_key_encrypted IS NOT NULL
   OR pending_ln_address_hash IS NOT NULL;

-- 4. Drop sensitive columns from public-readable tables
ALTER TABLE public.merchants
  DROP COLUMN IF EXISTS claim_token_hash,
  DROP COLUMN IF EXISTS pending_blink_api_key_encrypted,
  DROP COLUMN IF EXISTS pending_ln_address_hash;

ALTER TABLE public.earners
  DROP COLUMN IF EXISTS pending_blink_api_key_encrypted,
  DROP COLUMN IF EXISTS pending_ln_address_hash;

-- 5. Fix wallets UPDATE policy: replace self-referential subquery check with a BEFORE UPDATE trigger
DROP POLICY IF EXISTS "Users can update own wallet metadata only" ON public.wallets;

CREATE POLICY "Users can update own wallet metadata only"
ON public.wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.prevent_wallet_sensitive_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and super admins to change anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.balance_sats     IS DISTINCT FROM OLD.balance_sats
  OR NEW.blink_wallet_id  IS DISTINCT FROM OLD.blink_wallet_id
  OR NEW.community_id     IS DISTINCT FROM OLD.community_id
  OR NEW.user_id          IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot modify protected wallet fields (balance_sats, blink_wallet_id, community_id, user_id) from client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallets_prevent_sensitive_changes ON public.wallets;
CREATE TRIGGER wallets_prevent_sensitive_changes
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_sensitive_field_changes();
