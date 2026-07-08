import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Copy, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createNostrConnectSession, type NostrConnectSession } from '@/lib/auth/providers/nip46';
import { loginWithNostrProvider } from '@/lib/nostr/loginFlow';

export const NostrConnectQR = ({ onBack, onDone }: { onBack: () => void; onDone: () => void }) => {
  const { toast } = useToast();
  const [session, setSession] = useState<NostrConnectSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'signing' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const s = createNostrConnectSession();
    setSession(s);
    (async () => {
      try {
        const provider = await s.waitForSigner;
        setStatus('signing');
        await loginWithNostrProvider(provider);
        onDone();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        if (/abort/i.test(msg)) return;
        setStatus('error');
        setErrorMsg(msg);
      }
    })();
    return () => { s.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.connectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: 'Copied', description: 'Paste it into your signer app.' });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>

      <div className="rounded-2xl border border-border bg-white p-4 flex items-center justify-center">
        {session ? (
          <QRCodeSVG value={session.connectUri} size={220} level="M" includeMargin={false} />
        ) : (
          <div className="h-[220px] w-[220px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Scan to sign in</p>
        <p className="text-xs text-muted-foreground">
          Open Amber, nsec.app, or your Nostr signer and scan this code.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground inline-flex items-center gap-2 w-full justify-center">
        {status === 'waiting' && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for signer to connect…</>)}
        {status === 'signing' && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing challenge…</>)}
        {status === 'error' && (<span className="text-destructive">{errorMsg}</span>)}
      </div>

      <Button variant="outline" className="w-full" onClick={copy} disabled={!session}>
        {copied ? <><Check className="h-4 w-4 mr-2" /> Copied</> : <><Copy className="h-4 w-4 mr-2" /> Copy connection link</>}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center inline-flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3 w-3" /> Your private key never leaves your device.
      </p>
    </div>
  );
};

export default NostrConnectQR;
