import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Homepage from '@/pages/Homepage';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          const [scoreRes, merchantsRes] = await Promise.all([
            supabase.from('circularity_scores').select('score').eq('community_id', eco.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', eco.id).eq('status', 'approved'),
          ]);
          return { ...eco, latest_score: scoreRes.data?.score ?? 0, merchant_count: merchantsRes.count ?? 0 };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there';

  const personalSection = (
    <section className="container pt-8 pb-2">
      <h1 className="text-[22px] font-semibold text-foreground mb-1">
        Welcome back, <span className="text-score-amber">{displayName}</span> ⚡
      </h1>
      <p className="text-sm text-score-amber/80 mb-5">Your economies at a glance</p>

      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Your economies</div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {(myEconomies || []).map((economy) => (
          <button
            key={economy.id}
            onClick={() => navigate(`/dashboard/economy/${economy.id}`)}
            className="text-left shrink-0 min-w-[220px] rounded-xl border border-border bg-card p-4 hover:border-score-amber/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground truncate">{economy.name}</span>
              <span className="font-mono text-lg font-bold text-score-amber">{economy.latest_score ?? 0}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">📍 {economy.city}, {economy.country}</div>
            <div className="text-xs text-muted-foreground/70 mt-1">{economy.merchant_count ?? 0} merchants</div>
          </button>
        ))}

        <button
          onClick={() => navigate('/register')}
          className="shrink-0 min-w-[180px] rounded-xl border border-dashed border-border hover:border-score-amber/50 hover:text-foreground text-muted-foreground text-sm transition-colors flex items-center justify-center gap-2 px-4 py-3"
        >
          <Plus className="h-4 w-4" />
          Register economy
        </button>
      </div>
    </section>
  );

  return <Homepage topSlot={personalSection} compactHero />;
};

export default Home;
