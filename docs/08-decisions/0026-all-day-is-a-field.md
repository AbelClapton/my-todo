# ADR 0026 — An All-Day Event Is a Fact, Not a Heuristic

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

Two docs ask for a band above the time axis, and each says what it is for:

- `05-modules/calendar.md`, the Day view — *"All-day items sit above the axis."*
- `05-modules/calendar.md`, the Week view — *"**All-day band.** Above the axis,
  and the one part only this view can draw: an item covering two days needs two
  days on screen at once."*

**The Event cannot say it.** The field set in
`02-architecture/object-model.md` is `{ id, title, start, end?, day, source,
people, deleted }` — there is no `all_day`, and no doc in the set defines one.
`calendar.created` and `calendar.updated` carry the same shape;
`calendar.mirrored` carries `{ event_id, source, retrieved_at, raw }`.

So an "all-day item" is expressible in exactly one way: `start` at local
midnight and `end` at the next local midnight. That is **byte-identical to a
genuine 24-hour timed event** — a night shift, a flight, a hospital on-call —
and the difference is not cosmetic. Drawn on a proportional axis the first
swallows the entire axis, which is *why* it belongs in a band; the second should
be drawn as the longest block of the day. Nothing in the system can tell them
apart, so no surface can draw either correctly.

**And the band is drawn nowhere.** The Day view's five rows in
`design/calendar-lab.html` contain no band at all, while the one band anyone
drew — the *Frontend design* row's `.allday` blocks — holds a habit and the
metric row, neither of which is an event. The tenant the doc names has never
been drawn, and the tenant that got drawn is one the doc never mentions. The
rule and the drawing have been wrong in opposite directions.

**This is the second instance of one shape in one doc.** `calendar.md`'s Day
view also positions scheduled tasks *"by clock time"* while the Task has no
field for it — fixed one section earlier by ADR 0025. The tell is the same both
times: a layout that names a thing the schema cannot say.

**One related hole is left open rather than resolved here.** Nothing anywhere
defines what a *missing* `end` means — a point-in-time event, or an event of
unknown duration. That is a different question from all-day-ness, it is not on
this decision's path, and it is recorded at the end of this ADR so the next
reader finds it stated rather than silently assumed.

## Decision

**Add `all_day: boolean` to the Event field set.** Required, default `false`.

- `calendar.created` gains `all_day`; `calendar.updated` gains `all_day?`;
  `calendar.mirrored` gains `all_day`, **normalized at retrieval** with `raw`
  left unchanged. The value exists upstream — Google Calendar and Apple Calendar
  both treat all-day as a distinct concept — and the mirror currently discards
  it by keeping only `raw`.
- **`all_day: true` does not remove `start`/`end`.** `start` stays the event's
  first local midnight, because `day` is derived from it
  (`02-architecture/day-as-unit.md`) and ordering must be stable. The clock
  values are simply **not drawn**.
- **A multi-day all-day item is the same field with a later `end`** — not a
  second flag. A three-day conference is one event, `all_day: true`, spanning
  three Days.
- **The band's membership rule, stated once:** a band holds **events that occupy
  the day rather than a moment in it** — all-day, or spanning two or more Days.
  Both existing justifications fall inside the one sentence: the Week's (*"needs
  two days on screen at once"*) and the Day's (*"above the axis"*).
- **The Week's claim that the band is "the one part only this view can draw" is
  corrected, not preserved.** A Day view can draw a band for a single all-day
  event; what it cannot do is show a two-day item *whole*. The Day draws the
  band; the Week is where a span becomes visible.
- **The band holds events that occupy the day, and unplaced scheduled tasks —
  and nothing else.** Habits due, the protocol metric row and the top three are
  not items the axis failed to place; they have no time to place, they keep
  their own sections below the axis, and putting them in the band would make it
  a second app and would say that a habit is an all-day event. Whether they
  should join it anyway is **left open, deliberately**, and recorded below.

Docs updated in the same change: `02-architecture/object-model.md` (the Event
field set), `02-architecture/event-log.md` (`calendar.created`,
`calendar.updated`, `calendar.mirrored`), `05-modules/calendar.md` (the band's
membership rule, and the Week's *"only this view"* claim), and
`08-decisions/README.md`.

## Consequences

**Positive.**

- The band becomes drawable, which means the Day view stops showing an incomplete
  day: today an all-day item is either invisible or a 24-hour stripe down the
  whole axis.
- A genuine 24-hour timed event stays on the axis, where it is the longest block
  rather than a special case — the distinction the flag exists to make.
- One membership rule replaces two view-specific justifications, and it survives
  a new view being added.
- Nothing new is invented: the value is recovered from the source rather than
  inferred from the bytes.

**Negative.**

- `all_day` is a field that *changes how `start`/`end` are read* without changing
  them. Every consumer that reads a time must now ask whether the value is
  drawable — and a consumer that forgets draws an all-day event as a 24-hour
  block, which is not obviously wrong on screen and is therefore a quiet bug.
- Three payloads change, so mirrored events written before this decision carry
  no normalized flag. The projection must fall back to reading `raw`, which
  means the per-source mapping lives in the codebase until mirroring is
  re-run — a migration tail, not a clean cut.
- A mirrored all-day event whose source changes *to* a timed event (or back)
  now has a field that changes without `start`/`end` moving, so it is a
  `calendar.updated` with `all_day` alone.

**Neutral.**

- No new log type. Three existing payloads gain a key, so `schema_version` does
  not increment.

## Alternatives considered

**Derive it — "duration ≥ 24 hours".** Rejected: it misclassifies exactly the
events the distinction exists for (a 24-hour shift, a conference day) and cannot
express a multi-day all-day item at all, since a three-day conference and a
three-day all-day block are the same arithmetic.

**"No `end` means all-day."** Rejected: it overloads an omission with a meaning,
it makes a point-in-time event unrepresentable, and nothing in the set defines a
missing `end` today — so this would decide an unanswered question as a side
effect of answering this one.

**Keep it only in `raw`, per source.** Rejected: the band is shared vocabulary
across four views and the object model is where a field that four views read
belongs. A per-source key means every view re-derives it, and a new source adds
a fourth place to fix.

**A separate log type — `calendar.all_day_created`.** Rejected: all-day-ness is
a property of an event, not a lifecycle of one. Two creation types would double
every downstream rule — update, delete, mirror, freshness — to express one
boolean.

**Put the untimed obligations in the same band, and settle it now.** Not
rejected so much as **left open**, because it is a scope question about the Day
view's composition rather than about this field, and it is the decision that
would turn the Day view from a calendar-with-a-band into an obligations strip
over a calendar. Two of the five Day rows in the lab argue for it. It needs its
own ADR or an explicit ruling; it must not arrive as a side effect of where the
band happens to be drawn.

## Open question recorded by this ADR

**What does a missing `end` mean?** Nothing in the set says. The candidates are
*"a point in time"* (a deadline, a reminder-like event) and *"an event of
unknown duration"* (a mirrored item whose source omitted it). The two are not
the same and the drawing differs: a point is a stub at the floor height, an
unknown-duration event is a block with an open edge. This is recorded rather
than decided because no surface has yet needed the difference, and because
deciding it here would place an unrelated rule in an ADR about all-day events.
