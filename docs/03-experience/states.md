# States

## Purpose

This doc defines the states every surface shares — empty, waiting, stale,
error, disabled, offline, first-run — and what each one looks like. It
exists because those states were referenced across several docs and
specified in none: empty states appeared three times as a spacing value, a
type size, and a single line of onboarding prose, and "loading" appeared
nowhere at all.

It gives each state a **form**, not copy. Copy belongs to the surface that
shows it.

## Invariants

- Every surface answers for every state in the table below. "Not
  applicable" is an answer; silence is not.
- **States introduce no new colour and no new motion.** Each uses tokens
  from `03-experience/design-tokens.md` and transitions from
  `03-experience/motion-vocabulary.md`.
- **Waiting never animates.** There are no spinners and no shimmer in
  this app, and the decision is recorded as **ADR 0019**. See below for
  why.
- An empty state has exactly one primary action
  (`06-flows/onboarding.md`).
- No state is red except an error. Stale is labelled, not alarmed
  (`02-architecture/data-lifecycle.md`).

## Specification

### The states

| State | When | Form |
|---|---|---|
| **Content** | The normal case | The surface as specified by its owner |
| **Empty** | The surface is valid and has nothing to show | Centred block: `type-display` headline, one line in `text-secondary`, one primary action. `space-10` vertical padding. Static |
| **Waiting** | Work is in flight | Nothing for the first 400ms. Then a static placeholder block in `surface-2` (`radius-md`), plus one line in `text-secondary` when the wait is countable |
| **Stale** | Data is older than its threshold | The freshness annotation: "as of 2 hours ago", `type-footnote`, `stale-bg` / `stale-text`. Data stays visible |
| **Partial** | Some data arrived, some did not | The arrived data renders normally; the missing part carries its own waiting or stale treatment. Never a blank screen |
| **Error** | A defined failure | Per `10-engineering/error-handling.md`: inline for validation, a banner for persistent network and sync failures, an error boundary for unexpected |
| **Disabled** | The action has no meaning here | Unchanged appearance, plus the warning haptic on attempt; a tooltip where the reason is not obvious (`03-experience/gesture-vocabulary.md`) |
| **Offline** | No connectivity | **No state at all.** Reads and writes work; synced data shows its last retrieval time. The only addition is the persistent-failure banner |
| **First-run** | The user has no data yet | The empty state, plus whatever the flow adds — onboarding's seven screens, or the seeded Areas |

### Why waiting does not animate

A spinner asserts that something is happening and roughly how long it will
take. In a local-first app that assertion is usually false: reads come
from a local projection and complete in a frame, so most "loading" is
nothing at all. Animating it would teach the user to distrust the app's
silence.

Three consequences:

- **Under 400ms: show nothing.** No placeholder, no flicker. This is the
  majority of cases and it must be invisible.
- **Past 400ms: show a static placeholder**, so the surface does not
  jump when the content arrives.
- **When the wait is countable, count it.** Sync shows a pending number
  (`07-infrastructure/sync-engine.md`) because it knows the number. A
  cloud AI call does not, so it shows a line of text and no progress.

If a design needs a spinner, the surface has a wait it cannot describe —
which is a product problem to fix, not a state to draw. This is the whole
of ADR 0019; a spinner added later needs that ADR amended, not this table
edited.

### Where each state applies

| Surface family | Empty | Waiting | Stale |
|---|---|---|---|
| Mode lists (Tasks, Habits, Notes, People) | Yes | Rarely — local projections | No |
| Day view sections | Yes — a day with nothing scheduled | No | Yes, for mirrored events and weather |
| Cards in a stream | No — a card that has nothing to say does not appear | No | Yes, for AI-gathered content |
| Sheets and pickers | Yes — an empty picker offers creation | No | No |
| Search and the palette | Yes | Yes — semantic search may wait | No |
| Sync and settings screens | No | Yes — countable | No |
| AI surfaces | No | Yes — uncountable | Yes, on results |

### Empty states, specifically

An empty state is not an error, and it is not a dead end. The rules:

- It states what the surface is for, in one line, without apologising.
- It offers exactly one action, and that action is the fastest way to put
  something in the surface.
- It never says "No results found" — that phrasing belongs to search,
  where the user asked a question that has an answer of "none".
- It never shows an illustration. The app has no illustration system.

## Examples

**The Tasks Today scope, empty, on a new account.**

    [ Tasks ]  Today            [filter] [gear]

         Nothing here yet.
         Capture something and it lands here.
         [ Capture something ]        ← primary action, control-lg

Static. No animation. The action opens the capture field.

**The same scope, waiting on the first sync.**

    Immediately: the empty state above.
    At 400ms (if the pull is still running): the block below replaces
    its headline area —

         [ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ]
          Syncing 412 entries…

    The block is `surface-2`, static, `radius-md`. The number counts down
    as chunks land. No spinner, no shimmer.

**A stale calendar.**

    Day view renders normally.
    Every mirrored event carries "as of 2 hours ago" in `stale-text`.
    Nothing is red. Nothing is hidden. The retry lives in the banner
    (`05-modules/calendar.md`).

## What this doc must NOT do

- This doc does not define copy. It defines the form and the rules; the
  string lives with the surface.
- This doc does not define error taxonomy, retries, or recovery. That is
  `10-engineering/error-handling.md`.
- This doc does not add tokens or transitions. If a state needs one that
  does not exist, that is a change to `design-tokens.md` or
  `motion-vocabulary.md`.
- This doc does not define per-surface states for a screen that has an
  unusual one. It defines the shared states; a surface may add its own
  with its owner's doc.
