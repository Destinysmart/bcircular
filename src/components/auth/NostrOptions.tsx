import { Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NostrAuthModal from './NostrAuthModal';

export const NostrOptions = ({ onEmailInstead }: { onEmailInstead?: () => void }) => {
  return (
    <div className="space-y-2">
      <NostrAuthModal
        onEmailInstead={onEmailInstead}
        trigger={
          <Button
            type="button"
            className="w-full rounded-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold h-11"
          >
            <Zap className="h-4 w-4 mr-2" /> Sign in with Nostr
          </Button>
        }
      />
      <p className="text-[11px] text-muted-foreground text-center inline-flex w-full items-center justify-center gap-1.5">
        <ShieldCheck className="h-3 w-3" /> Extension, existing key, or brand-new account — you pick.
      </p>
    </div>
  );
};

export default NostrOptions;
