# Launch-blocker fixes — BCE registration & wallet flows

Scope: 3 fixes only. Onboarding sequencing and dashboard de-duplication are deferred to a post-launch pass.

---

## 1. HTTPS-canonical claim & connect links

**Problem.** Admins copy claim links from the dashboard. Today these use `window.location.origin`, so a link copied while the admin is on a `*.lovable.app` preview or any non-canonical host produces a URL that may resolve to http (or to a dev preview), triggering browser security warnings for the merchant/earner who clicks it.

**Fix.** Centralize one helper that always returns the canonical https origin (`https://bitcoincircular.com`) when the app isn't already running on the production custom domain. `JoinAsEarner.tsx` already does this inline — promote it.

**Changes**
- New `src/lib/shareUrl.ts` exporting `canonicalOrigin()` and `shareUrl(path)`. Returns `window.location.origin` only if hostname is `bitcoincircular.com` / `www.bitcoincircular.com`; otherwise returns `https://bitcoincircular.com`.
- Replace raw `${window.location.origin}/connect…` and `${window.location.origin}/merchant/claim…` usages in:
  - `src/components/ConnectedWalletsManager.tsx` (lines 33, 120, 128) — both "copy link" and the new "Request new key" button.
  - `src/components/MerchantClaimManager.tsx` (line 44).
  - `src/pages/JoinAsEarner.tsx` (replace inline logic with helper).
- Leave routes that are inherently dev-only (`/quick-submit` admin URL on ValidatorDashboard, widget iframe code) unchanged or route through helper as a follow-up.

**Verification.** Open the dashboard from the lovable preview, copy an earner claim link, confirm the copied string starts with `https://bitcoincircular.com/connect?code=…`.

---

## 2. Plain-English error messaging

**Problem.** Users see raw Postgres / Blink errors: "ON CONFLICT specification", "401 unauthorized", "duplicate key value violates unique constraint". These appear in toasts and inline wallet-row badges during the highest-stakes moment (first wallet connect).

**Fix.** A single error-translation layer applied at the toast / inline-error boundary — not scattered try/catches.

**Changes**
- New `src/lib/friendlyError.ts` exporting `friendlyError(err): { title, description, hint? }` that pattern-matches on common signatures:
  - `ON CONFLICT` / `duplicate key` → "This wallet is already connected to your economy."
  - `401` / `Unauthorized` / `Blink rejected` → "Blink no longer accepts this API key. Generate a new read-only key and reconnect."
  - `network` / `fetch failed` → "Couldn't reach Blink. Check your connection and try again."
  - Encryption / decryption errors → "We couldn't read the stored key. Please reconnect this wallet."
  - Default fallback → original message, prefixed with friendly title.
- Wire through the 4 entry points where wallet errors surface:
  1. `ConnectWallet.tsx` `handleConnect` catch block (toast).
  2. `MerchantClaim.tsx` `handleSubmit` catch block (toast).
  3. `ConnectedWalletsManager.tsx` inline 401 badge text.
  4. `sync-wallet-transactions` errors bubbled into `ConnectedWalletsManager` row state (the amber persistent badge).
- Edge functions: confirm `sync-wallet-transactions` and `claim-merchant` return `{ error: { code, message } }` with stable `code` strings (`WALLET_DUPLICATE`, `BLINK_UNAUTHORIZED`, etc.) so the frontend can match on code, not message text. Add codes where missing.

**Verification.** Trigger each known failure (duplicate connect, expired key, bad key) and confirm the toast/badge shows the human message, not a stack trace.

---

## 3. Mobile responsiveness on wallet connect flows

**Problem.** `ConnectWallet.tsx` and `MerchantClaim.tsx` are the pages a merchant/earner opens *on their phone* via the link the admin sent. Inputs, the privacy promise list, and the submit button must work cleanly at 360px width.

**Audit targets (read + adjust only what breaks at 360px)**
- `src/pages/ConnectWallet.tsx` — `Card max-w-xl`, full-width form, padding `p-4`. Likely fine but verify: privacy promise list spacing, API key input (no horizontal scroll on long placeholder), Lightning address row, submit button reaches edges with `min-h-[44px]` for touch.
- `src/pages/MerchantClaim.tsx` — same audit. The `font-mono text-xs` claim token field tends to overflow on narrow screens; switch to `break-all` and ensure `Input` doesn't force min-width.
- `src/pages/JoinAsEarner.tsx` success state — share buttons (WhatsApp, copy) need to wrap, not overflow.

**Changes**
- Tighten container padding to `px-4 sm:px-6` on these 3 pages.
- Stack inline button rows with `flex-col sm:flex-row gap-2`.
- Increase tap targets: all primary buttons get `h-11` minimum on mobile.
- Confirm `Input` font-size ≥ 16px on iOS to prevent zoom-on-focus (Tailwind `text-base` already does this — verify no override).
- Test the 3 pages at 360×800 and 414×896 in the preview, take screenshots, fix visible issues only. No speculative redesign.

**Verification.** Open each page on a 360px viewport in the preview. Confirm: no horizontal scroll, all CTAs tappable, no input overflow, privacy list readable.

---

## Out of scope (deferred)

- **Onboarding sequencing.** `SetupChecklist.tsx` exists and works; reorder + repositioning is a week-2 task once we see drop-off data.
- **Dashboard de-duplication.** Needs real usage observation first.

---

## Order of work

1. Ship the HTTPS helper + replacements (~30 min, smallest blast radius).
2. Ship the friendly-error layer + edge function error codes (~1–2 h).
3. Mobile audit + targeted CSS fixes on 3 pages (~1 h).

Each step is independently shippable and independently verifiable.
