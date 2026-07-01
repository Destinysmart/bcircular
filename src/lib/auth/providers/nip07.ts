import type { NostrCapableProvider } from './types';

export function hasNip07(): boolean {
  return typeof window !== 'undefined' && !!(window as any).nostr?.getPublicKey;
}

export const nip07Provider: NostrCapableProvider = {
  id: 'nip07',
  label: 'Browser extension',
  canSign: true,
  async getPublicKey() {
    if (!hasNip07()) throw new Error('No Nostr extension found');
    return (window as any).nostr.getPublicKey();
  },
  signEvent: async (tmpl) => {
    if (!hasNip07()) throw new Error('No Nostr extension found');
    return (window as any).nostr.signEvent(tmpl);
  },
};
