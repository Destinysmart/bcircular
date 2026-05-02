-- Restore full SELECT for authenticated users — RLS still gates which
-- rows they can read (only their own wallets, or wallets in economies
-- they admin). Anonymous visitors keep only the safe columns.
GRANT SELECT ON public.wallets TO authenticated;