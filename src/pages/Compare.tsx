import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Copy, Scale } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAllCommunitiesWithStats, fetchComparisonDetails } from '@/lib/api';
import { getFlagEmoji } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

const pillars = [
  ['merchant_density_score', 'Merchant Saturation'],
  ['retention_score', 'Retention'],
  ['earner_rate_score', 'Earner Penetration'],
  ['velocity_score', 'Velocity'],
  ['growth_score', 'Growth Momentum'],
] as const;

const bar = (value: number, highlight: boolean) => (
  <div className="h-2 rounded-full bg-secondary"><div className={`h-full rounded-full ${highlight ? 'bg-score-amber' : 'bg-muted-foreground/40'}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
);

const MiniMap = ({ merchants }: { merchants: any[] }) => {
  const points = merchants.filter(m => m.lat && m.lng);
  if (!points.length) return <div className="flex h-56 items-center justify-center rounded-lg bg-secondary/40 text-sm text-muted-foreground">No mapped merchants</div>;
  return <MapContainer center={[points[0].lat, points[0].lng]} zoom={12} className="h-56 rounded-lg" scrollWheelZoom={false}><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{points.map(m => <Marker key={m.id} position={[m.lat, m.lng]} />)}</MapContainer>;
};

const confidence = (proofCount: number) => proofCount >= 5 ? 'High ✓' : proofCount >= 1 ? 'Medium' : 'Low';

const Compare = () => {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const aSlug = params.get('a') || '';
  const bSlug = params.get('b') || '';
  const { data: economies } = useQuery({ queryKey: ['communities-stats'], queryFn: fetchAllCommunitiesWithStats });
  const a = economies?.find(e => e.slug === aSlug);
  const b = economies?.find(e => e.slug === bSlug);
  const { data: aDetails } = useQuery({ queryKey: ['compare-details', a?.id], queryFn: () => fetchComparisonDetails(a!.id), enabled: !!a?.id });
  const { data: bDetails } = useQuery({ queryKey: ['compare-details', b?.id], queryFn: () => fetchComparisonDetails(b!.id), enabled: !!b?.id });

  const insights = useMemo(() => {
    if (!a || !b || !aDetails?.score || !bDetails?.score) return [];
    const items: string[] = [];
    if ((a.merchants || 0) > (b.merchants || 0) * 2) items.push(`${a.name} has ${Math.round((a.merchants || 1) / Math.max(b.merchants || 1, 1))}x more merchants`);
    if ((b.merchants || 0) > (a.merchants || 0) * 2) items.push(`${b.name} has ${Math.round((b.merchants || 1) / Math.max(a.merchants || 1, 1))}x more merchants`);
    if ((bDetails.score.growth_score || 0) > (aDetails.score.growth_score || 0)) items.push(`${b.name} is growing faster (+${Math.round((bDetails.score.growth_score || 0) - (aDetails.score.growth_score || 0))} pts on momentum)`);
    if ((aDetails.score.retention_score || 0) > 80) items.push(`${a.name} has exceptional retention — ${Math.round(aDetails.score.retention_score)}% of sats stay local`);
    if ((bDetails.score.retention_score || 0) > 80) items.push(`${b.name} has exceptional retention — ${Math.round(bDetails.score.retention_score)}% of sats stay local`);
    return items.slice(0, 4);
  }, [a, b, aDetails, bDetails]);

  const setParam = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Comparison URL copied' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><h1 className="text-2xl font-bold mb-1">Economy Comparison</h1><p className="text-sm text-muted-foreground">Compare scores, pillars, and merchant networks side by side.</p></div>
          {a && b && <Button variant="outline" className="gap-1.5" onClick={share}><Copy className="h-4 w-4" /> Share comparison</Button>}
        </div>
        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select value={aSlug} onValueChange={value => setParam('a', value)}><SelectTrigger><SelectValue placeholder="Select first economy" /></SelectTrigger><SelectContent>{economies?.map(e => <SelectItem key={e.id} value={e.slug}>{e.name}</SelectItem>)}</SelectContent></Select>
          <Select value={bSlug} onValueChange={value => setParam('b', value)}><SelectTrigger><SelectValue placeholder="Select second economy" /></SelectTrigger><SelectContent>{economies?.map(e => <SelectItem key={e.id} value={e.slug}>{e.name}</SelectItem>)}</SelectContent></Select>
        </div>
        {!a || !b ? <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground"><Scale className="mx-auto mb-3 h-8 w-8" />Select two active economies to compare.</div> : (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[a, b].map(e => <div key={e.id} className={`rounded-lg border bg-card p-6 text-center ${e.score === Math.max(a.score || 0, b.score || 0) ? 'border-score-amber shadow-[0_0_30px_hsl(var(--score-amber)/0.18)]' : 'border-border'}`}><ScoreRing score={e.score || 0} /><h2 className="mt-4 font-semibold">{getFlagEmoji(e.country_code)} {e.name}</h2><p className="text-sm text-muted-foreground">{e.city}, {e.country}</p></div>)}
            </section>
            <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-5 text-lg font-semibold">Pillar Breakdown</h2><div className="space-y-5">{pillars.map(([key, label]) => { const av = Number(aDetails?.score?.[key] || 0); const bv = Number(bDetails?.score?.[key] || 0); return <div key={key} className="grid gap-2 md:grid-cols-[180px_1fr_60px_1fr]"><span className="text-sm font-medium">{label}</span>{bar(av, av >= bv)}<span className="text-center font-mono text-xs text-muted-foreground">{av >= bv ? '+' : '-'}{Math.abs(Math.round(av - bv))} pts</span>{bar(bv, bv > av)}</div>; })}</div></section>
            <section className="overflow-hidden rounded-lg border border-border bg-card"><table className="w-full text-sm"><tbody>{[['Merchants', a.merchants, b.merchants], ['Earners', a.earners, b.earners], ['Transactions', a.transactions, b.transactions], ['Population', a.declared_population, b.declared_population], ['Merchants/1000', ((a.merchants || 0) / Math.max(a.declared_population || 1, 1) * 1000).toFixed(2), ((b.merchants || 0) / Math.max(b.declared_population || 1, 1) * 1000).toFixed(2)], ['Founded', a.founding_year || '—', b.founding_year || '—'], ['Confidence', confidence(aDetails?.proofCount || 0), confidence(bDetails?.proofCount || 0)]].map(row => <tr key={row[0]} className="border-b border-border last:border-0"><td className="p-3 text-muted-foreground">{row[0]}</td><td className="p-3 font-medium">{row[1]}</td><td className="p-3 font-medium">{row[2]}</td></tr>)}</tbody></table></section>
            <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-3 text-lg font-semibold">Strengths and Gaps</h2>{insights.length ? <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{insights.map(i => <li key={i}>{i}</li>)}</ul> : <p className="text-sm text-muted-foreground">Select economies with score history to generate insights.</p>}</section>
            {(a.bbox_north && b.bbox_north) && <section className="grid grid-cols-1 gap-5 md:grid-cols-2"><div><h3 className="mb-2 font-medium">{a.name}</h3><MiniMap merchants={aDetails?.merchants || []} /></div><div><h3 className="mb-2 font-medium">{b.name}</h3><MiniMap merchants={bDetails?.merchants || []} /></div></section>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;
