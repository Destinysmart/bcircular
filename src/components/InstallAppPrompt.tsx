import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import circularLogo from '@/assets/circular-logo.png';

const InstallAppPrompt = () => {
  const { shouldShow, canPromptNative, isIOSInstallable, promptNative, snooze, permanentlyDismiss } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);

  const onInstall = async () => {
    if (canPromptNative) {
      await promptNative();
    } else if (isIOSInstallable) {
      setIosOpen(true);
    }
  };

  return (
    <>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-x-3 bottom-3 z-[60] md:left-auto md:right-4 md:bottom-4 md:max-w-sm"
            role="dialog"
            aria-label="Install Bitcoin Circular"
          >
            <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3 pr-10 shadow-2xl">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-background flex items-center justify-center overflow-hidden">
                <img src={circularLogo} alt="" className="h-9 w-9 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground leading-tight">
                  Install Bitcoin Circular
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  One tap from your home screen.
                </div>
              </div>
              <Button
                size="sm"
                onClick={onInstall}
                className="bg-score-amber text-background hover:bg-score-amber/90 font-semibold gap-1.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </Button>
              <button
                onClick={() => snooze()}
                aria-label="Dismiss"
                className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Home Screen</DialogTitle>
            <DialogDescription>
              Install Bitcoin Circular on your iPhone in 3 quick steps.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 mt-2">
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-score-amber/15 text-score-amber font-semibold text-sm flex items-center justify-center">1</span>
              <div className="text-sm text-foreground leading-snug">
                Tap the <Share className="inline h-4 w-4 mx-0.5 -mt-0.5 text-primary" /> <span className="font-medium">Share</span> icon in Safari's bottom toolbar.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-score-amber/15 text-score-amber font-semibold text-sm flex items-center justify-center">2</span>
              <div className="text-sm text-foreground leading-snug">
                Scroll down and tap <PlusSquare className="inline h-4 w-4 mx-0.5 -mt-0.5 text-primary" /> <span className="font-medium">Add to Home Screen</span>.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full bg-score-amber/15 text-score-amber font-semibold text-sm flex items-center justify-center">3</span>
              <div className="text-sm text-foreground leading-snug">
                Tap <span className="font-medium">Add</span> — the Circular icon will appear on your home screen.
              </div>
            </li>
          </ol>
          <div className="flex items-center justify-between gap-2 mt-4">
            <button
              onClick={() => { permanentlyDismiss(); setIosOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Don't show again
            </button>
            <Button
              size="sm"
              onClick={() => { snooze(); setIosOpen(false); }}
              className="bg-score-amber text-background hover:bg-score-amber/90 font-semibold"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppPrompt;
