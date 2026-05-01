import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Zap, RefreshCcw, Loader2, ArrowDown, ArrowUp, Recycle, Clock, ShieldCheck,
  Calendar, TrendingUp, Sparkles,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  fetchWalletTransactionsRange, computeStatsFromTx, computeDailySeriesFromTx,
  fetchWalletContribution,
  walletApi, type WalletOwnerType,
} from '@/lib/walletApi';

type TimeRange = '3M' | '6M' | '1Y' | 'All';

const RANGE_TX_LIMIT: Record<TimeRange, number> = { '3M': 20, '6M': 50, '1Y': 100, 'All': 200 };
const RANGE_TITLE: Record<TimeRange, string> = {
  '3M': '3-month sats flow',
  '6M': '6-month sats flow',
  '1Y': '12-month sats flow',
  'All': 'All-time sats flow',
};
const RANGE_NOTE: Record<TimeRange, string> = {
  '3M': 'Showing last 3 months · Toggle to see more history',
  '6M': 'Showing last 6 months',
  '1Y': 'Showing last 12 months',
  'All': 'Showing all tracked transactions',
};
const RANGE_LABEL: Record<TimeRange, string> = {
  '3M': '3 months', '6M': '6 months', '1Y': '12 months', 'All': 'all time',
};

function getStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case '3M': return new Date(now.setMonth(now.getMonth() - 3));
    case '6M': return new Date(now.setMonth(now.getMonth() - 6));
    case '1Y': return new Date(now.setFullYear(now.getFullYear() - 1));
    case 'All': return new Date('2020-01-01');
  }
}

interface Props {
  /** When omitted, the page detects merchant vs earner from the code prefix. */
  ownerType?: WalletOwnerType;
}

