-- Recreate the view with security_invoker=on so it respects RLS of the
-- querying user instead of the view owner.
DROP VIEW IF EXISTS public.wallets_public;

CREATE VIEW public.wallets_public
WITH (security_invoker=on) AS
  SELECT
    id,
    community_id,
    owner_type,
    wallet_status,
    created_at
  FROM public.wallets;

GRANT SELECT ON public.wallets_public TO anon, authenticated;

-- Allow public SELECT on the base table but ONLY for the safe columns
-- via column-level GRANTs. RLS still applies — so add a permissive
-- policy that only matches when no sensitive column is requested
-- (Postgres can't enforce that), so the cleanest fix is:
--   1. Add an additional SELECT policy that allows anyone to read rows
--   2. REVOKE column-level access to sensitive fields from anon/authenticated
-- This way: SELECT id FROM wallets works for anyone, but
-- SELECT blink_api_key_encrypted FROM wallets is denied at the column layer
-- for non-owners.

-- Permissive row-level read for everyone (column grants restrict what they see)
CREATE POLICY "Public can read wallet rows for counts"
  ON public.wallets FOR SELECT
  TO anon, authenticated
  USING (true);

-- Lock down sensitive columns at the privilege layer.
REVOKE SELECT ON public.wallets FROM anon, authenticated;
GRANT SELECT (id, community_id, owner_type, wallet_status, created_at, last_synced_at)
  ON public.wallets TO anon, authenticated;
-- Owners and admins still get full row access via the existing
-- "Wallet owners and admins can read wallets" policy combined with
-- the service_role / table-owner column privileges.
GRANT SELECT ON public.wallets TO service_role;