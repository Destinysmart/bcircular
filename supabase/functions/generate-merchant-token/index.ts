const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BodySchema = z.object({ merchant_id: z.string().uuid() })

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const callerId = claimsData.claims.sub as string

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { merchant_id } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: merchant, error: mErr } = await supabase
      .from('merchants')
      .select('id, community_id, status, public_merchant_id')
      .eq('id', merchant_id)
      .maybeSingle()

    if (mErr || !merchant) {
      return new Response(JSON.stringify({ error: 'Merchant not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (merchant.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Merchant must be approved before generating a claim token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const [{ data: c }, { data: ca }, { data: roleRow }] = await Promise.all([
      supabase.from('communities').select('admin_id').eq('id', merchant.community_id).maybeSingle(),
      supabase.from('community_admins').select('id').eq('community_id', merchant.community_id).eq('user_id', callerId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle(),
    ])
    if (c?.admin_id !== callerId && !ca && !roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const rawToken = randomToken()
    const tokenHash = await sha256Hex(rawToken)

    const { error: updErr } = await supabase
      .from('merchants')
      .update({ claim_token_hash: tokenHash, claimed_at: null })
      .eq('id', merchant_id)

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      success: true,
      public_merchant_id: merchant.public_merchant_id,
      claim_token: rawToken,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('generate-merchant-token error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
