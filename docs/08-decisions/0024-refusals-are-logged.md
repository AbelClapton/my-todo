# ADR 0024 — Refusals Are Logged

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** [founder]

## Context

Two sentences in `06-flows/disruption.md` ask the app to remember a decision
the user made:

- the calendar-shift offer — *"If the user chose 'Keep as is,' the app
  remembers the choice for that day and does not ask again."*
- the what-slipped digest — *"If dismissed, it does not fire again that day."*

Neither has a log entry, and none of the **six** `system.*` types is a refusal.
The flow has **five** exits across its two offers, **two** of which write an
entry (`Shift`, `Reschedule all`), and the three that write nothing include
both of the decisions above.

The state therefore has to live in the client's diagnostics buffer — which
`03-experience/attention-budget.md` says is where firings are recorded, and
which `02-architecture/projections.md` describes as *"a local diagnostics
buffer, not synced."* That buffer exists to modulate a priority score. Losing
it costs a slightly different score; losing a **refusal** costs the user's
answer, and a reinstall or a second device asks the question again of someone
who has already answered it.

**This is the third instance of one defect, and ADR 0021 fixed the second one
a single lab earlier.** That ADR added `system.lapse_skipped` to
`06-flows/lapsed-recovery.md` under the same argument — the flow's exits became
three exits and three entries — and recorded the general shape: an exempt
surface records its **resolution** in the log and its **firing** in the
diagnostics buffer. `06-flows/disruption.md` was not in the room.

`02-architecture/object-model.md`'s first invariant makes the gap structural
rather than untidy: *"Every atom and every layer is derived from the log."* A
suppression that exists only in a device buffer is not derived from anything.

## Decision

**Add `system.nudges_silenced` — `{ day, surface_ids: SurfaceId[] }`.**

- Written when the user declines a nudge and the flow's contract is that it
  will not return **that day**: the shift offer's *"Keep as is"*
  (`surface_ids: ['contextual']`) and the digest's *"Leave them"*
  (`surface_ids: ['what_slipped']`).
- The queue's question is *"is this surface done for today?"* — one lookup
  against the latest entry for the day.
- **It is an array, and that is the decision's substance rather than a detail.**
  A day can produce more than one refusal, and the second must **extend** the
  first. Two per-flow types would each be right alone and would overwrite each
  other the first time a day produced both, producing an off-by-one in a
  projection that no test would think to write.
- Append-only, like everything else: the second refusal of a day is a new entry
  carrying the longer array, not an amendment. The projection reads the latest.
- `SurfaceId` is reused rather than a new enum, because ADR 0013 already
  requires the union, the catalog and the settings toggles to move as one set.

**Not extended to the consequence surfaces of ADR 0023.** A completion's undo
toast asks nothing and needs no memory.

Docs updated in the same change: `02-architecture/event-log.md` (the type list
and two worked examples), `06-flows/disruption.md` (both sentences become
questions the log answers), and `08-decisions/README.md`.

## Consequences

**Positive.**

- A refusal is a durable fact in the system of record, so it survives a
  reinstall, syncs to a second device, and is answerable by the time machine.
- The flow's exits now have entries for the decisions and entries for the
  actions, which is the shape ADR 0021 established.
- The array makes "one refusal per day" impossible to get wrong: the second
  cannot erase the first.
- One type where the precedent-shaped alternative needed two, and it covers the
  third flow that will need the same memory without a third type.

**Negative.**

- `system.*` grows to seven, in a set whose members are otherwise one-per-flow.
  A reader looking for "the shift refusal" greps for `nudges_silenced` and has
  to read the payload.
- The projection has to fold an array rather than read a flag. Small, and the
  only alternative that avoids it is two types that overwrite each other.
- `surface_ids` duplicates the day the entry is already stamped with, so
  `day` and the entry's own `at` can disagree if a client writes across a
  midnight boundary. The projection must read `day`, and this ADR says so
  rather than leaving it to whoever implements the fold.
- A silencing is per-day and per-surface but not per-*instance*: choosing
  "Keep as is" at 10:00 silences the contextual surface for the rest of the
  day, including a genuinely different contextual nudge at 15:00. That is
  already true of the flow's wording ("does not ask again" — about the offer,
  not about the class), and it is now enforced by the projection. The
  alternative is a narrower key and more entries.

**Neutral.**

- No payload changes to any existing type.
- ADR 0021 needs no amendment. This ADR generalises the *shape* it established,
  not the decision it made: `system.lapse_skipped` still records the lapse's
  resolution and is still per-lapse rather than per-day.

## Alternatives considered

- **Two per-flow types: `system.shift_declined` and `system.digest_dismissed`.**
  The shape ADR 0021 used, applied twice. Genuinely defensible — an entry's
  name is what a reader greps for, and `shift_declined` tells them which flow.
  Rejected on the interaction: the two facts are the same fact about different
  surfaces, and a day that produced both would need a projection that knows to
  read both types. The array is the same information in one place, and it makes
  the second refusal extend the first by construction instead of by a rule
  someone has to remember to write.

- **Keep the refusal in the diagnostics buffer and widen the buffer's
  contract.** Rejected. The buffer is not synced, so the answer dies with the
  install and does not reach a second device — and the third thing a refusal
  is needed for is the time machine, which is a read over the log.

- **Delete both sentences and ask every time.** Rejected: the shift offer
  would re-fire on the next calendar sync, and a button labelled "Keep as is"
  that is followed by the same question is not a refusal. Two invariants — the
  hourly cap and "fires at most once per day" — already forbid it.

- **Store the silencing on the Day.** Rejected: the Day is an atom with its own
  shape, and `02-architecture/day-as-unit.md` fixes its fields. Adding a
  per-surface list to it would make the Day the home of a nudge concern, and
  the event log already carries user decisions.

- **A generic `system.user_declined { subject, day }`.** Rejected as too loose
  to type: `subject` would be an unconstrained string, and the log's payloads
  are otherwise all typed. `SurfaceId` is the narrowest existing type that
  covers both cases.
