import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPPORT_EMAIL = 'smartdestinyonyekachi@gmail.com';

const tools = [
  {
    type: 'function',
    function: {
      name: 'search_economies',
      description: 'Search Bitcoin circular economies on the platform by name, city, or country. Use when the user asks about an economy by name or wants to find one.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Name, city, or country to search for' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_top_economies',
      description: 'Get the top economies by circularity score (leaderboard). Use when the user asks about rankings, "best", "top", "leaderboard", or wants to compare.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'How many to return, default 5, max 10' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_economy_details',
      description: 'Get full details (score, tier, merchants, location, status) for a specific economy by slug or exact name. Use after search_economies to drill in.',
      parameters: {
        type: 'object',
        properties: {
          slug_or_name: { type: 'string', description: 'Economy slug or exact name' },
        },
        required: ['slug_or_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Use ONLY when the user has a problem you cannot resolve with platform knowledge, or explicitly asks to talk to a human. Returns the support email and a pre-filled subject.',
      parameters: {
        type: 'object',
        properties: {
          issue_summary: { type: 'string', description: 'One-sentence summary of the issue' },
          category: {
            type: 'string',
            enum: ['bug', 'account', 'wallet', 'score', 'feature_request', 'billing', 'other'],
          },
        },
        required: ['issue_summary', 'category'],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>) {
  try {
    if (name === 'search_economies') {
      const q = String(args.query || '').trim();
      if (!q) return { error: 'empty query' };
      const { data } = await supabase
        .from('communities')
        .select('name, slug, city, country, status')
        .or(`name.ilike.%${q}%,city.ilike.%${q}%,country.ilike.%${q}%`)
        .limit(8);
      return { results: data ?? [] };
    }
    if (name === 'get_top_economies') {
      const limit = Math.min(Math.max(Number(args.limit ?? 5), 1), 10);
      const { data: comms } = await supabase
        .from('communities')
        .select('id, name, slug, city, country, status')
        .eq('status', 'active')
        .limit(50);
      if (!comms?.length) return { results: [] };
      const scores = await Promise.all(
        comms.map(async (c) => {
          const { data: s } = await supabase
            .from('circularity_scores')
            .select('score')
            .eq('community_id', c.id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return { ...c, score: s?.score ?? 0 };
        })
      );
      scores.sort((a, b) => b.score - a.score);
      return { results: scores.slice(0, limit) };
    }
    if (name === 'get_economy_details') {
      const key = String(args.slug_or_name || '').trim();
      const { data: c } = await supabase
        .from('communities')
        .select('id, name, slug, city, country, status, fbce_tier, btcmap_community_id')
        .or(`slug.eq.${key},name.ilike.${key}`)
        .maybeSingle();
      if (!c) return { error: 'not found' };
      const { data: s } = await supabase
        .from('circularity_scores')
        .select('score, calculated_at')
        .eq('community_id', c.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { count: merchantCount } = await supabase
        .from('merchants')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', c.id)
        .eq('status', 'approved');
      return { ...c, score: s?.score ?? null, merchant_count: merchantCount ?? 0 };
    }
    if (name === 'escalate_to_human') {
      const subject = `[Bitcoin Circular Support] ${args.category}: ${args.issue_summary}`;
      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(String(subject))}`;
      return { support_email: SUPPORT_EMAIL, subject, mailto };
    }
    return { error: 'unknown tool' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'tool error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, context, user_name, economy_name, economy_score } = await req.json();

    const system = `You are Sats — the AI customer-support agent for Bitcoin Circular, the world's first intelligence platform for Bitcoin circular economies.

YOUR ROLE: Frontline customer support. Solve fast. Be specific. Escalate when needed.

OPERATING LOOP (always):
1) Understand what they're trying to do or what's broken
2) If a question needs live data (a specific economy, score, ranking), CALL A TOOL — don't guess
3) Give one clear next step
4) Ask one targeted follow-up OR escalate via the escalate_to_human tool when you can't resolve

TONE: Warm, encouraging, direct. Like a knowledgeable friend. Short paragraphs, not bullet lists. No "Great question!" or "Certainly!". Use ⚡ sparingly. Patient with beginners, concise with experts. Never robotic.

PLATFORM KNOWLEDGE (use when answering):

Bitcoin Circular tracks Bitcoin circular economies — communities where Bitcoin is earned and spent locally. Data sources: BTCMap (verified merchants), Blink wallet read-only API (transactions), FBCE 5-tier framework.

CIRCULARITY SCORE (0-100), 5 pillars: Merchant Saturation 25%, Retention 25%, Earner Penetration 20%, Velocity 15%, Growth Momentum 15%.

REGISTRATION: /register → fill details → admin approval (48h) → upload logo/banner → set BTCMap ID → appoint 2+ validators → connect Blink wallet → onboard earners/merchants.

BTCMAP: Find ID at btcmap.org/communities. Paste ID only (e.g. "bitcoin-ikorodu"), not the URL. BTCMap-verified merchants get 1.5x trust weight.

BLINK WALLET: Read-only API key from dashboard.blink.sv → API Keys → create read-only → paste in Economy Admin Dashboard. Never custody. Merchants/earners connect their own via claim links generated by admin.

CIRCULAR FLOW: When sats flow between two connected wallets in the same economy, it's auto-detected as circular.

VALIDATORS: Min 2 per economy. 2-of-3 must approve submissions. Access at /validate. An economy needs 2+ validators to become 'active'.

CONFIDENCE: Low <5 approved submissions, Medium 5-20, High 20+.

PROOF OF CIRCULARITY: Photos/videos/receipts at /c/:slug/proofs. Validators review.

QUICK SUBMIT QR: Print at merchant locations. Anyone scans to submit in 30s.

COMMON FIXES:
- Score not updating → Admin Dashboard → Recalculate
- BTCMap not syncing → Verify ID (not URL); 0 merchants = bounding box issue → escalate
- Earner penetration stuck at 0 → known issue, Recalculate; if still 0 → escalate
- Wallet claim "duplicate key" → already connected, check dashboard
- Merchant sync 401 → API key rejected, generate fresh read-only key
- Circular flow 0% with connected wallets → click Reclassify next to Sync now
- Validator dashboard empty → not yet appointed
- Upload failing → Logo ≤2MB, banner ≤5MB, JPG/PNG/WebP

ESCALATION RULES:
- For bugs, account issues, billing, missing features, anything beyond platform knowledge → CALL escalate_to_human tool, then give the user the resulting mailto link with a friendly hand-off line.
- Don't dump the email address in plain text without first calling the tool — the tool gives a structured subject so Destiny can triage.

CURRENT USER CONTEXT:
${user_name ? `Name: ${user_name}.` : 'Anonymous visitor.'}
${economy_name ? `Associated economy: ${economy_name}.` : ''}
${economy_score !== undefined && economy_score !== null ? `Current circularity score: ${economy_score}.` : ''}
${context ? `Current page: ${context}` : ''}

OUTPUT RULES:
- Use light markdown: **bold**, \`code\`, links. No huge headings, no tables.
- Keep responses under 140 words unless the user explicitly asked for depth.
- Always end with either a clear next step or one focused question.
- Never invent features. Never give financial advice. Never promise scores or timelines.
- If asked "are you human?": "I'm Sats — Bitcoin Circular's AI support agent. Not human, but I know this platform inside out. What do you need help with?"`;

    const conversation: any[] = [
      { role: 'system', content: system },
      ...messages,
    ];

    // Tool-calling loop (max 4 hops)
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Lovable-API-Key': LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversation,
          tools,
          tool_choice: 'auto',
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) {
          return new Response(JSON.stringify({ reply: "I'm getting a lot of questions right now — try again in a few seconds." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (res.status === 402) {
          return new Response(JSON.stringify({ reply: "AI credits are exhausted on the workspace. Ping Destiny at " + SUPPORT_EMAIL + " to top up." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`gateway ${res.status}: ${txt}`);
      }

      const data = await res.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) throw new Error('no message in response');

      const toolCalls = msg.tool_calls;
      if (toolCalls?.length) {
        conversation.push(msg);
        for (const call of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try { parsedArgs = JSON.parse(call.function.arguments || '{}'); } catch { /* ignore */ }
          const result = await runTool(call.function.name, parsedArgs);
          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return new Response(JSON.stringify({ reply: msg.content ?? '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply: "I went a few rounds but couldn't land an answer. Try rephrasing, or email " + SUPPORT_EMAIL + "." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-assistant error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
