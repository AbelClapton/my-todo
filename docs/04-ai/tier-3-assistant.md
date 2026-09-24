# Tier 3 — Assistant

## Purpose

This doc defines Tier 3: the cross-module assistant, invoked via
the command palette. It exists because some queries span modules
("what does my week look like," "move everything Thursday to
Friday") and some actions are too complex to attach to a single
item. Tier 3 is the escape hatch.

Tier 3 is not a destination. It has no mode, no tab, no home. It
appears when invoked and disappears when done.

## Invariants

- Tier 3 is always user-initiated. There is no ambient Tier 3.
- Tier 3 always produces either an answer (text) or a set of
  mutation proposals. The user decides (Rule 1).
- Tier 3 receives a minimal context and tools, not a dump
  (`04-ai/retrieval-layer.md`).
- Tier 3 never modifies an active protocol (Rule 3).
- Tier 3 never adds structure (Rule 6).
- Tier 3 says "I don't know" when data is insufficient (Rule 7).
- Every Tier 3 call that produces a proposal is logged
  (`ai.proposed`, then `ai.applied` or `ai.rejected`). Pure read
  queries (answers with no mutation) are logged to the client
  diagnostics buffer, not the event log.

## Specification

### The invocation

Tier 3 is invoked via the command palette:

- **Keyboard:** `Cmd+K` — but only because that is the palette's own
  chord, per `03-experience/gesture-vocabulary.md`. Tier 3 does not
  own a shortcut; the palette does, and the assistant is one of the
  things it can do.
- **Mobile:** long-press the mode switcher. (The mode switcher is
  not an atom, so this does not collide with long-press = contextual
  AI on a Task, Event, Note, or Habit.)
- **Voice:** the microphone button inside the palette.

The palette is a single input field with a results area below it.
As the user types, results update. Results include all three:

1. **Commands** — direct app actions ("Open calendar," "Capture,"
   "Switch to habits," "Search notes for X").
2. **Direct matches** — tasks, events, notes and people that match
   the query by name (`06-flows/retrieval.md`).
3. **Assistant queries** — "Ask: <the user's text>."

The assistant is the fallback when **neither** a command nor a direct
match applies. It is the third class, not the second: a name the user
typed is a better answer than a question about it. The user does not
choose "ask the assistant"; it is what happens when they type
something that is neither a command nor a name.

### The output shape

Tier 3 returns one of:

    {
      type: 'answer',
      text: string,
      citations?: Array<{ type: string, id: ULID, snippet: string }>,
      freshness?: Array<{ id: ULID, retrieved_at: ISO-8601,
                          source: string }>
    }

    {
      type: 'proposals',
      proposals: Array<{
        target: string,
        operation: string,
        payload: object,
        explanation: string
      }>,
      explanation: string    // one line for the batch — the field the log stores
    }

    {
      type: 'clarification',
      question: string,
      options?: string[]
    }

The clarification type is used when the assistant needs more
information. It is not a failure; it is the correct response to an
ambiguous query.

### The query patterns

Tier 3 handles these classes of queries. Each maps to a tool-call
pattern.

**Queries about current state.**
- "What's on my calendar tomorrow?"
- "What's overdue?"
- "Show me my habits for this week."
- Tool pattern: `now()` + one or two `query_*` calls.

**Queries about history.**
- "When did I last talk to Sarah?"
- "How many times did I defer this task?"
- "Show me my notes from March."
- Tool pattern: `now()` + `query_*` + possibly `semantic_search`.

**Queries requiring reasoning.**
- "What does my week look like?"
- "Am I overcommitted?"
- "What should I focus on?"
- Tool pattern: `now()` + several `query_*` + possibly
  `semantic_search` + synthesis.

**Queries requiring search.**
- "What did I write about the kitchen renovation?"
- "Find the task about the contractor."
- Tool pattern: `semantic_search`.

**Mutations.**
- "Move everything Thursday to Friday."
- "Mark the dentist task done."
- "Reschedule this for next week."
- Tool pattern: `query_*` to resolve the target, then proposals.

**Protocol actions.**
- "Start a sleep protocol."
- "How is my sleep protocol going?"
- Tool pattern: `query_protocol` + possibly `research`.

**Unknown or out-of-scope.**
- "How much did I spend on groceries?"
- "What's the weather next week?"
- Response: Rule 7 — say "I don't know" and explain why. Do not
  invent structure to answer (Rule 6).

### The mutation flow

For mutation queries, Tier 3:

1. Resolves the target(s) via tools.
2. Produces the proposals.
3. Shows a summary and the proposal list.
4. User taps "Apply." All proposals apply atomically.
5. A single undo toast appears. Undo reverses all.

If the assistant cannot resolve the target unambiguously, it
returns a clarification.

### The clarification flow

When the query is ambiguous:

    User: "Move my meeting."

    Tier 3: { type: 'clarification',
              question: "Which meeting?",
              options: ["Design review (11:00 today)",
                        "1:1 with Mark (3:00 today)",
                        "Standup (9:00 tomorrow)"] }

The user picks an option or types a new query. The clarification
is not logged as a separate call; it is part of the same
conversation.

### The query classes and what they cost

Seven classes, and every one of them has a **class**, a **price**, and a
**place it runs**. `07-infrastructure/cost-model.md` is the authority for
the prices — this table names them so the classes and the prices cannot
drift apart.

| Class | Example | Price | Runs |
|---|---|---|---|
| Current state | "What's on my calendar tomorrow?" | simple | on-device |
| History | "When did I last talk to Sarah?" | simple | on-device |
| Search | "What did I write about the kitchen renovation?" | simple | **may use cloud** |
| Reasoning | "Am I overcommitted?" | complex | cloud |
| Mutations | "Move everything Thursday to Friday." | complex | cloud |
| Protocol actions | "Start a sleep protocol." | complex | cloud |
| Unknown / out of scope | "How much did I spend on groceries?" | none | none — Rule 7 |

**Search is the class to read twice.** `04-ai/retrieval-layer.md` says
semantic search runs on-device *"where possible"* and leaves the device
*"only if a query requires cloud models"*. So a search query is priced as
simple and local and may still be the one that reaches the cloud; the cost
table carries its own row for that reason.

### Offline

Tier 3 is the only surface in the app whose behaviour depends on a
connection, so its offline behaviour is stated here rather than inferred
from `06-flows/retrieval.md`'s per-surface table:

- **Answers about current state and history** work — they are reads over
the local log.
- **Search** falls back to keyword, with the retrieval flow's note.
- **Reasoning and mutations** cannot run. The palette says so and offers
  the query again later; a mutation never half-applies.
- **A clarification** is produced locally and still works, so a user can
  resolve an ambiguity offline and be told the answer has to wait.

### The conversation model

Tier 3 does not maintain conversation history across invocations.
Each invocation is stateless, except:

- A clarification and its response are one invocation.
- The palette's last query is remembered for the session.

This is deliberate. A stateless assistant is easier to reason
about and cannot develop context drift.

### Voice

Voice input to Tier 3 is push-to-talk STT (see
`07-infrastructure/stack.md`). The transcribed text enters the
palette exactly like typed text. No difference in behavior.

### Costs and metering

Tier 3 has two priced modes — simple and complex — and the query-class
table above says which class is which. Research (via Tier 3) is metered
separately.

`07-infrastructure/cost-model.md` is the authority for quotas, unit costs,
and the behavior at the limit. **This doc does not restate numbers.**

At the limit, the fallback is stated by the cost model: complex queries
fall back to simple mode with a notice. A simple query that cannot run
offline follows §Offline instead.

### Fallbacks

If Tier 3 cannot complete:

- **Timeout** (>10s): "This is taking longer than expected. Try a
  more specific query?"
- **Budget exceeded**: "This query is too large. Try narrowing
  it."
- **Model unavailable** (offline, no cloud): "The assistant needs
  a connection. Try a command instead." Commands still work
  offline.

### What Tier 3 cannot do

- Cross-user queries ("what is Sarah working on").
- External queries beyond research ("what's the news today").
- Anything requiring new structure (Rule 6).
- Anything requiring a state change without consent (Rule 1).
- Anything requiring the assistant to guess (Rule 7).

## Examples

**A state query.**

    User: "What's on my calendar tomorrow?"

    Tools: now(), query_events({ day: '2026-09-23' }).

    Answer:
      "Tomorrow (Wednesday, Sep 23):
       - 9:00–9:30 Standup
       - 11:00–12:00 Design review with Sarah
       - 3:00–3:30 1:1 with Mark
       All times America/New_York. Calendar fresh as of 2 min ago."

**A reasoning query.**

    User: "Am I overcommitted this week?"

    Tools: now(), query_events({ start: Monday, end: Sunday }),
           query_tasks({ scope: 'open', due_before: Sunday }),
           query_compliance({ window: this week }).

    Answer:
      "This week: 14 events (about 11 hours), 8 open tasks with
       deadlines, and 3 habits due daily.

       Compared to your typical week: 40% more events, same task
       load. Your calendar is dense Tuesday–Thursday. Friday is
       light.

       You might be overcommitted on Wednesday: 4 events plus
       3 tasks due. Consider deferring one of the tasks."

**A mutation.**

    User: "Move everything Thursday to Friday."

    Tools: query_events({ day: '2026-09-24' }),
           query_tasks({ due_before: '2026-09-25',
                         due_after: '2026-09-24' }).

    Proposals:
      { summary: "Move 4 items from Thursday to Friday",
        proposals: [
          { target: 'task:T2', operation: 'reschedule',
            payload: { due: '2026-09-26T17:00:00Z' },
            explanation: "T2 was due Thursday." },
          { target: 'event:E1', operation: 'reschedule',
            payload: { start: '2026-09-26T09:00:00Z',
                       end: '2026-09-26T09:30:00Z' },
            explanation: "Standup moves to Friday." },
          ...
        ] }

    User taps "Apply." All four apply. Undo reverses all.

**A clarification.**

    User: "Reschedule the meeting."

    Tools: now(), query_events({ day: today }).

    Clarification:
      { type: 'clarification',
        question: "Which meeting?",
        options: ["Design review (11:00)", "1:1 with Mark (3:00)"] }

    User picks "Design review." Tier 3 continues.

**An out-of-scope query.**

    User: "How much did I spend on groceries?"

    Tools: semantic_search({ query: "grocery spending" }),
           query_tasks({ text: "groceries" }).

    Answer:
      "I don't have spending data. The app doesn't track finance.
       I found one task mentioning groceries ('buy groceries for
       the week,' due Sunday), but nothing about cost."

    Rule 7 (say "I don't know") and Rule 6 (never add structure)
    both apply.

## What this doc must NOT do

- This doc does not define the constitution. It references Rules
  1, 3, 6, and 7. The rules live in
  `04-ai/constitution.md`.
- This doc does not define the retrieval layer. It references
  tools. The retrieval layer lives in
  `04-ai/retrieval-layer.md`.
- This doc does not define research. It references the research
  tool. Research lives in
  `04-ai/research-and-protocols.md`.
- This doc does not define the command palette's UI. It defines
  the assistant behavior within it. The palette is in
  `06-flows/`.
- This doc does not define Tier 1 or Tier 2. They are separate
  docs.
- This doc does not define specific model selection or pricing.
  Those are implementation details.