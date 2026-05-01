import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Store, TrendingUp, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  communityId: string;
}

interface MonthBucket {
  key: string;        // YYYY-MM
  label: string;      // Jan
  btcmap: number;     // cumulative
  self: number;       // cumulative
}

function buildBuckets(): MonthBucket[] {
  const out: MonthBucket[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en', { month: 'short' }),
      btcmap: 0,
      self: 0,
    });
  }
  return out;
}

const MerchantGrowthChart = ({ communityId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['merchant-growth-6m', communityId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('merchants')
        .select('created_at, source')
        .eq('community_id', communityId)
        .eq('status', 'approved');
      if (error) throw error;

      const buckets = buildBuckets();
      const earliestKey = buckets[0].key;

      // counts created BEFORE the first bucket (baseline cumulative)
      let baselineBtcmap = 0;
      let baselineSelf = 0;
      // counts per-bucket added in that month
      const perBucket: Record<string, { btcmap: number; self: number }> = {};
      buckets.forEach(b => (perBucket[b.key] = { btcmap: 0, self: 0 }));

      for (const r of rows || []) {
        if (!r.created_at) continue;
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const isBtcmap = (r as any).source === 'btcmap';
        if (key < earliestKey) {
          if (isBtcmap) baselineBtcmap++;
          else baselineSelf++;
        } else if (perBucket[key]) {
          if (isBtcmap) perBucket[key].btcmap++;
          else perBucket[key].self++;
        }
      }

      let cumBtcmap = baselineBtcmap;
      let cumSelf = baselineSelf;
      const series = buckets.map(b => {
        cumBtcmap += perBucket[b.key].btcmap;
        cumSelf += perBucket[b.key].self;
        return { ...b, btcmap: cumBtcmap, self: cumSelf };
      });

      const total = cumBtcmap + cumSelf;
      const lastMonth = perBucket[buckets[buckets.length - 1].key];
      const addedThisMonth = lastMonth.btcmap + lastMonth.self;
      return { series, total, addedThisMonth };
    },
    enabled: !!communityId,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[11px] uppercase tracking-wider">
        <Store className="h-4 w-4 text-score-amber" /> Merchants
      </div>
      <div className="font-mono text-3xl font-bold tabular-nums mb-3">
        {isLoading ? <Skeleton className="h-9 w-20" /> : (data?.total ?? 0).toLocaleString()}
      </div>
      <div className="flex-1 min-h-[140px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : !data || data.total === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            No merchants yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="btcmapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F7931A" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#F7931A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
              <Area type="monotone" dataKey="btcmap" name="BTCMap" stroke="#F7931A" strokeWidth={2} fill="url(#btcmapGrad)" />
              <Area type="monotone" dataKey="self" name="Self-reported" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 text-[11px]">
        {data && data.addedThisMonth > 0 ? (
          <span className="text-score-green inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +{data.addedThisMonth} this month
          </span>
        ) : (
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Minus className="h-3 w-3" /> Stable
          </span>
        )}
      </div>
    </div>
  );
};

export default MerchantGrowthChart;
