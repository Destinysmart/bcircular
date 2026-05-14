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

const BodySchema = z.object({
  community_id: z.string().uuid(),
})

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

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { community_id } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch all data
    const [communityRes, merchantsRes, earnersRes, txRes, scoreRes, blinkTxRes, walletsRes] = await Promise.all([
      supabase.from('communities').select('*').eq('id', community_id).single(),
      supabase.from('merchants').select('id, name, category').eq('community_id', community_id).eq('status', 'approved'),
      supabase.from('earners').select('id').eq('community_id', community_id).eq('status', 'approved'),
      supabase.from('transactions').select('amount_sats, is_circular').eq('community_id', community_id).eq('status', 'approved'),
      supabase.from('circularity_scores').select('*').eq('community_id', community_id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('blink_transactions').select('direction, settlement_amount, is_internal').eq('community_id', community_id),
      supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('community_id', community_id),
    ])

    const community = communityRes.data
    if (!community) {
      return new Response(JSON.stringify({ error: 'Community not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const merchants = merchantsRes.data || []
    const earners = earnersRes.data || []
    const txs = txRes.data || []
    const score = scoreRes.data
    const blinkTxs = blinkTxRes.data || []
    const walletCount = walletsRes.count || 0

    const totalSats = txs.reduce((s: number, t: any) => s + Number(t.amount_sats), 0)
    const circularSats = txs.filter((t: any) => t.is_circular).reduce((s: number, t: any) => s + Number(t.amount_sats), 0)
    const blinkTotal = blinkTxs.length
    const blinkInternal = blinkTxs.filter((t: any) => t.is_internal).length
    const blinkTotalSats = blinkTxs.reduce((s: number, t: any) => s + Number(t.settlement_amount), 0)
    const blinkInternalSats = blinkTxs.filter((t: any) => t.is_internal).reduce((s: number, t: any) => s + Number(t.settlement_amount), 0)

    const generatedAt = new Date().toISOString()

    // Build a simple text-based PDF using raw PDF syntax (no external libs needed)
    const pdf = buildPDF({
      name: community.name,
      city: community.city,
      country: community.country,
      description: community.description || '',
      score: score?.score ?? 0,
      merchantDensity: score?.merchant_density_score ?? 0,
      retention: score?.retention_score ?? 0,
      earnerRate: score?.earner_rate_score ?? 0,
      velocity: score?.velocity_score ?? 0,
      growth: score?.growth_score ?? 0,
      merchantCount: merchants.length,
      earnerCount: earners.length,
      txCount: txs.length,
      totalSats,
      circularSats,
      blinkTotal,
      blinkInternal,
      blinkTotalSats,
      blinkInternalSats,
      walletCount,
      population: community.declared_population || 0,
      generatedAt,
    })

    // Base64 encode
    const pdfBase64 = btoa(pdf)

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Minimal PDF generator (no external dependencies)
function buildPDF(d: {
  name: string; city: string; country: string; description: string;
  score: number; merchantDensity: number; retention: number; earnerRate: number;
  velocity: number; growth: number; merchantCount: number; earnerCount: number;
  txCount: number; totalSats: number; circularSats: number;
  blinkTotal: number; blinkInternal: number; blinkTotalSats: number; blinkInternalSats: number;
  walletCount: number; population: number; generatedAt: string;
}): string {
  const formatSats = (s: number) => s >= 1_000_000 ? `${(s / 1_000_000).toFixed(1)}M` : s >= 1_000 ? `${(s / 1_000).toFixed(0)}K` : String(s)
  const scoreLabel = d.score >= 76 ? 'Strong' : d.score >= 51 ? 'Growing' : 'Emerging'
  const date = new Date(d.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const retentionPct = d.blinkTotal > 0 ? Math.round((d.blinkInternal / d.blinkTotal) * 100) : (d.totalSats > 0 ? Math.round((d.circularSats / d.totalSats) * 100) : 0)

  // Build text content lines
  const lines: { text: string; size: number; bold?: boolean; y: number }[] = []
  let y = 750

  const addLine = (text: string, size = 10, bold = false, gap = 16) => {
    lines.push({ text: sanitize(text), size, bold, y })
    y -= gap
  }

  const addGap = (px: number) => { y -= px }

  addLine('PROOF OF CIRCULARITY', 18, true, 24)
  addLine(`${d.name}`, 14, true, 20)
  addLine(`${d.city}, ${d.country}`, 10, false, 14)
  addLine(`Generated: ${date}`, 8, false, 12)
  addGap(10)

  addLine(`Circularity Score: ${d.score}/100 (${scoreLabel})`, 14, true, 22)
  addGap(6)

  addLine('SCORE BREAKDOWN', 11, true, 18)
  addLine(`  Merchant Saturation: ${Math.round(d.merchantDensity)}/100`, 10, false, 14)
  addLine(`  Retention: ${Math.round(d.retention)}/100`, 10, false, 14)
  addLine(`  Earner Penetration: ${Math.round(d.earnerRate)}/100`, 10, false, 14)
  addLine(`  Velocity: ${Math.round(d.velocity)}/100`, 10, false, 14)
  addLine(`  Growth: ${Math.round(d.growth)}/100`, 10, false, 14)
  addGap(10)

  addLine('KEY METRICS', 11, true, 18)
  addLine(`  Merchants: ${d.merchantCount}`, 10, false, 14)
  addLine(`  Earners: ${d.earnerCount}`, 10, false, 14)
  addLine(`  Transactions: ${d.txCount}`, 10, false, 14)
  addLine(`  Total Sats: ${formatSats(d.totalSats)}`, 10, false, 14)
  addLine(`  Circular Sats: ${formatSats(d.circularSats)}`, 10, false, 14)
  addLine(`  Declared Population: ${d.population.toLocaleString()}`, 10, false, 14)
  addGap(10)

  if (d.blinkTotal > 0) {
    addLine('WALLET-VERIFIED DATA (Blink API)', 11, true, 18)
    addLine(`  Connected Wallets: ${d.walletCount}`, 10, false, 14)
    addLine(`  Verified Transactions: ${d.blinkTotal}`, 10, false, 14)
    addLine(`  Internal (Circular): ${d.blinkInternal}`, 10, false, 14)
    addLine(`  Total Sats Flow: ${formatSats(d.blinkTotalSats)}`, 10, false, 14)
    addLine(`  Circular Sats: ${formatSats(d.blinkInternalSats)}`, 10, false, 14)
    addLine(`  Retention Rate: ${retentionPct}%`, 10, false, 14)
    addGap(10)
  }

  addGap(10)
  addLine('This report is auto-generated by the Bitcoin Circular Economy Index.', 8)
  addLine('No funds are held or controlled. Read-only wallet access only.', 8)

  // Build raw PDF
  const objects: string[] = []
  let objCount = 0

  const addObj = (content: string) => {
    objCount++
    objects.push(`${objCount} 0 obj\n${content}\nendobj`)
    return objCount
  }

  // Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>')
  // Pages
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')

  // Build content stream
  let stream = ''
  for (const line of lines) {
    const font = line.bold ? '/F2' : '/F1'
    stream += `BT ${font} ${line.size} Tf 50 ${line.y} Td (${line.text}) Tj ET\n`
  }

  // Content stream
  const streamObj = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)

  // Page
  addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${streamObj} 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`)

  // Fonts
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  // Build file
  const header = '%PDF-1.4\n'
  let body = ''
  const xrefOffsets: number[] = []
  let offset = header.length

  for (const obj of objects) {
    xrefOffsets.push(offset)
    body += obj + '\n'
    offset += obj.length + 1
  }

  const xrefStart = offset
  let xref = `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`
  for (const off of xrefOffsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return header + body + xref + trailer
}

function sanitize(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
