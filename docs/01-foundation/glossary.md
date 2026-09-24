# Glossary

## Purpose

This doc defines every canonical term used across the app's
documentation, code, UI, and AI prompts. It exists because a system
this size will develop synonyms — "item," "entry," "record," "thing"
all meaning roughly the same object — and synonyms destroy coherence.
The graph is only as useful as its constraints; the vocabulary is the
first constraint.

Read this doc before any other. If a term is not defined here, it is
not canonical, and it should not appear in specs, code, or prompts.

## Invariants

- Every term has exactly one definition. No term has two meanings.
- No synonym is permitted. If "task" is canonical, "todo," "item,"
  "action," and "to-do" are prohibited — in code, UI, and AI prompts.
- Terms in code use `snake_case` for fields, `PascalCase` for types,
  `camelCase` for variables. Terms in UI use the human-readable form
  (which may differ — see "Display forms" below).
- When a term is added, removed, or redefined, every doc that uses it
  must be updated in the same change. The glossary is the source of
  truth.

## Specification

### The four atoms

The only things with identity. Everything else classifies, groups, or
links these.

**Event** — anything with a time. Sourced from the calendar
integration or created in-app. An Event has a `start`, an `end`
(optional), a `title`, and zero or more People. Mirrored Events are
not owned by the app; edits write through to the source. In-app
Events are owned by the app. An Event
is not a Task, even if it has a time; a Task is not an Event, even
if it is scheduled.

**Task** — anything with a completion state. A Task has an optional
`due` (a deadline), an optional `defer` (when it becomes visible),
and a completion state (`open`, `completed`, `someday`, `archived`).
A Task is not an Event. A Task may be scheduled onto a Day, but this
is a scheduling decision, not an intrinsic property.

**Note** — anything with a body. A Note has a `body` (markdown), an
optional `title`, and exactly one attachment edge (see "Edges").
A Note is not a Task, even if it describes work. A Note is not a
document store; it is a body of text attached to exactly one thing.

**Habit** — anything with a recurrence and a compliance state. A
Habit has a `cadence` (daily, weekly, custom), an optional
`minimum_viable` version, an optional parent Protocol, and a
compliance history. A Habit is not a Task; it recurs. It is not
completed once; it is complied-with repeatedly.

### The four layers

Things that classify atoms, not things that exist on their own.

**Two of the four accumulate a history and two do not.** Area and
Person are classifications — nothing is done to them, and the surface
that lists one is listing what was filed under it. Goal and Protocol
accumulate protocols, reports, and metric series, and that history is
what their screens are for. All four are still layers: none of them is
the subject of a Day.

**Area** — a life domain. Examples: Health, Work, Home, Learning —
plus Inbox, one of the five created on first launch. Areas are
top-level classification. Every Task, Habit, Goal, and Protocol
belongs to exactly one Area. Areas do not have their own detail
screens; they are filters.

**Goal** — an outcome under an Area. Examples: Improve sleep
(Health), Ship v1 (Work). Goals are the parent of Protocols. A Goal
has a `state` — `active`, `achieved`, or `abandoned` — and it is a
narrative state rather than a boolean, because `abandoned` is not
`not-yet-achieved`: abandoning is a decision with an optional reason,
and `goal.reopened` reverses either ending. **A Goal has a detail
screen**, and it is the app's only layer that does: protocols, reports,
and the follow-up action all live there.

**Protocol** — a time-boxed experiment with a hypothesis, a set of
Habits, a metric, a baseline, and a review date. A Protocol belongs
to exactly one Goal. A Protocol has a `status` (`proposed`,
`baseline`, `active`, `completed`, `abandoned`). A Protocol is not a
Goal; it is how a Goal is pursued for a bounded window.

**Person** — a human. A Person may be linked to Tasks, Events, and
Notes. A Person is not a user; the user is the app's owner. A Person
is not a contact; contacts are a source, People are the app's
representation.

### The day

