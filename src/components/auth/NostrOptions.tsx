import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Sparkles, KeyRound, Loader2, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { hasNip07, nip07Provider } from '@/lib/auth/providers/nip07';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';
import CreateNostrIdentity from './CreateNostrIdentity';
import PasteKeyDialog from './PasteKeyDialog';

export const NostrOptions = () => {
  const [loading, setLoading] = useState(false);
  const [showNoExt, setShowNoExt] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNip07 = async () => {
    if (!hasNip07()) {
      setShowNoExt(true);
      return;
    }
    setLoading(true);
    try {
      await loginWithNostrProvider(nip07Provider);
      toast({ title: 'Signed in with Nostr', description: 'Welcome back.' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      const friendly = /reject|denied|cancel/i.test(msg)
        ? 'Signature request cancelled. Approve it in your Nostr extension to continue.'
        : msg;
      toast({ title: 'Sign-in failed', description: friendly, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Primary: NIP-07 extension */}
      <Button
        type="button"
        onClick={handleNip07}
        disabled={loading}
        className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold h-11"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing…</>
        ) : (
          <><Zap className="h-4 w-4 mr-2" /> Continue with Nostr</>
        )}
      </Button>

      {/* Secondary: create identity */}
      <CreateNostrIdentity
        trigger={
          <Button variant="outline" className="w-full rounded-full h-11 border-score-amber/40 hover:border-score-amber hover:bg-score-amber/5">
            <Sparkles className="h-4 w-4 mr-2 text-score-amber" /> Create a new Nostr identity
          </Button>
        }
      />

      {/* Tertiary: paste key */}
      <PasteKeyDialog
        trigger={
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 pt-0.5"
          >
            <KeyRound className="h-3 w-3" /> I have a Nostr key (nsec or npub)
          </button>
        }
      />

      {/* No-extension sheet — friendly, not an error */}
      <Sheet open={showNoExt} onOpenChange={setShowNoExt}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" /> No Nostr extension detected
            </SheetTitle>
            <SheetDescription>
              A Nostr signer lets you log in without passwords, on any Nostr app. It takes a minute to set up.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <a
              href="https://getalby.com"
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-border p-3 hover:border-score-amber/50 hover:bg-score-amber/5 transition"
            >
              <div className="text-sm font-semibold">Install Alby</div>
              <div className="text-xs text-muted-foreground">Popular Lightning + Nostr browser extension.</div>
            </a>
            <a
              href="https://github.com/fiatjaf/nos2x"
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-border p-3 hover:border-score-amber/50 hover:bg-score-amber/5 transition"
            >
              <div className="text-sm font-semibold">Install nos2x</div>
              <div className="text-xs text-muted-foreground">Minimal, open-source Nostr signer.</div>
            </a>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground py-2">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <CreateNostrIdentity
              trigger={
                <Button variant="outline" className="w-full">
                  <Sparkles className="h-4 w-4 mr-2 text-score-amber" /> Create one right here in your browser
                </Button>
              }
            />
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowNoExt(false)}>
              I'll use email instead
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default NostrOptions;
