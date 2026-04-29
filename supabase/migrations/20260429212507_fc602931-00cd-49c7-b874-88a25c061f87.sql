ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS has_wallet_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_blink_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS pending_ln_address_hash text;

ALTER TABLE public.earners
  ADD COLUMN IF NOT EXISTS has_wallet_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_blink_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS pending_ln_address_hash text,
  ADD COLUMN IF NOT EXISTS earning_frequency text;