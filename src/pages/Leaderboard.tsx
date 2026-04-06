import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { fetchAllCommunitiesWithStats } from '@/lib/api';
import { mockCommunities, getFlagEmoji, getScoreColor, getScoreBgColor } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';

const regions = ['All', 'Africa', 'Latin America', 'Europe', 'Asia'];

const Leaderboard = () => {
  const [region, setRegion] = useState('All');
  const [sortBy, setSortBy] = useState<'score' | 'merchants'>('score');

  const { data: dbCommunities } = useQuery({
    queryKey: ['communities-stats'],
    queryFn: fetchAllCommunitiesWithStats,
  });

  const communities = (dbCommunities && dbCommunities.length > 0)
    ? dbCommunities.map(c => ({
        ...c,
        countryCode: c.country_code,
        weeklyChange: c.weeklyChange ?? 0,
        totalApproved: c.totalApproved ?? 0,
      }))
    : mockCommunities.map(c => ({ ...c, totalApproved: c.merchants + c.earners + c.transactions }));

  const filtered = communities
    .filter(c => region === 'All' || c.region === region)
    .sort((a, b) => sortBy === 'score' ? (b.score ?? 0) - (a.score ?? 0) : (b.merchants ?? 0) - (a.merchants ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-1">Global Leaderboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Ranked by circularity score across all tracked economies.</p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {regions.map(r => (
            <Button key={r} variant={region === r ? 'default' : 'outline'} size="sm" onClick={() => setRegion(r)}>{r}</Button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button variant={sortBy === 'score' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('score')}>By Score</Button>
            <Button variant={sortBy === 'merchants' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('merchants')}>By Merchants</Button>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3 w-12">#</th>
                <th className="text-left p-3">Economy</th>
                <th className="text-right p-3 hidden sm:table-cell">Merchants</th>
                <th className="text-right p-3 hidden sm:table-cell">Earners</th>
                <th className="p-3 w-32 hidden md:table-cell">Score</th>
                <th className="text-right p-3 font-mono">Score</th>
                <th className="p-3 hidden lg:table-cell">Confidence</th>
                <th className="text-right p-3 hidden sm:table-cell">Δ Week</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id || i} className="border-b border-border last:border-0 hover:bg-card/50 transition-colors">
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <Link to={`/c/${c.slug}`} className="hover:text-primary transition-colors">
                      <span className="mr-2">{getFlagEmoji(c.countryCode || '')}</span>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs ml-2 hidden md:inline">{c.city}, {c.country}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-right font-mono hidden sm:table-cell">{c.merchants}</td>
                  <td className="p-3 text-right font-mono hidden sm:table-cell">{c.earners}</td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="h-2 rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${getScoreBgColor(c.score ?? 0)}`} style={{ width: `${c.score ?? 0}%` }} />
                    </div>
                  </td>
                  <td className={`p-3 text-right font-mono font-medium ${getScoreColor(c.score ?? 0)}`}>{c.score ?? 0}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <ConfidenceBadge totalApproved={c.totalApproved} />
                  </td>
                  <td className="p-3 text-right font-mono hidden sm:table-cell">
                    <span className={(c.weeklyChange ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {(c.weeklyChange ?? 0) >= 0 ? '↑' : '↓'}{Math.abs(c.weeklyChange ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
