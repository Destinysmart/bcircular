import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowRight, Store, Zap, Globe, Sparkles, TrendingUp, Star, Repeat, BarChart3, MapPin, CheckCircle2, ShieldCheck, Bitcoin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import GlobalEconomiesMap from '@/components/GlobalEconomiesMap';
import RecentActivityFeed from '@/components/RecentActivityFeed';
import { useCountUp } from '@/hooks/useCountUp';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { getFlagEmoji } from '@/lib/mock-data';
import circularLogo from '@/assets/circular-logo.png';
import heroImage from '@/assets/hero-image.jpg';

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
  { id: 'featured', label: 'Featured', icon: '⭐' },
  { id: 'africa', label: 'Africa', icon: '🌍' },
  { id: 'latam', label: 'Latin America', icon: '🌎' },
  { id: 'europe', label: 'Europe', icon: '🇪🇺' },
  { id: 'asia', label: 'Asia', icon: '🌏' },
  { id: 'high', label: 'High Score', icon: '📈' },
  { id: 'growing', label: 'Fast Growing', icon: '🚀' },
  { id: 'new', label: 'New', icon: '🆕' },
] as const;

type FilterId = typeof FILTERS[number]['id'];

const HERO_IMAGE = heroImage;

const Homepage = ({ topSlot, hideHero = false, compactHero = false, gated = false }: { topSlot?: React.ReactNode; hideHero?: boolean; compactHero?: boolean; gated?: boolean } = {}) => {
  const [filter, setFilter] = useState<FilterId>('featured');
  const { data, isLoading } = useQuery({ queryKey: ['communities-stats'], queryFn: fetchAllCommunitiesWithStats });
  const list: Economy[] = data || [];
  const heroHeight = compactHero ? 320 : 520;
  const heroHeightMobile = compactHero ? 260 : 460;

  const totalMerchants = list.reduce((s, c) => s + (c.merchants ?? 0), 0);
  const totalMonthlyTxns = list.reduce((s, c) => s + ((c as any).monthlyTransactions ?? 0), 0);
  const avgActivity = list.length > 0
    ? Math.round(list.reduce((s, c) => s + ((c as any).activityRate ?? 0), 0) / list.length)
    : 0;
  const countries = new Set(list.map(c => c.country).filter(Boolean)).size;

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
      <Navbar />

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
          <div className="container relative h-full flex items-center pt-8 pb-24 md:py-0">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border border-score-amber/40 bg-score-amber/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-score-amber mb-6">
                <Sparkles className="h-3 w-3" />
                Bitcoin Circular Economy
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className={`${compactHero ? 'text-2xl sm:text-3xl md:text-4xl mb-3' : 'text-4xl sm:text-5xl md:text-6xl mb-4 md:mb-5'} font-extrabold tracking-tight leading-[1.05] text-foreground`}>
                See where Bitcoin
                <br />
                <span className="text-score-amber">actually circulates.</span>
              </motion.h1>
              {!compactHero && (
                <motion.p variants={fadeUp} custom={2} className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed mb-6 md:mb-8">
                  Track, measure and compare Bitcoin circular economies worldwide. Real data from real communities. No funds held. Ever.
                </motion.p>
              )}
              {!compactHero && (
                <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
                  <Link to="/leaderboard" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto rounded-full px-6 gap-2 h-12 bg-score-amber text-background hover:bg-score-amber/90">
                      Explore Economies <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/leaderboard" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-6 h-12 border-foreground/20 hover:bg-foreground/5">
                      View Leaderboard
                    </Button>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Stat pills floating at bottom of hero */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="absolute left-0 right-0 bottom-6 container"
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
            </div>
          </motion.div>
        </div>
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
                  <span aria-hidden>{f.icon}</span>
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
          <div className="relative">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className={`grid grid-cols-1 sm:grid-cols-2 ${gated ? '' : 'lg:grid-cols-3'} gap-6 ${gated ? 'pointer-events-none select-none opacity-60 blur-[6px]' : ''}`}
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
                      to={gated ? '#' : `/c/${e.slug}`}
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
                          <span className="text-[11px] text-muted-foreground">
                            Circularity <span className="font-mono font-semibold text-score-amber">{score}</span><span className="text-muted-foreground">/100</span>
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
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-md px-8 py-8 text-center max-w-md w-[90%] shadow-2xl">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Join to explore all circular economies</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Track Bitcoin adoption worldwide.<br />Free to join. No funds held. Ever.
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
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY (collapsible) */}
      {!gated && list.length > 0 && <RecentActivityFeed />}

      {/* GLOBAL ECONOMIES MAP */}
      {!gated && list.length > 0 && <GlobalEconomiesMap economies={list as any} />}

      {/* WHAT IS CIRCULARITY */}
      <section className="border-t border-border bg-card/40">
        <div className="container py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">What makes an economy circular?</h2>
            <p className="text-sm text-muted-foreground mt-2">Five pillars. One score. Zero guesswork.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: <Repeat className="h-5 w-5" />, title: 'Retention', desc: 'Sats earned stay local.' },
              { icon: <Zap className="h-5 w-5" />, title: 'Velocity', desc: 'How fast sats move.' },
              { icon: <TrendingUp className="h-5 w-5" />, title: 'Growth', desc: 'New merchant adoption.' },
            ].map(p => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-6 hover:border-score-amber/40 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-score-amber/10 border border-score-amber/30 text-score-amber flex items-center justify-center mb-4">
                  {p.icon}
                </div>
                <div className="font-semibold text-base mb-1">{p.title}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
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
                Add your community
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                Is your Bitcoin community missing?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
                Join the global network of circular economies. Track your sats flow and prove real adoption.
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

      {/* TRUST / SOCIAL PROOF BAR */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <a
              href="https://btcmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <MapPin className="h-4 w-4 text-score-amber" />
              <span>
                Verified merchant data from <span className="font-semibold text-foreground group-hover:text-score-amber transition-colors">BTCMap</span>
              </span>
            </a>
            <div className="flex items-center justify-center gap-2.5 px-4 py-3 text-xs text-muted-foreground">
              <Bitcoin className="h-4 w-4 text-score-amber" />
              <span>Built on Bitcoin. <span className="text-foreground font-medium">No custodial risk.</span> Ever.</span>
            </div>
            <Link
              to="/methodology"
              className="flex items-center justify-center gap-2.5 px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ShieldCheck className="h-4 w-4 text-score-amber" />
              <span>
                <span className="font-semibold text-foreground group-hover:text-score-amber transition-colors">Open data.</span> Transparent methodology.
              </span>
            </Link>
          </div>
        </div>
      </section>

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
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Built with ⚡ by the Bitcoin community · Open source</span>
            <span>No funds held. Ever.</span>
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

export default Homepage;
