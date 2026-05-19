## Goal
Remove the "Sats" AI chat bubble from the embeddable widget iframe so embeds stay clean and identity-free.

## Root cause
`CircularAssistant` is rendered globally in `src/App.tsx` (line 88), so it appears on every route — including `/widget/:slug` (and the local `/widget-test` page's iframes).

## Change
Wrap `<CircularAssistant />` in a small route-guard so it does not mount on widget paths.

```tsx
// src/App.tsx
<Routes>...</Routes>
<AssistantGate />
```

```tsx
// new tiny helper (inline in App.tsx or its own file)
function AssistantGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/widget/') || pathname === '/widget') return null;
  return <CircularAssistant />;
}
```

Note: `useLocation` must be called inside `<BrowserRouter>`, which is already the case here.

## Out of scope
- Widget styling, controls, or copy
- The standalone `/widget-test` host page (only the iframe content needs to be clean — the test page itself can keep the assistant)
- Removing the assistant from any other route
