import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { hasNip07 } from '@/lib/nostr';

export const NostrLoginButton = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!hasNip07()) {
      toast({
        title: 'No Nostr extension found',
        description: 'Install a NIP-07 extension like Alby or nos2x, then try again.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const pubkey = await window.nostr!.getPublicKey();

      const { data: chData, error: chErr } = await supabase.functions.invoke('nostr-auth-challenge', {
        body: { pubkey },
      });
      if (chErr || !chData?.challenge) throw chErr ?? new Error('Failed to get challenge');
      const challenge: string = chData.challenge;

      const unsigned = {
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 27235,
        tags: [
          ['challenge', challenge],
          ['u', window.location.origin],
          ['method', 'POST'],
        ],
        content: `Sign in to Bitcoin Circular\n${window.location.origin}\nchallenge:${challenge}`,
      };
      const signed = await window.nostr!.signEvent(unsigned);

      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('nostr-auth-verify', {
        body: { event: signed, challenge },
      });
      if (verifyErr || !verifyData?.access_token) throw verifyErr ?? new Error('Verification failed');

      const { error: sessErr } = await supabase.auth.setSession({
        access_token: verifyData.access_token,
        refresh_token: verifyData.refresh_token,
      });
      if (sessErr) throw sessErr;

      toast({ title: 'Signed in with Nostr', description: 'Welcome back.' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nostr login failed';
      toast({ title: 'Login failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing…</>
        ) : (
          <><Zap className="h-4 w-4 mr-2" /> Continue with Nostr</>
        )}
      </Button>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> No email · No tracking
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="underline underline-offset-2 hover:text-foreground">
              What is Nostr?
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Sign in with Nostr</SheetTitle>
              <SheetDescription>
                Portable, decentralized identity. Your keys, your account — no email required.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <div className="text-foreground font-medium mb-1">How it works</div>
                We ask your Nostr browser extension (Alby, nos2x, Flamingo, etc.) to sign a
                one-time challenge. We verify the signature and log you in.
              </div>
              <div>
                <div className="text-foreground font-medium mb-1">What we store</div>
                Only a <span className="font-mono">SHA-256 hash</span> of your public key.
                Never your private key. Never your npub in raw form. No email, no phone, no name.
              </div>
              <div>
                <div className="text-foreground font-medium mb-1">Don't have a Nostr extension?</div>
                Install <a href="https://getalby.com" target="_blank" rel="noreferrer" className="text-primary underline">Alby</a>{' '}
                or <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noreferrer" className="text-primary underline">nos2x</a>,
                generate a key, then come back here.
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                Bitcoin transaction data can be used for surveillance. We treat Nostr identity
                the same way we treat wallet data: minimum footprint, opt-out anytime, delete on disconnect.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default NostrLoginButton;
