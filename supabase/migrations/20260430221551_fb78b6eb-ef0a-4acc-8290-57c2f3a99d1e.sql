-- Auto-appoint the community admin as a validator on community creation
CREATE OR REPLACE FUNCTION public.auto_appoint_admin_as_validator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_id IS NOT NULL THEN
    INSERT INTO public.validators (community_id, user_id)
    VALUES (NEW.id, NEW.admin_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_appoint_admin_as_validator ON public.communities;
CREATE TRIGGER trg_auto_appoint_admin_as_validator
AFTER INSERT ON public.communities
FOR EACH ROW
EXECUTE FUNCTION public.auto_appoint_admin_as_validator();

-- Add unique constraint to prevent duplicate validator rows (needed for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS validators_community_user_unique
ON public.validators (community_id, user_id);

-- Backfill: appoint admin_id as validator for all existing communities that don't have them
INSERT INTO public.validators (community_id, user_id)
SELECT c.id, c.admin_id
FROM public.communities c
WHERE c.admin_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.validators v
    WHERE v.community_id = c.id AND v.user_id = c.admin_id
  );