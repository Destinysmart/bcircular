import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { saveMerchantToken } from '@/lib/merchantApi';
import { Wallet, Shield, ExternalLink } from 'lucide-react';

const MerchantClaim = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [walletId, setWalletId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-merchant', {
        body: {
          public_merchant_id: publicId,
          claim_token: token.trim(),
          blink_wallet_id: walletId.trim(),
          merchant_api_key: apiKey.trim(),
        },
      });
      // supabase-js wraps non-2xx as FunctionsHttpError but still parses the JSON body into `data`.
      const payload = (data as any) || {};
      if (payload?.error) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not link wallet');
      }
      if (error && !payload?.success) {
        // Try to read body from FunctionsHttpError
        const ctx: any = (error as any).context;
        let msg = error.message || 'Could not link wallet';
        try {
          const body = await ctx?.json?.();
          if (body?.error) msg = typeof body.error === 'string' ? body.error : msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      saveMerchantToken(publicId, token.trim());
      toast({
        title: 'Wallet linked successfully!',
        description: "Save this page link — it's your private dashboard.",
      });
      navigate(`/m/${publicId}`);
    } catch (err: any) {
      const { friendlyToast } = await import('@/lib/friendlyError');
      toast(friendlyToast(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Link your wallet</CardTitle>
            </div>
            <CardDescription>
              Merchant ID <span className="font-mono text-foreground">{publicId}</span>. No personal info required —
              we only link your Blink wallet to this anonymous ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="token">Claim token</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="From the link your admin sent"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor="wallet">Blink wallet ID</Label>
                <Input
                  id="wallet"
                  value={walletId}
                  onChange={e => setWalletId(e.target.value)}
                  placeholder="Find this in your Blink app"
                  required
                  className="font-mono text-xs"
                />
                <a
                  href="https://www.blink.sv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  How to find my wallet ID <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <Label htmlFor="apiKey">Your Blink read-only API key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="blink_…"
                  required
                  className="font-mono text-xs"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from dashboard.blink.sv → API Keys → Create read-only key.
                </p>
                <a
                  href="https://dashboard.blink.sv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  How to get your API key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Linking…' : 'Link wallet'}
              </Button>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                Read-only. We never move your funds. Save this link — it's the only way back to your dashboard.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantClaim;
