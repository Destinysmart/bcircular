-- Roll back the overly broad permissive policy and column grants on
-- public.wallets — they would have let any logged-in user read other
-- users' encrypted API keys.
DROP POLICY IF EXISTS "Public can read wallet rows for counts" ON public.wallets;

-- Restore full default privileges on the base table; RLS continues to
-- limit signed-in users to wallets they own or admin.
GRANT SELECT ON public.wallets TO authenticated;
REVOKE SELECT ON public.wallets FROM anon;

-- Recreate the public view as a SECURITY DEFINER view (bypasses base
-- table RLS) but expose ONLY the count-safe columns. This is the same
-- pattern used by public_profiles for safe public reads.
DROP VIEW IF EXISTS public.wallets_public;

CREATE VIEW public.wallets_public AS
  SELECT
    id,
    community_id,
    owner_type,
    wallet_status,
    created_at
  FROM public.wallets;

ALTER VIEW public.wallets_public SET (security_invoker = off);

GRANT SELECT ON public.wallets_public TO anon, authenticated;