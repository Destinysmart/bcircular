// Minimal client helpers for NIP-07 Nostr login.
// We never handle private keys — the browser extension signs.

export type NostrEvent = {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: Omit<NostrEvent, 'id' | 'sig'>) => Promise<NostrEvent>;
    };
  }
}

export function hasNip07(): boolean {
  return typeof window !== 'undefined' && !!window.nostr?.getPublicKey;
}

export function shortNpub(npub: string): string {
  if (!npub) return '';
  return npub.length > 16 ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub;
}
