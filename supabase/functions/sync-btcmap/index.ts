const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BTCMAP_API = 'https://api.btcmap.org/v2/elements'

const BodySchema = z.object({
  community_id: z.string().uuid(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get community bbox
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('bbox_north, bbox_south, bbox_east, bbox_west')
      .eq('id', community_id)
      .single()

    if (communityError || !community) {
      return new Response(JSON.stringify({ error: 'Community not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { bbox_north, bbox_south, bbox_east, bbox_west } = community
    if (!bbox_north || !bbox_south || !bbox_east || !bbox_west) {
      return new Response(JSON.stringify({ error: 'Bounding box not set. Configure it in the admin dashboard first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const north = Number(bbox_north)
    const south = Number(bbox_south)
    const east = Number(bbox_east)
    const west = Number(bbox_west)

    // Paginate through ALL BTCMap elements
    // BTCMap API returns up to 5000 per request, paginated by updated_since
    let allMerchants: any[] = []
    let updatedSince = '2020-01-01T00:00:00.000Z'
    let totalFetched = 0
    const MAX_PAGES = 20 // Safety limit

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = `${BTCMAP_API}?updated_since=${updatedSince}&limit=5000`
      console.log(`Fetching BTCMap page ${page + 1}: ${url}`)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`BTCMap API error [${response.status}]: ${await response.text()}`)
      }

      const elements = await response.json()
      if (!elements.length) break
      totalFetched += elements.length
      console.log(`Page ${page + 1}: ${elements.length} elements (total: ${totalFetched})`)

      // Filter elements within bbox that accept bitcoin
      for (const el of elements) {
        if (el.deleted_at && el.deleted_at !== '') continue

        const tags = el.osm_json?.tags || {}
        const acceptsBtc = tags['payment:bitcoin'] === 'yes' ||
                           tags['currency:XBT'] === 'yes' ||
                           tags['payment:lightning'] === 'yes' ||
                           tags['payment:bitcoin_lightning'] === 'yes'
        if (!acceptsBtc) continue

        const lat = el.osm_json?.lat
        const lon = el.osm_json?.lon
        if (!lat || !lon) continue

        if (lat >= south && lat <= north && lon >= west && lon <= east) {
          allMerchants.push(el)
        }
      }

      // If less than 5000 returned, we've reached the end
      if (elements.length < 5000) break

      // Use the last element's updated_at for pagination
      const lastUpdated = elements[elements.length - 1].updated_at
      if (!lastUpdated || lastUpdated === updatedSince) break
      updatedSince = lastUpdated
    }

    console.log(`Found ${allMerchants.length} Bitcoin merchants within bbox (from ${totalFetched} total elements)`)

    // Upsert into merchants table
    let synced = 0
    let errors = 0

    for (const merchant of allMerchants) {
      const tags = merchant.osm_json?.tags || {}
      const name = tags.name || tags['name:en'] || 'Unnamed merchant'
      const category = tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.office || 'other'

      const paymentMethods: string[] = []
      if (tags['payment:lightning'] === 'yes' || tags['payment:bitcoin_lightning'] === 'yes') {
        paymentMethods.push('lightning')
      }
      if (tags['payment:bitcoin'] === 'yes' || tags['payment:onchain'] === 'yes') {
        paymentMethods.push('onchain')
      }
      if (paymentMethods.length === 0) paymentMethods.push('bitcoin')

      const { error: upsertError } = await supabase.from('merchants').upsert({
        community_id,
        name,
        category,
        lat: merchant.osm_json?.lat,
        lng: merchant.osm_json?.lon,
        payment_methods: paymentMethods,
        source: 'btcmap',
        btcmap_id: String(merchant.id),
        status: 'approved',
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ') || null,
        website: tags.website || tags['contact:website'] || null,
      }, {
        onConflict: 'btcmap_id',
      })

      if (upsertError) {
        console.error('Upsert error:', upsertError.message, 'for btcmap_id:', merchant.id)
        errors++
      } else {
        synced++
      }
    }

    // Update last synced timestamp
    await supabase.from('communities')
      .update({ btcmap_last_synced: new Date().toISOString() })
      .eq('id', community_id)

    return new Response(JSON.stringify({
      success: true,
      total_elements_scanned: totalFetched,
      merchants_in_bbox: allMerchants.length,
      synced,
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('BTCMap sync error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
