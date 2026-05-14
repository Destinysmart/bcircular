import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const token = Deno.env.get('MAPBOX_PUBLIC_TOKEN') ?? '';
  return new Response(JSON.stringify({ token }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
