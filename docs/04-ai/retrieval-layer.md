# Retrieval Layer

## Purpose

This doc defines how the AI gets context. It exists because the
naive approach — stuffing everything relevant into the prompt — does
not scale. As the app accumulates tasks, events, notes, protocols,
and history, the context dump becomes expensive, slow, and worse: the
model's output degrades as context grows. Retrieval solves this by
letting the AI ask for what it needs.

The AI receives tools, not a context dump. It calls the tools it
needs. The retrieval layer executes those calls against the local
log and returns results.

## Invariants

- The AI never receives a context dump. It receives a minimal
  context (`{ currentMode, focusedItem }`) and a set of tools.
- Every tool call is logged to the client-side diagnostics buffer
  (see **Logging** below). Tool call telemetry never enters the
  event log.
- Every result includes freshness metadata (Invariant 4).
- Semantic search runs on-device where possible. Only if a query
  requires cloud models does it leave the device.
- The retrieval layer never modifies state. It is read-only.
- Tool results are bounded. No tool returns an unbounded list.

**One open question, deliberately not an invariant until it is
settled: semantic search's offline behaviour.** If the index is
local, being offline does not stop it, and `06-flows/retrieval.md`'s
keyword fallback is unreachable. If the embedding model needs a
first-run download, the trigger is *"the index is not built yet"*
rather than *"the user is offline"*, and the note shown to the user
should say that instead. **The fallback cannot key on network state
while the invariant above says the query never leaves the device** —
the two sentences are both true only if one of them is reworded. This
doc owns the answer and `06-flows/retrieval.md` reports the note.

## Specification

### The tools

The AI has access to these tools. Each is a function it can call.

**`query_events(params)`**

Returns events matching the params.

    params: {
      start?: ISO-8601,
      end?: ISO-8601,
      day?: DateString,
      person_id?: ULID,
      text?: string,        // substring match on title
      limit?: number        // default 20, max 100
    }
    returns: Event[]

**`query_tasks(params)`**

Returns tasks matching the params.

    params: {
      scope?: 'open' | 'today' | 'next' | 'someday' | 'all',
      area_id?: ULID,
      person_id?: ULID,
      due_before?: ISO-8601,
      due_after?: ISO-8601,
      defer_before?: ISO-8601,
      state?: 'open' | 'completed' | 'someday' | 'archived',
      text?: string,
      limit?: number        // default 20, max 100
    }
    returns: Task[]

**`query_notes(params)`**

Returns notes matching the params.

    params: {
      attached_to?: { type: string, id: ULID },
      text?: string,
      since?: ISO-8601,
      until?: ISO-8601,
      limit?: number        // default 10, max 50
    }
    returns: Note[]

**`query_habits(params)`**

Returns habits matching the params.

    params: {
      protocol_id?: ULID,
      area_id?: ULID,
      state?: 'active' | 'archived',
      limit?: number        // default 20, max 100
    }
    returns: Habit[]

**`query_compliance(params)`**

Returns compliance data for a habit or protocol over a window.

    params: {
      habit_id?: ULID,
      protocol_id?: ULID,
      window: { start: DateString, end: DateString }
    }
    returns: {
      habit_id: ULID,
      full: number,
      minimum: number,
      repair: number,
      skipped: number,
      missed: number,
      scheduled: number,
      daily: Array<{ day: DateString, state: string }>
    }

**`query_protocol(params)`**

Returns a protocol with its current state.

    params: { protocol_id: ULID }
    returns: Protocol & {
      current_status: string,
      baseline_ends_at?: ISO-8601,
      review_at?: ISO-8601
    }

**`query_person(params)`**

Returns a person with links.

    params: { person_id: ULID }
    returns: Person & {
      recent_events: EventId[],
      recent_tasks: TaskId[],
      recent_notes: NoteId[]
    }

**`query_graph(params)`**

