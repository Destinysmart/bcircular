import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  kind: 'economy' | 'merchant' | 'transaction' | 'btcmap';
  text: string;
  at: number;
}

const timeAgo = (ms: number) => {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const ICONS: Record<ActivityItem['kind'], string> = {
  economy: '🌍',
  merchant: '🏪',
  transaction: '⚡',
  btcmap: '📍',
};

const fetchActivity = async (): Promise<ActivityItem[]> => {
  const [communitiesRes, merchantsRes, txnsRes, btcmapSyncRes] = await Promise.all([
    supabase.from('communities').select('id, name, created_at, btcmap_last_synced').order('created_at', { ascending: false }).limit(8),
    supabase.from('merchants').select('id, created_at, community_id').eq('status', 'approved').order('created_at', { ascending: false }).limit(8),
    supabase.from('blink_transactions').select('id, blink_created_at, community_id').order('blink_created_at', { ascending: false }).limit(8),
    supabase.from('communities').select('id, name, btcmap_last_synced').not('btcmap_last_synced', 'is', null).order('btcmap_last_synced', { ascending: false }).limit(4),
  ]);

  const communities = communitiesRes.data || [];
  const merchants = merchantsRes.data || [];
  const txns = txnsRes.data || [];
  const syncs = btcmapSyncRes.data || [];

  // Build name map for community_id → name
  const nameById = new Map<string, string>();
  communities.forEach(c => nameById.set(c.id, c.name));

  const items: ActivityItem[] = [];

  communities.forEach(c => {
    items.push({
      id: `eco-${c.id}`,
      kind: 'economy',
      text: `${c.name} joined the network`,
      at: new Date(c.created_at).getTime(),
    });
  });

  merchants.forEach(m => {
    const ecoName = nameById.get(m.community_id) || 'an economy';
    items.push({
      id: `merch-${m.id}`,
      kind: 'merchant',
      text: `New merchant added in ${ecoName}`,
      at: new Date(m.created_at).getTime(),
    });
  });

  txns.forEach(t => {
    const ecoName = nameById.get(t.community_id) || 'an economy';
    items.push({
      id: `tx-${t.id}`,
      kind: 'transaction',
      text: `New transaction recorded in ${ecoName}`,
      at: new Date(t.blink_created_at).getTime(),
    });
  });

  syncs.forEach(s => {
    if (!s.btcmap_last_synced) return;
    items.push({
      id: `sync-${s.id}-${s.btcmap_last_synced}`,
      kind: 'btcmap',
      text: `BTCMap data updated for ${s.name}`,
      at: new Date(s.btcmap_last_synced).getTime(),
    });
  });

  return items.sort((a, b) => b.at - a.at).slice(0, 8);
};

const RecentActivityFeed = () => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['homepage-recent-activity'],
    queryFn: fetchActivity,
    refetchInterval: 60000,
    enabled: open,
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="container py-6"
    >
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
        >
          <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground">Recent Activity</h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-score-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-score-green" />
            </span>
            Live
          </span>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.4, 0, 1] }}
              className="overflow-hidden border-t border-border"
            >
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading activity…</div>
              ) : !data || data.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">No recent activity yet</div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.map((item, i) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-lg leading-none w-6 text-center" aria-hidden>{ICONS[item.kind]}</span>
                      <span className="flex-1 text-sm text-foreground truncate">{item.text}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(item.at)}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default RecentActivityFeed;
