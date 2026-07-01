
# Bitcoin-Native Auth with Nostr

Layer a first-class Nostr identity system on top of the existing email login. Nostr becomes the recommended path; email stays as a friendly fallback. Private keys never leave the browser.

## What the user will see

**New `/login` layout, in this order:**
1. **⚡ Continue with Nostr** — detects a NIP-07 extension (Alby, nos2x, Flamingo). If none, opens a friendly explainer sheet with install links + "use email instead" (not an error).
2. **🔑 Create a new Nostr identity** — generates keys in-browser, shows a secure backup screen (copy nsec, copy npub, download `.txt` backup), requires an "I've backed up my key" checkbox before continuing. Private key is stored **only** in the browser (encrypted in localStorage behind a passphrase), never sent to the server.
3. **✉️ Continue with email** — existing flow, kept for beginners.

Short helper line above the buttons:
> *"Use your Nostr identity to sign in without sharing passwords. No email required."*

**"Paste an existing key"** secondary option under Nostr — accepts `nsec1…` (kept only in-browser, used to sign the login challenge locally) or `npub1…` (read-only, marks the session as unverified until upgraded via extension/nsec signature).

**Onboarding (first login only)** — 3 quick steps:
1. Choose a username (unique) & display name
2. Pick user type: Freelancer / Client / Both
3. Optional: profile picture, about, website, lightning address

Then land on the dashboard.

**Profile page** — extends existing profile with: about, website, npub, lightning address, bitcoin wallet (optional, non-custodial hint), github, x/twitter, telegram, location, skills, portfolio. Where possible, we fetch the user's Nostr `kind: 0` metadata (only after explicit consent) and pre-fill fields.

## Security guarantees

- Server stores only: SHA-256 hash of pubkey (already have `nostr_identities`), npub, profile metadata, user preferences.
- Server **never** stores: private key, nsec, raw pubkey.
- Local browser stores: encrypted nsec (AES-GCM with PBKDF2-derived key from user passphrase) only if user chose "create identity" or "paste nsec" — with a "Forget this key on this device" button in Settings.
- All logins verified by cryptographic signature of a server-issued challenge (NIP-98–style `kind: 27235`, already implemented).
- Read-only npub sessions get a `verified: false` flag; privileged actions prompt to upgrade to a signed session.

## Error handling (friendly, actionable)

| Situation | Message |
|---|---|
| No NIP-07 extension | Sheet with "Install Alby / nos2x" + "Create a new key instead" + "Use email" |
| Invalid nsec | "That doesn't look like a Nostr private key. It should start with `nsec1…`" |
| User rejects signature | "Signature request cancelled. Approve it in your Nostr extension to continue." |
| Network failure | Inline retry, form state preserved |
| Challenge expired | Auto-refresh challenge and re-sign silently |

## Inline docs / education

A collapsible **"New to Nostr?"** panel on the login page explains, in plain language: what Nostr is, what npub/nsec are, why the private key is sacred, how this differs from email/password. Same copy reused in the create-identity backup screen.

## Future-ready architecture

A single `AuthProvider` interface in `src/lib/auth/providers/`:
- `nip07-provider.ts` (implemented)
- `nsec-provider.ts` (implemented — local key)
- `npub-provider.ts` (implemented — read-only)
- `nip46-provider.ts` (stub, interface only, ready for bunker://)
- `email-provider.ts` (wraps existing Supabase)

Each provider implements `getPublicKey()`, `signEvent()`, `capabilities()`. NIP-05 verification, Lightning Address verification, and wallet-auth land as new providers later with no UI rewrite.

## Technical details

**New files**
- `src/lib/auth/providers/{types,nip07,nsec,npub,nip46,email}.ts`
- `src/lib/nostr/keys.ts` — generate keys, encode/decode nsec/npub (via `nostr-tools`)
- `src/lib/nostr/localVault.ts` — AES-GCM encrypt/decrypt nsec in localStorage
- `src/lib/nostr/metadata.ts` — optional fetch of `kind: 0` from public relays (consent-gated)
- `src/components/auth/NostrOptions.tsx` — the 3-button stack + explainer sheet
- `src/components/auth/CreateNostrIdentity.tsx` — key generation + backup screen
- `src/components/auth/PasteKeyDialog.tsx` — nsec/npub paste with validation
- `src/components/auth/NewToNostrPanel.tsx` — collapsible educational panel
- `src/pages/Onboarding.tsx` — username + user type + optional profile
- `src/components/ProfileForm.tsx` — extended profile editor

**Edited files**
- `src/pages/Login.tsx` — replace current layout with new 3-method stack
- `src/pages/Settings.tsx` — add "Linked identities" and "Forget local key" controls
- `src/App.tsx` — add `/onboarding` route + gate

**Migration**
- Extend `profiles` with: `username` (unique), `about`, `website`, `npub`, `lightning_address`, `bitcoin_wallet`, `github`, `x_handle`, `telegram`, `location`, `skills` (text[]), `portfolio_url`, `user_type` (enum: freelancer/client/both), `onboarding_completed_at`.
- Add unique index on `lower(username)`.

**Edge functions** — reuse existing `nostr-auth-challenge` + `nostr-auth-verify` (already deployed). No new server code required for v1.

**Dependencies** — `nostr-tools` (add to frontend for key gen + nsec/npub encoding). No other new deps.

## Explicitly out of scope for v1

- NIP-46 (bunker://) — interface stub only, no working transport yet.
- Publishing our own events to relays (we only read `kind: 0` on request).
- NIP-05 verification badges on profiles.
- Zap-based payments / Lightning receive flows.
- Migrating existing email users to Nostr (they can link one from Settings later).

## Two quick questions before I build

1. **Username uniqueness**: enforce globally unique usernames (like Twitter) or scope to display-only (like Discord discriminators)? I'll default to **globally unique**.
2. **App name**: your brief says "BitLance" on the backup screen but the app is "Bitcoin Circular". Should the backup screen say **Bitcoin Circular** (keep consistent) or **BitLance**?
