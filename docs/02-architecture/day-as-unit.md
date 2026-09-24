# Day as Unit

## Purpose

This doc defines the Day as the atomic product unit and the join key
across every module. It exists because the app's coherence depends on
a single organizing idea: everything temporal attaches to a Day, and
every view is a view of Days.

It is short because it is a single idea, applied everywhere.

## Invariants

- Every Event, Task completion, Task scheduling, Habit compliance
  entry, Protocol metric log, and Daily Note attaches to exactly one
  Day.
- A Day is a local-timezone date (YYYY-MM-DD). It is not a 24-hour
  window in UTC. Two users in different timezones have different
  Days for the same UTC instant.
- The Day boundary is configurable (default: 4am local). Activities
  between midnight and 4am count as the previous Day. This is a real
  user need (night owls) and a real correctness issue.
- Timezone changes do not retroactively move past Days. A Day is fixed
  at the moment it opens, using the timezone in effect at that moment.
- Everything else — Areas, Goals, People, Protocols as definitions —
  does not attach to a Day. They are layers above time.

## Specification

### What attaches to a Day

- **Event** — via its `start`. Derived, not stored on the Event.
- **Task completion** — the `completed_at` timestamp maps to a Day.
- **Task scheduling** — `scheduled_day` is a Day.
- **Habit check** — `habit.checked` has a `day` field.
- **Habit skip** — `habit.skipped` has a `day` field.
- **Protocol metric log** — `protocol.metric_logged` has a `day`
  field.
- **Daily Note** — created once per Day by `day.note_created`
  (`02-architecture/event-log.md`), attached to that Day.

### What does not attach to a Day

- **Area, Goal, Person** — definitional, not temporal.
- **Protocol** — spans many Days. Its *metric logs* attach to Days,
  but the Protocol itself does not.
- **Habit** — a definition. Its *checks* attach to Days.
- **Someday tasks** — explicitly unattached to any Day.
- **Notes attached to Tasks, Events, Habits, Protocols, People** —
  they attach to their parent entity, not to a Day directly.

### The Day projection

See `02-architecture/projections.md`. The Day projection for a date
returns:

    {
      date: DateString,
      events: EventId[],
      tasks_scheduled: TaskId[],
      tasks_completed: TaskId[],
      habits_due: HabitId[],
      protocol_metrics_due: ProtocolId[],
      daily_note_id: NoteId,
      top_three: TaskId[]
    }

This is the join of every temporal module. The Calendar, the now
line, the daily note, and the weekly review all read from it.

### Day boundary

Default: 4am local time. Activities between midnight and the boundary
count as the previous Day.

- Configurable in settings (options: midnight, 3am, 4am, 5am).
- Applied consistently across every projection.
- Stored as a user setting; the value is logged as
  `system.settings_changed`.
- Changing the boundary does not rewrite history. Past Days keep
  their original attribution. Only future Days use the new boundary.

### Timezone and travel

The Day is a local-timezone date. When the user crosses timezones,
past Days are not retroactively moved. The rule:

**A Day is fixed at the moment it opens, using the timezone in
effect at that moment.**

Specifically:

- When `day.opened` fires, the app records the date AND the timezone
  offset in effect.
- All subsequent entries for that Day use that date, regardless of
  the current timezone.
- When the user crosses timezones, the *current* Day continues until
  its boundary. Only then does a new Day open, using the new
  timezone.
- Past Days are immutable with respect to timezone. A habit checked
  on Tuesday in New York belongs to Tuesday, even if the user is now
  in London.

**Edge cases:**

- Flying from NYC to London, departing 6pm Tuesday, arriving 6am
  Wednesday (local). The flight crosses the boundary mid-flight.
  The Day that was in progress at departure (Tuesday) remains
  Tuesday. On landing, if the local time has passed the boundary,
  a new Day (Wednesday) opens.
- Traveling west across the date line. The Day that opens is the
  local date at the moment of opening. There is no "skipped day."

The timezone offset is recorded in `day.opened`'s payload for
audit purposes. It is not surfaced in the UI.

### Open editors at rollover

If the user is actively editing the Daily Note (or any Day-attached
surface) at the moment of the boundary, the editor retains its
original Day. Rollover applies to new interactions only.

