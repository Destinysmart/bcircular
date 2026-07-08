import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Puzzle, Smartphone, Loader2, ShieldCheck, ChevronRight, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { hasNip07, nip07Provider } from '@/lib/auth/providers/nip07';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';
import NostrConnectQR from './NostrConnectQR';
import WhatIsNostr from './WhatIsNostr';

type View = 'menu' | 'qr';

/** Best-effort NIP-07 extension label. */
function detectExtensionName(): string {
  if (typeof window === 'undefined') return 'Browser Extension';
  const n = (window as any).nostr;
  if (!n) return 'Browser Extension';
  if ((window as any).alby || n._requestPermission) return 'Alby';
  if ((window as any).nos2x) return 'nos2x';
  if ((window as any).keysband || /keys\.?band/i.test(String(n?.name ?? ''))) return 'Keys.Band';
  return 'Browser Extension';
}

export const NostrAuthModal = ({
  trigger,
  onEmailInstead,
}: {
  trigger: React.ReactNode;
  onEmailInstead?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [loading, setLoading] = useState(false);
  const [extName, setExtName] = useState('Browser Extension');
  const [extAvailable, setExtAvailable] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setExtAvailable(hasNip07());
    setExtName(detectExtensionName());
  }, [open]);

  const close = () => { setOpen(false); setTimeout(() => { setView('menu'); setLoading(false); }, 200); };

  const done = () => {
    toast({ title: 'Signed in with Nostr', description: 'Welcome back.' });
    close();
    navigate(redirectTo, { replace: true });
  };

  const signInExtension = async () => {
    if (!hasNip07()) {
      toast({
        title: 'No extension detected',
        description: 'Install Alby or Keys.Band on desktop, or use "Scan with Nostr Connect" on mobile.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await loginWithNostrProvider(nip07Provider);
      done();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast({
        title: 'Sign-in failed',
        description: /reject|denied|cancel/i.test(msg)
          ? 'Approve the signature request in your extension to continue.'
          : msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 max-h-[92vh] overflow-y-auto">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-score-amber" /> Sign in with Nostr
            </DialogTitle>
            <DialogDescription>
              Your keys, your account — no email required. Your private key never touches
              Bitcoin Circular's servers or browser storage.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {view === 'menu' ? (
            <div className="space-y-5">
              {/* DESKTOP — extension */}
              <section className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                  Desktop
                </p>
                <button
                  type="button"
                  onClick={signInExtension}
                  disabled={loading}
                  className="w-full text-left rounded-xl border border-border hover:border-score-amber/70 hover:bg-score-amber/[0.04] transition p-3 flex items-center gap-3 disabled:opacity-60"
                >
                  <div className="shrink-0 rounded-lg bg-score-amber/15 p-2">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin text-score-amber" /> : <Puzzle className="h-5 w-5 text-score-amber" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      Continue with {extAvailable ? extName : 'Browser Extension'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {extAvailable ? 'Signer detected in this browser.' : 'Install Alby or Keys.Band to sign in on desktop.'}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
                {!extAvailable && (
                  <div className="flex gap-2 px-1 text-[11px] text-muted-foreground">
                    <a href="https://getalby.com" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Get Alby</a>
                    <span>·</span>
                    <a href="https://keys.band" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Get Keys.Band</a>
                  </div>
                )}
              </section>

              {/* MOBILE — nostr connect */}
              <section className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                  Mobile / no extension
                </p>
                <button
                  type="button"
                  onClick={() => setView('qr')}
                  className="w-full text-left rounded-xl border border-border hover:border-score-amber/70 hover:bg-score-amber/[0.04] transition p-3 flex items-center gap-3"
                >
                  <div className="shrink-0 rounded-lg bg-score-amber/15 p-2">
                    <Smartphone className="h-5 w-5 text-score-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">Scan with Nostr Connect</div>
                    <div className="text-xs text-muted-foreground">
                      Amber, nsec.app, or any NIP-46 signer. Key stays on your phone.
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </section>

              {/* Footer */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <WhatIsNostr
                    trigger={
                      <button type="button" className="text-muted-foreground hover:text-foreground underline underline-offset-2">
                        New to Nostr? Learn more →
                      </button>
                    }
                  />
                  {onEmailInstead && (
                    <button
                      type="button"
                      onClick={() => { close(); onEmailInstead(); }}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" /> Use email instead
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Your private key never touches our servers or browser storage.
                </p>
              </div>
            </div>
          ) : (
            <NostrConnectQR onBack={() => setView('menu')} onDone={done} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NostrAuthModal;
