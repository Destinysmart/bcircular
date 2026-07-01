import { generateSecretKey, getPublicKey, finalizeEvent, nip19 } from 'nostr-tools';
import { decrypt as nip49decrypt, encrypt as nip49encrypt } from 'nostr-tools/nip49';

const bytesToHex = (b: Uint8Array): string =>
  Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.length % 2 ? '0' + hex : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export type NostrEvent = {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

export type GeneratedIdentity = {
  privkeyHex: string;
  pubkeyHex: string;
  nsec: string;
  npub: string;
};

export function generateIdentity(): GeneratedIdentity {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return {
    privkeyHex: bytesToHex(sk),
    pubkeyHex: pk,
    nsec: nip19.nsecEncode(sk),
    npub: nip19.npubEncode(pk),
  };
}

export function decodeNsec(nsec: string): { privkeyHex: string; pubkeyHex: string; npub: string } {
  const d = nip19.decode(nsec.trim());
  if (d.type !== 'nsec') throw new Error('Not a valid nsec key');
  const sk = d.data as Uint8Array;
  const pk = getPublicKey(sk);
  return { privkeyHex: bytesToHex(sk), pubkeyHex: pk, npub: nip19.npubEncode(pk) };
}

export function decodeNcryptsec(ncryptsec: string, passphrase: string): { privkeyHex: string; pubkeyHex: string; npub: string; nsec: string } {
  const sk = nip49decrypt(ncryptsec.trim(), passphrase);
  const pk = getPublicKey(sk);
  return {
    privkeyHex: bytesToHex(sk),
    pubkeyHex: pk,
    npub: nip19.npubEncode(pk),
    nsec: nip19.nsecEncode(sk),
  };
}

export function encodeNcryptsec(privkeyHex: string, passphrase: string): string {
  return nip49encrypt(hexToBytes(privkeyHex), passphrase);
}

export function decodeNpub(npub: string): { pubkeyHex: string; npub: string } {
  const d = nip19.decode(npub.trim());
  if (d.type !== 'npub') throw new Error('Not a valid npub key');
  return { pubkeyHex: d.data as string, npub: d.data && nip19.npubEncode(d.data as string) };
}

export function signWithHexKey(privkeyHex: string, template: Omit<NostrEvent, 'id' | 'sig'>): NostrEvent {
  const sk = hexToBytes(privkeyHex);
  return finalizeEvent(template as any, sk) as unknown as NostrEvent;
}

export function shortNpub(npub: string): string {
  if (!npub) return '';
  return npub.length > 16 ? `${npub.slice(0, 10)}…${npub.slice(-4)}` : npub;
}

export function pubkeyToNpub(pubkeyHex: string): string {
  return nip19.npubEncode(pubkeyHex);
}
