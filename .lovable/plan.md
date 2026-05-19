# Open up Bitcoin Circular: public-first homepage & auth flow

Based on direct feedback ("forced to create an account before looking at anything" and "how do you collect the data?"), the platform needs to feel like an open exploration tool, not a gated SaaS dashboard. Authentication should be optional until the user wants to *participate*.

## 1. Kill the auth wall

- `RootRedirect.tsx`: stop passing `gated` for logged-out visitors. The full Homepage renders for everyone. Logged-in users still get `Home` (their personal dashboard above the public homepage).
- `Homepage.tsx`: remove the `gated` prop entirely (and the blurred 2-card teaser). The filter pills, full economy grid, map, and activity feed are public.
- `Leaderboard.tsx`: remove the `AuthGate` wrapper. Public.
- `Compare.tsx`: remove the `AuthGate` wrapper. Public.
- Keep auth required for: `/register`, `/dashboard/*`, `/admin`, `/validate`, `/c/:slug/submit`, `/settings`, `/connect`, merchant claim flows. (Already enforced inside those pages — no change.)
- `AuthGate.tsx` is no longer used; leave the file for now but unimport it.

## 2. Reposition the hero

Edit the hero block in `Homepage.tsx`:
- Headline: "Visualizing Bitcoin Circular Economies"
- Subheadline: "Explore how Bitcoin moves across communities through transparent, privacy-conscious activity metrics."
- Primary CTA: **Explore Economies** → `/leaderboard`
- Secondary CTA: **How It Works** → `/methodology`
- Demote "Register your economy" to a tertiary text link below the CTAs.
- Replace the "verified Bitcoin economy network" chip with a softer "Early-stage · Open · Privacy-first" chip.

## 3. Transparency banner

Thin dismissible banner directly under the navbar (new component `TransparencyBanner.tsx`, mounted in `Homepage.tsx`):

> "Bitcoin Circular is an early-stage experiment exploring better ways to visualize Bitcoin circular economy activity while respecting privacy and consent."

Stored dismissal in `localStorage` so it doesn't nag returning visitors.

## 4. New "How the data works" section

New section on `Homepage.tsx` between the economy grid and the existing map. Four cards explaining:
1. Most current data is **demo / sample data** for testing.
2. Real integrations (Blink wallet sync, BTCMap) are **opt-in only** — communities choose.
3. We show **aggregate activity**, never personal transaction detail.
4. Goal is **ecosystem insight, not surveillance**.

Honest, plain-language tone. Links to `/methodology` for full detail.

## 5. New "Privacy first" section

Follows the data section. Four trust pillars with lucide icons (`Shield`, `EyeOff`, `Users`, `Lock`):
- Built with consent in mind
- Communities choose what to share
- Focused on ecosystem activity, not individual surveillance
- Transparency without compromising privacy

Closes with a link to a new public `/privacy` page.

## 6. New `/privacy` page

New file `src/pages/Privacy.tsx` + route in `App.tsx`. Long-form version of the privacy philosophy: what we collect, what we don't, how opt-in works, how to disconnect (irreversible deletion). Plain language, no legalese. Reuses `Navbar`.

## 7. Navigation refresh (`Navbar.tsx`)

New link order: **Home · Explore · Methodology · Privacy · Leaderboard**. Drop "Compare", "Register", "Validate", "Data" from the primary nav for logged-out users (they're still routable; just declutter). Logged-in users keep Validate and a dedicated "Create Economy" button on the right, with "Sign in" replaced by avatar.

For logged-out users on the right side:
- Small ghost "Sign in" link
- Primary outline "Create Economy" button → `/register` (auth required at next step)

## 8. Language pass

Search/replace across homepage and methodology copy:
- "tracking" → "visualizing activity"
- "monitoring" → "aggregating activity"
- "wallet surveillance" → never used; replace with "consent-based wallet integrations"
- "real Bitcoin adoption" stays, but de-emphasize "verified" maximalism.

Scope: `Homepage.tsx`, `Methodology.tsx`, hero subheadlines. Not touching DB/UI labels like "economy" / "community" (already governed by memory).

## Technical notes

- Pure frontend work. No DB migrations, no edge function changes, no schema changes.
- `RootRedirect` becomes: `user ? <Home /> : <Homepage />` (no `gated` prop).
- `Homepage` prop signature loses `gated`; `Home.tsx` already calls it without `gated`, so safe.
- New components: `TransparencyBanner`, `HowDataWorks` section (inline in Homepage), `PrivacyPillars` section (inline in Homepage), new page `Privacy.tsx`.
- New route: `<Route path="/privacy" element={<Privacy />} />` in `App.tsx`.
- Preserve existing semantic tokens (`score-amber`, `score-green`, `border`, `card`, `muted-foreground`). No raw hex.
- Verify by viewing `/` logged-out (full homepage visible, banner shows, no blur), `/leaderboard` logged-out (no gate), `/privacy` (new page renders), `/register` logged-out (still redirects to login — already handled inside `RegisterCommunity`).

## Out of scope (explicitly)

- No changes to scoring algorithm, validator logic, or wallet sync.
- No changes to `Home.tsx` personal dashboard structure beyond what `Homepage` removes.
- No redesign of `/c/:slug` economy pages (already public).
- No pricing/monetization copy rewrites beyond removing "tracking" language.
