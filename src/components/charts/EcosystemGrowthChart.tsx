import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  communityId: string;
}

interface MonthRow {
  key: string;
  label: string;
  merchants: number;     // cumulative
  earners: number;       // cumulative
  transactions: number;  // per-month count
}

const EcosystemGrowthChart = ({ communityId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['ecosystem-growth-12m', communityId],
    queryFn: async () => {
      const now = new Date();
      const earliest = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const buckets: MonthRow[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleString('en', { month: 'short' }),
          merchants: 0,
          earners: 0,
          transactions: 0,
        });
      }
      const idxByKey = new Map(buckets.map((b, i) => [b.key, i]));
      const earliestKey = buckets[0].key;

      const [mRes, eRes, txRes, blinkRes] = await Promise.all([
        supabase.from('merchants').select('created_at').eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('earners').select('created_at').eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('transactions').select('created_at').eq('community_id', communityId).eq('status', 'approved').gte('created_at', earliest.toISOString()),
        supabase.from('blink_transactions').select('blink_created_at').eq('community_id', communityId).gte('blink_created_at', earliest.toISOString()),
      ]);

      let baselineM = 0;
      let baselineE = 0;
      const perMonthM: Record<string, number> = {};
      const perMonthE: Record<string, number> = {};
      buckets.forEach(b => { perMonthM[b.key] = 0; perMonthE[b.key] = 0; });

      for (const r of mRes.data || []) {
        if (!r.created_at) continue;
        const d = new Date(r.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (k < earliestKey) baselineM++;
        else if (perMonthM[k] !== undefined) perMonthM[k]++;
      }
      for (const r of eRes.data || []) {
        if (!r.created_at) continue;
        const d = new Date(r.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (k < earliestKey) baselineE++;
        else if (perMonthE[k] !== undefined) perMonthE[k]++;
      }

      const allTxDates = [
        ...((txRes.data || []).map((r: any) => r.created_at)),
        ...((blinkRes.data || []).map((r: any) => r.blink_created_at)),
      ];
      for (const ts of allTxDates) {
        if (!ts) continue;
        const d = new Date(ts);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const idx = idxByKey.get(k);
        if (idx !== undefined) buckets[idx].transactions++;
      }

      let cumM = baselineM;
      let cumE = baselineE;
      for (const b of buckets) {
        cumM += perMonthM[b.key];
        cumE += perMonthE[b.key];
        b.merchants = cumM;
        b.earners = cumE;
      }
      return buckets;
    },
    enabled: !!communityId,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Economy Growth Over Time
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Last 12 months · merchants & earners (cumulative), transactions (monthly)</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[280px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
            <Line yAxisId="left" type="monotone" dataKey="merchants" name="Merchants" stroke="#F7931A" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line yAxisId="left" type="monotone" dataKey="earners" name="Earners" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EcosystemGrowthChart;
