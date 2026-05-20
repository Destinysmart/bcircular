## Goals

1. Fix the registration submit on `/register` so it works whether or not the Twitter handle is filled.
2. Ensure economy creators can re-edit all the registration fields from the Economy Admin dashboard after launch.

## What I found

**Registration (`src/pages/RegisterCommunity.tsx`)**
- Twitter is correctly marked optional (Step 4) and `validateStep(4)` only checks `contactEmail` + `committed`.
- However the submit handler has silent failure paths that match the reported symptom of "button doesn't function":
  - `countries.find(...)` returning `undefined` triggers a bare `return` with no toast or loading reset.
  - The submit `<Button>` is `disabled={loading || !user}` and there is no visible reason shown when `!user`.
  - The `noValidate` form skips browser email validation, but on submit nothing surfaces if `registerCommunity` rejects silently for an empty optional field.
- Net effect: a user who didn't fill Twitter (and possibly is in another edge state) sees the button do nothing.

**Admin dashboard (`src/pages/EconomyAdminDashboard.tsx`)**
- An "Economy Profile" form already exists (lines ~504‑518) and saves: name, description, website, twitter, contact email, declared population, founding year, economic zone description, FBCE tier.
- Bug: the Economic zone description field is rendered twice (lines 517 and 518 are duplicated).
- Missing edit fields vs. registration: **City** and **Country** (with country_code + region). Creators currently can't fix a wrong city/country after launch.

## Changes

### 1. `src/pages/RegisterCommunity.tsx` — make submit reliable

- In `handleSubmit`, replace silent early-returns with toast errors so the user always gets feedback.
- Normalize the Twitter handle: trim, allow empty → `null`, strip a leading `@` only when persisting (purely client-side normalization, no behavior change for filled values).
- Add a small "Please log in to submit" inline hint near the submit button when `!user` (button stays disabled but reason is visible).
- Keep validation logic identical for Twitter (still optional).

### 2. `src/pages/EconomyAdminDashboard.tsx` — full post-launch editing

- Remove the duplicated Economic zone description block (line 518).
- Add City + Country fields to the Economy Profile section, using the same `CountrySelect` component as registration. On save, also update `country`, `country_code`, `region`, `city` on the `communities` row.
- Wire new state (`city`, `selectedCountry`) into the existing `useEffect` that hydrates the form and the existing `handleSaveProfile` mutation. No new tables, no schema changes.

### Technical details

- No database/RLS changes. The `communities` UPDATE policy already allows the economy admin (`auth.uid() = admin_id`) and super admins to update these columns.
- Reuses `CountrySelect` and the `countries` lookup already imported from `@/lib/countries`.
- Keeps the existing `community_profiles` upsert untouched.

## Out of scope

- Slug editing (slug drives public URLs; changing it would break inbound links).
- Logo/banner flow (already functional).
- BTCMap, validators, FBCE tier sections (already functional).
