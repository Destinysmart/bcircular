## Manifest-only PWA (installable, no service worker)

Goal: make Bitcoin Circular installable to the home screen on iOS and Android with the official logo, standalone display, and brand-themed splash — without any service worker, offline cache, or background sync. Data stays always-fresh from Lovable Cloud.

### What ships

1. **`public/manifest.webmanifest`** — new file
   - `name`: "Bitcoin Circular"
   - `short_name`: "Circular"
   - `description`: same as site meta description
   - `start_url`: `/`
   - `scope`: `/`
   - `display`: `standalone`
   - `orientation`: `portrait`
   - `theme_color`: brand indigo (from `index.css` `--primary`)
   - `background_color`: brand background (from `index.css` `--background`)
   - `icons`: 192×192 and 512×512 PNGs (both `purpose: "any"` and a `maskable` 512 variant) sourced from the existing brand kit
   - `categories`: `["finance", "productivity"]`

2. **Icon files in `public/`** — reuse the official logo PNGs already in the brand assets kit. Add if missing:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png` (logo with safe-zone padding so Android adaptive masks don't crop it)
   - `apple-touch-icon.png` (180×180, opaque background so iOS doesn't show transparency)

3. **`index.html`** — add inside `<head>`:
   - `<link rel="manifest" href="/manifest.webmanifest" />`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`
   - `<meta name="theme-color" content="<brand indigo hsl→hex>" />`
   - `<meta name="apple-mobile-web-app-capable" content="yes" />`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
   - `<meta name="apple-mobile-web-app-title" content="Circular" />`
   - `<meta name="mobile-web-app-capable" content="yes" />`

### What is explicitly NOT included

- No `vite-plugin-pwa`, no `sw.js`, no `service-worker.js`
- No offline cache, no runtime caching, no precache
- No install-prompt UI / `beforeinstallprompt` handler
- No push notifications
- No version-polling endpoints or cache-busting meta tags

### Why this is safe for the Lovable preview

No service worker is registered, so there is nothing to intercept iframe navigations or serve stale shells. The manifest itself is inert until a user taps "Add to Home Screen" on a real device on the published domain.

### Verification

After implementation:
- Confirm `manifest.webmanifest` is reachable and valid JSON
- Confirm `index.html` head includes the new tags
- Note to user: install only works on the published URL (bitcoincircular.com), not inside the editor preview iframe

### Caveats to flag to the user

- Manifest fields (`name`, `start_url`, `display`, icons) are pinned at install time per device. Picking good values now matters because existing installs won't update them later.
- "Add to Home Screen" on iOS is a manual user action in Safari's share sheet — there is no install prompt.
