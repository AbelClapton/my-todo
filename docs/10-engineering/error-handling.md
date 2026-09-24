# Error Handling

## Purpose

This doc defines how errors are surfaced, recovered from, and
communicated. It exists because the app has many failure surfaces —
offline, sync, AI, auth, integrations — and each one needs a
consistent response. Inconsistent error handling is what makes an
app feel unreliable, even when it is not.

The rule is: **errors are states, not exceptions.** Every error has
a defined UI, a defined recovery, and a defined response —
surfaced, logged, or retried silently.

## Invariants

- Errors are values (`Result<T, E>`), not thrown exceptions, when
  the caller is expected to handle them
  (`10-engineering/code-conventions.md`).
- Every error state has a defined UI. No silent failures.
- Every error is recoverable or has an explicit "cannot recover"
  state.
- User-facing error copy is calm and neutral
  (`01-foundation/identity.md`). No "Oops!", no "Uh oh!", no
  exclamation marks.
- No error blocks the UI. The user can always keep working — **with one
  exception, and it is named below rather than implied: the app-root error
  boundary replaces the shell, so it blocks everything.** A mode-root or
  surface-root boundary blocks only its own subtree, which is what the
  invariant is about. An unexpected error at the root is the one state in
  the app where no work is possible, and it is also the state with the fewest
  recovery paths.
- Error boundaries catch unexpected errors; expected errors return
  Results.

## Specification

### The failure taxonomy

Every **failure** falls into one of these categories, and each has a
**recovery the app performs** — a retry, a disable, a surface, a
reload. That is the test that bounds the list: a message answered by
something outside the app (the clock, the user's wallet, a future
build) is not a failure and belongs to the owner of the state it
reports. Four such messages exist and are indexed in §Messages
outside this taxonomy below.

**1. Validation errors.** User input that fails Zod validation.

- **Surfaced:** inline, next to the field.
- **Recoverable:** yes, by editing.
- **Copy:** "Title is required." (specific, calm)
- **Logged:** no. Validation is a normal state.

**2. Network errors.** A request failed due to connectivity.

