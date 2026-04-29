import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, RefreshCcw, Loader2, ArrowDown, ArrowUp, Recycle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  fetchOwnerByCode, fetchWalletTransactions, fetchWalletMonthlyStats,
  walletApi, type WalletOwnerType,
} from '@/lib/walletApi';

interface Props { ownerType: WalletOwnerType }

function fingerprint(hash: string | null) {
  return hash ? `···${hash.slice(-8)}` : '—';
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function WalletDashboard({ ownerType }: Props) {
  const [search] = useSearchParams();
  const code = search.get('code') || '';
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const ownerQ = useQuery({
    queryKey: ['wallet-owner', ownerType, code],
    queryFn: () => fetchOwnerByCode(ownerType, code),
    enabled: !!code,
  });
  const owner = ownerQ.data;
  const walletId = owner?.wallet?.id;

  const txQ = useQuery({
    queryKey: ['wallet-tx', walletId],
    queryFn: () => fetchWalletTransactions(walletId!, 20),
    enabled: !!walletId,
  });

  const statsQ = useQuery({
    queryKey: ['wallet-stats', walletId],
    queryFn: () => fetchWalletMonthlyStats(walletId!),
    enabled: !!walletId,
  });

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await walletApi.sync(ownerType, code);
      toast({ title: 'Sync complete', description: `${res.synced} transactions, ${res.internal} circular.` });
      await qc.invalidateQueries({ queryKey: ['wallet-owner', ownerType, code] });
      await qc.invalidateQueries({ queryKey: ['wallet-tx', walletId] });
      await qc.invalidateQueries({ queryKey: ['wallet-stats', walletId] });
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally { setSyncing(false); }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect this wallet? Transactions already imported will remain visible to the economy.')) return;
    setDisconnecting(true);
    try {
      await walletApi.disconnect(ownerType, code);
      toast({ title: 'Disconnected' });
      await qc.invalidateQueries({ queryKey: ['wallet-owner', ownerType, code] });
    } catch (err: any) {
      toast({ title: 'Could not disconnect', description: err.message, variant: 'destructive' });
    } finally { setDisconnecting(false); }
  }

  function downloadData() {
    const rows = txQ.data || [];
    const csv = ['direction,amount_sats,is_circular,settled_at',
      ...rows.map((t: any) => `${t.direction},${t.settlement_amount},${t.is_internal},${t.blink_created_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${code}-transactions.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!code) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Missing code</CardTitle></CardHeader></Card></div>;
  if (ownerQ.isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!owner) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Not found</CardTitle><CardDescription>Invalid code or unapproved {ownerType}.</CardDescription></CardHeader></Card></div>;

  const status = owner.wallet?.wallet_status;
  const connected = status === 'connected';
  const stats = statsQ.data;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-score-amber"><Zap className="h-5 w-5" fill="currentColor" /></div>
            <CardTitle className="text-2xl">{owner.name}</CardTitle>
            <CardDescription>
              {owner.community_name} · {owner.community_city}, {owner.community_country}
              <br /><code className="text-xs">{code}</code> · LN fingerprint <code className="text-xs">{fingerprint(owner.wallet?.ln_address_hash || null)}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-score-green text-background' : ''}>
                {connected ? '● Connected' : '○ Not connected'}
              </Badge>
              <span className="text-sm text-muted-foreground">Last synced {timeAgo(owner.wallet?.last_synced_at || null)}</span>
              {connected && (
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RefreshCcw className="h-3 w-3 mr-2" />} Sync now
                </Button>
              )}
              {!connected && (
                <Link to={`/${ownerType}/connect?code=${code}`}>
                  <Button size="sm" className="bg-score-amber text-background hover:bg-score-amber/90">Connect wallet</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {connected && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>Received (30d)</CardDescription><CardTitle className="text-3xl text-score-green flex items-center gap-2"><ArrowDown className="h-5 w-5" /> {stats?.received.toLocaleString() ?? 0}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">sats</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Sent (30d)</CardDescription><CardTitle className="text-3xl text-score-red flex items-center gap-2"><ArrowUp className="h-5 w-5" /> {stats?.sent.toLocaleString() ?? 0}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">sats</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Circular rate</CardDescription><CardTitle className="text-3xl text-score-amber flex items-center gap-2"><Recycle className="h-5 w-5" /> {stats?.rate ?? 0}%</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{stats?.circular.toLocaleString() ?? 0} sats stayed in economy</CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent transactions</CardTitle><CardDescription>🔄 marks transactions within your economy</CardDescription></CardHeader>
              <CardContent className="p-0">
                {txQ.isLoading && <div className="p-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                {!txQ.isLoading && (txQ.data?.length ?? 0) === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No transactions yet.</div>}
                <ul className="divide-y">
                  {(txQ.data || []).map((t: any) => (
                    <li key={t.id} className="px-6 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        {t.direction === 'RECEIVE' ? <ArrowDown className="h-4 w-4 text-score-green" /> : <ArrowUp className="h-4 w-4 text-score-red" />}
                        <span className="font-mono">{t.direction === 'RECEIVE' ? '+' : '−'}{Number(t.settlement_amount).toLocaleString()} sats</span>
                        {t.is_internal && <Badge variant="outline" className="text-score-amber border-score-amber/40">🔄 circular</Badge>}
                      </div>
                      <span className="text-muted-foreground">{timeAgo(t.blink_created_at)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={downloadData}>Download my data</Button>
              <Button variant="ghost" className="text-destructive" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null} Disconnect wallet
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
