import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchMerchantMetricsByPublicId, fetchMerchantTransactions, getMerchantToken, clearMerchantToken } from '@/lib/merchantApi';
import { Wallet, ArrowDownLeft, ArrowUpRight, Repeat, TrendingUp, AlertCircle, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const fmtSats = (n: number) => (n || 0).toLocaleString();

const MerchantDashboard = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { toast } = useToast();

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['merchant-metrics', publicId],
    queryFn: () => fetchMerchantMetricsByPublicId(publicId!),
    enabled: !!publicId,
  });

  const { data: txs } = useQuery({
    queryKey: ['merchant-txs', metrics?.merchant_id],
    queryFn: () => fetchMerchantTransactions(metrics!.merchant_id, 20),
    enabled: !!metrics?.merchant_id && metrics?.wallet_linked,
  });

  const hasToken = publicId ? !!getMerchantToken(publicId) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-10 max-w-3xl">
          <p className="text-sm text-muted-foreground">Loading merchant…</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-10 max-w-3xl">
          <Card>
            <CardContent className="pt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Merchant not found.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const total = metrics.inflow_sats + metrics.outflow_sats;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground font-mono">{metrics.public_merchant_id}</div>
            <h1 className="text-2xl font-semibold">{metrics.name}</h1>
            <div className="text-sm text-muted-foreground capitalize">{metrics.category}</div>
          </div>
          <div className="flex items-center gap-2">
            {metrics.wallet_linked ? (
              <Badge className="gap-1.5"><Wallet className="h-3 w-3" /> Wallet linked</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5"><Wallet className="h-3 w-3" /> Not linked</Badge>
            )}
          </div>
        </div>

        {!metrics.wallet_linked && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              This merchant hasn't linked a Blink wallet yet. Once linked, transactions will appear automatically.
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<ArrowDownLeft className="h-4 w-4" />} label="Inflow (sats)" value={fmtSats(metrics.inflow_sats)} />
          <StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Outflow (sats)" value={fmtSats(metrics.outflow_sats)} />
          <StatCard icon={<Repeat className="h-4 w-4" />} label="Internal (sats)" value={fmtSats(metrics.internal_sats)} highlight />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Circularity" value={`${metrics.circularity_score}%`} highlight />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <CardDescription>Latest 20 — auto-tracked, anonymous</CardDescription>
          </CardHeader>
          <CardContent>
            {!metrics.wallet_linked ? (
              <p className="text-sm text-muted-foreground">No wallet linked yet.</p>
            ) : !txs || txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {txs.map((t: any) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      {t.direction === 'RECEIVE'
                        ? <ArrowDownLeft className="h-4 w-4 text-score-green" />
                        : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <div className="font-mono">{fmtSats(Number(t.settlement_amount))} sats</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.blink_created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {t.is_internal && <Badge variant="outline" className="text-xs">circular</Badge>}
                  </li>
                ))}
              </ul>
            )}
            {total > 0 && (
              <p className="text-xs text-muted-foreground mt-3">{metrics.tx_count} total tracked transaction{metrics.tx_count === 1 ? '' : 's'}.</p>
            )}
          </CardContent>
        </Card>

        {hasToken && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage</CardTitle>
              <CardDescription>You're signed in to this merchant on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (!publicId) return;
                  clearMerchantToken(publicId);
                  toast({ title: 'Signed out of merchant on this device' });
                  setTimeout(() => window.location.reload(), 300);
                }}
              >
                <Unlink className="h-3.5 w-3.5" /> Sign out on this device
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-4 ${highlight ? 'bg-primary/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default MerchantDashboard;
