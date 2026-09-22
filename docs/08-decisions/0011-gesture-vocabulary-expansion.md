# ADR 0011 — Gesture Vocabulary Expansion

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

> **Amended by ADR 0016.** The note mapping below ("Note → leaves
> Recent") is withdrawn. A Note has no removal state, so the note
> list's swipe down is disabled rather than repurposed. The rest of
> this ADR stands unchanged, including the eight-gesture set, swipe
> up = attach, and delete moving to long-press and overflow. One
> wording fix: the attach picker's contents are the list in
> `06-flows/capture.md` — Person, Area, Goal, or an existing task —
> not the shorter parenthetical below.

## Context

`03-experience/gesture-vocabulary.md` defines a closed set of six
gestures and states the rule that every gesture means the same thing
everywhere it is available: "If a gesture is not available on a
surface, it is disabled (with visual feedback) — not repurposed."

Five flows use two gestures that are not in the set:

- `06-flows/capture.md` — swipe up, "Attach"; swipe down, "Delete"
- `06-flows/morning-plan.md` — swipe down, "Drop" (someday or
  archive)
- `06-flows/shutdown.md` — swipe down, "drop"
- `06-flows/lapsed-recovery.md` — swipe up, "attach"; swipe down,
  "delete"
- `06-flows/resurfacing.md` — swipe up, "attach"; swipe down,
  "delete"

Three of these use swipe down for **delete** (a tombstone); two use it
for **drop** (someday or archive). The flows do not agree with each
other, so extending the vocabulary without a decision would make
`gesture-vocabulary.md` less coherent, not more.

Separately, the existing surface matrix already violates the
uniformity rule it states. Swipe left is defer on the task list, skip
on the habit list, archive on the people list, dismiss on a nudge, and
someday on the inbox — all consistent with "not now / no / later" —
but **delete** on the note list. That is a pre-existing break, not a
new one, and it becomes load-bearing the moment the vocabulary is
extended.

## Decision

**The gesture vocabulary is extended to eight:** swipe right, swipe
left, swipe up, swipe down, long-press, pull down, swipe from left
edge, pinch.

**Swipe up = attach.** Opens the attachment picker (Person, Area,
Note). The same meaning on every surface where it is available.

**Swipe down = "remove from this list, reversibly."** It is never
destructive:

- Task → someday
- Habit → archive
- Person → archive
- Note → leaves Recent

**Swipe left = "not now / no / later," with no exceptions.** The
note-list swipe-left-is-delete case is removed; that surface uses
swipe down ("leaves Recent") instead. This makes swipe left uniform
for the first time.

**Delete moves off swipe entirely.** Deleting an entity is available
from the long-press (Tier 2) menu and from the entity's overflow menu.
Rationale: a destructive action must not share a direction with
pull-down capture, and must not occupy the same gesture as
reversal-of-commitment. Destructive-by-swipe is the classic
mis-gesture, and the app already has a deliberate place for it.

**The gesture-to-surface matrix is updated** with swipe up and swipe
down columns, the corrected note-list row, and the existing disabled
treatment on surfaces where a gesture is meaningless.

`03-experience/gesture-vocabulary.md`, the gesture summary in
`01-foundation/glossary.md`, the keyboard-equivalents table, and the
`09-roadmap/milestones.md` M2 criterion ("gesture vocabulary is
identical across all modes") are updated in the same change.

## Consequences

**Positive.**

- Five flows become correct by reference instead of existing as
  undocumented exceptions.
- Swipe left finally means one thing everywhere.
- Three-way triage (keep / defer / remove) is available in the inbox
  sort, the catch-up list, and the morning-plan pool, where the flows
  already assumed it.
- Delete gains a deliberate, non-accidental path.

**Negative.**

- Eight gestures is more to learn than six, and the vocabulary doc
  grows.
- Swipe-down on a row sits next to pull-down on a surface. The
  distinction is start point (row vs list), which is learnable but not
  free; the disabled-treatment rule must be applied carefully at list
  edges.
- Deleting now costs a long-press or an overflow tap instead of a
  swipe, which is slower for users who delete often.
- Changing the note-list gesture is a small muscle-memory break for
  anyone already using the app.

**Neutral.**

- `06-flows/capture.md`, `morning-plan.md`, `shutdown.md`,
  `lapsed-recovery.md`, and `resurfacing.md` are audited in the same
  change so that their swipe-down verbs say "remove"/"someday"/
  "archive" rather than "delete" or "drop".
- No new transitions are required from
  `03-experience/motion-vocabulary.md`; the attach picker uses the
  existing sheet transition.

## Alternatives considered

- **Keep six gestures and rewrite the five flows to use swipe left's
  existing defer sheet.** Rejected: the defer sheet is a modal, and
  interrupting a triage ritual with a modal three times per row
  destroys the rhythm the rituals are built on.
- **Extend the set but scope swipe up/down to triage surfaces only.**
  Rejected: a per-surface gesture sub-vocabulary is harder to learn
  and to document than a uniform gesture with a uniform meaning, and
  it reintroduces exactly the "repurposed gesture" problem the
  uniformity rule exists to prevent.
- **Keep delete on swipe and define swipe down as delete.** Rejected:
  two flows use swipe down for non-destructive removal, and pairing
  destructive delete with pull-down capture in the same direction is
  an accident waiting to happen.
- **Leave the note-list swipe-left = delete case alone.** Rejected:
  extending the vocabulary while a stated uniformity rule is already
  violated would formalize the violation.
