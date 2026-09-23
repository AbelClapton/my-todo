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
- **Month view** — a grid, fixed at **six rows**. Days show event density
  as position, not as a count, and never as titles. Tapping a day opens
  it. See "The Month view layout" below.
- **Year view** — 12 months, one row each, with the month's days in
  **calendar order** rather than in weekday columns. Used for browsing,
  not acting. See "The Year view layout" below.

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

### The Month view layout

Seven columns and, always, **six rows — 42 cells** — with the neighbouring
months' days drawn muted rather than blanked. The fixed row count is the
load-bearing decision: a mark is positioned as a percentage of its cell's height,
so a grid that grew a row would silently re-scale every other month's data.
September 2026 needs five rows and March 2026 needs six, and six is what makes a
mark mean the same thing in January as in June. The muted days are there because
the fixed grid needs them — a month spanning five rows otherwise leaves a row of
holes.

Each cell holds two things, and nothing else:

1. **The date.** Muted for the neighbouring months' days. It is the only text in
   the grid.
2. **A column of marks.** One per event, positioned by clock time, 2px tall — on
   the same vertical window as the Week, so that pinching between the two views
   draws the same day in the same place.

**"Event density" means position, not a count.** Of everything in the Scope, this
is the word that is not yet buildable. A single number per cell cannot tell apart
two days that are nothing like each other: one clustering three events between
09:00 and 11:30, another putting one at 08:30, one at 13:00 and one at 17:30. A
mark that carries its own time can. The count is not lost — it is one tap away in
the Day view, where it can be read.

The layout uses `space-5` inset and `type-caption` throughout, as the Week does.

### The Month's fit

The cell is **50 × 115px** on a 390px phone, which is **9.5px per hour**. A mark
is 2px, so the month's tightest gap — two events back to back — draws as a single
mark, and two marks read as one at anything under about **13 minutes** apart. It
is a coarser instrument than the Week, deliberately: at this size the question is
*which days are shaped like this*, not *what is on Thursday*.

**The fixed six rows cost resolution.** On a grid that tracked the month,
September's cells would be **138px** and an hour would be **11.8px**. That is the
price of comparability and it is the only price the view pays — at 50px wide,
nothing in a cell is clipped, which is the Week's problem and not this one.

### The Year view layout

Twelve months, one row each. The year is an **instrument** rather than a page: it is
read as a whole or not at all, and every part of it is `type-caption`.

1. **Month rows.** Twelve, in order, each labelled on the leading edge. The current
   month is accented.
2. **The day strip.** The month's days in **calendar order** — left to right, first to
   last — against the row's full height. Load is the cell's own height, so a heavy week
   is a ridge and a quiet one a floor. A day with nothing on it still marks its place,
   or the strip's gaps read as missing days rather than as quiet ones.
3. **Today.** Marked in the strip with the accent. There is no now rule at this scale:
   with no time axis left, there is nothing for one to cross.
4. **The month total.** The trailing figure, accented for the current month.

**Days are not aligned to weekdays.** This is the view's one real departure, and it is
forced by arithmetic rather than chosen for looks: seven days across a phone is **44px**
a column, because the phone's width is the floor at every zoom level. Aligning days to
weekdays therefore leaves each cell **9px tall**, and every encoding the Month uses is
vertical. Where a month grid keeps the weekday, the day cannot be drawn; where the day
is drawn, the weekday cannot be kept. The Year keeps the day, because a year is looked
at for *when it was busy*, and a column of weekdays does not answer that.

A row is also the right unit for a second reason: **a month is comparable with a
month.** Twelve rows of equal height, normalised against one load scale, make October's
ridge and March's readable against each other. That is what browsing needs, and it is
why the layout is twelve rows rather than twelve grids.

### The Year's fit

The Year does not overflow — and that is the problem. Twelve month grids, seven columns
by six rows each, is **504 cells**, and they fit a 390 × 844 phone comfortably. What
does not fit is the **encoding**.

Measured: a cell is **44 × 9px**. The Month's cell, one zoom up, is **50 × 115px** — a
hair wider and **13 times** the height. That takes a day from **9.5px an hour to 0.9px**,
and a 30-minute event to **0.4px**, before the mark's 2px floor. Every mark in the grid
therefore draws as **exactly one pixel**: a 30-minute meeting and a 3-hour one are the
same mark, and a day holding one event looks like a day holding four. The date is worse
than the mark — `type-caption` is **12px** and the cell is **9px**, so the days are not
merely unreadable, they are unnumbered.

So "reduced density" names a reduction that cannot be made. The Year is not too small to
draw; it is that the Month's encoding is entirely vertical and the Year has no vertical
room, so that encoding does not degrade — it ceases to exist. The layout above is what
replaces it: the time axis goes, and the day's own height carries **amount** instead of
**time**.

### Surfaces

**Day view (default).** As above.

