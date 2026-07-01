import type { NostrCapableProvider } from './types';

/**
 * NIP-46 (bunker://) — remote signer support.
 * Stub interface: implement the Nostr Connect handshake here to allow
 * signing via a remote signer (Nsec.app, Amber, etc.) without exposing keys.
 */
export function makeNip46Provider(_bunkerUri: string): NostrCapableProvider {
  throw new Error('NIP-46 remote signer support is coming soon.');
}