**Day** — the atomic product unit. A Day is a date (YYYY-MM-DD in
the user's local timezone). Every Event, Task completion, Habit
compliance entry, Protocol metric log, and Daily Note attaches to a
Day. The Day is the join key across every module. A Day is not a
calendar day in the integration sense; it is the product's
organizing unit.

**Daily Note** — the auto-created Note attached to a Day. One per
Day. It is the journal, the scratchpad, and the AI's natural context
anchor. It is not a "daily log" in the habit sense; it is the Day's
narrative layer.

**Now line** — the persistent, always-visible indicator of what the
user should be doing right now. It is not a nudge; it does not
consume attention budget. It is a single line of text: the current
event or the next task.

### Capture and the inbox

**Capture** — the unit produced by one act of capture: whatever
entered the app, whether Tier 1 parsed it into a Task, an Event, or
a Habit, or left it as an unparsed Note. "Capture" is the noun; "to
capture" is the action (`06-flows/capture.md`). It is not a synonym
for Task: a capture may become a Task, and a Task is a capture only
while it is still unclassified.

**Inbox** — the projection listing the captures that have not been
scheduled, archived, or completed: unparsed notes and unclassified
tasks (`02-architecture/projections.md`). It is a view, not a
container — nothing is moved into it, and nothing has to be taken
out of it.

### Events and the log

**Event log** — the append-only, immutable record of every state
change. The Event log is the source of truth. Current state is a
projection (see below). The Event log is not the same as the Event
atom; "Event" (capitalized) is the atom, "event" (lowercase) is an
entry in the log. To avoid confusion, log entries are called
**log entries** or **events** in code, and the atom is called an
**Event** in UI. This doc uses "Event" for the atom and "log entry"
for the log.

**Log entry** — one entry in the Event log. Has a `type`, a
`timestamp` (ISO-8601, UTC), a `payload` (type-specific), and an
optional `compensation_for` (the log entry it reverses). Log
entries are never mutated or deleted.

**Compensation** — a log entry that reverses the effect of a prior
log entry. Undo is implemented as a compensation, not as a deletion.
A compensation is not an update; it is a new entry that supersedes
the prior one in the projection.

**Projection** — the computation of current state from the Event
log. The task list, habit streaks, protocol reports, and every
other view are projections. A projection is not stored; it is
computed (or cached, but the cache is not the source of truth).

### AI terms

**Tier 1** — ambient parsing. Natural language input (typed or
spoken) is converted to structured data. Runs on-device. May apply
silently if confidence is high, with a "parsed" chip.

**Tier 2** — contextual actions. Inline actions on a focused item
(a Task, a Habit, a Note). User-initiated, always proposes, never
executes without a tap.

**Tier 3** — assistant. Cross-module queries and mutations, invoked
via command palette. Receives `{ currentMode, focusedItem }` and a
set of tools, not a context dump.

**Proposal** — the output of Tier 2 or Tier 3. A Proposal is either
text (for display) or a list of mutation proposals (structured
data). A Proposal is not applied until the user consents.

**Mutation proposal** — a structured description of a state change
the AI wants to make. Has a `target`, an `operation`, and a
`payload`. Applying a mutation proposal creates a log entry.

**Constitution** — the eight rules that every AI prompt must
respect. Defined in `04-ai/constitution.md`. The constitution is
not a system prompt; it is the *content* that every system prompt
includes.

**Retrieval layer** — the component that fetches context for the
AI on demand. The AI receives tools (`query_events`, `query_tasks`,
`semantic_search`, etc.) and calls them, rather than receiving a
context dump.

**Semantic search** — search by meaning, not keyword. Uses
embeddings. Runs on-device where possible.

**Research** — the action of gathering external information
(typically web search) in response to a user request. Output is a
Note attached to the source Task, with timestamps on every result.

### Protocol terms

**Hypothesis** — the one-sentence claim a Protocol tests. Example:
"Consistent wake time and no screens after 10pm will improve sleep
quality." A Hypothesis is not modified once a Protocol is active.

**Baseline** — the period before a Protocol activates, during which
the metric is logged but no Habits are enforced. Typically 1–2
weeks. The Baseline is not a "warm-up"; it is the control condition.

**Metric** — the outcome a Protocol measures. Examples: sleep
quality (1–5), focus (1–5), mood (1–5). A Metric is defined when
the Protocol is created and is immutable during the active window.

**Metric log** — one entry of a Metric, attached to a Day. Logging
is a daily obligation and does not consume attention budget.

**Compliance** — the rate at which a Habit was performed over a
window. Compliance is not a streak. "18 of 28 days" is compliance;
"18-day streak" is a streak. Compliance is the canonical measure;
streaks are a display variant.

**Protocol report** — the AI-generated summary at a Protocol's
review date. Compares Baseline to active window, per-Habit
compliance, and a plain-language interpretation. A Report is a
Note attached to the Protocol.

### Edge types

**Edge** — a canonical relationship between two entities. There
are exactly eleven edge types:

1.  `Task → Area`              (many-to-one, required)
2.  `Task → Person`            (many-to-many, optional)
3.  `Task → Day`               (many-to-one, optional; scheduling)
4.  `Task → Task`              (many-to-one, optional; parent)
5.  `Event → Person`           (many-to-many, optional)
6.  `Event → Day`              (many-to-one, required; derived from start)
7.  `Habit → Area`             (many-to-one, required)
8.  `Habit → Protocol`         (many-to-one, optional)
9.  `Protocol → Goal`          (many-to-one, required)
10. `Goal → Area`              (many-to-one, required)
11. `Note → {Task | Event | Habit | Protocol | Day | Person}`
                               (exactly one, required)

Edge 11 is polymorphic. A Note attaches to exactly one entity. It
cannot attach to two, and it cannot be unattached (though it can be
reattached, which logs `note.reattached`).

Any relationship outside this set is a free-text mention, not an
edge.

**Free-text mention** — a reference to another entity by name in a
body of text, not a canonical edge. A mention is not a link; it does
not appear in the graph and does not count for AI reasoning.

### Experience terms

**Token** — a named value in the design system (spacing, radius,
type size, color). Tokens are defined in
`03-experience/design-tokens.md`. No screen may use a raw value;
every value references a token.

**Gesture vocabulary** — the closed set of eight gestures the app
recognizes. Swipe right = complete, swipe left = defer, swipe up =
attach, swipe down = remove from this list, long-press = contextual
AI, pull down = capture, swipe from left edge = back, pinch = zoom.
Defined in `03-experience/gesture-vocabulary.md`.

**Motion vocabulary** — the closed set of durations and easings.
Six durations (100–400ms) and two easing curves. Defined in
`03-experience/motion-vocabulary.md`.

**Haptic vocabulary** — the closed set of haptic feedbacks. Four
haptics: completion, mode switch, error, success. Defined in
`03-experience/haptic-vocabulary.md`.

**Attention budget** — the ranked queue and the cap (one nudge per
hour, three per day). Defined in
`03-experience/attention-budget.md`.

**Nudge** — a notification or in-app surface that wants the user's
notice. A Nudge is not the now line (which is persistent and does
not consume budget) and is not a daily obligation (habit
checkboxes, metric logging).

### Infrastructure terms

**Local-first** — the client holds a full copy of the Event log
and computes projections locally. The server is a sync peer, not
the source of truth. Defined in
`02-architecture/local-first.md`.

**Sync peer** — the server, in a local-first architecture. It
receives log entries from the client and broadcasts them to other
clients. It does not resolve conflicts by authority; conflicts are
resolved by ordering.

**Retrieved_at** — the ISO-8601 UTC timestamp of when a piece of
external data was fetched. Every non-log-entry record has one.
Defined in `01-foundation/principles.md` (Invariant 4).

**Source** — the integration or AI tier that produced a piece of
external data. Examples: `google_calendar`, `apple_health`,
`email_forward`, `ai.research`. Every non-log-entry record has one.

### Display forms

In UI, terms may use a friendlier form. The canonical term is what
code and AI prompts use; the display form is what the user sees.

| Canonical | Display |
|---|---|
| Task | Task |
| Event | Event |
| Note | Note |
| Habit | Habit |
| Area | [the area's name, e.g., "Health"] |
| Goal | [the goal's name] |
| Protocol | [the protocol's hypothesis, shortened] |
| Person | [the person's name] |
| Day | [the date, e.g., "Tue, Sep 22"] |
| Metric | [the metric's name] |
| Compliance | "18 of 28 days" or "64%" |
| Now line | (no label; it is just the line) |

## Examples

A correctly-worded spec sentence:

> When a user long-presses a **Task**, Tier 2 proposes a **Note**
> attached to the Task, with each result carrying `retrieved_at`
> and `source`.

A wrongly-worded sentence (with synonyms and missing canonical
terms):

> When a user long-presses an item, the AI creates a card with
> search results.

The second is wrong because:
- "item" is not canonical (should be "Task")
- "card" is not canonical (should be "Note," or "surface" if UI)
- "the AI" is not precise (should be "Tier 2")
- "search results" is not canonical (should be "research results
  with `retrieved_at` and `source`")
- "creates" implies execution without consent (should be "proposes")

## What this doc must NOT do

- This doc does not define behavior, schemas, or rules. It defines
  terms. Behavior lives in the docs those terms reference.
- This doc does not define UI copy or microcopy. Display forms are
  given for clarity, but the actual strings live in
  `03-experience/` and `05-modules/`.
- This doc does not define the event log schema. It defines the
  *terms* "log entry" and "compensation." The schema lives in
  `02-architecture/event-log.md`.
- This doc does not define the AI tiers in full. It defines the
  *terms* "Tier 1/2/3." The behavior lives in `04-ai/`.
- This doc does not maintain a list of synonyms to avoid. It
  maintains the canonical set. If a term is not here, it is not
  canonical. The absence is the prohibition.