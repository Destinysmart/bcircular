-- Add flow_type classification to blink transactions
ALTER TABLE public.blink_transactions
  ADD COLUMN IF NOT EXISTS flow_type text
  CHECK (flow_type IN (
    'circular_receive',
    'circular_spend',
    'offramp_or_external',
    'inflow_external'
  ));

-- Add offramp volume to economy wallet metrics
ALTER TABLE public.economy_wallet_metrics
  ADD COLUMN IF NOT EXISTS offramp_volume_sats bigint NOT NULL DEFAULT 0;

-- Add BTCMap node ID to merchants (separate from existing btcmap_id which is the legacy sync field)
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS btcmap_node_id text;

-- Performance indexes for circularity detection
CREATE INDEX IF NOT EXISTS idx_wallets_community_hash
  ON public.wallets(community_id, ln_address_hash)
  WHERE wallet_status = 'connected' AND ln_address_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blink_txns_community_date
  ON public.blink_transactions(community_id, blink_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blink_txns_wallet_date
  ON public.blink_transactions(wallet_id, blink_created_at DESC);