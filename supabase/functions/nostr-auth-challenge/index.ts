import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isHex64(s: string): boolean {
  return typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { pubkey } = await req.json();
    if (!isHex64(pubkey)) {
      return new Response(JSON.stringify({ error: 'Invalid pubkey' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pubkey_hash = await sha256Hex(pubkey.toLowerCase());
    // 32 bytes of random -> hex
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const challenge = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Clean up expired challenges opportunistically
    await admin.from('nostr_challenges').delete().lt('expires_at', new Date().toISOString());

    const { error } = await admin.from('nostr_challenges').insert({ challenge, pubkey_hash, expires_at });
    if (error) throw error;

    return new Response(JSON.stringify({ challenge, expires_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('nostr-auth-challenge error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
