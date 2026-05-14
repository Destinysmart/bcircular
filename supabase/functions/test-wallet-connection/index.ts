import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

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

const BLINK_API_URL = 'https://api.blink.sv/graphql'

const BodySchema = z.object({
  community_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
})

const ACCOUNT_QUERY = `
query Me {
  me {
    defaultAccount { id }
  }
}`

async function getAesKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('BLINK_KEY_ENCRYPTION_SECRET')
  if (!secret) throw new Error('BLINK_KEY_ENCRYPTION_SECRET not configured')
  const keyMaterial = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['decrypt'])
}

async function decryptApiKey(payload: string): Promise<string> {
  const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
  const iv = bytes.slice(0, 12)
  const ct = bytes.slice(12)
  try {
    const key = await getAesKey()
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return new TextDecoder().decode(pt)
  } catch (_) {
    const secret = Deno.env.get('BLINK_KEY_ENCRYPTION_SECRET')
    if (!secret) throw new Error('BLINK_KEY_ENCRYPTION_SECRET not configured')
    const legacyRaw = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32))
    const legacyKey = await crypto.subtle.importKey('raw', legacyRaw, 'AES-GCM', false, ['decrypt'])
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, legacyKey, ct)
    return new TextDecoder().decode(pt)
  }
}

async function requireEconomyAdmin(req: Request, supabase: any, communityId: string): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return 'Unauthorized'
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
  const userId = claimsData?.claims?.sub as string | undefined
  if (claimsErr || !userId) return 'Unauthorized'

  const [{ data: community }, { data: adminRow }, { data: roleRow }] = await Promise.all([
    supabase.from('communities').select('admin_id').eq('id', communityId).maybeSingle(),
    supabase.from('community_admins').select('id').eq('community_id', communityId).eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
  ])
  if (community?.admin_id === userId || adminRow || roleRow) return null
  return 'Forbidden'
}

async function blinkGraphQL(apiKey: string) {
  const res = await fetch(BLINK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ query: ACCOUNT_QUERY }),
  })
  if (!res.ok) throw new Error(`Blink API error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(`Blink GraphQL: ${json.errors[0].message}`)
  const walletId = json.data?.me?.defaultAccount?.id
  if (!walletId) throw new Error('Blink response did not include a default account ID')
  return walletId
}

function isBlinkUnauthorized(message: string) {
  return /Blink API error 401|Authorization Required|unauthor/i.test(message)
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { community_id, wallet_id } = parsed.data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authError = await requireEconomyAdmin(req, supabase, community_id)
    if (authError) {
      return new Response(JSON.stringify({ error: authError }), {
        status: authError === 'Unauthorized' ? 401 : 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, community_id, blink_api_key_encrypted')
      .eq('id', wallet_id)
      .eq('community_id', community_id)
      .maybeSingle()
    if (walletError) throw walletError
    if (!wallet?.blink_api_key_encrypted) {
      return new Response(JSON.stringify({ error: 'Wallet not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = await decryptApiKey(wallet.blink_api_key_encrypted)
    let accountId: string
    try {
      accountId = await blinkGraphQL(apiKey)
    } catch (blinkErr: any) {
      const message = String(blinkErr?.message || blinkErr)
      if (isBlinkUnauthorized(message)) {
        await supabase
          .from('wallets')
          .update({ wallet_status: 'auth_error', last_synced_at: new Date().toISOString() })
          .eq('id', wallet.id)
        return new Response(JSON.stringify({
          success: false,
          error: 'Blink rejected the stored API key (401). Ask the wallet owner to re-connect with a fresh read-only key.',
          code: 'blink_unauthorized',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw blinkErr
    }
    const message = `Connection successful — wallet ID: ${accountId}`

    return new Response(JSON.stringify({ success: true, message, wallet_id: accountId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('test-wallet-connection error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Connection test failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
