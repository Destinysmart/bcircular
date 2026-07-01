import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyEvent, nip19 } from 'npm:nostr-tools@2.7.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { event, challenge } = await req.json();

    if (!event || typeof event !== 'object' || !challenge || typeof challenge !== 'string') {
      return json({ error: 'Missing event or challenge' }, 400);
    }
    if (event.kind !== 27235) return json({ error: 'Invalid event kind' }, 400);

    // Event must contain the challenge somewhere verifiable (tag or content).
    const hasChallengeTag = Array.isArray(event.tags) && event.tags.some(
      (t: unknown[]) => Array.isArray(t) && t[0] === 'challenge' && t[1] === challenge,
    );
    if (!hasChallengeTag) return json({ error: 'Challenge not present in event tags' }, 400);

    // Signature freshness: reject events older than 5 minutes.
    const now = Math.floor(Date.now() / 1000);
    if (typeof event.created_at !== 'number' || Math.abs(now - event.created_at) > 300) {
      return json({ error: 'Event timestamp out of range' }, 400);
    }

    // Verify Nostr signature.
    let ok = false;
    try { ok = verifyEvent(event); } catch { ok = false; }
    if (!ok) return json({ error: 'Invalid signature' }, 401);

    const pubkey = String(event.pubkey).toLowerCase();
    const pubkey_hash = await sha256Hex(pubkey);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Consume challenge (must exist, unexpired, and match this pubkey_hash).
    const { data: chRow, error: chErr } = await admin
      .from('nostr_challenges')
      .select('*')
      .eq('challenge', challenge)
      .maybeSingle();
    if (chErr) throw chErr;
    if (!chRow) return json({ error: 'Challenge not found' }, 400);
    if (new Date(chRow.expires_at).getTime() < Date.now()) {
      await admin.from('nostr_challenges').delete().eq('id', chRow.id);
      return json({ error: 'Challenge expired' }, 400);
    }
    if (chRow.pubkey_hash !== pubkey_hash) {
      return json({ error: 'Challenge/pubkey mismatch' }, 400);
    }
    // Burn it immediately.
    await admin.from('nostr_challenges').delete().eq('id', chRow.id);

    // Find or create user via nostr_identities.
    let userId: string | null = null;
    const { data: existing } = await admin
      .from('nostr_identities')
      .select('user_id')
      .eq('pubkey_hash', pubkey_hash)
      .maybeSingle();

    if (existing?.user_id) {
      userId = existing.user_id;
      await admin.from('nostr_identities')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('pubkey_hash', pubkey_hash);
    } else {
      const npub = nip19.npubEncode(pubkey);
      // Synthetic, non-routable email — never surfaced to users.
      const email = `${pubkey_hash}@nostr.local`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          nostr: true,
          display_name: `${npub.slice(0, 10)}…${npub.slice(-4)}`,
        },
      });
      if (createErr || !created?.user) throw createErr ?? new Error('User creation failed');
      userId = created.user.id;
      const { error: linkErr } = await admin.from('nostr_identities').insert({
        user_id: userId, pubkey_hash,
      });
      if (linkErr) throw linkErr;
    }

    // Mint a session via magic-link generation; return tokens the client sets.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${pubkey_hash}@nostr.local`,
    });
    if (linkErr) throw linkErr;

    // Extract token_hash from generated link and exchange it for a session.
    const actionLink = linkData?.properties?.action_link;
    const hashed_token = linkData?.properties?.hashed_token;
    if (!hashed_token) throw new Error('No hashed_token from generateLink');

    // Verify the OTP server-side to get session tokens back.
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashed_token,
    });
    if (verifyErr || !verifyData.session) throw verifyErr ?? new Error('Session mint failed');

    return json({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      user_id: userId,
    });
  } catch (err) {
    console.error('nostr-auth-verify error', err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
