import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Database, Mail, Globe, Store, Users, Zap, Layers, Coins, CheckCircle2, Calendar, ShieldCheck, Radio, BookOpen } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/contexts/AuthContext';

type AccessTier = 'researcher' | 'organization' | 'partner';

const TIER_LABELS: Record<AccessTier, string> = {
  researcher: 'Research Access',
  organization: 'NGO / Funder Demo',
  partner: 'Data Partner',
};

const PublicData = () => {
  const [tier, setTier] = useState<AccessTier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', use_case: '', email: '' });

  const { data: economies, isLoading } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  // Aggregate sats + verified txns from blink_transactions
  const { data: aggregates } = useQuery({
    queryKey: ['public-data-aggregates'],
    queryFn: async () => {
      const [{ count: txCount }, { data: sumRows }, { data: oldest }] = await Promise.all([
        supabase.from('blink_transactions').select('*', { count: 'exact', head: true }),
        supabase.from('blink_transactions').select('settlement_amount'),
        supabase.from('communities').select('created_at').order('created_at', { ascending: true }).limit(1),
      ]);
      const totalSats = (sumRows ?? []).reduce((acc: number, r: any) => acc + Math.abs(Number(r.settlement_amount) || 0), 0);
      const earliest = oldest?.[0]?.created_at ? new Date(oldest[0].created_at) : null;
      const monthsOfData = earliest
        ? Math.max(1, Math.round((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 0;
      return { txCount: txCount ?? 0, totalSats, monthsOfData };
    },
  });

  const lastUpdated = (() => {
    if (!economies?.length) return null;
    const times = economies
      .map((e: any) => e.metrics_updated_at || e.updated_at)
      .filter(Boolean)
      .map((t: string) => new Date(t).getTime());
    if (!times.length) return null;
    return new Date(Math.max(...times));
  })();

  const totals = (() => {
    if (!economies) return null;
    const countries = new Set<string>();
    let merchants = 0, earners = 0, txns = 0;
    economies.forEach((e: any) => {
      if (e.country) countries.add(e.country);
      merchants += e.merchants || 0;
      earners += e.earners || 0;
      txns += e.monthlyTransactions || 0;
    });
    return { economies: economies.length, countries: countries.size, merchants, earners, txns };
  })();

  const activeEconomies = (economies ?? []).filter(
    (e: any) => (e.merchants || 0) > 0 || (e.earners || 0) > 0 || (e.score || 0) > 0,
  );

  const downloadCsv = () => {
    if (!economies) return;
    const headers = [
      'slug', 'name', 'country', 'city', 'fbce_tier',
      'monthly_transactions', 'activity_rate', 'merchants', 'earners',
      'circularity_score', 'data_source',
    ];
    const rows = economies.map((e: any) => [
      e.slug, e.name, e.country, e.city, e.fbce_tier ?? '',
      e.monthlyTransactions ?? 0, e.activityRate ?? 0, e.merchants ?? 0, e.earners ?? 0,
      e.score ?? 0, e.dataSource ?? 'none',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => {
        const s = String(cell ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitcoin-circular-leaderboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitRequest = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.use_case.trim()) {
      toast.error('Please fill name, email, and use case.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('data_access_requests').insert({
      name: form.name.trim().slice(0, 200),
      organization: form.organization.trim().slice(0, 200) || null,
      use_case: form.use_case.trim().slice(0, 1000),
      email: form.email.trim().slice(0, 320),
      tier,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not send request. Try again.');
      return;
    }
    toast.success('Request sent. We will be in touch.');
    setForm({ name: '', organization: '', use_case: '', email: '' });
    setTier(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="mb-2 text-xs uppercase tracking-widest text-score-amber font-semibold">Open Data</div>
        <h1 className="text-3xl font-bold mb-2">Bitcoin Circular Economy Data</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
          Aggregate, identity-free data on Bitcoin circular economies tracked across the world.
          Free for researchers, journalists, funders, and policymakers.
        </p>

        {/* Platform-wide stats */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform-wide stats</h2>
          {isLoading || !totals ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                <StatTile
                  Icon={Layers}
                  label="Active Economies"
                  value={totals.economies.toLocaleString()}
                  sub={`across ${totals.countries} countries`}
                />
                <StatTile Icon={Store} label="Merchants" value={totals.merchants.toLocaleString()} />
                <StatTile Icon={Users} label="Earners" value={totals.earners.toLocaleString()} />
                <StatTile
                  Icon={Coins}
                  label="Sats tracked"
                  value={(aggregates?.totalSats ?? 0).toLocaleString()}
                />
                <StatTile
                  Icon={CheckCircle2}
                  label="Verified txns"
                  value={(aggregates?.txCount ?? 0).toLocaleString()}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{aggregates?.monthsOfData ?? 0} months of data collected</span>
              </div>
            </>
          )}
        </section>

        {/* Download */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Datasets</h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-score-amber/10 flex items-center justify-center text-score-amber shrink-0">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Leaderboard snapshot (CSV)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">All tracked economies with current monthly metrics, merchants, earners and circularity score.</div>
                </div>
              </div>
              <Button onClick={downloadCsv} disabled={!economies} className="gap-1.5 bg-score-amber text-background hover:bg-score-amber/90">
                <Download className="h-4 w-4" /> Download CSV
              </Button>
            </div>
          </div>
        </section>

        {/* Live preview table */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Economy</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Country</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Txns</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Merch.</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Earners</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeEconomies.slice(0, 10).map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <Link to={`/c/${e.slug}`} className="text-foreground hover:text-score-amber font-medium">{e.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{e.country}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground tabular-nums">{(e.monthlyTransactions ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground tabular-nums">{(e.merchants ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground tabular-nums">{(e.earners ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-score-amber tabular-nums font-semibold">{e.score ?? 0}</td>
                    </tr>
                  ))}
                  {!activeEconomies.length && !isLoading && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No economies with active data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground text-center">
              Showing {Math.min(activeEconomies.length, 10)} of {economies?.length ?? 0} economies with active data. Download CSV for full dataset.
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-2">
            <span>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}.</span>
            <span>Data refreshes weekly. CSV reflects current snapshot.</span>
          </div>
        </section>

        {/* API note */}
        <section className="rounded-xl border border-border bg-card p-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Full API coming soon</div>
              <p className="text-sm text-muted-foreground mb-2">
                We're working on a public, programmatic API for researchers and partners.
                Contact us to request early access or custom data exports.
              </p>
              <a
                href="mailto:smartdestinyonyekachi@gmail.com?subject=Bitcoin%20Circular%20API%20early%20access"
                className="text-sm text-primary hover:underline font-medium"
              >
                smartdestinyonyekachi@gmail.com →
              </a>
            </div>
          </div>
        </section>

        {/* Research & Premium Access */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Research & Premium Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AccessCard
              title="Academic & Research Access"
              audience="Researchers"
              bullets={[
                'Full historical dataset',
                'Economy-level time series',
                'Cross-economy comparisons',
                'Citation-ready methodology',
              ]}
              price="Apply for free access"
              cta="Request Research Access →"
              onClick={() => setTier('researcher')}
            />
            <AccessCard
              title="NGO & Funder Intelligence"
              audience="Organizations"
              bullets={[
                'Economy verification reports',
                'Grant due diligence data',
                'Impact measurement exports',
                'Custom date range filtering',
              ]}
              price="Contact for pricing"
              cta="Request Demo →"
              onClick={() => setTier('organization')}
            />
            <AccessCard
              title="Data Partner API"
              audience="Bitcoin Companies"
              bullets={[
                'Real-time economy metrics',
                'Wallet behavior aggregates',
                'Regional adoption signals',
                'White-label data feeds',
              ]}
              price="Partner pricing"
              cta="Become a Data Partner →"
              onClick={() => setTier('partner')}
              accent
            />
          </div>
        </section>

        {/* Trust signals */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TrustTile Icon={ShieldCheck} title="Identity-free" sub="No personal data collected" />
          <TrustTile Icon={Radio} title="Blink-verified" sub="Real Lightning transactions" />
          <TrustTile Icon={BookOpen} title="Open standard" sub="FBCE methodology" />
        </section>

        <p className="text-xs text-muted-foreground text-center mt-8">
          All data is identity-free and aggregate. <Link to="/methodology" className="text-primary hover:underline">Read our methodology →</Link>
        </p>
      </div>

      {/* Request Access Modal */}
      <Dialog open={tier !== null} onOpenChange={(open) => !open && setTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tier ? TIER_LABELS[tier] : ''}</DialogTitle>
            <DialogDescription>
              Tell us a little about your use case. We respond within a few business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-name">Name</Label>
              <Input id="req-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-org">Organization</Label>
              <Input id="req-org" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-use">Use case</Label>
              <Select value={form.use_case} onValueChange={(v) => setForm({ ...form, use_case: v })}>
                <SelectTrigger id="req-use"><SelectValue placeholder="Select a use case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic_research">Academic research</SelectItem>
                  <SelectItem value="journalism">Journalism / reporting</SelectItem>
                  <SelectItem value="grant_due_diligence">Grant due diligence</SelectItem>
                  <SelectItem value="impact_measurement">Impact measurement</SelectItem>
                  <SelectItem value="product_integration">Product integration / API</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-email">Email</Label>
              <Input id="req-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={320} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTier(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting} className="bg-score-amber text-background hover:bg-score-amber/90">
              {submitting ? 'Sending…' : 'Send request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function StatTile({ Icon, label, value, sub }: { Icon: typeof Database; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-muted-foreground mb-2" />
      <div className="font-mono text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5 normal-case tracking-normal">{sub}</div>}
    </div>
  );
}

function AccessCard({
  title, audience, bullets, price, cta, onClick, accent,
}: {
  title: string; audience: string; bullets: string[]; price: string; cta: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 flex flex-col ${accent ? 'border-score-amber/60' : 'border-border'}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{audience}</div>
      <div className="font-semibold text-foreground mb-3">{title}</div>
      <ul className="space-y-1.5 mb-4 text-sm text-muted-foreground flex-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-score-amber mt-0.5 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-foreground font-medium mb-3">{price}</div>
      <Button
        onClick={onClick}
        variant={accent ? 'default' : 'outline'}
        className={accent ? 'bg-score-amber text-background hover:bg-score-amber/90 w-full' : 'w-full'}
      >
        {cta}
      </Button>
    </div>
  );
}

function TrustTile({ Icon, title, sub }: { Icon: typeof Database; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <Icon className="h-5 w-5 text-score-amber shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default PublicData;
