import type { NostrCapableProvider } from './types';

/** Read-only identity. Cannot sign, so cannot prove ownership. */
export function makeNpubProvider(pubkeyHex: string): NostrCapableProvider {
  return {
    id: 'npub',
    label: 'Read-only npub',
    canSign: false,
    getPublicKey: async () => pubkeyHex,
    signEvent: null,
  };
}
