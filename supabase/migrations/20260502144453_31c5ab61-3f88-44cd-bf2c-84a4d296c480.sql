CREATE TABLE IF NOT EXISTS public.data_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  organization text,
  use_case text,
  email text,
  tier text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.data_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit access requests"
ON public.data_access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Super admins can read access requests"
ON public.data_access_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can delete access requests"
ON public.data_access_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));