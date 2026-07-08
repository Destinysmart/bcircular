import { BunkerSigner, createNostrConnectURI } from 'nostr-tools/nip46';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import type { NostrCapableProvider } from './types';

const DEFAULT_RELAYS = ['wss://relay.nsec.app', 'wss://relay.damus.io'];

export type NostrConnectSession = {
  connectUri: string;
  /** Resolves when a remote signer connects. Rejects on timeout/cancel. */
  waitForSigner: Promise<NostrCapableProvider>;
  cancel: () => void;
};

/**
 * Starts a NIP-46 (Nostr Connect) client session. The returned URI must be
 * rendered as a QR code / deep link for the user to open in their mobile signer.
 * The ephemeral local key is used only for the encrypted transport with the
 * signer — it is NOT the user's identity key.
 */
export function createNostrConnectSession(
  clientMetadata: { name: string; url: string; image?: string } = {
    name: 'Bitcoin Circular',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://bitcoincircular.com',
  },
  relays: string[] = DEFAULT_RELAYS,
): NostrConnectSession {
  const localSecretKey = generateSecretKey();
  const clientPubkey = getPublicKey(localSecretKey);
  const secret = Math.random().toString(36).slice(2, 14);

  const connectUri = createNostrConnectURI({
    clientPubkey,
    relays,
    secret,
    name: clientMetadata.name,
    url: clientMetadata.url,
    image: clientMetadata.image,
  });

  const abort = new AbortController();

  const waitForSigner: Promise<NostrCapableProvider> = BunkerSigner.fromURI(
    localSecretKey,
    connectUri,
    {},
    abort.signal,
  ).then((bunker) => {
    const provider: NostrCapableProvider = {
      id: 'nip46',
      label: 'Nostr Connect (remote signer)',
      canSign: true,
      getPublicKey: () => bunker.getPublicKey(),
      signEvent: async (tmpl) => bunker.signEvent(tmpl as any) as any,
    };
    return provider;
  });

  return {
    connectUri,
    waitForSigner,
    cancel: () => abort.abort(),
  };
}
