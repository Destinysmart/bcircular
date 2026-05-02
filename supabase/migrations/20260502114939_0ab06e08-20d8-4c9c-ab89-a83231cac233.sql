-- Public-safe view of wallets: exposes only non-sensitive columns so anyone
-- can count connected wallets per economy (used by coverage indicator,
-- circular-flow spotlight and leaderboard). Sensitive columns
-- (encrypted API keys, ln address hashes, owner_id, balances) stay
-- restricted to wallet owners and economy admins via the base table RLS.
CREATE OR REPLACE VIEW public.wallets_public
WITH (security_invoker=off) AS
  SELECT
    id,
    community_id,
    owner_type,
    wallet_status,
    created_at
  FROM public.wallets;

GRANT SELECT ON public.wallets_public TO anon, authenticated;