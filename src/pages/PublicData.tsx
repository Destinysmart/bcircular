import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Database, Mail, Globe, Store, Users, Zap, Layers } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { fetchAllCommunitiesWithStats } from '@/lib/api';

const PublicData = () => {
  const { data: economies, isLoading } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-4xl">
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatTile Icon={Layers} label="Economies" value={totals.economies} />
              <StatTile Icon={Globe} label="Countries" value={totals.countries} />
              <StatTile Icon={Store} label="Merchants" value={totals.merchants} />
              <StatTile Icon={Users} label="Earners" value={totals.earners} />
              <StatTile Icon={Zap} label="Txns / month" value={totals.txns} />
            </div>
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
                  {(economies || []).slice(0, 10).map((e: any) => (
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
                  {!economies?.length && !isLoading && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(economies?.length ?? 0) > 10 && (
              <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground text-center">
                Showing 10 of {economies!.length}. Download CSV for full dataset.
              </div>
            )}
          </div>
        </section>

        {/* API note */}
        <section className="rounded-xl border border-border bg-card p-5">
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

        <p className="text-xs text-muted-foreground text-center mt-8">
          All data is identity-free and aggregate. <Link to="/methodology" className="text-primary hover:underline">Read our methodology →</Link>
        </p>
      </div>
    </div>
  );
};

function StatTile({ Icon, label, value }: { Icon: typeof Database; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-muted-foreground mb-2" />
      <div className="font-mono text-2xl font-bold text-foreground tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default PublicData;
