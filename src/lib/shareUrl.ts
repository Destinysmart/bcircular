/**
 * Canonical share-URL helpers.
 *
 * Claim / connect links are sent to merchants and earners via WhatsApp, email,
 * etc. They MUST always be `https://bitcoincircular.com/...` so that:
 *   - they don't trigger browser HTTP-warning UI,
 *   - they don't leak preview URLs (`*.lovable.app`) into the wild,
 *   - they keep working when the admin happens to copy from a dev preview.
 *
 * Use these helpers anywhere a URL will be shared with someone outside the
 * current browser session.
 */

const PROD_HOSTS = new Set(['bitcoincircular.com', 'www.bitcoincircular.com']);
const PROD_ORIGIN = 'https://bitcoincircular.com';

export function canonicalOrigin(): string {
  if (typeof window === 'undefined') return PROD_ORIGIN;
  if (PROD_HOSTS.has(window.location.hostname)) return window.location.origin;
  return PROD_ORIGIN;
}

/** Build a fully-qualified shareable URL from a path like `/connect?code=…`. */
export function shareUrl(path: string): string {
  const base = canonicalOrigin();
  if (!path) return base;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
