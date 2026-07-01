import type { NostrCapableProvider } from './types';
import { signWithHexKey } from '@/lib/nostr/keys';

/** Local, in-memory nsec provider. Private key stays in this JS closure only. */
export function makeNsecProvider(privkeyHex: string, pubkeyHex: string): NostrCapableProvider {
  return {
    id: 'nsec',
    label: 'Local key (this device)',
    canSign: true,
    getPublicKey: async () => pubkeyHex,
    signEvent: async (tmpl) => signWithHexKey(privkeyHex, tmpl),
  };
}
