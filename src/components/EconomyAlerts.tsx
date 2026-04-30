import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  communityId: string;
}

const TYPE_META: Record<string, { Icon: typeof AlertCircle; ring: string; bg: string; text: string; label: string }> = {
  critical: { Icon: AlertCircle, ring: 'border-destructive/40', bg: 'bg-destructive/10', text: 'text-destructive', label: 'Critical' },
  warning: { Icon: AlertTriangle, ring: 'border-score-amber/40', bg: 'bg-score-amber/10', text: 'text-score-amber', label: 'Warning' },
  positive: { Icon: CheckCircle2, ring: 'border-score-green/40', bg: 'bg-score-green/10', text: 'text-score-green', label: 'Milestone' },
};

export default function EconomyAlerts({ communityId }: Props) {
  const queryClient = useQueryClient();

  const { data: alerts } = useQuery({
    queryKey: ['economy-alerts', communityId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('economy_alerts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!communityId,
  });

  const dismiss = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase as any).from('economy_alerts').update({ is_read: true }).eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['economy-alerts', communityId] }),
  });

  if (!alerts || alerts.length === 0) return null;

  // Sort: critical first, then warning, then positive
  const order = { critical: 0, warning: 1, positive: 2 };
  const sorted = [...alerts].sort((a, b) => order[a.alert_type as keyof typeof order] - order[b.alert_type as keyof typeof order]);

  return (
    <section className="space-y-2 mb-6">
      {sorted.map((a) => {
        const meta = TYPE_META[a.alert_type] || TYPE_META.warning;
        const Icon = meta.Icon;
        return (
          <div key={a.id} className={`flex items-start gap-3 rounded-lg border ${meta.ring} ${meta.bg} p-4`}>
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.text}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] uppercase tracking-wider font-semibold ${meta.text} mb-0.5`}>{meta.label}</div>
              <div className="text-sm text-foreground">{a.message}</div>
              {a.action_url && (
                <Link to={a.action_url} className={`inline-block mt-1.5 text-xs ${meta.text} hover:underline font-medium`}>
                  Take action →
                </Link>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => dismiss.mutate(a.id)}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </section>
  );
}
