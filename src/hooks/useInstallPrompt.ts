import { useCallback, useEffect, useState } from 'react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const KEY_SNOOZE = 'bc_install_snooze_until';
const KEY_PERMA = 'bc_install_dismissed';
const KEY_VISITS = 'bc_install_visits';
const KEY_FIRST = 'bc_install_first_visit';
const SHOW_DELAY_MS = 20_000;
const SNOOZE_DAYS = 14;

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
const isAndroid = /Android/.test(ua);
const isMobile = isIOS || isAndroid;
// iOS install only works in Safari (not Chrome/Firefox/in-app browsers)
const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line/.test(ua);

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  if ((window.navigator as any).standalone) return true;
  return false;
}

function snoozedNow() {
  const until = Number(localStorage.getItem(KEY_SNOOZE) || 0);
  return until > Date.now();
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isInIframe || isStandalone() || !isMobile) return;
    if (localStorage.getItem(KEY_PERMA) === '1') return;

    // bump visits
    try {
      const v = Number(localStorage.getItem(KEY_VISITS) || 0) + 1;
      localStorage.setItem(KEY_VISITS, String(v));
      if (!localStorage.getItem(KEY_FIRST)) {
        localStorage.setItem(KEY_FIRST, String(Date.now()));
      }
    } catch { /* ignore */ }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      localStorage.setItem(KEY_PERMA, '1');
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);

    const visits = Number(localStorage.getItem(KEY_VISITS) || 0);
    if (visits >= 2 && !snoozedNow()) {
      setReady(true);
    } else {
      const t = setTimeout(() => {
        if (!snoozedNow()) setReady(true);
      }, SHOW_DELAY_MS);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBIP);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptNative = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') {
      localStorage.setItem(KEY_PERMA, '1');
    } else {
      snooze(SNOOZE_DAYS);
    }
    setReady(false);
    return outcome;
  }, [deferred]);

  const snooze = useCallback((days = SNOOZE_DAYS) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(KEY_SNOOZE, String(until));
    setReady(false);
  }, []);

  const permanentlyDismiss = useCallback(() => {
    localStorage.setItem(KEY_PERMA, '1');
    setReady(false);
  }, []);

  const canPromptNative = !!deferred;
  const isIOSInstallable = isIOSSafari && !isStandalone();
  const shouldShow =
    ready &&
    !installed &&
    !isInIframe &&
    !isStandalone() &&
    (canPromptNative || isIOSInstallable);

  return { shouldShow, canPromptNative, isIOSInstallable, promptNative, snooze, permanentlyDismiss };
}
