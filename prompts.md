# Build Prompts

## Purpose

This file turns the doc set into a sequence of executable prompts.
Each step is self-contained: the docs to attach, the prompt to paste,
what to verify, and what to commit.

Work the steps in order. Do not skip. Each step assumes the previous
one is complete and verified.

## How to use this file

For each step:

1. Open the docs listed in **Attach** and have them ready to paste
   into the AI's context.
2. Paste the prompt exactly as written.
3. When the AI returns code, **read every line** before accepting.
   The AI will occasionally invent structure not in the docs. Reject
   it.
4. Run the **Verify** criteria. Do not proceed until all pass.
5. Commit with the suggested message (or close to it).

## The reusable preamble

Every prompt in this file assumes the AI has this context. If your
tool does not persist it across conversations, prepend this to every
prompt:

    You are implementing an app from a complete specification. The
    spec lives in /docs. You will be given the relevant docs with
    each task.

    Rules that apply to every task:

    1. Follow the docs exactly. Do not invent structure, entities,
       event types, fields, or edges that are not in the docs.
    2. If a doc says "do not," do not.
    3. TypeScript strict. No `any`. No non-null assertions outside
       tests.
    4. Every external input is validated with Zod.
    5. Every projection has `compute` and `apply`; they must agree.
    6. Every log entry has a Zod schema and a TypeScript type.
    7. Tailwind arbitrary values are prohibited. Use only tokens.
    8. Tests are required for new behavior.
    9. No default exports except where a framework requires them.
    10. No classes. Functions and data only.
    11. When you are unsure, ask. Do not guess.

    Before writing code, output the file tree you will create and
    a one-line summary of what each file does. Wait for approval
    if the task is large.

---

## Phase 0 — Foundation

### Step 0.1 — Repository setup

**Attach:** `07-infrastructure/stack.md`, `10-engineering/code-conventions.md`, `10-engineering/quality-standards.md`

**Prompt:**

    Set up the repository for this app.

    Stack (from stack.md):
    - TanStack Start (Vite-based)
    - TypeScript with the strictness flags in code-conventions.md
    - Tailwind CSS
    - Drizzle ORM + SQLite/WASM (via @sqlite.org/sqlite-wasm or
      better-sqlite3 for Node during dev)
    - Vitest for unit tests
    - Playwright for e2e and visual tests
    - ESLint with eslint-plugin-tailwindcss configured with
      no-arbitrary-value
    - Prettier
    - pnpm as the package manager

    Output:
    1. The full file tree to create.
    2. The contents of: package.json, tsconfig.json,
       tailwind.config.ts, .eslintrc, .prettierrc, vite.config.ts,
       playwright.config.ts, vitest.config.ts.
    3. The commands to run after files are created (install,
       dev, test).

    Do not add dependencies not in stack.md. Do not invent config
    options. The Tailwind config must disable arbitrary values —
    the linter must fail on p-[13px] and similar.

**Verify:**