function fingerprint(hash: string | null) {
  return hash ? `···${hash.slice(-8)}` : '—';
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function getPersonalInsight(rate: number, txnCount: number) {
  if (txnCount === 0) {
    return 'No transactions synced yet. Make sure your Blink wallet is active and tap “Sync now”.';
  }
  if (rate >= 70) {
    return `⚡ ${rate}% of your sats stayed in the economy — you're a core part of the circular flow.`;
  }
  if (rate >= 40) {
    return `🔄 ${rate}% circular rate this month. Spending with other economy members increases this.`;
  }
  return `📈 ${txnCount} transactions tracked. Pay local merchants and earners to grow your circularity rate.`;
}

export default function WalletDashboard({ ownerType }: Props) {
  const [search] = useSearchParams();
  const code = search.get('code') || '';
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const ownerQ = useQuery({
    queryKey: ['wallet-owner-lookup', ownerType ?? 'auto', code],
    queryFn: async () => {
      if (!code) return null;
      const res = await walletApi.dashboard(code, ownerType);
      if (!res?.owner) return null;
      return {
        owner_type: res.owner_type as WalletOwnerType,
        approval_status: (res.approval_status as 'pending' | 'approved') ?? 'approved',
        owner: { ...res.owner, wallet: res.wallet },
      };
    },
    enabled: !!code,
    retry: false,
  });
  const owner = ownerQ.data?.owner;
  const detectedType = ownerQ.data?.owner_type;
  const approvalStatus = ownerQ.data?.approval_status ?? 'approved';
  const isPending = approvalStatus === 'pending';
  const walletId = owner?.wallet?.id;
  const communityId = owner?.community_id;

  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const sinceIso = useMemo(() => getStartDate(timeRange).toISOString(), [timeRange]);

  // One range-aware fetch powers the chart, stat cards, transactions, and insight.
  const rangeTxQ = useQuery({
    queryKey: ['wallet-tx-range', walletId, sinceIso],
    queryFn: () => fetchWalletTransactionsRange(walletId!, sinceIso),
    enabled: !!walletId,
  });

  const stats = useMemo(() => computeStatsFromTx(rangeTxQ.data || []), [rangeTxQ.data]);
  const series = useMemo(() => computeDailySeriesFromTx(rangeTxQ.data || [], sinceIso), [rangeTxQ.data, sinceIso]);
  const txLimit = RANGE_TX_LIMIT[timeRange];
  const recentTx = useMemo(() => (rangeTxQ.data || []).slice(0, txLimit), [rangeTxQ.data, txLimit]);

  const contribQ = useQuery({
    queryKey: ['wallet-contrib', walletId, communityId, sinceIso],
    queryFn: () => fetchWalletContribution(walletId!, communityId!, sinceIso),
    enabled: !!walletId && !!communityId,
  });

  async function handleSync() {
    if (!detectedType) return;
    setSyncing(true);
    try {
      const res = await walletApi.sync(detectedType, code);
      toast({ title: 'Sync complete', description: `${res.synced} transactions, ${res.internal} circular.` });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wallet-owner-lookup'] }),
        qc.invalidateQueries({ queryKey: ['wallet-tx-range', walletId] }),
        qc.invalidateQueries({ queryKey: ['wallet-contrib', walletId, communityId] }),
      ]);
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally { setSyncing(false); }
  }

  async function handleDisconnect() {
    if (!detectedType) return;
    if (!confirm(
      'Disconnect this wallet?\n\n' +
      'This will permanently delete:\n' +
      '• Your encrypted API key\n' +
      '• Your Lightning address hash\n' +
      '• ALL transactions imported for this wallet\n\n' +
      'This cannot be undone.'
    )) return;
    setDisconnecting(true);
    try {
      await walletApi.disconnect(detectedType, code);
      toast({ title: 'Disconnected', description: 'All wallet data has been deleted.' });
      await qc.invalidateQueries({ queryKey: ['wallet-owner-lookup'] });
    } catch (err: any) {
      toast({ title: 'Could not disconnect', description: err.message, variant: 'destructive' });
    } finally { setDisconnecting(false); }
  }

  function downloadData() {
    const rows = rangeTxQ.data || [];
    const csv = ['direction,amount_sats,is_circular,settled_at',
      ...rows.map((t: any) => `${t.direction},${t.settlement_amount},${t.is_internal},${t.blink_created_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${code}-transactions.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!code) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Missing code</CardTitle></CardHeader></Card></div>;
  if (ownerQ.isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!owner || !detectedType) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Not found</CardTitle><CardDescription>Invalid code or unapproved submission.</CardDescription></CardHeader></Card></div>;

  const status = owner.wallet?.wallet_status;
  // 'pending' here means a key was captured during signup but the row hasn't
  // been activated yet — the user already provided everything needed, so
  // surface it as connected (don't ask for a key they already gave us).
  const connected = status === 'connected' || status === 'pending';
  const walletPending = status === 'pending';
  const contrib = contribQ.data;
  const connectHref = `/connect?code=${code}`;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-score-amber"><Zap className="h-5 w-5" fill="currentColor" /></div>
            <CardTitle className="text-2xl">{owner.name}</CardTitle>
            <CardDescription>
              {owner.community_name} · {owner.community_city}, {owner.community_country}
              <br /><code className="text-xs">{code}</code> · LN fingerprint <code className="text-xs">{fingerprint(owner.wallet?.ln_address_hash || null)}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {isPending ? (
                <Badge variant="secondary" className="gap-1.5"><Clock className="h-3 w-3" /> Pending validator approval</Badge>
              ) : (
                <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-score-green text-background' : ''}>
                  {connected ? '● Connected' : '○ Not connected'}
                </Badge>
              )}
              {!isPending && (
                <span className="text-sm text-muted-foreground">Last synced {timeAgo(owner.wallet?.last_synced_at || null)}</span>
              )}
              {!isPending && connected && (
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCcw className="h-3 w-3 mr-2" />} Sync now
                </Button>
              )}
              {!isPending && !connected && (
                <Link to={connectHref}>
                  <Button size="sm" className="bg-score-amber text-background hover:bg-score-amber/90">Connect wallet</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {isPending && (
          <Card className="border-score-amber/30 bg-score-amber/5">
            <CardHeader>
              <div className="flex items-center gap-2 text-score-amber"><ShieldCheck className="h-5 w-5" /></div>
              <CardTitle className="text-lg">Waiting for validators</CardTitle>
              <CardDescription>
                Your submission is queued for {owner.community_name}'s validators.
                {walletPending && ' Your wallet API key is saved and will activate automatically once approved.'}
                {!walletPending && ' You can still connect a wallet now — it will activate after approval.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {!walletPending && (
                  <Link to={connectHref}>
                    <Button size="sm" variant="outline">Connect wallet</Button>
                  </Link>
                )}
                <Link to={`/c/${owner.community_slug}`}>
                  <Button size="sm" variant="ghost">Back to {owner.community_name}</Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Bookmark this page — refreshing it after approval will unlock your dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {connected && (
          <>
            {/* SECTION A — 30-day sats flow chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">30-day sats flow</CardTitle>
                <CardDescription>Daily received vs sent — circular flow overlay</CardDescription>
              </CardHeader>
              <CardContent>
                {seriesQ.isLoading ? (
                  <div className="h-[220px] flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={series} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          interval={6}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                          width={48}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            color: 'hsl(var(--popover-foreground))',
                            fontSize: 12,
                          }}
                          formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} sats`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                        <Bar dataKey="received" fill="hsl(var(--score-green))" opacity={0.85} radius={[2,2,0,0]} name="Received" />
                        <Bar dataKey="sent" fill="hsl(var(--destructive))" opacity={0.7} radius={[2,2,0,0]} name="Sent" />
                        <Line dataKey="circular" stroke="hsl(var(--score-amber))" strokeWidth={2} dot={false} name="Circular" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>

            {/* SECTION B — Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryStat
                icon={<ArrowDown className="h-4 w-4 text-score-green" />}
                label="Received (30d)"
                value={(stats?.received ?? 0).toLocaleString()}
                suffix="sats"
              />
              <SummaryStat
                icon={<ArrowUp className="h-4 w-4 text-destructive" />}
                label="Sent (30d)"
                value={(stats?.sent ?? 0).toLocaleString()}
                suffix="sats"
              />
              <SummaryStat
                icon={<Recycle className="h-4 w-4 text-score-amber" />}
                label="Circular rate"
                value={`${stats?.rate ?? 0}%`}
                highlight
              />
              <SummaryStat
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                label="Active days"
                value={`${stats?.activeDays ?? 0}`}
              />
            </div>

            {/* SECTION D — Personal insight */}
            <Card className="border-score-amber/30 bg-score-amber/5">
              <CardContent className="pt-6 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-score-amber shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  {getPersonalInsight(stats?.rate ?? 0, stats?.count ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* SECTION C — Recent transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent transactions</CardTitle>
                <CardDescription>🔄 marks transactions within your economy</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {txQ.isLoading && <div className="p-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                {!txQ.isLoading && (txQ.data?.length ?? 0) === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No transactions yet.</div>}
                <ul className="divide-y divide-border">
                  {(txQ.data || []).map((t: any) => {
                    const isReceive = t.direction === 'RECEIVE';
                    return (
                      <li key={t.id} className="px-6 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          {isReceive ? <ArrowDown className="h-4 w-4 text-score-green" /> : <ArrowUp className="h-4 w-4 text-destructive" />}
                          <span className={`font-mono ${isReceive ? 'text-score-green' : 'text-destructive'}`}>
                            {isReceive ? '+' : '−'}{Number(t.settlement_amount).toLocaleString()} sats
                          </span>
                          {t.is_internal && (
                            <Badge variant="outline" className="text-score-amber border-score-amber/40">🔄 circular</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">{timeAgo(t.blink_created_at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            {/* SECTION E — Contribution to economy */}
            {contrib && contrib.connectedWalletCount > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-score-amber" /></div>
                  <CardTitle className="text-base">Your contribution to {owner.community_name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ContribRow label="Connected wallets in this economy" value={`${contrib.connectedWalletCount}`} />
                  <ContribRow label="Your circular transactions (30d)" value={`${contrib.myCircularCount}`} />
                  <ContribRow label="Economy circular rate" value={`${contrib.economyCircularRate}%`} />
                  <ContribRow
                    label="Your share of economy circular volume"
                    value={`${contrib.contributionPct}%`}
                    highlight
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={downloadData}>Download my data</Button>
              <Button variant="ghost" className="text-destructive" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null} Disconnect &amp; delete all data
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ icon, label, value, suffix, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; suffix?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-score-amber/40 bg-score-amber/5' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
        {icon}<span>{label}</span>
      </div>
      <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
      {suffix && <div className="text-[11px] text-muted-foreground mt-0.5">{suffix}</div>}
    </div>
  );
}

function ContribRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${highlight ? 'text-score-amber font-bold' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
