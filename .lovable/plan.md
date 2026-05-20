## The friction

Right now `/register` lets logged-out users fill all 4 steps. The only signal that login is required is a small line of text at the top and a disabled submit button on Step 4 — easy to miss on mobile (your screenshot shows exactly this). Users invest 10–30 min filling the form, then hit a wall.

## Fix: gate the page before the form, not after

Block the form entirely for logged-out users with a clear, friendly auth screen — same pattern already used on `/leaderboard` and `/compare` (the existing `AuthGate` component). They cannot waste time filling fields they can't submit.

### 1. Block `/register` for logged-out users

In `src/pages/RegisterCommunity.tsx`, before rendering the multi-step form:

- If `!user` (and `!loading`), render a dedicated gate screen instead of the form.
- Copy tuned for this exact moment:
  - Title: **"Log in to register your economy"**
  - Body: "Creating a Bitcoin economy is free and takes ~1 minute. We just need an account first so you can edit and manage it later."
  - Primary CTA: **Create free account** → `/login?signup=1&redirect=/register`
  - Secondary CTA: **Log in** → `/login?redirect=/register`
  - Small reassurance line: "Free forever · No funds held · ~3 min to complete"

### 2. Return user to `/register` after auth

In `src/pages/Login.tsx`:

- Read `?redirect=` from the URL.
- After successful login/signup, navigate to that path (default `/dashboard` as today).
- Pass `?signup=1` through so the signup tab opens when coming from the gate's "Create free account" button (already supported).

So the flow becomes: visit `/register` → see gate → click CTA → log in → land back on `/register` with the form ready, name still empty but no wasted typing.

### 3. Keep the existing in-form safety net

Leave the "log in required" toast + disabled submit in place as a fallback for anyone who somehow reaches Step 4 logged-out (e.g. session expired mid-flow). No code removal needed there.

### 4. Optional polish (low effort, big clarity win)

On the homepage "Create Economy" button (Navbar / hero), if the user is logged out, the button can route to `/login?signup=1&redirect=/register` directly instead of `/register`. This skips the gate screen entirely for first-time visitors clicking the main CTA — they go straight to signup, then straight into the form.

## Files touched

- `src/pages/RegisterCommunity.tsx` — add logged-out gate branch (uses same visual language as `AuthGate`)
- `src/pages/Login.tsx` — honor `?redirect=` param on success
- `src/components/Navbar.tsx` — route "Create Economy" CTA through login when logged out (optional but recommended)

No DB, no API, no schema changes. Pure UX/routing.

## Why this works

- Users learn the requirement **before** investing effort, not after.
- The auth screen explains *why* an account is needed ("so you can edit and manage it later") — that reframes login from friction to value.
- Returning them to `/register` automatically means zero context loss after signup.
- Consistent with how `/leaderboard` and `/compare` already behave, so the pattern is familiar across the app.