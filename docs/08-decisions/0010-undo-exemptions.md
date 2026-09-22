# ADR 0010 — Undo Exemptions for Toggle Actions

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

Invariant 1 (`01-foundation/principles.md`) states that every
mutating action is undoable for five seconds with a visible
countdown ring, and that confirmation dialogs are prohibited except
for exactly four actions. It lists "a destructive action with no
undo path" as a violation.

Five places across three docs contradict this by asserting that no
undo toast appears:

- `06-flows/completion.md` — habit check/uncheck, and the protocol
  metric log
- `05-modules/habits.md` — habit check/uncheck
- `06-flows/disruption.md` — batch reschedule from the
  calendar-shift flow

Normally a doc that contradicts an invariant is the thing that is
wrong. Here the situation is mixed, and resolving it requires a
decision rather than an edit:

- A toast on every habit tap is real UI clutter, and a habit check
  is genuinely reversed by tapping again — the row stays visible and
  the affordance never leaves the screen.
- A protocol metric log is *not* reversed by retapping, because the
  daily obligations card "does not repeat if dismissed"
  (`03-experience/attention-budget.md`). Once the card is gone, there
  is no toggle-back path at all.
- `task.rescheduled` from the disruption flow is a batch mutation
  over several events. Invariant 1 already treats partial reversal of
  a multi-action change as a violation, and a toggle cannot express
  it.

So the invariant as written is overbroad for one class of action, and
three of the four "no undo toast" claims are simply wrong.

## Decision

**Amend Invariant 1.** Every mutating action remains undoable. Undo is
delivered by exactly one of two mechanisms:

1. **The toast** (default). Five seconds, visible countdown ring,
   reverse by tapping.
2. **A direct toggle.** A reversing affordance that stays reachable
   in the same surface for the same session.

**The direct toggle is limited to a closed set of three log types:**

- `habit.checked`
- `habit.unchecked`
- `habit.skipped`

**Adding a type to this set requires a new ADR.** A general "toggles
are exempt" rule is explicitly rejected, because any future flat
action could be relabelled a toggle to escape the invariant.

**The toggle mechanism is valid only when the reversing affordance
remains reachable.** The row must stay visible in the same surface,
in the same session, and the surface must not be dismiss-once. If the
surface can be dismissed, or the row can leave the viewport for good,
the toast is required.

**Everything else keeps the toast**, explicitly including:

- `protocol.metric_logged` — the daily obligations card does not
  repeat, so there is no toggle-back path.
- `task.rescheduled` from the disruption flow — a batch mutation,
  reversed as one atomic action.

**The four confirmation actions are unchanged**: delete account,
revoke calendar sync, abandon an active protocol, sign out all
devices.

`01-foundation/principles.md` is updated in the same change: the
statement, the rules list, the violations list, and the composition
examples. The five contradicting lines are removed and replaced with
a reference to this ADR.

## Consequences

**Positive.**

- Four docs stop contradicting an invariant.
- Habit checking stays frictionless — no toast on the app's most
  repeated interaction.
- The closed set plus the reachability test keeps the exemption from
  becoming a general escape hatch.
- The metric-log case is fixed correctly rather than by making the
  invariant match a bug.

**Negative.**

- Invariant 1 now has two mechanisms and two exception classes
  (toggles, confirmations), so it is more complex to state, teach,
  and test.
- Reviewers must evaluate a reachability condition ("can the user
  still undo this here?") instead of a binary "is there a toast?".
- Habit skips now have a weaker reversal story than other actions,
  which is a deliberate asymmetry.

**Neutral.**

- `06-flows/completion.md`, `05-modules/habits.md`, and
  `06-flows/disruption.md` are updated in the same change.
- No event types change. No payloads change.

## Alternatives considered

- **Keep the invariant absolute and add toasts to habit checks.**
  Rejected: a toast on every tap in the daily obligations card is
  exactly the noise Invariant 3 exists to prevent, and the card is
  the app's one required daily interaction.
- **Exempt "toggles" generally, without a closed list.** Rejected: a
  general exemption is a loophole. The invariant becomes
  unenforceable because any action can be argued to be a toggle.
- **Exempt `habit.*` and `protocol.metric_logged` together.** Rejected:
  the obligations card is dismiss-once, so metric logging would be
  left with no reversal path at all — an exception to the invariant
  that delivers nothing.
- **Amend the invariant to "every action is undoable by some means,
  eventually".** Rejected: this deletes the five-second window's
  purpose, which is that reversal is available while the user's
  attention is still on the action.
