import { Link } from 'react-router-dom';
import { ArrowRight, Bitcoin, Store, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import StatCard from '@/components/StatCard';
import { mockCommunities, getFlagEmoji, getScoreColor } from '@/lib/mock-data';

const Homepage = () => {
  const topCommunities = [...mockCommunities].sort((a, b) => b.score - a.score).slice(0, 5);
  const totalMerchants = mockCommunities.reduce((s, c) => s + c.merchants, 0);
  const totalSats = mockCommunities.reduce((s, c) => s + c.satsCircular, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-primary text-sm font-mono mb-4">
              <Bitcoin className="h-4 w-4" />
              <span>CIRCULAR ECONOMY TRACKER</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Measure the Bitcoin<br />
              <span className="text-primary">circular economy.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              Communities submit merchants, earners, and transactions. Validators verify. 
              Data powers a credibility score. No funds held. Ever.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Register your community <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="outline" size="lg">Explore communities</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global stats */}
      <section className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Communities tracked" value={mockCommunities.length} icon={<Users className="h-3.5 w-3.5" />} />
          <StatCard label="Merchants accepting BTC" value={totalMerchants} icon={<Store className="h-3.5 w-3.5" />} />
          <StatCard label="Sats in circular flow" value={`${(totalSats / 1_000_000).toFixed(0)}M`} icon={<Zap className="h-3.5 w-3.5" />} />
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="container pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Top Communities</h2>
          <Link to="/leaderboard" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3 w-12">#</th>
                <th className="text-left p-3">Community</th>
                <th className="text-right p-3 hidden md:table-cell">Merchants</th>
                <th className="text-right p-3">Score</th>
                <th className="text-right p-3 hidden sm:table-cell">Change</th>
              </tr>
            </thead>
            <tbody>
              {topCommunities.map((c, i) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-card/50 transition-colors">
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <Link to={`/c/${c.slug}`} className="hover:text-primary transition-colors">
                      <span className="mr-2">{getFlagEmoji(c.countryCode)}</span>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-sm ml-2 hidden sm:inline">{c.city}, {c.country}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-right font-mono hidden md:table-cell">{c.merchants}</td>
                  <td className={`p-3 text-right font-mono font-medium ${getScoreColor(c.score)}`}>{c.score}</td>
                  <td className="p-3 text-right font-mono hidden sm:table-cell">
                    <span className={c.weeklyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {c.weeklyChange >= 0 ? '↑' : '↓'}{Math.abs(c.weeklyChange)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-16">
          <h2 className="text-xl font-semibold mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Submit', desc: 'Anyone submits merchants, earners, or transactions in their community. No login required.' },
              { step: '02', title: 'Validate', desc: 'Community validators review and approve submissions using a 2-of-3 consensus model.' },
              { step: '03', title: 'Score', desc: 'Approved data generates a circularity score from 0–100, updated weekly.' },
            ].map(s => (
              <div key={s.step} className="space-y-3">
                <div className="font-mono text-primary text-sm">{s.step}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-primary" />
            <span>Circular — Bitcoin Circular Economy Tracker</span>
          </div>
          <span>No funds held. Ever.</span>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
