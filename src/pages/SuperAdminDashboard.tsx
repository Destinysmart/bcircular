import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EconomyLogo from '@/components/EconomyLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle, XCircle, RefreshCw, Shield, Trash2, Globe,
  ClipboardList, Users, BarChart3, Inbox,
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recalcAllLoading, setRecalcAllLoading] = useState(false);
  const [resyncAllLoading, setResyncAllLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  // Check super admin status
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
    if (userProfile && !userProfile.is_super_admin) {
      toast({ title: 'Access denied', variant: 'destructive' });
      navigate('/');
    }
  }, [user, authLoading, userProfile]);

  // All communities
  const { data: communities, dataUpdatedAt: communitiesUpdatedAt } = useQuery({
    queryKey: ['admin-communities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.is_super_admin,
  });

  // All pending submissions
  const { data: pendingMerchants } = useQuery({
    queryKey: ['admin-pending-merchants'],
    queryFn: async () => {
      const { data } = await supabase.from('merchants').select('*, communities(name)').eq('status', 'pending');
      return data || [];
    },
    enabled: !!userProfile?.is_super_admin,
  });

  const { data: pendingEarners } = useQuery({
    queryKey: ['admin-pending-earners'],
    queryFn: async () => {
      const { data } = await supabase.from('earners').select('*, communities(name)').eq('status', 'pending');
      return data || [];
    },
    enabled: !!userProfile?.is_super_admin,
  });

  const { data: pendingTransactions } = useQuery({
    queryKey: ['admin-pending-transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('transactions').select('*, communities(name)').eq('status', 'pending');
      return data || [];
    },
    enabled: !!userProfile?.is_super_admin,
  });

  // All users
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!userProfile?.is_super_admin,
  });

  // Platform stats
  const { data: allMerchants } = useQuery({
    queryKey: ['admin-all-merchants'],
    queryFn: async () => {
      const { count } = await supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'approved');
      return count || 0;
    },
    enabled: !!userProfile?.is_super_admin,
  });

  const { data: allEarners } = useQuery({
    queryKey: ['admin-all-earners'],
    queryFn: async () => {
      const { count } = await supabase.from('earners').select('id', { count: 'exact', head: true }).eq('status', 'approved');
      return count || 0;
    },
    enabled: !!userProfile?.is_super_admin,
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['admin-all-transactions'],
    queryFn: async () => {
      const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'approved');
      return count || 0;
    },
    enabled: !!userProfile?.is_super_admin,
  });

  useEffect(() => {
    if (communitiesUpdatedAt) setLastUpdated(new Date(communitiesUpdatedAt));
  }, [communitiesUpdatedAt]);

  const handleCommunityAction = async (communityId: string, status: 'active' | 'suspended') => {
    const community = communities?.find((c: any) => c.id === communityId);
    const { error } = await supabase.from('communities').update({ status }).eq('id', communityId);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['admin-communities'] });
    toast({ title: `Economy ${status}` });

    // Notify the economy admin by email when transitioning to active.
    // The in-app alert is created automatically by the DB trigger.
    if (status === 'active' && community?.contact_email) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'economy-approved',
            recipientEmail: community.contact_email,
            idempotencyKey: `economy-approved-${communityId}`,
            templateData: {
              economyName: community.name,
              dashboardUrl: `https://bitcoincircular.com/dashboard/economy/${communityId}`,
            },
          },
        });
      } catch (e) {
        // Email infra may not be set up yet — never block the approval.
        console.warn('approval email skipped', e);
      }
    }
  };

  const handleDeleteCommunity = async (communityId: string, communityName: string) => {
    if (!confirm(`Permanently delete "${communityName}" and all its data? This cannot be undone.`)) return;
    await Promise.all([
      supabase.from('circularity_scores').delete().eq('community_id', communityId),
      supabase.from('validation_votes').delete().in('submission_id',
        (await supabase.from('merchants').select('id').eq('community_id', communityId)).data?.map(m => m.id) || []
      ),
      supabase.from('merchants').delete().eq('community_id', communityId),
      supabase.from('earners').delete().eq('community_id', communityId),
      supabase.from('transactions').delete().eq('community_id', communityId),
      supabase.from('validators').delete().eq('community_id', communityId),
      supabase.from('community_admins').delete().eq('community_id', communityId),
      supabase.from('community_profiles').delete().eq('community_id', communityId),
      supabase.from('blink_api_keys').delete().eq('community_id', communityId),
      supabase.from('wallets').delete().eq('community_id', communityId),
      supabase.from('blink_transactions').delete().eq('community_id', communityId),
    ]);
    const { error } = await supabase.from('communities').delete().eq('id', communityId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['admin-communities'] });
      toast({ title: `"${communityName}" deleted` });
    }
  };

  const handleOverrideSubmission = async (table: string, id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from(table as any).update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['admin-pending-merchants'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-earners'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pending-transactions'] });
    toast({ title: `Submission ${status}` });
  };

  const handleRecalcScore = async (communityId: string) => {
    try {
      await supabase.functions.invoke('calculate-score', { body: { community_id: communityId } });
      toast({ title: 'Score recalculated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRecalcAll = async () => {
    setRecalcAllLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-score', { body: { recalculate_all: true } });
      if (error) throw error;
      const n = data?.results?.length ?? 0;
      toast({ title: `Recalculated scores for ${n} economies ✓` });
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRecalcAllLoading(false);
    }
  };

  const handleResyncAllBtcmap = async () => {
    setResyncAllLoading(true);
    toast({ title: 'Resyncing all economies from BTCMap...' });
    try {
      const { data: economies, error: fetchError } = await supabase
        .from('communities')
        .select('id, name, btcmap_area_id, bbox_north')
        .eq('status', 'active')
        .not('btcmap_area_id', 'is', null);
      if (fetchError) throw fetchError;

      let synced = 0;
      let skipped = 0;
      let failed = 0;

      for (const economy of economies || []) {
        if (!economy.bbox_north) { skipped++; continue; }
        const { error } = await supabase.functions.invoke('sync-btcmap', {
          body: { community_id: economy.id },
        });
        if (error) {
          console.error(`Failed to sync ${economy.name}:`, error);
          failed++;
        } else {
          synced++;
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      queryClient.invalidateQueries();
      toast({
        title: 'Resync complete',
        description: `Synced ${synced} · Skipped ${skipped} (no bbox) · Failed ${failed}`,
      });
    } catch (err: any) {
      toast({ title: 'Resync failed', description: err.message, variant: 'destructive' });
    } finally {
      setResyncAllLoading(false);
    }
  };

  const handleToggleSuperAdmin = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_super_admin: !current }).eq('user_id', userId);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    toast({ title: `Super-admin ${!current ? 'granted' : 'revoked'}` });
  };

  if (authLoading || profileLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-16 text-center text-muted-foreground">Loading...</div></div>;
  }

  if (!userProfile?.is_super_admin) return null;

  const pendingCommunities = communities?.filter(c => c.status === 'pending') || [];
  const activeCommunities = communities?.filter(c => c.status === 'active') || [];
  const totalEconomies = communities?.length || 0;
  const nonPending = communities?.filter(c => c.status !== 'pending') || [];

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page header */}
      <header className="border-b border-border bg-card/40">
        <div className="container py-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="h-5 w-5 text-score-amber" />
              <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Platform-wide management
              <span className="mx-2 opacity-50">·</span>
              <span className="font-mono-data text-xs">Last updated: {formatTime(lastUpdated)}</span>
            </p>
          </div>
          {user?.email && (
            <div className="text-xs text-muted-foreground hidden sm:block max-w-[220px] truncate">{user.email}</div>
          )}
        </div>
      </header>

      <div className="container py-8">
        <Tabs defaultValue="economies">
          <TabsList className="mb-6 bg-transparent p-0 h-auto gap-2 flex-wrap justify-start">
            <TabsTrigger
              value="economies"
              className="border border-border rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:border-score-amber data-[state=active]:border-b-2 data-[state=active]:shadow-none"
            >
              <Globe className="h-3.5 w-3.5" />
              Economies
              <span className="ml-1 bg-muted text-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                {totalEconomies}
              </span>
              {pendingCommunities.length > 0 && (
                <span className="ml-1 bg-score-amber/20 text-score-amber text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                  {pendingCommunities.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="border border-border rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:border-score-amber data-[state=active]:border-b-2 data-[state=active]:shadow-none"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Submissions
              <span className="ml-1 bg-muted text-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                {(pendingMerchants?.length || 0) + (pendingEarners?.length || 0) + (pendingTransactions?.length || 0)}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="border border-border rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:border-score-amber data-[state=active]:border-b-2 data-[state=active]:shadow-none"
            >
              <Users className="h-3.5 w-3.5" />
              Users
              <span className="ml-1 bg-muted text-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                {users?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="border border-border rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:border-score-amber data-[state=active]:border-b-2 data-[state=active]:shadow-none"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Platform Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="economies">
            {pendingCommunities.length > 0 && (
              <div className="mb-6 rounded-xl border border-score-amber/30 bg-score-amber/5 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-score-amber/20 bg-score-amber/5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-score-amber">
                    Pending approval · {pendingCommunities.length}
                  </h3>
                </div>
                <div>
                  {pendingCommunities.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0">
                      <div className="flex items-center gap-3">
                        <EconomyLogo economy={c} size="sm" />
                        <div>
                          <div className="font-semibold text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.city}, {c.country}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleCommunityAction(c.id, 'active')}>Approve</Button>
                        <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleCommunityAction(c.id, 'suspended')}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_180px_110px_auto] gap-3 items-center px-4 py-2.5 bg-background border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div>#</div>
                <div>Economy</div>
                <div>Location</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>
              {nonPending.map((c, idx) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[40px_1fr_180px_110px_auto] gap-3 items-center px-4 py-3.5 border-b border-border last:border-b-0 hover:bg-card/60 transition-colors"
                >
                  <div className="text-xs font-mono-data text-muted-foreground">{idx + 1}</div>
                  <div className="flex items-center gap-3 min-w-0">
                    <EconomyLogo economy={c} size="sm" />
                    <span className="font-semibold text-sm truncate">{c.name}</span>
                  </div>
                  <div className="text-[13px] text-muted-foreground truncate">{c.city}, {c.country}</div>
                  <div>
                    {c.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-score-green/15 text-score-green border border-score-green/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-score-green" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> {c.status}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => navigate(`/dashboard/economy/${c.id}`)}>
                      Manage
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-score-amber/40 text-score-amber hover:bg-score-amber/10 hover:text-score-amber" onClick={() => handleRecalcScore(c.id)}>
                      <RefreshCw className="h-3 w-3" /> Recalc
                    </Button>
                    {c.status === 'active' ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleCommunityAction(c.id, 'suspended')}>
                        Suspend
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCommunityAction(c.id, 'active')}>Activate</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleDeleteCommunity(c.id, c.name)}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions">
            {(pendingMerchants?.length || pendingEarners?.length || pendingTransactions?.length) ? (
              <div className="rounded-xl border border-border overflow-hidden">
                {(pendingMerchants || []).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3.5 border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">Merchant</span>
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="text-muted-foreground text-xs">{(m as any).communities?.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('merchants', m.id, 'approved')}><CheckCircle className="h-4 w-4 text-score-green" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('merchants', m.id, 'rejected')}><XCircle className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {(pendingEarners || []).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-3.5 border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">Earner</span>
                      <span className="font-medium text-sm">{e.description}</span>
                      <span className="text-muted-foreground text-xs">{(e as any).communities?.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('earners', e.id, 'approved')}><CheckCircle className="h-4 w-4 text-score-green" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('earners', e.id, 'rejected')}><XCircle className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {(pendingTransactions || []).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3.5 border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">Transaction</span>
                      <span className="font-medium text-sm font-mono-data">{t.amount_sats} sats</span>
                      <span className="text-muted-foreground text-xs">— {t.category}</span>
                      <span className="text-muted-foreground text-xs">{(t as any).communities?.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('transactions', t.id, 'approved')}><CheckCircle className="h-4 w-4 text-score-green" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOverrideSubmission('transactions', t.id, 'rejected')}><XCircle className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card/40 py-16 px-6 text-center flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">No pending submissions</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    All submissions have been reviewed.<br />The platform is up to date.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <div className="rounded-xl border border-border overflow-hidden">
              {users?.map(u => {
                const isSelf = u.user_id === user?.id;
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                        {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{u.display_name || u.email}</span>
                          {u.is_super_admin && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-score-amber/15 text-score-amber border border-score-amber/30">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email} <span className="opacity-50 mx-1">·</span> Joined {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {!isSelf && (
                      u.is_super_admin ? (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleToggleSuperAdmin(u.user_id, u.is_super_admin)}>
                          Revoke Admin
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleToggleSuperAdmin(u.user_id, u.is_super_admin)}>
                          Make Admin
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { value: totalEconomies, label: 'Economies', sub: 'total' },
                { value: allMerchants ?? 0, label: 'Merchants', sub: 'approved' },
                { value: allEarners ?? 0, label: 'Earners', sub: 'approved' },
                { value: allTransactions ?? 0, label: 'Transactions', sub: 'approved' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-5 border-t-2 border-t-score-amber relative overflow-hidden">
                  <div className="font-mono-data text-[40px] leading-none font-bold text-score-amber mb-1">
                    {s.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground/70 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Summary bar */}
            <div className="rounded-lg border border-border bg-card/40 px-4 py-3 mb-6 text-sm text-muted-foreground">
              <span className="text-foreground font-semibold">{activeCommunities.length}</span> active economies
              <span className="mx-2 opacity-50">·</span>
              <span className="text-foreground font-semibold">{pendingCommunities.length}</span> pending
              <span className="mx-2 opacity-50">·</span>
              <span className="text-foreground font-semibold">{users?.length || 0}</span> users
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRecalcAll}
                disabled={recalcAllLoading}
                className="w-full flex items-center justify-center gap-2 rounded-[10px] px-8 py-3.5 text-sm font-bold tracking-wide text-background bg-gradient-to-br from-score-amber to-[hsl(32_95%_44%)] shadow-[0_4px_12px_hsl(var(--score-amber)/0.3)] hover:shadow-[0_6px_16px_hsl(var(--score-amber)/0.4)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <RefreshCw className={`h-4 w-4 ${recalcAllLoading ? 'animate-spin' : ''}`} />
                {recalcAllLoading ? 'Recalculating...' : 'Recalculate all scores'}
              </button>
              <button
                onClick={handleResyncAllBtcmap}
                disabled={resyncAllLoading}
                className="w-full flex items-center justify-center gap-2 rounded-[10px] px-8 py-3.5 text-sm font-bold tracking-wide bg-transparent border border-score-amber text-score-amber hover:bg-score-amber/10 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${resyncAllLoading ? 'animate-spin' : ''}`} />
                {resyncAllLoading ? 'Resyncing all economies...' : 'Resync all economies from BTCMap'}
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
