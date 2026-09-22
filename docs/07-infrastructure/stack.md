# Stack

## Purpose

This doc defines the technology choices for the app and why each
was made. It exists because the architecture (event log, local-first,
AI proposal layer, shell apps) constrains the stack, and choosing
poorly means fighting the framework instead of building the product.

Every choice below is a decision that follows from the architecture.
If the architecture changes, this doc changes via an ADR.

## Invariants

- The client holds the full log and computes projections locally
  (`02-architecture/local-first.md`). The stack must support this.
- The same event schemas, domain logic, and types are used on client
  and server. One language.
- The web app is the primary target. Shell apps (iOS, Android) wrap
  the web app; they do not fork it.
- AI runs on-device where possible and in the cloud where necessary
  (`04-ai/retrieval-layer.md`).
- The stack is chosen to serve the architecture, not to match
  industry fashion.

## Specification

### Core stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | One language across client, server, shell, and AI tooling. Event schemas, graph edges, and AI contracts are all typed. |
| Framework | TanStack Start | Built for local-first and offline-first. Route loaders can read IndexedDB during a hard load and paint without waiting for the origin. |
| Client DB | SQLite (WASM) via Drizzle ORM | Event sourcing needs a real queryable store. Drizzle gives type-safe schemas that run in the browser via WASM. Same schema on client and server. |
| Server DB | SQLite → Turso (libSQL) | Start with SQLite. The event sourcing pattern is unchanged when migrating to Turso for multi-device sync. Only the outbound adapter changes. |
| UI | React + Tailwind + shadcn/ui | shadcn/ui is the component baseline (`03-experience/design-tokens.md`). Tailwind enforces tokens. |
| State | TanStack Query + TanStack DB | Query handles server-state cache (calendar mirror, auth, integration responses). DB handles reactive local queries over the event log — every projection is read through DB and re-renders on new log entries. They are used for different concerns and do not overlap. |
| Shell apps | Capacitor | Wraps existing web code in a native WebView. Reuses ~95% of the codebase. |
| On-device AI | WebGPU + small model (Tier 1, embeddings) | Tier 1 parsing and semantic search run locally (`04-ai/retrieval-layer.md`). |
| Cloud AI | Model with native web search (Tier 3, research) | Research requires web search; synthesis benefits from a large model. |
| Voice | Platform STT (on-device) via Capacitor plugin | Push-to-talk only. No wake word. |
| Auth | Supabase Auth | Email magic-link, Apple and Google sign-in. Identity only — application data lives in SQLite/Turso, not in Supabase's Postgres. See `07-infrastructure/auth.md`. |

### Why these, and not the alternatives

**TanStack Start, not Next.js.** Next.js is server-components-first
and fights local-first. You would spend more time escaping its
assumptions than building. TanStack Start is designed around the
pattern this app actually needs: read local, sync when possible.

**SQLite/WASM + Drizzle, not IndexedDB alone.** IndexedDB is a
key-value store with a poor query story. Event sourcing and
projections need joins, aggregations, and ordered scans. SQLite via
WASM gives real SQL. Drizzle gives types.

**Turso (libSQL), not Postgres (for v1).** Postgres is correct at
scale but unnecessary for the first 10,000 users. Turso is SQLite
compatible, so the migration from a local-only SQLite to a synced
Turso is minimal. Revisit if server-side queries become
compute-heavy.

**Capacitor, not Tauri (for mobile).** Tauri is excellent for
desktop; its mobile DX is not yet production-ready. Capacitor is
the current default for web-first mobile. Revisit Tauri when the
ecosystem matures (see ADR 0004).

**Capacitor, not React Native or Flutter.** Those require
near-complete UI rewrites and two codebases. Capacitor's WebView
approach reuses the web app.

**No dedicated event sourcing library (yet).** Libraries like
`ts-event-core` or `Hamstore` target complex aggregates with
dozens of event types. This app has a handful. Build the append-only
log directly with Drizzle; add a library later if projection
complexity justifies it.

**WebGPU for on-device AI, not WASM-only.** WebGPU is available in
all modern browsers and unlocks small-model inference at acceptable
latency. Fall back to WASM if WebGPU is unavailable.

