import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const KEY = 'bc:transparency-banner-dismissed';

const TransparencyBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, '1');
    setShow(false);
  };

  return (
    <div className="border-b border-border bg-score-amber/5">
      <div className="container py-2.5 flex items-start sm:items-center gap-3 text-xs sm:text-sm">
        <Sparkles className="h-4 w-4 text-score-amber shrink-0 mt-0.5 sm:mt-0" />
        <p className="flex-1 text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Early-stage experiment.</span>{' '}
          Exploring better ways to visualize Bitcoin circular economy activity while respecting privacy and consent.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 -m-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TransparencyBanner;
