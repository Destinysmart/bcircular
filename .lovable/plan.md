## Premium SaaS landing refresh — `src/pages/Homepage.tsx`

Goal: turn the landing page into a confident, premium SaaS flow that mirrors what BCE has actually become — a verified, multi-economy, validator-backed network with public open data.

All work stays in `src/pages/Homepage.tsx` and uses existing semantic tokens (`score-amber`, `border`, `card`, `muted-foreground`, etc). No backend changes, no new routes.

---

### 1. Hero (refresh, not rebuild)

Keep the hero image, layout, and live stat pills. Update copy + CTAs only:

- Pill: `Bitcoin Circular Economy` → **`The verified Bitcoin economy network`**
- H1: keep "See where Bitcoin actually circulates."
- Subhead → **"The open standard for measuring real Bitcoin adoption. Validator-verified data from circular economies on every continent — free for anyone to read, share, and build on."**
- Buttons: `Explore Economies` (primary, `/leaderboard`) + new secondary **`Register your economy →`** (`/register`) replacing the duplicate "View Leaderboard". Logged-in users (gated=false case) is unchanged path-wise.

### 2. NEW — Trust strip (right under hero, above filters)

Thin full-width band: `border-y border-border bg-card/40`. Single row, wraps on mobile.

```
✓ {countries} countries  ·  ✓ {totalMerchants} merchants  ·  ✓ {verifiedTxns} verified txns  ·  ✓ 2-of-3 validator consensus  ·  ✓ Non-custodial — no funds held
```

Numbers reuse the values already computed in Homepage (`countries`, `totalMerchants`) plus a new lightweight count from `blink_transactions` (head: true) — same query pattern as `PublicData.tsx`. Loading shows `—`. Hidden when `gated` is false-and-not-logged-in? No — show always; it builds trust on the gated landing too.

### 3. NEW — "How it works" 3-step flow (above pillars)

Section title: **"From wallet to world stage in 3 steps"**.

Three numbered cards in a 3-col grid (stacks on mobile), each with an icon, step number badge, title, one-line desc, and a tiny outcome chip:

1. **Register your economy** — `Plus` icon — "Tell us your name, region, and contact. 2 min." — chip: `Free forever`
2. **Get validated** — `ShieldCheck` icon — "2 of 3 independent validators confirm real activity." — chip: `Tamper-proof`
3. **Track & share** — `BarChart3` icon — "Live dashboard, public profile, embeddable widget, open CSV." — chip: `Public proof`

Connect cards with a subtle dashed line on `md:` (pseudo-element on the section), amber accent on the active step number badge.

### 4. Pillars (expand to all 5, premium polish)

Replace the 3-pillar grid with the full **5 pillars** that match the score algorithm memory:

- Retention · `Repeat` · "Sats earned stay local."
- Velocity · `Zap` · "How fast sats move between hands."
- Growth · `TrendingUp` · "New merchants and earners onboarded."
- Diversity · `Layers` · "Spread across categories and regions."
- Resilience · `ShieldCheck` · "Activity sustained over time."

Layout: `md:grid-cols-3 lg:grid-cols-5`, each card gets a tiny `0–20 pts` weight chip in the corner. Section sub-line becomes **"Five pillars. One score. Validator-verified."**

### 5. NEW — "Free vs Pro data access" comparison (above Register CTA)

Two-card teaser linking to `/data`. Cards use `border-border` (Free) and `border-score-amber/60` (Pro accent).

| | **Free — Public Data** | **Pro — Research & Partner Access** |
|---|---|---|
| Who | Anyone with an account | Researchers, NGOs, Bitcoin companies |
| Includes | Live leaderboard, economy profiles, CSV snapshot, embeddable widget | Full historical dataset, time series, API feeds, custom exports |
| Price | $0 | Apply / contact |
| CTA | `Explore data →` (/data) | `Request access →` (/data#access) |

Heading: **"Built for explorers. Trusted by researchers."** Subhead: "Open by default. Premium where it matters."

### 6. Register CTA section

Keep existing amber gradient block but tighten copy:
- Pill: `Add your economy`
- H2: **"Is your Bitcoin economy missing from the map?"**
- Body: **"Join 10+ verified economies across 5 countries already proving real circulation. Free, non-custodial, takes 2 minutes."** (numbers stay static strings since this is the marketing block — no live binding needed.)
- Buttons unchanged.

### 7. Footer — no change.

---

### Technical notes

- New icons to import from lucide-react: `Plus`, `ShieldCheck`, `BarChart3`, `Layers`, `Check`.
- Verified txn count: add a small `useQuery(['homepage-verified-txns'])` calling `supabase.from('blink_transactions').select('*', { count: 'exact', head: true })`. Cache for the session.
- All new sections wrapped in `motion.section` using existing `fadeUp` / `stagger` variants for consistency.
- All sections respect the existing `gated` prop the same way the current "Register your economy CTA" does — i.e. the new How-it-works, Trust strip, and Free-vs-Pro show on both gated and ungated landing because they're marketing, not data.
- Strict use of semantic tokens — no raw colors.
- Mobile: every grid collapses to single column; trust strip wraps; pillars become `grid-cols-2` then `grid-cols-1`.

Estimated diff: ~250 lines added, ~30 modified, 0 removed structurally. One file.