### Repository layout

    app-name/
    ├── docs/                     ← everything in this doc set
    ├── src/
    │   ├── domain/               ← atoms, edges, events, commands
    │   │   ├── events/           ← event type definitions + schemas
    │   │   ├── atoms/            ← Task, Event, Note, Habit types
    │   │   ├── layers/           ← Area, Goal, Protocol, Person types
    │   │   └── edges/            ← canonical edge types
    │   ├── projections/          ← init() and apply() for each projection
    │   ├── ai/
    │   │   ├── constitution.ts   ← the eight rules, verbatim
    │   │   ├── tiers/            ← tier-1, tier-2, tier-3
    │   │   ├── retrieval/        ← tools + router (local vs cloud)
    │   │   └── research/         ← the research pipeline
    │   ├── ui/
    │   │   ├── tokens.ts         ← the token source of truth
    │   │   ├── components/       ← shadcn + custom
    │   │   ├── modes/            ← calendar, tasks, habits, notes
    │   │   └── flows/            ← capture, morning plan, shutdown, etc.
    │   ├── sync/                 ← local-first sync engine
    │   ├── shell/                ← Capacitor wrappers, platform APIs
    │   └── app/                  ← routing, layout, entry
    ├── drizzle/                  ← schema + migrations
    ├── public/                   ← assets, manifest, service worker
    ├── tailwind.config.ts        ← tokens mapped, arbitrary values disabled
    └── package.json

### Build and tooling

- **Package manager:** pnpm (fast, strict, disk-efficient).
- **Build:** Vite (via TanStack Start).
- **Linting:** ESLint + `eslint-plugin-tailwindcss` with
  `no-arbitrary-value`. This is what enforces the token rule.
- **Formatting:** Prettier.
- **Testing:** Vitest (unit), Playwright (e2e, visual regression).
- **Type checking:** `tsc --noEmit` in CI.
- **Visual regression:** Playwright screenshots at 390px, 768px,
  1440px, and dark mode.
- **Accessibility:** axe-core in CI (contrast, labels, roles).

### Environment variables

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (or the auth
  provider's equivalents).
- `TURSO_URL`, `TURSO_TOKEN`.
- `AI_CLOUD_API_KEY` (for Tier 3 and research).
- `SEARCH_API_KEY` (for research; Bing, Brave, or SerpAPI).
- All secrets are server-side only. The client never sees a
  provider key.

### What the client ships

- The full log (encrypted at rest in the local SQLite).
- All projections.
- Tier 1 model (small, cached after first load).
- Embeddings model (small, for semantic search).
- The UI.
- The service worker (for offline).

The client does not ship:

- The cloud model.
- The search API key.
- Any user's data (it is the user's data).

### Performance targets

- Cold start (first load): < 3s on a mid-range phone.
- Warm start: < 500ms.
- Log append: < 10ms.
- Projection recompute (incremental): < 50ms.
- Tier 1 parse: < 200ms.
- Semantic search: < 300ms (local).
- Calendar day view render: < 100ms.

These are targets, not contracts. If a target is missed, the
architecture is intact but the implementation needs work.

## Examples

**A typical cold start.**

    1. Service worker serves the app shell from cache.
    2. SQLite/WASM opens the local log.
    3. Projections for the default mode (Calendar) compute from the
       log.
    4. The day view paints.
    5. Sync begins in the background.
    6. Tier 1 model loads if not already cached.

Total: under 3s on a mid-range phone.

**Offline editing.**

    User is on a plane. The app is open.
    The user completes a task.
    Log append (local). Projection recompute (local). UI updates.
    Sync queues the entry. No network needed.

**Online sync.**

    User lands. Wi-Fi connects.
    The sync engine pushes queued entries.
    Server merges and broadcasts.
    The client pulls any new entries.
    Projections recompute incrementally.

**On-device parse.**

    User types "Call dentist Tuesday."
    Tier 1 model runs in a Web Worker.
    Result returns in ~150ms.
    No network round-trip.

## What this doc must NOT do

- This doc does not define the event log. That is
  `02-architecture/event-log.md`.
- This doc does not define projections. That is
  `02-architecture/projections.md`.
- This doc does not define sync protocol details. That is
  `07-infrastructure/sync-engine.md`.
- This doc does not define auth. That is
  `07-infrastructure/auth.md`.
- This doc does not define the AI's constitution or tiers. Those
  are in `04-ai/`.
- This doc does not lock in specific version numbers or minor
  library choices. Those are implementation details.