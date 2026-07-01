import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Copy, Download, Eye, EyeOff, Loader2, ShieldAlert, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateIdentity } from '@/lib/nostr/keys';
import { makeNsecProvider } from '@/lib/auth/providers/nsec';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';
import { saveVault } from '@/lib/nostr/localVault';

export const CreateNostrIdentity = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [showNsec, setShowNsec] = useState(false);
  const [acked, setAcked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedNsec, setCopiedNsec] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const identity = useMemo(() => (open ? generateIdentity() : null), [open]);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  const copy = async (text: string, which: 'nsec' | 'npub') => {
    await navigator.clipboard.writeText(text);
    if (which === 'nsec') { setCopiedNsec(true); setTimeout(() => setCopiedNsec(false), 1500); }
    else { setCopiedNpub(true); setTimeout(() => setCopiedNpub(false), 1500); }
  };

  const download = () => {
    if (!identity) return;
    const body = [
      'Bitcoin Circular — Nostr Identity Backup',
      `Created: ${new Date().toISOString()}`,
      '',
      `PUBLIC KEY (npub) — safe to share:`,
      identity.npub,
      '',
      `PRIVATE KEY (nsec) — NEVER SHARE. Store like a seed phrase.`,
      identity.nsec,
      '',
      'Whoever has this nsec controls this identity. Bitcoin Circular cannot recover it.',
    ].join('\n');
    const blob = new Blob([body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nostr-backup-${identity.npub.slice(0, 12)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleContinue = async () => {
    if (!identity || !acked) return;
    setLoading(true);
    try {
      const provider = makeNsecProvider(identity.privkeyHex, identity.pubkeyHex);
      await loginWithNostrProvider(provider);
      if (passphrase.length >= 6) {
        await saveVault(identity.privkeyHex, identity.pubkeyHex, identity.npub, passphrase);
      }
      toast({ title: 'Your Nostr identity is ready', description: 'Welcome to Bitcoin Circular.' });
      navigate('/onboarding?redirect=' + encodeURIComponent(redirectTo), { replace: true });
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAcked(false); setPassphrase(''); setShowNsec(false); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-score-amber" /> Your new Nostr identity
          </DialogTitle>
          <DialogDescription>
            Generated in your browser. We never see your private key.
          </DialogDescription>
        </DialogHeader>

        {identity && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5 text-destructive font-semibold mb-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Back this up now
              </div>
              <p className="text-muted-foreground">
                Your private key <span className="font-mono">nsec</span> IS your account. Anyone with it can control it.
                <span className="text-foreground"> Bitcoin Circular cannot recover it for you.</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Public key (npub) — safe to share</Label>
              <div className="flex gap-2">
                <Input readOnly value={identity.npub} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => copy(identity.npub, 'npub')}>
                  {copiedNpub ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-destructive">Private key (nsec) — NEVER SHARE</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={showNsec ? 'text' : 'password'}
                  value={identity.nsec}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowNsec(s => !s)}>
                  {showNsec ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => copy(identity.nsec, 'nsec')}>
                  {copiedNsec ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={download} className="w-full">
              <Download className="h-4 w-4 mr-2" /> Download backup file
            </Button>

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <Label className="text-xs">Optional: remember key on this device</Label>
              <p className="text-[11px] text-muted-foreground">
                We'll encrypt it with a passphrase you type each time you sign in on this device.
                Leave blank to skip — but keep your nsec backed up.
              </p>
              <Input
                type="password"
                placeholder="Passphrase (min 6 chars, optional)"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={acked}
                onChange={e => setAcked(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                I've safely stored my private key. I understand it cannot be recovered.
              </span>
            </label>

            <Button
              onClick={handleContinue}
              disabled={!acked || loading}
              className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting up…</> : 'Continue'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateNostrIdentity;