- **Surfaced:** nothing for the first 400ms, then
  `03-experience/states.md`'s Waiting form — a static `surface-2`
  placeholder, plus one line once the failure is persistent. **A wait a
  user is in always obeys the 400ms threshold**; the silent period below
  is only for a background cycle, which is not a wait (see "Retry
  policy").
- **Recoverable:** yes, retry with backoff.
- **Copy:** "Offline. Retrying." or "Can't reach the server."
- **Logged:** yes, in the client console. Not to the log.

**3. Sync errors.** The log failed to sync.

- **Surfaced:** a subtle indicator in settings and in the header.
- **Recoverable:** yes, on next sync cycle.
- **Copy:** "Last sync: 2 hours ago. [Retry]"
- **Logged:** client-side diagnostics buffer. Not an event log
  entry.

**4. AI errors.** The AI failed to respond, returned an invalid
response, or was unavailable.

- **Surfaced:** inline in the AI surface (the sheet, the palette,
  the chip).
- **Recoverable:** yes, retry or fall back.
- **Copy:** "Couldn't complete. Try again?" or "Assistant needs a
  connection."
- **Logged:** `ai.failed` entry.

**5. Auth errors.** Session expired, token invalid.

- **Surfaced:** a prompt to re-authenticate, only when the user
  attempts a protected action.
- **Recoverable:** yes, by re-auth.
- **Copy:** "Sign in to continue."
- **Logged:** `system.auth_expired`.

**6. Integration errors.** Calendar, health, contacts, or weather
sync failed.

- **Surfaced:** a subtle indicator in the relevant surface (e.g.,
  the calendar shows "as of 2 hours ago").
- **Recoverable:** yes, on next sync.
- **Copy:** "Calendar sync failed. Retry." (neutral)
- **Logged:** client-side diagnostics buffer. Not an event log
  entry. (`integration.failed` is not a defined event type; the
  diagnostics buffer records the failure with a timestamp and
  integration name.)

**7. Domain errors.** An operation violated a domain rule (e.g.,
editing a metric during an active protocol).

- **Surfaced:** the action is disabled with a tooltip explaining
  why.
- **Recoverable:** depends. Some are permanent (protocol
  immutability); some are transitional.
- **Copy:** "Metric can't change during an active protocol."
- **Logged:** no. This is expected behavior, not an error.

**8. Unexpected errors.** Bugs, invalid state, impossible
conditions.

- **Surfaced:** a full-screen error boundary.
- **Recoverable:** partially. The user can reload or report.
- **Copy:** "Something went wrong. [Reload] [Report]"
- **Logged:** yes, with a stack trace, if the user opts in.

### The Result type

Expected errors use a Result:

    type Result<T, E> =
      | { ok: true; value: T }
      | { ok: false; error: E }

Example:

    async function fetchEvents(day: DateString): Promise<Result<Event[], SyncError>> {
      try {
        const response = await api.get(`/events?day=${day}`);
        if (!response.ok) {
          return { ok: false, error: { kind: 'http', status: response.status } };
        }
        return { ok: true, value: parseEvents(response.body) };
      } catch (e) {
        return { ok: false, error: { kind: 'network', cause: e } };
      }
    }

Callers handle both branches. There is no "forgot to check the
error" state, because the error is in the return type.

### Error boundaries

Unexpected errors are caught at three levels:

1. **App root.** A full-screen boundary with "Something went wrong.
   [Reload] [Report]".
2. **Mode root.** Each mode (Calendar, Tasks, Habits, Notes) has
   its own boundary. If a mode crashes, the rest of the app
   survives.
3. **Surface root.** AI sheets, modals, and popovers have their own
   boundaries. If an AI call crashes the sheet, the app survives.

Boundaries report to a client-side error reporter (Sentry or
equivalent) if the user has enabled crash reporting
(`05-modules/settings.md`). By default, crash reports are opt-in.

### Retry policy

- **Network errors (user-initiated):** retry with exponential
  backoff — 2s, 4s, 8s, 16s, 32s. Five attempts, then surface the
  error. **The ladder is 62 seconds end to end**, and every second of
  it past 400ms shows `03-experience/states.md`'s Waiting form: a
  static placeholder at the surface's own size, and one line of copy
  once the failure is clearly persistent. The attempts themselves stay
  invisible when they succeed — the placeholder resolves into content
  with no cross-fade (ADR 0019).
- **Network errors (background sync):** retry indefinitely, with
  the interval capped at 60s. The sync engine does not surface
  these as errors until the failure passes the sync indicator's
  1-hour threshold (`07-infrastructure/sync-engine.md`) — which is
  also when the indicator's Retry appears.
- **Sync errors:** retry on the next sync cycle. No user-facing
  retry control unless the failure persists > 1 hour — and there is
  **one** such control, in the indicator, which Settings → Sync
  points at rather than duplicating.
- **AI errors:** retry once automatically. If it fails again,
  surface the error and let the user decide.
- **Integration errors:** retry on the next scheduled sync. Surface
  the freshness indicator.

Retries are invisible when they succeed. They only surface when
they fail repeatedly.

**A wait and a state are two different things, and this section used one
rule for both.** A **wait** is a person looking at a surface with a result on
the way: the 400ms threshold applies, the placeholder is drawn, and the app
nearly always owes them something on screen. A **state** is the device being
behind — a background cycle failing, a mirror growing stale — and nobody is
waiting in it. States report through the indicator and the banner and obey no
400ms rule, because there is no surface to change at 400ms. The
user-initiated ladder is the first kind and was being described as the second;
the 62-second silence was the result.

### Offline behavior

The app is local-first (`02-architecture/local-first.md`). When
offline:

- Reads work. Projections are local.
- Writes work. Log appends are local.
- Sync queues for later.
- AI features that require cloud are disabled with a note.
- Integrations show their last-synced state.

Being offline is a normal state and never produces an error state.
The only thing that can appear is the informational line in the copy
table below, and only once the failure is persistent: "Offline.
Changes will sync when you reconnect." It reports; it does not
alarm; it never blocks.

### Messages outside this taxonomy

Four messages in the app carry a defined UI, a stated string and a stated
duration, and none is a failure in any of the eight senses above. Each is
ownered by the doc that specifies it; this is an index, not a second copy of
their copy.

| Message | Owner | Recovery is |
|---|---|---|
| Quota exhausted | `07-infrastructure/cost-model.md` | the reset date, or upgrading |
| Rate limited | `07-infrastructure/cost-model.md` | a stated wait, and explicitly *not* a retry |
| Deliberate fallback (Tier 3 → simple) | `07-infrastructure/cost-model.md` | the reset date |
| Client too old for an entry | `02-architecture/local-first.md` | the user updating the app |

**What they have in common is the reason they are not failures: none of them
is answered by an action the app takes.** The taxonomy above is a table of
recoveries, and every entry in it names something this app does — retry,
disable, surface, reload. These four are answered by the clock, by the user's
wallet, or by a future build, which is a different kind of thing and belongs
with the state it reports.

`05-modules/settings.md` was not the only doc that had them; it was the only
doc that had two messages about *retrying* without saying how they differ.

### User-facing copy

All error copy follows these rules:

- Specific. "Can't reach the server" beats "Something went wrong."
- Neutral. No exclamation marks, no emoji, no "Uh oh!"
- Actionable. Tell the user what they can do.
- Short. One line.

Examples:

| Situation | Copy |
|---|---|
| Offline, waiting on a call | `states.md`'s Waiting placeholder, then one line |
| Offline, persistent | "Offline. Changes will sync when you reconnect." |
| Sync failed | "Last sync: 2 hours ago. [Retry]" |
| AI unavailable | "Assistant needs a connection." |
| AI failed | "Couldn't complete. [Try again]" |
| Auth expired | "Sign in to continue." |
| Calendar sync failed | "Calendar as of 2 hours ago. [Retry]" |
| Invalid input | "Title is required." |
| Domain rule | "Metric can't change during an active protocol." |
| Unexpected | "Something went wrong. [Reload] [Report]" |

The table covers this doc's eight categories and nothing else. The four
messages in §Messages outside this taxonomy carry copy too, and it stays in
their owners' files — a string restated here is a string that will drift.

### Logging

Errors are logged per category:

- **Validation, domain:** not logged. They are expected behavior.
- **Network, sync, integration:** logged client-side in the
  console for development; not persisted.
- **AI:** logged as `ai.failed` in the event log (so the user's
  AI usage history is complete).
- **Auth:** logged as `system.auth_expired`.
- **Unexpected:** logged to the error reporter, if enabled.

Logs never contain sensitive data (note bodies, health data,
person names). Error logs for AI calls contain the call's
`call_id` and error kind, not the input
(`02-architecture/event-log.md`).

### Recovery flows

Each category has a defined recovery:

- **Validation:** fix the input.
- **Network:** automatic retry; the user can force a retry from the sync
  indicator's third state, which Settings → Sync points at. The earlier
  wording named a second settings-only action ("Retry network now") with its
  own condition, and a network error is what causes a sync failure, so the
  two would always have appeared together.
- **Sync:** automatic on next cycle; user can force sync from
  settings.
- **AI:** retry the action; the AI's proposal is preserved.
- **Auth:** re-authenticate; the pending action resumes.
- **Integration:** re-connect from settings.
- **Domain:** complete or abandon the blocking condition (e.g.,
  finish the protocol before editing the metric).
- **Unexpected:** reload; if persistent, report.

### No silent failures

Every error either:

1. Surfaces to the user, or
2. Is handled and logged, or
3. Is retried silently.

There is no fourth option. If an error is not handled, it is a bug.

## Examples

**A network error during sync.**

    Sync tries to push. Network is down.
    Returns Result.err({ kind: 'network' }).
    Retry scheduled in 2s.
    No UI surfaced (transient).
    Retries at 4s, 8s, 16s, and 32s all fail.
    The ladder is exhausted, so one line appears: "Offline. Changes
    will sync when you reconnect."
    Nothing is blocked. Writes keep landing in the local log.

    Had this been a background cycle instead of a foreground push,
    nothing would have surfaced until the failure passed the 1-hour
    threshold.

**An AI call fails.**

    User invokes "Research this."
    Tier 2 calls the cloud. 500 error.
    Retried once. Fails again.
    Result.err returned.
    Sheet shows: "Couldn't complete. [Try again] [Dismiss]."
    `ai.failed` logged.
    User can retry; the task is unchanged.

**A validation error.**

    User types a title that is too long (501 chars).
    Zod validation fails on submit.
    Inline error under the field: "Title is too long."
    The submit is blocked. The user edits and retries.

**A domain rule.**

    User opens an active protocol's metric and tries to change
    the scale.
    The edit button is disabled.
    Tooltip: "Metric can't change during an active protocol."
    No error, no log. The action was never valid.

**An unexpected error.**

    A bug in the day-view projection throws.
    Caught by the Calendar mode's error boundary.
    Calendar shows: "Something went wrong. [Reload]"
    Other modes still work.
    Error reported if crash reporting is enabled.

**Being offline.**

    User is on a plane.
    Opens the app.
    Calendar shows last-synced state with an "as of" annotation.
    User completes a task. Log append succeeds locally.
    User starts research. AI sheet shows: "Assistant needs a
    connection."
    No error banner. Offline is normal.

## What this doc must NOT do

- This doc does not define the UI components for errors. It
  defines behavior and copy. Components live in
  `src/ui/components/`.
- This doc does not define the code conventions for Result types.
  Those are `10-engineering/code-conventions.md`.
- This doc does not define specific error messages for every
  domain rule. It defines the pattern. Specific messages are per
  module.
- This doc does not define the crash reporter's implementation.
  That is a library choice.
- This doc does not define retry scheduling in the sync engine.
  That is `07-infrastructure/sync-engine.md`.