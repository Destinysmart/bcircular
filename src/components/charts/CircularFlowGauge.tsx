import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Repeat, Zap, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchEconomyWalletMetrics } from '@/lib/walletApi';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  communityId: string;
  walletCount: number;
}

const CircularFlowGauge = ({ communityId, walletCount }: Props) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  const { data: flowSums } = useQuery({
    queryKey: ['flow-sums-30d', communityId],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from('blink_transactions')
        .select('settlement_amount, flow_type, is_internal, direction')
        .eq('community_id', communityId)
        .gte('blink_created_at', since);
      if (error) throw error;
      let circular = 0;
      let exited = 0;
      for (const t of data || []) {
        const amt = Number((t as any).settlement_amount) || 0;
        const ft = (t as any).flow_type as string | null;
        if (ft) {
          if (ft === 'circular_receive' || ft === 'circular_spend') circular += amt;
          else if (ft === 'offramp_or_external') exited += amt;
        } else {
          // legacy fallback
          if ((t as any).is_internal) circular += amt;
          else if ((t as any).direction === 'SEND') exited += amt;
        }
      }
      return { circular, exited };
    },
    enabled: !!communityId,
  });

  const rate = metrics ? Number((metrics as any).real_circularity_rate) || 0 : 0;
  const hasWallets = walletCount > 0;
  const hasData = hasWallets && metrics && Number((metrics as any).total_transaction_count || 0) > 0;

  const chartData = [{ name: 'circ', value: Math.min(100, Math.max(0, rate)), fill: '#F7931A' }];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[11px] uppercase tracking-wider">
        <Repeat className="h-4 w-4 text-primary" /> Circular Flow
      </div>

      <div className="relative flex-1 min-h-[160px] flex items-center justify-center">
        {isLoading ? (
          <Skeleton className="h-32 w-32 rounded-full" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hasData ? (
                <>
                  <div className="font-mono text-3xl font-bold tabular-nums text-foreground">{rate.toFixed(0)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">stayed local</div>
                </>
              ) : !hasWallets ? (
                <div className="text-center px-4">
                  <div className="font-mono text-2xl font-bold text-muted-foreground">0%</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Connect wallet to measure</div>
                </div>
              ) : (
                <div className="text-center px-4">
                  <div className="text-xs text-muted-foreground">Not yet measured</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-border bg-background/50 p-2">
          <div className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3 w-3" /> Circular</div>
          <div className="font-mono text-foreground tabular-nums truncate">
            {(flowSums?.circular ?? 0).toLocaleString()} sats
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-2">
          <div className="flex items-center gap-1 text-muted-foreground"><Send className="h-3 w-3" /> Exited</div>
          <div className="font-mono text-foreground tabular-nums truncate">
            {(flowSums?.exited ?? 0).toLocaleString()} sats
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircularFlowGauge;
