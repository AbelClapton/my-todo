# ADR 0032 — The Defer Sheet's Dates, and Its Undo

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** [founder]

## Context

`05-modules/tasks.md` fixes the defer sheet's four rows and then names two
things it does not settle:

1. **What "Next week" resolves to.** It is *"the one row that is not a date
   picker — so it is the row a user has to trust"*, and its two readings
   (`+7 days`, or the next calendar week's Monday) are **1 to 6 days apart**
   depending on the weekday. The design lab drew both readings side by side and
   closed with *"the sheet proves one is needed, not which."*
2. **What `Pick a date…` opens.** The row opens a picker, and the picker is the
   Calendar overlay — which is Phase 1, and the defer sheet is Phase 0.

A third question surfaced while implementing the sheet: **whether deferring is
undoable.** The Actions table marks *Complete* and *Remove* undoable and leaves
*Defer* unmarked, while Invariant 1 (amended by ADR 0010) says every mutating
action is undoable and the direct-toggle exemption is a closed set of three
`habit.*` types. So defer is either an unmarked violation or an oversight.

## Decision

**"Next week" is the next calendar week's Monday.** Defer means *"when the task
becomes visible"*, so the phrase names the first day of the next week rather
than a seven-day delay: on a Friday, `+7 days` makes a task visible on another
Friday, which is not what "next week" says. It is never today — the answer is
at least tomorrow, or nothing was deferred.

**Every dated row shows the date it resolves to**, in tabular figures on the
trailing edge. That is what turns the phrase from a promise into a fact the
sheet keeps on screen; it is also why the definition above can be chosen at all
without the user having to know it in advance.

**`Pick a date…` reveals a native `<input type="date">` until the Calendar
overlay exists.** This is a stand-in, not a second implementation: it is one
input inside the sheet, it carries no picker of its own, and it is **replaced**
rather than kept when Phase 1 lands. The alternative — rendering the row
disabled and firing the Error haptic — was rejected because a dead row in a
four-row menu is discovered by pressing it, which is worse than a plain control
that does the thing.

**Deferring is undoable, by toast.** `task.rescheduled` takes its compensation
from its own vocabulary: re-stating the `due`/`defer` pair the task had. Because
an absent key *clears* a field (`10-engineering/code-conventions.md`), the undo
has to carry `due` back unchanged — a payload that sent only `defer` would drop
the task's deadline. `Someday` is undone by `task.unmarked_someday`.

## Consequences

**Positive.**

- The sheet's promise is on screen rather than in the reader's head, which is
  the only thing that makes "Next week" honest.
- The three dated rows and the one state row are visibly different — a `Then`
  rule and the words *no date* — instead of four rows that look alike and mean
  two different things.
- Invariant 1 is satisfied without inventing a fourth undo mechanism.

**Negative.**

- The native input's affordance is the platform's, not ours: its date format and
  its picker vary by browser, and it is the one control in the app whose
  appearance is not ours to state.
- "Next week" now differs from what a `+7 days` habit expects. The resolved
  date on the row is the mitigation, and it is the reason the mitigation is
  mandatory rather than decorative.

**Neutral.**

- No event types change and no payloads change. `task.rescheduled` already
  carries both temporal fields.
- `05-modules/tasks.md`, `07-infrastructure/stack.md` and `design/README.md`'s
  defer-sheet section are updated in the same change.

## Alternatives considered

- **`+7 days` for "Next week".** Rejected: it is stable and weekday-independent,
  which is its only advantage, but it answers "in a week" — a duration — where
  the label names a week.
- **Show both readings and let the row be chosen twice.** Rejected in the lab:
  a menu whose first item is a question is not a menu.
- **Drop "Next week" and keep three rows.** Rejected: `Pick a date…` contains it
  and `Tomorrow` covers the common case, but removing a row the module doc names
  is a module decision this sheet does not get to make.
- **Render `Pick a date…` disabled until Phase 1.** Rejected: it produces a dead
  control in the app's most-used gesture path.
- **Undo defer by appending `task.rescheduled` with no keys.** Rejected: it
  clears `due` as well, silently deleting a deadline as a side effect of an
  undo.
