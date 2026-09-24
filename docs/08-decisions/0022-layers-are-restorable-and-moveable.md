# ADR 0022 — Layers Are Restorable and Moveable

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** [founder]

## Context

Two gaps in the Areas and Goals layer, both of the shape ADR 0012
already fixed once and neither of them asked about then.

**1. `area.archived` has no inverse, and archival is defined as
reversible.**

`02-architecture/data-lifecycle.md` opens its invariants with
*"Archival is reversible. Nothing is silently removed"* and closes its
Archival section with *"Archival is a UI affordance, not a data
deletion. A 'show archived' toggle reveals everything."*

That section then works through six entity types — Tasks, Notes,
Events, Habits, Protocols, People — and neither Areas nor Goals is
among them. The log's type list carries three archive/unarchive pairs
(`task.unarchived`, `habit.unarchived`, `person.unarchived`) and one
bare archive: `area.archived`.

`05-modules/areas-and-goals.md` said only that an archived Area is
*"findable in settings."* Findable is not restorable, and it was
reaching for restorable.

**This is the third instance of one defect, and ADR 0012 fixed the
first two.** ADR 0012's Context reads: *"Two promised actions have no
event type"*, naming `habits.md`'s *"The user can re-activate an
archived habit at any time"* and `people.md`'s *"The user can
re-activate at any time."* It added `habit.unarchived` and
`person.unarchived`. In the same decision it ruled on `area.deleted`
— *"deliberately not added"* — and so had the Areas layer in hand and
asked only about deletion. The inverse was never asked, and it is the
one of the pair that the invariant actually requires.

**2. A Goal cannot change Area, which makes the documented workaround
destroy access to history.**

`05-modules/areas-and-goals.md` said: *"Habits and Goals are assigned
an Area once at creation and cannot be moved; to change their Area,
archive and recreate them."* Tasks move — `task.reassigned_area` — and
*"It is undoable."*

For a Goal the workaround is not equivalent. A Goal's whole
contribution is the delta column comparing two protocols, and
`05-modules/protocols.md` hangs a Goal detail's action on that
history. Archiving a Goal and recreating it under a new Area preserves
the protocols and reports in the log — `data-lifecycle.md` says an
abandoned Goal *"keep[s] its protocols and reports"* — while leaving
them unreachable from the Goal the user now uses, because the Goal
that owns them is archived and the new one has no protocols yet. The
workaround therefore produces a Goal with a dead history and a history
with no Goal.

A Goal's identity is *what the user is trying to achieve*. The Area is
a filing decision about that outcome. Moving a Goal between Areas does
not change what it is trying to achieve, which is the test the Habit
exception passes and the Goal case fails.

## Decision

**Add `area.unarchived` — `{ area_id }`.**

- Restores an archived Area to `active`. Filters show it again; its
  tasks, habits, and goals are unchanged and were never hidden.
- Undoable via the standard undo toast, like its three siblings.
- No `area.deleted`. ADR 0012's ruling stands: Areas archive.

**Add `goal.reassigned_area` — `{ goal_id, area_id }`.**

- Same payload shape as `task.reassigned_area`, and undoable the same
  way.
- It does not move the Goal's protocols. A protocol's history belongs
  to the Goal, not to the Area, so a Goal that changes Area keeps every
  protocol and report.
- **A Habit still cannot move.** `05-modules/habits.md` makes a habit's
  cadence and minimum what it is, and a habit may be linked to a
  protocol; re-filing it would move a component of someone else's
  experiment. The rule narrows from "Habits and Goals" to "Habits".

**Areas and Goals join the Archival section of
`02-architecture/data-lifecycle.md`,** which currently enumerates six
types and omits the two this ADR is about. Goals are recorded there as
**ending** rather than archiving — `goal.achieved` / `goal.abandoned`,
with `goal.reopened` — so the section is accurate about what the layer
does rather than the section being extended to cover a state Goals do
not have.

**No new entity field.** `object-model.md`'s Area stays
`{ id, name, state }`. The four seeded Areas' glyphs are bound to their
**ids**, not to their names, which is what lets
`03-experience/components.md` say a rename does not move the glyph. A
`glyph` field on the Area would be a second source of truth for a
mapping the components table already owns, and it would not answer the
Inbox case — Inbox is a built-in Area and has no glyph because none of
the thirteen fits it, which is a property of the inventory rather than
of the Area.

Docs updated in the same change: `02-architecture/event-log.md` (type
list), `02-architecture/data-lifecycle.md` (Archival),
`05-modules/areas-and-goals.md` (§Area assignment, §Archival,
§Invariants, §Filters, §Surfaces, §Empty states, §Goals and
protocols), `05-modules/tasks.md` (the row's glyph placement),
`03-experience/components.md` (the two cases the four-glyph rule does
not reach), `03-experience/surfaces.md` (the Area filter row),
`06-flows/capture.md` (the capture destination), `06-flows/onboarding.md`
(the Inbox chip), `04-ai/tier-1-parsing.md` (Area inference refused),
and `06-flows/retrieval.md`'s area-filter debt.

## Consequences

**Positive.**

- The invariant "archival is reversible" is now true of every type that
  has an archive event, which is the form it is written in.
- The archive/recreate workaround disappears for Goals. It was the only
  documented path that could leave a Goal's protocols unreachable, and
  it is the kind of path a user finds only after losing data.
- The three archive/unarchive pairs become four, so the pattern is a
  rule rather than three coincidences.
- `object-model.md` is untouched. The fix is entirely in the log and in
  prose.

**Negative.**

- Two new types increment a count docs describe as "roughly 80," and
  `schema_version` stays at 1, exactly as ADR 0012 noted for its own
  two additions.
- A reassigned Goal's past protocols were run under the old Area, and
  now sit under a Goal filed elsewhere. Reports record the days they
  ran on, so the facts are recoverable, but an Area-filtered view of
  protocol history is no longer the same question as "what happened in
  this Area."
- Areas remain the only layer with an archive event and no deletion
  event. That is deliberate and now stated in two places rather than
  implied by an omission.

**Neutral.**

- No payload shape changes for any existing type.
- ADR 0012 needs no amendment. It ruled on `area.deleted` and that
  ruling is unchanged; this ADR adds the type 0012 did not consider.

## Alternatives considered

- **Make archival of Areas non-reversible, and note the exception in
  `data-lifecycle.md`.** Rejected on the shape of the invariant: it is
  written as a rule about archival, and the fix for "the rule is false
  here" is not to make it false more explicitly. An archived Area hides
  a user's own naming of their life, and the recovery is one entry.

- **Add `area.deleted` as well, so the layer has both.** Rejected.
  ADR 0012 already declined it for lack of semantics, and nothing has
  supplied any. Archival covers it.

- **Let a Goal change Area by writing `goal.created` with a reused
  `goal_id`.** Rejected. It overloads a creation event as a mutation,
  which is the conflation ADR 0012 rejected when it declined to add
  `'capture'` to `task.created.source`. A rename needs `renamed`; a
  move needs `reassigned_area`.

- **Give Area a `glyph` field, so the four glyphs stop being a special
  case.** Rejected for the reason in the Decision: it creates a second
  source of truth for the inventory in `components.md`, and it does not
  fix Inbox, which is the case that actually breaks the rule. The
  rejection is recorded here rather than left implicit because
  "an entity should carry its own icon" is the first thing anyone will
  propose on reading the glyph table.

- **Narrow the invariant instead: "archival is reversible for
  user-authored content."** Rejected as a fence around the wrong
  category. Areas are user-authored; the distinction was not doing any
  work and would have to be re-litigated for the next layer.
