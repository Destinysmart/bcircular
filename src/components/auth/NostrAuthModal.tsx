import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap, Sparkles, KeyRound, Puzzle, Radio, Loader2, ShieldCheck, ShieldAlert,
  Copy, Download, Eye, EyeOff, Check, ArrowLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { hasNip07, nip07Provider } from '@/lib/auth/providers/nip07';
import { makeNsecProvider } from '@/lib/auth/providers/nsec';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';
import { generateIdentity, decodeNsec, decodeNcryptsec } from '@/lib/nostr/keys';
import { saveVault } from '@/lib/nostr/localVault';

type View = 'menu' | 'extension' | 'existing' | 'create';

export const NostrAuthModal = ({
  trigger,
  onEmailInstead,
}: {
  trigger: React.ReactNode;
  onEmailInstead?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const reset = () => { setView('menu'); setLoading(false); };
  const close = () => { setOpen(false); setTimeout(reset, 200); };

  const afterLogin = (msg = 'Welcome back.') => {
    toast({ title: 'Signed in with Nostr', description: msg });
    close();
    navigate(redirectTo, { replace: true });
  };
  const afterCreate = () => {
    toast({ title: 'Your Nostr identity is ready', description: 'Welcome aboard.' });
    close();
    navigate('/onboarding?redirect=' + encodeURIComponent(redirectTo), { replace: true });
  };

  // ---------- extension ----------
  const handleExtension = async () => {
    if (!hasNip07()) { setView('extension'); return; }
    setLoading(true);
    try {
      await loginWithNostrProvider(nip07Provider);
      afterLogin();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast({
        title: 'Sign-in failed',
        description: /reject|denied|cancel/i.test(msg) ? 'Approve the signature request in your extension to continue.' : msg,
        variant: 'destructive',
      });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto p-0">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <button
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground -ml-1 p-1"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-score-amber" />
                {view === 'menu' && 'Sign in'}
                {view === 'extension' && 'No signer detected'}
                {view === 'existing' && 'Use existing Nostr account'}
                {view === 'create' && 'Create a new Nostr account'}
              </DialogTitle>
            </div>
            <DialogDescription>
              {view === 'menu' && 'Choose how you want to sign in. Your keys, your account — no email required.'}
              {view === 'extension' && 'Install a Nostr signer, paste an existing key, or create a new account.'}
              {view === 'existing' && 'nsec, ncryptsec, or connect a remote signer via NIP-46. Your key never leaves this browser.'}
              {view === 'create' && 'Generated in your browser. We never see your private key.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {view === 'menu' && (
            <MenuView
              loading={loading}
              onExtension={handleExtension}
              onExisting={() => setView('existing')}
              onCreate={() => setView('create')}
              onEmail={() => { close(); onEmailInstead?.(); }}
            />
          )}
          {view === 'extension' && <NoExtensionView onExisting={() => setView('existing')} onCreate={() => setView('create')} onEmail={() => { close(); onEmailInstead?.(); }} />}
          {view === 'existing' && <ExistingView onDone={afterLogin} />}
          {view === 'create' && <CreateView onDone={afterCreate} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================== Menu ==============================

const MenuView = ({
  loading, onExtension, onExisting, onCreate, onEmail,
}: {
  loading: boolean;
  onExtension: () => void;
  onExisting: () => void;
  onCreate: () => void;
  onEmail: () => void;
}) => (
  <div className="space-y-2">
    <MethodCard
      icon={<Puzzle className="h-5 w-5 text-score-amber" />}
      title="Continue with Nostr extension"
      subtitle="Alby, nos2x, Flamingo — most secure. Recommended."
      badge="Recommended"
      onClick={onExtension}
      loading={loading}
    />
    <MethodCard
      icon={<KeyRound className="h-5 w-5" />}
      title="Use existing Nostr account"
      subtitle="Paste nsec, ncryptsec, or connect a remote signer (NIP-46)."
      onClick={onExisting}
    />
    <MethodCard
      icon={<Sparkles className="h-5 w-5 text-score-amber" />}
      title="Create a new Nostr account"
      subtitle="Generate a key pair in your browser — 30 seconds."
      onClick={onCreate}
    />
    <MethodCard
      icon={<Mail className="h-5 w-5" />}
      title="Continue with email"
      subtitle="Traditional email + password. You can add Nostr later."
      onClick={onEmail}
    />
    <p className="text-[11px] text-muted-foreground pt-2 inline-flex items-center gap-1.5">
      <ShieldCheck className="h-3 w-3" /> Private keys never leave your browser.
    </p>
  </div>
);

const MethodCard = ({
  icon, title, subtitle, badge, onClick, loading,
}: {
  icon: React.ReactNode; title: string; subtitle: string; badge?: string; onClick: () => void; loading?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full text-left rounded-xl border border-border hover:border-score-amber/60 hover:bg-score-amber/[0.03] transition p-3 flex items-center gap-3 disabled:opacity-60"
  >
    <div className="shrink-0 rounded-lg border border-border bg-muted/40 p-2">
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold truncate">{title}</div>
        {badge && <span className="text-[10px] font-medium uppercase tracking-wider text-score-amber bg-score-amber/10 px-1.5 py-0.5 rounded">{badge}</span>}
      </div>
      <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
  </button>
);

// ============================== No extension ==============================

const NoExtensionView = ({
  onExisting, onCreate, onEmail,
}: { onExisting: () => void; onCreate: () => void; onEmail: () => void }) => (
  <div className="space-y-3">
    <a href="https://getalby.com" target="_blank" rel="noreferrer"
       className="block rounded-lg border border-border p-3 hover:border-score-amber/50 hover:bg-score-amber/5 transition">
      <div className="text-sm font-semibold">Install Alby</div>
      <div className="text-xs text-muted-foreground">Lightning + Nostr browser extension.</div>
    </a>
    <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noreferrer"
       className="block rounded-lg border border-border p-3 hover:border-score-amber/50 hover:bg-score-amber/5 transition">
      <div className="text-sm font-semibold">Install nos2x</div>
      <div className="text-xs text-muted-foreground">Minimal, open-source signer.</div>
    </a>
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground py-1">
      <div className="flex-1 h-px bg-border" /><span>or</span><div className="flex-1 h-px bg-border" />
    </div>
    <Button variant="outline" className="w-full" onClick={onExisting}>
      <KeyRound className="h-4 w-4 mr-2" /> I already have a Nostr key
    </Button>
    <Button variant="outline" className="w-full" onClick={onCreate}>
      <Sparkles className="h-4 w-4 mr-2 text-score-amber" /> Create one right here
    </Button>
    <Button variant="ghost" className="w-full text-muted-foreground" onClick={onEmail}>
      Use email instead
    </Button>
  </div>
);

// ============================== Existing ==============================

type ExistingTab = 'nsec' | 'ncryptsec' | 'nip46';

const ExistingView = ({ onDone }: { onDone: () => void }) => {
  const [tab, setTab] = useState<ExistingTab>('nsec');
  const [value, setValue] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [remember, setRemember] = useState(true);
  const [rememberPass, setRememberPass] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    const v = value.trim();
    setLoading(true);
    try {
      if (tab === 'nsec') {
        if (!v.startsWith('nsec1')) throw new Error('Expected an nsec1… private key.');
        const { privkeyHex, pubkeyHex, npub } = decodeNsec(v);
        await loginWithNostrProvider(makeNsecProvider(privkeyHex, pubkeyHex));
        if (remember && rememberPass.length >= 6) await saveVault(privkeyHex, pubkeyHex, npub, rememberPass);
        onDone();
      } else if (tab === 'ncryptsec') {
        if (!v.startsWith('ncryptsec1')) throw new Error('Expected an ncryptsec1… encrypted key.');
        if (!passphrase) throw new Error('Enter the passphrase used to encrypt this key.');
        const { privkeyHex, pubkeyHex, npub, nsec } = decodeNcryptsec(v, passphrase);
        await loginWithNostrProvider(makeNsecProvider(privkeyHex, pubkeyHex));
        if (remember && rememberPass.length >= 6) await saveVault(privkeyHex, pubkeyHex, npub, rememberPass);
        void nsec;
        onDone();
      } else {
        throw new Error('NIP-46 remote signer support is coming soon. Use an extension, nsec, or ncryptsec for now.');
      }
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border p-1 bg-muted/30">
        {(['nsec', 'ncryptsec', 'nip46'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setValue(''); setPassphrase(''); }}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition ${
              tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'nsec' ? 'nsec' : t === 'ncryptsec' ? 'ncryptsec' : 'Remote (NIP-46)'}
          </button>
        ))}
      </div>

      {tab === 'nip46' ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Radio className="h-4 w-4" /> Remote signer
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a <span className="font-mono">bunker://</span> or <span className="font-mono">nostrconnect://</span> URI from
            Nsec.app, Amber, or another NIP-46 signer.
          </p>
          <Input placeholder="bunker://…" value={value} onChange={e => setValue(e.target.value)} className="font-mono text-xs" />
          <p className="text-[11px] text-muted-foreground">
            Remote signing is currently in preview. You can still create or import an account below.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{tab === 'nsec' ? 'Private key (nsec)' : 'Encrypted key (ncryptsec)'}</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                placeholder={tab === 'nsec' ? 'nsec1…' : 'ncryptsec1…'}
                value={value}
                onChange={e => setValue(e.target.value)}
                className="pr-10 font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Stays in your browser. Never sent to our servers.
            </p>
          </div>

          {tab === 'ncryptsec' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Decryption passphrase</Label>
              <Input type="password" placeholder="Enter passphrase" value={passphrase} onChange={e => setPassphrase(e.target.value)} />
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="mt-0.5" />
              <span className="text-muted-foreground">
                Remember this key on this device (encrypted with a passphrase).
              </span>
            </label>
            {remember && (
              <Input
                type="password"
                placeholder="Device passphrase (min 6 chars)"
                value={rememberPass}
                onChange={e => setRememberPass(e.target.value)}
                minLength={6}
              />
            )}
          </div>
        </>
      )}

      <Button
        onClick={submit}
        disabled={loading || (tab !== 'nip46' && !value.trim()) || (tab === 'ncryptsec' && !passphrase)}
        className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold"
      >
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing…</> : 'Sign in'}
      </Button>
    </div>
  );
};

// ============================== Create ==============================

const CreateView = ({ onDone }: { onDone: () => void }) => {
  const identity = useMemo(() => generateIdentity(), []);
  const [showNsec, setShowNsec] = useState(false);
  const [acked, setAcked] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [copiedNsec, setCopiedNsec] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const copy = async (text: string, which: 'nsec' | 'npub') => {
    await navigator.clipboard.writeText(text);
    if (which === 'nsec') { setCopiedNsec(true); setTimeout(() => setCopiedNsec(false), 1500); }
    else { setCopiedNpub(true); setTimeout(() => setCopiedNpub(false), 1500); }
  };

  const download = () => {
    const body = [
      'Bitcoin Circular — Nostr Identity Backup',
      `Created: ${new Date().toISOString()}`,
      '',
      'PUBLIC KEY (npub) — safe to share:',
      identity.npub,
      '',
      'PRIVATE KEY (nsec) — NEVER SHARE. Store like a seed phrase.',
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

  const submit = async () => {
    if (!acked) return;
    setLoading(true);
    try {
      await loginWithNostrProvider(makeNsecProvider(identity.privkeyHex, identity.pubkeyHex));
      if (passphrase.length >= 6) {
        await saveVault(identity.privkeyHex, identity.pubkeyHex, identity.npub, passphrase);
      }
      onDone();
    } catch (err) {
      toast({ title: 'Sign-in failed', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed">
        <div className="flex items-center gap-1.5 text-destructive font-semibold mb-1">
          <ShieldAlert className="h-3.5 w-3.5" /> Back this up now — shown once
        </div>
        <p className="text-muted-foreground">
          Your <span className="font-mono">nsec</span> IS your account.
          <span className="text-foreground"> We cannot recover it for you.</span>
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
          <Input readOnly type={showNsec ? 'text' : 'password'} value={identity.nsec} className="font-mono text-xs" />
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
          Encrypted with your passphrase. Leave blank to skip.
        </p>
        <Input type="password" placeholder="Passphrase (min 6 chars, optional)"
          value={passphrase} onChange={e => setPassphrase(e.target.value)} />
      </div>

      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={acked} onChange={e => setAcked(e.target.checked)} className="mt-0.5" />
        <span className="text-muted-foreground">
          I've safely stored my private key. I understand it cannot be recovered.
        </span>
      </label>

      <Button onClick={submit} disabled={!acked || loading}
        className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting up…</> : 'Create account'}
      </Button>
    </div>
  );
};

export default NostrAuthModal;
