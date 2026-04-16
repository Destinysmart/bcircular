const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let communityIds: string[] = []

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body.community_id) {
        communityIds = [body.community_id]
      }
    }

    if (communityIds.length === 0) {
      const { data: communities } = await supabase
        .from('communities')
        .select('id')
        .eq('status', 'active')
      communityIds = (communities || []).map((c: { id: string }) => c.id)
    }

    const results = []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    for (const communityId of communityIds) {
      // Fetch all data in parallel
      const [communityRes, merchantsRes, earnersRes, txRes, blinkTxRes, walletsRes] = await Promise.all([
        supabase.from('communities').select('declared_population').eq('id', communityId).single(),
        supabase.from('merchants').select('id, category, created_at, source').eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('earners').select('id, created_at').eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('transactions').select('id, amount_sats, is_circular, created_at').eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('blink_transactions').select('id, direction, settlement_amount, is_internal, counterparty_wallet_id, wallet_id, blink_created_at').eq('community_id', communityId),
        supabase.from('wallets').select('id, user_id').eq('community_id', communityId),
      ])

      const pop = Math.max(communityRes.data?.declared_population || 100, 1)
      const m = merchantsRes.data || []
      const e = earnersRes.data || []
      const tx = txRes.data || []
      const blinkTx = blinkTxRes.data || []
      const wallets = walletsRes.data || []

      const hasBlinkData = blinkTx.length > 0

      // ── Pillar 1: Merchant Saturation (25%) ──
      // BTCMap merchants count 1.5× because they're independently verified
      const btcmapCount = m.filter((x: any) => x.source === 'btcmap').length
      const selfReportedCount = m.filter((x: any) => x.source !== 'btcmap').length
      const weightedMerchantCount = (btcmapCount * 1.5) + selfReportedCount
      const uniqueCategories = new Set(m.map((x: any) => x.category)).size
      const diversityBonus = Math.min(uniqueCategories * 2, 10)
      const saturation = Math.min((weightedMerchantCount / pop) * 1000 + diversityBonus, 100)

      // ── Pillar 2: Retention Rate (25%) ──
      // Use Blink data if available (more accurate), else fall back to self-reported
      let retention = 0
      let satsEntering = 0
      let satsExiting = 0
      let satsCircularInternal = 0

      if (hasBlinkData) {
        // Sats entering: RECEIVE from external (not internal)
        satsEntering = blinkTx
          .filter((t: any) => t.direction === 'RECEIVE' && !t.is_internal)
          .reduce((s: number, t: any) => s + Number(t.settlement_amount), 0)

        // Sats exiting: SEND to external (not internal)
        satsExiting = blinkTx
          .filter((t: any) => t.direction === 'SEND' && !t.is_internal)
          .reduce((s: number, t: any) => s + Number(t.settlement_amount), 0)

        // Internal circular sats (both directions)
        satsCircularInternal = blinkTx
          .filter((t: any) => t.is_internal)
          .reduce((s: number, t: any) => s + Number(t.settlement_amount), 0)

        const totalFlow = satsEntering + satsCircularInternal + satsExiting
        retention = totalFlow > 0
          ? Math.min(((satsCircularInternal + (satsEntering - satsExiting)) / totalFlow) * 100, 100)
          : 0
        retention = Math.max(retention, 0) // clamp at 0
      } else {
        // Fallback: self-reported circular flag
        const circular = tx.filter((t: any) => t.is_circular).length
        retention = tx.length > 0 ? (circular / tx.length) * 100 : 0
      }

      // ── Pillar 3: Earner Penetration (20%) ──
      // Also count connected wallets as earners if they've received sats
      let effectiveEarners = e.length
      if (hasBlinkData) {
        // Unique wallets that received sats internally = active earners
        const activeReceivers = new Set(
          blinkTx
            .filter((t: any) => t.direction === 'RECEIVE' && t.is_internal)
            .map((t: any) => t.wallet_id)
        )
        effectiveEarners = Math.max(e.length, activeReceivers.size)
      }
      const earnerScore = Math.min((effectiveEarners / pop) * 500, 100)

      // ── Pillar 4: Transaction Velocity (15%) ──
      // Velocity = how actively participants transact
      // With Blink data: compute "hops" — internal transactions per active wallet per month
      let velocity = 0

      if (hasBlinkData) {
        const recentBlink = blinkTx.filter((t: any) =>
          new Date(t.blink_created_at) > thirtyDaysAgo
        )
        const internalRecent = recentBlink.filter((t: any) => t.is_internal)

        // Hops per sat: how many times sats change hands internally
        // Simplified: internal tx count / unique active wallets
        const activeWallets = new Set([
          ...internalRecent.map((t: any) => t.wallet_id),
          ...internalRecent.filter((t: any) => t.counterparty_wallet_id).map((t: any) => t.counterparty_wallet_id),
        ])

        const hopsPerWallet = activeWallets.size > 0
          ? internalRecent.length / activeWallets.size
          : 0

        // Scale: 5+ hops/wallet/month = 100
        velocity = Math.min((hopsPerWallet / 5) * 100, 100)
      } else {
        // Fallback: self-reported monthly txns per earner
        const monthlyTxns = tx.filter((t: any) => new Date(t.created_at) > thirtyDaysAgo).length
        velocity = e.length > 0 ? Math.min((monthlyTxns / e.length) * 10, 100) : 0
      }

      // ── Pillar 5: Growth Momentum (15%) ──
      const newMerchants = m.filter((x: any) => new Date(x.created_at) > thirtyDaysAgo).length
      const newEarners = e.filter((x: any) => new Date(x.created_at) > thirtyDaysAgo).length
      let growthBase = m.length + e.length

      // Also consider new wallet connections as growth signal
      if (hasBlinkData) {
        growthBase = Math.max(growthBase, wallets.length)
      }

      const growth = growthBase > 0 ? Math.min(((newMerchants + newEarners) / growthBase) * 200, 100) : 0

      // ── Final weighted score ──
      const score = Math.round(
        saturation * 0.25 +
        retention * 0.25 +
        earnerScore * 0.20 +
        velocity * 0.15 +
        growth * 0.15
      )

      const { error } = await supabase.from('circularity_scores').insert({
        community_id: communityId,
        score: Math.min(score, 100),
        merchant_density_score: Math.round(saturation * 100) / 100,
        earner_rate_score: Math.round(earnerScore * 100) / 100,
        retention_score: Math.round(retention * 100) / 100,
        growth_score: Math.round(growth * 100) / 100,
        velocity_score: Math.round(velocity * 100) / 100,
      })

      if (error) {
        console.error(`Error inserting score for ${communityId}:`, error)
      }

      results.push({
        communityId,
        score: Math.min(score, 100),
        dataSource: hasBlinkData ? 'blink+self-reported' : 'self-reported',
        metrics: {
          satsEntering,
          satsExiting,
          satsCircularInternal,
          effectiveEarners,
          connectedWallets: wallets.length,
          blinkTransactions: blinkTx.length,
        },
      })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
