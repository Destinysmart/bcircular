
CREATE TABLE public.nostr_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pubkey_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nostr_identities_user ON public.nostr_identities(user_id);

GRANT SELECT, DELETE ON public.nostr_identities TO authenticated;
GRANT ALL ON public.nostr_identities TO service_role;

ALTER TABLE public.nostr_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own nostr identity"
  ON public.nostr_identities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own nostr identity"
  ON public.nostr_identities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.nostr_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL UNIQUE,
  pubkey_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nostr_challenges_expires ON public.nostr_challenges(expires_at);

GRANT ALL ON public.nostr_challenges TO service_role;

ALTER TABLE public.nostr_challenges ENABLE ROW LEVEL SECURITY;
-- No client policies: only service_role via edge functions.
