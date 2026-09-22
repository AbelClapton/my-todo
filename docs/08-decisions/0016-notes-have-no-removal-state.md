# ADR 0016 — Notes Have No Removal State

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

ADR 0011 extended the gesture vocabulary to eight and defined swipe
down as "remove from this list, reversibly," giving a per-entity
outcome:

- Task → someday
- Habit → archive
- Person → archive
- Note → **leaves Recent**

That last mapping has nothing behind it. `05-modules/notes.md` defines
Recent as a *derived* view — "Notes edited in the last 14 days" — and
the Note type in `02-architecture/object-model.md` carries exactly one
non-derived field beyond its body and attachment: `deleted`. There is
no `archived`, no `someday`, and no `note.archived` /
`note.unarchived` in the event log's type list.

So the gesture as documented cannot be implemented. Nothing can make a
note leave Recent except time. The gesture matrix asserted a behavior
the data model cannot produce, and the review that caught it had to
either change the model or change the mapping.

There is a second problem with the same shape. `02-architecture/event-log.md`
states that adding a new type requires an ADR, and
`02-architecture/data-lifecycle.md` establishes archival as the
reversible removal mechanism everywhere it exists. Adding a note
archive to satisfy a gesture would be the gesture driving the model,
rather than the model constraining the gesture.

## Decision

**Amend ADR 0011's note-list mapping. Notes have no removal state.**

- The note list's swipe down is **disabled**, not repurposed. It joins
  swipe left, which ADR 0011 had already made non-destructive by
  removing delete from it.
- Notes leave Recent the only way they ever could: by aging out of the
  14-day window.
- Deletion stays where ADR 0011 put it — the long-press (Tier 2) menu
  and the entity's overflow menu. That is unchanged.
- Swipe up (attach) is unaffected. A Note is attached to exactly one
  entity and can be reattached, so attach has a real meaning there.

**No new event types.** `note.archived` and `note.unarchived` are not
added. The Note type is unchanged.

**The disabled-gesture rule does the work.** A gesture that has no
meaning on a surface is disabled with the warning haptic, per
`03-experience/gesture-vocabulary.md`. That is the honest outcome here,
and it is the same treatment the calendar already gets for defer.

Docs updated in the same change:
`03-experience/gesture-vocabulary.md` (the swipe-down definition, the
gesture-to-surface matrix row for the note list, and the note under
the matrix), and ADR 0011's record, which gains a pointer to this ADR.

## Consequences

**Positive.**

- The matrix stops asserting something unimplementable, so "each
  gesture means the same thing everywhere it is available" is
  checkable again.
- The vocabulary stays eight gestures, with a uniform meaning for each
  and a documented disabled case.
- The Note model stays minimal. A note is a body and an attachment;
  archiving it would have added a state with no user story behind it
  — nobody archives a note, they delete it or they stop reading it.
- No migration, no projection change, no new type.

**Negative.**

- The note list is now the only atom list in the matrix with no
  removal gesture at all. A user who has learned "swipe down gets rid
  of things" will find it inert there.
- Removing a note from Recent is no longer possible in under two
  seconds. It was never possible, but it was documented as possible,
  so the doc gets worse before it gets truer.
- ADR 0011's eight-gesture decision now has four surfaces' worth of
  swipe-down meaning instead of five, which slightly weakens the
  argument that the extension was needed. The triage flows that
  motivated it — capture, catch-up, morning plan — are all
  task-centric and are unaffected.

**Neutral.**

- Delete is unaffected, and was never on swipe after ADR 0011.
- No payload changes, no `schema_version` change, no settings key.

## Alternatives considered

- **Add `note.archived` / `note.unarchived`.** The obvious way to make
  the mapping real. Rejected: Recent is derived from edit recency, so
  an archive flag would have to *override* the derivation, which means
  two sources of truth for one list and a rule for what happens when
  an archived note is edited. All of that to support a gesture that no
  flow needs.
- **Define swipe down on the note list as "hide from Recent for this
  session."** Rejected: it is client-side view state with no log
  entry, and `02-architecture/event-log.md` is absolute that if it is
  not in the log it did not happen. It would also be un-undoable in
  any meaningful sense and invisible on the user's other devices.
- **Let swipe down delete the note.** Rejected: ADR 0011 moved
  deletion off swipe precisely because destructive-by-swipe is the
  classic mis-gesture, and pairing it with pull-down capture is worse.
- **Leave ADR 0011 as written and treat the mismatch as a known gap.**
  Rejected: the note-list row was already the one row ADR 0011 was
  written to correct. Leaving a second false claim in the same row
  would have left the uniformity rule false for a reason no future
  reader could discover from the docs alone.
