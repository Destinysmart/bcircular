// Privacy-first Blink wallet sync for merchants and earners.
// Stores AES-GCM encrypted API keys and only SHA-256 hashes of LN addresses
// and payment hashes — raw values never touch the database.

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

// ── Action shapes ─────────────────────────────────────────────────────────
const ConnectSchema = z.object({
  action: z.literal('connect'),
  owner_type: z.enum(['merchant', 'earner']),
  code: z.string().min(4).max(64),
  api_key: z.string().min(8).max(512),
  ln_address: z.string().trim().max(255).optional().nullable(),
})

const SyncSchema = z.object({
  action: z.literal('sync'),
  owner_type: z.enum(['merchant', 'earner']),
  code: z.string().min(4).max(64),
})

const SyncWalletSchema = z.object({
  action: z.literal('sync_wallet'),
  community_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
})

const ReclassifySchema = z.object({
  action: z.literal('reclassify'),
  community_id: z.string().uuid(),
})

const DashboardSchema = z.object({
  action: z.literal('dashboard'),
  code: z.string().min(4).max(64),
  owner_type: z.enum(['merchant', 'earner']).optional(),
})

const DisconnectSchema = z.object({
  action: z.literal('disconnect'),
  owner_type: z.enum(['merchant', 'earner']),
  code: z.string().min(4).max(64),
})

const BodySchema = z.discriminatedUnion('action', [ConnectSchema, SyncSchema, SyncWalletSchema, ReclassifySchema, DashboardSchema, DisconnectSchema])

// ── Crypto helpers ────────────────────────────────────────────────────────
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.toLowerCase().trim())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

// ── Blink GraphQL ─────────────────────────────────────────────────────────
const WALLETS_QUERY = `
query Me {
  me {
    defaultAccount {
      wallets { id walletCurrency balance }
    }
  }
}`

const TRANSACTIONS_QUERY = `
query Tx($walletId: WalletId!, $first: Int, $after: String) {
  me {
    defaultAccount {
      transactions(walletIds: [$walletId], first: $first, after: $after) {
        pageInfo { endCursor hasNextPage }
        edges {
          node {
            id direction settlementAmount settlementCurrency status createdAt memo
            initiationVia {
              ... on InitiationViaIntraLedger { counterPartyWalletId counterPartyUsername }
              ... on InitiationViaLn { paymentHash }
              ... on InitiationViaOnChain { address }
            }
            settlementVia {
              ... on SettlementViaIntraLedger { counterPartyWalletId counterPartyUsername }
              ... on SettlementViaLn { preImage paymentSecret }
              ... on SettlementViaOnChain { transactionHash }
            }
          }
        }
      }
    }
  }
}`

