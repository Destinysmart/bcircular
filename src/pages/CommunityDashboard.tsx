import { useParams, Link } from 'react-router-dom';
import { Share2, Store, Users, Zap, ArrowUpRight, ChevronDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import StatCard from '@/components/StatCard';
import MerchantMap from '@/components/MerchantMap';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fetchCommunityBySlug, fetchCommunityMerchants, fetchCommunityEarners, fetchCommunityTransactions, fetchLatestScore, fetchScoreHistory } from '@/lib/api';
import { mockCommunities, mockScoreHistory, mockActivity, formatSats, getFlagEmoji } from '@/lib/mock-data';

const pillarDescriptions: Record<string, string> = {
  'Merchant saturation': 'How many merchants accept Bitcoin relative to community size, with a bonus for category diversity.',
  'Earner penetration': 'What fraction of the community earns in Bitcoin — freelancers, vendors, employees.',
  'Retention': 'What percentage of transactions stay circular within the community.',
  'Growth': 'Rate of new merchants and earners joining in the past 30 days.',
  'Velocity': 'How actively earners are transacting within the local economy.',
};

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

  const mockCommunity = mockCommunities.find(c => c.slug === slug) || mockCommunities[0];

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

  const totalApproved = (merchants?.length || 0) + (earners?.length || 0) + (transactions?.length || 0);

  const chartData = (scoreHistory && scoreHistory.length > 0)
    ? scoreHistory.slice(-12).map(s => ({ date: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }), score: s.score }))
    : mockScoreHistory.map(s => ({ date: s.date, score: s.score }));

  const activity = mockActivity;

  const widgetCode = `<iframe src="${window.location.origin}/widget/${slug}" width="280" height="120" frameborder="0"></iframe>`;

  const pillars = [
    { label: 'Merchant saturation', value: latestScore?.merchant_density_score ?? 85 },
    { label: 'Retention', value: latestScore?.retention_score ?? 91 },
    { label: 'Earner penetration', value: latestScore?.earner_rate_score ?? 72 },
    { label: 'Velocity', value: latestScore?.velocity_score ?? 79 },
    { label: 'Growth', value: latestScore?.growth_score ?? 68 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{getFlagEmoji(displayCountryCode)}</span>
              <span>{displayCity}, {displayCountry}</span>
              <ConfidenceBadge totalApproved={totalApproved} />
            </div>
            <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
            <p className="text-muted-foreground max-w-lg mb-4">{displayDesc}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              <a href={`/c/${slug}/submit`}><Button size="sm" className="gap-1.5"><ArrowUpRight className="h-3.5 w-3.5" /> Submit data</Button></a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={displayScore} />
            <span className="text-xs text-muted-foreground">
              {latestScore ? `Last calculated: ${new Date(latestScore.calculated_at).toLocaleDateString()}` : 'Last calculated: —'}
            </span>
          </div>
        </div>

        {/* Five pillar scores */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4 p-4 rounded-lg border border-border bg-card">
          {pillars.map(p => (
            <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />
          ))}
        </div>

        {/* Expandable methodology */}
        <Collapsible className="mb-8">
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Info className="h-3 w-3" />
            How this score is calculated
            <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 rounded-lg border border-border bg-card p-4 space-y-3">
            {pillars.map(p => (
              <div key={p.label} className="text-sm">
                <span className="font-medium text-foreground">{p.label}</span>
                <span className="text-muted-foreground ml-2">{pillarDescriptions[p.label]}</span>
              </div>
            ))}
            <Link to="/methodology" className="text-xs text-primary hover:underline inline-block mt-2">
              Read full methodology →
            </Link>
          </CollapsibleContent>
        </Collapsible>

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
          {/* Score history chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Score History (last 12 snapshots)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} />
                <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
