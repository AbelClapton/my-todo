# Research and Protocols

## Purpose

This doc defines two related AI behaviors:

1. **Research** — the web-search-and-synthesize action used by
   Tier 2 ("Research this") and Tier 3.
2. **Protocols** — the AI-generated experimental protocols defined
   in the protocol entity, from proposal through review.

It exists because these are the app's two highest-value AI
features and the two most likely to produce harm if unbounded.
Research must cite and timestamp; protocols must respect evidence
and never modify themselves mid-experiment.

## Invariants

- Research results always carry `retrieved_at` and `source`
  (Invariant 4, `01-foundation/principles.md`).
- Research is metered per user (see
  `07-infrastructure/cost-model.md`).
- Health-adjacent research cites sources and labels evidence
  strength (Rule 5).
- A protocol's hypothesis, metric, and habit list are immutable
  during `baseline` and `active` status (Rule 3).
- Protocol proposals are always user-editable before adoption.
- Protocol reports are Notes attached to the protocol.
- AI never modifies an active protocol (Rule 3). Suggestions for
  the next version are separate proposals.

## Specification

### Part 1: Research

#### When research runs

- Tier 2: "Research this" on a task or event. User-initiated.
- Tier 3: queries containing "research," "find," "look up," or
  similar, when the answer requires external information.
- Never ambiently. Research never runs without a user action.

#### The research pipeline

1. **Query construction.** The AI derives a search query from the
   task or the user's input. If the task lacks constraints
   (budget, size, use case), the AI asks one clarifying question
   before searching (Rule 7).
2. **Search.** The `research` tool (see
   `04-ai/retrieval-layer.md`) runs a web search via a search API
   (Bing, Brave, SerpAPI, or a model with native web search). It
   does not scrape retailer pages.
3. **Fetch and read.** Up to 5 sources are fetched and read.
   Sources under 6 months old are preferred. Older sources are
   included but labeled.
4. **Synthesize.** The AI produces a synthesis: a short summary
   plus a list of results with structured fields (`name`,
   `price`, `retailer`, `url`, `why_it_matches` for shopping;
   `claim`, `source`, `strength` for informational).
5. **Timestamp.** Every result gets `retrieved_at` (now) and
   `source` (the URL).
6. **Wrap.** The synthesis becomes a note proposal.
7. **Present.** The user reviews. Tapping "Add as note" attaches
   the note to the source item.

#### The note format

Research notes follow a consistent structure:

    ## <Topic> (as of <date>)

    <One-paragraph synthesis.>

    ### Options
    1. **<Name>** — <price, if applicable> — [link]
       <Why this one.>
    2. ...

    ### Sources
    - <Title> — [link] — retrieved <date>
    - ...

    *Prices as of <date>. Refresh for current.*

For informational research (not shopping), the structure is:

    ## <Topic> (as of <date>)

    <Synthesis.>

    ### Key points
    - <Point> (<source>, <evidence strength>)
    - ...

    ### Sources
    - ...

#### Evidence labeling (Rule 5)

For health-adjacent research:

- Each claim is labeled: `established`, `emerging`, or
  `anecdotal`.
- `established`: supported by systematic reviews or
  meta-analyses.
- `emerging`: supported by some studies, not yet consensus.
- `anecdotal`: reported in individual accounts or low-quality
  studies.
- The note ends with: "This is not medical advice. Consult a
  professional for anything clinical."
- Claims that are `anecdotal` are not used as the basis for a
  protocol proposal.

#### Refresh

- Research notes have a TTL (see
  `02-architecture/data-lifecycle.md`).
- When the note is > 30 days old and the task is still open, the
  task detail shows a "Refresh research" action.
- Refresh runs the pipeline again and appends a new note (or
  updates the existing one, if the user chooses).

#### Metering

- Research costs 50 units per call. `07-infrastructure/cost-model.md`
  is the authority for quotas and unit costs.
- Users have a monthly quota (see
  `07-infrastructure/cost-model.md`).
- When quota is exhausted, "Research this" shows: "Monthly
  research limit reached. Resets on <date>."
- Quota is visible in settings.

### Part 2: Protocols

#### The protocol lifecycle

    proposed → baseline → active → completed
       │           │          │
       └───────────┴──────────┴──→ abandoned

- **proposed.** AI (or user) generates a protocol. Editable.
- **baseline.** Adopted. Metric is logged. Habits are not yet
  enforced.
- **active.** Baseline complete. Habits and metric are active.
- **completed.** Duration reached. Report generated.
- **abandoned.** User stops early. Report may still be generated.

