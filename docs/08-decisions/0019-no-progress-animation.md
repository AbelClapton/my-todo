# ADR 0019 — No Progress Animation

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

No doc in the numbered spec set specified what the app shows while it
waits. The design pass that produced `03-experience/states.md` found
the word "loading" appearing nowhere at all, which is why the gap
closed with a decision rather than a component.

Every available default argues the other way. Each platform convention
offers a spinner, each UI library ships one (shadcn's `Spinner`,
Tailwind's `animate-spin`, `animate-pulse` for skeletons), and users
have been trained to read a spinner as "working". Building one costs
nothing.

The reason not to is that a spinner is an **assertion**: something is
progressing, on your behalf, and it will end. That assertion is
usually false here. The app waits in exactly three places, and they
are not alike:

- **Reads from a local projection.** `02-architecture/projections.md`
  computes state from the log on the device, and incremental recompute
  is a < 50ms target (`07-infrastructure/stack.md`). Most "loading" is
  under one frame, so there is nothing to show and nothing to assert.
- **Sync.** Countable. `07-infrastructure/sync-engine.md` knows how
  many entries are pending, so it can state a number instead of
  miming progress.
- **A cloud model call.** Tier 3 and research are genuinely
  uncountable and can take seconds
  (`04-ai/tier-3-assistant.md`, `07-infrastructure/cost-model.md`).
  This is the one real wait, and it is the one where a spinner would
  be least informative: it knows nothing the user does not.

Animating the wait would also draw the eye to the case where the app
has the least to say, which is the opposite of what Invariant 3 asks
of a surface (`01-foundation/principles.md`).

## Decision

**Waiting never animates. There are no spinners, no shimmer, and no
indeterminate progress anywhere in the app.**

1. **Under 400ms: show nothing.** No placeholder, no fade, no flicker.
   This is the majority of cases and it must be invisible.
2. **Past 400ms: show a static placeholder** in `surface-2` at
   `radius-md`, plus one line in `text-secondary`, so the surface does
   not jump when content arrives. It is static — it does not pulse,
   shimmer, or breathe.
3. **Countable waits show the count.** Sync reports the pending number.
   An uncountable wait (the cloud call) shows a line of text and no
   progress indicator at all.
4. **The placeholder does not animate on arrival.** New content enters
   through whatever transition it normally has; there is no
   cross-fade between placeholder and content.
5. **The long-press delay is not a wait.** `duration-longpress` is
   deliberate input, not work in flight, and is unaffected by this
   decision.
6. **A wait the app cannot describe is a product problem, not a state
   to draw.** If a surface seems to need a spinner, the surface has a
   latency or an expectation to fix.

The 400ms threshold is a delay, not a duration token. It happens to
equal `duration-deliberate`, and the two are not the same thing: one
is how long the app waits before showing anything, the other is how
long a completion animation lasts.

## Consequences

**Positive.**

- The app never claims progress it cannot observe.
- No new tokens, no new component, and no seventh duration — the
  motion vocabulary stays at six durations and two easings
  (`03-experience/motion-vocabulary.md`).
- Nothing to localise, theme, or maintain. There is no spinner
  component to keep consistent with the rest of the system.
- Silence is honest, so the app's silence stays meaningful: when
  something does appear, the user can trust it is real.

**Negative.**

- On a slow cloud call the surface is still while nothing is
  visible. The burden moves to copy and to keeping the wait short,
  and the wait has a timeout it must fail on
  (`10-engineering/error-handling.md`) rather than a spinner it can
  hide behind.
- A quiet surface does not distinguish "slow" from "stuck". The
  timeout and the failure banner are the only signals, so both must
  be reliable.
- A designer reading the states table will read the absence as
  unfinished work. That is why this ADR exists.

**Neutral.**

- Reversal is not free. Adding a spinner later requires a new ADR,
  because the reason there is none is a decision and not an omission.

## Alternatives considered

**Spinner after 400ms (the platform default).**

- The most conventional answer, and what most reviewers will expect.
- Rejected: the assertion is usually false, and a spinner that appears
  and vanishes inside 200ms is worse than nothing — it is a flicker
  the user learns to ignore.

**Skeleton shimmer (the modern default).**

- Shows the shape of the content that is coming, which does help a
  slow list feel faster.
- Rejected for two reasons: shimmer asserts activity, and a skeleton
  is a claim about the shape of the result. For an AI result the app
  cannot know the shape before the answer arrives, so the skeleton
  would be a lie dressed as a layout.

**Static skeleton, no shimmer.**

- This is the closest runner-up, and it is what the decision
  effectively adopts — but only past 400ms, and described as a
  placeholder rather than a skeleton, because a skeleton implies a
  known shape.

**Indeterminate progress bar.**

- Same assertion as a spinner, with more visual weight.

**A real percentage for the cloud call.**

- Rejected: the app does not know the token count or the queue depth.
  A fabricated percentage is the exact failure this decision avoids.

**Optimistic UI instead of any waiting state.**

- This is already how writes work — the log is local, so a write is
  done when it is written (`02-architecture/local-first.md`), and an
  optimistic read has nothing to be optimistic about.
