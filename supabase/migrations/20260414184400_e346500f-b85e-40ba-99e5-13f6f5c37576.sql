
CREATE POLICY "Economy admin can read own API key"
  ON public.blink_api_keys FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = blink_api_keys.community_id
      AND communities.admin_id = auth.uid()
  ));
