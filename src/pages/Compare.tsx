import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { Scale, Zap } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchAllCommunitiesWithStats, fetchComparisonDetails } from '@/lib/api';
import { getFlagEmoji } from '@/lib/mock-data';
import { toast } from 'sonner';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const points = useMemo(() => merchants.filter(m => m.lat && m.lng), [merchants]);

  useEffect(() => {
    if (!containerRef.current || !points.length) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    points.forEach(point => {
      L.circleMarker([point.lat, point.lng], {
        radius: 5,
        weight: 2,
        color: '#F7931A',
        fillColor: '#F7931A',
        fillOpacity: 0.85,
      }).addTo(map);
    });

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(points.map(point => [point.lat, point.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points]);

  if (!points.length) return <div className="flex h-56 items-center justify-center rounded-lg bg-secondary/40 text-sm text-muted-foreground">No mapped merchants</div>;

  return <div ref={containerRef} className="h-56 rounded-lg" aria-label="Merchant map" />;
};

const confidence = (proofCount: number) => proofCount >= 5 ? 'High' : proofCount >= 1 ? 'Medium' : 'Low';

const generateInsights = (a: any, b: any, aDetails: any, bDetails: any): string[] => {
  if (!a || !b) return [];
  const insights: string[] = [];

  const aMerchants = a.merchants ?? 0;
  const bMerchants = b.merchants ?? 0;
  if (aMerchants > 0 && bMerchants > 0) {
    if (aMerchants >= bMerchants * 2) {
      insights.push(`${a.name} has ${Math.round(aMerchants / bMerchants)}× more merchants than ${b.name}`);
    } else if (bMerchants >= aMerchants * 2) {
      insights.push(`${b.name} has ${Math.round(bMerchants / aMerchants)}× more merchants than ${a.name}`);
    }
  } else if (aMerchants > 0 && bMerchants === 0) {
    insights.push(`${a.name} has ${aMerchants} merchants — ${b.name} has none mapped yet`);
  } else if (bMerchants > 0 && aMerchants === 0) {
    insights.push(`${b.name} has ${bMerchants} merchants — ${a.name} has none mapped yet`);
  }

  const aScore = Math.round(a.score ?? 0);
  const bScore = Math.round(b.score ?? 0);
  const scoreDiff = Math.abs(aScore - bScore);
  if (scoreDiff >= 10) {
    const leader = aScore > bScore ? a.name : b.name;
    insights.push(`${leader} leads by ${scoreDiff} circularity points`);
  }

  const aRet = Math.round(Number(aDetails?.score?.retention_score ?? 0));
  const bRet = Math.round(Number(bDetails?.score?.retention_score ?? 0));
  if (aRet >= 70) insights.push(`${a.name} has strong retention — ${aRet}% of sats stay local`);
  else if (bRet >= 70) insights.push(`${b.name} has strong retention — ${bRet}% of sats stay local`);

  const aGrowth = Math.round(Number(aDetails?.score?.growth_score ?? 0));
  const bGrowth = Math.round(Number(bDetails?.score?.growth_score ?? 0));
  if (aGrowth > bGrowth + 15) insights.push(`${a.name} is growing faster — momentum score ${aGrowth} vs ${bGrowth}`);
  else if (bGrowth > aGrowth + 15) insights.push(`${b.name} is growing faster — momentum score ${bGrowth} vs ${aGrowth}`);

  const aEarners = a.earners ?? 0;
  const bEarners = b.earners ?? 0;
  if (aEarners > 0 && bEarners === 0) insights.push(`${a.name} has ${aEarners} registered earners — ${b.name} has none yet`);
  else if (bEarners > 0 && aEarners === 0) insights.push(`${b.name} has ${bEarners} registered earners — ${a.name} has none yet`);

  if (insights.length === 0) {
    insights.push(`Both economies are in early stages — more data will reveal stronger insights`);
  }

  return insights.slice(0, 4);
};

const Compare = () => {
  const [params, setParams] = useSearchParams();
  const aSlug = params.get('a') || '';
  const bSlug = params.get('b') || '';
  const { data: economies } = useQuery({ queryKey: ['communities-stats'], queryFn: fetchAllCommunitiesWithStats });
  const a = economies?.find(e => e.slug === aSlug);
  const b = economies?.find(e => e.slug === bSlug);
  const { data: aDetails } = useQuery({ queryKey: ['compare-details', a?.id], queryFn: () => fetchComparisonDetails(a!.id), enabled: !!a?.id });
  const { data: bDetails } = useQuery({ queryKey: ['compare-details', b?.id], queryFn: () => fetchComparisonDetails(b!.id), enabled: !!b?.id });

  const insights = useMemo(() => generateInsights(a, b, aDetails, bDetails), [a, b, aDetails, bDetails]);

  const setParam = (key: 'a' | 'b', value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  const share = async () => {
    const url = `${window.location.origin}/compare?a=${a?.slug}&b=${b?.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success('Comparison link copied');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 md:py-10">
        <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><h1 className="text-xl md:text-2xl font-bold mb-1">Economy Comparison</h1><p className="text-sm text-muted-foreground">Compare scores, pillars, and merchant networks side by side.</p></div>
          {a && b && (
            <button
              onClick={share}
              className="self-start rounded-lg border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              Share comparison ↗
            </button>
          )}
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
            <section
              style={{
                background: '#111827',
                border: '1px solid #1F2937',
                borderRadius: 12,
                padding: '20px 24px',
              }}
            >
              <h3 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap className="w-4 h-4" style={{ color: '#F7931A' }} /> Strengths & Gaps
              </h3>
              {insights.map((insight, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    padding: '8px 0',
                    borderBottom: i < insights.length - 1 ? '1px solid #1F2937' : 'none',
                  }}
                >
                  <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 14, color: '#D1D5DB', lineHeight: 1.6 }}>{insight}</span>
                </div>
              ))}
            </section>
            {(a.bbox_north && b.bbox_north) && <section className="grid grid-cols-1 gap-5 md:grid-cols-2"><div><h3 className="mb-2 font-medium">{a.name}</h3><MiniMap merchants={aDetails?.merchants || []} /></div><div><h3 className="mb-2 font-medium">{b.name}</h3><MiniMap merchants={bDetails?.merchants || []} /></div></section>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Compare;
