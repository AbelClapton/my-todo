# Calendar

## Purpose

This doc defines the Calendar module: the app's default mode and the
hub every other module attaches to. It exists because the calendar is
the surface where the Day (`02-architecture/day-as-unit.md`) becomes
visible, and it is where the user spends the most time orienting.

The Calendar is a *view of time*, not a task list with dates. Tasks,
habits, and protocols appear in it, but the calendar's primary object
is the Day.

## Invariants

- The Calendar is the default mode on app open, unless the user has
  changed `default_mode` (`05-modules/settings.md`).
- The Calendar reads from the `day_view` projection
  (`02-architecture/projections.md`). It does not define its own
  projection.
- Mirrored events are sourced from the calendar integration
  (`calendar.mirrored`) and are not owned by the app; edits write
  through to the source. In-app events are owned by the app.
- Every event shown carries freshness metadata (Invariant 4).
- Tasks shown in the calendar are scheduled tasks, not the full
  task list. Unscheduled tasks do not appear.

## Specification

### Scope

- **Day view** — the default. Shows events, scheduled tasks, habits
  due, and the protocol metric if one is active.
- **Week view** — 7 days side by side, as a **proportional chart**
  rather than a list. Events only; tasks and habits collapse to
  counts. See "The Week view layout" below.
- **Month view** — a grid. Days show event density, not event
  titles. Tapping a day opens it.
- **Year view** — 12 month grids at reduced density. Used for
  browsing, not acting.

Pinch zooms between views (`03-experience/gesture-vocabulary.md`).

### The Day view layout

Top to bottom. This is a fixed **order**, not a fixed height — see "The
fold" below, which is the measurement that settled it:

1. **Day header.** Date, day of week, week number. Previous/next
   day arrows. Tap the date to open the date picker.
2. **Now line** (`02-architecture/projections.md`). One line: the
   current event or the next scheduled task.
3. **Timeline.** A vertical time axis. Events and scheduled tasks
   are positioned by time. All-day items sit above the axis.
4. **Habits due.** A compact row of habit checkboxes for the day.
5. **Metric log.** If a protocol is in `baseline` or `active`, the
   metric input row. Baseline logs the metric too
   (`05-modules/protocols.md`).
6. **Day notes.** A preview card for each note attached to this
   day: the Daily Note first, then any other note attached to it —
   a weekly or monthly review (`05-modules/review.md`), a
   retrospective, a protocol report. First two lines each, tap to
   open.
7. **Top three.** If set during shutdown
   (`06-flows/shutdown.md`), shown here as three task rows in order,
   using the standard task row at `row-default`. No ordinal numbers and
   no hero treatment — the order is the ranking. The row's own checkbox
   completes the task from here, playing the normal completion
   animation (`06-flows/completion.md`).
8. **Completed.** Today's finished tasks, from `tasks_completed` in the
   day projection, newest first, as standard task rows in their completed
   state at `row-default`. The record closes the view: the sections above
   are what the day holds, and this is what came out of it.

**Why the Completed section exists.** `tasks_completed` is part of the
Day projection (`02-architecture/day-as-unit.md`,
`02-architecture/object-model.md`) and until now no surface rendered it —
a projection field with no consumer. It also has to be somewhere: without
it, a task completed today disappears from the day it belongs to, and the
only place to find it is the Tasks mode's completed filter.

**Completed rows are a record, not a control.** There is no direct toggle
back to "open" — ADR 0010's toggle set is closed and holds only the three
`habit.*` types. A mistaken completion is reversed through the undo
toast's window (`06-flows/completion.md`); after that it is a new log
entry, not a toggle here.

The layout uses tokens from `03-experience/design-tokens.md`:
`space-5` horizontal inset, `space-7` between sections, `row-default`
(56px) for timeline items, `type-title-1` for the header.

### The fold

The eight parts do not fit a phone. Measured at 390 × 844 with nothing
bending, they need **856px** of a **728px** frame — 128px below the fold, with
only six of the seven scrolling parts fully visible. The section added most
recently is what tipped it: **Completed costs 138px on its own, more than the
entire overflow.**

Three rules follow, and they are what make the composition work:

