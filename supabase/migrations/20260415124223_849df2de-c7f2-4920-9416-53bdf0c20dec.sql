-- Allow super admins to delete communities
CREATE POLICY "Super admins can delete communities"
ON public.communities
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow cascade cleanup: delete related data when a community is deleted
-- Merchants
CREATE POLICY "Super admins can delete merchants"
ON public.merchants
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Earners
CREATE POLICY "Super admins can delete earners"
ON public.earners
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Transactions
CREATE POLICY "Super admins can delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Circularity scores
CREATE POLICY "Super admins can delete scores"
ON public.circularity_scores
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Validators
CREATE POLICY "Super admins can delete validators"
ON public.validators
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Community admins
CREATE POLICY "Super admins can delete community admins"
ON public.community_admins
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Community profiles
CREATE POLICY "Super admins can delete community profiles"
ON public.community_profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));