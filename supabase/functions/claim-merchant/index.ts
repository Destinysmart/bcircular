const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BLINK_API_URL = 'https://api.blink.sv/graphql'

const BodySchema = z.object({
  public_merchant_id: z.string().min(4),
  claim_token: z.string().min(8),
  // Accept any non-trivial Blink wallet identifier or Lightning address.
  // We do NOT verify it against any Blink account — merchants connect their own
  // independent personal/business Blink wallets, which will never appear in the
  // economy's Blink account.
  blink_wallet_id: z.string().min(6),
})

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let bodyJson: unknown
    try {
      bodyJson = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const parsed = BodySchema.safeParse(bodyJson)
    if (!parsed.success) {
      return jsonResponse({ error: 'Please fill in both the claim token and Blink wallet ID.' }, 400)
    }
    const { public_merchant_id, claim_token } = parsed.data
    // Normalize wallet ID — strip optional "blink_" prefix, trim whitespace.
    const blink_wallet_id = parsed.data.blink_wallet_id.trim().replace(/^blink_/i, '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: merchant, error: mErr } = await supabase
      .from('merchants')
      .select('id, community_id, status, claim_token_hash, wallet_id, public_merchant_id, claimed_at')
      .eq('public_merchant_id', public_merchant_id)
      .maybeSingle()

    if (mErr) {
      console.error('merchant lookup error', mErr)
      return jsonResponse({ error: 'Could not look up merchant. Try again shortly.' }, 500)
    }
    if (!merchant) {
      return jsonResponse({ error: 'This claim link is invalid. Contact your economy admin for a new link.' }, 404)
    }
    if (merchant.status !== 'approved') {
      return jsonResponse({ error: 'This merchant has not been approved yet. Ask your economy admin to approve it first.' }, 400)
    }
    if (!merchant.claim_token_hash) {
      return jsonResponse({
        error: 'This claim link has already been used or has expired. Contact your economy admin for a new link.',
      }, 400)
    }

    const submittedHash = await sha256Hex(claim_token.trim())
    if (!timingSafeEqual(submittedHash, merchant.claim_token_hash)) {
      return jsonResponse({
        error: 'This claim link has already been used or has expired. Contact your economy admin for a new link.',
      }, 403)
    }

    // Validate wallet ID format only — do NOT check against the economy's Blink
    // account. A merchant's personal Blink wallet is a separate account and
    // will never appear in the economy's wallet list.
    const isBlinkId = /^[A-Za-z0-9_-]{6,}$/.test(blink_wallet_id)
    const isLightningAddress = /@blink\.sv$/i.test(blink_wallet_id)
    if (!isBlinkId && !isLightningAddress) {
      return jsonResponse({
        error: 'That does not look like a valid Blink wallet ID or Lightning address. Check the value in your Blink app and try again.',
      }, 400)
    }

    const { data: communityRow } = await supabase
      .from('communities')
      .select('admin_id')
      .eq('id', merchant.community_id)
      .single()

    // Upsert wallet row, owned by merchant
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('community_id', merchant.community_id)
      .eq('blink_wallet_id', blink_wallet_id)
      .maybeSingle()

    let walletDbId: string
    if (existingWallet) {
      walletDbId = existingWallet.id
      const { error: updErr } = await supabase.from('wallets').update({
        owner_type: 'merchant',
        owner_id: merchant.id,
        wallet_status: 'connected',
        last_synced_at: new Date().toISOString(),
      }).eq('id', existingWallet.id)
      if (updErr) {
        console.error('wallet update failed', updErr)
        return jsonResponse({ error: 'Could not update wallet record. Please try again.' }, 500)
      }
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('wallets')
        .insert({
          community_id: merchant.community_id,
          blink_wallet_id,
          user_id: communityRow?.admin_id || merchant.community_id,
          owner_type: 'merchant',
          owner_id: merchant.id,
          wallet_status: 'connected',
          last_synced_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        console.error('wallet insert failed', insErr)
        return jsonResponse({ error: insErr?.message || 'Failed to register wallet' }, 500)
      }
      walletDbId = inserted.id
    }

    const { error: linkErr } = await supabase
      .from('merchants')
      .update({
        wallet_id: walletDbId,
        claimed_at: new Date().toISOString(),
        claim_token_hash: null,
      })
      .eq('id', merchant.id)

    if (linkErr) {
      console.error('merchant link failed', linkErr)
      return jsonResponse({ error: linkErr.message }, 500)
    }

    supabase.functions.invoke('sync-blink-transactions', {
      body: { community_id: merchant.community_id },
    }).catch(() => {})

    return jsonResponse({
      success: true,
      public_merchant_id: merchant.public_merchant_id,
      message: "Wallet linked successfully! Save this page link — it's your private dashboard.",
    })
  } catch (err) {
    console.error('claim-merchant error:', err)
    return jsonResponse({ error: 'Something went wrong while linking your wallet. Please try again.' }, 500)
  }
})
