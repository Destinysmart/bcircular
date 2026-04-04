import { useParams } from 'react-router-dom';
import { Share2, Store, Users, Zap, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { mockCommunities, mockScoreHistory, mockActivity, formatSats, getFlagEmoji } from '@/lib/mock-data';

const CommunityDashboard = () => {
  const { slug } = useParams();
  const community = mockCommunities.find(c => c.slug === slug) || mockCommunities[0];

  const widgetCode = `<iframe src="${window.location.origin}/widget/${community.slug}" width="280" height="120" frameborder="0"></iframe>`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{getFlagEmoji(community.countryCode)}</span>
              <span>{community.city}, {community.country}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
            <p className="text-muted-foreground max-w-lg mb-4">{community.description}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
              <a href={`/c/${community.slug}/submit`}>
                <Button size="sm" className="gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Submit data
                </Button>
              </a>
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-4">
            <ScoreRing score={community.score} />
            <span className="text-xs text-muted-foreground">Last updated: Apr 1, 2026</span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8 p-4 rounded-lg border border-border bg-card">
          <ScoreBar label="Merchant density" value={85} />
          <ScoreBar label="Earner rate" value={72} />
          <ScoreBar label="Retention" value={91} />
          <ScoreBar label="Growth" value={68} />
          <ScoreBar label="Velocity" value={79} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Merchants" value={community.merchants} icon={<Store className="h-3.5 w-3.5" />} />
          <StatCard label="Earners" value={community.earners} icon={<Users className="h-3.5 w-3.5" />} />
          <StatCard label="Transactions" value={community.transactions.toLocaleString()} icon={<Zap className="h-3.5 w-3.5" />} />
          <StatCard label="Sats circular" value={formatSats(community.satsCircular)} icon={<Zap className="h-3.5 w-3.5" />} />
        </div>

        {/* Map placeholder */}
        <div className="rounded-lg border border-border bg-card overflow-hidden mb-8">
          <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">Merchant Map</div>
          <div className="h-[400px] bg-secondary/30 flex items-center justify-center text-muted-foreground text-sm">
            <span className="font-mono">Mapbox map — requires API key</span>
          </div>
        </div>

        {/* Growth chart + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Growth Timeline</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={mockScoreHistory}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line type="monotone" dataKey="merchants" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="earners" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Merchants</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Earners</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {mockActivity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-foreground">{a.description}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap ml-4">{a.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widget embed */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Embed Widget</h3>
          <p className="text-sm text-muted-foreground mb-3">Paste this on your website to show your community's circularity score.</p>
          <pre className="bg-secondary rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto">{widgetCode}</pre>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
