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
  // Merchant's OWN read-only Blink API key. Required so the platform can sync
  // the merchant's personal wallet transactions — the economy's API key cannot
  // access another account.
  merchant_api_key: z.string().min(8).max(512),
})

const WALLETS_QUERY = `
query Me {
  me {
    defaultAccount {
      wallets { id walletCurrency balance }
    }
  }
}`

async function getAesKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('BLINK_KEY_ENCRYPTION_SECRET')
  if (!secret) throw new Error('BLINK_KEY_ENCRYPTION_SECRET not configured')
  const keyMaterial = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  )
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0); out.set(ct, iv.length)
  return btoa(String.fromCharCode(...out))
}

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
    const merchant_api_key = parsed.data.merchant_api_key.trim()

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

    // Validate wallet ID format only.
    const isBlinkId = /^[A-Za-z0-9_-]{6,}$/.test(blink_wallet_id)
    const isLightningAddress = /@blink\.sv$/i.test(blink_wallet_id)
    if (!isBlinkId && !isLightningAddress) {
      return jsonResponse({
        error: 'That does not look like a valid Blink wallet ID or Lightning address. Check the value in your Blink app and try again.',
      }, 400)
    }

    // Validate the merchant's OWN Blink API key by probing their account.
    // If the wallet ID was provided as a Blink wallet UUID, also confirm it
    // belongs to this merchant's Blink account.
    let resolvedBlinkWalletId = blink_wallet_id
    let resolvedCurrency = 'BTC'
    let resolvedBalance = 0
    try {
      const blinkRes = await fetch(BLINK_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': merchant_api_key },
        body: JSON.stringify({ query: WALLETS_QUERY }),
      })
      const blinkJson: any = await blinkRes.json()
      if (!blinkRes.ok || blinkJson?.errors?.length) {
        const status = blinkRes.status
        if (status === 401 || /unauthor/i.test(JSON.stringify(blinkJson?.errors || ''))) {
          return jsonResponse({
            error: "Blink rejected that API key. Make sure you copied a valid read-only key from dashboard.blink.sv → API Keys.",
          }, 400)
        }
        return jsonResponse({
          error: 'Could not verify your Blink API key. Please double-check it and try again.',
        }, 400)
      }
      const wallets = blinkJson?.data?.me?.defaultAccount?.wallets ?? []
      if (!wallets.length) {
        return jsonResponse({
          error: 'Your Blink account has no wallets. Open the Blink app, create a wallet, then try again.',
        }, 400)
      }
      // If the user pasted a Blink wallet UUID, confirm it belongs to *their* account.
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(blink_wallet_id)
      let chosen: any
      if (uuidLike) {
        chosen = wallets.find((w: any) => w.id === blink_wallet_id)
        if (!chosen) {
          return jsonResponse({
            error: "That wallet ID was not found in your Blink account. Make sure the API key and wallet ID are from the same Blink account.",
          }, 400)
        }
      } else {
        // Lightning address or other identifier — pick BTC wallet from this account.
        chosen = wallets.find((w: any) => w.walletCurrency === 'BTC') || wallets[0]
        resolvedBlinkWalletId = chosen.id
      }
      resolvedCurrency = chosen.walletCurrency || 'BTC'
      resolvedBalance = Number(chosen.balance) || 0
    } catch (e) {
      console.error('blink probe failed', e)
      return jsonResponse({ error: 'Could not reach Blink right now. Please try again in a moment.' }, 502)
    }

    const encryptedKey = await encryptApiKey(merchant_api_key)

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
      .eq('blink_wallet_id', resolvedBlinkWalletId)
      .maybeSingle()

    let walletDbId: string
    if (existingWallet) {
      walletDbId = existingWallet.id
      const { error: updErr } = await supabase.from('wallets').update({
        owner_type: 'merchant',
        owner_id: merchant.id,
        wallet_status: 'connected',
        wallet_currency: resolvedCurrency,
        balance_sats: resolvedBalance,
        blink_api_key_encrypted: encryptedKey,
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
          blink_wallet_id: resolvedBlinkWalletId,
          wallet_currency: resolvedCurrency,
          balance_sats: resolvedBalance,
          user_id: communityRow?.admin_id || merchant.community_id,
          owner_type: 'merchant',
          owner_id: merchant.id,
          wallet_status: 'connected',
          blink_api_key_encrypted: encryptedKey,
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

    // Fire-and-forget: sync this merchant's own wallet (uses the merchant's API key).
    // Do not run the economy-wide Blink sync here — it uses the economy account key
    // and cannot read merchants' independent personal/business Blink accounts.
    const { data: merchantRow } = await supabase
      .from('merchants')
      .select('merchant_code')
      .eq('id', merchant.id)
      .maybeSingle()
    if (merchantRow?.merchant_code) {
      supabase.functions.invoke('sync-wallet-transactions', {
        body: { action: 'sync', owner_type: 'merchant', code: merchantRow.merchant_code },
      }).catch(() => {})
    }

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
