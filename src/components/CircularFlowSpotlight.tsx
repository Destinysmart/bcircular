import { useQuery } from '@tanstack/react-query';
import { Zap, ArrowRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  communityId: string;
  slug: string;
}

/**
 * Verified circular-flow spotlight. Three states:
 * 1. No wallets connected   → CTA to connect first wallet
 * 2. Wallets but no internal txns yet → "monitoring" state
 * 3. Internal txns detected → headline circular volume + last 3 anonymous flow rows
 */
export default function CircularFlowSpotlight({ communityId, slug }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['circular-flow-spotlight', communityId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceISO = since.toISOString();

      const [walletsRes, allTxRes, internalTxRes] = await Promise.all([
        supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('community_id', communityId),
        supabase.from('blink_transactions').select('settlement_amount, is_internal').eq('community_id', communityId).gte('blink_created_at', sinceISO),
        supabase.from('blink_transactions').select('id, settlement_amount, blink_created_at, direction').eq('community_id', communityId).eq('is_internal', true).order('blink_created_at', { ascending: false }).limit(3),
      ]);

      const walletCount = walletsRes.count || 0;
      const allTx = allTxRes.data || [];
      const totalSats = allTx.reduce((s, t: any) => s + Number(t.settlement_amount || 0), 0);
      const circularSats = allTx.filter((t: any) => t.is_internal).reduce((s, t: any) => s + Number(t.settlement_amount || 0), 0);
      const internalCount = allTx.filter((t: any) => t.is_internal).length;
      const pct = totalSats > 0 ? Math.round((circularSats / totalSats) * 100) : 0;

      return {
        walletCount,
        internalCount,
        circularSats,
        totalSats,
        pct,
        recent: internalTxRes.data || [],
      };
    },
    enabled: !!communityId,
  });

  if (isLoading || !data) return null;

  // State 1: no wallets
  if (data.walletCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          <Wallet className="h-4 w-4" /> Verified circular flow
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Prove sats stay in this economy</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-lg">
          Connect a Blink wallet (read-only) to start verifying circular transactions automatically. We never see your keys or balances move.
        </p>
        <Link
          to="/connect"
          className="inline-flex items-center gap-1.5 rounded-full bg-score-amber px-4 py-2 text-sm font-semibold text-background hover:bg-score-amber/90 transition-colors"
        >
          <Zap className="h-4 w-4" /> Connect first wallet
        </Link>
      </div>
    );
  }

  // State 2: wallets connected but no circular txns yet
  if (data.internalCount === 0) {
    return (
      <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide font-semibold text-score-amber">
          <Zap className="h-4 w-4" fill="currentColor" /> Verified circular flow
        </div>
        <div className="text-base text-foreground mb-1">⚡ {data.walletCount} wallet{data.walletCount === 1 ? '' : 's'} connected — monitoring for circular flows.</div>
        <p className="text-sm text-muted-foreground">
          Circular transactions will appear here as they are detected between registered community members.
        </p>
        <div className="mt-3">
          <Link to={`/c/${slug}/join-as-earner`} className="text-xs text-score-amber hover:underline font-medium">
            Add more earners to increase circular detection →
          </Link>
        </div>
      </div>
    );
  }

  // State 3: circular detected
  return (
    <div className="rounded-2xl border border-score-green/40 bg-card p-6">
      <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wide font-semibold text-score-green">
        <Zap className="h-4 w-4" fill="currentColor" /> Verified circular flow
        <span className="ml-auto text-muted-foreground normal-case tracking-normal">last 30 days</span>
      </div>

      <div className="text-3xl font-bold text-foreground mb-1">🔄 {data.internalCount} circular transaction{data.internalCount === 1 ? '' : 's'} detected</div>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-mono text-foreground">{data.pct}%</span> of monitored sats stayed inside this economy
        {' · '}<span className="font-mono text-foreground">{data.circularSats.toLocaleString()}</span> sats circular volume
      </p>

      {/* Anonymous flow visualization */}
      <div className="space-y-1.5 mb-3">
        {data.recent.map((tx: any) => (
          <div key={tx.id} className="flex items-center gap-2 text-sm rounded-md border border-border bg-background/50 px-3 py-2">
            <span className="text-muted-foreground">Earner</span>
            <ArrowRight className="h-3.5 w-3.5 text-score-amber" />
            <span className="font-mono text-foreground tabular-nums">{Number(tx.settlement_amount).toLocaleString()} sats</span>
            <ArrowRight className="h-3.5 w-3.5 text-score-amber" />
            <span className="text-muted-foreground">Merchant</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{new Date(tx.blink_created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-score-green/10 px-2 py-0.5 text-xs text-score-green">
        ● Verified via Blink read-only API · identities never stored
      </div>
    </div>
  );
}
