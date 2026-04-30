-- Setup checklist on communities
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS setup_checklist jsonb NOT NULL DEFAULT '{
  "logo": false,
  "btcmap": false,
  "earners": false,
  "validators": false,
  "wallet": false,
  "validated": false
}'::jsonb;

-- Economy alerts table
CREATE TABLE IF NOT EXISTS public.economy_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('critical', 'warning', 'positive')),
  alert_key text NOT NULL,
  message text NOT NULL,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_economy_alerts_community ON public.economy_alerts(community_id, is_read, created_at DESC);

ALTER TABLE public.economy_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts readable by economy admins and super admins"
ON public.economy_alerts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.communities c WHERE c.id = economy_alerts.community_id AND c.admin_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.community_admins ca WHERE ca.community_id = economy_alerts.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Economy admins can mark alerts read"
ON public.economy_alerts FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.communities c WHERE c.id = economy_alerts.community_id AND c.admin_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.community_admins ca WHERE ca.community_id = economy_alerts.community_id AND ca.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Backend can insert alerts"
ON public.economy_alerts FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Backend can delete alerts"
ON public.economy_alerts FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Super admins can delete alerts"
ON public.economy_alerts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable extensions for cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;