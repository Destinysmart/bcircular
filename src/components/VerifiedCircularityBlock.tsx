import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { fetchEconomyWalletMetrics } from '@/lib/walletApi';

interface Props { communityId: string }

export default function VerifiedCircularityBlock({ communityId }: Props) {
  const { data: metrics } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  if (!metrics) return null;
  const connected = (metrics.active_merchant_wallets ?? 0) + (metrics.active_earner_wallets ?? 0);
  if (connected < 2) return null;

  const rate = Number(metrics.real_circularity_rate);

  return (
    <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide font-medium text-score-amber">
        <Zap className="h-4 w-4" fill="currentColor" /> Verified circular flow
        <span className="ml-auto text-muted-foreground normal-case tracking-normal">Based on connected Blink wallets · last 30 days</span>
      </div>
      <div className="text-4xl font-bold mb-3">🔄 {rate.toFixed(0)}% circularity rate</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3"><div className="h-full bg-score-amber" style={{ width: `${Math.min(100, rate)}%` }} /></div>
      <div className="text-sm text-muted-foreground">
        {Number(metrics.circular_volume_sats).toLocaleString()} sats circulated within the economy ·{' '}
        {metrics.active_merchant_wallets} merchants · {metrics.active_earner_wallets} earners connected
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-score-amber/10 px-2 py-0.5 text-xs text-score-amber">● Blink-verified data</div>
    </div>
  );
}
