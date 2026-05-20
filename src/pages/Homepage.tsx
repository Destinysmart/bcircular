import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowRight, Store, Zap, Globe, Sparkles, TrendingUp, Star, Repeat, BarChart3, MapPin, CheckCircle2, ShieldCheck, Bitcoin, Plus, Layers, Check, Database, Lock, Shield, EyeOff, Users, FlaskConical, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import TransparencyBanner from '@/components/TransparencyBanner';
import GlobalEconomiesMap from '@/components/GlobalEconomiesMap';
import RecentActivityFeed from '@/components/RecentActivityFeed';
import { useCountUp } from '@/hooks/useCountUp';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { getFlagEmoji } from '@/lib/mock-data';
import { getCoverage } from '@/lib/coverage';
import { TierBadge } from '@/components/TierBadge';
import circularLogo from '@/assets/circular-logo.png';
// Hero served from /public for stable LCP preload URL (see index.html)
const HERO_IMAGE_PUBLIC = '/hero-image.jpg';
import Seo from '@/components/Seo';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0, 1] as [number, number, number, number], delay: i * 0.06 },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

type Economy = Awaited<ReturnType<typeof fetchAllCommunitiesWithStats>>[number];

const REGION_OF: Record<string, string> = {
  // Africa
  NG: 'Africa', KE: 'Africa', ZA: 'Africa', GH: 'Africa', UG: 'Africa', TZ: 'Africa', SN: 'Africa', RW: 'Africa', ET: 'Africa', ZM: 'Africa',
  // Latin America
  SV: 'Latin America', BR: 'Latin America', AR: 'Latin America', MX: 'Latin America', CO: 'Latin America', CR: 'Latin America', GT: 'Latin America', UY: 'Latin America', PE: 'Latin America', CL: 'Latin America',
  // Europe
  DE: 'Europe', FR: 'Europe', NL: 'Europe', ES: 'Europe', PT: 'Europe', IT: 'Europe', CH: 'Europe', AT: 'Europe', GB: 'Europe', BE: 'Europe', SE: 'Europe', CZ: 'Europe', PL: 'Europe',
  // Asia
  JP: 'Asia', KR: 'Asia', SG: 'Asia', TH: 'Asia', PH: 'Asia', ID: 'Asia', VN: 'Asia', IN: 'Asia', HK: 'Asia', TW: 'Asia', MY: 'Asia',
};

const regionOf = (cc?: string | null) => (cc ? REGION_OF[cc.toUpperCase()] || 'Other' : 'Other');

const getEconomyImage = (e: Economy) => {
  if (e.banner_url) return e.banner_url;
  const q = encodeURIComponent(`${e.city || ''},${e.country || ''},bitcoin,market`.replace(/^,+/, ''));
  return `https://source.unsplash.com/featured/800x450?${q}`;
};

