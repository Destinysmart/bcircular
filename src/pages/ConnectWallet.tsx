import { useState } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Zap, Shield, ArrowRight, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  fetchOwnerByCode,
  fetchOwnerByAnyCode,
  walletApi,
  type WalletOwnerType,
} from '@/lib/walletApi';

interface Props {
  /** When omitted, the page detects merchant vs earner from the code prefix. */
  ownerType?: WalletOwnerType;
}

const PRIVACY_POINTS = [
  'Read-only access — we can never move your funds',
  'No name, phone, or email required',
  'Your wallet address is never stored',
  'Transaction data is anonymised before storage',
  'Only you can see your individual dashboard',
  'Public data shows community totals only',
  'Disconnect at any time — all your data is deleted',
  'Open methodology — read how we calculate at bitcoincircular.com/methodology',
];

export default function ConnectWallet({ ownerType }: Props) {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const code = (params.code as string) || search.get('code') || '';
  const [apiKey, setApiKey] = useState('');
  const [lnAddress, setLnAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Either fixed-type lookup (legacy /merchant/connect, /earner/connect)
  // or auto-detect from code prefix (unified /connect).
  const lookup = useQuery({
    queryKey: ['wallet-owner-lookup', ownerType ?? 'auto', code],
    queryFn: async () => {
      if (!code) return null;
      if (ownerType) {
        const owner = await fetchOwnerByCode(ownerType, code);
        return owner ? { owner, owner_type: ownerType } : null;
      }
      return await fetchOwnerByAnyCode(code);
    },
    enabled: !!code,
  });

  const owner = lookup.data?.owner;
  const detectedType = lookup.data?.owner_type;
  const dashHref = `/connect/dashboard?code=${code}`;

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !detectedType) return;
    setSubmitting(true);
    try {
      await walletApi.connect({
        owner_type: detectedType,
        code,
        api_key: apiKey.trim(),
        ln_address: lnAddress.trim() || null,
      });
      toast({ title: 'Wallet connected', description: 'Your transactions are syncing now.' });
      navigate(dashHref);
    } catch (err: any) {
      toast({
        title: 'Could not connect',
        description: err.message || 'Please check your API key.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Missing connect code</CardTitle>
            <CardDescription>This page requires a unique link from your economy admin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (lookup.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!owner || !detectedType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid or unapproved link</CardTitle>
            <CardDescription>
              This connect link is not valid, or the submission hasn't been approved yet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const alreadyConnected = owner.wallet?.wallet_status === 'connected';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-xl w-full">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-score-amber">
            <Zap className="h-5 w-5" fill="currentColor" />
            <span className="text-sm font-medium uppercase tracking-wide">Connect your Blink wallet</span>
          </div>
          <CardTitle className="text-2xl">{owner.name}</CardTitle>
          <CardDescription>
            {owner.community_name} · {owner.community_city}, {owner.community_country}
            <br />
            {detectedType === 'merchant' ? 'Merchant ID' : 'Earner ID'}:{' '}
            <code className="text-xs">{code}</code>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 8-point privacy promise — Section 8 of the constitution */}
          <div className="rounded-md border bg-muted/30 p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Shield className="h-4 w-4 text-score-amber" /> Privacy promise
            </div>
            <ul className="space-y-2 text-muted-foreground">
              {PRIVACY_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-score-green mt-0.5 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {alreadyConnected ? (
            <div className="space-y-3">
              <div className="rounded-md border border-score-green/40 bg-score-green/10 p-4 text-sm">
                ✓ A wallet is already connected. Connecting again will replace the existing API key.
              </div>
              <Link to={dashHref}>
                <Button variant="outline" className="w-full">
                  View dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : null}

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_key">Your Blink read-only API key</Label>
              <Input
                id="api_key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="blink_..."
                required
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Get one at{' '}
                <a
                  href="https://dashboard.blink.sv/api"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  dashboard.blink.sv/api
                </a>{' '}
                with read-only scope.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ln">
                Lightning address <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="ln"
                value={lnAddress}
                onChange={(e) => setLnAddress(e.target.value)}
                placeholder="yourname@blink.sv"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Helps detect circular flows. Stored only as a SHA-256 hash.
              </p>
            </div>
            <Button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              className="w-full bg-score-amber text-background hover:bg-score-amber/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting…
                </>
              ) : (
                <>
                  Connect wallet <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
