# Retrieval

## Purpose

This flow defines how the user finds things: semantic search, the
command palette, natural-language filters, and the time machine. It
exists because the app accumulates data quickly and finding things
is the difference between a useful archive and a write-only pile.

Retrieval is not one feature. It is a set of surfaces that all
route through the same underlying tools.

## Invariants

- Every search derives from the log. Search indexes (including
  embeddings) are derived structures, rebuildable from the log,
  and never a source of truth (`02-architecture/event-log.md`).
- Semantic search runs on-device where possible
  (`04-ai/retrieval-layer.md`).
- Every **semantic** result includes a "why this matched" line
  (`04-ai/retrieval-layer.md`). Command, direct-match and
  filter results do not: a command matched nothing, a name is its own
  explanation, and a filter's count is the line. The line's shape is
  fixed at one: `matched: <what>` in `text-secondary`, with no score —
  the score is diagnostic, and nothing on screen branches on it.
- Search works offline. **Two** of the five surfaces below degrade and
  three do not; §Degraded search is the authoritative list of which,
  and it must stay total — a feature that stops working offline is
  exactly what this invariant exists to prevent being silent.
- Time machine is read-only.

## Specification

### The command palette

Invoked by `Cmd+K` (desktop/tablet) or long-pressing the mode
switcher (mobile).

A single input field. As the user types:

- **First, commands.** "Open calendar," "Capture," "Switch to
  habits," "Search notes for X."
- **Then, direct matches.** Tasks, events, notes, people that
  match the query by name.
- **Finally, assistant.** "Ask: <the user's text>."

The palette is the universal retrieval surface. It is also the
universal action surface. It is not a mode; it appears as an
overlay.

Result rows:

    > Open calendar
    > Capture: Buy groceries
    > Switch to Habits
    > Sarah Chen (person)
    > Design review (event, today 11:00)
    > Ask: "what did I write about Sarah?"

The surface itself is `03-experience/app-shell.md`: an overlay anchored
to the top of the viewport, one input row, one result list of
`row-compact` rows, first result preselected, `Esc` to close. This doc
owns what appears in that list and in what order.

### Search results

Reached from the palette, or from a search field in any list. Results
render as a screen:

    [ Search: "reading before bed"              ]

    Notes
      Sleep protocol — "Reading before bed, 12 of 14 nights…"
        matched: reading before bed, in the body
      Weekly review — Sep 14–20
        matched: reading before bed, in the summary
    Tasks
      Read before bed                    Sleep · nightly
        matched: the title
    Events
      Sleep study follow-up              Oct 3, 14:00
        matched: reading and sleep, by meaning

- Grouped by atom type, in the order notes, tasks, events, people.
- **Every row carries its "why this matched" line** in `text-secondary`,
  per the invariant above. One field, two contents: a keyword hit names
  the term, and a semantic hit names what the match was, because the
  words are not in the item. The last row above is the second kind —
  which is why this screen is not a keyword screen.
- Rows are the standard row components. A result is not a new row type.
- An empty result set uses the empty state
  (`03-experience/states.md`) and says the query matched nothing — not
  "No results found," which reads like an error.

The screen has one owner: this doc. `gesture-vocabulary.md` supplies
its gesture row and `04-ai/retrieval-layer.md` supplies its tools;
neither defines the screen.

### Semantic search

From the palette or from a search field in any list.

Query: natural language. Results: notes, tasks, events that match
by meaning.

Result row:

    Note: "Sarah mentioned pottery"               Mar 14
    matched: kitchen renovation, in the body

The "why this matched" line is required
(`04-ai/retrieval-layer.md`) and takes the same shape as everywhere
else: `matched: <what>`, no score. `semantic_search` returns a
`score` in its result because the tool is diagnostic-friendly; the
screen does not print it, because nothing branches on it and no doc
gives the user a scale for 0.87.

Semantic search runs on-device. If the user is offline, results may
fall back to keyword matching, with a note: "Offline: keyword-only
results."

