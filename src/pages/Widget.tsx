import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCommunityBySlug, fetchLatestScore } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { getScoreColor, getFlagEmoji } from '@/lib/mock-data';
import MerchantMap from '@/components/MerchantMap';
import circularLogo from '@/assets/circular-logo.png';

type View = 'score' | 'stats' | 'map';
type Window = '7d' | '30d' | '90d' | 'all';

const WINDOW_DAYS: Record<Window, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': null,
};

const WINDOW_LABEL: Record<Window, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
  'all': 'all time',
};

const Shell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-background border border-border rounded-lg font-sans overflow-hidden ${className}`}>{children}</div>
);

const Footer = ({ slug }: { slug: string }) => (
  <a
    href={`${window.location.origin}/economy/${slug}`}
    target="_blank"
    rel="noopener"
    className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
  >
    <img src={circularLogo} alt="Bitcoin Circular" className="h-4 w-auto object-contain opacity-80" />
    <span className="font-mono uppercase tracking-wider">View on bitcoincircular.com →</span>
  </a>
);

const Widget = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const view: View = (['score', 'stats', 'map'].includes(params.get('view') || '') ? params.get('view') : 'score') as View;
  const win: Window = (['7d', '30d', '90d', 'all'].includes(params.get('window') || '') ? params.get('window') : '30d') as Window;

  const { data: community, isLoading } = useQuery({
    queryKey: ['widget-community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const { data: score } = useQuery({
    queryKey: ['widget-score', community?.id],
    queryFn: () => fetchLatestScore(community!.id),
    enabled: !!community?.id && view === 'score',
  });

  const sinceIso = (() => {
    const days = WINDOW_DAYS[win];
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  })();

  const { data: stats } = useQuery({
    queryKey: ['widget-stats', community?.id, win],
    queryFn: async () => {
      const cid = community!.id;
      const merchantsQ = supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', cid).eq('status', 'approved');
      const earnersQ = supabase.from('earners').select('id', { count: 'exact', head: true }).eq('community_id', cid).eq('status', 'approved');
      let txQ = supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('community_id', cid).eq('status', 'approved');
      if (sinceIso) txQ = txQ.gte('created_at', sinceIso);
      const [m, e, t] = await Promise.all([merchantsQ, earnersQ, txQ]);
      return { merchants: m.count ?? 0, earners: e.count ?? 0, transactions: t.count ?? 0 };
    },
    enabled: !!community?.id && view !== 'score',
  });

  const { data: mapMerchants } = useQuery({
    queryKey: ['widget-map-merchants', community?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('merchants')
        .select('id,name,category,lat,lng,payment_methods,source')
        .eq('community_id', community!.id)
        .eq('status', 'approved')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(500);
      return (data || []) as any[];
    },
    enabled: !!community?.id && view === 'map',
  });

  if (isLoading) {
    return <Shell className="w-full h-full min-h-[120px] flex items-center justify-center text-xs text-muted-foreground p-4">Loading…</Shell>;
  }

  if (!community) {
    return <Shell className="w-full h-full min-h-[120px] flex items-center justify-center text-xs text-muted-foreground p-4">Economy not found</Shell>;
  }

  if (view === 'score') {
    const displayScore = score?.score ?? 0;
    return (
      <Shell className="w-full h-full flex flex-col">
        <div className="flex-1 p-4 flex flex-col justify-between min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{community.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{getFlagEmoji(community.country_code)} {community.city}, {community.country}</div>
            </div>
            <div className={`font-mono text-3xl font-semibold leading-none ${getScoreColor(displayScore)}`}>{displayScore}</div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Circularity score</div>
            <div className="text-[10px] text-muted-foreground">/ 100</div>
          </div>
        </div>
        <Footer slug={community.slug} />
      </Shell>
    );
  }

  if (view === 'stats') {
    return (
      <Shell className="w-full h-full flex flex-col">
        <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{community.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{getFlagEmoji(community.country_code)} {community.city}, {community.country}</div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-full px-2 py-0.5">
              {WINDOW_LABEL[win]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 items-center">
            {[
              { label: 'Merchants', value: stats?.merchants ?? 0 },
              { label: 'Earners', value: stats?.earners ?? 0 },
              { label: 'Txns', value: stats?.transactions ?? 0 },
            ].map(s => (
              <div key={s.label} className="rounded-md bg-secondary/40 border border-border p-2 text-center">
                <div className="font-mono text-xl font-semibold text-foreground tabular-nums">{s.value.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <Footer slug={community.slug} />
      </Shell>
    );
  }

  // map
  return (
    <Shell className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{community.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{(mapMerchants?.length ?? 0)} merchants on map</div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {mapMerchants && mapMerchants.length > 0 ? (
          <MerchantMap merchants={mapMerchants} fallbackCenter={null} />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4">No mapped merchants yet</div>
        )}
      </div>
      <Footer slug={community.slug} />
    </Shell>
  );
};

export default Widget;
