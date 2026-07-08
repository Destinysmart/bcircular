import { nip19 } from 'nostr-tools';

export type NostrEvent = {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

export function decodeNpub(npub: string): { pubkeyHex: string; npub: string } {
  const d = nip19.decode(npub.trim());
  if (d.type !== 'npub') throw new Error('Not a valid npub key');
  return { pubkeyHex: d.data as string, npub: nip19.npubEncode(d.data as string) };
}

export function shortNpub(npub: string): string {
  if (!npub) return '';
  return npub.length > 16 ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub;
}

export function pubkeyToNpub(pubkeyHex: string): string {
  return nip19.npubEncode(pubkeyHex);
}
