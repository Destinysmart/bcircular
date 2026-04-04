
-- Drop overly permissive policies
DROP POLICY "Anyone can submit merchants" ON public.merchants;
DROP POLICY "Anyone can submit earners" ON public.earners;
DROP POLICY "Anyone can submit transactions" ON public.transactions;

-- Recreate with proper checks: submitted_by must be null (anonymous) or match the authenticated user
CREATE POLICY "Users can submit merchants" ON public.merchants FOR INSERT
  WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());

CREATE POLICY "Users can submit earners" ON public.earners FOR INSERT
  WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());

CREATE POLICY "Users can submit transactions" ON public.transactions FOR INSERT
  WITH CHECK (submitted_by IS NULL OR submitted_by = auth.uid());
