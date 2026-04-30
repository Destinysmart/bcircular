CREATE INDEX IF NOT EXISTS idx_blink_txns_flow
  ON public.blink_transactions(community_id, flow_type, blink_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blink_txns_circular
  ON public.blink_transactions(community_id, is_internal, blink_created_at DESC);