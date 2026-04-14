import { Link } from 'react-router-dom';
import { ArrowRight, Store, Users, Zap, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { getFlagEmoji, getScoreColor } from '@/lib/mock-data';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0, 1], delay: i * 0.1 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.4, 0, 1] } },
};

const Homepage = () => {
  const { data: communities, isLoading, isError, error } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  const list = communities || [];
  const topCommunities = [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
  const totalMerchants = list.reduce((s, c) => s + (c.merchants ?? 0), 0);
  const totalSats = list.reduce((s, c) => s + (c.satsCircular ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="container pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-2xl">
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="text-4xl md:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight mb-6"
          >
            Measure the Bitcoin
            <br />
            circular economy.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-10"
          >
            Real-time intelligence for Bitcoin communities. Track merchants, earners, and sats flow — powered by live wallet data.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="flex flex-wrap gap-3"
          >
            <Link to="/register">
              <Button size="lg" className="rounded-full px-6 gap-2 h-12">
                Register your economy
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="outline" size="lg" className="rounded-full px-6 h-12">
                Explore economies
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats row */}
      <section className="border-t border-border">
        <div className="container py-12">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Loading…</div>
          ) : isError ? (
            <div className="text-center py-4 text-destructive text-sm">Error: {(error as Error).message}</div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden"
            >
              {[
                { label: 'Economies tracked', value: list.length, icon: <Users className="h-4 w-4" /> },
                { label: 'Merchants accepting BTC', value: totalMerchants, icon: <Store className="h-4 w-4" /> },
                { label: 'Sats in circular flow', value: totalSats > 0 ? `${(totalSats / 1_000_000).toFixed(0)}M` : '0', icon: <Zap className="h-4 w-4" /> },
              ].map(stat => (
                <motion.div key={stat.label} variants={scaleIn} className="bg-card p-8">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-3">
                    {stat.icon}
                    {stat.label}
                  </div>
                  <div className="font-mono text-3xl font-semibold text-foreground">{stat.value}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Top economies */}
      <section className="container pb-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={0}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="text-xl font-semibold">Top Economies</h2>
          <Link to="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-2">No circular economies registered yet.</p>
            <Link to="/register" className="text-primary hover:underline text-sm">Be the first →</Link>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="space-y-2"
          >
            {topCommunities.map((c, i) => (
              <motion.div key={c.id || i} variants={fadeUp} custom={i}>
                <Link
                  to={`/c/${c.slug}`}
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-secondary/60 transition-colors"
                >
                  <span className="font-mono text-sm text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{getFlagEmoji(c.country_code || '')}</span>
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="text-muted-foreground text-sm hidden sm:inline">{c.city}, {c.country}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{c.merchants} merchants</span>
                    <span className={`font-mono font-semibold text-lg ${getScoreColor(c.score ?? 0)}`}>
                      {c.score ?? 0}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-secondary/30">
        <div className="container py-20">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            className="text-xl font-semibold mb-12 text-center"
          >
            How it works
          </motion.h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-3xl mx-auto"
          >
            {[
              { step: '01', title: 'Connect', desc: 'Link your Blink wallet. Transactions sync automatically — no manual entry needed.' },
              { step: '02', title: 'Validate', desc: 'Community validators verify merchants and earners with a consensus model.' },
              { step: '03', title: 'Score', desc: 'Data powers a circularity score from 0–100 based on retention, velocity, and growth.' },
            ].map(s => (
              <motion.div key={s.step} variants={fadeUp} className="text-center md:text-left">
                <div className="font-mono text-primary text-sm font-medium mb-3">{s.step}</div>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[10px]">C</span>
            </div>
            <span>Circular — Bitcoin Circular Economy Tracker</span>
          </div>
          <span>No funds held. Ever.</span>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
