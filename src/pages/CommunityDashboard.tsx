import { useParams } from 'react-router-dom';
import { Share2, Store, Users, Zap, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import StatCard from '@/components/StatCard';
import MerchantMap from '@/components/MerchantMap';
import { Button } from '@/components/ui/button';
import { fetchCommunityBySlug, fetchCommunityMerchants, fetchCommunityEarners, fetchCommunityTransactions, fetchLatestScore, fetchScoreHistory } from '@/lib/api';
import { mockCommunities, mockScoreHistory, mockActivity, formatSats, getFlagEmoji } from '@/lib/mock-data';

const CommunityDashboard = () => {
  const { slug } = useParams();

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const communityId = community?.id;

  const { data: merchants } = useQuery({
    queryKey: ['merchants', communityId],
    queryFn: () => fetchCommunityMerchants(communityId!),
    enabled: !!communityId,
  });

  const { data: earners } = useQuery({
    queryKey: ['earners', communityId],
    queryFn: () => fetchCommunityEarners(communityId!),
    enabled: !!communityId,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', communityId],
    queryFn: () => fetchCommunityTransactions(communityId!),
    enabled: !!communityId,
  });

  const { data: latestScore } = useQuery({
    queryKey: ['score', communityId],
    queryFn: () => fetchLatestScore(communityId!),
    enabled: !!communityId,
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ['score-history', communityId],
    queryFn: () => fetchScoreHistory(communityId!),
    enabled: !!communityId,
  });

  // Fallback to mock data if no DB community found
  const mockCommunity = mockCommunities.find(c => c.slug === slug) || mockCommunities[0];
  const isUsingMock = !community;

  const displayName = community?.name || mockCommunity.name;
  const displayCountryCode = community?.country_code || mockCommunity.countryCode;
  const displayCity = community?.city || mockCommunity.city;
  const displayCountry = community?.country || mockCommunity.country;
  const displayDesc = community?.description || mockCommunity.description;
  const displayScore = latestScore?.score ?? mockCommunity.score;
  const displayMerchants = merchants?.length ?? mockCommunity.merchants;
  const displayEarners = earners?.length ?? mockCommunity.earners;
  const displayTx = transactions?.length ?? mockCommunity.transactions;
  const circularSats = transactions
    ? transactions.filter(t => t.is_circular).reduce((s, t) => s + Number(t.amount_sats), 0)
    : mockCommunity.satsCircular;

  const chartData = (scoreHistory && scoreHistory.length > 0)
    ? scoreHistory.map(s => ({ date: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short', year: '2-digit' }), score: s.score, merchants: s.merchant_density_score, earners: s.earner_rate_score }))
    : mockScoreHistory;

  const activity = mockActivity; // Activity feed stays mock for now

  const widgetCode = `<iframe src="${window.location.origin}/widget/${slug}" width="280" height="120" frameborder="0"></iframe>`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{getFlagEmoji(displayCountryCode)}</span>
              <span>{displayCity}, {displayCountry}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <p className="text-muted-foreground max-w-lg mb-4">{displayDesc}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              <a href={`/c/${slug}/submit`}><Button size="sm" className="gap-1.5"><ArrowUpRight className="h-3.5 w-3.5" /> Submit data</Button></a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <ScoreRing score={displayScore} />
            <span className="text-xs text-muted-foreground">
              {latestScore ? `Last updated: ${new Date(latestScore.calculated_at).toLocaleDateString()}` : 'Last updated: Apr 1, 2026'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-8 p-4 rounded-lg border border-border bg-card">
          <ScoreBar label="Merchant density" value={latestScore?.merchant_density_score ?? 85} />
          <ScoreBar label="Earner rate" value={latestScore?.earner_rate_score ?? 72} />
          <ScoreBar label="Retention" value={latestScore?.retention_score ?? 91} />
          <ScoreBar label="Growth" value={latestScore?.growth_score ?? 68} />
          <ScoreBar label="Velocity" value={latestScore?.velocity_score ?? 79} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Merchants" value={displayMerchants} icon={<Store className="h-3.5 w-3.5" />} />
          <StatCard label="Earners" value={displayEarners} icon={<Users className="h-3.5 w-3.5" />} />
          <StatCard label="Transactions" value={displayTx.toLocaleString()} icon={<Zap className="h-3.5 w-3.5" />} />
          <StatCard label="Sats circular" value={formatSats(circularSats)} icon={<Zap className="h-3.5 w-3.5" />} />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden mb-8">
          <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">Merchant Map</div>
          <MerchantMap merchants={merchants || []} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Growth Timeline</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} />
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
              {activity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start justify-between text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-foreground">{a.description}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap ml-4">{a.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
