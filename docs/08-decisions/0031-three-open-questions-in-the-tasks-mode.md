# ADR 0031 — Three Open Questions in the Tasks Mode

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

Phase 0 builds the Tasks mode, and three things it needs were recorded as
open rather than decided — each in its owner doc, each with a proposal on
record and no ruling. They are collected in one ADR because they are the
three gaps that stop the mode being written: **a control with no
definition, a field that does not exist, and a token rule the accepted row
cannot obey.**

**1. `scheduled_time` has no control anywhere but Tier 1.** ADR 0025 added
the field, and `05-modules/tasks.md` says why nothing can set it: *"every
control the set gives for putting a task on a day is day-granular"* — the
detail's *Schedule to day* opens the date picker, and the defer sheet's
four rows are relative days. So the Day view's axis can place a task and
`disruption.md`'s reflow can order one, and **no screen can do either**.
`tasks.md` records the proposal and the question in one sentence: *"four
hour chips at `control-sm`'s scale, appearing only once a day is set;
whether that is a new control or an instance of the segmented control is
part of the same undecided question."*

**2. `estimated_minutes` does not exist, and four docs consume an
estimate.** The row's duration chip ("40m"); the gap nudge's *"based on
user-estimated duration (if available) or a heuristic"*; the low-key-day
card's *"things under 10 minutes"*; and the completion prompt *"why did
this take longer than expected?"*, whose note is *"used to detect
estimate-vs-actual patterns."* `tasks.md`'s §"Duration and estimates —
recorded, not decided" names the candidates — an `estimated_minutes` on
the atom, or reading history alone — and records that the field is
ADR-shaped because it adds a field to the atom **and** a key to
`task.created`.

**3. The accepted row is 90px when its title wraps, and 90px is not a
token.** ADR 0030 chose a row whose title owns the first line and wraps to
a second when it needs one. Measured: **66px** on one line, inside
`row-rich` (72); **90px** wrapped, between `row-rich` and `row-hero` (96).
`03-experience/design-tokens.md` closes its row table with *"Every list
uses one of these four. No custom row heights."* — so the row the lab
accepted cannot be built from the tokens the doc accepts.

## Decision

### 1. The hour control is a chip row, and it is one control in two places

**A single-select chip row at `control-sm`, drawn only once
`scheduled_day` is set.**

- **Its first chip is `No time`**, and it is the reason this control is
  *not* an instance of the segmented control. A scope switcher always has
  one segment selected; this control's most important state is that
  **nothing is** — a day with no hour is *scheduled but unplaced*, the
  legal and currently universal state (`object-model.md`, ADR 0025). A
  control that cannot draw "none" cannot draw the default.
- **Its last chip is `Other…`**, which opens the time picker. The chips
  between them are **suggested values**; what is decided here is the
  control, not the suggestion set, which no doc fixes and which is a
  fixture rather than a rule.
- **It writes `task.scheduled_to_day` and needs no new type.** That entry
  is `{ task_id, day, time? }`, and a payload *without* `time` already
  means "this day, no hour" — so setting, changing and clearing the hour
  are one type with three payloads. The projection treats an absent `time`
  key as *absent*, which is what `10-engineering/code-conventions.md`
  means by *"optional means absent, not empty."*
- **It is listed once in `components.md` and used by two screens.** The
  Calendar lab's accepted New event form recommended the same shape —
  *"time as a chip row … only 'Other…' opens the picker"* — so this is one
  control in two places, not a control per screen.

### 2. `estimated_minutes` is a field, and it is a span

**Add `estimated_minutes?: number` — a positive integer of minutes — to
the Task**, carried on `task.created` and changed by a new
`task.estimated { task_id, estimated_minutes? }`.

- **A span, not a point.** It is explicitly *not* `scheduled_time`, which
  is a position with no extent (ADR 0025); an estimate has an extent and
  no position, and neither substitutes for the other. `tasks.md` already
  says so.
- **A change is its own type**, for the reason every other field has one:
  `task.rescheduled` owns the two days and `task.scheduled_to_day` owns the
  day and the hour, so an estimate that could only ever be set at creation
  would be the one field the log cannot change. The key absent **clears**
  it, matching the optional-absent rule above.
- **Rejected: reading the estimate out of completion history alone.** Both
  consumers that want it most — the duration chip and the gap nudge — need
  a number **before** the work happens, and history cannot produce one for
  a task that has never been completed. `tasks.md`'s own note that both
  have a fallback is the argument for the field, not against it: the
  fallback is worse, not wrong.
- **Not decided here: the surface.** `tasks.md`'s constraint stands — a
  statement about **one task's own estimate**, never a running score, and
  not a nudge (which would give it a `SurfaceId`, a toggle and a budget
  line). Phase 0 stores the number and draws the duration chip.
