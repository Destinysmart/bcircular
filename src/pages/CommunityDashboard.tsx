import { useParams, Link } from 'react-router-dom';
import { Share2, Store, Users, Zap, ArrowUpRight, ChevronDown, Info, ExternalLink } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { formatSats, getFlagEmoji } from '@/lib/mock-data';

const pillarDescriptions: Record<string, string> = {
  'Merchant saturation': 'How many merchants accept Bitcoin relative to the economy size, with a bonus for category diversity.',
  'Earner penetration': 'What fraction of the economy earns in Bitcoin — freelancers, vendors, employees.',
  'Retention': 'What percentage of transactions stay circular within the economy.',
  'Growth': 'Rate of new merchants and earners joining in the past 30 days.',
  'Velocity': 'How actively earners are transacting within the local economy.',
};

const CommunityDashboard = () => {
  const { slug } = useParams();

  const { data: community, isLoading, isError, error } = useQuery({
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

  const { data: profile } = useQuery({
    queryKey: ['community-profile', communityId],
    queryFn: async () => {
      const { data } = await supabase.from('community_profiles').select('*').eq('community_id', communityId!).maybeSingle();
      return data;
    },
    enabled: !!communityId,
  });

  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile', community?.admin_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', community!.admin_id!).single();
      return data;
    },
    enabled: !!community?.admin_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isError || !community) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Economy not found</h2>
          <p className="text-muted-foreground text-sm mb-4">{isError ? (error as Error).message : `No economy found for "${slug}".`}</p>
          <Link to="/leaderboard"><Button variant="outline">Back to leaderboard</Button></Link>
        </div>
      </div>
    );
  }

  const displayScore = latestScore?.score ?? 0;
  const displayMerchants = merchants?.length ?? 0;
  const displayEarners = earners?.length ?? 0;
  const displayTx = transactions?.length ?? 0;
  const circularSats = transactions
    ? transactions.filter(t => t.is_circular).reduce((s, t) => s + Number(t.amount_sats), 0)
    : 0;

  const totalApproved = displayMerchants + displayEarners + displayTx;

  const chartData = (scoreHistory && scoreHistory.length > 0)
    ? scoreHistory.slice(-12).map(s => ({ date: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }), score: s.score }))
    : [];

  const widgetCode = `<iframe src="${window.location.origin}/widget/${slug}" width="280" height="120" frameborder="0"></iframe>`;

  const pillars = [
    { label: 'Merchant saturation', value: latestScore?.merchant_density_score ?? 0 },
    { label: 'Retention', value: latestScore?.retention_score ?? 0 },
    { label: 'Earner penetration', value: latestScore?.earner_rate_score ?? 0 },
    { label: 'Velocity', value: latestScore?.velocity_score ?? 0 },
    { label: 'Growth', value: latestScore?.growth_score ?? 0 },
  ];

  const hasVerifiedProfile = profile?.logo_url && community.admin_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt={community.name} className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground">
                  {community.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{getFlagEmoji(community.country_code)}</span>
                  <span>{community.city}, {community.country}</span>
                  <ConfidenceBadge totalApproved={totalApproved} />
                </div>
                <h1 className="text-3xl font-bold">{community.name}</h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-lg mb-2">{community.description}</p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              {adminProfile && (
                <span>
                  Managed by {adminProfile.display_name}
                  {hasVerifiedProfile && <span className="ml-1 text-primary">✓</span>}
                </span>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <ExternalLink className="h-3 w-3" /> Website
                </a>
              )}
              {profile?.twitter_handle && (
                <a href={`https://twitter.com/${profile.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  @{profile.twitter_handle.replace('@', '')}
                </a>
              )}
            </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4 p-4 rounded-lg border border-border bg-card">
          {pillars.map(p => (
            <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />
          ))}
        </div>

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
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Score History (last 12 snapshots)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9ca3af' }} />
                  <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No score history yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Recent Activity</h3>
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No recent activity.</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Embed Widget</h3>
          <p className="text-sm text-muted-foreground mb-3">Paste this on your website to show your economy's circularity score.</p>
          <pre className="bg-secondary rounded-md p-3 text-xs font-mono text-foreground overflow-x-auto">{widgetCode}</pre>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
