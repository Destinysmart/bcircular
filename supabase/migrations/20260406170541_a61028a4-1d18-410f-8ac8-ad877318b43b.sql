
-- Community profiles table for economy branding
CREATE TABLE public.community_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE UNIQUE,
  admin_user_id UUID NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  website TEXT,
  twitter_handle TEXT,
  contact_email TEXT,
  founding_year INTEGER,
  economic_zone_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community profiles are publicly readable"
  ON public.community_profiles FOR SELECT
  USING (true);

CREATE POLICY "Economy admin can insert own profile"
  ON public.community_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities
      WHERE communities.id = community_profiles.community_id
      AND communities.admin_id = auth.uid()
    )
  );

CREATE POLICY "Economy admin can update own profile"
  ON public.community_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.communities
      WHERE communities.id = community_profiles.community_id
      AND communities.admin_id = auth.uid()
    )
  );

CREATE TRIGGER update_community_profiles_updated_at
  BEFORE UPDATE ON public.community_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Community admins table for multi-admin support
CREATE TABLE public.community_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'co-admin')),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE public.community_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community admins are publicly readable"
  ON public.community_admins FOR SELECT
  USING (true);

CREATE POLICY "Community owner can add admins"
  ON public.community_admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities
      WHERE communities.id = community_admins.community_id
      AND communities.admin_id = auth.uid()
    )
  );

CREATE POLICY "Community owner can remove admins"
  ON public.community_admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.communities
      WHERE communities.id = community_admins.community_id
      AND communities.admin_id = auth.uid()
    )
  );

-- Add is_super_admin to profiles (defaults to false)
ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Add new fields to communities for registration
ALTER TABLE public.communities ADD COLUMN website TEXT;
ALTER TABLE public.communities ADD COLUMN twitter_handle TEXT;
ALTER TABLE public.communities ADD COLUMN contact_email TEXT;
ALTER TABLE public.communities ADD COLUMN founding_year INTEGER;
ALTER TABLE public.communities ADD COLUMN economic_zone_description TEXT;

-- Storage bucket for community assets (logos, banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('community-assets', 'community-assets', true);

CREATE POLICY "Community assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-assets');

CREATE POLICY "Authenticated users can upload community assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own community assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'community-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete own community assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community-assets' AND auth.role() = 'authenticated');
