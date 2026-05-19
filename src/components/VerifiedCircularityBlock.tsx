import { useQuery } from '@tanstack/react-query';
import { Zap, Recycle, ArrowDownToLine, ArrowUpFromLine, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props { communityId: string }

interface FlowAggregate {
  connectedWallets: number;
  merchants: number;
  earners: number;
  circularVolume: number;
  externalInflow: number;
  offrampVolume: number;
  totalTx: number;
  inflowTotal: number;
  outflowTotal: number;
}

async function fetchFlowAggregate(communityId: string): Promise<FlowAggregate> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: txns }, { data: wallets }] = await Promise.all([
    supabase
      .from('blink_transactions')
      .select('direction, settlement_amount, is_internal, flow_type')
      .eq('community_id', communityId)
      .gte('blink_created_at', thirtyDaysAgo),
    (supabase as any)
      .from('wallets_public')
      .select('owner_type')
      .eq('community_id', communityId)
      .eq('wallet_status', 'connected'),
  ]);

  const list = txns || [];
  const w = wallets || [];

  let circularVolume = 0;
  let externalInflow = 0;
  let offrampVolume = 0;
  let inflowTotal = 0;
  let outflowTotal = 0;

  for (const t of list) {
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') inflowTotal += amt;
    else outflowTotal += amt;

    switch (t.flow_type) {
      case 'circular_receive':
      case 'circular_spend':
        circularVolume += amt;
        break;
      case 'inflow_external':
        externalInflow += amt;
        break;
      case 'offramp_or_external':
        offrampVolume += amt;
        break;
    }
  }

  return {
    connectedWallets: w.length,
    merchants: w.filter((x: any) => x.owner_type === 'merchant').length,
    earners: w.filter((x: any) => x.owner_type === 'earner').length,
    circularVolume,
    externalInflow,
    offrampVolume,
    totalTx: list.length,
    inflowTotal,
    outflowTotal,
  };
}

/**
 * Public, identity-free aggregate of Blink-verified sats flow.
 * Renders the four-flow breakdown directly from blink_transactions.flow_type
 * — never shows counterparty or wallet identity. Hidden when the economy has
 * zero connected wallets.
 */
export default function VerifiedCircularityBlock({ communityId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['verified-flow-aggregate', communityId],
    queryFn: () => fetchFlowAggregate(communityId),
  });

  if (isLoading || !data) return null;
  if (data.connectedWallets === 0) return null;
  if (data.totalTx === 0) return null;

  const { circularVolume, externalInflow, offrampVolume, totalTx, connectedWallets, merchants, earners } = data;
  const totalVolume = circularVolume + externalInflow + offrampVolume;
  const pct = (n: number) => (totalVolume > 0 ? Math.round((n / totalVolume) * 100) : 0);
  const pctCircular = pct(circularVolume);
  const pctInflow = pct(externalInflow);
  const pctOfframp = pct(offrampVolume);

  return (
    <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-medium text-score-amber">
            <Zap className="h-4 w-4" fill="currentColor" /> Verified sats flow — Last 30 days
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Based on {connectedWallets} connected Blink wallet{connectedWallets === 1 ? '' : 's'}
            {' · '}
            {merchants} merchant{merchants === 1 ? '' : 's'} · {earners} earner{earners === 1 ? '' : 's'}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-score-amber/30 bg-score-amber/10 px-2.5 py-0.5 text-xs text-score-amber">
          ● Blink-verified
        </div>
      </div>

      <div className="text-4xl font-bold mb-5 flex items-center gap-2"><Recycle className="h-7 w-7 text-score-green" /> {pctCircular}% circularity rate</div>

      {/* Four-way flow breakdown */}
      <div className="space-y-3 mb-4">
        <FlowBar
          Icon={Recycle}
          label="Circular — earner ↔ merchant, earner ↔ earner"
          pct={pctCircular}
          sats={circularVolume}
          color="bg-score-green"
        />
        <FlowBar
          Icon={ArrowDownToLine}
          label="External inflow — sats entering economy"
          pct={pctInflow}
          sats={externalInflow}
          color="bg-primary"
        />
        <FlowBar
          Icon={ArrowUpFromLine}
          label="Offramp — sats leaving to fiat / outside"
          pct={pctOfframp}
          sats={offrampVolume}
          color="bg-destructive"
        />
      </div>

      <div className="border-t border-border pt-3 text-xs text-muted-foreground">
        Circular = sats transacted between registered wallets in this economy ·
        {' '}{totalTx.toLocaleString()} verified tx · No wallet addresses stored
      </div>
    </div>
  );
}

function FlowBar({ Icon, label, pct, sats, color }: {
  Icon: LucideIcon; label: string; pct: number; sats: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-foreground inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {pct}% · {sats.toLocaleString()} sats
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
