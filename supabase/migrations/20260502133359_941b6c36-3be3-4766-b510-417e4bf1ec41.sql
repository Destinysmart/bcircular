DELETE FROM public.blink_transactions
WHERE wallet_id NOT IN (
  SELECT id FROM public.wallets WHERE wallet_status = 'connected'
);