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
      const { data: community } = await supabase
        .from('communities')
        .select('declared_population')
        .eq('id', communityId)
        .single()

      const pop = Math.max(community?.declared_population || 100, 1)

      const { data: merchants } = await supabase
        .from('merchants')
        .select('id, category, created_at')
        .eq('community_id', communityId)
        .eq('status', 'approved')

      const { data: earners } = await supabase
        .from('earners')
        .select('id, created_at')
        .eq('community_id', communityId)
        .eq('status', 'approved')

      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, is_circular, created_at')
        .eq('community_id', communityId)
        .eq('status', 'approved')

      const m = merchants || []
      const e = earners || []
      const tx = transactions || []

      // Pillar 1: Merchant Saturation (25%)
      const uniqueCategories = new Set(m.map((x: { category: string }) => x.category)).size
      const diversityBonus = Math.min(uniqueCategories * 2, 10)
      const saturation = Math.min((m.length / pop) * 1000 + diversityBonus, 100)

      // Pillar 2: Retention Rate (25%)
      const circular = tx.filter((t: { is_circular: boolean }) => t.is_circular).length
      const retention = tx.length > 0 ? (circular / tx.length) * 100 : 0

      // Pillar 3: Earner Penetration (20%)
      const earnerScore = Math.min((e.length / pop) * 500, 100)

      // Pillar 4: Transaction Velocity (15%)
      const monthlyTxns = tx.filter((t: { created_at: string }) => new Date(t.created_at) > thirtyDaysAgo).length
      const velocity = e.length > 0 ? Math.min((monthlyTxns / e.length) * 10, 100) : 0

      // Pillar 5: Growth Momentum (15%)
      const newMerchants = m.filter((x: { created_at: string }) => new Date(x.created_at) > thirtyDaysAgo).length
      const newEarners = e.filter((x: { created_at: string }) => new Date(x.created_at) > thirtyDaysAgo).length
      const total = m.length + e.length
      const growth = total > 0 ? Math.min(((newMerchants + newEarners) / total) * 200, 100) : 0

      // Final weighted score
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

      results.push({ communityId, score: Math.min(score, 100) })
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
