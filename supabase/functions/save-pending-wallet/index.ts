import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGINS = [
  'https://bitcoincircular.com',
  'https://www.bitcoincircular.com',
  'https://bcircular.lovable.app',
]
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  let allowed = ALLOWED_ORIGINS.includes(origin)
  if (!allowed && origin) {
    try {
      const host = new URL(origin).hostname
      if (/\.lovable\.app$|\.lovableproject\.dev$|\.lovable\.dev$/.test(host)) allowed = true
    } catch {}
  }
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Vary': 'Origin',
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getKeyMaterial(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
}

async function encrypt(plain: string, secret: string): Promise<string> {
  const key = await getKeyMaterial(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0); out.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...out));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { owner_type, owner_id, api_key, ln_address } = await req.json();
    if (!['merchant', 'earner'].includes(owner_type) || !owner_id || !api_key || typeof api_key !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (api_key.length < 10 || api_key.length > 500) {
      return new Response(JSON.stringify({ error: 'invalid api key length' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const secret = Deno.env.get('BLINK_KEY_ENCRYPTION_SECRET');
    if (!secret) throw new Error('encryption secret not configured');

    const encrypted = await encrypt(api_key, secret);
    const lnHash = ln_address && typeof ln_address === 'string' && ln_address.includes('@')
      ? await sha256Hex(ln_address)
      : null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const table = owner_type === 'merchant' ? 'merchants' : 'earners';
    const { error } = await supabase.from(table).update({
      has_wallet_pending: true,
      pending_blink_api_key_encrypted: encrypted,
      pending_ln_address_hash: lnHash,
    }).eq('id', owner_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
