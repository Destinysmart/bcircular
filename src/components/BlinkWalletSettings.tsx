import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wallet, RefreshCw, Eye, EyeOff, Zap, Shield, Unlink } from 'lucide-react';

interface BlinkWalletSettingsProps {
  communityId: string;
  isAdmin: boolean;
}

const BlinkWalletSettings = ({ communityId, isAdmin }: BlinkWalletSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  // Check if API key exists (admin only — RLS blocks non-service-role reads,
  // so we track "has key" via wallets or a dedicated check)
  const { data: hasApiKey, isLoading: checkingKey } = useQuery({
    queryKey: ['blink-api-key-exists', communityId],
    queryFn: async () => {
      // We can't read the key directly (RLS blocks it for non-service-role).
      // Instead, try to insert a dummy to check if one exists, or use a function.
      // For now, check if any wallets are synced as a proxy, or use a count query.
      const { count } = await supabase
        .from('blink_api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', communityId);
      return (count || 0) > 0;
    },
    enabled: isAdmin,
  });

  // Fetch connected wallets for this economy
  const { data: wallets, isLoading: loadingWallets } = useQuery({
    queryKey: ['wallets', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('community_id', communityId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch blink transaction stats
  const { data: txStats } = useQuery({
    queryKey: ['blink-tx-stats', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blink_transactions')
        .select('direction, settlement_amount, is_internal')
        .eq('community_id', communityId);
      if (error) throw error;
      const total = data?.length || 0;
      const internal = data?.filter(t => t.is_internal).length || 0;
      const totalSats = data?.reduce((s, t) => s + Number(t.settlement_amount), 0) || 0;
      const internalSats = data?.filter(t => t.is_internal).reduce((s, t) => s + Number(t.settlement_amount), 0) || 0;
      return { total, internal, totalSats, internalSats };
    },
  });

  const saveApiKey = useMutation({
    mutationFn: async () => {
      if (!apiKey.trim()) throw new Error('API key is required');
      // Upsert — if one exists, update it
      const { error } = await supabase.from('blink_api_keys').upsert({
        community_id: communityId,
        api_key_encrypted: apiKey.trim(),
        is_active: true,
      }, { onConflict: 'community_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['blink-api-key-exists', communityId] });
      toast({ title: 'Blink API key saved', description: 'Your read-only key has been securely stored.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error saving key', description: err.message, variant: 'destructive' });
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-blink-transactions', {
        body: { community_id: communityId },
      });
      if (error) throw new Error(error.message || 'Sync failed');
      if (data?.success === false || data?.error) {
        throw new Error(data.error || 'Sync failed');
      }
      queryClient.invalidateQueries({ queryKey: ['wallets', communityId] });
      queryClient.invalidateQueries({ queryKey: ['blink-tx-stats', communityId] });
      toast({
        title: 'Sync complete',
        description: `${data.transactions_synced} transactions synced, ${data.internal_transactions} internal.`,
      });
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-wallet-transactions', {
        body: { action: 'reclassify', community_id: communityId },
      });
      if (error) throw new Error(error.message || 'Reclassify failed');
      if (data?.success === false || data?.error) throw new Error(data.error || 'Reclassify failed');
      // Recompute the score after reclassification
      await supabase.functions.invoke('calculate-score', { body: { community_id: communityId } });
      queryClient.invalidateQueries({ queryKey: ['blink-tx-stats', communityId] });
      queryClient.invalidateQueries({ queryKey: ['economy-wallet-metrics', communityId] });
      queryClient.invalidateQueries({ queryKey: ['economy-tx-circularity', communityId] });
      queryClient.invalidateQueries({ queryKey: ['flow-sums-30d', communityId] });
      queryClient.invalidateQueries({ queryKey: ['circularity-score', communityId] });
      toast({
        title: 'Reclassification complete',
        description: `${data.scanned} scanned · ${data.updated} updated · ${data.internal_now} now circular.`,
      });
    } catch (err: any) {
      toast({ title: 'Reclassify failed', description: err.message, variant: 'destructive' });
    } finally {
      setReclassifying(false);
    }
  };

  const myWallet = wallets?.find(w => w.user_id === user?.id);

  const handleConnectWallet = async (blinkWalletId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('wallets').insert({
        user_id: user.id,
        community_id: communityId,
        blink_wallet_id: blinkWalletId,
        wallet_currency: 'BTC',
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['wallets', communityId] });
      toast({ title: 'Wallet connected' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDisconnectWallet = async () => {
    if (!myWallet) return;
    const { error } = await supabase.from('wallets').delete().eq('id', myWallet.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['wallets', communityId] });
      toast({ title: 'Wallet disconnected' });
    }
  };

  return (
    <div className="space-y-6">
      {/* API Key Section — Admin only */}
      {isAdmin && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Blink Wallet API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Provide your read-only Blink API key to enable automatic transaction syncing for this economy.
            Get your key from <a href="https://dashboard.blink.sv" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.blink.sv</a>.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={hasApiKey ? 'default' : 'secondary'} className="text-xs">
              {checkingKey ? '...' : hasApiKey ? '✓ Key configured' : 'No key set'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={hasApiKey ? '••••••••••••••••' : 'blink_xxxxxxxxxxxxx'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              onClick={() => saveApiKey.mutate()}
              disabled={saveApiKey.isPending || !apiKey.trim()}
            >
              {saveApiKey.isPending ? 'Saving...' : hasApiKey ? 'Update key' : 'Save key'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Shield className="h-3 w-3" /> We never control your funds. Read-only access only.
          </p>
        </section>
      )}

      {/* Sync Controls */}
      {isAdmin && hasApiKey && (
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Transaction Sync</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleReclassify}
                disabled={reclassifying || syncing}
                title="Re-run circular detection on existing synced transactions"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reclassifying ? 'animate-spin' : ''}`} />
                {reclassifying ? 'Reclassifying...' : 'Reclassify'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleSync}
                disabled={syncing || reclassifying}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync now'}
              </Button>
            </div>
          </div>
          {txStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{txStats.total}</div>
                <div className="text-xs text-muted-foreground">Total transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{txStats.internal}</div>
                <div className="text-xs text-muted-foreground">Internal (circular)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{(txStats.totalSats).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total sats</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{(txStats.internalSats).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Circular sats</div>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
};

function ConnectWalletForm({ onConnect }: { onConnect: (walletId: string) => void }) {
  const [walletId, setWalletId] = useState('');
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Your Blink wallet ID"
        value={walletId}
        onChange={e => setWalletId(e.target.value)}
        className="max-w-xs font-mono text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => { onConnect(walletId); setWalletId(''); }}
        disabled={!walletId.trim()}
      >
        Connect
      </Button>
    </div>
  );
}

export default BlinkWalletSettings;
