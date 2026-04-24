const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BLINK_API_URL = 'https://api.blink.sv/graphql'

const BodySchema = z.object({
  community_id: z.string().uuid(),
})

// GraphQL query to get wallet info and transactions
const WALLETS_QUERY = `
query Me {
  me {
    defaultAccount {
      wallets {
        id
        walletCurrency
        balance
      }
    }
  }
}`

const TRANSACTIONS_QUERY = `
query TransactionsForWallet($walletId: WalletId!, $first: Int, $after: String) {
  me {
    defaultAccount {
      transactions(walletIds: [$walletId], first: $first, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          cursor
          node {
            id
            direction
            settlementAmount
            settlementCurrency
            status
            createdAt
            memo
            initiationVia {
              ... on InitiationViaIntraLedger {
                counterPartyWalletId
              }
              ... on InitiationViaLn {
                paymentHash
              }
              ... on InitiationViaOnChain {
                address
              }
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
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Blink API error [${res.status}]: ${text}`)
  }

  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(`Blink GraphQL error: ${json.errors[0].message}`)
  }
  return json.data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: require valid JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerId = claimsData.claims.sub as string

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { community_id } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Authorize: caller must be community admin or super admin
    const [{ data: c }, { data: ca }, { data: roleRow }] = await Promise.all([
      supabase.from('communities').select('admin_id').eq('id', community_id).maybeSingle(),
      supabase.from('community_admins').select('id').eq('community_id', community_id).eq('user_id', callerId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', callerId).eq('role', 'admin').maybeSingle(),
    ])
    if (c?.admin_id !== callerId && !ca && !roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Get the Blink API key for this economy
    const { data: apiKeyRow, error: keyError } = await supabase
      .from('blink_api_keys')
      .select('api_key_encrypted, id')
      .eq('community_id', community_id)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyRow) {
      return new Response(JSON.stringify({ error: 'No Blink API key configured for this economy' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const blinkApiKey = apiKeyRow.api_key_encrypted

    // 2. Fetch wallets from Blink
    const walletsData = await blinkGraphQL(blinkApiKey, WALLETS_QUERY)
    const blinkWallets = walletsData.me.defaultAccount.wallets
    console.log('Blink wallets found:', blinkWallets.map((w: any) => ({ id: w.id, currency: w.walletCurrency, balance: w.balance })))

    // 3. Auto-register any Blink wallets not yet in the DB for this economy
    // Get the community admin_id to use as the user_id for auto-registered wallets
    const { data: communityRow } = await supabase
      .from('communities')
      .select('admin_id')
      .eq('id', community_id)
      .single()

    for (const bw of blinkWallets) {
      const { data: existing } = await supabase
        .from('wallets')
        .select('id')
        .eq('community_id', community_id)
        .eq('blink_wallet_id', bw.id)
        .maybeSingle()

      if (!existing) {
        console.log('Auto-registering Blink wallet:', bw.id, bw.walletCurrency)
        await supabase.from('wallets').insert({
          community_id,
          blink_wallet_id: bw.id,
          wallet_currency: bw.walletCurrency,
          balance_sats: bw.balance,
          user_id: communityRow?.admin_id || community_id, // fallback
          last_synced_at: new Date().toISOString(),
        })
      } else {
        await supabase.from('wallets').update({
          balance_sats: bw.balance,
          last_synced_at: new Date().toISOString(),
        }).eq('id', existing.id)
      }
    }

    // 4. Reload connected wallets after auto-registration
    const { data: connectedWallets } = await supabase
      .from('wallets')
      .select('*')
      .eq('community_id', community_id)

    // Build a set of all connected blink wallet IDs in this economy for internal detection
    const economyBlinkWalletIds = new Set(
      (connectedWallets || []).map(w => w.blink_wallet_id)
    )

    // 4. Fetch transactions for each connected wallet
    let totalSynced = 0
    let totalInternal = 0

    for (const wallet of (connectedWallets || [])) {
      const blinkWallet = blinkWallets.find((bw: any) => bw.id === wallet.blink_wallet_id)
      if (!blinkWallet) continue

      let hasMore = true
      let cursor: string | null = null
      let pageCount = 0
      const MAX_PAGES = 5 // Limit pages per sync

      while (hasMore && pageCount < MAX_PAGES) {
        const variables: Record<string, unknown> = {
          walletId: wallet.blink_wallet_id,
          first: 50,
        }
        if (cursor) variables.after = cursor

        const txData = await blinkGraphQL(blinkApiKey, TRANSACTIONS_QUERY, variables)
        const connection = txData.me.defaultAccount.transactions
        const edges = connection.edges || []

        for (const edge of edges) {
          const node = edge.node
          if (node.status !== 'SUCCESS') continue

          // Check if counterparty is also in this economy (internal transaction)
          const counterPartyWalletId = node.initiationVia?.counterPartyWalletId || null
          const isInternal = counterPartyWalletId ? economyBlinkWalletIds.has(counterPartyWalletId) : false

          // Find the counterparty wallet record if internal
          let counterpartyDbWalletId: string | null = null
          if (isInternal && counterPartyWalletId) {
            const match = connectedWallets?.find(w => w.blink_wallet_id === counterPartyWalletId)
            if (match) counterpartyDbWalletId = match.id
            totalInternal++
          }

          // Upsert the transaction
          const { error: txError } = await supabase.from('blink_transactions').upsert({
            community_id,
            wallet_id: wallet.id,
            blink_tx_id: node.id,
            direction: node.direction,
            settlement_amount: Math.abs(node.settlementAmount),
            settlement_currency: node.settlementCurrency,
            status: node.status,
            is_internal: isInternal,
            counterparty_wallet_id: counterpartyDbWalletId,
            memo: node.memo || null,
            blink_created_at: new Date(node.createdAt * 1000).toISOString(),
          }, {
            onConflict: 'blink_tx_id,wallet_id',
          })

          if (!txError) totalSynced++
        }

        hasMore = connection.pageInfo.hasNextPage
        cursor = connection.pageInfo.endCursor
        pageCount++
      }
    }

    // 5. Update last_used_at on the API key
    await supabase.from('blink_api_keys').update({
      last_used_at: new Date().toISOString(),
    }).eq('id', apiKeyRow.id)

    return new Response(JSON.stringify({
      success: true,
      wallets_found: blinkWallets.length,
      connected_wallets: connectedWallets?.length || 0,
      transactions_synced: totalSynced,
      internal_transactions: totalInternal,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
