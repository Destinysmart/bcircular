import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, ArrowUpRight, Repeat, Zap } from 'lucide-react';

interface LiveActivityFeedProps {
  communityId: string;
}

const LiveActivityFeed = ({ communityId }: LiveActivityFeedProps) => {
  const { data: recentTx } = useQuery({
    queryKey: ['recent-blink-tx', communityId],
    queryFn: async () => {
      // Privacy: never select memo — free-text field can leak names/identities.
      const { data, error } = await supabase
        .from('blink_transactions')
        .select('id, direction, settlement_amount, is_internal, blink_created_at')
        .eq('community_id', communityId)
        .order('blink_created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Poll every 30s
  });

  const getIcon = (direction: string, isInternal: boolean) => {
    if (isInternal) return <Repeat className="h-3.5 w-3.5 text-primary" />;
    if (direction === 'RECEIVE') return <ArrowDownLeft className="h-3.5 w-3.5 text-score-green" />;
    return <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />;
  };

  const getLabel = (direction: string, isInternal: boolean) => {
    if (isInternal) return 'Internal';
    if (direction === 'RECEIVE') return 'Inflow';
    return 'Outflow';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!recentTx || recentTx.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Live Activity</span>
        </div>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No activity yet. Connect wallets and sync transactions.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-score-green animate-pulse-glow" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Live Activity</span>
        <span className="text-xs text-muted-foreground ml-auto">{recentTx.length} recent</span>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {recentTx.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-secondary/30 transition-colors">
            {getIcon(tx.direction, tx.is_internal)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${tx.is_internal ? 'text-primary' : tx.direction === 'RECEIVE' ? 'text-score-green' : 'text-destructive'}`}>
                  {getLabel(tx.direction, tx.is_internal)}
                </span>
                {tx.memo && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{tx.memo}</span>
                )}
              </div>
            </div>
            <span className="font-mono text-sm font-medium text-foreground">
              {Number(tx.settlement_amount).toLocaleString()}
              <span className="text-xs text-muted-foreground ml-1">sats</span>
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(tx.blink_created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveActivityFeed;