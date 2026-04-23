ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS btcmap_area_id text,
  ADD COLUMN IF NOT EXISTS btcmap_profile_url text;