// Evaluate economy health and emit/clear alerts in economy_alerts.
// Called daily by pg_cron. Idempotent: same conditions yield same alert_keys (UNIQUE constraint).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvalAlert {
  alert_type: 'critical' | 'warning' | 'positive';
  alert_key: string;
  message: string;
  action_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: communities, error: cErr } = await supabase
      .from('communities')
      .select('id, slug, name, btcmap_last_synced')
      .eq('status', 'active');
    if (cErr) throw cErr;

    let processed = 0;
    let inserted = 0;
    let cleared = 0;

    for (const c of communities || []) {
      processed++;
      const desired: EvalAlert[] = [];

      // Aggregate counts in parallel
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [txRes, blinkRes, internalRes, earnersRes, walletsRes, validatorsRes, scoresRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id).eq('status', 'approved').gte('created_at', thirtyDaysAgo),
        supabase.from('blink_transactions').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id).gte('blink_created_at', thirtyDaysAgo),
        supabase.from('blink_transactions').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id).eq('is_internal', true).gte('blink_created_at', sevenDaysAgo),
        supabase.from('earners').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('wallets').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id),
        supabase.from('validators').select('id', { count: 'exact', head: true })
          .eq('community_id', c.id),
        supabase.from('circularity_scores').select('score, calculated_at')
          .eq('community_id', c.id).order('calculated_at', { ascending: false }).limit(2),
      ]);

      const txCount = txRes.count || 0;
      const blinkCount = blinkRes.count || 0;
      const internalCount = internalRes.count || 0;
      const earnerCount = earnersRes.count || 0;
      const walletCount = walletsRes.count || 0;
      const validatorCount = validatorsRes.count || 0;
      const scores = scoresRes.data || [];

      // CRITICAL — no transactions in 30 days
      if (txCount === 0 && blinkCount === 0) {
        desired.push({
          alert_type: 'critical',
          alert_key: 'dormant_30d',
          message: 'No transactions in 30 days — your economy is showing as dormant on the leaderboard.',
          action_url: `/c/${c.slug}/submit`,
        });
      }

      // WARNING — BTCMap sync stale
      if (c.btcmap_last_synced && new Date(c.btcmap_last_synced).toISOString() < fourteenDaysAgo) {
        desired.push({
          alert_type: 'warning',
          alert_key: 'btcmap_stale',
          message: 'Last BTCMap sync was 14+ days ago. Re-sync to keep merchant counts fresh.',
          action_url: `/dashboard/economy/${c.id}#btcmap`,
        });
      }

      // CRITICAL — no validators
      if (validatorCount === 0) {
        desired.push({
          alert_type: 'critical',
          alert_key: 'no_validators',
          message: 'No validators appointed — submissions will be stuck in queue.',
          action_url: `/dashboard/economy/${c.id}#validators`,
        });
      }

      // WARNING — earner count zero
      if (earnerCount === 0) {
        desired.push({
          alert_type: 'warning',
          alert_key: 'no_earners',
          message: 'Earner count is 0 — circularity score cannot be calculated accurately.',
          action_url: `/c/${c.slug}/join-as-earner`,
        });
      }

      // WARNING — no wallets connected
      if (walletCount === 0) {
        desired.push({
          alert_type: 'warning',
          alert_key: 'no_wallets',
          message: 'No wallet connected — relying on self-reported data only.',
          action_url: `/connect`,
        });
      }

      // POSITIVE — first circular tx detected
      if (internalCount > 0) {
        desired.push({
          alert_type: 'positive',
          alert_key: 'first_circular_tx',
          message: '🎉 New milestone: circular transactions detected via Blink wallets!',
          action_url: `/c/${c.slug}`,
        });
      }

      // POSITIVE — score improved
      if (scores.length === 2 && scores[0].score > scores[1].score) {
        const delta = scores[0].score - scores[1].score;
        if (delta >= 5) {
          desired.push({
            alert_type: 'positive',
            alert_key: `score_improved_${scores[0].calculated_at.split('T')[0]}`,
            message: `Score improved by ${delta} points — momentum is building.`,
            action_url: `/c/${c.slug}`,
          });
        }
      }

      // Upsert desired alerts (UNIQUE on community_id, alert_key prevents dupes)
      for (const a of desired) {
        const { error } = await supabase.from('economy_alerts').upsert(
          {
            community_id: c.id,
            alert_type: a.alert_type,
            alert_key: a.alert_key,
            message: a.message,
            action_url: a.action_url || null,
          },
          { onConflict: 'community_id,alert_key', ignoreDuplicates: true }
        );
        if (!error) inserted++;
      }

      // Clear alerts that no longer apply (only for keys we manage and that aren't in desired)
      const desiredKeys = desired.map((d) => d.alert_key);
      const managedKeys = ['dormant_30d', 'btcmap_stale', 'no_validators', 'no_earners', 'no_wallets'];
      const toClear = managedKeys.filter((k) => !desiredKeys.includes(k));
      if (toClear.length > 0) {
        const { error: delErr, count } = await supabase
          .from('economy_alerts')
          .delete({ count: 'exact' })
          .eq('community_id', c.id)
          .in('alert_key', toClear);
        if (!delErr && count) cleared += count;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed, inserted, cleared }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
