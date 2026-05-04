import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCcw, Loader2, Zap, Trash2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { walletApi, fetchEconomyWalletMetrics } from '@/lib/walletApi';
import { toast } from '@/hooks/use-toast';

interface Props { communityId: string }

type OwnerType = 'merchant' | 'earner';
type RowOwner = {
  id: string;
  label: string;
  code: string;
  ownerType: OwnerType;
  wallet: any | null;
};

function appUrl() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

async function fetchOwnersWithWallets(communityId: string) {
  const [{ data: merchants }, { data: earners }, { data: wallets }] = await Promise.all([
    (supabase as any).from('merchants').select('id, name, merchant_code, status').eq('community_id', communityId).eq('status', 'approved'),
    (supabase as any).from('earners').select('id, description, earner_code, status').eq('community_id', communityId).eq('status', 'approved'),
    (supabase as any).from('wallets').select('id, owner_type, owner_id, wallet_status, last_synced_at').eq('community_id', communityId).in('owner_type', ['merchant', 'earner']),
  ]);
  const walletByKey = new Map<string, any>();
  for (const w of (wallets || [])) walletByKey.set(`${w.owner_type}:${w.owner_id}`, w);

  return {
    merchants: (merchants || []).map((m: any) => ({ ...m, wallet: walletByKey.get(`merchant:${m.id}`) || null })),
    earners: (earners || []).map((e: any) => ({ ...e, wallet: walletByKey.get(`earner:${e.id}`) || null })),
  };
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function ConnectedWalletsManager({ communityId }: Props) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});
  const [disconnectTarget, setDisconnectTarget] = useState<RowOwner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RowOwner | null>(null);

  // Invalidate every query that depends on wallet/transaction/score data so
  // both the admin dashboard and the public economy page refresh immediately
  // — no manual page reload required.
  async function invalidateAllStats() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet-count', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-count', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['economy-wallet-metrics', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['economy-tx-circularity', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['blink-tx-stats', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['blink-transaction-count', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['transaction-count', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['connected-wallets', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['circularity-score', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['community', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['circular-flow-spotlight', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['verified-circularity', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['sats-flow', communityId] }),
      queryClient.invalidateQueries({ queryKey: ['economy-alerts', communityId] }),
    ]);
  }

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['connected-wallets', communityId],
    queryFn: () => fetchOwnersWithWallets(communityId),
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  const { data: txStats, refetch: refetchTxStats } = useQuery({
    queryKey: ['economy-tx-circularity', communityId],
    queryFn: async () => {
      const { data: txns } = await (supabase as any)
        .from('blink_transactions')
        .select('is_internal, flow_type, settlement_amount')
        .eq('community_id', communityId);
      const isCircular = (t: any) =>
        t.is_internal === true
        || t.flow_type === 'circular_receive'
        || t.flow_type === 'circular_spend';
      const totalVolume = (txns || []).reduce((s: number, t: any) => s + Number(t.settlement_amount || 0), 0);
      const circularVolume = (txns || []).filter(isCircular).reduce((s: number, t: any) => s + Number(t.settlement_amount || 0), 0);
      const circularTxnCount = (txns || []).filter(isCircular).length;
      const circularityRate = totalVolume > 0 ? Math.round((circularVolume / totalVolume) * 100) : 0;
      return { totalVolume, circularVolume, circularTxnCount, circularityRate };
    },
  });

  function copyLink(ownerType: OwnerType, code: string) {
    const url = `${appUrl()}/connect?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Connect link copied', description: 'Share via WhatsApp, email, etc.' });
  }

  function requestNewKey(ownerType: OwnerType, code: string) {
    // Fresh claim link reuses the owner's permanent code — opening it lets
    // them paste a new read-only API key, replacing the rejected one.
    const url = `${appUrl()}/connect?code=${code}&rekey=1`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Re-key link copied',
      description: `Send to the ${ownerType} so they can paste a fresh Blink API key.`,
    });
  }

  async function syncOne(ownerType: OwnerType, code: string, id: string, walletId?: string) {
    setBusyId(id);
    try {
      const res = walletId
        ? await walletApi.syncWallet(communityId, walletId)
        : await walletApi.sync(ownerType, code);
      const message = `Synced ${res.synced ?? 0} transactions${typeof res.internal === 'number' ? ` (${res.internal} circular)` : ''}`;
      setResultById(prev => ({ ...prev, [id]: { type: 'success', message } }));
      toast({ title: 'Sync complete', description: message });
      await refetch();
      await refetchMetrics(); await refetchTxStats();
      await invalidateAllStats();
    } catch (err: any) {
      const message = err.message || 'Sync failed';
      setResultById(prev => ({ ...prev, [id]: { type: 'error', message } }));
      toast({ title: 'Sync failed', description: message, variant: 'destructive' });
    } finally { setBusyId(null); }
  }

  async function testOne(id: string, walletId: string) {
    setBusyId(id);
    try {
      const res = await walletApi.testConnection(communityId, walletId);
      const message = res.message || 'Connection successful';
      setResultById(prev => ({ ...prev, [id]: { type: 'success', message } }));
      toast({ title: 'Connection test passed', description: message });
    } catch (err: any) {
      const message = err.message || 'Connection test failed';
      setResultById(prev => ({ ...prev, [id]: { type: 'error', message } }));
      toast({ title: 'Connection test failed', description: message, variant: 'destructive' });
    } finally { setBusyId(null); }
  }

  async function confirmDisconnect() {
    const target = disconnectTarget;
    if (!target?.wallet?.id) { setDisconnectTarget(null); return; }
    setBusyId(target.id);
    try {
      // 1. Delete all associated transaction rows first
      const { error: txErr } = await (supabase as any)
        .from('blink_transactions')
        .delete()
        .eq('wallet_id', target.wallet.id);
      if (txErr) throw txErr;

      // 2. Reset wallet to pending (clear sensitive fields)
      const { error } = await (supabase as any)
        .from('wallets')
        .update({
          wallet_status: 'pending',
          blink_api_key_encrypted: null,
          ln_address_hash: null,
          last_synced_at: null,
        })
        .eq('id', target.wallet.id);
      if (error) throw error;

      // 3. Trigger score recalculation for this economy (best-effort)
      try {
        await supabase.functions.invoke('calculate-score', { body: { community_id: communityId } });
      } catch (scoreErr) {
        console.warn('Score recalculation failed', scoreErr);
      }

      toast({ title: 'Wallet disconnected and all associated data removed' });

      // 4. Refresh all dashboard stats (admin + public page)
      await Promise.all([refetch(), refetchMetrics(), refetchTxStats()]);
      await invalidateAllStats();
    } catch (err: any) {
      toast({ title: 'Failed to disconnect', description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
      setDisconnectTarget(null);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setBusyId(target.id);
    try {
      if (target.wallet?.id) {
        await (supabase as any).from('blink_transactions').delete().eq('wallet_id', target.wallet.id);
        const { error: wErr } = await (supabase as any).from('wallets').delete().eq('id', target.wallet.id);
        if (wErr) throw wErr;
      }
      const ownerTable = target.ownerType === 'earner' ? 'earners' : 'merchants';
      const { error: oErr } = await (supabase as any).from(ownerTable).delete().eq('id', target.id);
      if (oErr) throw oErr;
      toast({ title: 'Entry deleted permanently' });
      await refetch();
      await refetchMetrics(); await refetchTxStats();
      await invalidateAllStats();
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  const merchants = data?.merchants || [];
  const earners = data?.earners || [];
  // Live count of merchant/earner wallets that are actually connected — same
  // source the public economy page uses, so the two pages can never disagree.
  const connectedMerchantCount = merchants.filter((m: any) => m.wallet?.wallet_status === 'connected').length;
  const connectedEarnerCount = earners.filter((e: any) => e.wallet?.wallet_status === 'connected').length;
  const connectedCount = connectedMerchantCount + connectedEarnerCount;

  function renderRow(row: RowOwner) {
    const conn = row.wallet?.wallet_status === 'connected';
    const authErr = row.wallet?.wallet_status === 'auth_error';
    const hasWallet = !!row.wallet?.id;
    const rowResult = resultById[row.id];
    return (
      <li key={row.id} className="rounded-md border p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{row.label}</div>
            <div className="text-xs text-muted-foreground">
              <code>{row.code}</code> ·{' '}
              <Badge variant={conn ? 'default' : authErr ? 'destructive' : 'secondary'} className={conn ? 'bg-score-green text-background' : ''}>
                {conn ? '● Connected' : authErr ? '⚠ Re-connect required' : hasWallet ? '○ Saved, not synced' : '○ Pending'}
              </Badge>{' '}
              {hasWallet && `· last sync ${timeAgo(row.wallet.last_synced_at)}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copyLink(row.ownerType, row.code)}>
              <Copy className="h-3 w-3 mr-1" /> Copy link
            </Button>
            {hasWallet && !authErr && (
              <Button size="sm" variant="outline" onClick={() => testOne(row.id, row.wallet.id)} disabled={busyId === row.id}>
                {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Test connection
              </Button>
            )}
            {hasWallet && !authErr && (
              <Button size="sm" variant="outline" onClick={() => syncOne(row.ownerType, row.code, row.id, row.wallet.id)} disabled={busyId === row.id}>
                {busyId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />} Sync now
              </Button>
            )}
            {(conn || authErr) && (
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDisconnectTarget(row)}
                disabled={busyId === row.id}
              >
                Disconnect
              </Button>
            )}
            {authErr && (
              <Button
                size="sm"
                variant="outline"
                className="border-score-amber/40 text-score-amber hover:bg-score-amber/10 hover:text-score-amber"
                onClick={() => requestNewKey(row.ownerType, row.code)}
                title="Copy a fresh re-key link to send to the wallet owner"
              >
                <KeyRound className="h-3 w-3 mr-1" /> Request new key
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
              disabled={busyId === row.id}
              title="Delete this entry"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
        {authErr && (
          <div className="rounded-md border border-score-amber/40 bg-score-amber/10 px-3 py-2 text-xs text-score-amber">
            Blink rejected this wallet's API key (401). Click <strong>Request new key</strong> to copy a fresh re-key link, then send it to the {row.ownerType}.
          </div>
        )}
        {rowResult && (
          <div className={`rounded-md border px-3 py-2 text-xs ${rowResult.type === 'success' ? 'border-score-green/40 bg-score-green/10 text-foreground' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}>
            {rowResult.message}
          </div>
        )}
      </li>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-score-amber" /> Connected Wallets</CardTitle>
        <CardDescription>Send each approved merchant or earner a link so they can connect their Blink wallet read-only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {txStats && (
          <div className={`rounded-md border p-4 ${txStats.circularityRate > 0 ? 'border-score-green/40 bg-score-green/5' : 'border-score-amber/40 bg-score-amber/5'}`}>
            <div className={`text-xs uppercase tracking-wide font-medium mb-1 ${txStats.circularityRate > 0 ? 'text-score-green' : 'text-score-amber'}`}>🔄 Circularity rate</div>
            <div className={`text-3xl font-bold ${txStats.circularityRate > 0 ? 'text-score-green' : 'text-score-amber'}`}>{txStats.circularityRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {txStats.circularTxnCount} circular transaction{txStats.circularTxnCount === 1 ? '' : 's'} · {txStats.circularVolume.toLocaleString()} sats stayed in economy
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${txStats.circularityRate > 0 ? 'bg-score-green' : 'bg-score-amber'}`} style={{ width: `${Math.min(100, txStats.circularityRate)}%` }} />
            </div>
            {txStats.circularityRate === 0 && (
              <div className="text-xs text-muted-foreground mt-2 italic">Rate rises as more community members connect wallets and transact locally.</div>
            )}
          </div>
        )}

        {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Merchant wallets ({merchants.length})</h3>
          {merchants.length === 0 && <p className="text-sm text-muted-foreground">No approved merchants yet.</p>}
          <ul className="space-y-2">
            {merchants.map((m: any) => renderRow({ id: m.id, label: m.name, code: m.merchant_code, ownerType: 'merchant', wallet: m.wallet }))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Earner wallets ({earners.length})</h3>
          {earners.length === 0 && <p className="text-sm text-muted-foreground">No approved earners yet.</p>}
          <ul className="space-y-2">
            {earners.map((e: any) => renderRow({ id: e.id, label: e.description, code: e.earner_code, ownerType: 'earner', wallet: e.wallet }))}
          </ul>
        </section>
      </CardContent>

      <AlertDialog open={!!disconnectTarget} onOpenChange={(o) => !o && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect this wallet?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <div>Their transaction data will stop syncing.</div>
                <div>Their {disconnectTarget?.ownerType ?? 'earner'} code remains active.</div>
                <div>This cannot be undone.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <div>This removes the {deleteTarget?.ownerType ?? 'entry'} record and all their synced transaction data.</div>
                <div>This cannot be undone.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
