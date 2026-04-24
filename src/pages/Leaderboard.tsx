import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Scale, Search, SlidersHorizontal, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import EconomyLogo from '@/components/EconomyLogo';
import { TierBadge } from '@/components/TierBadge';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { getFlagEmoji, getScoreColor, getScoreBgColor } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortKey = 'transactions' | 'activity' | 'score' | 'sats' | 'growth' | 'merchants';
type Activity = 'all' | 'active' | 'growing' | 'dormant';
type Coverage = 'all' | 'high' | 'medium' | 'low' | 'btcmap';
type Volume = 'all' | 'low' | 'medium' | 'high';
type Retention = 'all' | 'high' | 'low';
type Confidence = 'all' | 'high' | 'medium' | 'low';
type Source = 'all' | 'btcmap' | 'self_reported' | 'combined';
type TierFilter = 'all' | 'emerging' | 'advanced';

const regions = ['All', 'Africa', 'Latin America', 'Europe', 'Asia'];

const scoreBorderColor = (score: number) => {
  if (score > 75) return 'border-l-score-green';
  if (score >= 50) return 'border-l-score-amber';
  return 'border-l-score-red';
};

const Leaderboard = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All');
  const [country, setCountry] = useState('All');
  const [city, setCity] = useState('All');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [activity, setActivity] = useState<Activity>('all');
  const [coverage, setCoverage] = useState<Coverage>('all');
  const [volume, setVolume] = useState<Volume>('all');
  const [retention, setRetention] = useState<Retention>('all');
  const [confidence, setConfidence] = useState<Confidence>('all');
  const [source, setSource] = useState<Source>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('transactions');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const { data: communities, isLoading, isError, error } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  const list = useMemo(() => (communities || []).map((c: any) => ({
    ...c,
    countryCode: c.country_code,
    weeklyChange: c.weeklyChange ?? 0,
    totalApproved: c.totalApproved ?? 0,
    satsCircular: c.satsCircular ?? 0,
    satsTotal: c.satsTotal ?? 0,
    retentionScore: c.retentionScore ?? 0,
    growthScore: c.growthScore ?? 0,
    proofCount: c.proofCount ?? 0,
    dataSource: c.dataSource ?? 'none',
  })), [communities]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    list.filter(c => region === 'All' || c.region === region).forEach(c => c.country && set.add(c.country));
    return ['All', ...Array.from(set).sort()];
  }, [list, region]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    list
      .filter(c => (region === 'All' || c.region === region) && (country === 'All' || c.country === country))
      .forEach(c => c.city && set.add(c.city));
    return ['All', ...Array.from(set).sort()];
  }, [list, region, country]);

  const matchesActivity = (c: any) => {
    if (activity === 'all') return true;
    if (activity === 'active') return c.score >= 50;
    if (activity === 'growing') return (c.growthScore ?? 0) >= 60;
    if (activity === 'dormant') return c.score < 25 && c.totalApproved < 5;
    return true;
  };

  const matchesCoverage = (c: any) => {
    if (coverage === 'all') return true;
    if (coverage === 'btcmap') return c.dataSource === 'btcmap' || c.dataSource === 'combined';
    if (coverage === 'high') return (c.merchants ?? 0) >= 20;
    if (coverage === 'medium') return (c.merchants ?? 0) >= 5 && (c.merchants ?? 0) < 20;
    if (coverage === 'low') return (c.merchants ?? 0) < 5;
    return true;
  };

  const matchesVolume = (c: any) => {
    if (volume === 'all') return true;
    const s = c.satsTotal ?? 0;
    if (volume === 'high') return s >= 1_000_000;
    if (volume === 'medium') return s >= 100_000 && s < 1_000_000;
    if (volume === 'low') return s < 100_000;
    return true;
  };

  const matchesRetention = (c: any) => {
    if (retention === 'all') return true;
    if (retention === 'high') return (c.retentionScore ?? 0) >= 60;
    if (retention === 'low') return (c.retentionScore ?? 0) < 60;
    return true;
  };

  const matchesConfidence = (c: any) => {
    if (confidence === 'all') return true;
    const p = c.proofCount ?? 0;
    if (confidence === 'high') return p >= 5;
    if (confidence === 'medium') return p >= 1 && p < 5;
    if (confidence === 'low') return p === 0;
    return true;
  };

  const matchesSource = (c: any) => source === 'all' || c.dataSource === source;

  const matchesTier = (c: any) => {
    if (tierFilter === 'all') return true;
    const t = c.fbce_tier ?? 0;
    if (tierFilter === 'emerging') return t === 1 || t === 2;
    if (tierFilter === 'advanced') return t >= 3 && t <= 5;
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list
      .filter(c => region === 'All' || c.region === region)
      .filter(c => country === 'All' || c.country === country)
      .filter(c => city === 'All' || c.city === city)
      .filter(c => (c.score ?? 0) >= scoreRange[0] && (c.score ?? 0) <= scoreRange[1])
      .filter(matchesActivity)
      .filter(matchesCoverage)
      .filter(matchesVolume)
      .filter(matchesRetention)
      .filter(matchesConfidence)
      .filter(matchesSource)
      .filter(matchesTier)
      .filter(c => !q || c.name?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'transactions') return (b.monthlyTransactions ?? 0) - (a.monthlyTransactions ?? 0);
        if (sortBy === 'activity') return (b.activityRate ?? 0) - (a.activityRate ?? 0);
        if (sortBy === 'sats') return (b.satsTotal ?? 0) - (a.satsTotal ?? 0);
        if (sortBy === 'growth') return (b.growthScore ?? 0) - (a.growthScore ?? 0);
        if (sortBy === 'merchants') return (b.merchants ?? 0) - (a.merchants ?? 0);
        return (b.score ?? 0) - (a.score ?? 0);
      });
  }, [list, search, region, country, city, scoreRange, activity, coverage, volume, retention, confidence, source, tierFilter, sortBy]);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (region !== 'All') activeFilters.push({ key: 'region', label: `Region: ${region}`, clear: () => { setRegion('All'); setCountry('All'); setCity('All'); } });
  if (country !== 'All') activeFilters.push({ key: 'country', label: `Country: ${country}`, clear: () => { setCountry('All'); setCity('All'); } });
  if (city !== 'All') activeFilters.push({ key: 'city', label: `City: ${city}`, clear: () => setCity('All') });
  if (scoreRange[0] !== 0 || scoreRange[1] !== 100) activeFilters.push({ key: 'score', label: `Score ${scoreRange[0]}–${scoreRange[1]}`, clear: () => setScoreRange([0, 100]) });
  if (activity !== 'all') activeFilters.push({ key: 'activity', label: `Activity: ${activity}`, clear: () => setActivity('all') });
  if (coverage !== 'all') activeFilters.push({ key: 'coverage', label: `Merchants: ${coverage}`, clear: () => setCoverage('all') });
  if (volume !== 'all') activeFilters.push({ key: 'volume', label: `Volume: ${volume}`, clear: () => setVolume('all') });
  if (retention !== 'all') activeFilters.push({ key: 'retention', label: `Retention: ${retention}`, clear: () => setRetention('all') });
  if (confidence !== 'all') activeFilters.push({ key: 'confidence', label: `Confidence: ${confidence}`, clear: () => setConfidence('all') });
  if (source !== 'all') activeFilters.push({ key: 'source', label: `Source: ${source.replace('_', ' ')}`, clear: () => setSource('all') });
  if (tierFilter !== 'all') activeFilters.push({ key: 'tier', label: `Tier: ${tierFilter}`, clear: () => setTierFilter('all') });
  if (search) activeFilters.push({ key: 'search', label: `“${search}”`, clear: () => setSearch('') });

  const clearAll = () => {
    setSearch(''); setRegion('All'); setCountry('All'); setCity('All');
    setScoreRange([0, 100]); setActivity('all'); setCoverage('all');
    setVolume('all'); setRetention('all'); setConfidence('all'); setSource('all'); setTierFilter('all');
  };

  const formatSats = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="mb-6 rounded-xl border border-score-amber/30 bg-foreground px-5 py-4 font-mono text-sm font-semibold text-score-amber shadow-[0_0_24px_hsl(var(--score-amber)/0.10)]">
          🌍 {list.length} Bitcoin circular economies tracked globally
        </div>

        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mb-1">Global Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Explore, filter, and compare Bitcoin economies worldwide.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/compare">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5"><Scale className="h-3.5 w-3.5" /> Compare</Button>
            </Link>
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 lg:hidden" onClick={() => setSidebarOpen(o => !o)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </Button>
          </div>
        </div>

        {/* Search + sort row */}
        <div className="flex gap-3 mb-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by economy, country, or city…"
              className="pl-9 rounded-full"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transactions">Sort: Transactions</SelectItem>
              <SelectItem value="activity">Sort: Activity rate</SelectItem>
              <SelectItem value="score">Sort: Circularity Score</SelectItem>
              <SelectItem value="sats">Sort: Sats Volume</SelectItem>
              <SelectItem value="growth">Sort: Growth rate</SelectItem>
              <SelectItem value="merchants">Sort: Merchants</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* FBCE Tier filter chips */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono mr-1">FBCE Tier:</span>
          {([['all', 'All Tiers'], ['emerging', 'Emerging (1-2)'], ['advanced', 'Advanced (3-5)']] as [TierFilter, string][]).map(([val, label]) => (
            <Button
              key={val}
              variant={tierFilter === val ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-7 px-3 text-xs"
              onClick={() => setTierFilter(val)}
            >
              {label}
            </Button>
          ))}
        </div>
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {activeFilters.map(f => (
              <Badge key={f.key} variant="secondary" className="gap-1 rounded-full pl-3 pr-1.5 py-1 font-mono text-[11px]">
                {f.label}
                <button onClick={f.clear} className="ml-1 rounded-full hover:bg-background/60 p-0.5" aria-label={`Clear ${f.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="rounded-xl border border-border bg-card p-4 space-y-5 h-fit lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</h2>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <FilterBlock label="Region">
                <div className="flex flex-wrap gap-1.5">
                  {regions.map(r => (
                    <Button
                      key={r}
                      variant={region === r ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-full h-7 px-3 text-xs"
                      onClick={() => { setRegion(r); setCountry('All'); setCity('All'); }}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock label="Country">
                <Select value={country} onValueChange={(v) => { setCountry(v); setCity('All'); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countryOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="City">
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label={`Score: ${scoreRange[0]} – ${scoreRange[1]}`}>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={scoreRange}
                  onValueChange={(v) => setScoreRange([v[0], v[1]] as [number, number])}
                />
              </FilterBlock>

              <FilterBlock label="Activity">
                <Select value={activity} onValueChange={(v) => setActivity(v as Activity)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active (score ≥ 50)</SelectItem>
                    <SelectItem value="growing">Growing</SelectItem>
                    <SelectItem value="dormant">Dormant</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="Merchant coverage">
                <Select value={coverage} onValueChange={(v) => setCoverage(v as Coverage)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High (≥ 20)</SelectItem>
                    <SelectItem value="medium">Medium (5–19)</SelectItem>
                    <SelectItem value="low">Low (&lt; 5)</SelectItem>
                    <SelectItem value="btcmap">BTCMap verified</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="Sats volume">
                <Select value={volume} onValueChange={(v) => setVolume(v as Volume)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High (≥ 1M)</SelectItem>
                    <SelectItem value="medium">Medium (100K–1M)</SelectItem>
                    <SelectItem value="low">Low (&lt; 100K)</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="Retention">
                <Select value={retention} onValueChange={(v) => setRetention(v as Retention)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High (≥ 60)</SelectItem>
                    <SelectItem value="low">Low (&lt; 60)</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="Confidence">
                <Select value={confidence} onValueChange={(v) => setConfidence(v as Confidence)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <FilterBlock label="Data source">
                <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="btcmap">BTCMap</SelectItem>
                    <SelectItem value="self_reported">Self-reported</SelectItem>
                    <SelectItem value="combined">Combined</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBlock>

              <Button variant="ghost" size="sm" className="w-full" onClick={clearAll}>Reset filters</Button>
            </aside>
          )}

          {/* Results */}
          <div>
            <div className="text-xs text-muted-foreground font-mono mb-2">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </div>

            {isLoading ? (
              <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
            ) : isError ? (
              <div className="text-center py-20 text-destructive text-sm">Error: {(error as Error).message}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-border bg-card">
                <p className="text-muted-foreground mb-2">No economies match these filters.</p>
                <button onClick={clearAll} className="text-primary hover:underline text-sm">Clear all filters</button>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((c, i) => (
                  <div
                    key={c.id || i}
                    onClick={() => navigate(`/c/${c.slug}`)}
                    className={`group flex items-center gap-4 rounded-xl border-l-4 ${scoreBorderColor(c.score ?? 0)} p-4 transition-all hover:bg-secondary/60 hover:shadow-[0_0_24px_hsl(var(--score-amber)/0.12)] cursor-pointer`}
                  >
                    <span className="font-mono text-sm text-muted-foreground w-8 text-right">{i + 1}</span>
                    <EconomyLogo economy={c as any} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{getFlagEmoji(c.countryCode || '')}</span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground text-xs hidden md:inline">{c.city}, {c.country}</span>
                        <ConfidenceBadge totalApproved={c.totalApproved} proofCount={c.proofCount} />
                        {c.dataSource === 'btcmap' || c.dataSource === 'combined' ? (
                          <Badge variant="outline" className="font-mono text-[10px] rounded-full">BTCMap</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:flex flex-col items-end text-xs">
                        <div className="font-mono text-base font-bold text-score-amber tabular-nums">⚡ {(c.monthlyTransactions ?? 0).toLocaleString()}</div>
                        <div className="text-muted-foreground">txns / month</div>
                      </div>
                      <div className="hidden lg:flex flex-col items-end text-xs">
                        <div className="font-mono text-base font-bold text-foreground tabular-nums">{c.activityRate ?? 0}%</div>
                        <div className="text-muted-foreground">{c.activeDays ?? 0}/{c.daysInMonth ?? 30} days</div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
                        <span>{c.merchants} merchants</span>
                        <span className="font-mono">{formatSats(c.satsTotal ?? 0)} sats</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`font-mono text-base font-bold ${getScoreColor(c.score ?? 0)}`}>
                          {c.score ?? 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">circularity</span>
                      </div>
                      <button onClick={(event) => { event.stopPropagation(); navigate(`/compare?a=${c.slug}`); }} className="text-muted-foreground hover:text-primary" aria-label={`Compare ${c.name}`}>
                        <Scale className="h-4 w-4" />
                      </button>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    {children}
  </div>
);

export default Leaderboard;
