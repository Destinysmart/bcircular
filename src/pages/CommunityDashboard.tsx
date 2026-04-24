import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Store, Users, Zap, ChevronDown, Info, ExternalLink, Shield, Wallet, Scale, PlusCircle, Calendar } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import MerchantMap from '@/components/MerchantMap';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import SatsFlowGraph from '@/components/SatsFlowGraph';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import SatsMovementPanel from '@/components/SatsMovementPanel';
import BlinkWalletSettings from '@/components/BlinkWalletSettings';
import StatCard from '@/components/StatCard';
import EconomyLogo from '@/components/EconomyLogo';
import { TierBadge, TIER_CHECKLIST, getTierMeta, type FbceTier } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fetchCommunityBySlug, fetchCommunityMerchants, fetchCommunityEarners, fetchLatestScore, fetchScoreHistory, submitEarner } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { getFlagEmoji } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const pillarDescriptions: Record<string, string> = {
  'Merchant saturation': 'How many merchants accept Bitcoin relative to the economy size.',
  'Earner penetration': 'What fraction of the economy earns in Bitcoin.',
  'Retention': 'Percentage of transactions staying circular within the economy.',
  'Growth': 'Rate of new merchants and earners joining in the past 30 days.',
  'Velocity': 'How actively earners are transacting within the local economy.',
};

