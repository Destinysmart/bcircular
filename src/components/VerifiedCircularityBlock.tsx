import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { fetchEconomyWalletMetrics } from '@/lib/walletApi';

interface Props { communityId: string }

/**
 * Public, identity-free aggregate of Blink-verified sats flow.
 * Renders whenever any wallet activity exists. No counterparty info ever shown.
 */
export default function VerifiedCircularityBlock({ communityId }: Props) {
  const { data: metrics } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  if (!metrics) return null;
  const totalTx = Number(metrics.total_transaction_count ?? 0);
  if (totalTx < 1) return null;

  const rate = Number(metrics.real_circularity_rate);
  const inflow = Number(metrics.total_inflow_sats ?? 0);
  const outflow = Number(metrics.total_outflow_sats ?? 0);
  const circular = Number(metrics.circular_volume_sats ?? 0);
  const merchants = metrics.active_merchant_wallets ?? 0;
  const earners = metrics.active_earner_wallets ?? 0;

  return (
    <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide font-medium text-score-amber">
        <Zap className="h-4 w-4" fill="currentColor" /> Verified circular flow
        <span className="ml-auto text-muted-foreground normal-case tracking-normal">Based on connected Blink wallets · last 30 days</span>
      </div>
      <div className="text-4xl font-bold mb-3">🔄 {rate.toFixed(0)}% circularity rate</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4"><div className="h-full bg-score-amber" style={{ width: `${Math.min(100, rate)}%` }} /></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sats received</div>
          <div className="font-mono text-lg font-bold text-score-green tabular-nums">{inflow.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sats sent</div>
          <div className="font-mono text-lg font-bold text-destructive tabular-nums">{outflow.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Circular sats</div>
          <div className="font-mono text-lg font-bold text-primary tabular-nums">{circular.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Transactions</div>
          <div className="font-mono text-lg font-bold text-foreground tabular-nums">{totalTx.toLocaleString()}</div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {merchants} merchant wallet{merchants === 1 ? '' : 's'} · {earners} earner wallet{earners === 1 ? '' : 's'} connected
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-score-amber/10 px-2 py-0.5 text-xs text-score-amber">● Blink-verified · identities never stored</div>
    </div>
  );
}
