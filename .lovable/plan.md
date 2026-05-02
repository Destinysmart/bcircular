## Goal

Make circular flow honest about its coverage. Connected wallets vs estimated wallets (merchants + earners) drives a single coverage tier used everywhere. Raw transaction/merchant/earner numbers stay untouched.

## Coverage model (single source of truth)

Create `src/lib/coverage.ts` with one helper used by every new UI piece:

```ts
type CoverageTier = 'none' | 'limited' | 'partial' | 'good' | 'high';
getCoverage(connectedWallets, merchants, earners) =>
  { tier, connected, estimated, label, color, description }
```

Thresholds (per spec):
- 0 → `none` (red, "No wallets connected")
- 1–2 → `limited` (red, "Very Limited")
- 3–9 → `partial` (amber, "Partial")
- 10–19 → `good` (green, "Good")
- 20+ → `high` (green bold, "High ✓")

`estimated = merchants + earners`. Connected wallets = `wallets` rows for the community (already queried in several pages).

## 1. New `WalletCoverageIndicator` component

`src/components/WalletCoverageIndicator.tsx` — the card from spec:
- Title "Wallet Coverage" with a small icon
- "X wallets connected of ~Y estimated"
- Tier label badge + colored progress bar (target 20)
- Helper line: "Higher coverage = more accurate circular flow measurement"
- "Connect a wallet →" link to `/c/:slug/join-as-earner` (or `/connect`)
- Stacks vertically below 768px

Mounted on `CommunityDashboard.tsx` directly above `CircularFlowSpotlight` / the gauge area. Uses the existing `walletCount`, `merchants`, `earners` queries already on the page — no new DB load.

## 2. Fix `CircularFlowGauge` labels and percentage

`src/components/charts/CircularFlowGauge.tsx`:

- Replace tile labels:
  - "Circulated" → **"Internal flows"** (tooltip: "Sats transacted between two connected wallets in this economy. Both sides of each payment are counted.")
  - "Exited" → **"Unmatched outflows"** (tooltip: "Sats sent to wallets not connected to this economy. This includes payments to community members who haven't connected their wallet yet — not necessarily money leaving the community permanently.")
- Add a third tile **"External inflows"** by extending the `flow-sums-30d` query to also sum `flow_type = 'inflow_external'` (data already present in `blink_transactions`). Tooltip: "Sats received from wallets outside this economy — shows external demand for goods and services here."
- Use `<TooltipProvider>` from existing `ui/tooltip.tsx`.
- Center label change:
  - Default: **"X% detected as internal"** with subtitle "Among connected wallets only"
  - When coverage tier is `none` or `limited` (< 3 connected wallets): hide the percentage entirely; render only "Insufficient wallet coverage to calculate meaningful rate" inside the ring.
- Accept `coverageTier` as a prop (passed from parent that already has wallet/merchant/earner data) so the gauge does not duplicate queries.

No change to the underlying sum logic.

## 3. Methodology page — new section

Append a section to `src/pages/Methodology.tsx` titled **"How Circular Flow Is Measured"** with the four sub-blocks from the spec verbatim: HOW IT WORKS, WHY THIS MATTERS, DATA SOURCES, PRIVACY. Insert it right after the existing "Final Score" block, before "Data Sources". Use the same card styling already used in the file.

## 4. Economy admin dashboard banner

`src/pages/EconomyAdminDashboard.tsx`:

- Add a query for wallet count (or compute from existing `ConnectedWalletsManager` data; simplest: a small `select id, count: 'exact', head: true` from `wallets`).
- Above `EconomyAlerts`, render:
  - **Red banner** when 0 wallets: "🔴 No wallets connected — Circular flow cannot be measured yet…" with CTA to `BlinkWalletSettings` section anchor.
  - **Amber banner** when 1–2 wallets: "⚠️ Low wallet coverage…" with CTA "Get connect links →" linking to `/c/:slug/join-as-earner` and the merchant claim manager section.
- Suppress banner once coverage ≥ 3.

These banners are pure UI — no DB writes, no new alert rows.

## 5. Leaderboard — coverage indicator next to circularity

`src/pages/Leaderboard.tsx` and `src/lib/api.ts` (`fetchAllCommunitiesWithStats`):

- Extend the per-community stats fetch to include `connectedWallets` (single grouped count of `wallets` per community, fetched in one round-trip).
- In each leaderboard row that displays the circularity number/score-derived percentage:
  - High (≥10): show value normally
  - Partial (3–9): prefix value with `~` (e.g. `~23%`) plus tiny info icon
  - Limited (<3): show `–` with tooltip "Insufficient wallet coverage"
- Coverage logic uses the new `getCoverage` helper.

The score column itself is not gated — only the circularity-flow-derived display.

## 6. Homepage economy cards — coverage badge

`src/pages/Homepage.tsx`:

- Use the same `connectedWallets` field added in step 5.
- Below the circularity score on each card, render a tiny coverage badge:
  - 🟢 High coverage / 🟡 Partial coverage / 🔴 Limited coverage / ⚫ No wallets connected
- Wrap with `Tooltip` explaining what the tier means.

## 7. Connect wallet CTA enhancements

Touch the existing CTA spots used by the new banners and `WalletCoverageIndicator`:

- `JoinAsEarner.tsx` and `ConnectWallet.tsx` headers: append the line "Each connected wallet improves circular flow accuracy for {economyName}" plus a thin progress bar "Coverage: X / 20 wallets connected" using the same helper.
- No change to the actual wallet-connect flow.

## 8. Untouched

- `calculate-score` edge function and all pillar math.
- BTCMap sync.
- Monthly transaction count, activity rate, merchant/earner counts (no disclaimers added).
- `economy_wallet_metrics.real_circularity_rate` value — only how it is presented.

## Theming / responsive

- All new UI uses `var(--background)`, `var(--foreground)`, `var(--border)`, `var(--muted-foreground)`, `var(--primary)` and the existing `--score-amber / --score-green / --score-red` tokens — automatically dark/light correct.
- Coverage card and banners stack vertically below `md:` breakpoint (768px).

## Files touched

New:
- `src/lib/coverage.ts`
- `src/components/WalletCoverageIndicator.tsx`

Edited:
- `src/components/charts/CircularFlowGauge.tsx`
- `src/pages/CommunityDashboard.tsx`
- `src/pages/EconomyAdminDashboard.tsx`
- `src/pages/Leaderboard.tsx`
- `src/pages/Homepage.tsx`
- `src/pages/Methodology.tsx`
- `src/pages/JoinAsEarner.tsx`
- `src/pages/ConnectWallet.tsx`
- `src/lib/api.ts` (add `connectedWallets` to community stats)
