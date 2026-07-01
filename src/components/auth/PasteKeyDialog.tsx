import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { decodeNsec, decodeNpub } from '@/lib/nostr/keys';
import { makeNsecProvider } from '@/lib/auth/providers/nsec';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';
import { saveVault } from '@/lib/nostr/localVault';

export const PasteKeyDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [savePassphrase, setSavePassphrase] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  const handle = async () => {
    const v = value.trim();
    if (!v.startsWith('nsec1') && !v.startsWith('npub1')) {
      toast({
        title: 'That doesn\'t look like a Nostr key',
        description: 'Expected a key starting with nsec1… (private) or npub1… (public).',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      if (v.startsWith('nsec1')) {
        const { privkeyHex, pubkeyHex, npub } = decodeNsec(v);
        const provider = makeNsecProvider(privkeyHex, pubkeyHex);
        await loginWithNostrProvider(provider);
        if (savePassphrase && passphrase.length >= 6) {
          await saveVault(privkeyHex, pubkeyHex, npub, passphrase);
        }
        toast({ title: 'Signed in with Nostr', description: 'Welcome back.' });
        navigate(redirectTo, { replace: true });
      } else {
        decodeNpub(v);
        toast({
          title: 'Read-only npub',
          description: 'You can browse but not act. Add a signer (extension or nsec) to unlock actions.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Paste an existing Nostr key
          </DialogTitle>
          <DialogDescription>
            We support <span className="font-mono">nsec1…</span> (signs on this device only) or{' '}
            <span className="font-mono">npub1…</span> (read-only).
            <span className="block mt-1 text-foreground">Your nsec never leaves your browser.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Key</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                placeholder="nsec1… or npub1…"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="pr-10 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {value.trim().startsWith('nsec1') && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={savePassphrase}
                  onChange={e => setSavePassphrase(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Remember this key on this device (encrypted with a passphrase).
                  You'll need the passphrase to sign in later without your key.
                </span>
              </label>
              {savePassphrase && (
                <Input
                  type="password"
                  placeholder="Passphrase (min 6 chars)"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  minLength={6}
                />
              )}
            </div>
          )}

          <Button onClick={handle} disabled={loading || !value.trim()} className="w-full rounded-full">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing…</> : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasteKeyDialog;