- **Recorded, not decided: there is still no actual.** The completion
  prompt compares an expectation to a duration the app does not record —
  it has no "started" event, and adding one is its own decision and its own
  log type. `estimated_minutes` closes the half of the loop that four docs
  named; the other half remains open.

### 3. The four row tokens are minimums, not fixed heights

**A row declares one of the four as its *minimum* height.** Its height is
the token unless its content is taller, in which case the content wins.
The token is a floor; a row never chooses a height outside the set.

`design-tokens.md`'s closing sentence becomes *"Every list row declares one
of these four as its **minimum height**. No custom row heights."*

- **The fixed-height reading was already false.** Measured over the labs:
  the note row exceeds `row-rich` by **34px**, the protocol card exceeds
  `row-hero` by **14px**, the person row exceeds `row-default` by **3px**.
  Three rows have been over their tokens for as long as the tokens have
  existed; the wrapped task title at 90px is the fourth case, not the first.
- **It costs no token.** The alternative is a fifth row height that exists
  for one row's second line.
- The task row is unchanged in the common case: 66px of content inside a
  72px floor draws at 72px.

## Consequences

**Positive.**

- The pair of gaps that made each other unclosable — a field with no
  control and a control with no home — close together, and the Calendar's
  axis and the reflow both become buildable.
- The duration chip has a source, so `components.md`'s `timer` glyph
  ("a span: an estimated or logged duration") describes something real.
- The 90px row stops being a violation of the token doc and becomes an
  instance of its rule, and no new token enters a set the doc calls closed.
- Three of ADR 0030's four "Open, and recorded here" notes that touch
  height are answered; only *"whether the row must say when"* and
  *"whether `priority` is visible in the list"* remain.

**Negative.**

- **A list's capacity is no longer a constant.** 10 rows where titles are
  short, fewer where they wrap. That is the honest cost of a title that
  never truncates, and it is why the accepted row dropped its frame and its
  hairlines — a list of varying rows still reads as a list, but it does not
  read as a table.
- **The hour control's suggestion set is unspecified**, so two screens can
  offer different hours until something owns it.
- A new log type is a permanent obligation: `task.estimated` joins the
  replay surface, and `object-model.md`'s field set and
  `02-architecture/event-log.md`'s type list have to move with it.
- The completion prompt still asks for a deviation from a number that is
  now stored but has nothing to compare against.

**Neutral.**

- No new component, no new glyph, no new screen and no new container. The
  chip row is the existing chip, single-select; the estimate reuses the
  `timer` glyph; the row-height change adds no value to the token set.

## Alternatives considered

**The hour control as an instance of the segmented control.** Rule-clean
and one component fewer. Rejected because a segmented control always has a
selected segment and the hour's default is *none* — the control would have
to draw a mode it cannot represent, and the state it cannot draw is the one
every writer currently produces.

**A time picker as the only control** (the date picker's sibling, opened
directly). Rejected as the frequent path: it is two taps and an overlay for
the case the chip row answers in one, and the defer sheet's own lesson was
that a sheet hides the thing it acts on.

**`estimated_minutes` on the completion entry only** (`task.completed`
carrying `estimated_minutes`). Rejected: it stores an expectation at the
moment it stops being useful, and the chip has to be drawn while the task
is open.

**A nullable `estimated_minutes: number | null`.** Rejected as the second
way to say absent that `code-conventions.md` forbids; the key's absence is
the one state, and `task.estimated { task_id }` clears it.

**Adding `actual_minutes` in the same change.** Rejected as an invention:
nothing records when work started, so an actual would be a guess with a
field around it. Recorded as open instead.

**A fifth row token (`row-rich-wrapped`, or reusing `row-hero`).** Rejected:
a token that exists for one row's second line, and 96 names a height 6px
above the measured one. `row-hero` is also the protocol card's own token,
so a wrapped task row and a protocol card would be claimed to be the same
thing.

**Truncating the wrapped title to one line.** Rejected: it retires the one
property ADR 0030 chose the row for — *"the title never truncates … the
accepted row clips **0 of 7**."*

**Recording the 90px as an exception with no rule change.** Rejected
because the exception already has three members, which makes it the rule.
An exception list of four that contradicts the sentence above it is how the
cap's figures moved six times in one day (ADR 0030).

## Docs updated in the same change

`02-architecture/event-log.md` (the `task.created` key, the new
`task.estimated` type and its representative payload),
`02-architecture/object-model.md` (the Task field set and the
day/point/span distinction), `03-experience/design-tokens.md` (row heights
become minimums), `03-experience/components.md` (the Controls table gains
the field row and the hour chip row; the row's chip cap is marked retired
per ADR 0030), `05-modules/tasks.md` (the two Open blocks that name the
hour control and the wrapped height resolve; §Duration and estimates names
the field), `10-engineering/code-conventions.md` (its `TaskCreatedSchema`
example carried `due`/`defer` as ISO instants, contradicting
`object-model.md`'s `DateString`), and `08-decisions/README.md`.
