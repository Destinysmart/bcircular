import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Share2, ExternalLink, Store, Users, Zap, Shield, ArrowLeft, Printer, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ScoreRing from '@/components/ScoreRing';
import ScoreBar from '@/components/ScoreBar';
import Navbar from '@/components/Navbar';
import { fetchCommunityBySlug, fetchCommunityMerchants, fetchCommunityEarners, fetchCommunityTransactions, fetchLatestScore, fetchScoreHistory } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { formatSats, getFlagEmoji, getScoreLabel } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const ProofOfCircularity = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const { data: community, isLoading, isError } = useQuery({
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

  const { data: blinkTxStats } = useQuery({
    queryKey: ['blink-tx-stats', communityId],
    queryFn: async () => {
      const { data } = await supabase.from('blink_transactions').select('direction, settlement_amount, is_internal').eq('community_id', communityId!);
      const total = data?.length || 0;
      const internal = data?.filter(t => t.is_internal).length || 0;
      const totalSats = data?.reduce((s, t) => s + Number(t.settlement_amount), 0) || 0;
      const internalSats = data?.filter(t => t.is_internal).reduce((s, t) => s + Number(t.settlement_amount), 0) || 0;
      return { total, internal, totalSats, internalSats, retentionRate: total > 0 ? Math.round((internal / total) * 100) : 0 };
    },
    enabled: !!communityId,
  });

  const { data: walletCount } = useQuery({
    queryKey: ['wallet-count', communityId],
    queryFn: async () => {
      const { count } = await supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('community_id', communityId!);
      return count || 0;
    },
    enabled: !!communityId,
  });

  const handleExportPDF = async () => {
    if (!communityId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proof-pdf', {
        body: { community_id: communityId },
      });
      if (error) throw error;

      // data is a base64 PDF
      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-of-circularity-${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF downloaded' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Share this link to show your Proof of Circularity.' });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-16 text-center text-muted-foreground">Loading...</div></div>;
  }

  if (isError || !community) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Economy not found</h2>
          <Link to="/leaderboard"><Button variant="outline">Back to leaderboard</Button></Link>
        </div>
      </div>
    );
  }

  const score = latestScore?.score ?? 0;
  const merchantCount = merchants?.length ?? 0;
  const earnerCount = earners?.length ?? 0;
  const txCount = transactions?.length ?? 0;
  const circularSats = transactions?.filter(t => t.is_circular).reduce((s, t) => s + Number(t.amount_sats), 0) ?? 0;
  const totalSelfReportedSats = transactions?.reduce((s, t) => s + Number(t.amount_sats), 0) ?? 0;

  const pillars = [
    { label: 'Merchant Saturation', value: latestScore?.merchant_density_score ?? 0 },
    { label: 'Retention', value: latestScore?.retention_score ?? 0 },
    { label: 'Earner Penetration', value: latestScore?.earner_rate_score ?? 0 },
    { label: 'Velocity', value: latestScore?.velocity_score ?? 0 },
    { label: 'Growth', value: latestScore?.growth_score ?? 0 },
  ];

  const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        {/* Back link */}
        <Link to={`/c/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 no-print" data-no-print="true">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        {/* Report Header */}
        <div className="rounded-xl border border-border bg-card p-8 mb-6" id="report-content">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Proof of Circularity</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              <span className="font-medium">Verified by Bitcoin Circular</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>{getFlagEmoji(community.country_code)}</span>
                <span>{community.city}, {community.country}</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{community.name}</h1>
              {community.description && (
                <p className="text-sm text-muted-foreground max-w-md">{community.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-3">Report generated: {generatedAt}</p>
            </div>
            <div className="flex flex-col items-center">
              <ScoreRing score={score} />
              <Badge variant="outline" className="mt-2 text-xs">{getScoreLabel(score)}</Badge>
            </div>
          </div>

          {/* Pillar Breakdown */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Score Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {pillars.map(p => <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />)}
            </div>
          </section>

          {/* Key Metrics */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Key Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={<Store className="h-4 w-4" />} label="Merchants" value={merchantCount} />
              <MetricCard icon={<Users className="h-4 w-4" />} label="Earners" value={earnerCount} />
              <MetricCard icon={<Zap className="h-4 w-4" />} label="Transactions" value={txCount} />
              <MetricCard icon={<Zap className="h-4 w-4" />} label="Circular Sats" value={formatSats(circularSats)} />
            </div>
          </section>

          {/* Wallet-Verified Data */}
          {(blinkTxStats && blinkTxStats.total > 0) && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Wallet-Verified Data
                <Badge variant="default" className="ml-2 text-xs">Blink API</Badge>
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Automatically synced from connected Blink wallets — {walletCount} wallet{walletCount !== 1 ? 's' : ''} connected.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Verified Transactions" value={blinkTxStats.total} />
                <MetricCard label="Internal (Circular)" value={blinkTxStats.internal} />
                <MetricCard label="Total Sats Flow" value={formatSats(blinkTxStats.totalSats)} />
                <MetricCard label="Retention Rate" value={`${blinkTxStats.retentionRate}%`} />
              </div>
            </section>
          )}

          {/* Self-Reported Summary */}
          {totalSelfReportedSats > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Self-Reported Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold">{formatSats(totalSelfReportedSats)}</div>
                  <div className="text-xs text-muted-foreground">Total sats reported</div>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold">{txCount > 0 ? Math.round((circularSats / totalSelfReportedSats) * 100) : 0}%</div>
                  <div className="text-xs text-muted-foreground">Circular ratio</div>
                </div>
              </div>
            </section>
          )}

          {/* Score History */}
          {scoreHistory && scoreHistory.length > 1 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Score History</h2>
              <div className="flex items-end gap-1 h-20">
                {scoreHistory.slice(-20).map((s, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/80 transition-all"
                    style={{ height: `${Math.max(s.score, 2)}%` }}
                    title={`${s.score} — ${new Date(s.calculated_at).toLocaleDateString()}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{new Date(scoreHistory[Math.max(0, scoreHistory.length - 20)].calculated_at).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
                <span>{new Date(scoreHistory[scoreHistory.length - 1].calculated_at).toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
              </div>
            </section>
          )}

          {/* Economy Details */}
          <section className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Economy Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <DetailRow label="Location" value={`${community.city}, ${community.region}, ${community.country}`} />
              <DetailRow label="Declared Population" value={community.declared_population?.toLocaleString() || '—'} />
              {community.founding_year && <DetailRow label="Founded" value={String(community.founding_year)} />}
              {profile?.website && <DetailRow label="Website" value={profile.website} isLink />}
              <DetailRow label="Status" value={community.status} />
              <DetailRow label="Member Count" value={community.member_count?.toLocaleString() || '0'} />
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-border pt-4 mt-6">
            <p className="text-xs text-muted-foreground text-center">
              This report is auto-generated by the Bitcoin Circular Economy Index. Data is a mix of self-reported and wallet-verified sources.
              No funds are held or controlled by this platform. <span className="text-primary">Read-only access only.</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center no-print" data-no-print="true">
          <Button onClick={handleExportPDF} disabled={exporting} className="gap-1.5">
            <Download className="h-4 w-4" />
            {exporting ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleShare} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Copy share link
          </Button>
          <Link to={`/c/${slug}`}>
            <Button variant="outline" className="gap-1.5">
              <ExternalLink className="h-4 w-4" />
              View dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

function MetricCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-4 text-center">
      {icon && <div className="flex justify-center mb-1 text-muted-foreground">{icon}</div>}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DetailRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">{value}</a>
      ) : (
        <span className="font-medium capitalize">{value}</span>
      )}
    </div>
  );
}

export default ProofOfCircularity;
