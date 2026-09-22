# ADR 0004 — Capacitor over Tauri

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The app is web-first. Mobile apps are desirable but not v1-critical.
If and when mobile apps are built, they should wrap the web app
without forking it.

Two options for the wrapper:

- **Capacitor.** Native WebView container. Reuses ~95% of the web
  app. Mature ecosystem. Production-ready on iOS and Android.
- **Tauri.** Rust-based container. Smaller bundles (~5-10MB vs
  ~150MB for Electron, ~50MB for a typical Capacitor app). Better
  performance. But its mobile DX is newer and less battle-tested.

## Decision

Use **Capacitor** for v1. Revisit Tauri when its mobile ecosystem
matures (expected 2026–2027).

## Consequences

**Positive.**

- Production-ready mobile shells today.
- Same codebase for web, iOS, Android.
- Mature plugins for STT, haptics, secure storage, share sheet.
- Familiar to most web developers.

**Negative.**

- Larger bundle size than Tauri (~50MB vs ~10MB).
- Performance is WebView-bound, not native.
- Some platform-specific quirks (keyboard, safe areas) require
  workarounds.

**Neutral.**

- The decision is reversible. If Tauri mobile matures, the shell
  layer can be replaced without touching the web app.

## Alternatives considered

- **Tauri.** Better tech, less mature mobile story. Revisit later.
- **React Native.** Would require rewriting the UI. Rejected —
  violates the "one codebase" invariant.
- **Flutter.** Same problem as React Native.
- **Native iOS + Android.** Two codebases. Not viable for a solo
  or small team.
- **PWA only.** Would work on Android, unreliable on iOS. Mobile
  shells are needed for App Store presence, push notifications,
  and background sync.

## Related

- `07-infrastructure/stack.md` — full stack.