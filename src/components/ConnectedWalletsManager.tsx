import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, RefreshCcw, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { walletApi, fetchEconomyWalletMetrics } from '@/lib/walletApi';
import { toast } from '@/hooks/use-toast';

interface Props { communityId: string }

function appUrl() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

async function fetchOwnersWithWallets(communityId: string) {
  // Approved merchants with their wallet (if any)
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resultById, setResultById] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['connected-wallets', communityId],
    queryFn: () => fetchOwnersWithWallets(communityId),
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['economy-wallet-metrics', communityId],
    queryFn: () => fetchEconomyWalletMetrics(communityId),
  });

  function copyLink(ownerType: 'merchant' | 'earner', code: string) {
    const url = `${appUrl()}/connect?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Connect link copied', description: 'Share via WhatsApp, email, etc.' });
  }

  async function syncOne(ownerType: 'merchant' | 'earner', code: string, id: string, walletId?: string) {
    setBusyId(id);
    try {
      const res = walletId
        ? await walletApi.syncWallet(communityId, walletId)
        : await walletApi.sync(ownerType, code);
      const message = `Synced ${res.synced ?? 0} transactions${typeof res.internal === 'number' ? ` (${res.internal} circular)` : ''}`;
      setResultById(prev => ({ ...prev, [id]: { type: 'success', message } }));
      toast({ title: 'Sync complete', description: message });
      await refetch();
      await refetchMetrics();
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

  async function disconnectOne(ownerType: 'merchant' | 'earner', code: string, id: string) {
    if (!confirm('Disconnect this wallet?')) return;
    setBusyId(id);
    try {
      await walletApi.disconnect(ownerType, code);
      toast({ title: 'Disconnected' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally { setBusyId(null); }
  }

  const merchants = data?.merchants || [];
  const earners = data?.earners || [];
  const connectedCount = (metrics?.active_merchant_wallets ?? 0) + (metrics?.active_earner_wallets ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-score-amber" /> Connected wallets</CardTitle>
        <CardDescription>Send each approved merchant or earner a link so they can connect their Blink wallet read-only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics && connectedCount >= 2 && (
          <div className="rounded-md border border-score-amber/40 bg-score-amber/5 p-4">
            <div className="text-xs uppercase tracking-wide text-score-amber font-medium mb-1">Real circularity (last 30d)</div>
            <div className="text-3xl font-bold">{Number(metrics.real_circularity_rate).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Based on {connectedCount} connected wallets · {Number(metrics.circular_volume_sats).toLocaleString()} sats stayed in economy</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-score-amber" style={{ width: `${Math.min(100, Number(metrics.real_circularity_rate))}%` }} /></div>
          </div>
        )}

        {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Merchant wallets ({merchants.length})</h3>
          {merchants.length === 0 && <p className="text-sm text-muted-foreground">No approved merchants yet.</p>}
          <ul className="space-y-2">
            {merchants.map((m: any) => {
              const conn = m.wallet?.wallet_status === 'connected';
              return (
                <li key={m.id} className="rounded-md border p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground"><code>{m.merchant_code}</code> · <Badge variant={conn ? 'default' : 'secondary'} className={conn ? 'bg-score-green text-background' : ''}>{conn ? '● Connected' : '○ Pending'}</Badge> {conn && `· last sync ${timeAgo(m.wallet.last_synced_at)}`}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink('merchant', m.merchant_code)}><Copy className="h-3 w-3 mr-1" /> Copy link</Button>
                    {conn && <Button size="sm" variant="outline" onClick={() => syncOne('merchant', m.merchant_code, m.id)} disabled={busyId === m.id}>{busyId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}</Button>}
                    {conn && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => disconnectOne('merchant', m.merchant_code, m.id)} disabled={busyId === m.id}>Disconnect</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Earner wallets ({earners.length})</h3>
          {earners.length === 0 && <p className="text-sm text-muted-foreground">No approved earners yet.</p>}
          <ul className="space-y-2">
            {earners.map((e: any) => {
              const conn = e.wallet?.wallet_status === 'connected';
              return (
                <li key={e.id} className="rounded-md border p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.description}</div>
                    <div className="text-xs text-muted-foreground"><code>{e.earner_code}</code> · <Badge variant={conn ? 'default' : 'secondary'} className={conn ? 'bg-score-green text-background' : ''}>{conn ? '● Connected' : '○ Pending'}</Badge> {conn && `· last sync ${timeAgo(e.wallet.last_synced_at)}`}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink('earner', e.earner_code)}><Copy className="h-3 w-3 mr-1" /> Copy link</Button>
                    {conn && <Button size="sm" variant="outline" onClick={() => syncOne('earner', e.earner_code, e.id)} disabled={busyId === e.id}>{busyId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}</Button>}
                    {conn && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => disconnectOne('earner', e.earner_code, e.id)} disabled={busyId === e.id}>Disconnect</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