**That fallback has no stated trigger, and one is needed.**
`04-ai/retrieval-layer.md` gives exactly one condition for a query
leaving the device — *"only if a query requires cloud models"* — and
an offline query is not one. So either the index is local and the
fallback is dead code, or the embedding model needs a first-run
download and the trigger is *"the index is not built yet"*, which is
a different instruction to the user ("connect once" rather than "you
are offline"). The layer owns this and must say which; this flow
reports the note either way.

### Natural-language filters

Some queries are filters, not searches:

- "Tasks I've deferred more than 3 times."
- "Habits I hit on weekends but not weekdays."
- "Notes I wrote in March."
- "Events with Sarah in the last 30 days."

These are parsed by Tier 3 into structured queries against the
retrieval tools (`04-ai/retrieval-layer.md`) and returned as lists.

**A filter is a result class of the palette, not a surface of its
owner.** The user types it into the same field as everything else —
"The user does not construct these queries via a filter UI. They type
them, and Tier 3 translates" — so the query has the palette's
container and the results have the palette's list. There is no
separate overlay. (`03-experience/surfaces.md` previously listed a
"Natural-language filter" Overlay; that row is a duplicate of the
palette and has been removed.)

### The time machine

Accessible from the command palette: "As of [date]."

Opens any mode as it was on that date:

- Tasks: the open tasks on that day.
- Calendar: the day view.
- Habits: the compliance state.
- Notes: the Daily Note.

Read-only, which means **writes off, reads on**: every detail view stays openable and
every action that would write is disabled. A "Return to now" button, which is the state's
one exit.

**This doc owns the state's scope; the views own its appearance.** The date applies to
whichever of the four modes you are in and follows you when you switch. The Calendar's Day
view states it in the now line rather than in a banner (`05-modules/calendar.md`).

**One name covers two scopes.** Applied to a date it reconstructs a whole mode, which is
what this entry does. Applied to a single atom it reconstructs that atom — "show me *this*
as of [date]" — which `02-architecture/data-lifecycle.md` gives as the search entry; that
scope is a state of the atom's own detail rather than of a mode.

Time machine reads the log up to the given timestamp and computes
projections (`02-architecture/projections.md`). It is the app's
most powerful retrieval feature and it costs almost nothing to
build on top of the log.

### Direct navigation

Some retrievals are direct jumps:

- From a person detail to their tasks and events.
- From a task to its linked notes.
- From a protocol to its report.
- From a report to the protocol.
- From a note to its attachment.

Entities with a detail screen (Task, Event, Note, Habit, Protocol,
Person, Goal) show a "Linked from" section listing incoming edges
(`02-architecture/object-model.md`). Areas do not have a detail
screen.

### Search from anywhere

Search is accessible from every mode:

- The palette (`Cmd+K`) from anywhere. This is the universal door and
  the only one that covers all four modes.
- A search field in the header of the two list surfaces that have one:
  **Notes** and **People**. **Tasks has a filter button and `Cmd+F`
  instead** (`05-modules/tasks.md`), which filters by Area, Person and
  due window rather than by text — a filter, not a search.

Results are consistent across entry points.

### Degraded search

This table is authoritative for what happens with no network. It is
**total**: all five surfaces appear, so a surface missing from it is
an omission rather than a decision.

| Surface | Offline |
|---|---|
| Command palette | Works. Commands and direct matches; no "Ask" row. |
| List search | Works. Substring over the local projection. |
| Semantic search | Falls back to keyword. Note: "Offline: keyword-only results." |
| Natural-language filters | **Unavailable.** Parsed by Tier 3, which needs a connection. Same note as the assistant. |
| Time machine | Works. It reads the local log. |

The assistant is "Ask: <text>" inside the palette, so it is a row
state rather than a row of its own: offline, the palette still opens
and simply never offers the third result class.

**Two of the five are affected offline, and only one of them
*degrades*.** Semantic search degrades: it still answers, less well.
Natural-language filters fail: there is no keyword form of "tasks I've
deferred more than 3 times", so the query stops existing. Both need a
model, which is why both are the two, and both get a note. The other
three are reads over the log, which is local by definition.

§Direct navigation is absent from the table because it is not a
surface: it is the edge between two detail views, and it is a read
over a local projection, so it behaves identically offline.

## Examples

**A command-palette query.**

    User hits Cmd+K, types "sarah."
    Results:
      > Sarah Chen (person)
      > Design review (event, today 11:00)
      > Get feedback on pricing page (task, due Fri)
      > Ask: "everything about Sarah"

    User picks "Sarah Chen."

**A semantic search.**

    User hits Cmd+K, types "kitchen renovation."
    Results:
      Note: "Sarah mentioned pottery"               Mar 14
      Matches "kitchen renovation" (0.87)
      Note: "Contractor said tile arrives Friday"   Sep 22
      Matches "kitchen renovation" (0.92)
      Task: "Buy standing desk"                     Sep 20
      Matches "kitchen renovation" (0.71)

    User taps the second note.

**A natural-language filter.**

    User types: "tasks I've deferred more than 3 times."
    Tier 3 parses: query over task.rescheduled events with a defer
    change, count > 3.
    Results:
      Buy standing desk (deferred 5 times)
      File Q4 taxes (deferred 4 times)
      Draft Q4 plan (deferred 3 times, at threshold)

    The user can act on each from the result list.

**The time machine.**

    User types: "as of March 14."
    App opens the calendar in time-machine mode for that date.
    The day view's now line reads: "Now · Mar 14, 2026 · 3:20 PM"
    with "Return to now" beside it.

Note the state is stated **in the now line**, not in a banner — the
now line is the slot that already means "what is current in this
view", so a timer state and a date state share it
(`05-modules/calendar.md`). A banner would be a second chrome element
competing with it.

**A search for a person's activity.**

    User opens Sarah's detail.
    Scrolls to "Linked from."
    Sees tasks, events, and notes, sorted by recency.

## What this doc must NOT do

- This doc does not define the retrieval layer's tools. Those
  are `04-ai/retrieval-layer.md`.
- This doc does not define projections. It defines reads over
  them. Projections are `02-architecture/projections.md`.
- This doc does not define the log. Time machine reads it. Log is
  `02-architecture/event-log.md`.
- This doc does not define Tier 3's query parsing. That is
  `04-ai/tier-3-assistant.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define indexing, embeddings, or model
  selection. Those are implementation details.