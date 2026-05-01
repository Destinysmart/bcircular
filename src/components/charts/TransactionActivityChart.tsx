import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  communityId: string;
}

interface DayBucket {
  date: string;     // YYYY-MM-DD
  label: string;    // d
  count: number;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TransactionActivityChart = ({ communityId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['tx-activity-30d', communityId],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 29);
      const sinceIso = since.toISOString();

      const [blinkRes, txRes] = await Promise.all([
        supabase
          .from('blink_transactions')
          .select('blink_created_at')
          .eq('community_id', communityId)
          .gte('blink_created_at', sinceIso),
        supabase
          .from('transactions')
          .select('created_at')
          .eq('community_id', communityId)
          .eq('status', 'approved')
          .gte('created_at', sinceIso),
      ]);

      const buckets: DayBucket[] = [];
      const idxByDate = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const k = dateKey(d);
        idxByDate.set(k, buckets.length);
        buckets.push({ date: k, label: String(d.getDate()), count: 0 });
      }

      const allDates = [
        ...((blinkRes.data || []).map((r: any) => r.blink_created_at)),
        ...((txRes.data || []).map((r: any) => r.created_at)),
      ];
      for (const ts of allDates) {
        if (!ts) continue;
        const k = dateKey(new Date(ts));
        const idx = idxByDate.get(k);
        if (idx !== undefined) buckets[idx].count++;
      }

      // streaks
      let current = 0;
      let best = 0;
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (buckets[i].count > 0) current++;
        else break;
      }
      let run = 0;
      for (const b of buckets) {
        if (b.count > 0) {
          run++;
          if (run > best) best = run;
        } else run = 0;
      }
      const mostActive = buckets.reduce((acc, b) => (b.count > acc.count ? b : acc), buckets[0]);

      return { series: buckets, currentStreak: current, bestStreak: best, mostActive };
    },
    enabled: !!communityId,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider">
          <Activity className="h-4 w-4 text-score-amber" /> Transaction Activity
        </div>
        <span className="text-[10px] text-muted-foreground">last 30 days</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[180px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data!.series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 11,
                color: 'hsl(var(--foreground))',
              }}
              labelFormatter={(l, p) => {
                const item = (p as any[])?.[0]?.payload;
                return item ? new Date(item.date).toLocaleDateString() : l;
              }}
              formatter={(v: any) => [`${v} txns`, 'Transactions']}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data!.series.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.count > 0 ? '#F7931A' : 'transparent'}
                  stroke={entry.count > 0 ? '#F7931A' : 'hsl(var(--border))'}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <Stat
            label="Most active day"
            value={data.mostActive && data.mostActive.count > 0
              ? `${new Date(data.mostActive.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} · ${data.mostActive.count} txns`
              : '—'}
          />
          <Stat label="Current streak" value={`${data.currentStreak} day${data.currentStreak === 1 ? '' : 's'}`} />
          <Stat label="Best streak" value={`${data.bestStreak} day${data.bestStreak === 1 ? '' : 's'}`} />
        </div>
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}

export default TransactionActivityChart;
