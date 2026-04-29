const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BLINK_API_URL = 'https://api.blink.sv/graphql'

const BodySchema = z.object({
  public_merchant_id: z.string().min(4),
  claim_token: z.string().min(32),
  blink_wallet_id: z.string().min(8),
})

const WALLETS_QUERY = `
query Me {
  me {
    defaultAccount {
      wallets { id walletCurrency balance }
    }
  }
}`

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { public_merchant_id, claim_token, blink_wallet_id } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, community_id, status, claim_token_hash, wallet_id, public_merchant_id')
      .eq('public_merchant_id', public_merchant_id)
      .maybeSingle()

    if (!merchant) {
      return new Response(JSON.stringify({ error: 'Invalid claim link' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (merchant.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Merchant not approved' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!merchant.claim_token_hash) {
      return new Response(JSON.stringify({ error: 'No active claim token. Ask an admin to generate a new claim link.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const submittedHash = await sha256Hex(claim_token)
    if (!timingSafeEqual(submittedHash, merchant.claim_token_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid claim token' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get economy admin id (used to satisfy wallets RLS / ownership)
    const { data: communityRow } = await supabase
      .from('communities')
      .select('admin_id')
      .eq('id', merchant.community_id)
      .single()

    // Get economy Blink API key + verify wallet exists in the connected Blink account
    const { data: keyRow } = await supabase
      .from('blink_api_keys')
      .select('api_key_encrypted')
      .eq('community_id', merchant.community_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!keyRow) {
      return new Response(JSON.stringify({ error: 'This economy has not connected a Blink wallet yet. Ask the admin to configure Blink first.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const blinkRes = await fetch(BLINK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': keyRow.api_key_encrypted },
      body: JSON.stringify({ query: WALLETS_QUERY }),
    })
    const blinkJson = await blinkRes.json()
    const blinkWallets = blinkJson?.data?.me?.defaultAccount?.wallets ?? []
    const matched = blinkWallets.find((w: any) => w.id === blink_wallet_id)
    if (!matched) {
      return new Response(JSON.stringify({ error: 'Wallet ID not found in this economy\'s Blink account.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Upsert wallet row
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('community_id', merchant.community_id)
      .eq('blink_wallet_id', blink_wallet_id)
      .maybeSingle()

    let walletDbId: string
    if (existingWallet) {
      walletDbId = existingWallet.id
      await supabase.from('wallets').update({
        balance_sats: matched.balance,
        last_synced_at: new Date().toISOString(),
      }).eq('id', existingWallet.id)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('wallets')
        .insert({
          community_id: merchant.community_id,
          blink_wallet_id,
          wallet_currency: matched.walletCurrency,
          balance_sats: matched.balance,
          user_id: communityRow?.admin_id || merchant.community_id,
          last_synced_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        return new Response(JSON.stringify({ error: insErr?.message || 'Failed to register wallet' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      walletDbId = inserted.id
    }

    // Link merchant; clear claim hash (single-use)
    const { error: linkErr } = await supabase
      .from('merchants')
      .update({
        wallet_id: walletDbId,
        claimed_at: new Date().toISOString(),
        claim_token_hash: null,
      })
      .eq('id', merchant.id)

    if (linkErr) {
      return new Response(JSON.stringify({ error: linkErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Trigger sync (best-effort)
    supabase.functions.invoke('sync-blink-transactions', {
      body: { community_id: merchant.community_id },
    }).catch(() => {})

    return new Response(JSON.stringify({
      success: true,
      public_merchant_id: merchant.public_merchant_id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('claim-merchant error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
