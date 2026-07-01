/**
 * Modular auth provider interface. New identity methods (NIP-46, NIP-05,
 * Lightning-address, wallet-auth) plug in here without touching the UI.
 */
import type { NostrEvent } from '@/lib/nostr/keys';

export type ProviderId = 'nip07' | 'nsec' | 'npub' | 'nip46' | 'email';

export interface NostrCapableProvider {
  id: ProviderId;
  /** Human label for UI. */
  label: string;
  /** Returns hex64 pubkey. Throws if unavailable. */
  getPublicKey(): Promise<string>;
  /** Signs a Nostr event. `null` for read-only providers. */
  signEvent: null | ((template: Omit<NostrEvent, 'id' | 'sig'>) => Promise<NostrEvent>);
  /** Read-only providers cannot prove ownership. */
  canSign: boolean;
}
