
-- Add bounding box columns to communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS bbox_north decimal,
  ADD COLUMN IF NOT EXISTS bbox_south decimal,
  ADD COLUMN IF NOT EXISTS bbox_east decimal,
  ADD COLUMN IF NOT EXISTS bbox_west decimal,
  ADD COLUMN IF NOT EXISTS btcmap_last_synced timestamptz;

-- Add source and btcmap_id columns to merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'self_reported',
  ADD COLUMN IF NOT EXISTS btcmap_id text UNIQUE;
