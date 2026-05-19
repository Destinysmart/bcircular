## Goal
The mobile leaderboard cards (visible on `/leaderboard` at ≤768px) currently read as a flat, evenly-weighted grid of labels (`TXNS / ACTIVITY / MERCHANTS / CIRCULARITY`). Nothing draws the eye, the score is just a number in a corner box, and the badges feel pasted on. Users can't tell at a glance "is this economy doing well?" — which is the whole point of a leaderboard.

This plan refines only the **mobile card** (`md:hidden` block, lines 500–535 of `src/pages/Leaderboard.tsx`). Desktop layout, filters, sort, hero, and data are untouched.

## What changes

### 1. Header row — make the score the hero
Today: rank · logo · name · city · flag.
New: same row, but the **score** moves up next to the logo as a small circular badge with the threshold color (red / amber / green). It becomes the first thing the eye lands on, paired with the logo. Flag stays as a tiny chip under the city line. Rank becomes a clearer pill (`#1`, `#2`, …) with podium gold/silver/bronze tint for top 3.

### 2. Badges — single tidy row, left-aligned
Today: centered, wrapping, mixed sizes.
New: left-aligned single row that truncates with `flex-wrap` only if needed. Tier badge first, then confidence, then coverage. BTCMap chip becomes a small mono dot+label to reduce noise.

### 3. Metrics — icon-led, labeled with meaning
Today: 2×2 grid of code-style labels.
New: still 2×2, but each cell gets:
- A small lucide icon (`Zap` for txns, `Activity` for activity rate, `Store` for merchants, `Gauge` for circularity)
- A short human label ("Txns / mo", "Active", "Merchants", "Score")
- The number in mono bold
- The CIRCULARITY cell becomes a mini progress bar under the number, colored by threshold — instantly readable health signal.

### 4. Trend cue
If `weeklyChange !== 0`, show a tiny `TrendingUp/Down` chip next to the score badge (e.g. `+3`) in score-green / destructive. Matches what the desktop already does, but mobile currently hides it.

### 5. CTA row
Today: a full-width "View" outline button.
New: split into two pill buttons — **View** (primary, score-amber filled) and **Compare** (outline with `Scale` icon). Compare is currently desktop-only; surfacing it on mobile matches the page's purpose.

### 6. Card chrome
- Add a subtle left accent bar colored by score tier (today only the desktop variant has this — `md:border-l-4` excludes mobile).
- Add `active:scale-[0.99]` for tactile feedback on tap.
- Increase internal padding from `p-3` to `p-4` and gap from `space-y-3` to `space-y-3.5` so the card breathes.

## Out of scope
- Desktop row layout (lines 462–498)
- Filters, sidebar, search, sort, hero header, "Most improved" banner
- Data fetching, scoring, or any business logic
- Tablet (`md`+) — only `md:hidden` block is touched

## Files touched
- `src/pages/Leaderboard.tsx` — replace the mobile card JSX (lines ~500–535) and extend the `MobileMetric` helper to accept an optional icon + progress bar.

## Visual reference
The current mobile screenshots the user attached are the baseline. The redesign keeps the same information density but redistributes visual weight so the score and trend dominate, metrics read as icons-plus-numbers (not codes), and the card feels like a status card, not a spreadsheet row.
