/**
 * Translate raw API / Postgres / Blink errors into actionable, plain-English
 * messages for the user. Pattern-matches on common signatures we've seen
 * surface during wallet connect, claim, and sync flows.
 *
 * Use at the boundary (toast / inline badge), not inside individual try/catches.
 */

export interface FriendlyError {
  title: string;
  description: string;
  hint?: string;
}

function messageOf(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || '';
  if (typeof err === 'object') {
    const anyErr = err as any;
    return (
      anyErr.message ||
      anyErr.error?.message ||
      anyErr.error ||
      (typeof anyErr === 'object' ? JSON.stringify(anyErr) : '')
    );
  }
  return String(err);
}

function codeOf(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const anyErr = err as any;
  return (anyErr.code || anyErr.error?.code || '').toString().toUpperCase();
}

export function friendlyError(err: unknown): FriendlyError {
  const raw = messageOf(err);
  const code = codeOf(err);
  const m = raw.toLowerCase();

  // Stable error codes from edge functions take priority over message matching.
  if (code === 'WALLET_DUPLICATE' || /on conflict|duplicate key|already exists|unique constraint/.test(m)) {
    return {
      title: 'Wallet already connected',
      description: 'This Blink wallet is already linked to your economy. Open the existing entry to manage it.',
    };
  }

  if (
    code === 'BLINK_UNAUTHORIZED' ||
    /\b401\b|unauthor[ie]zed|invalid api key|blink rejected|forbidden|\b403\b/.test(m)
  ) {
    return {
      title: 'Blink rejected the API key',
      description: 'The stored read-only key is no longer valid.',
      hint: 'Generate a new read-only key at dashboard.blink.sv/api and reconnect.',
    };
  }

  if (code === 'BLINK_NOT_FOUND' || /wallet not found|no such wallet/.test(m)) {
    return {
      title: 'Wallet not found on Blink',
      description: 'Blink couldn\'t find a wallet for this API key. Double-check you used a key from the right account.',
    };
  }

  if (/decrypt|encryption|cipher/.test(m)) {
    return {
      title: 'Stored key unreadable',
      description: 'We couldn\'t decrypt the saved API key. Please reconnect this wallet.',
    };
  }

  if (/network|fetch failed|failed to fetch|econnreset|enotfound|timeout|timed out/.test(m)) {
    return {
      title: 'Connection problem',
      description: 'We couldn\'t reach Blink. Check your internet connection and try again.',
    };
  }

  if (code === 'INVALID_TOKEN' || /invalid (claim )?token|expired token|token mismatch/.test(m)) {
    return {
      title: 'Link expired or invalid',
      description: 'Ask your economy admin for a fresh claim link.',
    };
  }

  if (/rate limit|too many requests|\b429\b/.test(m)) {
    return {
      title: 'Too many attempts',
      description: 'Please wait a moment and try again.',
    };
  }

  // Final fallback — keep raw text but wrap with a friendly title.
  return {
    title: 'Something went wrong',
    description: raw || 'An unexpected error occurred. Please try again.',
  };
}

/** Shortcut for toast `{ title, description, variant }` callers. */
export function friendlyToast(err: unknown) {
  const f = friendlyError(err);
  return {
    title: f.title,
    description: f.hint ? `${f.description} ${f.hint}` : f.description,
    variant: 'destructive' as const,
  };
}