Traverses the canonical edges. This is the general-purpose graph
query.

    params: {
      from: { type: string, id: ULID },
      edge: string,         // must be one of the eleven canonical edges
      direction: 'out' | 'in',
      limit?: number        // default 20, max 50
    }
    returns: Array<{ type: string, id: ULID, summary: string }>

**`semantic_search(params)`**

Vector search over notes, tasks, and events. This is the **only** tool
that returns a reason string (`why`), which is why
`06-flows/retrieval.md`'s "why this matched" invariant is scoped to
semantic results rather than to all results. `score` is returned for
diagnostics and is not displayed: nothing on screen branches on it
(`06-flows/retrieval.md` fixes the line's shape at `matched: <what>`).

    params: {
      query: string,
      scope?: Array<'note' | 'task' | 'event'>,
      limit?: number        // default 10, max 30
    }
    returns: Array<{
      type: string,
      id: ULID,
      snippet: string,
      score: number,
      why: string           // one-line explanation of the match
      score: number         // diagnostic; not shown in the UI
    }>

**`research(params)`**

Runs a web search and synthesizes the results into a note proposal.
Cloud-only, metered per user (`07-infrastructure/cost-model.md`).
User-initiated only: never ambient. The full pipeline, note format,
and evidence labeling live in `04-ai/research-and-protocols.md`.

**`now()`**

Returns the current time and the user's current context.

    params: {}
    returns: {
      now: ISO-8601,
      day: DateString,
      current_event?: EventId,
      next_event?: EventId,
      timezone: string
    }

**`freshness_of(params)`**

Returns freshness metadata for a set of items.

    params: { ids: ULID[] }
    returns: Array<{
      id: ULID,
      source: string,
      retrieved_at: ISO-8601,
      fresh: boolean
    }>

### The minimal context

Every AI call includes a minimal context payload, before any tool
call:

    {
      currentMode: 'calendar' | 'tasks' | 'habits' | 'notes',
      focusedItem: { type: string, id: ULID } | null,
      locale: string,
      timezone: string,
      now: ISO-8601
    }

That's it. Everything else is retrieved via tools.

### The retrieval loop

The assistant runs a bounded loop:

1. Receive the user's query, the minimal context, and the tool
   list.
2. The model calls zero or more tools.
3. The retrieval layer executes each tool against the local log.
4. Results are returned to the model.
5. The model either calls more tools or produces a final response.
6. Maximum of 5 tool-call rounds. If the model exceeds this, the
   call is terminated and returns a "couldn't complete" response.

This bounds cost and latency. Most queries complete in 1–2 rounds.

### Routing: on-device vs. cloud

The retrieval layer decides where each operation runs.

**On-device (local models):**
- Tier 1 parsing.
- Semantic search (embeddings + local vector search).
- Freshness lookups.
- Simple graph queries.

**Cloud (larger models):**
- Tier 3 assistant queries that require reasoning across many
  items.
- Research (web search + synthesis).
- Protocol report generation.
- Weekly review generation.

The decision is based on the task, not the tier. Tier 3 can run
locally for simple queries and in the cloud for complex ones.

### Cost model per tool

Every tool has a cost estimate. The retrieval layer tracks the
cumulative cost of a call and aborts if it exceeds a budget.

| Tool | Cost |
|---|---|
| `query_events`, `query_tasks`, `query_notes`, `query_habits` | negligible |
| `query_compliance`, `query_protocol`, `query_person` | low |
| `query_graph` | low |
| `semantic_search` | medium (local) / high (cloud) |
| `now`, `freshness_of` | negligible |
| Web search (via `research` tool, see below) | high |

Cost budgets per call:
- Tier 2: 1 unit.
- Tier 3 simple: 3 units.
- Tier 3 complex: 10 units.
- Research: 50 units (metered separately).

If a call exceeds its budget, it terminates with a partial answer
and a note that it was truncated.

### The `research` tool

Research is special: it hits the web, which is external. It is
defined in `04-ai/research-and-protocols.md`, but it is called via
the same mechanism.

    params: {
      query: string,
      constraints?: object,
      max_sources?: number
    }
    returns: {
      query: string,
      retrieved_at: ISO-8601,
      sources: Array<{
        title: string,
        url: string,
        retrieved_at: ISO-8601,
        snippet: string
      }>,
      synthesis: string
    }

Research is metered per user (see `07-infrastructure/cost-model.md`).

### Logging

Tool calls are logged to a **client-side diagnostics buffer**, not
the event log. They are operational telemetry, not domain events.

    {
      call_id: ULID,
      tier: 1 | 2 | 3,
      tool: string,
      params_summary: string,     // not the full params
      result_summary: string,     // not the full result
      duration_ms: number,
      cost_units: number,
      timestamp: ISO-8601
    }

The buffer is bounded (last 500 entries) and is available in
Developer Mode (Settings → Advanced). It is not synced, not shown
to the user, and not retained longer than 30 days.

The `ai.tool_called` event type in `02-architecture/event-log.md`
is removed. Tool call telemetry never enters the event log.

### Freshness in results

Every result that includes externally-sourced data includes
`retrieved_at` and `source`. The retrieval layer adds these; the
model does not have to ask. Rule 4 (always explainable) and
Invariant 4 (freshness) require the model to respect this when
composing a response. Rule 5 applies only to health-adjacent
claims.

## Examples

**A simple Tier 3 query.**

    User: "What's on my calendar tomorrow?"

    Context: { currentMode: "calendar", focusedItem: null,
               timezone: "America/New_York", now: "..." }

    Model calls:
      now()
      query_events({ day: "2026-09-23" })

    Results returned. Model composes:
      "Tomorrow (Wednesday, Sep 23): 3 events.
       - 9:00–9:30 Standup
       - 11:00–12:00 Design review with Sarah
       - 3:00–3:30 1:1 with Mark
       All times are America/New_York. Calendar is fresh as of
       2 minutes ago."

    Two tool calls, one round, ~150ms total.

**A query requiring graph traversal.**

    User: "Who haven't I talked to in a while?"

    Model calls:
      now()
      query_person({ person_id: ... })  // for each person in scope
      query_graph({ from: { type: "person", id: P1 },
                    edge: "Event → Person", direction: "in" })

    Model finds people whose most recent event is > 30 days old.
    Composes a list with days since last contact.

    Four to six tool calls, two rounds.

**A query requiring semantic search.**

    User: "What did I write about the kitchen renovation?"

    Model calls:
      semantic_search({ query: "kitchen renovation", limit: 10 })

    Returns 4 notes, 1 task, 2 events. Model composes a synthesis
    with citations to the notes.

    Two tool calls, one round.

**A query the model cannot answer.**

    User: "How much did I spend on groceries last month?"

    Model calls:
      query_tasks({ text: "groceries" })
      semantic_search({ query: "grocery spending" })

    No relevant data. Model responds:
      "I don't have any spending data. The app doesn't track
       finance. If you want to track grocery spending, you could
       add a habit with a daily metric, but that's a manual
       process."

    Rule 7 (say "I don't know") applies. The model does not guess.
    Rule 6 (never add structure) prevents it from inventing a
    finance module.

## What this doc must NOT do

- This doc does not define the constitution. It references the
  eight rules. The constitution lives in
  `04-ai/constitution.md`.
- This doc does not define individual tiers' behavior. It defines
  the retrieval mechanism all tiers use. Tiers live in
  `04-ai/tier-*.md`.
- This doc does not define the event log. It defines queries over
  it. The log lives in `02-architecture/event-log.md`.
- This doc does not define embeddings, vector stores, or model
  selection. Those are implementation details.
- This doc does not define cost accounting. It defines per-tool
  cost estimates. Metering lives in
  `07-infrastructure/cost-model.md`.
- This doc does not define the research tool's behavior. It
  defines its interface. Behavior lives in
  `04-ai/research-and-protocols.md`.