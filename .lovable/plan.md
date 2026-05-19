# Smart "Install App" CTA

Add a non-intrusive, dismissible prompt that helps users install Bitcoin Circular to their home screen — using the native Android prompt when available, and showing iOS Safari "Share → Add to Home Screen" steps otherwise.

## Behavior

**When it shows (smart triggers, all must pass):**
- App is NOT already installed (no `display-mode: standalone`, no iOS `navigator.standalone`)
- Not inside an iframe (skips Lovable preview entirely)
- On a mobile device (Android Chrome/Edge or iOS Safari) — desktop hidden
- User has visited at least 2 times OR spent >20s on current visit (avoids first-impression spam)
- Not dismissed in the last 14 days (stored in `localStorage`)
- Not permanently dismissed ("Don't show again")

**How it appears:**
- Slide-up bottom sheet/banner above the mobile nav, with brand logo, "Install Bitcoin Circular", short value line ("One tap from your home screen — always fresh data"), an **Install** button, and a small **×** close button.
- Subtle entrance animation (framer-motion, already in stack).

**Interactions:**
- **Android** (when `beforeinstallprompt` fires): tapping **Install** calls `prompt()`. If accepted → hide forever. If dismissed → snooze 14 days.
- **iOS Safari**: tapping **Install** opens a small modal/sheet with illustrated 3-step instructions (Tap Share icon → Scroll → "Add to Home Screen"). Includes a "Got it" button that snoozes 14 days.
- **× / Cancel**: snoozes 14 days.
- **"Don't show again"** link inside the iOS modal: permanent dismiss.

## Files

**New: `src/hooks/useInstallPrompt.ts`**
- Captures the `beforeinstallprompt` event (calls `preventDefault`, stashes it).
- Detects platform: `isIOS`, `isAndroid`, `isStandalone`, `isInIframe`.
- Exposes `{ canPromptNative, isIOSInstallable, promptInstall, dismiss(days), permanentlyDismiss, shouldShow }`.
- Tracks visit count + first-visit timestamp in `localStorage` under `bc_install_*` keys.
- Listens for `appinstalled` event to mark permanently installed.

**New: `src/components/InstallAppPrompt.tsx`**
- Bottom banner using existing design tokens (card bg, border, score-amber accent for the Install button to match the brand CTA in `Navbar`/`Home`).
- iOS instructions rendered inside the existing `Sheet` or `Dialog` component (already in `components/ui/`).
- Uses `lucide-react` icons: `Download`, `Share`, `PlusSquare`, `X`.
- Pure presentation — no business logic, no Supabase calls.

**Edit: `src/App.tsx`**
- Mount `<InstallAppPrompt />` once at the app root (next to `<AssistantGate />`), so it works on every page.
- Hidden on `/widget/*` routes (same pattern as `AssistantGate`).

## Out of scope
- No service worker, no offline cache (manifest-only PWA stays intact).
- No backend tracking of installs.
- No changes to `index.html` or `manifest.webmanifest` (already configured).

## Notes / caveats
- iOS Safari does not expose `beforeinstallprompt`, so the only path on iOS is the instruction sheet — this is expected and matches Apple's platform.
- The prompt is entirely invisible inside the Lovable editor preview (iframe guard), so this won't clutter your editing experience. You'll only see it on `bitcoincircular.com` on a real phone.
- `localStorage` keys are namespaced `bc_install_*` so they're easy to clear during testing.
