import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldCheck } from 'lucide-react';

export const WhatIsNostr = ({ trigger }: { trigger: React.ReactNode }) => (
  <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-score-amber" /> What is Nostr?
        </DialogTitle>
        <DialogDescription>An open identity protocol you actually own.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Nostr is an open identity protocol. Your account belongs to you, not to this website —
          the same identity works across Nostr apps like Primal, Damus, and Amethyst.
        </p>
        <p>
          We never see or store your private key. You always sign in using an app or extension
          you control — a browser extension on desktop, or a signer app on your phone.
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
          Your private key never touches Bitcoin Circular's servers or browser storage.
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default WhatIsNostr;
