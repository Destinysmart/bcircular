import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Scale } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { getFlagEmoji, getScoreColor, getScoreBgColor } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';

const regions = ['All', 'Africa', 'Latin America', 'Europe', 'Asia'];

const scoreBorderColor = (score: number) => {
  if (score > 75) return 'border-l-score-green';
  if (score >= 50) return 'border-l-score-amber';
  return 'border-l-score-red';
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('All');
  const [sortBy, setSortBy] = useState<'score' | 'merchants'>('score');

  const { data: communities, isLoading, isError, error } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  const list = (communities || []).map(c => ({
    ...c,
    countryCode: c.country_code,
    weeklyChange: c.weeklyChange ?? 0,
    totalApproved: c.totalApproved ?? 0,
  }));

  const filtered = list
    .filter(c => region === 'All' || c.region === region)
    .sort((a, b) => sortBy === 'score' ? (b.score ?? 0) - (a.score ?? 0) : (b.merchants ?? 0) - (a.merchants ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="mb-6 rounded-xl border border-score-amber/30 bg-foreground px-5 py-4 font-mono text-sm font-semibold text-score-amber shadow-[0_0_24px_hsl(var(--score-amber)/0.10)]">
          🌍 {list.length} Bitcoin circular economies tracked globally
        </div>
        <h1 className="text-2xl font-bold mb-1">Global Leaderboard</h1>
        <p className="text-sm text-muted-foreground mb-8">Ranked by circularity score across all tracked economies.</p>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          {regions.map(r => (
            <Button
              key={r}
              variant={region === r ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setRegion(r)}
            >
              {r}
            </Button>
          ))}
          <div className="ml-auto flex gap-1">
            <Link to="/compare">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5"><Scale className="h-3.5 w-3.5" /> Compare economies</Button>
            </Link>
            <Button variant={sortBy === 'score' ? 'secondary' : 'ghost'} size="sm" className="rounded-full" onClick={() => setSortBy('score')}>By Score</Button>
            <Button variant={sortBy === 'merchants' ? 'secondary' : 'ghost'} size="sm" className="rounded-full" onClick={() => setSortBy('merchants')}>By Merchants</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Loading…</div>
        ) : isError ? (
          <div className="text-center py-20 text-destructive text-sm">Error: {(error as Error).message}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-2">No circular economies registered yet.</p>
            <Link to="/register" className="text-primary hover:underline text-sm">Be the first →</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((c, i) => (
              <div
                key={c.id || i}
                onClick={() => navigate(`/c/${c.slug}`)}
                className={`group flex items-center gap-4 rounded-xl border-l-4 ${scoreBorderColor(c.score ?? 0)} p-4 transition-all hover:bg-secondary/60 hover:shadow-[0_0_24px_hsl(var(--score-amber)/0.12)]`}
              >
                <span className="font-mono text-sm text-muted-foreground w-8 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFlagEmoji(c.countryCode || '')}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs hidden md:inline">{c.city}, {c.country}</span>
                    <ConfidenceBadge totalApproved={c.totalApproved} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
                    <span>{c.merchants} merchants</span>
                    <span>{c.earners} earners</span>
                  </div>
                  <div className="w-20 hidden md:block">
                    <div className="h-1.5 rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${getScoreBgColor(c.score ?? 0)}`} style={{ width: `${c.score ?? 0}%` }} />
                    </div>
                  </div>
                  <span className={`font-mono text-2xl font-extrabold w-12 text-right ${getScoreColor(c.score ?? 0)}`}>
                    {c.score ?? 0}
                  </span>
                  <div className="hidden sm:block w-12 text-right">
                    <span className={`font-mono text-xs ${(c.weeklyChange ?? 0) >= 0 ? 'text-score-green' : 'text-score-red'}`}>
                      {(c.weeklyChange ?? 0) >= 0 ? '↑' : '↓'}{Math.abs(c.weeklyChange ?? 0)}
                    </span>
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
  );
};

export default Leaderboard;
