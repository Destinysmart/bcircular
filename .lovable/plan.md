
# Hide narrative sections on the logged-in home

The "Measure · Prove · Rank" trio and the "Who it's for" strip should appear **only on the public landing page** (the gated, logged-out view at `/`). They should NOT appear for authenticated users.

## Why both sections currently show for logged-in users

`Homepage.tsx` is rendered in three modes:

| Caller | Mode | Sees new sections? |
|---|---|---|
| `RootRedirect` (logged-out) | `<Homepage gated />` | should: yes |
| `RootRedirect` (logged-in) → `Home.tsx` | `<Homepage topSlot={...} compactHero />` | should: **no** |
| Direct nav to `/` while logged in | (same `Home` path) | should: **no** |

The two new sections were added unconditionally, so the logged-in `Home` view also renders them — which is what the screenshot shows.

## Fix

Wrap both new sections in a single condition: render only when neither `topSlot` nor `compactHero` is provided. Those two props are the signal that we're inside the logged-in `Home` shell.

### Change 1 — `src/pages/Homepage.tsx`, around line 238

Wrap the entire `MEASURE · PROVE · RANK` `<section>`:

```tsx
{!topSlot && !compactHero && (
  <section className="border-b border-border bg-card/30">
    {/* ...existing trio content... */}
  </section>
)}
```

### Change 2 — `src/pages/Homepage.tsx`, around line 534

Wrap the entire `WHO IT'S FOR` `<section>` with the same condition:

```tsx
{!topSlot && !compactHero && (
  <section className="border-t border-border">
    {/* ...existing audience strip... */}
  </section>
)}
```

## What stays the same

- All hero copy changes (`Is Bitcoin actually working as money?`)
- Discover subtitle tweak (`Verified by validators`)
- Register CTA subcopy refresh
- Every other section, the gated overlay, all routes, all data

## Out of scope

No backend, no other pages, no new files. One file touched: `src/pages/Homepage.tsx`.
