import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';

export const NewToNostrPanel = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> New to Nostr? Read this first
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 text-[12px] text-muted-foreground leading-relaxed">
          <p>
            <span className="text-foreground font-medium">Nostr</span> is an open identity protocol.
            You control your account with a key pair — no company, no email required.
          </p>
          <p>
            <span className="font-mono text-foreground">npub</span> is your public name — safe to share.{' '}
            <span className="font-mono text-foreground">nsec</span> is your private key — treat it like a seed phrase.
            <span className="text-foreground"> Never share it. Never paste it into random websites.</span>
          </p>
          <p>
            Unlike email/password, no server ever sees your secret. You sign a one-time challenge
            with your key, and we verify the signature. That's the whole login.
          </p>
        </div>
      )}
    </div>
  );
};

export default NewToNostrPanel;
