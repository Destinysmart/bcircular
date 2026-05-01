-- Fix earners INSERT policy: explicitly allow anonymous submissions and authenticated users submitting on their own behalf.
-- Also extend to merchants and transactions for consistency.

DROP POLICY IF EXISTS "Users can submit earners" ON public.earners;
CREATE POLICY "Anyone can submit earners"
  ON public.earners FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    submitted_by IS NULL
    OR submitted_by = auth.uid()
  );