**Week view.** As above — seven days as a proportional chart over one shared
gutter, with titles omitted by rule rather than by omission.

**Month view.** As above — a grid fixed at six rows, each cell a column of marks
positioned by time, with the neighbouring months' days drawn muted. Tapping a day
opens the Day view for it; pinching is the gesture that reaches the Week.

**Year view.** As above — twelve month rows with the days in calendar order, load drawn
as the cell's own height. Used for browsing, not acting.

**Event detail.** Opened by tapping an event. It is a **screen, not a sheet**, and that
is forced rather than chosen: the view offers Tier 2 and the person picker, both of
which are sheets, and `03-experience/app-shell.md` allows at most one sheet at a time —
so a sheet-hosted detail would be dismissed by the very action it offers, and the prep
card would be read over a long-press menu instead of over the meeting.

It shows title, time, attendees (People) and linked notes, in that order, because the
thirty seconds before a meeting need the time and the people first. An **Edit** action
appears for in-app events only; a mirrored event carries its freshness annotation
instead, and says that it is edited at the source.

**The prep card is the view's second state, not part of its first.** Tier 2 has no
ambient mode (`04-ai/tier-2-contextual.md`), so the card cannot be present when the view
opens. What the view carries first is an **invitation** naming what the card would
read — attendees, notes, linked tasks — and the card **lands in that place**, replacing
the invitation, when "Prep me" is invoked from here.

That is what the view's spare room is for. It draws **393px of a 728px body** before the
card and about **590px** after, so the card the sentence promises is the thing that space
was always going to hold.

**New event.** Reached from the `+` in the header, which is present in every Calendar
view because the Calendar creates something. A **screen, not a sheet**, for the same
reason Event detail is: two of its four fields open an overlay of their own — the time
field opens the date picker and the attendees field opens the person picker, both listed
as Overlays in `03-experience/surfaces.md` — and `03-experience/app-shell.md` allows at
most one sheet at a time. A sheet-hosted form would have each field replace the form it
belongs to, and a keyboard is on screen for most of the time it is open.

**Capture does not reach this surface.** `06-flows/capture.md` creates the event and
`03-experience/motion-vocabulary.md` has the capture field *morph into the item's detail
view* — a different destination, and one the Event detail above already covers. Capture
is an entry to the detail, not to a form.

The form holds title, when, with and note, in that order. **When is not a picker**: three
canned answers cover the common case in one tap and only "Other…" opens the date picker,
so the frequent path touches no modal at all. **The note is attached after the event
exists**, because `05-modules/notes.md` attaches notes from a detail and there is no detail
yet — the field says so rather than implying otherwise.

In-app events sync to the source calendar.

**Date picker.** A month grid overlay, reached from the date in the day header, the defer
sheet's "Pick a date…", and the new event form's "Other…". It draws the **same grid as
the Month view** — 42 cells, the same classes — and follows the same rule about what a
day carries ("The Month view layout"): *a day shows its shape, positioned by time*.

It is an overlay rather than a screen, so its cells come out **1.6× shorter** and the rule
is drawn at **5.4px an hour against the Month's 9.7**, where two marks merge below
**22 minutes** instead of 13. That is enough to see which days are heavy and not enough to
read when — which is the question a chooser asks. A coarser version of one rule is worth
more than an unexplained second one.

**Two fixed points, because a chooser has two:** today is ringed, and the day you are on
is outlined. A month view has only the first.

**One tap means one thing.** A tap on a day goes to that day. The Time machine is reached
from an explicit "As of…" action rather than from the same tap.

**The mirror's horizon is drawn.** `02-architecture/data-lifecycle.md` prunes mirrored
events older than 90 days and re-fetches only when a past date is opened, so a day before
that boundary carries a dashed underline. Choosing a date the app cannot answer for is
then a visible choice rather than a surprise.

**Time machine.** A mode within the Day view: pick a past date and
see the day as it was. Read-only. See
`02-architecture/data-lifecycle.md`.

### Actions

| Action | Gesture | Result |
|---|---|---|
| Zoom in/out | Pinch | Day ↔ Week ↔ Month ↔ Year |
| Select a day (Week) | Tap a column | The column outlines; the focus line names it |
| Open a day (Week) | Tap the focus line | The Day view for that day |
| Open a day (Month) | Tap a day | The Day view for that day — pinch zooms, tap opens |
| Next/prev day | Header arrows | Navigate |
| Jump to today | Tap "Today" | Navigate |
| Open event | Tap event | Event detail |
| Long-press event | Long-press | Tier 2 contextual menu (Prep me, Find related, Reschedule) |
| Capture | Pull down | Opens capture field |
| New event | `+` button | New event screen |
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
  and no other content, so the **Week, Month and Year views carry the standard
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

    Event detail opens as a screen. It is not a sheet: it offers
    Tier 2 and the person picker, and both of those are sheets, so a
    sheet here would be dismissed by its own actions.
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