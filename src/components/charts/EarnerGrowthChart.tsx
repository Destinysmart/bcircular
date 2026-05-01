import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  communityId: string;
  slug: string;
}

const ROLE_COLORS: Record<string, string> = {
  Freelancer: '#F7931A',
  Employee: '#3B82F6',
  Vendor: '#10B981',
  Other: 'hsl(var(--muted-foreground))',
};

function classifyRole(method: string | null | undefined): keyof typeof ROLE_COLORS {
  if (!method) return 'Other';
  const m = method.toLowerCase();
  if (m.includes('freelanc')) return 'Freelancer';
  if (m.includes('employ') || m.includes('salary') || m.includes('job')) return 'Employee';
  if (m.includes('vendor') || m.includes('seller') || m.includes('shop') || m.includes('merchant')) return 'Vendor';
  return 'Other';
}

const EarnerGrowthChart = ({ communityId, slug }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['earner-growth-6m', communityId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('earners')
        .select('created_at, earning_method')
        .eq('community_id', communityId)
        .eq('status', 'approved');
      if (error) throw error;

      const now = new Date();
      const buckets: { key: string; label: string; Freelancer: number; Employee: number; Vendor: number; Other: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleString('en', { month: 'short' }),
          Freelancer: 0,
          Employee: 0,
          Vendor: 0,
          Other: 0,
        });
      }
      const idxByKey = new Map(buckets.map((b, i) => [b.key, i]));

      for (const r of rows || []) {
        if (!r.created_at) continue;
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const idx = idxByKey.get(key);
        if (idx === undefined) continue;
        const role = classifyRole((r as any).earning_method);
        buckets[idx][role]++;
      }

      return { series: buckets, total: rows?.length ?? 0 };
    },
    enabled: !!communityId,
  });

  const isEmpty = !isLoading && (data?.total ?? 0) === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[11px] uppercase tracking-wider">
        <Users className="h-4 w-4 text-score-green" /> Earners
      </div>
      <div className="font-mono text-3xl font-bold tabular-nums mb-3">
        {isLoading ? <Skeleton className="h-9 w-20" /> : (data?.total ?? 0).toLocaleString()}
      </div>
      <div className="flex-1 min-h-[140px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmpty ? (
          <Link
            to={`/c/${slug}/submit?tab=earner`}
            className="flex flex-col items-center justify-center h-[140px] text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:border-score-amber/50 hover:text-foreground transition-colors gap-1"
          >
            <span>No earners yet</span>
            <span className="inline-flex items-center gap-1 text-score-amber font-medium">
              Be the first <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data!.series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              <Bar dataKey="Freelancer" stackId="a" fill={ROLE_COLORS.Freelancer} />
              <Bar dataKey="Employee" stackId="a" fill={ROLE_COLORS.Employee} />
              <Bar dataKey="Vendor" stackId="a" fill={ROLE_COLORS.Vendor} />
              <Bar dataKey="Other" stackId="a" fill={ROLE_COLORS.Other} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!isEmpty && !isLoading && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {(['Freelancer', 'Employee', 'Vendor', 'Other'] as const).map(r => (
            <span key={r} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: ROLE_COLORS[r] }} />
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EarnerGrowthChart;
