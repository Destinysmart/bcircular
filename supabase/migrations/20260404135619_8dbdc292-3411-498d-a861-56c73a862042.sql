
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create status enums
CREATE TYPE public.community_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.vote_type AS ENUM ('approve', 'reject');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are readable by the user" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Communities table
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  description TEXT,
  admin_id UUID REFERENCES auth.users(id),
  member_count INT NOT NULL DEFAULT 0,
  status community_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Communities are publicly readable" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can register communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Community admin can update own community" ON public.communities FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "Super admins can update any community" ON public.communities FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Validators table
CREATE TABLE public.validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

ALTER TABLE public.validators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Validators are publicly readable" ON public.validators FOR SELECT USING (true);
CREATE POLICY "Community admin can appoint validators" ON public.validators FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND admin_id = auth.uid())
  );
CREATE POLICY "Community admin can remove validators" ON public.validators FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND admin_id = auth.uid())
  );

-- Merchants table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  payment_methods TEXT[] NOT NULL DEFAULT '{}',
  website TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  status submission_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved merchants are publicly readable" ON public.merchants FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR EXISTS (SELECT 1 FROM public.validators WHERE community_id = merchants.community_id AND user_id = auth.uid()));
CREATE POLICY "Anyone can submit merchants" ON public.merchants FOR INSERT WITH CHECK (true);
CREATE POLICY "Validators can update merchant status" ON public.merchants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.validators WHERE community_id = merchants.community_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Earners table
CREATE TABLE public.earners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  earning_method TEXT,
  payment_method TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  status submission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.earners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved earners are publicly readable" ON public.earners FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR EXISTS (SELECT 1 FROM public.validators WHERE community_id = earners.community_id AND user_id = auth.uid()));
CREATE POLICY "Anyone can submit earners" ON public.earners FOR INSERT WITH CHECK (true);
CREATE POLICY "Validators can update earner status" ON public.earners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.validators WHERE community_id = earners.community_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  amount_sats BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  is_circular BOOLEAN NOT NULL DEFAULT false,
  submitted_by UUID REFERENCES auth.users(id),
  status submission_status NOT NULL DEFAULT 'pending',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved transactions are publicly readable" ON public.transactions FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid() OR EXISTS (SELECT 1 FROM public.validators WHERE community_id = transactions.community_id AND user_id = auth.uid()));
CREATE POLICY "Anyone can submit transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Validators can update transaction status" ON public.transactions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.validators WHERE community_id = transactions.community_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Validation votes table
CREATE TABLE public.validation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('merchant', 'earner', 'transaction')),
  validator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote vote_type NOT NULL,
  note TEXT,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, validator_id)
);

ALTER TABLE public.validation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are readable by validators" ON public.validation_votes FOR SELECT USING (
  validator_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Validators can cast votes" ON public.validation_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = validator_id);

-- Circularity scores table
CREATE TABLE public.circularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  merchant_density_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  earner_rate_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  retention_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  growth_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  velocity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.circularity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores are publicly readable" ON public.circularity_scores FOR SELECT USING (true);
CREATE POLICY "Only backend can insert scores" ON public.circularity_scores FOR INSERT TO service_role WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX idx_merchants_community ON public.merchants(community_id);
CREATE INDEX idx_merchants_status ON public.merchants(status);
CREATE INDEX idx_earners_community ON public.earners(community_id);
CREATE INDEX idx_transactions_community ON public.transactions(community_id);
CREATE INDEX idx_validation_votes_submission ON public.validation_votes(submission_id);
CREATE INDEX idx_circularity_scores_community ON public.circularity_scores(community_id);
CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_status ON public.communities(status);
