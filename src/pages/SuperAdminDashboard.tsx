import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SuperAdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recalcAllLoading, setRecalcAllLoading] = useState(false);

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
  const { data: communities } = useQuery({
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

  const handleCommunityAction = async (communityId: string, status: 'active' | 'suspended') => {
    const { error, count } = await supabase.from('communities').update({ status }).eq('id', communityId);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['admin-communities'] });
    toast({ title: `Economy ${status}` });
  };

  const handleDeleteCommunity = async (communityId: string, communityName: string) => {
    if (!confirm(`Permanently delete "${communityName}" and all its data? This cannot be undone.`)) return;
    // Delete related data first, then the community
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Platform-wide management</p>

        <Tabs defaultValue="economies">
          <TabsList className="mb-6">
            <TabsTrigger value="economies">Economies {pendingCommunities.length > 0 && <Badge className="ml-1.5 text-[10px]" variant="destructive">{pendingCommunities.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="stats">Platform Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="economies">
            {pendingCommunities.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 text-amber-400">Pending Approval</h3>
                <div className="space-y-2">
                  {pendingCommunities.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">{c.city}, {c.country}</span>
                        <Badge className="ml-2 text-[10px]">New</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleCommunityAction(c.id, 'active')}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleCommunityAction(c.id, 'suspended')}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {communities?.filter(c => c.status !== 'pending').map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs ml-2">{c.city}, {c.country}</span>
                    <Badge variant={c.status === 'active' ? 'default' : 'destructive'} className="ml-2 text-[10px]">{c.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRecalcScore(c.id)}>
                      <RefreshCw className="h-3 w-3" /> Recalc
                    </Button>
                    {c.status === 'active' ? (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCommunityAction(c.id, 'suspended')}>Suspend</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleCommunityAction(c.id, 'active')}>Activate</Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDeleteCommunity(c.id, c.name)}>
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
            <div className="space-y-2">
              {(pendingMerchants || []).map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Merchant</Badge>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground text-xs">{(m as any).communities?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('merchants', m.id, 'approved')}><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('merchants', m.id, 'rejected')}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {(pendingEarners || []).map(e => (
                <div key={e.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Earner</Badge>
                    <span className="font-medium">{e.description}</span>
                    <span className="text-muted-foreground text-xs">{(e as any).communities?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('earners', e.id, 'approved')}><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('earners', e.id, 'rejected')}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {(pendingTransactions || []).map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Transaction</Badge>
                    <span className="font-medium">{t.amount_sats} sats — {t.category}</span>
                    <span className="text-muted-foreground text-xs">{(t as any).communities?.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('transactions', t.id, 'approved')}><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOverrideSubmission('transactions', t.id, 'rejected')}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {!(pendingMerchants?.length || pendingEarners?.length || pendingTransactions?.length) && (
                <p className="text-sm text-muted-foreground py-8 text-center">No pending submissions across the platform.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-2">
              {users?.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div>
                    <span className="font-medium">{u.display_name || u.email}</span>
                    <span className="text-muted-foreground text-xs ml-2">{u.email}</span>
                    <span className="text-muted-foreground text-xs ml-2">Joined {new Date(u.created_at).toLocaleDateString()}</span>
                    {u.is_super_admin && <Badge className="ml-2 text-[10px]">Super Admin</Badge>}
                  </div>
                  <Button size="sm" variant={u.is_super_admin ? 'destructive' : 'outline'} onClick={() => handleToggleSuperAdmin(u.user_id, u.is_super_admin)}>
                    {u.is_super_admin ? 'Revoke Admin' : 'Make Admin'}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{totalEconomies}</div>
                <div className="text-xs text-muted-foreground">Total Economies</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{allMerchants}</div>
                <div className="text-xs text-muted-foreground">Approved Merchants</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{allEarners}</div>
                <div className="text-xs text-muted-foreground">Approved Earners</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <div className="text-2xl font-bold">{allTransactions}</div>
                <div className="text-xs text-muted-foreground">Approved Transactions</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Active Economies: {activeCommunities.length}</h3>
                <p className="text-sm text-muted-foreground">Pending: {pendingCommunities.length} · Users: {users?.length || 0}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
