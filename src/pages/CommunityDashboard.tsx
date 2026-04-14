import { useParams, Link } from 'react-router-dom';
import { Share2, Store, Users, Zap, ChevronDown, Info, ExternalLink, Shield, Wallet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import MerchantMap from '@/components/MerchantMap';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import SatsFlowGraph from '@/components/SatsFlowGraph';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import SatsMovementPanel from '@/components/SatsMovementPanel';
import BlinkWalletSettings from '@/components/BlinkWalletSettings';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fetchCommunityBySlug, fetchCommunityMerchants, fetchCommunityEarners, fetchLatestScore, fetchScoreHistory } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { formatSats, getFlagEmoji } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';

const pillarDescriptions: Record<string, string> = {
  'Merchant saturation': 'How many merchants accept Bitcoin relative to the economy size, with a bonus for category diversity.',
  'Earner penetration': 'What fraction of the economy earns in Bitcoin — freelancers, vendors, employees.',
  'Retention': 'What percentage of transactions stay circular within the economy.',
  'Growth': 'Rate of new merchants and earners joining in the past 30 days.',
  'Velocity': 'How actively earners are transacting within the local economy.',
};

const CommunityDashboard = () => {
  const { user } = useAuth();
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

  const { data: blinkTxStats } = useQuery({
    queryKey: ['blink-tx-count', communityId],
    queryFn: async () => {
      const { count } = await supabase
        .from('blink_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId!);
      return count || 0;
    },
    enabled: !!communityId,
  });

  const { data: walletCount } = useQuery({
    queryKey: ['wallet-count', communityId],
    queryFn: async () => {
      const { count } = await supabase
        .from('wallets')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId!);
      return count || 0;
    },
    enabled: !!communityId,
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

  const hasVerifiedProfile = profile?.logo_url && community.admin_id;
  const hasBlinkData = (blinkTxStats || 0) > 0;

  const chartData = (scoreHistory && scoreHistory.length > 0)
    ? scoreHistory.slice(-12).map(s => ({
        date: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        score: s.score,
        retention: Math.round(s.retention_score),
        velocity: Math.round(s.velocity_score),
      }))
    : [];

  const pillars = [
    { label: 'Merchant saturation', value: latestScore?.merchant_density_score ?? 0 },
    { label: 'Retention', value: latestScore?.retention_score ?? 0 },
    { label: 'Earner penetration', value: latestScore?.earner_rate_score ?? 0 },
    { label: 'Velocity', value: latestScore?.velocity_score ?? 0 },
    { label: 'Growth', value: latestScore?.growth_score ?? 0 },
  ];

  const widgetCode = `<iframe src="${window.location.origin}/widget/${slug}" width="280" height="120" frameborder="0"></iframe>`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt={community.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {community.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{getFlagEmoji(community.country_code)}</span>
                  <span>{community.city}, {community.country}</span>
                  <ConfidenceBadge totalApproved={displayMerchants + displayEarners} />
                </div>
                <h1 className="text-2xl font-bold">{community.name}</h1>
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-lg mb-3">{community.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              {adminProfile && (
                <span>Managed by {adminProfile.display_name}{hasVerifiedProfile && <span className="ml-1 text-primary">✓</span>}</span>
              )}
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><ExternalLink className="h-3 w-3" /> Website</a>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              <a href={`/c/${slug}/submit`}><Button variant="outline" size="sm" className="gap-1.5"><Store className="h-3.5 w-3.5" /> Add merchant / earner</Button></a>
              <Link to={`/c/${slug}/report`}><Button variant="outline" size="sm" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Proof of Circularity</Button></Link>
            </div>
          </div>

          {/* Score Ring */}
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={displayScore} />
            <span className="text-xs text-muted-foreground">
              {latestScore ? `Updated ${new Date(latestScore.calculated_at).toLocaleDateString()}` : 'No score yet'}
            </span>
          </div>
        </div>

        {/* ── Score Pillars ── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4 p-4 rounded-lg border border-border bg-card">
          {pillars.map(p => (
            <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />
          ))}
        </div>

        <Collapsible className="mb-6">
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Info className="h-3 w-3" /> How this score is calculated <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 rounded-lg border border-border bg-card p-4 space-y-3">
            {pillars.map(p => (
              <div key={p.label} className="text-sm">
                <span className="font-medium text-foreground">{p.label}</span>
                <span className="text-muted-foreground ml-2">{pillarDescriptions[p.label]}</span>
              </div>
            ))}
            <Link to="/methodology" className="text-xs text-primary hover:underline inline-block mt-2">Read full methodology →</Link>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Key Metrics Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
              <Store className="h-3.5 w-3.5" /> Merchants
            </div>
            <div className="font-mono text-2xl font-medium text-foreground">{displayMerchants}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
              <Users className="h-3.5 w-3.5" /> Earners
            </div>
            <div className="font-mono text-2xl font-medium text-foreground">{displayEarners}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
              <Wallet className="h-3.5 w-3.5" /> Wallets
            </div>
            <div className="font-mono text-2xl font-medium text-foreground">{walletCount ?? 0}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
              <Zap className="h-3.5 w-3.5" /> Transactions
            </div>
            <div className="font-mono text-2xl font-medium text-foreground">
              {hasBlinkData ? (blinkTxStats || 0).toLocaleString() : '—'}
            </div>
            {hasBlinkData && <div className="text-xs text-primary mt-1">Auto-synced via Blink</div>}
          </div>
        </div>

        {/* ── Intelligence Section: 2-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left: Sats Movement + Retention */}
          <SatsMovementPanel communityId={communityId!} />

          {/* Right: Live Activity Feed */}
          <LiveActivityFeed communityId={communityId!} />
        </div>

        {/* ── Sats Flow Graph ── */}
        <div className="mb-8">
          <SatsFlowGraph communityId={communityId!} />
        </div>

        {/* ── Score Trend + Merchant Map ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Score Trend</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222, 41%, 11%)', border: '1px solid hsl(222, 30%, 20%)', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(43, 96%, 56%)" strokeWidth={2} fill="url(#scoreGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No score history yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">Merchant Map</div>
            <MerchantMap merchants={merchants || []} />
          </div>
        </div>

        {/* ── Wallet Integration (logged-in users) ── */}
        {user && (
          <div className="mb-8">
            <BlinkWalletSettings communityId={communityId!} isAdmin={community.admin_id === user.id} />
          </div>
        )}

        {/* ── Embed Widget ── */}
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