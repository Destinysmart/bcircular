import { Link } from 'react-router-dom';
import { Store, Users, ArrowRight, CheckCircle2, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import MerchantGrowthChart from '@/components/charts/MerchantGrowthChart';
import EarnerGrowthChart from '@/components/charts/EarnerGrowthChart';
import CircularFlowGauge from '@/components/charts/CircularFlowGauge';
import { getCoverage } from '@/lib/coverage';

interface Props {
  communityId: string;
  slug: string;
  merchants: any[];
  earners: any[];
  walletCount: number;
  pillars: { label: string; value: number }[];
}

const PILLAR_FIX: Record<string, { action: string; href: (slug: string) => string } | null> = {
  'Merchant saturation': { action: 'Add merchants →', href: (s) => `/c/${s}/submit` },
  'Earner penetration': { action: 'Add earners →', href: (s) => `/c/${s}/submit?tab=earner` },
  'Retention': null,
  'Velocity': { action: 'Connect Blink wallet →', href: (s) => `/c/${s}#wallet` },
  'Growth': { action: 'Add new submissions →', href: (s) => `/c/${s}/submit` },
};

export default function EconomyGrowthPanel({ communityId, slug, merchants, walletCount, pillars }: Props) {
  const btcmapCount = merchants.filter(m => m.source === 'btcmap').length;

  // Top merchant categories (top 3)
  const catCounts = new Map<string, number>();
  for (const m of merchants) {
    const c = (m.category || 'other').toString();
    catCounts.set(c, (catCounts.get(c) || 0) + 1);
  }
  const topCategories = Array.from(catCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c.charAt(0).toUpperCase() + c.slice(1));

  return (
    <div className="space-y-6">
      {/* Visual chart cards: Merchants · Earners · Circular Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MerchantGrowthChart communityId={communityId} />
        <EarnerGrowthChart communityId={communityId} slug={slug} />
        <CircularFlowGauge communityId={communityId} walletCount={walletCount} />
      </div>

      {/* Wallets connected — kept as a simple inline summary */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-chart-4" />
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Wallets connected</div>
          <div className="text-sm text-foreground"><span className="font-mono font-semibold">{walletCount.toLocaleString()}</span> Blink wallet{walletCount === 1 ? '' : 's'} feeding live data{btcmapCount > 0 ? ` · ${btcmapCount} BTCMap-verified merchant${btcmapCount === 1 ? '' : 's'}` : ''}{topCategories.length > 0 ? ` · ${topCategories.join(', ')}` : ''}</div>
        </div>
      </div>

      {/* Contribute */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Help grow this economy</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">More data = sharper signal</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4 sm:hidden">More data = sharper circularity signal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to={`/c/${slug}/submit`} className="rounded-xl border border-border bg-background hover:border-score-amber/50 hover:bg-secondary/40 transition-colors p-4 group">
            <div className="flex items-center gap-2 mb-1"><Store className="h-4 w-4 text-score-amber" /><span className="text-sm font-medium">Add a merchant</span></div>
            <p className="text-[11px] text-muted-foreground mb-2">A shop, café, or service you know that takes sats.</p>
            <span className="text-xs font-medium text-score-amber inline-flex items-center gap-1 group-hover:gap-2 transition-all">Add <ArrowRight className="h-3 w-3" /></span>
          </Link>
          <Link to={`/c/${slug}/submit?tab=earner`} className="rounded-xl border border-border bg-background hover:border-score-green/50 hover:bg-secondary/40 transition-colors p-4 group">
            <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-score-green" /><span className="text-sm font-medium">Register as earner</span></div>
            <p className="text-[11px] text-muted-foreground mb-2">Anyone earning in sats — vendor, freelancer, employee.</p>
            <span className="text-xs font-medium text-score-green inline-flex items-center gap-1 group-hover:gap-2 transition-all">Join <ArrowRight className="h-3 w-3" /></span>
          </Link>
        </div>
      </div>

      {/* Score breakdown as to-do list */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">What's driving the score</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Five pillars</span>
        </div>
        <ul className="space-y-2">
          {pillars.map(p => {
            const v = Math.round(p.value);
            const ok = v >= 50;
            const warn = v >= 20 && v < 50;
            const fail = v < 20;
            const fix = PILLAR_FIX[p.label];
            return (
              <li key={p.label} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-b-0">
                {ok && <CheckCircle2 className="h-4 w-4 text-score-green shrink-0" />}
                {warn && <AlertCircle className="h-4 w-4 text-score-amber shrink-0" />}
                {fail && <XCircle className="h-4 w-4 text-score-red shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{p.label}</div>
                  <div className="font-mono text-[11px] text-muted-foreground tabular-nums">{v}/100</div>
                </div>
                {!ok && fix && (
                  <Link to={fix.href(slug)} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                    {fix.action}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
