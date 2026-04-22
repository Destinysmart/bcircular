CREATE TABLE public.proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  submitted_by uuid,
  title text NOT NULL,
  description text,
  proof_type text NOT NULL CHECK (proof_type IN ('photo', 'video', 'receipt', 'screenshot')),
  media_url text,
  merchant_name text,
  amount_sats integer,
  is_circular boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_proofs_community_status ON public.proofs (community_id, status, created_at DESC);
CREATE INDEX idx_proofs_submitted_by ON public.proofs (submitted_by);

CREATE POLICY "Approved proofs are publicly readable"
ON public.proofs
FOR SELECT
USING (
  status = 'approved'
  OR submitted_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.validators
    WHERE validators.community_id = proofs.community_id
      AND validators.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can submit proofs"
ON public.proofs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Validators can update proof status"
ON public.proofs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.validators
    WHERE validators.community_id = proofs.community_id
      AND validators.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.validators
    WHERE validators.community_id = proofs.community_id
      AND validators.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Super admins can delete proofs"
ON public.proofs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-media',
  'proof-media',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'video/mp4', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Proof media is publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'proof-media');

CREATE POLICY "Authenticated users can upload proof media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proof-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own proof media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'proof-media' AND owner = auth.uid());