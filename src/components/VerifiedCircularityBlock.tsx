import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { fetchEconomyWalletMetrics } from '@/lib/walletApi';

interface Props { communityId: string }

/**
 * Public, identity-free aggregate of Blink-verified sats flow.
 * Shows the three flow categories (circular / external inflow / offramp)
 * derived from wallet_transactions only. No counterparty info ever shown.
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
  const offramp = Number((metrics as any).offramp_volume_sats ?? 0);
  const merchants = metrics.active_merchant_wallets ?? 0;
  const earners = metrics.active_earner_wallets ?? 0;
  const totalWallets = merchants + earners;

  // External inflow = total inflow not classified as circular receive.
  // Approximate as inflow - (circular_receive portion). We don't store the split
  // so we conservatively use inflow_external = max(inflow - circular_received, 0).
  // Since circular volume includes both directions, externalInflow ≈ inflow - (circular / 2).
  // For a precise value the metrics row would need to store it separately; this is a sane public estimate.
  const externalInflow = Math.max(0, inflow - Math.round(circular / 2));

  const totalVolume = circular + externalInflow + offramp;
  const pct = (n: number) => totalVolume > 0 ? Math.round((n / totalVolume) * 100) : 0;
  const pctCircular = pct(circular);
  const pctInflow = pct(externalInflow);
  const pctOfframp = pct(offramp);

  return (
    <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wide font-medium text-score-amber">
        <Zap className="h-4 w-4" fill="currentColor" /> Verified sats flow
        <span className="ml-auto text-muted-foreground normal-case tracking-normal">Last 30 days · Blink-verified</span>
      </div>
      <div className="text-4xl font-bold mb-4">🔄 {rate.toFixed(0)}% circularity rate</div>

      {/* Three-way flow breakdown */}
      <div className="space-y-3 mb-5">
        <FlowBar
          icon="🔄"
          label="Circular (earner ↔ merchant, earner ↔ earner)"
          pct={pctCircular}
          sats={circular}
          color="bg-score-amber"
        />
        <FlowBar
          icon="📥"
          label="External inflow (sats entering economy)"
          pct={pctInflow}
          sats={externalInflow}
          color="bg-score-green"
        />
        <FlowBar
          icon="📤"
          label="Offramp (sats leaving to fiat / outside)"
          pct={pctOfframp}
          sats={offramp}
          color="bg-destructive"
        />
      </div>

      {/* Compact totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 pt-3 border-t border-border">
        <Stat label="Sats received" value={inflow} className="text-score-green" />
        <Stat label="Sats sent" value={outflow} className="text-destructive" />
        <Stat label="Circular sats" value={circular} className="text-score-amber" />
        <Stat label="Transactions" value={totalTx} className="text-foreground" />
      </div>

      <div className="text-sm text-muted-foreground">
        Based on {totalWallets} connected wallet{totalWallets === 1 ? '' : 's'}
        {' · '}
        {merchants} merchant{merchants === 1 ? '' : 's'} · {earners} earner{earners === 1 ? '' : 's'}
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-score-amber/10 px-2 py-0.5 text-xs text-score-amber">
        ● Blink-verified · identities never stored
      </div>
    </div>
  );
}

function FlowBar({ icon, label, pct, sats, color }: {
  icon: string; label: string; pct: number; sats: number; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-foreground">
          <span className="mr-1.5">{icon}</span>{label}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {pct}% · {sats.toLocaleString()} sats
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-lg font-bold tabular-nums ${className}`}>{value.toLocaleString()}</div>
    </div>
  );
}
