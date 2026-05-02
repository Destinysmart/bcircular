CREATE POLICY "Economy admins can delete own economy transactions"
ON public.blink_transactions
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = blink_transactions.community_id AND c.admin_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM public.community_admins ca
    WHERE ca.community_id = blink_transactions.community_id AND ca.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);