const CommunityDashboard = () => {
  const { user } = useAuth();
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [earnerOpen, setEarnerOpen] = useState(false);
  const [earnerDescription, setEarnerDescription] = useState('');
  const [earnerPaymentMethod, setEarnerPaymentMethod] = useState('Lightning');

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

  const { data: proofCount } = useQuery({
    queryKey: ['approved-proof-count', communityId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from('proofs')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId!)
        .eq('status', 'approved');
      return count || 0;
    },
    enabled: !!communityId,
  });

  const { data: monthlyMetrics } = useQuery({
    queryKey: ['monthly-metrics', communityId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysSoFar = now.getDate();
      const [txRes, blinkRes] = await Promise.all([
        supabase.from('transactions').select('created_at').eq('community_id', communityId!).eq('status', 'approved').gte('created_at', startOfMonth.toISOString()),
        supabase.from('blink_transactions').select('blink_created_at').eq('community_id', communityId!).gte('blink_created_at', startOfMonth.toISOString()),
      ]);
      const dates = [
        ...((txRes.data as any[]) || []).map((t: any) => t.created_at),
        ...((blinkRes.data as any[]) || []).map((t: any) => t.blink_created_at),
      ];
      const activeDays = new Set(dates.map(d => new Date(d).toDateString())).size;
      const monthlyTransactions = dates.length;
      const activityRate = daysSoFar > 0 ? Math.round((activeDays / daysSoFar) * 100) : 0;
      return { monthlyTransactions, activeDays, daysInMonth, daysSoFar, activityRate };
    },
    enabled: !!communityId,
  });
  const { data: isCommunityAdmin } = useQuery({
    queryKey: ['is-community-admin', communityId, user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('community_admins')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId!)
        .eq('user_id', user!.id);
      return (count || 0) > 0;
    },
    enabled: !!communityId && !!user,
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('user_id', user!.id)
        .single();
      return data?.is_super_admin || false;
    },
    enabled: !!user,
  });

  const addEarnerMutation = useMutation({
    mutationFn: () => submitEarner(communityId!, { description: earnerDescription, payment_method: earnerPaymentMethod }, user?.id),
    onSuccess: () => {
      setEarnerDescription('');
      setEarnerPaymentMethod('Lightning');
      setEarnerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['earners', communityId] });
      toast({ title: 'Earner submitted', description: 'Validators will review this earner within 48 hours.' });
    },
    onError: (err: Error) => toast({ title: 'Could not add earner', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (isError || !community) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h2 className="text-lg font-semibold mb-2">Economy not found</h2>
          <p className="text-muted-foreground text-sm mb-6">{isError ? (error as Error).message : `No economy found for "${slug}".`}</p>
          <Link to="/leaderboard"><Button variant="outline" className="rounded-full">Back to leaderboard</Button></Link>
        </div>
      </div>
    );
  }

  const displayScore = latestScore?.score ?? 0;
  const displayMerchants = merchants?.length ?? 0;
  const btcmapCount = merchants?.filter(m => (m as any).source === 'btcmap').length ?? 0;
  const displayEarners = earners?.length ?? 0;
  const hasBlinkData = (blinkTxStats || 0) > 0;
  const canAdminEconomy = !!user && (community.admin_id === user.id || !!isCommunityAdmin || !!isSuperAdmin);
  const logoUrl = (community as any).logo_url as string | null | undefined;
  const bannerUrl = (community as any).banner_url as string | null | undefined;
  const websiteUrl = (community as any).website as string | null | undefined;

  const chartData = (scoreHistory && scoreHistory.length > 0)
    ? scoreHistory.slice(-12).map(s => ({
        date: new Date(s.calculated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        score: s.score,
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
      <div className="container py-10">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-score-amber/20 bg-foreground shadow-[0_0_30px_hsl(var(--score-amber)/0.10)]">
          {bannerUrl ? (
            <>
              <img src={bannerUrl} alt={`${community.name} banner`} className="h-[280px] w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
              <div className="absolute bottom-6 left-6 flex items-end gap-4">
                <EconomyLogo economy={{ name: community.name, logo_url: logoUrl }} size="lg" className="border-4" />
                <div className="pb-1">
                  <div className="text-3xl font-extrabold text-foreground">{community.name}</div>
                  <div className="text-sm text-muted-foreground">{getFlagEmoji(community.country_code)} {community.city}, {community.country}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <EconomyLogo economy={{ name: community.name, logo_url: logoUrl }} size="lg" />
                <div>
                  <div className="mb-2 text-sm text-score-amber">{getFlagEmoji(community.country_code)} {community.city}, {community.country}</div>
                  <div className="text-3xl font-extrabold text-background">{community.name}</div>
                  {!logoUrl && canAdminEconomy && <Link to={`/dashboard/economy/${community.id}`} className="mt-2 inline-block text-sm text-score-amber hover:underline">Upload logo →</Link>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <EconomyLogo economy={{ name: community.name, logo_url: logoUrl }} size="md" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-0.5">
                  <span>{getFlagEmoji(community.country_code)}</span>
                  <span>{community.city}, {community.country}</span>
                  <ConfidenceBadge totalApproved={displayMerchants + displayEarners} proofCount={proofCount} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-[28px] font-bold">{community.name}</h1>
                  {(community as any).fbce_tier && (
                    <TierBadge tier={(community as any).fbce_tier} verified={(community as any).fbce_tier_verified} showSelfReported={false} />
                  )}
                </div>
              </div>
            </div>
            {community.description && (
              <p className="text-muted-foreground text-sm max-w-lg mb-4">{community.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              {adminProfile && (
                <span>Managed by {adminProfile.display_name}{logoUrl && community.admin_id && <span className="ml-1 text-primary">✓</span>}</span>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors"><ExternalLink className="h-3 w-3" /> Website</a>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              <a href={`/c/${slug}/submit`}><Button variant="outline" size="sm" className="gap-1.5 rounded-full"><Store className="h-3.5 w-3.5" /> Add merchant / earner</Button></a>
              {canAdminEconomy && (
                <Dialog open={earnerOpen} onOpenChange={setEarnerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-score-amber text-score-amber hover:text-score-amber"><PlusCircle className="h-3.5 w-3.5" /> Add earner</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add earner</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Role description</Label><Textarea value={earnerDescription} onChange={e => setEarnerDescription(e.target.value)} placeholder="e.g. Freelance designer paid in sats" /></div>
                      <div><Label>Payment method</Label><Input value={earnerPaymentMethod} onChange={e => setEarnerPaymentMethod(e.target.value)} placeholder="Lightning, on-chain, or both" /></div>
                      <Button className="w-full" disabled={!earnerDescription.trim() || addEarnerMutation.isPending} onClick={() => addEarnerMutation.mutate()}>{addEarnerMutation.isPending ? 'Submitting…' : 'Submit earner'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Link to={`/c/${slug}/proofs`}><Button size="sm" className="gap-1.5 rounded-full bg-score-amber text-background hover:bg-score-amber/90"><Shield className="h-3.5 w-3.5" /> Proof of Circularity</Button></Link>
            </div>
          </div>
          <Link to={`/compare?a=${community.slug}`} className="hidden md:inline-flex items-center gap-1 text-xs text-primary hover:underline self-start">
            <Scale className="h-3 w-3" /> Compare with another economy →
          </Link>
        </div>

        {/* PRIMARY METRICS — transaction-first */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-score-amber/30 bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-score-amber" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Transactions</span>
            </div>
            <div className="font-mono text-4xl font-extrabold text-foreground tabular-nums">
              {(monthlyMetrics?.monthlyTransactions ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">this month</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Activity rate</span>
            </div>
            <div className="font-mono text-4xl font-extrabold text-foreground tabular-nums">
              {monthlyMetrics?.activityRate ?? 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {monthlyMetrics?.activeDays ?? 0} of {monthlyMetrics?.daysInMonth ?? 30} days active
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-3">
              <div className="h-full bg-score-amber transition-all" style={{ width: `${Math.min(100, monthlyMetrics?.activityRate ?? 0)}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-5 w-5 text-score-amber" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Merchants</span>
            </div>
            <div className="font-mono text-4xl font-extrabold text-foreground tabular-nums">
              {displayMerchants.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {btcmapCount > 0 ? `${btcmapCount} BTCMap verified` : 'accepting Bitcoin'}
            </div>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <StatCard label="Earners" value={displayEarners} icon={<Users className="h-5 w-5 text-score-green" />} />
          <StatCard label="Wallets" value={walletCount ?? 0} icon={<Wallet className="h-5 w-5 text-primary" />} />
          <StatCard
            label="Blink txns synced"
            value={hasBlinkData ? (blinkTxStats || 0).toLocaleString() : '—'}
            icon={<Zap className="h-5 w-5 text-chart-4" />}
            subtitle={hasBlinkData ? 'Auto-synced via Blink' : undefined}
          />
        </div>

        {/* FBCE Classification (only shown if set) */}
        {(community as any).fbce_tier && getTierMeta((community as any).fbce_tier) && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-10">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-foreground">FBCE Classification</h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  {getTierMeta((community as any).fbce_tier)!.description}
                </p>
              </div>
              <TierBadge
                tier={(community as any).fbce_tier}
                verified={(community as any).fbce_tier_verified}
                size="md"
              />
            </div>
            <ul className="space-y-1.5 text-sm">
              {TIER_CHECKLIST[(community as any).fbce_tier as FbceTier].map((item) => (
                <li key={item} className="flex items-start gap-2 text-foreground">
                  <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border text-score-green">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-[11px] text-muted-foreground">
              Framework by FBCE · <a href="https://fbce.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">fbce.io</a>
            </div>
          </div>
        )}

        {/* CIRCULARITY INDEX — secondary section */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-10">
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-foreground">Circularity Index</h2>
              <p className="text-xs text-muted-foreground max-w-md mt-1">
                A composite score measuring merchant density, earner participation, and transaction patterns.
              </p>
            </div>
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Info className="h-3 w-3" /> How it's calculated <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 text-xs">
                {pillars.map(p => (
                  <div key={p.label}>
                    <span className="font-medium text-foreground">{p.label}:</span>{' '}
                    <span className="text-muted-foreground">{pillarDescriptions[p.label]}</span>
                  </div>
                ))}
                <Link to="/methodology" className="text-primary hover:underline inline-block mt-1">Read full methodology →</Link>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <ScoreRing score={displayScore} size={140} strokeWidth={10} />
              <span className="text-[10px] text-muted-foreground">
                {latestScore ? `Updated ${new Date(latestScore.calculated_at).toLocaleDateString()}` : 'No score yet'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 flex-1 w-full">
              {pillars.map(p => (
                <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />
              ))}
            </div>
          </div>
        </div>

        {/* Intelligence Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <SatsMovementPanel communityId={communityId!} />
          <LiveActivityFeed communityId={communityId!} />
        </div>

        {/* Sats Flow Graph */}
        <div className="mb-10">
          <SatsFlowGraph communityId={communityId!} />
        </div>

        {/* Support This Economy - full width */}
        <div className="mb-6">
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Support This Economy</h3>
              <p className="text-sm text-muted-foreground mt-1">Buy merch. Pay in sats. Support real Bitcoin adoption.</p>
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">Powered by Blink</span>
            </div>
            <a
              href="https://blinkstuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ backgroundColor: '#F7931A' }}
            >
              <Zap className="w-4 h-4" /> Shop Community Merch
            </a>
          </div>
        </div>

        {/* Score Trend + Merchant Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Score Trend</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240, 4%, 46%)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(240, 4%, 46%)' }} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0, 0%, 100%)', border: '1px solid hsl(240, 6%, 90%)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    labelStyle={{ color: 'hsl(240, 4%, 46%)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="hsl(239, 84%, 67%)" strokeWidth={2} fill="url(#scoreGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No score history yet.</div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">Merchant Map</div>
            <MerchantMap
              merchants={merchants || []}
              fallbackCenter={
                community.bbox_north && community.bbox_south && community.bbox_east && community.bbox_west
                  ? {
                      lat: (Number(community.bbox_north) + Number(community.bbox_south)) / 2,
                      lng: (Number(community.bbox_east) + Number(community.bbox_west)) / 2,
                    }
                  : null
              }
            />
          </div>
        </div>

        {/* Wallet Integration */}
        {user && (
          <div className="mb-10">
            <BlinkWalletSettings communityId={communityId!} isAdmin={community.admin_id === user.id || isCommunityAdmin || isSuperAdmin} />
          </div>
        )}

        {/* Embed Widget */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Embed Widget</h3>
          <p className="text-sm text-muted-foreground mb-3">Paste this on your website to show your economy's circularity score.</p>
          <pre className="bg-secondary rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto">{widgetCode}</pre>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
