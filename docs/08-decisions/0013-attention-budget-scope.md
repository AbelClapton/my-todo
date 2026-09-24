# ADR 0013 — Attention Budget Scope

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

Invariant 3 (`01-foundation/principles.md`) says every
notification-worthy surface registers with a single ranked queue, and
that nothing fires outside the queue. The budget is one nudge per hour
and three per day, excluding the now line and the two daily
obligations. `03-experience/attention-budget.md` makes this
checkable with a closed catalog of eleven surfaces, mirrored by the
`SurfaceId` union in `02-architecture/event-log.md`, with the rule:
"Every surface that can produce a nudge is listed here. Adding a new
one requires updating this doc and the `SurfaceId` union."

Six interrupting surfaces in the flow docs are not in that catalog:

- gap nudge — `06-flows/doing-the-day.md`
- calendar-shift nudge — `06-flows/disruption.md`
- streak repair — `06-flows/resurfacing.md`
- onboarding local-only banner — `06-flows/onboarding.md`
- "all three done" card — `06-flows/completion.md`
- lapse-recovery card — `06-flows/lapsed-recovery.md`

Three further contradictions sit in the same area:

- `06-flows/shutdown.md` — the shutdown push and the
  what-slipped digest both fire in the shutdown window, which is two
  nudges inside one hour against a one-per-hour cap.
- `06-flows/morning-plan.md` says the plan "surfaces subject to the
  attention budget"; the same doc elsewhere says it "surfaces as a
  full-screen card, not a nudge." Both cannot be true.
- `06-flows/resurfacing.md` introduces a repair token "available
  once per month" with no surface identity.

The catalog and reality have drifted, which means "nothing fires
outside the queue" is currently unverifiable.

## Decision

**Add exactly one SurfaceId: `streak_repair`.** Offered when a habit's
streak breaks and a repair token is available. It is a scheduled
surface and consumes budget like any other. It is merged into
`resurfacing` when both are due in the same hour.

**Gap nudge and calendar-shift nudge are not new surfaces.** They are
`contextual` variants: same surface, same urgency band, same TTL
class. They count as `contextual` when they fire. No new IDs.

**Three surfaces are exempt from the budget, and only these three:**

- the onboarding local-only banner
- the "all three done" card
- the lapse-recovery card

> **Amended by ADR 0023.** This list is now **two**. The "all three done"
> card is a **consequence surface** — the direct rendering of a mutation the
> user just made — so it fails the nudge definition's third condition and was
> never in the budget to be exempt from. The exemption criterion also gains a
> boundary below: a surface whose trigger expires inside the longest block it
> can be given is not eligible to be exempt.

**The exemption criterion**, which any future candidate must satisfy
in full:

1. It fires at most once per day, or once per lifetime.
2. It is non-repeatable — dismissal is permanent for its trigger.
3. It does not compete with a scheduled surface for the hourly budget.

An exempt surface still obeys quiet hours, focus mode, and in-event
suppression. Exempt surfaces are not in the `SurfaceId` union and have
no per-surface settings toggle.

> **Extended by ADR 0021.** The criterion above has four parts, not
> three. A blocked firing must **preserve** the trigger rather than
> consume it, because two of the three exempt surfaces are one-shot:
> suppressing the firing without preserving the state deletes the
> surface silently. ADR 0021 also establishes that a one-shot exempt
> surface records its **resolution** in the log and its **firing** in
> the diagnostics buffer, and that the lapse-recovery card takes the
> day's first position without suppressing the morning plan.

> **Extended by ADR 0023.** A fifth clause, and the one that shows why the
> fourth needed it: *"must be able to wait"* assumes the wait ends before the
> trigger does. **A surface whose trigger expires inside the longest block it
> can be given is not eligible to be exempt** — either its trigger outlasts the
> block, or it is a consequence surface, or it enters the catalog and pays.
> ADR 0024 also establishes that a refusal to a nudge which the flow promises
> not to repeat that day is logged as `system.nudges_silenced { day,
> surface_ids }`, rather than kept in the diagnostics buffer.

**The morning plan is budget-governed.** The "not a nudge" claim in
`06-flows/morning-plan.md` is wrong and is corrected. The plan
consumes a slot when it fires unprompted; it does not consume a slot
when the user opens it deliberately.

**Shutdown and the what-slipped digest do not double-fire.** The
digest is content inside shutdown completion — not a surface — and
does not consume budget. If shutdown is skipped, the digest may fire
later as a standalone `what_slipped` nudge, and that firing does
consume budget.

**The catalog, the `SurfaceId` union, and `settings.md`'s per-surface
toggle list are one set.** Adding a member means updating all three in
the same change.

Docs updated in the same change:
`03-experience/attention-budget.md`, `02-architecture/event-log.md`
(`SurfaceId` union), `05-modules/settings.md`, `06-flows/doing-the-day.md`,
`disruption.md`, `resurfacing.md`, `onboarding.md`, `completion.md`,
`lapsed-recovery.md`, `shutdown.md`, `morning-plan.md`.

## Consequences

**Positive.**

- The catalog matches reality, so "nothing fires outside the queue"
  becomes a checkable claim rather than an assumption.
- The exemption is a testable criterion instead of an implicit
  judgment, so future surfaces can be classified without a debate.
- The shutdown hour stops being a cap violation.
- Two flows' duplicate surfaces collapse into one, which reduces the
  apparent surface count rather than inflating it.

**Negative.**

- Exempt surfaces are interruptions the budget cannot suppress. Only
  quiet hours and focus mode restrain them, and both are bypassed when
  the user opens the app after a lapse — which is precisely when the
  lapse-recovery card fires.
- Criterion 1 admits a judgment call in edge cases (is the banner
  "once per lifetime" or "once per install"?).
- `contextual` now carries two trigger shapes, so its priority score
  has to be computed from context rather than from the surface ID
  alone.
- The onboarding banner remains a surface with no switch to turn it
  off, which is a small inconsistency with the "user can disable any
  surface permanently" invariant — acceptable only because it is
  once-per-lifetime.

**Neutral.**

- Total nudges per hour and per day are unchanged; this ADR
  redistributes labels, it does not loosen the cap.
- `streak_milestone` and `streak_repair` are adjacent in name but
  unrelated in behavior; the catalog's "Used for" column must
  distinguish them.

## Alternatives considered

- **Add all six as real surfaces.** Rejected: five of them do not
  compete for the hourly budget, so adding them would make the catalog
  describe a scheduler that does not exist and would make the
  per-surface settings list meaningless.
- **Exempt anything "fired in response to a user action or app open."**
  Rejected: every nudge fires on an app open, so that wording would
  empty the invariant while appearing to define it.
- **Keep the what-slipped digest as a separate surface and let it
  merge with the shutdown push.** Rejected: the merge would still make
  shutdown consume the hourly slot it is meant to occupy alone, and
  the digest has no independent trigger when shutdown completes.
- **Give exempt surfaces their own `SurfaceId` members but mark them
  exempt.** Rejected: an ID implies a queue entry and a settings
  toggle. Half-membership is worse than explicit exclusion.
- **Treat gap and shift nudges as new surfaces.** Rejected: they would
  have the same urgency, relevance, and TTL as `contextual`, so a new
  ID would be a synonym, and the glossary prohibits synonyms.