const getStatus = (e: Economy) => {
  const score = e.score ?? 0;
  const growth = e.growthScore ?? 0;
  if (score >= 60) return { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-400' };
  if (growth >= 50) return { label: 'Growing', dot: 'bg-score-amber', text: 'text-score-amber' };
  if (score > 0) return { label: 'Early', dot: 'bg-muted-foreground', text: 'text-muted-foreground' };
  return { label: 'New', dot: 'bg-primary', text: 'text-primary' };
};

const FILTERS = [
  { id: 'featured', label: 'Featured', Icon: Star },
  { id: 'africa', label: 'Africa', Icon: Globe },
  { id: 'latam', label: 'Latin America', Icon: Globe },
  { id: 'europe', label: 'Europe', Icon: Globe },
  { id: 'asia', label: 'Asia', Icon: Globe },
  { id: 'high', label: 'High Score', Icon: TrendingUp },
  { id: 'growing', label: 'Fast Growing', Icon: Sparkles },
  { id: 'new', label: 'New', Icon: Sparkles },
] as const;

type FilterId = typeof FILTERS[number]['id'];

const HERO_IMAGE = HERO_IMAGE_PUBLIC;

const Homepage = ({ topSlot, hideHero = false, compactHero = false }: { topSlot?: React.ReactNode; hideHero?: boolean; compactHero?: boolean } = {}) => {
  const gated = false;
  const [filter, setFilter] = useState<FilterId>('featured');
  const { data, isLoading } = useQuery({ queryKey: ['communities-stats'], queryFn: fetchAllCommunitiesWithStats });
  const { data: verifiedTxns } = useQuery({
    queryKey: ['homepage-verified-txns'],
    queryFn: async () => {
      const { count } = await supabase.from('blink_transactions').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });
  const list: Economy[] = data || [];
  const heroHeight = compactHero ? 320 : 520;
  const heroHeightMobile = compactHero ? 260 : 380;

  const totalMerchants = list.reduce((s, c) => s + (c.merchants ?? 0), 0);
  const totalMonthlyTxns = list.reduce((s, c) => s + ((c as any).monthlyTransactions ?? 0), 0);
  const avgActivity = list.length > 0
    ? Math.round(list.reduce((s, c) => s + ((c as any).activityRate ?? 0), 0) / list.length)
    : 0;
  const countries = new Set(list.map(c => c.country).filter(Boolean)).size;
  const advancedEconomies = list.filter(c => ((c as any).fbce_tier ?? 0) >= 3).length;

  const DISPLAY_CAP = 9;

  const filtered = useMemo(() => {
    let res = [...list];
    switch (filter) {
      case 'featured':
        // Sort by monthly transactions (primary metric), tiebreak on score
        res = res.sort((a, b) => {
          const at = (a as any).monthlyTransactions ?? 0;
          const bt = (b as any).monthlyTransactions ?? 0;
          if (bt !== at) return bt - at;
          return (b.score ?? 0) - (a.score ?? 0);
        });
        break;
      case 'africa':
      case 'latam':
      case 'europe':
      case 'asia': {
        const map: Record<string, string> = { africa: 'Africa', latam: 'Latin America', europe: 'Europe', asia: 'Asia' };
        res = res.filter(c => regionOf(c.country_code) === map[filter]);
        break;
      }
      case 'high':
        res = res.filter(c => (c.score ?? 0) >= 60).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        break;
      case 'growing':
        res = res.sort((a, b) => (b.growthScore ?? 0) - (a.growthScore ?? 0));
        break;
      case 'new': {
        const cutoff = Date.now() - 30 * 86400_000;
        res = res.filter(c => new Date(c.created_at).getTime() >= cutoff);
        break;
      }
    }
    return res;
  }, [list, filter]);

  const displayed = useMemo(() => filtered.slice(0, DISPLAY_CAP), [filtered]);
  const hasMore = filtered.length > displayed.length;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Bitcoin Circular | Bitcoin Circular Economy Tracker"
        includesBrand
        description="Track and measure Bitcoin circular economies worldwide. Live merchant data, transaction flows, and a transparent Circularity Score for every community."
        path="/"
      />
      <Navbar />
      <TransparencyBanner />


      {/* HERO */}
      {!hideHero && (
      <section className="relative overflow-hidden">
        <div
          className="relative w-full bg-cover hero-responsive"
          style={{ ['--hero-h' as any]: `${heroHeight}px`, ['--hero-h-mobile' as any]: `${heroHeightMobile}px`, backgroundImage: `url(${HERO_IMAGE})`, backgroundPosition: 'center top' }}
          aria-hidden="false"
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.7) 50%, hsl(var(--background) / 0.25) 100%)',
            }}
          />
          <div className="container relative h-full flex items-center pt-8 pb-24 md:pt-16 md:pb-16 lg:pb-36">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border border-score-amber/40 bg-score-amber/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-score-amber mb-6">
                <Sparkles className="h-3 w-3" />
                Early-stage · Open · Privacy-first
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className={`${compactHero ? 'text-2xl sm:text-3xl md:text-4xl mb-3' : 'text-3xl sm:text-5xl md:text-6xl mb-4 md:mb-5'} font-extrabold tracking-tight leading-[1.1] text-foreground`}>
                Visualizing Bitcoin
                <br />
                <span className="text-score-amber">Circular Economies</span>
              </motion.h1>
              {!compactHero && (
                <motion.p variants={fadeUp} custom={2} className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed mb-6 md:mb-8">
                  Explore how Bitcoin moves across communities through transparent, privacy-conscious activity metrics. No signup required.
                </motion.p>
              )}
              {!compactHero && (
                <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
                  <Link to="/leaderboard" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto rounded-full px-6 gap-2 h-12 bg-score-amber text-background hover:bg-score-amber/90">
                      Explore Economies <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/methodology" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-6 h-12 border-foreground/20 hover:bg-foreground/5 gap-2">
                      How it works <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              )}
              {!compactHero && (
                <motion.div variants={fadeUp} custom={4} className="mt-5 text-xs text-muted-foreground">
                  Running a Bitcoin community?{' '}
                  <Link to="/register" className="text-score-amber hover:underline">Add your economy →</Link>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Stat pills floating at bottom of hero (desktop/tablet only) */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="container hidden md:block md:relative md:mt-6 md:pb-8 lg:mt-0 lg:pb-0 lg:absolute lg:left-0 lg:right-0 lg:bottom-6"
          >
            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-score-green opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-score-green" />
              </span>
              <span className="text-score-green font-semibold">Live</span>
              <span className="text-muted-foreground">· Last updated just now</span>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <AnimatedStatPill icon={<Store className="h-3.5 w-3.5" />} label="Merchants" value={totalMerchants} loading={isLoading} delay={4} />
              <AnimatedStatPill icon={<Zap className="h-3.5 w-3.5" />} label="Txns this month" value={totalMonthlyTxns} loading={isLoading} delay={5} />
              <AnimatedStatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg activity" value={avgActivity} suffix="%" loading={isLoading} delay={6} />
              <AnimatedStatPill icon={<Globe className="h-3.5 w-3.5" />} label="Countries" value={countries} loading={isLoading} delay={7} />
              {advancedEconomies > 0 && (
                <AnimatedStatPill icon={<Star className="h-3.5 w-3.5" />} label="Advanced Economies" value={advancedEconomies} loading={isLoading} delay={8} />
              )}
            </div>
          </motion.div>
        </div>

        {/* Mobile stats: 2x2 grid below hero */}
        {!compactHero && (
          <div className="md:hidden bg-background/80 border-b border-border">
            <div className="container py-4">
              <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-score-green opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-score-green" />
                </span>
                <span className="text-score-green font-semibold">Live</span>
                <span className="text-muted-foreground">· Updated now</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MobileHeroStat icon={<Store className="h-4 w-4 text-score-amber" />} label="Merchants" value={totalMerchants} loading={isLoading} />
                <MobileHeroStat icon={<Zap className="h-4 w-4 text-score-amber" />} label="Txns" value={totalMonthlyTxns} loading={isLoading} />
                <MobileHeroStat icon={<TrendingUp className="h-4 w-4 text-score-green" />} label="Avg Activity" value={avgActivity} suffix="%" loading={isLoading} />
                <MobileHeroStat icon={<Globe className="h-4 w-4 text-foreground" />} label="Countries" value={countries} loading={isLoading} />
              </div>
            </div>
          </div>
        )}
      </section>
      )}



      {topSlot}

      {/* (Map + Activity moved below the Discover grid) */}

      {/* FILTER PILLS */}
      {!gated && (
      <section className="border-b border-border">
        <div className="container py-6">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FILTERS.map(f => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'border-score-amber bg-score-amber/10 text-score-amber'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  <f.Icon className="w-3.5 h-3.5" aria-hidden />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ECONOMY GRID */}
      <section className="container py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Discover circular economies</h2>
            <p className="text-sm text-muted-foreground mt-1">Real merchants. Real sats. Verified data.</p>
          </div>
          <Link to="/leaderboard" className="hidden sm:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-1/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            {list.length === 0 ? (
              <p className="text-muted-foreground">No economies yet. Be the first to <Link to="/register" className="text-score-amber hover:underline">create one</Link>.</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">No economies match this filter yet.</p>
                <button onClick={() => setFilter('featured')} className="text-score-amber text-sm hover:underline">Show featured →</button>
              </>
            )}
          </div>
        ) : (
          <div className={`relative ${gated ? 'min-h-[600px] overflow-hidden' : ''}`}>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              aria-hidden={gated ? true : undefined}
              style={gated ? { pointerEvents: 'none', userSelect: 'none' } : undefined}
              className={`grid grid-cols-1 sm:grid-cols-2 ${gated ? '' : 'lg:grid-cols-3'} gap-6 ${gated ? 'opacity-95 [&_*]:!pointer-events-none [&_*]:!cursor-default' : ''}`}
            >
              {(gated ? displayed.slice(0, 2) : displayed).map((e, i) => {
                const status = getStatus(e);
                const score = e.score ?? 0;
                const monthlyTxns = (e as any).monthlyTransactions ?? 0;
                const activeDays = (e as any).activeDays ?? 0;
                const daysSoFar = (e as any).daysSoFar ?? 30;
                const daysInMonth = (e as any).daysInMonth ?? 30;
                const activityRate = (e as any).activityRate ?? 0;
                const isBtcmap = e.dataSource === 'btcmap' || e.dataSource === 'combined';
                return (
                  <motion.div key={e.id} variants={fadeUp} custom={i}>
                    <Link
                      to={`/c/${e.slug}`}
                      className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-score-amber/50 hover:shadow-[0_8px_32px_-12px_hsl(var(--score-amber)/0.25)]"
                    >
                      {/* Banner */}
                      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                        <img
                          src={getEconomyImage(e)}
                          alt={`${e.name} banner`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <span className="text-2xl drop-shadow">{getFlagEmoji(e.country_code || '')}</span>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${status.text} bg-background/80 backdrop-blur rounded-full border border-border px-2 py-0.5`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          {e.logo_url ? (
                            <img src={e.logo_url} alt="" className="h-8 w-8 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-score-amber/15 border border-score-amber/30 flex items-center justify-center text-[10px] font-mono text-score-amber">
                              {(e.name || '?').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{e.name}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{e.city}, {e.country}</span>
                            </div>
                            {(e as any).fbce_tier && (
                              <div className="mt-1.5">
                                <TierBadge tier={(e as any).fbce_tier} verified={(e as any).fbce_tier_verified} showSelfReported={false} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PRIMARY METRICS — big numbers */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <Zap className="h-4 w-4 text-score-amber" />
                              <span className="font-mono text-2xl font-extrabold text-foreground tabular-nums">{monthlyTxns.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Txns this month</div>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-2xl font-extrabold text-foreground tabular-nums">{activeDays}</span>
                              <span className="text-xs text-muted-foreground">/ {daysInMonth}</span>
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Active days</div>
                          </div>
                        </div>

                        {/* Activity rate progress */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            <span>Activity</span>
                            <span className="font-mono text-foreground">{activityRate}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-score-amber transition-all" style={{ width: `${Math.min(100, activityRate)}%` }} />
                          </div>
                        </div>

                        {/* Secondary stats */}
                        <div className="grid grid-cols-2 gap-3 text-xs mb-4 pb-4 border-b border-border">
                          <div className="text-muted-foreground">
                            Merchants <span className="font-mono font-semibold text-foreground inline-flex items-center gap-1">{(e.merchants ?? 0).toLocaleString()}{isBtcmap && <CheckCircle2 className="h-3 w-3 text-score-amber" />}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Earners <span className="font-mono font-semibold text-foreground">{(e.earners ?? 0).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Circularity score — small/secondary */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-2 flex-wrap">
                            <span>
                              Circularity <span className="font-mono font-semibold text-score-amber">{score}</span><span className="text-muted-foreground">/100</span>
                            </span>
                            {(() => {
                              const cov = getCoverage((e as any).connectedWallets ?? 0, e.merchants ?? 0, e.earners ?? 0);
                              return (
                                <span
                                  title={`${cov.description} — ${cov.connected} wallet${cov.connected === 1 ? '' : 's'} connected${cov.estimated > 0 ? ` of ~${cov.estimated} estimated` : ''}. Higher coverage = more accurate circular flow.`}
                                  className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px]"
                                  style={{
                                    color: `hsl(var(--${cov.colorToken}))`,
                                    borderColor: `hsl(var(--${cov.colorToken}) / 0.4)`,
                                    backgroundColor: `hsl(var(--${cov.colorToken}) / 0.08)`,
                                  }}
                                >
                                  <Circle className="h-1.5 w-1.5 fill-current" aria-hidden />
                                  {cov.label}
                                </span>
                              );
                            })()}
                          </span>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 group-hover:text-score-amber transition-colors">
                            View <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            {!gated && hasMore && (
              <div className="flex justify-center mt-10">
                <Link to="/leaderboard">
                  <Button variant="outline" size="lg" className="rounded-full px-6 gap-2 border-foreground/20 hover:border-score-amber hover:text-score-amber">
                    View all economies <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            {gated && (
              <>
                {/* Bottom gradient fade so cards don't cut off harshly */}
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-[200px] z-[5]"
                  style={{ background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))' }}
                />
                {/* Centered modal overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[calc(100%-2rem)] max-w-xl">
                  <div className="rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-2xl">
                    <Zap className="h-7 w-7 text-score-amber mx-auto mb-3" fill="currentColor" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Join Bitcoin Circular</h3>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      Sign up to access the full leaderboard, compare economies, and track your Bitcoin circular economy.
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Link to="/login?signup=1">
                        <Button className="rounded-lg px-6 bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
                          Create free account
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button variant="outline" className="rounded-lg px-6 border-foreground/20">
                          Log in
                        </Button>
                      </Link>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-4">Free forever · No funds held · Ever</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* HOW THE DATA WORKS */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-16">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-4">
              <Database className="h-3 w-3" /> How the data works
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Honest about where the numbers come from.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              We collect data we&apos;re allowed to collect, show what we can verify, and label everything else clearly.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { Icon: CheckCircle2, title: 'Opt-in integrations', desc: 'Wallet sync (Blink) and merchant maps (BTCMap) are voluntary. Communities choose what to connect.' },
              { Icon: Users, title: 'Aggregate, not personal', desc: 'We surface ecosystem-level counts and trends. Individual transactions are never publicly displayed.' },
              { Icon: Globe, title: 'Ecosystem insight, not surveillance', desc: 'The goal is helping circular economies understand themselves — not tracking people.' },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="h-10 w-10 rounded-xl bg-score-amber/10 border border-score-amber/30 text-score-amber flex items-center justify-center mb-3">
                  <card.Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm mb-1.5">{card.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/methodology" className="inline-flex items-center gap-1 text-sm text-score-amber hover:underline">
              Read the full methodology <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRIVACY FIRST */}
      <section className="border-t border-border">
        <div className="container py-16">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-4">
              <Shield className="h-3 w-3" /> Privacy first
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Show what Bitcoin does. Never who does it.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Privacy isn&apos;t a feature we&apos;ll add later — it&apos;s the starting point.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { Icon: ShieldCheck, title: 'Built with consent', desc: 'Communities decide what to share and when.' },
              { Icon: Users, title: 'Community-controlled', desc: 'Each economy owns its own data and integrations.' },
              { Icon: EyeOff, title: 'Not surveillance', desc: 'Ecosystem activity only — never individual tracking.' },
              { Icon: Lock, title: 'Disconnect = deletion', desc: 'Leaving permanently removes the associated data.' },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="h-10 w-10 rounded-xl bg-score-green/10 border border-score-green/30 text-score-green flex items-center justify-center mb-3">
                  <card.Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm mb-1.5">{card.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/privacy" className="inline-flex items-center gap-1 text-sm text-score-green hover:underline">
              Read the full privacy philosophy <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY (collapsible) */}
      {list.length > 0 && <RecentActivityFeed />}

      {/* GLOBAL ECONOMIES MAP */}
      {list.length > 0 && <GlobalEconomiesMap economies={list as any} />}

      {/* WHAT IS CIRCULARITY */}
      {/* HOW IT WORKS — 3-STEP FLOW (landing only) */}
      {gated && (
      <section className="border-t border-border">
        <div className="container py-16">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-4">
              <Sparkles className="h-3 w-3" />
              How it works
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">From wallet to world stage in 3 steps</h2>
            <p className="text-sm text-muted-foreground mt-2">A repeatable, validator-backed process. No funds held. Ever.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { n: 1, icon: <Plus className="h-5 w-5" />, title: 'Register your economy', desc: 'Tell us your name, region, and contact. Takes 2 minutes.', chip: 'Free forever' },
              { n: 2, icon: <ShieldCheck className="h-5 w-5" />, title: 'Get validated', desc: '2 of 3 independent validators confirm real circular activity.', chip: 'Tamper-proof' },
              { n: 3, icon: <BarChart3 className="h-5 w-5" />, title: 'Track & share', desc: 'Live dashboard, public profile, embeddable widget, open CSV.', chip: 'Public proof' },
            ].map(s => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 hover:border-score-amber/40 transition-colors">
                <div className="absolute -top-3 left-6 h-7 w-7 rounded-full bg-score-amber text-background font-bold text-sm flex items-center justify-center">
                  {s.n}
                </div>
                <div className="h-10 w-10 rounded-xl bg-score-amber/10 border border-score-amber/30 text-score-amber flex items-center justify-center mb-4 mt-2">
                  {s.icon}
                </div>
                <div className="font-semibold text-base mb-1.5">{s.title}</div>
                <div className="text-sm text-muted-foreground mb-4">{s.desc}</div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-score-green" />
                  {s.chip}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* PILLARS (landing only) */}
      {gated && (
      <section className="border-t border-border bg-card/40">
        <div className="container py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">What makes an economy circular?</h2>
            <p className="text-sm text-muted-foreground mt-2">Five pillars. One score. Validator-verified.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {[
              { icon: <Repeat className="h-5 w-5" />, title: 'Retention', desc: 'Sats earned stay local.', weight: '20 pts' },
              { icon: <Zap className="h-5 w-5" />, title: 'Velocity', desc: 'How fast sats move between hands.', weight: '20 pts' },
              { icon: <TrendingUp className="h-5 w-5" />, title: 'Growth', desc: 'New merchants and earners onboarded.', weight: '20 pts' },
              { icon: <Layers className="h-5 w-5" />, title: 'Diversity', desc: 'Spread across categories and regions.', weight: '20 pts' },
              { icon: <ShieldCheck className="h-5 w-5" />, title: 'Resilience', desc: 'Activity sustained over time.', weight: '20 pts' },
            ].map(p => (
              <div key={p.title} className="relative rounded-2xl border border-border bg-card p-5 hover:border-score-amber/40 transition-colors">
                <span className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.weight}</span>
                <div className="h-10 w-10 rounded-xl bg-score-amber/10 border border-score-amber/30 text-score-amber flex items-center justify-center mb-3">
                  {p.icon}
                </div>
                <div className="font-semibold text-sm mb-1">{p.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/methodology" className="inline-flex items-center gap-1 text-sm text-score-amber hover:underline">
              Read the full methodology <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* FREE vs PRO DATA ACCESS */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="container py-20 md:py-28"
      >
        <div className={`grid grid-cols-1 ${gated ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-12 lg:gap-16 items-center max-w-6xl mx-auto`}>
          {/* Editorial Side */}
          <div className="lg:col-span-7 space-y-10 md:space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-8 bg-score-amber" />
                <p className="font-mono text-[11px] tracking-[0.4em] uppercase font-bold text-score-amber">
                  System.Access_Protocol
                </p>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground">
                Built for <span className="text-foreground">Bitcoiners.</span><br />
                <span className="text-muted-foreground">By Bitcoiners.</span>
              </h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="h-12 w-px bg-gradient-to-b from-score-amber to-transparent" />
              <p className="text-base md:text-xl text-muted-foreground font-medium">
                Open by default. <span className="text-muted-foreground/70">// Secured by design.</span>
              </p>
            </div>
          </div>

          {/* Data Card Side */}
          <div className="lg:col-span-5">
            <div className="relative group">
              {/* Glow */}
              <div className="absolute -inset-6 bg-score-amber/5 rounded-[3rem] blur-[80px] opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-out" />
              {/* Ghost layer */}
              <div className="absolute inset-0 bg-foreground/5 border border-border rounded-[2rem] -z-10 transition-transform duration-700 ease-out group-hover:translate-x-3 group-hover:translate-y-3" />

              {/* Main glass card */}
              <div className="relative bg-foreground/[0.03] border border-border rounded-[2rem] p-8 md:p-10 shadow-2xl backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 group-hover:border-score-amber/40">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.4em] mb-2 font-bold text-score-amber/80">Tier 01</p>
                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Public Data</h3>
                    <p className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest mt-2">Anyone with an account</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center backdrop-blur-xl">
                    <div className="w-2 h-2 rounded-full bg-score-amber animate-pulse" />
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-10 flex items-baseline gap-4">
                  <span className="text-6xl md:text-7xl font-black tracking-tighter text-foreground">$0</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[11px] font-bold tracking-widest text-score-amber">PERPETUAL</span>
                    <span className="font-mono text-[10px] font-bold text-foreground/20">FREE_ACCESS</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-10">
                  {['Live leaderboard & economy profiles', 'CSV snapshot download', 'Embeddable economy widget', 'Methodology + verified sources'].map(f => (
                    <li key={f} className="flex items-start gap-4 group/item">
                      <div className="flex-none mt-0.5 w-5 h-5 rounded-md border border-score-amber/40 bg-score-amber/5 flex items-center justify-center transition-transform group-hover/item:scale-110">
                        <Check className="h-3 w-3 text-score-amber" strokeWidth={3} />
                      </div>
                      <span className="text-sm md:text-base text-muted-foreground font-medium transition-colors group-hover/item:text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/data" className="group/btn relative flex items-center justify-center gap-3 w-full p-5 bg-foreground text-background font-bold rounded-2xl transition-all duration-300 hover:bg-score-amber active:scale-[0.98] overflow-hidden">
                  <span className="relative z-10">Explore data</span>
                  <ArrowRight className="h-5 w-5 relative z-10 transition-transform group-hover/btn:translate-x-1.5" />
                </Link>

                {gated && (
                  <Link to="/pricing" className="mt-3 flex items-center justify-center gap-2 w-full p-3 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-score-amber transition-colors">
                    Need full access? Request Pro <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* REGISTER YOUR ECONOMY CTA */}
      {!gated && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="container py-10"
        >
          <div className="relative overflow-hidden rounded-2xl border border-score-amber/30 bg-gradient-to-br from-score-amber/15 via-background to-background p-8 md:p-12">
            {/* Decorative pattern */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--score-amber) / 0.25) 1px, transparent 1px), radial-gradient(circle at 80% 70%, hsl(var(--score-amber) / 0.18) 1px, transparent 1px)',
                backgroundSize: '36px 36px, 28px 28px',
              }}
            />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-score-amber/40 bg-score-amber/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-score-amber mb-4">
                <Bitcoin className="h-3 w-3" />
                Add your economy
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                Is your Bitcoin economy missing from the map?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
                Join the verified economies already proving real circulation on-chain. Free, non-custodial, takes 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-full px-6 gap-2 h-12 bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
                    Register Your Economy <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/methodology" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-6 h-12 border-foreground/20 hover:border-score-amber hover:text-score-amber">
                    Learn how it works <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border bg-background">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <img src={circularLogo} alt="Circular" className="h-7 w-auto object-contain mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                The open standard for measuring Bitcoin circular economies.
              </p>
            </div>
            <FooterCol title="Platform" links={[['Leaderboard', '/leaderboard'], ['Compare', '/compare'], ['Explore', '/leaderboard']]} />
            <FooterCol title="Data" links={[['Methodology', '/methodology'], ['BTCMap data', 'https://btcmap.org'], ['Privacy', '/methodology']]} />
            <FooterCol title="Community" links={[['Register Economy', '/register'], ['Validate Data', '/validate'], ['Contact', 'mailto:hello@circular.app']]} />
          </div>
        </div>
      </footer>
    </div>
  );
};

const AnimatedStatPill = ({
  icon, label, value, suffix = '', loading, delay = 0,
}: { icon: React.ReactNode; label: string; value: number; suffix?: string; loading?: boolean; delay?: number }) => {
  const animated = useCountUp(value, 1400, !loading);
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 backdrop-blur-md px-3.5 py-1.5 text-xs"
    >
      <span className="text-score-amber">{icon}</span>
      <span className="font-mono font-semibold text-foreground tabular-nums">
        {loading ? '—' : `${animated.toLocaleString()}${suffix}`}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </motion.div>
  );
};

const MobileHeroStat = ({
  icon, label, value, suffix = '', loading,
}: { icon: React.ReactNode; label: string; value: number; suffix?: string; loading?: boolean }) => {
  const animated = useCountUp(value, 1400, !loading);
  return (
    <div className="rounded-lg border border-border bg-background/70 backdrop-blur-md px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono text-lg font-bold tabular-nums text-foreground">
        {loading ? '—' : `${animated.toLocaleString()}${suffix}`}
      </span>
    </div>
  );
};

const FooterCol = ({ title, links }: { title: string; links: [string, string][] }) => (
  <div>
    <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">{title}</div>
    <ul className="space-y-2">
      {links.map(([label, href]) => (
        <li key={label}>
          {href.startsWith('http') || href.startsWith('mailto') ? (
            <a href={href} className="text-sm text-muted-foreground hover:text-score-amber transition-colors">{label}</a>
          ) : (
            <Link to={href} className="text-sm text-muted-foreground hover:text-score-amber transition-colors">{label}</Link>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const TrustItem = ({ Icon, label }: { Icon: typeof Globe; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5 text-score-amber" />
    <span className="text-foreground/80">{label}</span>
  </span>
);

const Dot = () => <span className="text-border">·</span>;

export default Homepage;
