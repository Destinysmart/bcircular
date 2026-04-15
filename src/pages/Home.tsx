import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Globe, MapPin, Plus, Repeat, Search, Shield, Store, TrendingUp, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { getFlagEmoji, getScoreColor } from '@/lib/mock-data';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0, 1] as [number, number, number, number], delay: i * 0.06 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const Home = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  // All economies
  const { data: communities, isLoading } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  // User's administered economies
  const { data: myEconomies } = useQuery({
    queryKey: ['my-economies', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .eq('admin_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // User's validator roles
  const { data: myValidatorRoles } = useQuery({
    queryKey: ['my-validator-roles', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('validators')
        .select('community_id, communities(name, slug)')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const list = communities || [];
  const regions = useMemo(() => {
    const r = new Set(list.map(c => c.region).filter(Boolean));
    return ['all', ...Array.from(r).sort()];
  }, [list]);

  const filtered = useMemo(() => {
    let result = list;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      );
    }
    if (regionFilter !== 'all') {
      result = result.filter(c => c.region === regionFilter);
    }
    return result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [list, search, regionFilter]);

  const totalMerchants = list.reduce((s, c) => s + (c.merchants ?? 0), 0);
  const totalSats = list.reduce((s, c) => s + (c.satsCircular ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Quick actions */}
      <section className="container pt-8 pb-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Manage your economies and discover new ones.</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8"
        >
          {/* My economies */}
          {(myEconomies || []).map((eco, i) => (
            <motion.div key={eco.id} variants={fadeUp} custom={i}>
              <Link
                to={`/dashboard/economy/${eco.id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{eco.name}</div>
                  <div className="text-xs text-muted-foreground">{eco.city}, {eco.country}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{eco.status}</span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}

          {/* Validator roles */}
          {(myValidatorRoles || []).map((v: any, i: number) => (
            <motion.div key={v.community_id} variants={fadeUp} custom={(myEconomies?.length || 0) + i}>
              <Link
                to="/validate"
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">Validator — {v.communities?.name}</div>
                  <div className="text-xs text-muted-foreground">Review pending submissions</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}

          {/* Register new */}
          <motion.div variants={fadeUp} custom={(myEconomies?.length || 0) + (myValidatorRoles?.length || 0)}>
            <Link
              to="/register"
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors group h-full"
            >
              <div className="h-9 w-9 rounded-lg border border-border flex items-center justify-center shrink-0 group-hover:border-primary/40 transition-colors">
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Register new economy</div>
                <div className="text-xs text-muted-foreground">Add your Bitcoin circular economy</div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-secondary/20">
        <div className="container py-6">
          <div className="flex flex-wrap gap-8">
            {[
              { label: 'Economies', value: list.length, icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Merchants', value: totalMerchants, icon: <Store className="h-3.5 w-3.5" /> },
              { label: 'Sats circulating', value: totalSats > 0 ? `${(totalSats / 1_000_000).toFixed(1)}M` : '0', icon: <Zap className="h-3.5 w-3.5" /> },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-muted-foreground">{s.icon}</span>
                <span className="font-mono text-lg font-semibold text-foreground">{s.value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directory */}
      <section className="container py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold">Discover economies</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or country…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {regions.length > 2 && (
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {regions.map(r => (
                  <option key={r} value={r}>{r === 'all' ? 'All regions' : r}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading economies…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-2">{search || regionFilter !== 'all' ? 'No economies match your search.' : 'No circular economies registered yet.'}</p>
            {!search && regionFilter === 'all' && (
              <Link to="/register" className="text-primary hover:underline text-sm">Be the first →</Link>
            )}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filtered.map((c, i) => (
              <motion.div key={c.id} variants={fadeUp} custom={i % 6}>
                <Link
                  to={`/c/${c.slug}`}
                  className="group block p-5 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{getFlagEmoji(c.country_code || '')}</span>
                      <h3 className="font-medium text-sm truncate">{c.name}</h3>
                    </div>
                    <span className={`font-mono text-lg font-semibold ${getScoreColor(c.score ?? 0)}`}>
                      {c.score ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <MapPin className="h-3 w-3" />
                    <span>{c.city}, {c.country}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Store className="h-3 w-3" />{c.merchants} merchants</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.earners} earners</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* What is circularity? */}
      <section className="border-t border-border bg-secondary/20">
        <div className="container py-16">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} className="max-w-2xl mx-auto text-center mb-10">
            <h2 className="text-xl font-semibold mb-3">What is circularity?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A circular Bitcoin economy is one where sats earned locally are also spent locally — creating a self-sustaining loop of value. The more sats stay within the community, the stronger the economy becomes.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {[
              { icon: <Repeat className="h-5 w-5" />, title: 'Retention', desc: 'Sats that stay within the economy instead of leaking out to external wallets.' },
              { icon: <TrendingUp className="h-5 w-5" />, title: 'Velocity', desc: 'How many times each sat changes hands — higher velocity means a healthier economy.' },
              { icon: <Users className="h-5 w-5" />, title: 'Growth', desc: 'New merchants accepting Bitcoin and new earners joining the circular flow.' },
            ].map(item => (
              <motion.div key={item.title} variants={fadeUp} className="text-center p-5 rounded-xl border border-border bg-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} className="text-center mt-8">
            <Link to="/methodology" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <BookOpen className="h-3.5 w-3.5" />
              Read the full methodology
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
