## Add "Log in with Nostr" — privacy-first decentralized signup

Bitcoiners increasingly use Nostr keys as portable identity. Adding Nostr login lets people sign up without email, phone, or any personally identifying info — which fits the platform's privacy constitution ("show what Bitcoin does, never who does it").

### What users see

On `/login`, above the email/password form, a new prominent button:

> **⚡ Continue with Nostr**
> *No email. No tracking. Your keys, your identity.*

Two sub-options (progressive disclosure — one click reveals them):
1. **Use browser extension (NIP-07)** — recommended. Works with Alby, nos2x, Flamingo, etc. One click, signs a challenge, done.
2. **Paste npub (read-only)** — for users without an extension. Creates an account tied to their public key only. They'll need the extension later to prove ownership for sensitive actions (editing an economy).

A small "What is Nostr?" link opens a short explainer sheet.

### Privacy guarantees shown to the user

- We never see or store your private key (nsec). Ever.
- No email required. No phone. No name.
- Your npub is stored hashed on our side — we use it to recognize you, not to profile you.
- You can disconnect at any time; your account data is deleted.

### How it works (technical section)

**Auth flow (NIP-07 extension):**
1. Frontend detects `window.nostr` (NIP-07).
2. Frontend requests `pubkey = await window.nostr.getPublicKey()`.
3. Frontend calls edge function `nostr-auth-challenge` → returns a random `challenge` string (short TTL, stored in a `nostr_challenges` table).
4. Frontend asks extension to sign a Nostr event (`kind: 27235`, per NIP-42-style) containing the challenge + origin.
5. Frontend posts signed event to edge function `nostr-auth-verify`.
6. Edge function verifies signature using `nostr-tools` (npm), checks challenge freshness, then:
   - Looks up or creates a Supabase auth user with a synthetic email `npub1...@nostr.local` (never surfaced in UI).
   - Uses `supabase.auth.admin.generateLink({ type: 'magiclink' })` and returns the session tokens to the client, which calls `supabase.auth.setSession()`.
7. On first login, a `profiles` row is created; `display_name` defaults to the short npub (`npub1abc…xyz`), fully editable in Settings.

**Data model additions (one migration):**

- `nostr_identities` table
  - `id uuid pk`
  - `user_id uuid references auth.users(id) on delete cascade`
  - `pubkey_hash text unique not null` — SHA-256 of the hex pubkey; we never store the raw pubkey
  - `created_at`, `last_seen_at`
  - RLS: user reads/deletes their own row; service_role full access
  - GRANT SELECT, DELETE to authenticated; GRANT ALL to service_role
- `nostr_challenges` table
  - `id uuid pk`, `challenge text unique`, `pubkey_hash text`, `expires_at timestamptz`
  - RLS: no client access. Only service_role.
  - Cleaned up on verify + a 5-minute TTL check inside the edge function.

**Edge functions (both `verify_jwt = false`):**
- `nostr-auth-challenge` — issues challenge, rate-limited by IP hash.
- `nostr-auth-verify` — verifies sig, mints session. Uses `npm:nostr-tools` for `verifyEvent` and `nip19`.

**Files:**
- `src/lib/nostr.ts` — client helpers: detect NIP-07, request signature, hash pubkey.
- `src/components/NostrLoginButton.tsx` — the button + progressive disclosure sheet.
- `src/pages/Login.tsx` — inject the button above the email form + a subtle divider.
- `src/pages/Settings.tsx` — new "Linked identities" section showing the connected npub (masked) with a "Disconnect Nostr" button.
- `supabase/functions/nostr-auth-challenge/index.ts`
- `supabase/functions/nostr-auth-verify/index.ts`
- One migration for the two tables above.

**Read-only npub path:** stores the npub, creates an account, but marks `nostr_identities.verified = false`. Any privileged action (editing an economy, submitting proofs) requires upgrading to a signed session via the extension. This prevents impersonation while still giving frictionless read/browse access.

### What I won't do (privacy constraints)
- No storage of raw pubkeys — only SHA-256 hashes.
- No fetching of the user's Nostr profile (`kind: 0`) unless they opt in later. We don't want to pull their name/avatar/lightning address without consent.
- No relay writes. We never publish anything to Nostr on the user's behalf.

### Out of scope for this pass
- Publishing verification notes to Nostr relays.
- Zap-based validator payouts.
- NIP-05 verification of economy admins.

These can be follow-ups once the login flow is in.

### Questions before I build
1. **Read-only npub path** — include it in v1, or extension-only? Extension-only is safer and simpler; npub-paste is friendlier for non-technical users but weaker.
2. **Should Nostr login replace email/password for new signups**, or sit alongside it (both work)? I recommend alongside — email is still the fallback for people without a Nostr key yet.
