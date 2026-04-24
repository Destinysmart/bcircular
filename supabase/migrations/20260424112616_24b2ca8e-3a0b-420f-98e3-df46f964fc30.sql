ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS monthly_transactions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_days_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrics_updated_at timestamptz;