
-- Drop old policies
DROP POLICY IF EXISTS "Economy admin can insert API key" ON blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can update API key" ON blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can delete API key" ON blink_api_keys;
DROP POLICY IF EXISTS "Economy admin can read own API key" ON blink_api_keys;

-- Recreate with community_admins + super admin support
CREATE POLICY "Economy admin can read own API key" ON blink_api_keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM community_admins WHERE community_admins.community_id = blink_api_keys.community_id AND community_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = true)
  );

CREATE POLICY "Economy admin can insert API key" ON blink_api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM community_admins WHERE community_admins.community_id = blink_api_keys.community_id AND community_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = true)
  );

CREATE POLICY "Economy admin can update API key" ON blink_api_keys
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM community_admins WHERE community_admins.community_id = blink_api_keys.community_id AND community_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = true)
  );

CREATE POLICY "Economy admin can delete API key" ON blink_api_keys
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM community_admins WHERE community_admins.community_id = blink_api_keys.community_id AND community_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_super_admin = true)
  );
