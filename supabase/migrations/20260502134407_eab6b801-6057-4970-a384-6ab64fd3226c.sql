CREATE OR REPLACE VIEW public.wallets_public AS
SELECT id, community_id, owner_type, wallet_status, created_at
FROM public.wallets
WHERE wallet_status = 'connected';