- [ ] `pnpm install` succeeds.
- [ ] `pnpm dev` starts the app.
- [ ] `pnpm lint` runs and would fail on an arbitrary Tailwind value (test this by adding one temporarily).
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` runs (zero tests is fine).
- [ ] `pnpm test:e2e` runs.

**Commit:** `chore: initialize repository with stack from docs`

---

### Step 0.2 — Design tokens

**Attach:** `03-experience/design-tokens.md`, `10-engineering/code-conventions.md`

**Prompt:**

    Implement the design tokens from design-tokens.md.

    Output:
    1. `src/ui/tokens.ts` — exports all tokens as a typed object.
       Semantic names only (`space-4`, `text-primary`). No raw hex
       or px values outside this file.
    2. `tailwind.config.ts` — maps the tokens into Tailwind's
       theme. Every token from the doc is available as a Tailwind
       utility (p-space-4, text-text-primary, etc.).
    3. A short README in `src/ui/` explaining how to use tokens and
       why arbitrary values are prohibited.

    The Tailwind config must make it impossible to use arbitrary
    values: the linter rule no-arbitrary-value must fail the build.

    Do not invent tokens. Every token comes from the doc.

**Verify:**

- [ ] All tokens from design-tokens.md exist in `tokens.ts`.
- [ ] Tailwind classes like `p-space-5`, `text-title-1`, `bg-accent-default`, `rounded-md`, `elevation-1` all work.
- [ ] `p-[13px]` fails the linter.
- [ ] Dark mode is wired (same token names, different values).

**Commit:** `feat(ui): add design tokens and tailwind config`

---

### Step 0.3 — Event log schema and types

**Attach:** `02-architecture/event-log.md`, `10-engineering/code-conventions.md`, `10-engineering/testing.md`

**Prompt:**

    Implement the event log.

    Output:
    1. `drizzle/schema.ts` — the `log_entries` table with the shape
       from event-log.md. Include an index on `(timestamp,
       device_id, seq)` and on `type`.
    2. `src/domain/events/` — one file per event type, each
       exporting a Zod schema and a TypeScript type. There are
       roughly 80 event types across the 11 log domains (task,
       calendar, habit, note, area, goal, protocol, person, day, ai,
       system). `attention` is not a domain.
    3. `src/domain/events/index.ts` — the `LogEntry` discriminated
       union and the `Actor` type.
    4. `src/domain/events/log.ts` — the `append(entry)` function
       that writes to the log. It generates a ULID, sets
       `timestamp` to now, and returns the appended entry.
    5. Tests for every schema (valid input passes, invalid input
       fails).

    Follow code-conventions.md for naming and file structure.
    Follow event-log.md exactly for the type list and payload
    shapes. Do not invent event types.

**Verify:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes (all schema tests).
- [ ] Every event type in event-log.md has a schema and a type.
- [ ] `append()` writes a row and returns the entry.
- [ ] No event type is missing a test.

**Commit:** `feat(domain): add event log schema, types, and tests`

---

### Step 0.3b — Doc lint

**Attach:** none.

**Prompt:** none. Run manually.

**Command:** `pnpm tsx scripts/check-docs.ts`

**Verify:**

- [ ] The script exits 0 with "No issues."

**Commit:** `chore(docs): pass doc lint`

---

### Step 0.4 — Object model types

**Attach:** `02-architecture/object-model.md`, `10-engineering/code-conventions.md`

**Prompt:**

    Implement the object model types.

    Output:
    1. `src/domain/atoms/` — Event, Task, Note, Habit types.
    2. `src/domain/layers/` — Area, Goal, Protocol, Person types.
    3. `src/domain/edges/` — the eleven canonical edge types as
       string literals and typed constructors.
    4. `src/domain/day.ts` — the Day projection shape.
    5. A `materialize.ts` for each atom that constructs an atom
       from its `*.created` event payload.

    All types are `readonly`. Use `type`, not `interface`. Use
    discriminated unions where the doc has state variants.

    Follow object-model.md exactly. Do not add fields.

**Verify:**

- [ ] Every atom and layer from object-model.md exists.
- [ ] All eleven edges are typed.
- [ ] No extra fields beyond the doc.
- [ ] `pnpm typecheck` passes.

**Commit:** `feat(domain): add object model types`

---

### Step 0.5 — Projection framework and task projections

**Attach:** `02-architecture/projections.md`, `02-architecture/event-log.md`, `10-engineering/testing.md`, `10-engineering/code-conventions.md`

**Prompt:**

    Implement the projection framework and the task projections.

    Output:
    1. `src/projections/framework.ts` — the types and helpers for
       `compute<X>` and `apply<X>`. A projection is a pure
       function. `compute` folds the full log; `apply` is the
       incremental reducer. They must agree.
    2. `src/projections/task-list.ts` — `computeTaskList(log,
       params)` and `applyTaskList(state, entry)`. Handles the
       scopes: today, next, someday, all.
    3. `src/projections/task-detail.ts` — same pattern for a single
       task.
    4. `src/projections/__fixtures__/` — JSON fixtures:
       `task-lifecycle.json`, `empty.json`.
    5. `src/projections/task-list.test.ts` — the compute/apply
       agreement test against every fixture, plus scope-specific
       tests.

    Projections are pure. No `Date.now()`. If a projection needs
    the current time, it takes it as a parameter. No I/O. No
    side effects.

    Follow projections.md for the invalidation mapping and the
    incremental contract.

**Verify:**

- [ ] `computeTaskList(log)` equals `log.reduce(applyTaskList, empty())` for every fixture.
- [ ] The scope filter works for all four scopes.
- [ ] Deferred tasks are hidden until their defer date.
- [ ] Empty log returns empty list.
- [ ] No `Date.now()` or `Math.random()` in projection code.

**Commit:** `feat(projections): add framework and task projections`

---

### Step 0.6 — Tasks mode

**Attach:** `05-modules/tasks.md`, `03-experience/gesture-vocabulary.md`, `03-experience/motion-vocabulary.md`, `03-experience/haptic-vocabulary.md`, `03-experience/design-tokens.md`, `06-flows/completion.md`

**Prompt:**

    Implement the Tasks mode.

    Screens:
    1. List view with four scopes (Today, Next, Someday, All) as a
       segmented control in the header.
    2. Task row (row-default or row-rich depending on metadata).
    3. Task detail.
    4. Defer sheet (bottom sheet, four options).
    5. Inline capture (typed only, no AI yet).

    Gestures:
    - Swipe right → complete. Completion animation + haptic +
      undo toast.
    - Swipe left → defer sheet.
    - Long-press → placeholder menu (Tier 2 not built yet).

    All visual values use tokens. All motion uses the motion
    vocabulary. All haptics use the haptic vocabulary.

    Follow tasks.md for the row layout, the defer sheet, and the
    scopes. Follow completion.md for the completion animation
    sequence.

**Verify:**

- [ ] Four scopes switch correctly.
- [ ] Swipe right completes with animation and haptic.
- [ ] Swipe left opens the defer sheet.
- [ ] The undo toast appears and works.
- [ ] Metadata line renders (area, due, defer, notes, people).
- [ ] All values are tokens; linter passes.

**Commit:** `feat(tasks): add tasks mode with list, detail, and completion`

---

### Step 0.7 — Onboarding

**Attach:** `06-flows/onboarding.md`

**Prompt:**

    Implement the onboarding flow.

    Seven screens:
    1. The premise (identity sentence, Get started, Just let me in).
    2. Areas (four preselected, plus a silently created Inbox).
    3. One habit from a curated list of eight, each with a preset
       cadence and minimum-viable.
    4. First task (raw capture; no Tier 1 yet).
    5. First win (complete the task; completion animation, haptic,
       undo toast).
    6. Optional calendar connection.
    7. Land on the Calendar day view.

    Skip is available at every step. Skipping lands on screen 7.
    Partial setup is preserved.

    Screen 4 has no Tier 1 parsing (that ships in Phase 3). It
    creates a task with the literal text.

    Follow onboarding.md exactly.

**Verify:**

- [ ] Fresh install shows screen 1.
- [ ] Each screen's action advances to the next.
- [ ] Skip jumps to screen 7.
- [ ] The Inbox Area exists after onboarding (whether skipped or not).
- [ ] The first task completes and shows the undo toast.

**Commit:** `feat(flows): add onboarding`

---

## Phase 1 — The Day

### Step 1.1 — Day projection and calendar

**Attach:** `02-architecture/day-as-unit.md`, `02-architecture/projections.md`, `05-modules/calendar.md`, `03-experience/design-tokens.md`, `03-experience/gesture-vocabulary.md`

**Prompt:**

    Implement the Day projection and the Calendar mode.

    Output:
    1. `src/projections/day-view.ts` — `computeDayView(log, { date })`
       and `applyDayView(state, entry)`.
    2. `src/projections/now-line.ts` — the now-line sources in
       priority order.
    3. Calendar mode: Day view (default), Week view, Month view.
    4. The Day view layout: header, now line, timeline, habits due,
       metric row, daily note preview, top three.
    5. Pinch to zoom between views.

    The timeline positions events and scheduled tasks by time.
    All-day items sit above the axis. Row heights follow
    design-tokens.md.

    Follow calendar.md for the layout and surfaces. Follow
    day-as-unit.md for the day attribution rules (local timezone,
    configurable boundary).

**Verify:**

- [ ] Day view renders a realistic day.
- [ ] Week view shows seven days side by side.
- [ ] Month view shows event density per day.
- [ ] Now line updates from the projection.
- [ ] Pinch zooms between views.
- [ ] Day attribution respects the 4am boundary (test with a task at 2am).

**Commit:** `feat(calendar): add day projection and calendar mode`

---

### Step 1.2 — Daily Note and in-app events

**Attach:** `05-modules/notes.md`, `05-modules/calendar.md`, `02-architecture/day-as-unit.md`

**Prompt:**

    Implement Daily Notes and in-app event creation.

    Output:
    1. Day rollover: at the configured boundary, close the outgoing
       day, open the incoming day, create the Daily Note.
    2. Daily Note rendering in the Notes list and in the Calendar's
       Day view (as a preview card).
    3. In-app event creation: a form with title, time, attendees,
       notes. Uses `calendar.created`.
    4. Event detail with edit.

    Follow notes.md for the Daily Note shape. Follow calendar.md
    for the event detail.

**Verify:**

- [ ] On first open after the boundary, a Daily Note is created.
- [ ] Daily Note appears in both Notes and Calendar.
- [ ] In-app events can be created and edited.
- [ ] Event detail shows attendees and notes.

**Commit:** `feat(calendar): add daily notes and in-app events`

---

### Step 1.3 — Morning plan

**Attach:** `06-flows/morning-plan.md`, `02-architecture/day-as-unit.md`

**Prompt:**

    Implement the morning plan flow.

    Three steps:
    1. What carried over — yesterday's unfinished tasks, with
       swipe gestures (keep, defer, drop).
    2. What's today — the day's events, read-only.
    3. Pick three — a picker of candidates.

    Commit logs `task.scheduled_to_day` for each kept task and
    `day.planned` with the top three. Day rollover (logging
    `day.opened`, creating the Daily Note) happens separately on the
    first app open after the boundary; the plan does not log it.

    Skip button dismisses and logs `day.plan_skipped`.

    Follow morning-plan.md exactly for the steps and the commit
    behavior. Do not add the draft-day proposal yet.

**Verify:**

- [ ] Plan surfaces on the first open of the day (test by resetting).
- [ ] Carryover shows yesterday's slippers.
- [ ] Pick three commits and schedules.
- [ ] Skip works and does not fire again that day.

**Commit:** `feat(flows): add morning plan`

---

### Step 1.4 — Shutdown and now line

**Attach:** `06-flows/shutdown.md`, `06-flows/doing-the-day.md`, `02-architecture/projections.md`

**Prompt:**

    Implement the shutdown flow and the persistent now line.

    Shutdown:
    1. Three prompts — what went well, what's unfinished, tomorrow's
       top three.
    2. Preview — tomorrow's events and top three.
    3. Commit logs `day.planned` (for tomorrow's top three),
       `day.closed` (for today), appends the "what went well" line
       to the Daily Note as a blockquote, and logs
       `task.scheduled_to_day` for each kept task.

    Now line:
    - Renders in the header of every mode.
    - Sources in priority order per doing-the-day.md.
    - Tapping opens the relevant surface.

    Follow shutdown.md and doing-the-day.md.

**Verify:**

- [ ] Shutdown runs through all three prompts.
- [ ] Commit logs correctly.
- [ ] Daily Note gets the "what went well" blockquote.
- [ ] Now line renders in every mode and updates from the projection.

**Commit:** `feat(flows): add shutdown and now line`

---

## Phase 2 — Habits and Notes

### Step 2.1 — Habits

**Attach:** `05-modules/habits.md`, `02-architecture/projections.md`

**Prompt:**

    Implement the Habits module.

    Output:
    1. `src/projections/habit-compliance.ts` — compliance per
       habit over a window.
    2. `src/projections/habit-streak.ts` — current and longest
       streak (display variant; compliance is canonical).
    3. Habits mode: Today, All, History scopes.
    4. Habit detail: name, cadence, minimum-viable, area, protocol
       (if any), compliance chart, history.
    5. Check interaction: tap = full, long-press = mini-menu
       (Full, Minimum, Skip).
    6. Compliance chart: 28-day strip with full / minimum / skip /
       missed colors.

    Follow habits.md exactly. Do not add streak celebrations or
    gamification beyond the 30-day Success haptic.

**Verify:**

- [ ] Cadence resolves to scheduled days for all three cadence types.
- [ ] Compliance computes correctly over a window.
- [ ] Minimum checks count as done.
- [ ] Skips are distinct from missed.
- [ ] The compliance chart renders correctly.

**Commit:** `feat(habits): add habits module with compliance and streaks`

---

### Step 2.2 — Notes

**Attach:** `05-modules/notes.md`, `02-architecture/object-model.md`

**Prompt:**

    Implement the Notes module.

    Output:
    1. Notes list: Recent, All, Daily scopes.
    2. Note editor: markdown, autosave on blur and every 5 seconds.
    3. Note attachment: edge 11 — attach to Task, Event, Habit,
       Protocol, Day, or Person.
    4. Note reattachment: `note.reattached`.
    5. Markdown rendering: headings, bold, italic, lists, links,
       block quotes, code, checkboxes. No tables, no images, no
       embeds.
    6. Auto-linking: Person names render as tappable links (display
       only, not canonical edges). Requires both conditions from
       notes.md: Title Case match, and the person appeared in a task,
       event, or note within the last 90 days.

    Follow notes.md exactly.

**Verify:**

- [ ] Notes can attach to all six targets.
- [ ] Autosave works.
- [ ] Reattachment works and is undoable.
- [ ] Markdown renders.
- [ ] Auto-linking works and can be disabled.

**Commit:** `feat(notes): add notes module with markdown and attachments`

---

### Step 2.3 — Capture flow

**Attach:** `06-flows/capture.md`, `03-experience/gesture-vocabulary.md`

**Prompt:**

    Implement the capture flow.

    Entry points:
    1. Pull-down on any scrollable list.
    2. Command palette (`Cmd+K` → "Capture: ...").
    3. Share sheet (register as a share target).
    4. Voice (placeholder; STT comes in Phase 3).

    For now, capture does not parse. Typed input becomes an inbox
    note. The pull-down field, the share sheet handler, and the
    command palette are all wired.

    The inbox sort ritual: when the inbox has > 10 items, the
    ritual opens. Swipe right = today, swipe left = someday,
    swipe up = attach, swipe down = delete.

    Follow capture.md for the pipeline and the sort ritual.

**Verify:**

- [ ] Pull-down works on every list.
- [ ] Share sheet registers (test from Safari).
- [ ] Inbox accumulates.
- [ ] Sort ritual works with all four gestures.

**Commit:** `feat(capture): add capture flow and inbox sort ritual`

---

### Step 2.4 — Attention budget

**Attach:** `03-experience/attention-budget.md`

**Prompt:**

    Implement the attention budget.

    Output:
    1. `src/attention/queue.ts` — a single ranked queue for all
       nudge-worthy surfaces.
    2. Priority scoring: urgency + relevance + novelty × history
       multiplier.
    3. Caps: one nudge per hour, three per day.
    4. Suppression: two dismissals = 30 days; three = permanent.
    5. Quiet hours (default 22:00–07:00).
    6. Focus mode suppression.
    7. In-event suppression.
    8. The daily obligations card: habit checkboxes + protocol
       metric, once per day, does not consume budget.

    The queue is the only path to a nudge. Nothing fires outside
    it.

    Follow attention-budget.md exactly.

**Verify:**

- [ ] No nudge can fire outside the queue.
- [ ] Caps are enforced.
- [ ] Dismissals suppress per the rules.
- [ ] Quiet hours and focus mode suppress.
- [ ] The daily obligations card surfaces once per day.

**Commit:** `feat(attention): add ranked queue and nudge caps`

---

## Phase 3 — On-Device AI

### Step 3.1 — AI constitution and Tier 1 parser

**Attach:** `04-ai/constitution.md`, `04-ai/tier-1-parsing.md`, `10-engineering/testing.md`

**Prompt:**

    Implement the AI constitution and the Tier 1 parser.

    Output:
    1. `src/ai/constitution.ts` — the eight rules as a verbatim
       string constant.
    2. `src/ai/tiers/tier-1.ts` — the parser.
       - Input: text (typed or transcribed).
       - Output: `{ items, unclear? }`.
       - Confidence thresholds: ≥0.85 apply silently; 0.60–0.84
         confirm; <0.60 fall back to unparsed note.
       - Runs on-device (WebGPU or WASM). No network.
    3. Wire Tier 1 into the capture flow.
    4. The "parsed" chip in the UI.
    5. Tests for high-confidence, mid-confidence, low-confidence.

    The on-device model choice is implementation. Use any small
    model that fits the latency budget (< 200ms). If you cannot
    run a model in this environment, structure the code so the
    model can be plugged in later and stub with a rules-based
    parser.

    Follow tier-1-parsing.md and constitution.md exactly.

**Verify:**

- [ ] High-confidence parses apply silently with a chip.
- [ ] Mid-confidence parses show a confirmation.
- [ ] Low-confidence falls back to unparsed.
- [ ] The constitution string is exported and present in every
      Tier 1 prompt.

**Commit:** `feat(ai): add constitution and tier 1 parser`

---

### Step 3.2 — Voice capture

**Attach:** `07-infrastructure/stack.md`, `06-flows/capture.md`

**Prompt:**

    Add push-to-talk voice capture.

    Use the platform's on-device STT:
    - iOS: SFSpeechRecognizer.
    - Android: SpeechRecognizer.
    - Web: Web Speech API (as progressive enhancement).

    Via a Capacitor plugin that wraps the platform APIs. If
    running in the browser, fall back to the Web Speech API and
    disable gracefully if unavailable.

    Behavior:
    - Hold the mic button in the capture field.
    - Live partial transcription appears.
    - Release submits the final transcript to Tier 1.
    - If STT confidence is low, the raw transcript becomes an
      unparsed inbox note.

    No wake word. No always-on listening.

**Verify:**

- [ ] Voice capture works on the target platform.
- [ ] Live partial transcription appears.
- [ ] Low-confidence falls back correctly.
- [ ] Permission denied shows a settings link.

**Commit:** `feat(capture): add push-to-talk voice capture`

---

### Step 3.3 — Semantic search and command palette

**Attach:** `04-ai/retrieval-layer.md`, `06-flows/retrieval.md`

**Prompt:**

    Implement semantic search and the command palette.

    Output:
    1. Embeddings for notes, tasks, and events, computed
       on-device and stored locally.
    2. `semantic_search({ query, scope, limit })` — vector search
       over the local index. Returns results with a "why this
       matched" line.
    3. Command palette (`Cmd+K`): commands, direct matches, "Ask:
       ..." placeholder.
    4. Search from any mode's header.
    5. Offline fallback to keyword search with a note.

    Follow retrieval-layer.md and retrieval.md.

**Verify:**

- [ ] Semantic search returns meaningful results.
- [ ] "Why this matched" appears on each result.
- [ ] Command palette opens with `Cmd+K`.
- [ ] Commands run.
- [ ] Offline fallback works.

**Commit:** `feat(ai): add semantic search and command palette`

---

### Step 3.4 — Tier 2 local actions

**Attach:** `04-ai/tier-2-contextual.md`, `04-ai/constitution.md`

**Prompt:**

    Implement Tier 2 contextual actions (local only).

    Actions on a Task:
    - Break this down
    - Find related
    - Add note (opens composer)
    - Link person

    Actions on an Event:
    - Find related

    Actions on a Habit:
    - View history

    Actions on a Note:
    - Summarize
    - Extract tasks

    Output as proposal sheets. The user taps Apply to commit. No
    auto-execution. Every proposal carries an `explanation` field.

    The long-press gesture opens the contextual menu for the
    focused item.

    Follow tier-2-contextual.md and constitution.md.

**Verify:**

- [ ] Long-press opens the menu with the right actions per item type.
- [ ] Proposals render correctly.
- [ ] Apply commits and is undoable.
- [ ] Every proposal has an explanation.
- [ ] No mutation happens without an Apply tap.

**Commit:** `feat(ai): add tier 2 local contextual actions`

---

## Phase 4 — Protocols and People

### Step 4.1 — Protocols

**Attach:** `05-modules/protocols.md`, `04-ai/constitution.md`

**Prompt:**

    Implement the Protocols module.

    Output:
    1. `src/projections/protocol-report.ts` — baseline vs. active,
       per-habit compliance.
    2. Protocols view: Active, Proposed, Past scopes. (Protocols is
       not a mode; the view is accessible from the command palette,
       from a Goal detail, and from Settings.)
    3. Proposal sheet: hypothesis, habits, metric, durations,
       explanation. Actions: Adopt, Edit.
    4. Protocol detail: full state, compliance chart, report (if
       completed).
    5. Immutability during baseline and active. Actions to change
       the metric, hypothesis, or habit list are disabled with a
       tooltip.
    6. Abandon action with confirmation.
    7. Extend at review (creates a new protocol version).

    Follow protocols.md exactly. Rule 3 of the constitution is
    non-negotiable: no protocol modifications during baseline or
    active.

**Verify:**

- [ ] Protocols can be proposed, adopted, and activated.
- [ ] Immutability is enforced.
- [ ] Baseline and active phases work.
- [ ] Report generates at review.
- [ ] Abandon works.

**Commit:** `feat(protocols): add protocols module`

---

### Step 4.2 — People, Areas, and Goals

**Attach:** `05-modules/people.md`, `05-modules/areas-and-goals.md`

**Prompt:**

    Implement People, Areas, and Goals.

    Output:
    1. People list, detail, and linking.
    2. The prep card (Tier 2 action on an event, if not already
       built).
    3. Areas as filters in Tasks, Habits, and Notes.
    4. Goals list and detail.
    5. Areas and Goals in settings (rename, archive).

    Default Areas on first launch: Health, Work, Home, Learning,
    Inbox.

    Follow people.md and areas-and-goals.md.

**Verify:**

- [ ] People can be created, linked, and archived.
- [ ] The prep card works.
- [ ] Areas filter the other modes.
- [ ] Goals render with their protocols.

**Commit:** `feat(modules): add people, areas, and goals`

---

### Step 4.3 — Review module

**Attach:** `05-modules/review.md`, `03-experience/attention-budget.md`

**Prompt:**

    Implement the Review module.

    Output:
    1. Weekly review generation (Tier 3, stub for now — structure
       the code so the cloud call can be plugged in later).
    2. The review as a Note attached to the Day.
    3. The review nudge via the attention queue.
    4. The combined nudge when weekly review and protocol review
       coincide.

    The review is two paragraphs, generated. Tone matches
    review.md: calm, legible, no gamification.

    Follow review.md.

**Verify:**

- [ ] Review generates on the configured day.
- [ ] The nudge fires via the queue.
- [ ] The note is attached to the correct Day.
- [ ] Tone matches the spec.

**Commit:** `feat(review): add weekly review`

---

### Step 4.4 — Resurfacing and lapsed recovery

**Attach:** `06-flows/resurfacing.md`, `06-flows/lapsed-recovery.md`

**Prompt:**

    Implement resurfacing and lapsed recovery.

    Resurfacing:
    - Forgotten surface (captures older than 21 days).
    - Low-energy matching (light days).
    - People resurfacing (quiet People > 30 days).
    - Streak repair (once per month).

    Lapsed recovery:
    - Detects a lapse ≥ 14 days.
    - Two equal doors: Start fresh, Catch up.
    - Start fresh archives old tasks and abandons active protocols
      (via `protocol.abandoned`).
    - Catch up opens a sortable list.

    Follow resurfacing.md and lapsed-recovery.md.

**Verify:**

- [ ] Each resurfacing surface fires subject to the attention budget.
- [ ] Snooze and "not important" work.
- [ ] The lapsed recovery triggers correctly.
- [ ] Both doors work.

**Commit:** `feat(flows): add resurfacing and lapsed recovery`

---

## Phase 5 — Cloud AI

### Step 5.1 — Retrieval layer and Tier 3

**Attach:** `04-ai/retrieval-layer.md`, `04-ai/tier-3-assistant.md`, `04-ai/constitution.md`

**Prompt:**

    Implement the retrieval layer and Tier 3.

    Retrieval layer:
    - Tools: query_events, query_tasks, query_notes, query_habits,
      query_compliance, query_protocol, query_person, query_graph,
      semantic_search, now, freshness_of, research.
    - Router: on-device for simple, cloud for complex.
    - Budgets per tool.
    - Tool-call telemetry writes to the client-side diagnostics
      buffer, not the event log (see `04-ai/retrieval-layer.md`).

    Tier 3:
    - Command palette "Ask: ..." routes here.
    - Minimal context: `{ currentMode, focusedItem, locale,
      timezone, now }`.
    - Bounded tool-call loop (max 5 rounds).
    - Output: answer, proposals, or clarification.

    Every prompt includes the eight constitution rules verbatim.

    Follow retrieval-layer.md and tier-3-assistant.md.

**Verify:**

- [ ] Tools return correct data.
- [ ] The router picks correctly.
- [ ] Budgets are enforced.
- [ ] Constitution is present in every prompt.
- [ ] Simple queries work locally; complex queries hit the cloud.

**Commit:** `feat(ai): add retrieval layer and tier 3 assistant`

---

### Step 5.2 — Research pipeline

**Attach:** `04-ai/research-and-protocols.md`, `04-ai/constitution.md`

**Prompt:**

    Implement the research pipeline.

    Output:
    1. The `research` tool: web search via a search API (Bing,
       Brave, or SerpAPI). No scraping.
    2. Query construction from a task or user input.
    3. One clarifying question if constraints are missing.
    4. Fetch up to 5 sources, prefer < 6 months old.
    5. Synthesis with structured fields.
    6. Evidence labeling for health-adjacent claims.
    7. The note format defined in research-and-protocols.md.
    8. Wire into Tier 2 "Research this" and Tier 3.

    Follow research-and-protocols.md exactly.

**Verify:**

- [ ] Research returns a note with 3–5 results.
- [ ] Every result carries `retrieved_at` and `source`.
- [ ] Health claims are labeled.
- [ ] The clarifying question fires on vague tasks.
- [ ] The note renders correctly.

**Commit:** `feat(ai): add research pipeline`

---

### Step 5.3 — Protocol reports and weekly reviews

**Attach:** `04-ai/research-and-protocols.md`, `05-modules/review.md`, `05-modules/protocols.md`

**Prompt:**

    Wire the research pipeline to protocol reports and weekly
    reviews.

    Protocol report generation:
    - Baseline vs. active comparison.
    - Per-habit compliance.
    - Honest interpretation with caveats (confounds, multiple
      variables, null results).
    - Suggested next steps as options, never decisions.

    Weekly review generation:
    - Two paragraphs.
    - Tone matches review.md.

    Follow research-and-protocols.md and review.md.

**Verify:**

- [ ] Protocol reports generate at review.
- [ ] Reports are honest about confounds.
- [ ] Weekly reviews generate.
- [ ] Tone matches the spec (no gamification).

**Commit:** `feat(ai): generate protocol reports and weekly reviews`

---

### Step 5.4 — Cost model and metering

**Attach:** `07-infrastructure/cost-model.md`

**Prompt:**

    Implement cost tracking and metering.

    Output:
    1. Per-call cost logging.
    2. Research quota enforcement (free: 10/month; Pro: 100/month).
    3. Rate limiting (60 cloud AI calls/hour; 5 research/hour).
    4. Usage visible in settings.
    5. The "quota exhausted" message.

    Follow cost-model.md exactly.

**Verify:**

- [ ] Every cloud call is logged with cost.
- [ ] Quota is enforced.
- [ ] Rate limits work.
- [ ] Settings shows usage.
- [ ] The exhaustion message appears.

**Commit:** `feat(cost): add cost tracking and metering`

---

## Phase 6 — Sync and Auth

### Step 6.1 — Auth

**Attach:** `07-infrastructure/auth.md`

**Prompt:**

    Implement auth.

    Provider: Supabase Auth.
    - Email magic-link.
    - Apple and Google sign-in.
    - Session storage: Secure Enclave (iOS), Keystore (Android),
      encrypted local storage (web).
    - Local-only mode is the default. Auth is opt-in.

    Follow auth.md exactly.

**Verify:**

- [ ] Local-only mode works without an account.
- [ ] Magic-link sign-in works.
- [ ] Session persists across app restarts.
- [ ] Auth gates only cloud features.

**Commit:** `feat(auth): add supabase auth`

---

### Step 6.2 — Sync engine

**Attach:** `07-infrastructure/sync-engine.md`, `02-architecture/local-first.md`

**Prompt:**

    Implement the sync engine.

    Output:
    1. Push: send unsynced entries to the server.
    2. Pull: fetch entries since the last pull.
    3. Merge: server orders by (timestamp, device_id, seq).
    4. Total order convergence.
    5. Initial sync streaming.
    6. Error handling per the retry policy.

    Follow sync-engine.md and local-first.md exactly.

**Verify:**

- [ ] Two devices converge on the same state.
- [ ] Conflicts resolve by order.
- [ ] A dropped connection mid-pull resumes.
- [ ] Initial sync streams the full log.

**Commit:** `feat(sync): add log replication`

---

### Step 6.3 — Sensitive data and account deletion

**Attach:** `02-architecture/local-first.md`, `02-architecture/data-lifecycle.md`, `07-infrastructure/auth.md`

**Prompt:**

    Implement sensitive data defaults and account deletion.

    Output:
    1. `sync: false` flag on notes, metric logs, and person data
       by default.
    2. Settings toggle for cloud backup of sensitive categories.
    3. Account deletion flow: confirmation, export prompt, server
       tombstone, 30-day record retention.

    Follow local-first.md and data-lifecycle.md.

**Verify:**

- [ ] Notes are local-only by default.
- [ ] The toggle works.
- [ ] Account deletion runs the full flow.
- [ ] Server tombstones the log.

**Commit:** `feat(sync): add sensitive data defaults and account deletion`

---

## Phase 7 — Integrations

### Step 7.1 — Calendar sync

**Attach:** `07-infrastructure/integrations.md`, `02-architecture/data-lifecycle.md`

**Prompt:**

    Implement calendar sync.

    Providers: Google Calendar, Apple Calendar (EventKit),
    Outlook (Microsoft Graph).
    - Two-way with the rules in integrations.md.
    - In-app events write to the source.
    - Source events mirror to the app.
    - Freshness metadata on every mirrored event.
    - Revocation is one of the three irreversible actions.

    Follow integrations.md and data-lifecycle.md.

**Verify:**

- [ ] At least one provider syncs.
- [ ] In-app events push to the source.
- [ ] Source events mirror with freshness.
- [ ] Revocation works with confirmation.

**Commit:** `feat(integrations): add calendar sync`

---

### Step 7.2 — Contacts and Health

**Attach:** `07-infrastructure/integrations.md`

**Prompt:**

    Implement contacts and health integrations.

    Contacts:
    - Read platform contacts.
    - One-way import (user selects).
    - Local-only. Never write back.

    Health:
    - Read steps, sleep, workouts.
    - Match to habits (user confirms once per habit).
    - Auto-fill habit compliance.

    Follow integrations.md.

**Verify:**

- [ ] Contacts import works.
- [ ] Contact data is local-only.
- [ ] Health auto-fills at least one habit.
- [ ] No write-back to either source.

**Commit:** `feat(integrations): add contacts and health`

---

### Step 7.3 — Email forwarding and weather

**Attach:** `07-infrastructure/integrations.md`, `06-flows/capture.md`

**Prompt:**

    Implement email forwarding and weather.

    Email forwarding:
    - Provide a `<user-slug>@in.<domain>` address. Inbound is Cloudflare
      Email Routing to a Worker; outbound is Resend (ADR 0018).
    - Slug: generated, 8 lowercase alphanumeric characters, never
      derived from name or email, rotatable (ADR 0017).
    - The Worker relays only. The device parses with Tier 1 and writes
      `note.created` with `sync: false`. No server-side log writes, no
      server-side AI (ADR 0017).
    - Undelivered messages wait in a transient buffer, dropped after 72
      hours, disclosed where the address is shown.
    - Rate limit: 100 forwards/day/user.
    - No mailbox reading.

    Weather:
    - Read-only API call for the user's home location.
    - Cached 30 minutes.
    - Shown in the day view and the shutdown preview.

    Follow integrations.md.

**Verify:**

- [ ] Email forwarding creates captures.
- [ ] The rate limit works.
- [ ] Weather renders in day view.
- [ ] Freshness metadata is present.

**Commit:** `feat(integrations): add email forwarding and weather`

---

## Phase 8 — Shell Apps

### Step 8.1 — Capacitor setup

**Attach:** `07-infrastructure/stack.md`, `08-decisions/0004-capacitor-over-tauri.md`

**Prompt:**

    Wrap the web app in Capacitor for iOS and Android.

    Output:
    1. Capacitor project files for iOS and Android.
    2. Build scripts.
    3. The web app runs inside the WebView with the same behavior.

    No native UI is written. The shell is a container only.

    Follow stack.md and ADR 0004.

**Verify:**

- [ ] App builds and runs on iOS Simulator.
- [ ] App builds and runs on Android Emulator.
- [ ] All web features work inside the shell.

**Commit:** `chore(shell): add capacitor ios and android`

---

### Step 8.2 — Native plugins

**Attach:** `07-infrastructure/stack.md`, `03-experience/haptic-vocabulary.md`

**Prompt:**

    Wire native plugins.

    - STT (@capacitor-community/speech-recognition) for voice
      capture.
    - Haptics (@capacitor/haptics) for the four haptics.
    - Secure storage for session tokens.
    - Share sheet (as a share target).
    - Background sync (where the platform allows).

    Follow stack.md and haptic-vocabulary.md.

**Verify:**

- [ ] Voice capture works on device.
- [ ] All four haptics fire correctly.
- [ ] Session persists securely.
- [ ] Sharing from another app captures.

**Commit:** `feat(shell): wire native plugins`

---

### Step 8.3 — Platform polish and submission

**Attach:** `10-engineering/quality-standards.md`

**Prompt:**

    Polish for platform submission.

    - Safe areas (notch, home indicator).
    - Keyboard handling.
    - Back gesture (Android) and edge-swipe (iOS).
    - Status bar styling.
    - App icons and splash screens.
    - Store metadata.

    Then prepare submissions for both stores.

    Follow quality-standards.md for the release checklist.

**Verify:**

- [ ] Safe areas handled on all screen sizes.
- [ ] Keyboard works with all inputs.
- [ ] Back gestures work.
- [ ] App icons and splash screens render.
- [ ] Submissions accepted.

**Commit:** `chore(shell): polish and prepare store submissions`

---

## Phase 9 — Refinement (ongoing)

These are not sequenced. Add them when the core is stable.

- Advanced protocol proposals (test one variable).
- Monthly and annual reviews.
- Time machine mode.
- Draft-day proposals at morning plan.
- Natural-language filters.
- Extended keyboard shortcuts.
- Additional shell targets (desktop via Tauri, when mature).

---

## Cross-cutting prompts

Use these when the AI drifts.

### When the AI invents structure

    You added [X], which is not in the object model
    (02-architecture/object-model.md). Remove it. If you believe X
    is needed, stop and explain why, and I will decide whether to
    write an ADR.

### When the AI uses arbitrary values

    The linter should have caught [specific arbitrary value]. Fix
    it. If the linter is not catching it, fix the linter first.

### When the AI skips tests

    Add tests for the new behavior per
    10-engineering/testing.md. At minimum: the projection
    compute/apply agreement, schema validation for new event
    types, and one e2e for the new flow.

### When the AI bypasses the log

    You mutated state directly. All state changes must be log
    entries (02-architecture/event-log.md). Rewrite this to append
    to the log and let the projection compute the state.

### When the AI ignores the constitution

    The AI's response must include the eight rules from
    04-ai/constitution.md verbatim, before any task-specific
    instruction. Check the prompt construction. If the rules are
    missing, fix the prompt builder.

### When the AI generates UI that feels off

    Check that every value is a token from
    03-experience/design-tokens.md. Check that gestures, motion,
    and haptics come from their vocabularies. If they do and it
    still feels off, take a screenshot at 390px and describe the
    specific element that's wrong. Do not ask for a redesign.

---

## What to do if you get stuck

1. **Re-read the relevant doc.** The answer is usually in it.
2. **Check the invariants.** Something is probably violated.
3. **Write the smallest failing test.** It clarifies the problem.
4. **Ask the AI to explain its reasoning before generating code.**
   If the reasoning is wrong, the code will be.
5. **Revert and restart the step.** If a step has gone wrong,
   discarding and starting over is faster than untangling.

## What this file must NOT do

- This file does not replace the docs. It is a work sequence. The
  docs are the specification.
- This file does not estimate time.
- This file does not cover every possible feature. It covers the
  build order.
- This file does not lock in the order forever. Phases can be
  re-sequenced if needed.