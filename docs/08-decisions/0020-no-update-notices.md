# ADR 0020 — No Update Notices

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The client is a web app delivered to the browser or to a Capacitor
webview (`07-infrastructure/stack.md`). Its shell is served from a
service worker cache, which has a direct consequence: **once a client
is running, the bytes it has are no longer the bytes the server
has.** A deploy can land at any time while a user keeps working in a
bundle from last week.

The conventional answer to that state is a visible one — a toast or
dialog offering "A new version is available — Reload". It is common
enough that users now expect it, and skipping it looks like an
oversight.

Four properties of this app make the notice unnecessary:

- **The screen is never fetched.** Every screen renders from the local
  log through a local projection (`02-architecture/projections.md`).
  The client holds the full log, all projections, the Tier 1 model,
  and the embeddings model (`07-infrastructure/stack.md`). An old
  client does not render the wrong thing; it renders the same thing
  with older code.
- **The log is the user's, locally.** The device is the authority and
  the server is a sync peer (`02-architecture/local-first.md`).
- **The sync protocol is versioned** (`07-infrastructure/sync-engine.md`),
  so a peer a few versions behind is a supported state and not an
  error state.
- **A mid-session reload is expensive.** Cold start is a < 3s target;
  a session may hold a half-filled capture, an open sheet, a
  long-press menu, or a scroll position. Reloading discards all of it
  at a moment the user did not choose.

So the only thing an update notice buys is that the user learns the
release process happened. That is the app talking about itself, which
Invariant 3 exists to prevent (`01-foundation/principles.md`).

## Decision

**The app never tells the user an update is available.**

1. **No surface for it.** No toast, no banner, no dialog, no badge, no
   "what's new" screen, no dot on the settings gear.
2. **A new version is picked up on the next cold launch.** The new
   service worker installs alongside the running one and takes control
   at a launch boundary, never mid-session. It does not claim clients
   while there is live UI state to lose.
3. **The old client has to stay correct.** Because no notice is shown,
   the release process cannot rely on anyone reloading. Correctness
   must not decay with how long a session has been open.
4. **An old client must not be broken by a new server.** Any change to
   the log schema or the sync protocol must tolerate a client several
   versions behind for as long as a session can plausibly live.
5. **A build identifier in settings is not an announcement.** A
   passive version string, where the user goes looking for it, is
   allowed. It interrupts no one and asks for nothing.
6. **If an old client can ever be wrong, that is a new ADR.** A
   protocol or schema the old build cannot read needs a real surface
   and a real decision, argued on its own terms — not a banner bolted
   onto the shell by whoever hits it first.

## Consequences

**Positive.**

- Attention is never spent on the release process.
- No update component to design, build, animate, translate, or make
  accessible.
- No half-state: nothing is ever "waiting to restart".
- The user never sees the app's plumbing, which keeps the few
  surfaces that do appear meaningful.

**Negative.**

- **A fix reaches a long-lived session only when that session ends.**
  A user who keeps the app resident can run an old build for days.
  On mobile, cold starts are the normal case, so the exposure is
  usually small — but it is real on desktop, and it is the honest
  cost of this decision.
- **The app has no way to force a broken build out.** If a released
  build is bad enough that it cannot be left running, the mitigation
  is server-side or store-side — a bad release is not fixable by a
  prompt the broken build might not be able to render.
- Missing the 400ms states rule for a moment at a launch boundary is
  possible: the new shell loads on the next launch and, until it has
  painted, the user sees whatever the cold-start path shows
  (`03-experience/states.md`).

**Neutral.**

- The service worker's install/wait/activate lifecycle does all the
  work. `skipWaiting` is deliberately not used to take over a live
  session.
- Reversal requires a new ADR, because the absence of an update prompt
  is a decision and not a missing feature.

## Alternatives considered

**Toast with a Reload action (the common pattern).**

- Rejected: it is an interruption whose only possible outcome is that
  the app restarts, offered at a moment the user chose to do
  something else. It trades a real cost for a benefit the user cannot
  perceive.

**Silent swap: reload the page as soon as the new worker is ready.**

- Rejected: it destroys live UI state — an open sheet, a half-typed
  capture, a scroll position — with no warning and no way to defer.

**Prompt only for "important" updates.**

- Rejected: it requires judging importance at release time, and the
  app has no idea what the user is doing. Anyone who has seen a
  "critical update" prompt arrive mid-thought can guess the outcome.

**Badge or dot in settings, cleared when the user visits.**

- Rejected: it is the same announcement, quieter, and it converts a
  passive screen into one that accumulates unread state — which the
  app does not have anywhere else.

**Force the update on the next navigation.**

- Rejected: navigation is exactly when the user has somewhere to be.
  A launch boundary is the only moment where losing transient state
  costs nothing.
