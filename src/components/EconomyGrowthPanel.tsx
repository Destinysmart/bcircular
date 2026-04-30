import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Store, Users, Repeat, ArrowRight, CheckCircle2, AlertCircle, XCircle, Zap, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchEconomyWalletMetrics } from '@/lib/walletApi';

interface Props {
  communityId: string;
  slug: string;
  merchants: any[];
  earners: any[];
  walletCount: number;
  pillars: { label: string; value: number }[];
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const PILLAR_FIX: Record<string, { action: string; href: (slug: string) => string } | null> = {
  'Merchant saturation': { action: 'Add merchants →', href: (s) => `/c/${s}/submit` },
  'Earner penetration': { action: 'Add earners →', href: (s) => `/c/${s}/submit?tab=earner` },
  'Retention': null,
  'Velocity': { action: 'Connect Blink wallet →', href: (s) => `/c/${s}#wallet` },
  'Growth': { action: 'Add new submissions →', href: (s) => `/c/${s}/submit` },
};

export default function EconomyGrowthPanel({ communityId, slug, merchants, earners, walletCount, pillars }: Props) {
  const { data: walletMetrics } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  const { data: activity } = useQuery({
    queryKey: ['economy-activity', communityId],
    queryFn: async () => {
      const [mRes, eRes, txRes] = await Promise.all([
        supabase.from('merchants').select('id, name, status, approved_at, created_at, source')
          .eq('community_id', communityId).eq('status', 'approved')
          .order('approved_at', { ascending: false, nullsFirst: false }).limit(10),
        supabase.from('earners').select('id, earning_method, status, created_at')
          .eq('community_id', communityId).eq('status', 'approved')
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('blink_transactions').select('id, settlement_amount, blink_created_at, is_internal')
          .eq('community_id', communityId)
          .order('blink_created_at', { ascending: false }).limit(10),
      ]);
      type Item = { id: string; ts: string; kind: 'merchant'|'earner'|'tx'; label: string; sub?: string };
      const items: Item[] = [];
      for (const m of mRes.data || []) {
        items.push({
          id: `m-${m.id}`,
          ts: (m as any).approved_at || m.created_at,
          kind: 'merchant',
          label: m.source === 'btcmap' ? 'Merchant added (BTCMap)' : 'New merchant approved',
          sub: m.name,
        });
      }
      for (const e of eRes.data || []) {
        items.push({
          id: `e-${e.id}`,
          ts: e.created_at,
          kind: 'earner',
          label: 'New earner joined',
          sub: (e as any).earning_method || 'Earner',
        });
      }
      for (const t of txRes.data || []) {
        items.push({
          id: `t-${t.id}`,
          ts: t.blink_created_at,
          kind: 'tx',
          label: t.is_internal ? 'Circular sats transacted' : 'Sats transacted',
          sub: `⚡ ${Number(t.settlement_amount).toLocaleString()} sats`,
        });
      }
      return items
        .filter(i => i.ts)
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 10);
    },
  });

  const btcmapCount = merchants.filter(m => m.source === 'btcmap').length;
  const selfCount = merchants.length - btcmapCount;

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

  // Earner role breakdown
  const roleCounts = new Map<string, number>();
  for (const e of earners) {
    const r = (e.earning_method || 'Other').toString();
    roleCounts.set(r, (roleCounts.get(r) || 0) + 1);
  }
  const topRoles = Array.from(roleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r.charAt(0).toUpperCase() + r.slice(1));

  const circRate = walletMetrics ? Number(walletMetrics.real_circularity_rate) : 0;
  const hasWalletData = walletCount > 0 && walletMetrics && Number(walletMetrics.total_transaction_count || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Expanded stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Merchants card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-[11px] uppercase tracking-wider">
            <Store className="h-4 w-4 text-score-amber" /> Merchants
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums">{merchants.length.toLocaleString()}</div>
          <div className="my-3 h-px bg-border" />
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-score-amber" /> {btcmapCount} BTCMap verified</li>
            <li className="flex items-center gap-1.5">✍️ {selfCount} self-reported</li>
            <li className="flex items-center gap-1.5">💳 {walletCount} wallet{walletCount === 1 ? '' : 's'} connected</li>
          </ul>
          {topCategories.length > 0 && (
            <div className="mt-3 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wider">Top categories:</span>{' '}
              <span className="text-foreground">{topCategories.join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Earners card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-[11px] uppercase tracking-wider">
            <Users className="h-4 w-4 text-score-green" /> Earners
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums">{earners.length.toLocaleString()}</div>
          <div className="my-3 h-px bg-border" />
          <p className="text-xs text-muted-foreground">People earning Bitcoin in this economy</p>
          {earners.length === 0 ? (
            <Link to={`/c/${slug}/submit?tab=earner`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-score-amber hover:underline">
              Be the first earner <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            topRoles.length > 0 && (
              <div className="mt-3 text-[11px] text-muted-foreground">
                <span className="uppercase tracking-wider">Roles:</span>{' '}
                <span className="text-foreground">{topRoles.join(' · ')}</span>
              </div>
            )
          )}
        </div>

        {/* Circular flow card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-[11px] uppercase tracking-wider">
            <Repeat className="h-4 w-4 text-primary" /> Circular flow
          </div>
          {hasWalletData ? (
            <>
              <div className="font-mono text-3xl font-bold tabular-nums text-primary">{circRate.toFixed(0)}%</div>
              <div className="my-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-score-amber transition-all" style={{ width: `${Math.min(100, circRate)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">of sats stayed local (last 30 days)</p>
            </>
          ) : (
            <>
              <div className="font-mono text-3xl font-bold tabular-nums text-muted-foreground">—</div>
              <div className="my-3 h-px bg-border" />
              <p className="text-xs text-muted-foreground">Connect wallets to measure real circularity.</p>
              <Link to="/methodology" className="mt-2 inline-block text-[11px] text-primary hover:underline">Methodology →</Link>
            </>
          )}
        </div>

        {/* Wallets connected card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground text-[11px] uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-chart-4" /> Wallets
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums">{walletCount.toLocaleString()}</div>
          <div className="my-3 h-px bg-border" />
          <p className="text-xs text-muted-foreground">Connected Blink wallets feeding live data</p>
        </div>
      </div>

      {/* Recent activity + Contribute */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last 10 events</span>
          </div>
          {!activity || activity.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
          ) : (
            <ul className="space-y-1">
              {activity.map(a => (
                <li key={a.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-secondary/40">
                  {a.kind === 'merchant' && <Store className="h-3.5 w-3.5 text-score-amber shrink-0" />}
                  {a.kind === 'earner' && <Users className="h-3.5 w-3.5 text-score-green shrink-0" />}
                  {a.kind === 'tx' && <Zap className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground">{a.label}</div>
                    {a.sub && <div className="text-[11px] text-muted-foreground truncate">{a.sub}</div>}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(a.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Help grow this economy</h3>
          <p className="text-xs text-muted-foreground mb-4">More data = sharper circularity signal.</p>
          <div className="grid grid-cols-1 gap-3">
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
