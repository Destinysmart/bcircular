

## Full Data Layer Reset — Plan

### Summary
Remove all mock data fallbacks, wire every page to real Supabase queries with loading/error/empty states, fix copy text ("community" → "circular economy"), fix the Navbar super-admin check, fix registration to also insert into `community_admins`, and wire the Widget page to real data.

### Files to modify

**1. `src/lib/mock-data.ts`** — Keep only utility functions (`getScoreColor`, `getScoreBgColor`, `getScoreLabel`, `formatSats`, `getFlagEmoji`). Delete all mock arrays (`mockCommunities`, `mockMerchants`, `mockScoreHistory`, `mockActivity`) and their interfaces.

**2. `src/pages/Homepage.tsx`**
- Remove `mockCommunities` import and fallback logic
- Query real data via `fetchAllCommunitiesWithStats`; if empty, show `0` for all stats and "No circular economies registered yet" with link to `/register`
- Add `isLoading` / `isError` states from `useQuery`
- Fix copy: "Economies tracked", "Register your circular economy", "Explore economies"

**3. `src/pages/Leaderboard.tsx`**
- Remove `mockCommunities` import and fallback
- Use `useQuery` with `isLoading`, `isError`
- Empty state: "No circular economies registered yet. Be the first to register yours." with `/register` link
- Fix table header copy

**4. `src/pages/CommunityDashboard.tsx`**
- Remove all mock fallbacks (`mockCommunity`, `mockScoreHistory`, `mockActivity`)
- Add `isLoading` / `isError` / empty handling for community fetch (show "Economy not found" if slug returns nothing)
- Pillar values default to `0` (not mock values like `85`)
- Chart shows empty state text if no score history
- Activity section: remove `mockActivity` entirely, show "No recent activity" placeholder
- Fix copy throughout

**5. `src/pages/Widget.tsx`**
- Replace mock data with real Supabase query (`fetchCommunityBySlug` + `fetchLatestScore` + counts)
- Add loading/empty states

**6. `src/components/Navbar.tsx`**
- Fix super-admin check: query uses `eq('user_id', user!.id)` which is correct
- No change needed — already queries `profiles.is_super_admin`

**7. `src/pages/RegisterCommunity.tsx`**
- After `registerCommunity()` succeeds, also insert into `community_admins` table: `{ community_id, user_id, role: 'owner' }`
- Fix any remaining "community" copy

**8. `src/lib/api.ts`**
- Update `registerCommunity` to also insert into `community_admins` after community creation
- No other API changes needed

**9. Copy text fixes across all files** (find & replace):
- `src/pages/Homepage.tsx`: hero text, CTA buttons
- `src/pages/Leaderboard.tsx`: headers
- `src/pages/CommunityDashboard.tsx`: section titles
- `src/pages/SubmitPage.tsx`: "Economy validators" (already correct)
- `src/pages/ValidatorDashboard.tsx`: copy check
- `src/pages/Methodology.tsx`: DO NOT TOUCH (per instructions)
- `src/pages/Login.tsx`: "manage your economy" (already correct)

### What stays untouched
- Colors, fonts, layouts, component structure
- Methodology page
- Score calculation logic
- All UI component files

### Technical details
- Every `useQuery` hook will expose `{ data, isLoading, isError, error }` — pages will render a spinner for `isLoading`, error message for `isError`, and empty state UI when data is null/empty
- The loading spinner will be a simple centered text "Loading..." consistent with existing patterns (ValidatorDashboard, SuperAdminDashboard)
- `mock-data.ts` keeps its utility exports so no other imports break

