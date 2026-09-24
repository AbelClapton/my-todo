# Object Model

## Purpose

This doc defines the four atoms (Event, Task, Note, Habit), the four
layers (Area, Goal, Protocol, Person), the Day, and the eleven
canonical edges between them. It exists because "you can link
anything to anything" is not a model — it is the absence of one, and
it produces a graph the AI cannot reason over.

This doc is the second spine. The event log (`02-architecture/event-log.md`)
records what happened. This doc records what *exists* and how things
relate.

## Invariants

- There are exactly four atoms and four layers. Nothing else has
  identity.
- There are exactly eleven canonical edge types. Any relationship
  outside this set is a free-text mention, not an edge.
- An entity's identity is its ULID. Names are not identities;
  renaming does not change identity.
- Every atom and every layer is derived from the log. This doc
  describes the *shape* of the derived state, not a storage schema.
- The graph is typed. The AI may not invent edge types.
- Adding an atom, a layer, or an edge type requires an ADR.

## Specification

### The four atoms

Atoms are the only things with identity. Everything else classifies,
groups, or links them.

**Event** — anything with a time. Field set:

    {
      id: ULID,
      title: string,
      start: ISO-8601 UTC,
      end?: ISO-8601 UTC,
      day: DateString,           // derived from start in local tz
      source: 'in_app' | 'google_calendar' | 'apple_calendar' | ...,
      people: PersonId[],
      deleted: boolean
    }

**Task** — anything with a completion state. Field set:

    {
      id: ULID,
      title: string,
      area_id: AreaId,           // required
      due?: ISO-8601 UTC,
      defer?: ISO-8601 UTC,
      priority: 'now' | 'next' | 'later',
      parent_task_id?: TaskId,
      scheduled_day?: DateString,
      people: PersonId[],
      state: 'open' | 'completed' | 'someday' | 'archived' | 'deleted',
      completed_at?: ISO-8601 UTC,
      completion_note?: string
    }

**Note** — anything with a body. Field set:

    {
      id: ULID,
      title?: string,
      body: string,              // markdown
      attached_to: { type: 'task' | 'event' | 'habit' | 'protocol'
                          | 'day' | 'person', id: ULID },
      deleted: boolean
    }

**Habit** — anything with a recurrence and a compliance state.
Field set:

    {
      id: ULID,
      name: string,
      cadence: Cadence,          // see below
      minimum_viable?: string,   // display string for the floor
      area_id: AreaId,
      protocol_id?: ProtocolId,  // set when part of a protocol
      state: 'active' | 'archived',
      compliance: ComplianceEntry[]  // derived from log
    }

    type Cadence =
      | { type: 'daily' }
      | { type: 'weekly', days: Weekday[] }
      | { type: 'interval', every: number, unit: 'day' | 'week' }

    type ComplianceEntry = {
      day: DateString,
      state: 'done_full' | 'done_minimum' | 'done_repair' | 'skipped' | 'missed'
    }

Note: `'missed'` is derived (a scheduled day with no entry), not
logged. Only `done_full`, `done_minimum`, `done_repair`, and
`skipped` are logged.

### The four layers

Layers classify atoms. They do not exist on their own; they are
filters and groupings.

**Area** — a life domain. Field set:

    { id: ULID, name: string, state: 'active' | 'archived' }

Examples: Health, Work, Home, Learning.

**Goal** — an outcome under an Area. Field set:

    { id: ULID, name: string, area_id: AreaId,
      state: 'active' | 'achieved' | 'abandoned' }

Examples: Improve sleep, Ship v1.

**Protocol** — a time-boxed experiment. Field set:

    {
      id: ULID,
      goal_id: GoalId,
      hypothesis: string,
      habit_specs: HabitSpec[],   // become Habits on adoption
      metric: MetricSpec,
      baseline_days: number,
      duration_days: number,
      status: 'proposed' | 'baseline' | 'active' | 'completed' | 'abandoned',
      started_at?: ISO-8601,
      baseline_ends_at?: ISO-8601,
      review_at?: ISO-8601,
      source: 'ai' | 'user',
      explanation: string
    }

    type MetricSpec = { name: string, scale: [number, number],
                        labels?: string[] }

**Person** — a human. Field set:

    { id: ULID, name: string,
      source: 'manual' | 'contacts',
      state: 'active' | 'archived' }

### The Day

The Day is the atomic product unit. Field set:

    {
      date: DateString,           // YYYY-MM-DD in user's local tz
      events: EventId[],          // derived
      tasks_scheduled: TaskId[],  // derived
      tasks_completed: TaskId[],  // derived
      habits_due: HabitId[],      // derived
      protocol_metrics_due: ProtocolId[],  // derived
      daily_note_id: NoteId,      // auto-created
      top_three: TaskId[]         // set by day.planned; source says who set it
    }