async function blinkGraphQL(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(BLINK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Blink API error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(`Blink GraphQL: ${json.errors[0].message}`)
  return json.data
}

function isBlinkUnauthorized(message: string) {
  return /Blink API error 401|Authorization Required|unauthor/i.test(message)
}

async function markWalletAuthError(supabase: any, walletId: string) {
  await supabase
    .from('wallets')
    .update({ wallet_status: 'auth_error', last_synced_at: new Date().toISOString() })
    .eq('id', walletId)
}

function authErrorResponse(status = 200) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Blink rejected the stored API key (401). Ask the wallet owner to re-connect with a fresh read-only key.',
      code: 'blink_unauthorized',
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

// ── Owner lookup (by code) ────────────────────────────────────────────────
async function lookupOwner(supabase: any, owner_type: 'merchant' | 'earner', code: string) {
  if (owner_type === 'merchant') {
    const { data, error } = await supabase
      .from('merchants')
      .select('id, community_id, status, name, pending_blink_api_key_encrypted, pending_ln_address_hash')
      .eq('merchant_code', code)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    if (data.status !== 'approved') return { ...data, _not_approved: true }
    return data
  } else {
    const { data, error } = await supabase
      .from('earners')
      .select('id, community_id, status, description, pending_blink_api_key_encrypted, pending_ln_address_hash')
      .eq('earner_code', code)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    if (data.status !== 'approved') return { ...data, _not_approved: true }
    return { ...data, name: data.description }
  }
}

async function findOwnerWallet(supabase: any, owner_type: string, owner_id: string) {
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('owner_type', owner_type)
    .eq('owner_id', owner_id)
    .maybeSingle()
  return data
}

async function ensureOwnerWallet(supabase: any, owner_type: 'merchant' | 'earner', owner: any) {
  const existing = await findOwnerWallet(supabase, owner_type, owner.id)
  if (existing) return existing
  if (!owner.pending_blink_api_key_encrypted) return null

  // Use owner.id as user_id placeholder so the (user_id, community_id, wallet_currency)
  // unique constraint never collides between two owners in the same community.
  const { data, error } = await supabase.from('wallets').upsert({
    community_id: owner.community_id,
    user_id: owner.id,
    blink_wallet_id: '',
    wallet_currency: 'BTC',
    balance_sats: 0,
    owner_type,
    owner_id: owner.id,
    ln_address_hash: owner.pending_ln_address_hash || null,
    blink_api_key_encrypted: owner.pending_blink_api_key_encrypted,
    wallet_status: 'pending',
  }, { onConflict: 'community_id,blink_wallet_id' }).select('*').single()
  if (error) throw error

  if (owner_type === 'merchant') {
    await supabase.from('merchants').update({
      wallet_id: data.id,
      has_wallet_pending: false,
      pending_blink_api_key_encrypted: null,
      pending_ln_address_hash: null,
    }).eq('id', owner.id)
  } else {
    const { data: earnerWallet } = await supabase.from('earner_wallets').select('id').eq('earner_id', owner.id).maybeSingle()
    if (earnerWallet) {
      await supabase.from('earner_wallets').update({ wallet_id: data.id, claimed_at: new Date().toISOString() }).eq('id', earnerWallet.id)
    } else {
      await supabase.from('earner_wallets').insert({
        earner_id: owner.id,
        community_id: owner.community_id,
        wallet_id: data.id,
        claimed_at: new Date().toISOString(),
      })
    }
    await supabase.from('earners').update({
      has_wallet_pending: false,
      pending_blink_api_key_encrypted: null,
      pending_ln_address_hash: null,
    }).eq('id', owner.id)
  }

  return data
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

// ── Metric recompute ──────────────────────────────────────────────────────
async function recomputeMetrics(supabase: any, community_id: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: txns } = await supabase
    .from('blink_transactions')
    .select('direction, settlement_amount, is_internal, wallet_id, flow_type')
    .eq('community_id', community_id)
    .gte('blink_created_at', since)

  const list = txns || []
  let inflow = 0, outflow = 0, circular = 0, circularCount = 0, offramp = 0
  for (const t of list) {
    const amt = Number(t.settlement_amount) || 0
    if (t.direction === 'RECEIVE') inflow += amt
    else outflow += amt
    if (t.is_internal) { circular += amt; circularCount++ }
    if (t.flow_type === 'offramp_or_external') offramp += amt
  }
  const totalVol = inflow + outflow
  const rate = totalVol > 0 ? Math.round((circular / totalVol) * 10000) / 100 : 0

  const { data: connectedWallets } = await supabase
    .from('wallets')
    .select('owner_type')
    .eq('community_id', community_id)
    .eq('wallet_status', 'connected')

  const merch = (connectedWallets || []).filter((w: any) => w.owner_type === 'merchant').length
  const earn = (connectedWallets || []).filter((w: any) => w.owner_type === 'earner').length

  await supabase.from('economy_wallet_metrics').insert({
    community_id,
    period_start: since,
    period_end: new Date().toISOString(),
    total_inflow_sats: inflow,
    total_outflow_sats: outflow,
    circular_volume_sats: circular,
    circular_transaction_count: circularCount,
    total_transaction_count: list.length,
    real_circularity_rate: rate,
    offramp_volume_sats: offramp,
    active_merchant_wallets: merch,
    active_earner_wallets: earn,
  })
}

// ── Sync handler ──────────────────────────────────────────────────────────
async function performSync(supabase: any, walletRow: any) {
  const apiKey = await decryptApiKey(walletRow.blink_api_key_encrypted)

  // Resolve a Blink wallet ID if not yet stored
  let blinkWalletId = walletRow.blink_wallet_id
  if (!blinkWalletId) {
    const wd = await blinkGraphQL(apiKey, WALLETS_QUERY)
    const btcWallet = wd.me?.defaultAccount?.wallets?.find((w: any) => w.walletCurrency === 'BTC')
      || wd.me?.defaultAccount?.wallets?.[0]
    if (!btcWallet) throw new Error('No Blink wallet found for this API key')
    blinkWalletId = btcWallet.id
    await supabase.from('wallets').update({
      blink_wallet_id: blinkWalletId,
      balance_sats: btcWallet.balance,
    }).eq('id', walletRow.id)
  }

  // Build set of community LN-address hashes + Blink wallet IDs for circular detection
  // Hash pool unifies merchants AND earners — any registered wallet in the economy.
  const { data: connWallets } = await supabase
    .from('wallets')
    .select('id, blink_wallet_id, ln_address_hash, owner_type')
    .eq('community_id', walletRow.community_id)
    .eq('wallet_status', 'connected')

  const economyBlinkIds = new Set((connWallets || []).map((w: any) => w.blink_wallet_id).filter(Boolean))
  const economyHashes = new Set((connWallets || []).map((w: any) => w.ln_address_hash).filter(Boolean))

  console.log(
    `[sync] community ${walletRow.community_id} hash pool size: ${economyHashes.size} (${economyBlinkIds.size} blink ids, ${(connWallets || []).length} connected wallets)`,
  )

  // Fetch transactions (cap pages)
  let synced = 0, internal = 0
  let cursor: string | null = null
  let hasMore = true
  let pages = 0
  const MAX_PAGES = 5

  while (hasMore && pages < MAX_PAGES) {
    const variables: Record<string, unknown> = { walletId: blinkWalletId, first: 50 }
    if (cursor) variables.after = cursor
    const txData = await blinkGraphQL(apiKey, TRANSACTIONS_QUERY, variables)
    const conn = txData.me?.defaultAccount?.transactions
    const edges = conn?.edges || []

    for (const edge of edges) {
      const node = edge.node
      if (node.status !== 'SUCCESS') continue

      // Counterparty wallet id may live in initiationVia OR settlementVia
      // (Blink returns it via SettlementViaIntraLedger for same-account
      // intraledger transfers, where InitiationViaLn carries no counterparty).
      const counterPartyWalletId: string | null =
        node.initiationVia?.counterPartyWalletId
        || node.settlementVia?.counterPartyWalletId
        || null
      const rawPaymentHash: string | null = node.initiationVia?.paymentHash || null
      const paymentHashSha = rawPaymentHash ? await sha256Hex(rawPaymentHash) : null

      // Wallet-ID match first (works even when both wallets share the same LN address / owner)
      let isInternal = counterPartyWalletId ? economyBlinkIds.has(counterPartyWalletId) : false
      let counterpartyDbWalletId: string | null = null
      if (isInternal && counterPartyWalletId) {
        const match = (connWallets || []).find((w: any) => w.blink_wallet_id === counterPartyWalletId)
        if (match?.id) counterpartyDbWalletId = match.id
      }

      console.log(
        `[sync] tx ${node.id} dir=${node.direction} amt=${node.settlementAmount} cpWalletId=${counterPartyWalletId} payHashSha=${paymentHashSha?.slice(0, 8) || 'none'} → isInternal=${isInternal}`,
      )

      // Payment-hash pairing fallback
      if (!isInternal && paymentHashSha) {
        const { data: pair } = await supabase
          .from('blink_transactions')
          .select('wallet_id, direction')
          .eq('community_id', walletRow.community_id)
          .eq('payment_hash_sha256', paymentHashSha)
          .neq('wallet_id', walletRow.id)
          .limit(1)
          .maybeSingle()
        if (pair) {
          isInternal = true
          counterpartyDbWalletId = pair.wallet_id
          const pairedFlow = pair.direction === 'RECEIVE' ? 'circular_receive' : 'circular_spend'
          await supabase.from('blink_transactions').update({
            is_internal: true,
            counterparty_wallet_id: walletRow.id,
            flow_type: pairedFlow,
          }).eq('community_id', walletRow.community_id)
            .eq('payment_hash_sha256', paymentHashSha)
            .eq('wallet_id', pair.wallet_id)
          console.log(`[sync] tx ${node.id} matched via payment_hash to wallet ${pair.wallet_id}`)
        }
      }

      if (isInternal) internal++

      const flowType = isInternal
        ? (node.direction === 'RECEIVE' ? 'circular_receive' : 'circular_spend')
        : (node.direction === 'RECEIVE' ? 'inflow_external' : 'offramp_or_external')

      const { error: txErr } = await supabase.from('blink_transactions').upsert({
        community_id: walletRow.community_id,
        wallet_id: walletRow.id,
        blink_tx_id: node.id,
        direction: node.direction,
        settlement_amount: Math.abs(node.settlementAmount),
        settlement_currency: node.settlementCurrency,
        status: node.status,
        is_internal: isInternal,
        counterparty_wallet_id: counterpartyDbWalletId,
        payment_hash_sha256: paymentHashSha,
        flow_type: flowType,
        memo: node.memo || null,
        blink_created_at: new Date(node.createdAt * 1000).toISOString(),
      }, { onConflict: 'blink_tx_id,wallet_id' })
      if (!txErr) synced++
    }

    hasMore = !!conn?.pageInfo?.hasNextPage
    cursor = conn?.pageInfo?.endCursor || null
    pages++
  }

  await supabase.from('wallets').update({
    wallet_status: 'connected',
    last_synced_at: new Date().toISOString(),
  }).eq('id', walletRow.id)

  await recomputeMetrics(supabase, walletRow.community_id)
  return { synced, internal }
}

// ── Server ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )


    if (body.action === 'reclassify') {
      const authError = await requireEconomyAdmin(req, supabase, body.community_id)
      if (authError) {
        return new Response(JSON.stringify({ error: authError }), {
          status: authError === 'Unauthorized' ? 401 : 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Pull every transaction in this economy + the wallet table for matching.
      const { data: txs } = await supabase
        .from('blink_transactions')
        .select('id, wallet_id, direction, settlement_amount, payment_hash_sha256, blink_created_at, is_internal, counterparty_wallet_id, flow_type')
        .eq('community_id', body.community_id)

      let updated = 0
      let pairedInternal = 0
      const all = txs || []

      // Pass 1: payment-hash pairing
      const byHash = new Map<string, any[]>()
      for (const t of all) {
        if (!t.payment_hash_sha256) continue
        const arr = byHash.get(t.payment_hash_sha256) || []
        arr.push(t)
        byHash.set(t.payment_hash_sha256, arr)
      }

      const internalIds = new Map<string, string>() // tx.id -> counterparty wallet id
      for (const [, group] of byHash) {
        if (group.length < 2) continue
        const wallets = new Set(group.map(g => g.wallet_id))
        if (wallets.size < 2) continue
        for (const t of group) {
          const other = group.find(g => g.wallet_id !== t.wallet_id)
          if (other) internalIds.set(t.id, other.wallet_id)
        }
      }

      // Pass 2: timestamp+amount pairing for orphan rows (Blink omits cp data
      // for some intraledger transfers — pair SEND/RECEIVE within ±5s, same amount).
      const PAIR_WINDOW_MS = 5_000
      for (const a of all) {
        if (internalIds.has(a.id)) continue
        if (a.direction !== 'SEND') continue
        const aTime = new Date(a.blink_created_at).getTime()
        const match = all.find(b =>
          b.id !== a.id
          && b.wallet_id !== a.wallet_id
          && b.direction === 'RECEIVE'
          && Number(b.settlement_amount) === Number(a.settlement_amount)
          && !internalIds.has(b.id)
          && Math.abs(new Date(b.blink_created_at).getTime() - aTime) <= PAIR_WINDOW_MS,
        )
        if (match) {
          internalIds.set(a.id, match.wallet_id)
          internalIds.set(match.id, a.wallet_id)
        }
      }

      // Apply updates
      for (const t of all) {
        const cp = internalIds.get(t.id) || null
        const isInternal = !!cp
        const flowType = isInternal
          ? (t.direction === 'RECEIVE' ? 'circular_receive' : 'circular_spend')
          : (t.direction === 'RECEIVE' ? 'inflow_external' : 'offramp_or_external')

        if (
          t.is_internal === isInternal
          && t.counterparty_wallet_id === cp
          && t.flow_type === flowType
        ) continue

        const { error: upErr } = await supabase.from('blink_transactions').update({
          is_internal: isInternal,
          counterparty_wallet_id: cp,
          flow_type: flowType,
        }).eq('id', t.id)
        if (!upErr) {
          updated++
          if (isInternal) pairedInternal++
        }
      }

      console.log(`[reclassify] community ${body.community_id}: ${all.length} scanned, ${updated} updated, ${pairedInternal} now internal`)

      await recomputeMetrics(supabase, body.community_id)

      return new Response(JSON.stringify({
        success: true,
        scanned: all.length,
        updated,
        internal_now: pairedInternal,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'sync_wallet') {
      const authError = await requireEconomyAdmin(req, supabase, body.community_id)
      if (authError) {
        return new Response(JSON.stringify({ error: authError }), {
          status: authError === 'Unauthorized' ? 401 : 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', body.wallet_id)
        .eq('community_id', body.community_id)
        .maybeSingle()
      if (walletError) throw walletError
      if (!wallet?.blink_api_key_encrypted) {
        return new Response(JSON.stringify({ error: 'Wallet not connected' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      try {
        const result = await performSync(supabase, wallet)
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (syncErr: any) {
        const msg = String(syncErr?.message || syncErr)
        // Blink rejected the stored API key — flag the wallet so admin can re-link.
        if (isBlinkUnauthorized(msg)) {
          await markWalletAuthError(supabase, wallet.id)
          return authErrorResponse()
        }
        throw syncErr
      }
    }

    const ownerTypes: Array<'merchant' | 'earner'> = body.action === 'dashboard' && !body.owner_type
      ? (body.code.startsWith('ear_') ? ['earner', 'merchant'] : ['merchant', 'earner'])
      : [body.owner_type as 'merchant' | 'earner']
    let owner: any = null
    let resolvedOwnerType: 'merchant' | 'earner' | undefined
    for (const ownerType of ownerTypes) {
      if (!ownerType) continue
      owner = await lookupOwner(supabase, ownerType, body.code)
      if (owner) { resolvedOwnerType = ownerType; break }
    }
    if (!owner) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const isPending = !!(owner as any)._not_approved

    if (body.action === 'dashboard') {
      const { data: community } = await supabase
        .from('communities').select('name, slug, city, country')
        .eq('id', owner.community_id).maybeSingle()
      // Only resolve a real wallet for approved owners; pending owners
      // surface as wallet_status='pending' (or null) so the UI can show
      // a "waiting for validator approval" state instead of 404'ing.
      const wallet = isPending ? null : await ensureOwnerWallet(supabase, resolvedOwnerType!, owner)
      const hasPendingKey = !!(owner as any).pending_blink_api_key_encrypted
      return new Response(JSON.stringify({
        success: true,
        owner_type: resolvedOwnerType,
        approval_status: isPending ? 'pending' : 'approved',
        owner: {
          id: owner.id,
          community_id: owner.community_id,
          community_name: community?.name || '',
          community_slug: community?.slug || '',
          community_city: community?.city || '',
          community_country: community?.country || '',
          name: owner.name,
        },
        wallet: wallet ? {
          id: wallet.id,
          wallet_status: wallet.wallet_status,
          last_synced_at: wallet.last_synced_at,
          balance_sats: wallet.balance_sats,
          ln_address_hash: wallet.ln_address_hash,
        } : (isPending && hasPendingKey ? {
          id: '', wallet_status: 'pending', last_synced_at: null, balance_sats: 0, ln_address_hash: null,
        } : null),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (isPending) {
      return new Response(JSON.stringify({ error: 'This submission has not been approved by validators yet.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'connect') {
      const encrypted = await encryptApiKey(body.api_key)
      const lnHash = body.ln_address ? await sha256Hex(body.ln_address) : null

      // Probe Blink to validate the key + grab a wallet id
      let blinkWalletId: string | null = null
      let balance = 0
      try {
        const wd = await blinkGraphQL(body.api_key, WALLETS_QUERY)
        const btc = wd.me?.defaultAccount?.wallets?.find((w: any) => w.walletCurrency === 'BTC')
          || wd.me?.defaultAccount?.wallets?.[0]
        if (!btc) throw new Error('No wallet found')
        blinkWalletId = btc.id
        balance = btc.balance || 0
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid Blink API key or no wallet available.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // UPSERT on (user_id, community_id, wallet_currency) — owner.id as user_id
      // ensures the unique constraint never collides between two owners.
      const { data: walletRow, error: upsertErr } = await supabase.from('wallets').upsert({
        community_id: owner.community_id,
        user_id: owner.id,
        blink_wallet_id: blinkWalletId,
        wallet_currency: 'BTC',
        balance_sats: balance,
        owner_type: body.owner_type,
        owner_id: owner.id,
        ln_address_hash: lnHash,
        blink_api_key_encrypted: encrypted,
        wallet_status: 'connected',
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'community_id,blink_wallet_id' }).select('*').single()
      if (upsertErr) throw upsertErr

      // Link merchant/earner row
      if (body.owner_type === 'merchant') {
        await supabase.from('merchants').update({
          wallet_id: walletRow.id,
          claimed_at: new Date().toISOString(),
        }).eq('id', owner.id)
      } else {
        const { data: ew } = await supabase.from('earner_wallets')
          .select('id').eq('earner_id', owner.id).maybeSingle()
        if (ew) {
          await supabase.from('earner_wallets').update({
            wallet_id: walletRow.id, claimed_at: new Date().toISOString(),
          }).eq('id', ew.id)
        } else {
          await supabase.from('earner_wallets').insert({
            earner_id: owner.id, community_id: owner.community_id,
            wallet_id: walletRow.id, claimed_at: new Date().toISOString(),
          })
        }
      }

      const result = await performSync(supabase, walletRow)
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'sync') {
      const wallet = await ensureOwnerWallet(supabase, body.owner_type, owner)
      if (!wallet?.blink_api_key_encrypted) {
        return new Response(JSON.stringify({ error: 'Wallet not connected' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      let result: any
      try {
        result = await performSync(supabase, wallet)
      } catch (syncErr: any) {
        const msg = String(syncErr?.message || syncErr)
        if (isBlinkUnauthorized(msg)) {
          await markWalletAuthError(supabase, wallet.id)
          return authErrorResponse()
        }
        throw syncErr
      }
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'disconnect') {
      const wallet = await findOwnerWallet(supabase, body.owner_type, owner.id)
      if (!wallet) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // PRIVACY CONSTITUTION — disconnect is irreversible deletion.
      // 1. Delete every blink_transactions row for this wallet (and any rows where
      //    this wallet was the counterparty, so no trace of it remains).
      await supabase.from('blink_transactions').delete().eq('wallet_id', wallet.id)
      await supabase.from('blink_transactions')
        .update({ counterparty_wallet_id: null })
        .eq('counterparty_wallet_id', wallet.id)

      // 2. Wipe the encrypted key, address hash, and Blink wallet id from the wallet row.
      await supabase.from('wallets').update({
        blink_api_key_encrypted: null,
        ln_address_hash: null,
        blink_wallet_id: '',
        balance_sats: 0,
        wallet_status: 'disconnected',
        last_synced_at: null,
      }).eq('id', wallet.id)

      // 3. Unlink the merchant/earner.
      if (body.owner_type === 'merchant') {
        await supabase.from('merchants').update({ wallet_id: null }).eq('id', owner.id)
      } else {
        await supabase.from('earner_wallets').update({ wallet_id: null }).eq('earner_id', owner.id)
      }

      // 4. Recompute economy aggregates so the public dashboard reflects the loss.
      await recomputeMetrics(supabase, owner.community_id)

      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('sync-wallet-transactions error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
