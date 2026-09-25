# Drop monorepo

- `apps/web` — the Next.js app (web and the iOS app's content). Its own `AGENTS.md` applies there: this Next.js version differs from what you know, read its bundled docs first.
- `apps/mobile` — Capacitor shell for iOS. `ios/` is the Xcode project; the web build is copied into it by `pnpm ios:sync`.
- `packages/core` — habit logic shared by the apps: types, dates, streaks, drops, formatting, dictionaries. No React, no DOM.

The iOS app runs a static export of `apps/web` (`DROP_TARGET=mobile`), so `apps/web` must stay free of server-only features: no proxy, cookies, route handlers or server actions.