The Day is a projection (`02-architecture/projections.md`), not
logged state. Only `day.opened`, `day.planned`, `day.plan_skipped`,
`day.closed`, and `day.note_created` are logged; everything else
is computed.

### The eleven canonical edges

    1.  Task → Area              (many-to-one, required)
    2.  Task → Person            (many-to-many, optional)
    3.  Task → Day               (many-to-one, optional; scheduling)
    4.  Task → Task              (many-to-one, optional; parent)
    5.  Event → Person           (many-to-many, optional)
    6.  Event → Day              (many-to-one, required; derived from start)
    7.  Habit → Area             (many-to-one, required)
    8.  Habit → Protocol         (many-to-one, optional)
    9.  Protocol → Goal          (many-to-one, required)
    10. Goal → Area              (many-to-one, required)
    11. Note → exactly one of {Task, Event, Habit, Protocol, Day, Person}
                                 (exactly one, required)

Edge 11 is polymorphic. A Note attaches to exactly one entity. It
cannot attach to two, and it cannot be unattached (though it can be
reattached, which logs `note.reattached`).

Note: an earlier draft of this doc claimed nine, then ten edges. The
correct count is eleven. The glossary (`01-foundation/glossary.md`)
is amended to match.

### Amendments and corrections

- 2026-09-22: edge count corrected from 9 → 10 → 11 as the model
  was written out. The glossary reflects the final count.
- 2026-09-22: `Event.source` added to distinguish in-app events from
  mirrored calendar events, because Invariant 4 (freshness) requires
  labeling mirrored data.

### What is not an entity

- **Nudges** — events in the log, not entities. They have no detail
  screen.
- **Research results** — Notes attached to Tasks. Not their own
  entity.
- **Protocol reports** — Notes attached to Protocols. Not their own
  entity.
- **Daily notes** — Notes attached to Days. Not their own entity.
- **Metric logs** — entries in the log, projected onto Protocols.
  Not their own entity.
- **Settings** — log entries (`system.settings_changed`), projected
  into a settings object. Not an entity.
- **Calendar mirror data** — Attributes on Events, not a separate
  entity. The `calendar.mirrored` log entry carries the raw payload
  for reconciliation, but the Event atom is the projection.

If a proposed feature needs a new entity, it must be an atom or a
layer, and it must fight for the slot via an ADR. There are no
"sub-entities."

## Examples

**A task with everything attached.**

    Task T1: "Plan Sarah's birthday"
      area: Home (A2)
      scheduled_day: 2026-11-01
      due: 2026-11-05T00:00:00Z
      defer: 2026-10-25T00:00:00Z
      priority: next
      people: [Sarah (P1), Mark (P2)]
      notes: [N1: "she mentioned wanting to try pottery"]
      parent: none
      state: open

Graph edges present: T1→A2, T1→P1, T1→P2, T1→Day(2026-11-01),
N1→T1.

**A protocol with its habits.**

    Protocol PR1: "Improve sleep"
      goal: Improve sleep (G1)
      hypothesis: "..."
      habits: [H1: "Same wake time", H2: "No screens after 10pm"]
      metric: { name: "Sleep quality", scale: [1, 5] }
      status: active
      baseline_days: 14, duration_days: 28

Graph edges present: PR1→G1, H1→PR1, H2→PR1, H1→Health(A1),
H2→Health(A1).

**A note attached to a day.**

    Note N2: "2026-09-22 — Tuesday"
      body: "Felt sharp this morning. The contractor called..."
      attached_to: { type: 'day', id: '2026-09-22' }

Edge present: N2→Day(2026-09-22).

**A relationship that is NOT an edge.**

    "Mentioned Sarah in a note about work."

If the note is attached to a Task and the body says "talk to Sarah,"
that is a free-text mention. It does not create a Note→Person edge.
The graph only contains what is explicitly linked.

## What this doc must NOT do

- This doc does not define event types. It defines the *atoms and
  layers* that events create and mutate. Events live in
  `02-architecture/event-log.md`.
- This doc does not define projections. It defines the *shape* of
  derived state. The computation lives in
  `02-architecture/projections.md`.
- This doc does not define UI. It defines data. Screens that present
  this data live in `03-experience/` and `05-modules/`.
- This doc does not define AI behavior. It defines the graph the AI
  reasons over. The AI's rules live in `04-ai/`.
- This doc does not define how entities are stored. It defines what
  they are. Storage is an implementation detail of the projection
  layer.