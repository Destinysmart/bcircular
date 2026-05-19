Sweep the app to replace decorative emoji with `lucide-react` icons for a more consistent, professional UI. **Country flag emojis stay** — they carry cultural/semantic meaning no lucide icon can replace.

## What gets converted (by file)

**Economy Admin Dashboard (`src/pages/EconomyAdminDashboard.tsx`)** — primary focus
- L411 `🔴` (no-wallets warning) → `<AlertCircle className="h-5 w-5 text-score-red" />`
- L585 `⚠` (validators warning) → `<AlertTriangle className="h-3.5 w-3.5 text-score-amber" />` inline with text
- L676 `✗ Community not found` → `<XCircle className="h-4 w-4 text-destructive" />` + text
- L682 `⚠ 0 merchants found` → `<AlertTriangle className="h-4 w-4 text-score-amber" />` + text
- L688 `✓ Synced successfully` → `<CheckCircle2 className="h-4 w-4 text-primary" />` + text
- L182 toast `Uploaded successfully ✓` → drop the `✓` (toast already has its own success styling)

**Community Dashboard (`src/pages/CommunityDashboard.tsx`)**
- L280 verified-admin `✓` chip → `<BadgeCheck className="h-3.5 w-3.5 text-primary" />`
- L359 tier-checklist `✓` → `<Check className="h-3 w-3" />` (already inside a styled square, just swap the glyph)

**Homepage (`src/pages/Homepage.tsx`)**
- L486 modal `⚡` decorative glyph → `<Zap className="h-7 w-7 text-score-amber mx-auto mb-3" />`

**Leaderboard (`src/pages/Leaderboard.tsx`)**
- L236 `🚀` next to a heading → `<TrendingUp className="h-4 w-4 text-score-amber" />`

**Wallet Dashboard (`src/pages/WalletDashboard.tsx`)**
- L76 `⚡ {rate}% …` and L81 `📈 {n} transactions …` insight banners → render the icon as a sibling `<Zap />` / `<TrendingUp />` next to the text instead of inlining the emoji into the string. Refactor the helper to return `{ icon, text }`.

**Join as Earner (`src/pages/JoinAsEarner.tsx`)**
- Role picker `emoji: '🏪' | '🎨' | …` (L17-19) → swap the `emoji` field for a lucide `icon` component reference (`Store`, `Palette`, `Briefcase`, etc.), render via `<role.icon />` in the picker.
- L96 toast `Welcome to the economy ⚡` → drop the `⚡`.
- L112 share text `… on Bitcoin Circular ⚡` → drop the `⚡` (plain text shared off-platform — emoji-free reads cleaner).
- L335 welcome heading `Welcome to {name} ⚡` → render a `<Zap className="inline h-6 w-6 text-score-amber ml-2" />` next to the heading instead.

**Circular Assistant (`src/components/CircularAssistant.tsx`)**
- All `Sats ⚡` persona strings (L17, L23, L28, L190) → replace the trailing `⚡` with a `<Zap className="inline h-3.5 w-3.5 text-score-amber" />` next to the name. The persona stays; only the glyph swaps.
- The greeting strings need to become JSX fragments instead of raw strings — small refactor of the helper to return JSX.

## What stays as-is (deliberate)

- `getFlagEmoji()` everywhere (CommunityDashboard, Home, Homepage, Leaderboard, Compare, ProofOfCircularity, Widget) — country flags are not decorative.
- `src/lib/coverage.ts` emoji fields (🔴🟡🟢) — these are data, not rendered directly anywhere I could see; if they are rendered the consumer should be updated separately. Out of scope for this pass.

## Lucide icons to add to imports
`AlertCircle`, `AlertTriangle`, `CheckCircle2`, `XCircle`, `BadgeCheck`, `Check`, `Zap`, `TrendingUp`, `Store`, `Palette`, `Briefcase` (final role icon set decided when reading the file).

## Verification

After implementation:
1. Visit `/dashboard/economy/:id` as an admin user — confirm warning banner, validators warning, BTCMap sync result states all render lucide icons with proper semantic color tokens.
2. Visit `/c/:slug` — confirm verified-admin badge + tier checklist checks render as lucide.
3. Visit `/leaderboard`, `/` (homepage), `/connect/dashboard`, `/c/:slug/join-as-earner` — confirm no stray emoji remain in those views.
4. Screenshot at desktop + mobile widths to confirm icon sizes are visually balanced (no oversized glyphs).
5. Console clean.

## Out of scope

- Country flags (kept by design).
- Emoji in seed/mock data files unless rendered.
- Wholesale dashboard redesign — this is a glyph-swap pass with tight semantic-token usage, not a layout refactor.
- Toast `variant` overhaul (only stripping cosmetic emoji from existing toast titles).