1. **The order is fixed; the height is not.** The view scrolls. The Day view is
the one screen in the app that is a document rather than a page — you read down
it — and `03-experience/app-shell.md`'s container rules do not apply to it.
2. **The day header and the now line do not scroll.** They are chrome and an
instrument respectively, and the now line is specified as always present
(`06-flows/doing-the-day.md`), which a scrolling view cannot honour otherwise.
   Everything below them scrolls.
3. **A section with nothing to show does not render.** An empty timeline draws
   its one line (below); every other section collapses, taking its heading and
   its gap with it. A day with no active protocol has no metric row, and a day
   with nothing finished has no Completed section.

With those rules the fold falls inside the **Completed** list: timeline, due
row, metric, Daily Note and top three are all above it. That is the right part
to lose. Completed is a record — read at the end of the day, not scanned during
it — which is also why it is the last section rather than the first.

### The Week view layout

Seven days as columns over **one shared time gutter**. The gutter is drawn once:
seven axes in 390px is seven more things than there is room for, and all seven
would be labelling the same hours anyway.

1. **Column headers.** Day-of-week abbreviation and date number, with the
   week's own header above them (`Week 39 · 21–27 Sep`). Today's column is
   tinted and its header accented.
2. **All-day band.** Above the axis, and the one part only this view can draw: an
   item covering two days needs two days on screen at once.
3. **The grid.** Events and scheduled tasks as proportional blocks, positioned by
   clock time across the shared gutter, and a **now rule** spanning all seven
   columns. The selected column is outlined.
4. **Focus line.** The selected day's date and load, and the way into it. Tapping
   a column selects it and updates this line; tapping the line opens that day.
   One tap cannot both pick a column out and leave the week, so it does not try.
   The selection starts on today.
5. **Counts strip.** Tasks due and habits per day, as counts — the "collapse to
   counts" the scope calls for, spent on telling the seven days apart.

**Titles are not drawn in the grid.** This is the one rule the view cannot bend,
and it is a measurement rather than a preference: a column is 45px wide and a
30-minute event is 28px tall, so a proportional block has no room for a name at
either scale. Identity comes from the Day view, which is one tap away. A
selection may reveal a title; the grid itself does not carry one.

The layout uses tokens from `03-experience/design-tokens.md`: `space-5` inset,
`space-7` between regions, and `type-caption` for the whole instrument — column
headers, axis labels, counts and the now rule's label alike, because a grid is
read as a whole and does not need a type scale to be read.

### The Week's fit

The Day view's problem is height; the Week's is width, and the two have the same
cause. The Day's timeline gives **every item 52px** whatever its duration — a
30-minute standup and a 3-hour workshop are drawn identically — because it is a
**list with a time gutter**, not a chart. The Week is the first Calendar surface
asked to be proportional, and proportionality is what costs the titles.

Measured at 390px: a column is **45px**, a 30-minute event is **28px** tall, and
**15 of the 18** titles a literal reading draws do not fit. Rotating the axis —
days as rows, the clock running left to right — makes it worse rather than
better: ten hours across a row is 288px, so the same 30-minute event is **14px**
wide, narrower than the column it replaced, and all 18 titles clip. **The
constraint is the clock, not the column count.**

**The axis window is fixed from week to week.** A window derived from each week's
own earliest and latest events would make two weeks incomparable at a glance,
which is the view's entire purpose. The bounds are a constant; the lab draws
08:00–18:00 for legibility, not as a proposal.

### Surfaces

**Day view (default).** As above.

**Week view.** As above — seven days as a proportional chart over one shared
gutter, with titles omitted by rule rather than by omission.

**Month view.** A grid. Days show event density, not event titles. Tapping a day
opens it.

**Year view.** 12 month grids at reduced density. Used for browsing, not acting.

**Event detail.** Opened by tapping an event. Shows title, time,
attendees (People), linked notes, prep card (via Tier 2 "Prep me"),
and an Edit action for in-app events.

**New event.** Created via capture (`pull down`) or the `+` button
in the header. Opens a form with title, time, attendees, and notes.
In-app events sync to the source calendar.

**Date picker.** A month grid overlay. Tap to jump to a day.

**Time machine.** A mode within the Day view: pick a past date and
see the day as it was. Read-only. See
`02-architecture/data-lifecycle.md`.

### Actions

