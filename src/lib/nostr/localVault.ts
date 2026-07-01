/**
 * Encrypts a Nostr nsec locally so the browser can sign login challenges
 * without a NIP-07 extension. Key derives from a user passphrase via PBKDF2.
 * The private key NEVER leaves this device.
 */

const STORAGE_KEY = 'bc.nostr.vault.v1';
const PBKDF2_ITERS = 250_000;

type VaultBlob = {
  v: 1;
  salt: string;
  iv: string;
  ct: string;
  npub: string;
  pubkeyHex: string;
};

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt'],
  );
}

export async function saveVault(privkeyHex: string, pubkeyHex: string, npub: string, passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(privkeyHex));
  const blob: VaultBlob = { v: 1, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct), npub, pubkeyHex };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function hasVault(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function readVaultMeta(): { npub: string; pubkeyHex: string } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { const b = JSON.parse(raw) as VaultBlob; return { npub: b.npub, pubkeyHex: b.pubkeyHex }; }
  catch { return null; }
}

export async function unlockVault(passphrase: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('No local Nostr key on this device');
  const blob = JSON.parse(raw) as VaultBlob;
  const key = await deriveKey(passphrase, fromB64(blob.salt));
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.ct));
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error('Wrong passphrase');
  }
}

export function forgetVault() {
  localStorage.removeItem(STORAGE_KEY);
}
