
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Move privileged logic to private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.get_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id), false)
$$;
REVOKE ALL ON FUNCTION private.get_is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_is_super_admin(uuid) TO anon, authenticated, service_role;

-- Replace public functions with SECURITY INVOKER wrappers (no longer flagged)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$ SELECT private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.get_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$ SELECT private.get_is_super_admin(_user_id) $$;

-- Drop redundant "always true" service_role-only policies
DROP POLICY IF EXISTS "Only backend can insert scores" ON public.circularity_scores;
DROP POLICY IF EXISTS "Only backend can insert wallet metrics" ON public.economy_wallet_metrics;
DROP POLICY IF EXISTS "Only backend can update wallet metrics" ON public.economy_wallet_metrics;
DROP POLICY IF EXISTS "Backend can insert alerts" ON public.economy_alerts;
DROP POLICY IF EXISTS "Backend can delete alerts" ON public.economy_alerts;
DROP POLICY IF EXISTS "Only backend can read API keys" ON public.blink_api_keys;

-- Tighten data_access_requests INSERT to require non-empty required fields
DROP POLICY IF EXISTS "Anyone can submit access requests" ON public.data_access_requests;
CREATE POLICY "Anyone can submit access requests"
  ON public.data_access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(coalesce(name, '')) > 0
    AND char_length(coalesce(email, '')) > 3
    AND char_length(coalesce(use_case, '')) > 0
  );