| Action | Gesture | Result |
|---|---|---|
| Zoom in/out | Pinch | Day ↔ Week ↔ Month ↔ Year |
| Select a day (Week) | Tap a column | The column outlines; the focus line names it |
| Open a day (Week) | Tap the focus line | The Day view for that day |
| Next/prev day | Header arrows | Navigate |
| Jump to today | Tap "Today" | Navigate |
| Open event | Tap event | Event detail |
| Long-press event | Long-press | Tier 2 contextual menu (Prep me, Find related, Reschedule) |
| Capture | Pull down | Opens capture field |
| New event | `+` button | New event sheet |
| Time machine | Tap date → "As of" | Opens read-only past date |

### Freshness

External calendar events display an "as of" annotation when the
mirror is stale (`02-architecture/data-lifecycle.md`). In-app
events do not require the annotation (they are local).

If the app is offline, the mirror shows "Offline — last sync
<time>."

If calendar access has been revoked, the annotation is **permanent**: there is no
next sync to clear it, and the mirrored events age out on the normal 90-day rule
instead (`07-infrastructure/integrations.md`).

### Empty, waiting, error

- **Empty timeline.** One muted line in place: "Nothing scheduled." No
  headline and no action. This is an **empty section, not an empty
  view** — every Day has a Daily Note (`day.note_created`,
  `02-architecture/day-as-unit.md`), so the view around it always has
  content, and a centred `type-display` block here would be absurd.
- **The action belongs to the now line.** When the day is bare the now
  line reads "Nothing scheduled — [Capture]" and carries the one action
  (`06-flows/doing-the-day.md`). It is present in every mode's header, so
  the Calendar does not need to repeat it.
- **The Day view has no whole-view empty state.** It cannot have one: the
  Daily Note always exists (`02-architecture/day-as-unit.md`), so the view around
  it always has content, and a centred `type-display` block here would be absurd.
  `03-experience/states.md`'s empty-state form applies to surfaces that can be
  genuinely bare, and the Day is not one.
- **The Week can be bare, and is.** The reasoning above is a Day-view argument and
  does not survive the zoom levels: a week with nothing on it has no Daily Note
  and no other content, so the **Week and Month views carry the standard
  empty-state form**. An empty day inside a populated week is the other case — a
  **section**, not a view: its column renders empty and its counts read zero,
  with no headline and no action.
- **Waiting.** Past 400ms, a static `surface-2` placeholder block for
  the timeline (`03-experience/states.md`). Static — the app has no
  spinner and no shimmer anywhere (ADR 0019).
- **Error (sync failed).** A subtle banner: "Calendar sync failed.
  Retry." Non-blocking.

### What the Calendar does not do

- Does not create tasks. Tasks are created in the Tasks mode or via
  capture; scheduling a task puts it in the calendar.
- Does not manage habits. It shows habits due; checking happens
  inline (the same `habit.checked` action).
- Does not run AI. It defers to Tier 2 (long-press) and Tier 3
  (command palette).

## Examples

**A typical day view.**

    Tue, Sep 22 · Week 39
    [<]  [Today]  [>]

    NOW: Design review in 18 min

    09:00  ─ Standup (30m)              [external]
    11:00  ─ Design review with Sarah   [external]
    13:00  ─ [ ] Draft Q4 plan          [task, 45m]
    15:00  ─ 1:1 with Mark              [external]
    16:30  ─ [ ] Buy groceries          [task]

    Habits: [ ] Meditate  [x] Walk  [ ] Read
    Metric: Sleep quality [ 1 2 3 4 5 ]
    Daily note: "Felt sharp this morning..."
    Top three: 1/3 done

**A stale calendar.**

    Banner at top: "Calendar as of 2 hours ago. Retry."
    Events still shown, with the same banner treatment.

**Tapping an event.**

    Event detail opens as a sheet.
    Title, time, attendees, notes.
    Long-press on the event in the detail also opens Tier 2.
    "Prep me" produces a text card (see
    `04-ai/tier-2-contextual.md`).

## What this doc must NOT do

- This doc does not define the Day. The Day is
  `02-architecture/day-as-unit.md`.
- This doc does not define tokens. It references them.
- This doc does not define gestures, motion, or haptics. It
  references the vocabulary docs.
- This doc does not define calendar sync. Sync lives in
  `07-infrastructure/integrations.md`.
- This doc does not define Tier 2 or Tier 3 behavior. It
  references them.
- This doc does not define other modules' behavior when they
  appear in the calendar. Tasks live in `05-modules/tasks.md`,
  habits in `05-modules/habits.md`.