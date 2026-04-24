ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS fbce_tier integer CHECK (fbce_tier BETWEEN 1 AND 5);

ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS fbce_tier_verified boolean DEFAULT false;