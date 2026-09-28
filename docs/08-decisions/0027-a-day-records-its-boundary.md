# ADR 0027 — A Day Records the Boundary That Framed It

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

`02-architecture/day-as-unit.md` fixes **two settings onto a Day at the moment
it opens**, and states the same rule for both:

- **The timezone** — *"A Day is fixed at the moment it opens, using the timezone
  in effect at that moment."*
- **The boundary** — configurable (midnight, 3am, 4am, 5am; default 4am), with
  *"activities between midnight and 4am count as the previous Day"*, and
  *"Changing the boundary does not rewrite history. Past Days keep their original
  attribution. Only future Days use the new boundary."*

`day.opened` is `{ day, tz_offset_minutes }`. **One of the two is recorded and
the other is not.** The timezone is pinned on the entry, in the entry's own
payload, on purpose. The boundary exists only inside
`system.settings_changed { key: 'day.boundary_hour' }`, so recovering the
boundary that framed a given Day means replaying settings entries and comparing
timestamps against that Day's `at`.

**The asymmetry is the defect.** Both settings fix a Day; the doc argues for
pinning one and is silent about the other. This is a shape the set has already
recorded once — *"the tell is an asymmetry inside one small event family, where
the author solved the problem once and not twice"* (`day.plan_skipped.kind`
against `day.planned`, fixed by `source`). It is the same family and the same
kind of gap: a field present on one member of a pair and absent on its sibling.

**Inference is not always available.** ADR 0008 makes whole categories
local-only: a `sync: false` entry is never pushed and exists only on the device
that wrote it (`07-infrastructure/sync-engine.md`). A projection rebuilt on a
second device from synced entries cannot assume every `settings_changed` entry
is present. A derived value that can be absent on a replica is not the same
thing as a recorded one.

**What forced it:** the Day view's axis begins at its Day's boundary — the
window is `[day_boundary, day_boundary + 24h)`, not midnight to midnight. That
makes the boundary a **drawn** value for the first time: `00:00–03:00` at the
bottom of the axis belongs to the next calendar day, and a habit checked at
01:30 sits at 25:30 on the Day it actually belongs to. Drawing a *past* Day —
which the date picker and the time machine both do — needs that Day's boundary,
not today's.

## Decision

**`day.opened` gains `boundary_hour: 0 | 3 | 4 | 5`.**

- The projection reads the entry rather than the settings, exactly as it reads
  `tz_offset_minutes`.
- The four values are the setting's own options, not a new enum: the field
  records which of them was in effect, and a value outside the set is invalid.
- **A replay obligation, permanent.** Entries written before this decision carry
  no `boundary_hour`. Projections must accept them and fall back to the boundary
  in effect at that entry's `at`, derived from `system.settings_changed`, with
  **4** as the default when no settings entry precedes it. This is the shape
  ADR 0012 established for `day.note_created`: old entries do not age out of
  validity, and the obligation belongs to the projection forever.
- The value is **not** surfaced as a number in the UI. It becomes visible as the
  axis's starting hour, and as the divider that marks where the next calendar
  day begins.

Docs updated in the same change: `02-architecture/event-log.md` (`day.opened`),
`02-architecture/day-as-unit.md` (the boundary is pinned like the timezone, and
the two settings are stated together), `08-decisions/README.md`.

## Consequences

**Positive.**

- The two settings that fix a Day are treated the same way, so the day-family
  asymmetry closes rather than becoming precedent.
- Drawing a past Day is possible on any replica, from the log alone — which is
  what `object-model.md`'s first invariant requires (*"Every atom and every
  layer is derived from the log"*).
- The Day boundary becomes visible in the UI for the first time. It currently
  exists only in prose and in a settings row; the axis's bottom edge is where a
  user will actually meet it.

**Negative.**

- One more key on a very high-volume type: `day.opened` is written on every open,
  forever, so the payload grows for a value that changes perhaps twice in an
  account's life. The alternative — inference — costs a replay-time dependency on
  entries that may not exist.
- The fallback path is not temporary. It must live as long as the app can read an
  old entry, which by ADR 0012's standard means permanently.
- Two sources of truth for one fact exist until the fallback is retired: the
  entry's key and the settings history. The entry wins, and this ADR says so
  rather than leaving the precedence to whoever writes the fold.

**Neutral.**

- No new log type. One existing payload gains a key, so `schema_version` does not
  increment.

## Alternatives considered

**No payload change — always derive the boundary from `settings_changed`.**
Rejected on the two grounds above, and for a third that is decisive on its own:
the timezone is derivable by the same argument (it is in settings too), and the
set chose to pin it. A rule that pins one and infers the other is the defect this
ADR exists to remove; adopting it as the fix would canonise it.

**Make the boundary immutable — remove the setting.** Rejected: the setting
exists, and `day-as-unit.md` gives the reason (night owls are *"a real user need
and a real correctness issue"*). Removing it to avoid recording it is a larger
change than the one being avoided, and it deletes a feature.

**Record an absolute instant — `boundary_at: ISO-8601`.** Rejected: the setting's
value *is* an hour, and the axis needs an hour. Storing an instant would require
converting back, and the conversion is the thing that can be wrong. The hour is
also what a reader of the log can check by eye.

**Record it on the Day projection instead of in the log.** Rejected: a projection
is derived from the log (`object-model.md`, invariant 1). A value that exists
only in a projection is not derived from anything, so a rebuild would lose it —
the same argument ADR 0024 used against the diagnostics buffer.
