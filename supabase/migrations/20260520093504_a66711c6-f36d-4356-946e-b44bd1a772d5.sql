CREATE OR REPLACE FUNCTION public.notify_economy_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    INSERT INTO public.economy_alerts (community_id, alert_type, alert_key, message, action_url)
    VALUES (
      NEW.id,
      'positive',
      'economy_approved',
      'Your economy is live — start onboarding validators and merchants.',
      '/dashboard/economy/' || NEW.id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;