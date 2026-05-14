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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BTCMAP_API = 'https://api.btcmap.org/v2/elements'

const BodySchema = z.object({
  community_id: z.string().uuid(),
})

const normalizeBtcmapId = (input: string): string => {
  const trimmed = input.trim()
  if (trimmed.includes('btcmap.org/community/')) {
    return trimmed.split('btcmap.org/community/').pop()?.split('/')[0] || trimmed
  }
  if (trimmed.includes('btcmap.org/map/')) {
    return trimmed.split('btcmap.org/map/').pop()?.split('/')[0] || trimmed
  }
  return trimmed
}

const boundsFromGeoJson = (geoJson: any) => {
  const coords: number[][] = []
  const walk = (value: any) => {
    if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
      coords.push(value)
      return
    }
    if (Array.isArray(value)) value.forEach(walk)
  }
  walk(geoJson?.coordinates)
  if (!coords.length) return null
  const lons = coords.map(([lon]) => lon)
  const lats = coords.map(([, lat]) => lat)
  return {
    minlat: Math.min(...lats),
    maxlat: Math.max(...lats),
    minlon: Math.min(...lons),
    maxlon: Math.max(...lons),
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
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

    // Authorize: caller must be community admin (admin_id), community_admins member, or super admin
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

    // Get community BTCMap area ID
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', community_id)
      .single()

    if (communityError || !community) {
      return new Response(JSON.stringify({ error: 'Community not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const btcmapAreaId = normalizeBtcmapId(community.btcmap_area_id || '')
    if (!btcmapAreaId) {
      return new Response(JSON.stringify({ error: 'No BTCMap Community ID set.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let area: any
    try {
      const areaRes = await fetch(`https://api.btcmap.org/v2/areas/${btcmapAreaId}`)
      if (!areaRes.ok) {
        return new Response(JSON.stringify({
          error: `BTCMap community "${btcmapAreaId}" not found. Make sure you're using just the ID, not the full URL.`,
          hint: `Example: use "bitcoin-beach" not "https://btcmap.org/community/bitcoin-beach"`,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      area = await areaRes.json()
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Failed to reach BTCMap API. Try again in a moment.',
        details: (err as Error).message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!area || area.error) {
      return new Response(JSON.stringify({ error: `BTCMap community "${btcmapAreaId}" not found. Check your ID.` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bounds = area.osm_json?.bounds || boundsFromGeoJson(area.tags?.geo_json)
    if (!bounds) {
      return new Response(JSON.stringify({ error: 'This BTCMap community has no geographic bounds set yet.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { minlat, maxlat, minlon, maxlon } = bounds
    const north = Number(maxlat)
    const south = Number(minlat)
    const east = Number(maxlon)
    const west = Number(minlon)
    const btcmapProfileUrl = `https://btcmap.org/community/${btcmapAreaId}`

    await supabase.from('communities').update({
      btcmap_area_id: btcmapAreaId,
      bbox_north: north,
      bbox_south: south,
      bbox_east: east,
      bbox_west: west,
      btcmap_profile_url: btcmapProfileUrl,
    }).eq('id', community_id)

    const elementsRes = await fetch(BTCMAP_API)
    if (!elementsRes.ok) {
      throw new Error(`BTCMap API error [${elementsRes.status}]: ${await elementsRes.text()}`)
    }
    const elements = await elementsRes.json()

    // Filter by bbox + bitcoin payment + not deleted, in a single pass
    const rows: any[] = []
    for (const el of elements) {
      if (el.deleted_at && el.deleted_at !== '') continue
      const osm = el.osm_json
      if (!osm) continue
      const lat = osm.lat ?? osm.center?.lat
      const lng = osm.lon ?? osm.center?.lon
      if (lat == null || lng == null) continue
      if (lat < south || lat > north || lng < west || lng > east) continue

      const tags = osm.tags || {}
      const isBtc =
        tags['payment:bitcoin'] === 'yes' ||
        tags['currency:XBT'] === 'yes' ||
        tags['payment:lightning'] === 'yes' ||
        tags['payment:lightning_contactless'] === 'yes' ||
        tags['payment:bitcoin_lightning'] === 'yes' ||
        tags['payment:onchain'] === 'yes'
      if (!isBtc) continue

      const paymentMethods: string[] = []
      if (tags['payment:lightning'] === 'yes' || tags['payment:bitcoin_lightning'] === 'yes' || tags['payment:lightning_contactless'] === 'yes') {
        paymentMethods.push('lightning')
      }
      if (tags['payment:bitcoin'] === 'yes' || tags['payment:onchain'] === 'yes' || tags['currency:XBT'] === 'yes') {
        paymentMethods.push('onchain')
      }
      if (paymentMethods.length === 0) paymentMethods.push('bitcoin')

      rows.push({
        community_id,
        name: tags.name || tags['name:en'] || 'Unnamed merchant',
        category: tags.amenity || tags.shop || tags.tourism || tags.craft || tags.leisure || tags.office || 'other',
        lat,
        lng,
        payment_methods: paymentMethods,
        source: 'btcmap',
        btcmap_id: String(el.id),
        status: 'approved',
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ') || null,
        website: tags.website || tags['contact:website'] || null,
      })
    }

    console.log(`Found ${rows.length} Bitcoin merchants within BTCMap area ${btcmapAreaId}`)

    // Stale cleanup: remove BTCMap merchants for this community that are no longer
    // present in the fresh BTCMap result (e.g. outside bbox after a tightening).
    const freshBtcmapIds = rows.map(r => r.btcmap_id).filter(Boolean)
    if (freshBtcmapIds.length > 0) {
      const idList = freshBtcmapIds.map(id => `"${id}"`).join(',')
      const { error: cleanupError } = await supabase
        .from('merchants')
        .delete()
        .eq('community_id', community_id)
        .eq('source', 'btcmap')
        .not('btcmap_id', 'in', `(${idList})`)
      if (cleanupError) console.error('Stale cleanup error:', cleanupError.message)
    } else {
      console.log('Skipping stale cleanup: BTCMap returned 0 merchants in bbox (safety guard)')
    }

    // Batch upsert in chunks of 500
    let synced = 0
    let errors = 0
    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error: upsertError } = await supabase
        .from('merchants')
        .upsert(chunk, { onConflict: 'btcmap_id' })
      if (upsertError) {
        console.error('Batch upsert error:', upsertError.message)
        errors += chunk.length
      } else {
        synced += chunk.length
      }
    }

    // Update last synced timestamp
    await supabase.from('communities')
      .update({ btcmap_last_synced: new Date().toISOString() })
      .eq('id', community_id)

    await supabase.functions.invoke('calculate-score', {
      body: { community_id },
    })

    return new Response(JSON.stringify({
      success: true,
      community_name: area.tags?.name || area.osm_json?.tags?.name || btcmapAreaId,
      total_scanned: elements.length,
      bitcoin_merchants_found: rows.length,
      synced,
      errors,
      bbox: { north, south, east, west },
      btcmap_profile_url: btcmapProfileUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('BTCMap sync error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
