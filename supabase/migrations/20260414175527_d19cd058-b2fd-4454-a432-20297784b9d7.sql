-- Attach the trigger to create profiles on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill the missing profile for existing user
INSERT INTO public.profiles (user_id, display_name, email, is_super_admin)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', email), email, false
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Set super admin for the known user
UPDATE public.profiles SET is_super_admin = true WHERE email = 'smartdestinyonyekachi@gmail.com';