
# Landing page rewrite — "Measure · Prove · Rank"

Reframe `src/pages/Homepage.tsx` so the first thing visitors read tells them exactly what Bitcoin Circular is, what it does, and why it matters — using the narrative you just defined. The economy grid, map, activity feed, methodology block, register CTA, and footer stay as-is (they already work hard).

## The narrative we're encoding

> The world's first intelligence platform for Bitcoin circular economies.
> We **measure**, **prove**, and **rank** how much Bitcoin is actually being used as real money in communities worldwide.

Three verbs become the spine of the page.

## Sections (top → bottom)

### 1. Hero — rewritten copy, same visual treatment

Keep the hero image, amber accent, stat pills, and motion. Only swap copy.

- **Eyebrow chip:** `Bitcoin adoption intelligence` (replaces "Bitcoin Circular Economy")
- **Headline:** 
  > Is Bitcoin actually  
  > <span class="amber">working as money?</span>
- **Subhead:** 
  > Bitcoin Circular is the intelligence platform that measures, proves, and ranks how Bitcoin moves as real money in communities worldwide. Verified data. No funds held. Ever.
- **Primary CTA:** `Explore Economies →` (unchanged route `/leaderboard`)
- **Secondary CTA:** `See how it works` → `/methodology`
- Live stat pills (Merchants / Txns this month / Avg activity / Countries / Advanced Economies) stay exactly as they are — they are proof the platform is live.

### 2. NEW — "Measure · Prove · Rank" trio (placed directly under hero)

A single tight section, three cards side-by-side on desktop, stacked on mobile. This is the load-bearing addition.

```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  MEASURE     │  │  PROVE       │  │  RANK        │
│  📡 icon     │  │  ✅ icon     │  │  🏆 icon     │
│              │  │              │  │              │
│  Real data   │  │  Verified    │  │  Global      │
│  from BTCMap │  │  dashboards  │  │  leaderboard │
│  + Blink     │  │  + proof     │  │  for every   │
│  wallets,    │  │  reports     │  │  economy.    │
│  classified  │  │  funders     │  │  Compare,    │
│  by FBCE.    │  │  can trust.  │  │  improve.    │
└──────────────┘  └──────────────┘  └──────────────┘
```

Each card: amber icon chip, short title, 1-sentence body, small "→ link" to the relevant existing page (`/leaderboard`, `/methodology`, `/compare`). Uses the same card style as the existing "What makes an economy circular?" section so it feels native, not bolted on.

### 3. Existing economy grid + filters — unchanged

The "Discover circular economies" grid is the proof the platform is real. It stays exactly where it is, exactly how it looks. Maybe a tiny copy tweak on the section subtitle:

- From: `Real merchants. Real sats. Verified data.`
- To: `Real merchants. Real sats. Verified by validators.`

### 4. Recent Activity + Global Map — unchanged

These are working proof. Leave them.

### 5. NEW — "Who it's for" strip (placed between map and methodology block)

A compact 4-up row of audience tags — no big hero treatment, just a quiet "this is who uses it" signal:

- **Economy leaders** — Prove impact. Win funding.
- **Funders (HRF, etc.)** — Verified data before grants.
- **Researchers** — Open methodology, open data.
- **Blink** — The wallet powering the transaction layer.

Visual: 4 small bordered cards, muted, no CTAs. Builds credibility without selling.

### 6. Existing "What makes an economy circular?" — unchanged

Already does its job (Retention / Velocity / Growth + methodology link).

### 7. Existing "Register Your Economy" CTA — light copy refresh

- Headline stays: `Is your Bitcoin community missing?`
- Subcopy refresh: 
  > Get a verified circularity score, a public dashboard, and a place on the global leaderboard. Free. Non-custodial. Always.

### 8. Footer — unchanged

Trust signals (BTCMap, no custodial risk, open data) already align perfectly with the new narrative. Leave it.

## What stays identical

- Hero background image, amber/indigo palette, fonts, motion variants (`fadeUp`, `stagger`)
- Filter pills, economy grid layout and card design
- Recent Activity feed component
- Global Economies Map component
- Footer + trust signal strip
- Gated state for logged-out `RootRedirect` users (the `gated` prop continues to blur the grid and show the signup overlay)
- All routes, all data fetching, all React Query keys

## What changes — file-by-file

- **`src/pages/Homepage.tsx`** — only file touched.
  - Rewrite hero eyebrow / headline / subhead / secondary CTA label
  - Add "Measure · Prove · Rank" section component above the filter pills
  - Add "Who it's for" 4-up strip between the map and methodology block
  - Update one subtitle string ("Verified by validators")
  - Update register-CTA subcopy

No new files. No new dependencies. No data-layer changes. No DB migrations. No edge function changes.

## Out of scope

- Logged-in `Home` page (`src/pages/Home.tsx`)
- Methodology page copy
- Leaderboard / Compare / Widget / Dashboard pages
- Any backend, scoring, or wallet logic