Abandonment can happen from any non-terminal status (`proposed`,
`baseline`, or `active`). The examples below show it from `active`,
which is the most common case.

Transitions are log entries (`protocol.adopted`,
`protocol.activated`, `protocol.completed`,
`protocol.abandoned`).

#### Proposal

Protocols are proposed by Tier 3 in response to user intent:

- "Help me improve my sleep."
- "I want to focus better."
- "Start a protocol for reading more."

Or by Tier 2 on a Goal: "Propose a protocol" from a goal's detail.

The proposal includes:

- A hypothesis (one sentence).
- 2–4 habits, each with a name, cadence, and minimum-viable
  version.
- A metric with a name and scale.
- A baseline period (default 14 days).
- A duration (default 28 days).
- An explanation citing sources (Rule 5).

The proposal is a `protocol.proposed` log entry. It is *not*
adopted until the user taps "Adopt."

#### Editing before adoption

While `status: 'proposed'`, the user can edit anything:

- Remove a habit.
- Add a habit.
- Change a cadence.
- Change the metric.
- Change the durations.

Editing a proposed protocol logs `protocol.edited`. The original
proposal is preserved in the log.

#### Baseline

When adopted:

- `status` becomes `baseline`.
- The app creates the habits (as `habit.created` entries with
  `protocol_id` set), but they do not surface in the daily
  obligations card yet.
- The metric surfaces daily in the daily obligations card.
- Habits are *visible* but not *enforced*. The user sees them
  and can check them, but compliance is not scored.

Baseline exists because a protocol without a baseline cannot
measure change. It is the control condition. Skipping it
invalidates the result.

#### Active

When baseline ends:

- `status` becomes `active`.
- Habits now score compliance.
- The metric continues to be logged.

#### Immutability during baseline and active

Rule 3 applies: the hypothesis, metric, and habit list are
immutable during `baseline` and `active`.

What is not allowed during these phases:

- Changing the metric name or scale.
- Adding or removing habits.
- Changing a habit's cadence.

What *is* allowed:

- Logging the metric.
- Checking or skipping habits.
- Adding notes attached to the protocol.
- Adding unrelated habits (not part of this protocol).

If the user wants to change a protocol mid-flight, they must
complete or abandon it and start a new one. The app surfaces this
gently: "To change the metric, complete this protocol first.
You're 12 days in."

#### Review and report

At the review date:

- `status` becomes `completed` (or the user extends, which
  creates a new protocol version).
- Tier 2 generates a report (via the "Generate report" action on
  the protocol).
- The report is a Note attached to the protocol.

The report structure:

    ## <Protocol hypothesis> — Report

    **Duration:** <baseline days> baseline + <active days> active
    **Metric:** <metric name> (<scale>)
    **Baseline mean:** <value>
    **Active mean:** <value>
    **Delta:** <value> (<percent change>)

    ### Habit compliance
    - <Habit 1>: <full>/<scheduled> full, <minimum>/<scheduled>
      minimum, <repair> repair, <skipped> skipped,
      <missed> missed
    - ...

    ### Interpretation
    <Two paragraphs. What the data shows. What it does not show.
    Caveats: confounds, multiple variables, seasonality.>

    ### Suggested next steps
    - <Option 1: continue>
    - <Option 2: test one variable next>
    - <Option 3: stop>

    <If health-adjacent: "This is not medical advice.">

#### The honesty requirement

The report must state explicitly that:

- A multi-habit protocol cannot isolate which habit caused the
  effect.
- Correlation is not causation.
- Life events (stress, season, travel) may confound.
- A null result is a valid result.

This is Rule 5 in practice. The AI is instructed to prefer
honest uncertainty over confident narrative.

#### Suggested next steps

The report proposes options, never decisions:

- **Continue.** If compliance was high and the delta was
  positive.
- **Test one variable.** If the delta was positive but unclear
  which habit mattered. The next protocol tests one habit at a
  time.
- **Stop.** If compliance was low or the delta was negative. Not
  framed as failure.

The user picks. The next protocol (if any) is a new proposal.

#### Abandonment

At any point, the user can abandon:

- `protocol.abandoned` is logged.
- A report is generated if there is enough data.
- The report is framed neutrally: "You stopped after 14 days.
  Here's what the data showed before that."
- Abandonment is not failure. Rule 4 (explainable) and the
  identity sentence ("small experiments") both support a culture
  where stopping is a valid outcome.

#### Research within protocols

When Tier 3 proposes a protocol, it may run research internally to
inform the proposal. This is metered the same as user-initiated
research.

Research used for a protocol proposal is:

