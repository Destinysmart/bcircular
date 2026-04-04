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

    // Get specific community_id from body, or calculate for all active communities
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
      communityIds = (communities || []).map(c => c.id)
    }

    const results = []

    for (const communityId of communityIds) {
      // Get community member count
      const { data: community } = await supabase
        .from('communities')
        .select('member_count')
        .eq('id', communityId)
        .single()
      
      const members = Math.max(community?.member_count || 1, 1)

      // Count approved merchants
      const { count: merchantCount } = await supabase
        .from('merchants')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'approved')

      // Count approved earners
      const { count: earnerCount } = await supabase
        .from('earners')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'approved')

      // Get transaction stats
      const { data: transactions } = await supabase
        .from('transactions')
        .select('is_circular')
        .eq('community_id', communityId)
        .eq('status', 'approved')

      const totalTx = transactions?.length || 0
      const circularTx = transactions?.filter(t => t.is_circular).length || 0

      // Growth: merchants added this month vs total
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      const { count: newMerchants } = await supabase
        .from('merchants')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('status', 'approved')
        .gte('approved_at', monthAgo.toISOString())

      // Calculate sub-scores
      const merchantDensity = Math.min(((merchantCount || 0) / members) * 100, 100)
      const earnerRate = Math.min(((earnerCount || 0) / members) * 100, 100)
      const retention = totalTx > 0 ? (circularTx / totalTx) * 100 : 0
      const growth = (merchantCount || 0) > 0 
        ? Math.min(((newMerchants || 0) / (merchantCount || 1)) * 100, 100) 
        : 0
      const velocity = Math.min((totalTx / members) * 10, 100) // scale factor

      // Weighted average
      const score = Math.round(
        merchantDensity * 0.25 +
        earnerRate * 0.20 +
        retention * 0.25 +
        growth * 0.15 +
        velocity * 0.15
      )

      // Insert score snapshot
      const { error } = await supabase.from('circularity_scores').insert({
        community_id: communityId,
        score: Math.min(score, 100),
        merchant_density_score: Math.round(merchantDensity * 100) / 100,
        earner_rate_score: Math.round(earnerRate * 100) / 100,
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
