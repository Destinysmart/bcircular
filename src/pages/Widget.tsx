import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCommunityBySlug, fetchLatestScore } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { getScoreColor } from '@/lib/mock-data';
import circularLogo from '@/assets/circular-logo.png';

const Widget = () => {
  const { slug } = useParams();

  const { data: community, isLoading } = useQuery({
    queryKey: ['widget-community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const { data: score } = useQuery({
    queryKey: ['widget-score', community?.id],
    queryFn: () => fetchLatestScore(community!.id),
    enabled: !!community?.id,
  });

  const { data: merchantCount } = useQuery({
    queryKey: ['widget-merchants', community?.id],
    queryFn: async () => {
      const { count } = await supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', community!.id).eq('status', 'approved');
      return count ?? 0;
    },
    enabled: !!community?.id,
  });

  const { data: earnerCount } = useQuery({
    queryKey: ['widget-earners', community?.id],
    queryFn: async () => {
      const { count } = await supabase.from('earners').select('id', { count: 'exact', head: true }).eq('community_id', community!.id).eq('status', 'approved');
      return count ?? 0;
    },
    enabled: !!community?.id,
  });

  if (isLoading) {
    return <div className="w-[280px] h-[120px] bg-background border border-border rounded-lg p-4 flex items-center justify-center text-xs text-muted-foreground">Loading...</div>;
  }

  if (!community) {
    return <div className="w-[280px] h-[120px] bg-background border border-border rounded-lg p-4 flex items-center justify-center text-xs text-muted-foreground">Economy not found</div>;
  }

  const displayScore = score?.score ?? 0;

  return (
    <div className="w-[280px] h-[120px] bg-background border border-border rounded-lg p-4 flex flex-col justify-between font-sans">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate">{community.name}</span>
        <span className={`font-mono text-2xl font-medium ${getScoreColor(displayScore)}`}>
          {displayScore}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {merchantCount ?? 0} merchants · {earnerCount ?? 0} earners
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <a href={`https://circular.btc/c/${community.slug}`} target="_blank" rel="noopener" className="hover:text-primary">
          <img src={circularLogo} alt="Circular" className="h-8 w-auto object-contain" />
        </a>
      </div>
    </div>
  );
};

export default Widget;
