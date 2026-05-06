import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MyDashboardRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  const { data: community, isLoading } = useQuery({
    queryKey: ['my-community', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, status, slug, created_at')
        .eq('admin_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // If active or super admin, jump straight in
  useEffect(() => {
    if (community && community.status === 'active') {
      navigate(`/dashboard/economy/${community.id}`, { replace: true });
    }
  }, [community, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 py-20 max-w-xl text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 py-12 sm:py-20 max-w-xl">
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">No economy yet</h1>
            <p className="text-sm text-muted-foreground mb-6">
              You haven't registered an economy. Get started in a few steps.
            </p>
            <Link to="/register">
              <Button className="w-full h-11 bg-score-amber text-background hover:bg-score-amber/90">
                Register an economy <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending / under review state — friendly, not 404-y
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-12 sm:py-20 max-w-xl">
        <div className="rounded-2xl border border-score-amber/30 bg-background p-8 sm:p-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-score-amber/15 text-score-amber mb-4">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {community.name} is pending approval
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            A super admin will review your registration within 48 hours.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Once approved, your full admin dashboard will unlock here automatically.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/leaderboard">
              <Button className="w-full h-11 bg-score-amber text-background hover:bg-score-amber/90">
                <Zap className="h-4 w-4 mr-2" fill="currentColor" />
                Explore active economies
              </Button>
            </Link>
            <Link to="/methodology">
              <Button variant="outline" className="w-full h-11">
                Read the methodology <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDashboardRedirect;