Specifically:

- An editor opened for Day X continues to save to Day X until it
  is closed.
- The user sees a subtle banner: "This note belongs to Tue, Sep 22."
- If the user taps "Move to today" in the banner, the note is
  reattached (for notes) or the day is updated (for other
  entities).
- This prevents the confusing case where a half-typed sentence
  lands on the wrong Day.

### The top three

The top three for a Day are set by `day.planned`. This event is
emitted by:

- The morning plan flow, after the user picks three
  (`06-flows/morning-plan.md`) — `source: 'morning'`, a
  **commitment**.
- The shutdown flow, for the *next* Day
  (`06-flows/shutdown.md`) — `source: 'shutdown'`, a **draft** the
  user set up the night before.

**The two are not equivalent, and the projection must not treat them
as such.** A Day may have multiple `day.planned` entries (the user
re-plans) and the projection uses the latest one for `top_three` — but
the morning plan's trigger reads `source` to decide whether the user
has already *confirmed* a plan for today. Without the field, the draft
the shutdown wrote last night is indistinguishable from a choice made
this morning, and the trigger suppresses the very ritual that would
confirm it.

`day.plan_skipped` carries the same discriminator as `kind`, for the
same reason: two rituals write it.

### Day rollover

At the boundary, the app:

1. Closes the outgoing Day (via `day.closed`, if the user closes it; otherwise nothing is logged).
2. Opens the incoming Day (`day.opened`).
3. Creates the Daily Note for the incoming Day
   (`day.note_created`).
4. Recomputes `now_line` and `day_view`.

Rollover happens once, triggered by the first app open after the
boundary. If the app is not opened, rollover is deferred until it is.
Days that were never opened are still Days; they just have no
`day.opened` entry.

## Examples

**A user in New York, 11pm Tuesday, completes a task.**

    task.completed  { task_id: T1, completed_at: "2026-09-23T03:00:00Z" }

The UTC timestamp is Wednesday, but the local time is Tuesday 11pm.
The Day attribution is Tuesday (2026-09-22), because the local date
is still Tuesday and the boundary is 4am.

**The same user, 2am Wednesday, checks a habit.**

    habit.checked  { habit_id: H1, day: "2026-09-22" }

Even though the UTC and local date are both Wednesday, the boundary
of 4am means this belongs to Tuesday. The habit check appears on
Tuesday's Day view.

**A user opens the app on Thursday morning after not using it since
Monday.**

Rollover runs for Tuesday, Wednesday, and Thursday. Each gets a
`day.opened` entry, and each gets a Daily Note. The user sees
Thursday's Day view; Tuesday and Wednesday are accessible via the
time machine or the calendar.

**Someday task.**

    task.created  { task_id: T2, title: "Learn Japanese", area_id: A1 }
    task.marked_someday  { task_id: T2 }

**Planning a day.**

    Morning plan commits:
      day.planned  { day: "2026-09-22",
                     top_three: [T1, T2, T3],
                     source: "morning" }
    Shutdown commits for tomorrow:
      day.planned  { day: "2026-09-23",
                     top_three: [T4, T5, T6],
                     source: "shutdown" }

**Editing at the boundary.**

    User is typing in the Daily Note at 3:58am.
    Boundary is 4am.
    At 4am, rollover fires. A new Day opens.
    The user's editor stays on the previous Day.
    Banner: "This note belongs to Tue, Sep 22. [Move to today]"
    The user finishes typing and closes the editor.
    Their next note edit opens the new Day's note.

T2 has no `scheduled_day`. It does not appear in any Day's
`tasks_scheduled`. It appears in `task_list({ scope: 'someday' })`.


## What this doc must NOT do

- This doc does not define events. It defines the Day as the join
  key. Events live in `02-architecture/event-log.md`.
- This doc does not define the atoms and layers. It defines where
  they attach relative to Days. The model lives in
  `02-architecture/object-model.md`.
- This doc does not define the Day projection's computation. It
  defines its shape. Computation lives in
  `02-architecture/projections.md`.
- This doc does not define timezone handling in general. It defines
  Day attribution. General time handling is a library concern.