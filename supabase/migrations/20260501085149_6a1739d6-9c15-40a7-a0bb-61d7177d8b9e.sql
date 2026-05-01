-- Backfill: any wallet that has an encrypted Blink API key on file
-- but is still marked 'pending' should be 'connected'.
UPDATE public.wallets
SET wallet_status = 'connected',
    updated_at = now()
WHERE wallet_status = 'pending'
  AND blink_api_key_encrypted IS NOT NULL
  AND blink_api_key_encrypted <> '';