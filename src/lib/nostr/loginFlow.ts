import { supabase } from '@/integrations/supabase/client';
import type { NostrCapableProvider } from '@/lib/auth/providers/types';

/**
 * Runs the challenge → sign → verify → session flow for any signing provider.
 * Read-only providers must be upgraded first — this rejects them.
 */
export async function loginWithNostrProvider(provider: NostrCapableProvider): Promise<void> {
  if (!provider.canSign || !provider.signEvent) {
    throw new Error('Read-only identities cannot sign in. Add a signer to continue.');
  }

  const pubkey = await provider.getPublicKey();

  const { data: chData, error: chErr } = await supabase.functions.invoke('nostr-auth-challenge', {
    body: { pubkey },
  });
  if (chErr || !chData?.challenge) throw chErr ?? new Error('Failed to get challenge');
  const challenge: string = chData.challenge;

  const template = {
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 27235,
    tags: [
      ['challenge', challenge],
      ['u', window.location.origin],
      ['method', 'POST'],
    ],
    content: `Sign in to Bitcoin Circular\n${window.location.origin}\nchallenge:${challenge}`,
  };
  const signed = await provider.signEvent(template);

  const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('nostr-auth-verify', {
    body: { event: signed, challenge },
  });
  if (verifyErr || !verifyData?.access_token) throw verifyErr ?? new Error('Verification failed');

  const { error: sessErr } = await supabase.auth.setSession({
    access_token: verifyData.access_token,
    refresh_token: verifyData.refresh_token,
  });
  if (sessErr) throw sessErr;
}