- Limited to well-established interventions (Rule 5).
- Cited in the proposal's explanation.
- Not used to propose anything `anecdotal`.

For sleep, this means the AI proposes things like: consistent
wake time, light exposure in the morning, caffeine cutoff, screen
curfew. These are boring, evidence-backed, and they work. The AI
does not propose supplements, blue-light glasses, or anything
marketed as a biohack.

## Examples

**A sleep protocol proposal.**

    User (in command palette): "Help me improve my sleep."

    Tier 3 runs research internally.

    Proposal:
      {
        goal: <Improve sleep, or proposes a new goal if none>,
        hypothesis: "Consistent wake time, morning light, and no
                     screens after 10pm will improve sleep
                     quality.",
        habits: [
          { name: "Same wake time", cadence: "daily",
            minimum_viable: "within 30 min of target" },
          { name: "Morning light within 30 min of waking",
            cadence: "daily",
            minimum_viable: "5 minutes outside" },
          { name: "No screens after 10pm", cadence: "daily",
            minimum_viable: "phone in another room" }
        ],
        metric: { name: "Sleep quality", scale: [1, 5] },
        baseline_days: 14,
        duration_days: 28,
        source: 'ai',
        explanation: "Based on 3 sources: consistent wake time is
                      the strongest single predictor of sleep
                      quality in the literature (established).
                      Morning light supports circadian entrainment
                      (established). Screen curfew reduces sleep
                      latency (emerging)."
      }

    User edits: removes "Morning light." Adds "Read before bed"
    with a minimum of "1 page."

    User taps "Adopt." Protocol enters baseline.

**The report at review.**

    After 14 baseline + 28 active days:

    Report note (attached to the protocol):

      "## Sleep protocol — Report

      **Duration:** 14 baseline + 28 active
      **Metric:** Sleep quality (1–5)
      **Baseline mean:** 2.8
      **Active mean:** 3.9
      **Delta:** +1.1 (+39%)

      ### Habit compliance
      - Same wake time: 24/28 full, 3/28 minimum, 0 repair,
        1 skipped, 0 missed
      - Read before bed: 18/28 full, 6/28 minimum, 0 repair,
        0 skipped, 4 missed

      ### Interpretation
      Sleep quality improved by about 1 point on your 5-point
      scale, sustained across the 28 days. Compliance was high
      for both habits, so we can't tell from this protocol which
      one mattered more.

      The change is large enough to be meaningful, but note that
      we can't rule out seasonal effects or the placebo of
      paying attention to sleep.

      ### Suggested next steps
      - **Continue** with both habits if they feel sustainable.
      - **Test one variable** next: run a 14-day protocol with
        just "same wake time" to see if it alone holds the effect.
      - **Stop** if you'd rather not continue; the data is
        already useful.

      This is not medical advice."

    User picks "Test one variable." A new protocol proposal is
    generated for wake time only.

**A research query that asks for clarification.**

    User long-presses task "Buy a desk." Taps "Research this."

    Tier 2 asks: "Any constraints? (budget, standing vs.
    sit-stand, room size)"

    User: "Under $500, sit-stand, small apartment."

    Tier 2 runs research. Proposal with 4 options.

**An abandoned protocol.**

    User abandons a reading protocol after 14 days.

    `protocol.abandoned` is logged.

    Report is generated:
      "## Reading protocol — Report

      **Duration:** 14 baseline + 10 active (abandoned)

      You stopped after 10 active days. Here's what the data
      showed before that.

      **Baseline mean:** 3.2
      **Active mean:** 3.4
      **Delta:** +0.2

      Compliance was 7/10. The change is small and the window
      is short; not enough to draw a conclusion.

      Stopping is a valid result. You ruled out one direction.
      If you want to try again later, the same protocol can be
      restarted."

## What this doc must NOT do

- This doc does not define the constitution. It references Rules
  3, 4, 5, and 7. The rules live in `04-ai/constitution.md`.
- This doc does not define the protocol entity. It defines the
  AI's role in proposing, reporting on, and reviewing it. The
  entity lives in `02-architecture/object-model.md`.
- This doc does not define the research tool's interface. It
  defines the pipeline. The tool interface is in
  `04-ai/retrieval-layer.md`.
- This doc does not define the protocol's UI. It defines the AI's
  behavior. UI lives in `05-modules/protocols.md` and
  `06-flows/`.
- This doc does not define specific evidence for specific health
  claims. It defines the labeling requirement. The actual claims
  are produced at runtime.
- This doc does not define metering implementation. It defines
  that research is metered. Metering lives in
  `07-infrastructure/cost-model.md`.