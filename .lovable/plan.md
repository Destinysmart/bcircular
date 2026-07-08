# Nostr Auth Redesign: NIP-07 + NIP-46, no nsec paste

## Goal
Remove all raw-key (nsec) handling from the app. Keep NIP-07 as the desktop primary, add NIP-46 (Nostr Connect) as the mobile/no-extension path via QR code, keep email as the non-Nostr fallback.

## Remove
- `src/components/auth/PasteKeyDialog.tsx` — deleted.
- `src/lib/auth/providers/nsec.ts` — deleted.
- `src/lib/nostr/localVault.ts` — deleted (encrypted-nsec local storage no longer needed).
- From `src/lib/nostr/keys.ts`: remove `decodeNsec`, `decodeNcryptsec`, `encodeNcryptsec`, `signWithHexKey`, `generateIdentity` (in-app key generation encourages nsec handling). Keep `decodeNpub`, `pubkeyToNpub`, `shortNpub`, `NostrEvent` type.
- `src/components/auth/CreateNostrIdentity.tsx` — deleted (would produce an nsec in-browser).
- Any references to PasteKeyDialog / vault / nsec provider in `NostrAuthModal.tsx`, `NostrOptions.tsx`, `NewToNostrPanel.tsx`, `Login.tsx`.

## Add
### `src/lib/auth/providers/nip46.ts` (replace stub)
Real implementation using `nostr-tools/nip46`:
- `createNostrConnectSession()` → generates ephemeral `localSecretKey`, builds `nostrconnect://<localPubkey>?relay=wss://relay.nsec.app&metadata=...` URI, opens a `BunkerSigner` awaiting the remote signer's connect response.
- Returns `{ connectUri, waitForSigner: Promise<NostrCapableProvider> }`.
- The resolved provider wraps `bunkerSigner.getPublicKey()` / `bunkerSigner.signEvent()` and plugs into existing `loginWithNostrProvider` unchanged.

### `src/components/auth/NostrConnectQR.tsx` (new)
- Renders the `nostrconnect://` URI as a QR code (add `qrcode.react` dependency).
- Shows "Waiting for connection…" spinner, "Copy connection link" button.
- On signer connect → calls `loginWithNostrProvider(provider)` → navigates to redirect target.
- Handles timeout / cancel / relay error states.

### `src/components/auth/NostrAuthModal.tsx` (rewrite)
New structure:
```
Sign in with Nostr
─ DESKTOP ─
[Continue with <detected extension name>]   (auto-detects Alby / nos2x / Keys.Band via window.nostr; falls back to "Browser Extension")
Small helper: install Alby / Keys.Band link if none detected
─ MOBILE / NO EXTENSION ─
[Scan with Nostr Connect]  → opens NostrConnectQR
─ FOOTER ─
[What is Nostr?] [Continue with Email instead]
Persistent note: "Your private key never touches Bitcoin Circular's servers or browser storage."
```

### `src/components/auth/WhatIsNostr.tsx` (new small dialog)
Copy from spec: "Nostr is an open identity protocol… we never see or store your private key…"

## Touch
- `src/pages/Login.tsx` — remove any nsec/paste/create-identity CTAs, funnel Nostr into the new modal, keep email form.
- `src/components/NostrLoginButton.tsx` — either delete (superseded by modal) or reduce to a launcher for the new modal. Confirm during build which callers remain.
- `src/components/auth/NostrOptions.tsx` and `NewToNostrPanel.tsx` — strip nsec/create-identity branches; keep only extension + Nostr Connect + email + learn-more.

## Dependencies
- Add: `qrcode.react` (QR rendering).
- `nostr-tools` already installed — use `nostr-tools/nip46` and `nostr-tools/pure`.

## Unchanged
- Backend flow: `nostr-auth-challenge` / `nostr-auth-verify` edge functions, `loginWithNostrProvider`, session handling, profile/npub display, theme.
- Email auth via `AuthContext`.

## Security invariants
1. No nsec input field anywhere.
2. No code path that stores, encrypts, or decodes a user private key.
3. NIP-46 ephemeral keypair is per-session, discarded after login; only used for the client side of the Nostr Connect handshake.
4. Backend only ever sees pubkey + signed kind-27235 event.

## Verification
- Grep confirms zero references to `nsec`, `decodeNsec`, `PasteKeyDialog`, `localVault`, `signWithHexKey` after changes.
- Manual: desktop with Alby → extension button signs in; desktop with no extension → QR shown; mobile → QR + Amber/nsec.app scan completes login; email path still works.
