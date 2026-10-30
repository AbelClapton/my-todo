# ADR 0033 — The Rituals' Undo Needed Two Entries

- **Status:** Accepted
- **Date:** 2026-10-31
- **Deciders:** [founder]

## Context

`06-flows/shutdown.md` and `06-flows/morning-plan.md` both commit as **one
atomic batch**, and both say that batch is *"undoable for five seconds after the
fact"* (Invariant 1, `01-foundation/principles.md`, ADR 0010). The shutdown's
batch is the largest in the app:

1. `day.planned { day: tomorrow, source: 'shutdown' }`
2. `day.closed { day: today }`
3. a `note.edited` appending the "what went well" blockquote to the Daily Note
4. one `task.scheduled_to_day` per kept task

Two of those four can be reversed with what the log already had. A scheduling
write has `task.unscheduled_from_day`, and the note edit can be reverted by
re-editing with the body it had. The other two cannot:

- **`day.planned` cannot be re-stated as empty.** `TopThreeSchema` is
  `min(1).max(3)` on purpose — *"zero is not a plan, a plan with no commitment is
  a skip"* — and the flow has a Skip button for that case. So the inverse of a
  plan is not a plan, and there was no entry that said "not planned".
- **`day.closed` had no inverse at all.** Nothing in the set opened a day.

Nor could the batch be undone by dropping it. `foldLog` skips an entry that
another entry compensates, but a compensation still has to *be* an entry with a
payload, so "delete the plan" needs a type to say it with. The undo cannot be a
redaction, because the log is append-only (ADR 0001).

## Decision

**Two entries join the `day` domain: `day.unplanned` and `day.reopened`, both
carrying only `{ day }`.** This is the ADR that
`02-architecture/event-log.md` requires for a new type, and the type list, the
catalog and the JSON example are updated in the same change.

**Both are ordinary compensations.** The undo appends the entry and sets
`compensation_for` to the id of the entry it reverses, which is the mechanism
ADR 0010 leaves in place for everything outside the three `habit.*` toggles.

**Both also state the inverse in the fold, rather than relying on the
compensation filter.** `day.unplanned` clears `top_three` and `planned_source`;
`day.reopened` clears `closed`. This is the same choice `task.uncompleted` makes,
and it exists so the entries stay meaningful when read beside their target — by
a debugging tool, an export, or the AI's context builder — rather than being
inert without the filter that drops the entry they point at.

**`day.plan_skipped` gets no inverse.** Skipping is one tap by design and the
flow never offers to take it back; the entry exists for the attention queue's
history, and the plan can still be made deliberately from the command palette
the same day.

## Consequences

**Positive.**

- The invariant is met by the log rather than by the UI: the undo is a real
  entry, replays on another replica, and lands in the same total order as the
  writes it reverses.
- The four writes of a shutdown batch are now each individually reversible, so
  the atomic undo is expressible as four compensations plus one re-edit rather
  than as a special case in the writer.
- `day_view` gains `planned_source` and `skipped` with this change, which the
  triggers needed anyway: a `day.planned { source: 'shutdown' }` is a **draft**
  the morning plan pre-selects, and the two rituals' skips must not suppress each
  other (`day-as-unit.md`).

**Negative.**

- Two types in the `day` domain exist only to say "not that", which makes the
  domain's five things seven. The catalog note says so plainly rather than
  presenting them as peers of `day.opened`.
- Undo of a shutdown is now five entries. `assertCompensable` refuses to
  compensate a compensation, so the batch's undo is one-directional: an undo
  cannot itself be undone, and the five seconds after it are simply over.

**Neutral.**

- No payload existing before this ADR changes, and `schema_version` does not
  increment — the two entries are additions, not edits.
- `day.unplanned` and `day.reopened` are folded by `day_view` only. No other
  projection reads them, and none needs to: the tasks they unset are unset by
  the `task.*` compensations in the same batch.

## Alternatives considered

- **Undo only the parts that are reversible.** Rejected: the flows say why in
  their own words — *"reversing half of it would leave the day's top three
  pointing at tasks that are no longer scheduled"* — and a day that is closed
  with no plan is a trap the user would have to escape by hand.
- **Re-state `day.planned` with the previous `top_three`.** Rejected: it works
  when there was a previous plan and is impossible when there was not, which is
  the common case — the shutdown is usually the first plan of the day.
- **Allow `top_three` to be empty and treat zero as "not planned".** Rejected:
  it collapses the plan and the skip into one entry with a payload that means
  two things, which is precisely what `source` and `kind` were added to
  untangle.
- **Make the shutdown's close a flag on `day.opened` that a later open
  rewrites.** Rejected: state-on-open is a projection concern, and the log has
  no in-place mutation to express it.
- **Ship the batch without the undo and record the gap.** Rejected: an
  invariant with a known exception that has no ADR is a rule nobody can rely on,
  and this is a smaller change than a document explaining the exception.
