import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, ArrowUpRight, Repeat, TrendingUp } from 'lucide-react';
import { formatSats } from '@/lib/mock-data';

interface SatsMovementPanelProps {
  communityId: string;
}

const SatsMovementPanel = ({ communityId }: SatsMovementPanelProps) => {
  const { data: blinkStats } = useQuery({
    queryKey: ['sats-movement', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blink_transactions')
        .select('direction, settlement_amount, is_internal, blink_created_at')
        .eq('community_id', communityId);
      if (error) throw error;

      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const all = data || [];
      const last30d = all.filter(t => now - new Date(t.blink_created_at).getTime() < 30 * day);
      const last7d = all.filter(t => now - new Date(t.blink_created_at).getTime() < 7 * day);

      const satsIn = last30d.filter(t => t.direction === 'RECEIVE' && !t.is_internal)
        .reduce((s, t) => s + Number(t.settlement_amount), 0);
      const satsOut = last30d.filter(t => t.direction === 'SEND' && !t.is_internal)
        .reduce((s, t) => s + Number(t.settlement_amount), 0);
      const satsCircular = last30d.filter(t => t.is_internal)
        .reduce((s, t) => s + Number(t.settlement_amount), 0);
      const totalFlow = satsIn + satsOut + satsCircular;
      const retentionPct = totalFlow > 0
        ? Math.round(Math.max(0, Math.min(100, ((satsCircular + (satsIn - satsOut)) / totalFlow) * 100)))
        : 0;

      // Velocity: internal txns per active wallet per 30 days
      const internalTx = last30d.filter(t => t.is_internal);
      const activeWallets = new Set([
        ...internalTx.map(t => t.direction),
      ]);

      return {
        satsIn, satsOut, satsCircular, retentionPct,
        totalTx30d: last30d.length,
        totalTx7d: last7d.length,
        internalTx30d: last30d.filter(t => t.is_internal).length,
        totalFlow,
        netFlow: satsIn - satsOut,
      };
    },
    refetchInterval: 30000,
  });

  if (!blinkStats) return null;

  const metrics = [
    {
      icon: <ArrowDownLeft className="h-4 w-4" />,
      label: 'Sats entering',
      value: formatSats(blinkStats.satsIn),
      color: 'text-score-green',
      sublabel: '30d inflow',
    },
    {
      icon: <ArrowUpRight className="h-4 w-4" />,
      label: 'Sats exiting',
      value: formatSats(blinkStats.satsOut),
      color: 'text-destructive',
      sublabel: '30d outflow',
    },
    {
      icon: <Repeat className="h-4 w-4" />,
      label: 'Circular sats',
      value: formatSats(blinkStats.satsCircular),
      color: 'text-primary',
      sublabel: '30d internal',
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Net flow',
      value: `${blinkStats.netFlow >= 0 ? '+' : ''}${formatSats(blinkStats.netFlow)}`,
      color: blinkStats.netFlow >= 0 ? 'text-score-green' : 'text-destructive',
      sublabel: 'sats retained',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Retention Hero */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Retention Rate</div>
        <div className="font-mono text-5xl font-medium text-primary">{blinkStats.retentionPct}%</div>
        <div className="text-xs text-muted-foreground mt-2">
          of sats stay circulating within the economy (30d)
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span>{blinkStats.totalTx30d} txns (30d)</span>
          <span>{blinkStats.internalTx30d} internal</span>
          <span>{blinkStats.totalTx7d} txns (7d)</span>
        </div>
      </div>

      {/* Sats Movement Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-4">
            <div className={`flex items-center gap-2 mb-2 ${m.color}`}>
              {m.icon}
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{m.label}</span>
            </div>
            <div className={`font-mono text-2xl font-medium ${m.color}`}>{m.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.sublabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SatsMovementPanel;