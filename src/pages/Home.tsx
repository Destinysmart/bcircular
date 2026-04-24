import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowUpRight, Settings2, ChevronDown, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getFlagEmoji } from '@/lib/mock-data';
import Homepage from '@/pages/Homepage';

const INITIAL_VISIBLE = 4;

const statusBadge = (eco: { status?: string; monthly_transactions?: number; activity_rate?: number }) => {
  if (eco.status !== 'active') {
    return { label: 'Pending', className: 'bg-muted text-muted-foreground' };
  }
  const txns = eco.monthly_transactions ?? 0;
  const rate = eco.activity_rate ?? 0;
  if (txns >= 100 && rate >= 50) return { label: 'Active', className: 'bg-score-green/15 text-score-green' };
  if (txns > 0 || rate > 0) return { label: 'Growing', className: 'bg-score-amber/15 text-score-amber' };
  return { label: 'Dormant', className: 'bg-score-red/15 text-score-red' };
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-home', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: myEconomies } = useQuery({
    queryKey: ['my-economies-home', user?.id],
    queryFn: async () => {
      const { data: ownEcos } = await supabase.from('communities').select('*').eq('admin_id', user!.id);
      const list = ownEcos || [];
      const enriched = await Promise.all(
        list.map(async (eco) => {
          const merchantsRes = await supabase
            .from('merchants')
            .select('id', { count: 'exact', head: true })
            .eq('community_id', eco.id)
            .eq('status', 'approved');
          return { ...eco, merchant_count: merchantsRes.count ?? 0 };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there';
  const economies = myEconomies || [];
  const visible = expanded ? economies : economies.slice(0, INITIAL_VISIBLE);
  const hasMore = economies.length > INITIAL_VISIBLE;

  const personalSection = (
    <section className="container pt-8 pb-2">
      <h1 className="text-[22px] font-semibold text-foreground mb-1">
        Welcome back, <span className="text-score-amber">{displayName}</span> ⚡
      </h1>
      <p className="text-sm text-score-amber/80 mb-5">Your economies at a glance</p>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Your economies</div>
        <button
          onClick={() => navigate('/register')}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Register new
        </button>
      </div>

      {economies.length === 0 ? (
        <button
          onClick={() => navigate('/register')}
          className="w-full rounded-xl border border-dashed border-border hover:border-score-amber/50 hover:text-foreground text-muted-foreground text-sm transition-colors flex items-center justify-center gap-2 py-6"
        >
          <Plus className="h-4 w-4" />
          Register your first economy
        </button>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {visible.map((eco) => {
              const badge = statusBadge(eco);
              const txns = eco.monthly_transactions ?? 0;
              return (
                <div
                  key={eco.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  {/* Left: name + location */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground truncate">{eco.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {getFlagEmoji(eco.country_code)} {eco.city}, {eco.country}
                    </div>
                  </div>

                  {/* Middle: metrics */}
                  <div className="flex items-center gap-5 sm:gap-6 sm:px-2">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-sm font-semibold text-foreground tabular-nums">
                        {txns.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Txns / mo</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-sm font-semibold text-foreground tabular-nums">
                        {eco.merchant_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Merchants</div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 sm:ml-2">
                    <button
                      onClick={() => navigate(`/dashboard/economy/${eco.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-score-amber text-background hover:opacity-90 transition-opacity"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Manage
                    </button>
                    <button
                      onClick={() => navigate(`/economy/${eco.slug}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:border-score-amber/50 transition-colors"
                      title="View public page"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Show less' : `Show ${economies.length - INITIAL_VISIBLE} more`}
            </button>
          )}
        </>
      )}
    </section>
  );

  return <Homepage topSlot={personalSection} compactHero />;
};

export default Home;
