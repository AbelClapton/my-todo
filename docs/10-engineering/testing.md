# Testing

## Purpose

This doc defines what is tested, what is not, and how. It exists
because the app has invariants that must never break (projections
agreeing with the log, the AI respecting the constitution,
undo working everywhere) and because testing without a strategy
produces either too many brittle tests or too few useful ones.

The rule is: **test behavior and invariants, not implementation.**
A test that breaks when you rename a variable is a bad test.

## Invariants

- Every projection is tested for the `compute` / `apply` invariant.
- Every log entry type is tested for schema validation.
- Every AI tier is tested for constitution adherence.
- Every UI transition is covered by a visual regression test.
- Every screen passes accessibility checks in CI.
- Tests are deterministic. No `Date.now()`, no random, no network.
- Tests run in under 60 seconds for the full unit suite.

## Specification

### The test pyramid

| Layer | Coverage | Runs on |
|---|---|---|
| Unit | Domain logic, projections, parsers, validators | Every save |
| Integration | Log → projection → UI wiring | Every commit |
| E2E | Full user flows | Every PR |
| Visual | Every screen, 4 widths, dark mode | Every PR |
| A11y | Every screen | Every PR |
| Performance | Cold start, log append, projection recompute | Nightly |

### Unit tests

**What to test:**

- Projection `compute` and `apply` agreement.
- Zod schema validation (valid and invalid inputs).
- Tier 1 parsing (input → expected parse, confidence thresholds).
- Pure utilities (date math, sorting, filtering).
- Edge cases in domain logic (empty states, boundaries).

**What not to test:**

- React component internals (props → snapshot is enough).
- Third-party library behavior (trust the library).
- Implementation details (private functions, internal state).
- Trivial getters and setters.

**The projection invariant test.**

For every projection:

    import { computeTaskList, applyTaskList } from './task-list';

    test('compute and apply agree for task_list', () => {
      const log = loadFixture('task-lifecycle.json');
      const params = { scope: 'today' };

      const computed = computeTaskList(log, params);
      const incremental = log.reduce(applyTaskList, emptyTaskList());

      expect(incremental).toEqual(computed);
    });

This test runs for every projection, against every fixture. It is
the single most important test in the codebase.

**Fixtures.**

Fixtures are JSON files of log entries representing realistic
scenarios:

- `task-lifecycle.json` — creation, scheduling, deferral,
  completion, undo.
- `habit-compliance.json` — checks, minimums, skips, misses.
- `protocol-full.json` — proposal, adoption, baseline, active,
  review.
- `conflict-concurrent.json` — two devices editing offline.
- `empty.json` — an empty log.

Every projection tests against every relevant fixture.

### Integration tests

**What to test:**

- Log append → projection update.
- UI state deriving from projections.
- Sync push/pull cycles (against a local test server).
- AI proposal → user consent → log entry.

**What not to test:**

- Third-party integrations against their real APIs. Use mocks.
- Actual network timing.

### E2E tests

Playwright, running against a built app with a seeded log.

**Required flows:**

- Capture → task created → completed → undone.
- Morning plan → three tasks chosen → committed.
- Shutdown → day closed → tomorrow preview shown.
- Swipe right completes; swipe left defers.
- Long-press opens contextual menu; "Research this" returns a
  proposal.
- Delete account → confirmation → tombstones.
- Lapsed recovery → both doors work.

E2E tests run against the exact build that will ship. They are
slower (minutes) and fewer (about 20).

### Visual regression tests

Playwright screenshots at:

- 390px (iPhone 14)
- 768px (iPad portrait)
- 1440px (desktop)
- Dark mode at all three widths

**Every screen** is captured. This is expensive but non-negotiable,
because the whole point of the token system is visual consistency,
and the only way to verify consistency is to compare.

Screenshots are compared against a committed baseline. Any diff
fails CI. Baselines are updated manually (never auto-accepted).

**Why this matters:** AI-generated UI drifts. Two screens generated
in different sessions will diverge in spacing, alignment, and
hierarchy unless something enforces sameness. Visual regression is
that enforcement.

### Accessibility tests

axe-core runs against every screen in CI. Checks:

- Color contrast (WCAG AA).
- Form labels.
- Heading hierarchy.
- ARIA roles where applicable.
- Keyboard navigation for all interactive elements.
- Focus indicators visible.

Failures block the PR.

### Performance tests

Run nightly, not per-PR (too slow).

**Budgets:**

- Cold start (first load): < 3s on a mid-range phone.
- Warm start: < 500ms.
- Log append: < 10ms.
- Projection recompute (incremental): < 50ms.
- Tier 1 parse: < 200ms.
- Semantic search: < 300ms local.
- Calendar day view render: < 100ms.

Tests measure against these budgets on a throttled environment
(simulated mid-range phone). Regressions > 20% fail the nightly
build.

### AI tests

**Constitution adherence.** Every AI tier has tests that verify:

- Rule 1: proposals, not executions. No mutation without a
  consent tap.
- Rule 2: no UI generation. Responses contain no JSX, no CSS, no
  layout.
- Rule 3: no active-protocol modification.
- Rule 4: every proposal includes an `explanation` field.
- Rule 5: health-adjacent claims carry `source` and
  `evidence_strength`.
- Rule 6: no new entity types, no new fields, no new edges.
- Rule 7: "I don't know" is returned when context is insufficient.
- Rule 8: responses never contain nudge fields. The AI proposes
  mutations and text; it does not fire or propose notifications.
  The attention queue is the only path to a nudge.

Tests run against a **mock AI** that returns canned responses for
known inputs. This verifies the app's handling of AI output, not
the model's behavior.

**The mock AI.** Lives at `src/ai/__mocks__/`. It is a
fixture-based responder: known input strings map to canned output
(valid proposals, invalid responses, timeouts, refusals). It is used
only in tests. It is never imported into production code.

Fixtures include:

- `valid-breakdown.json` — a Tier 2 proposal for "break this down."
- `valid-research.json` — a Tier 2 research result with citations.
- `invalid-shape.json` — a response missing an `explanation` field.
- `invalid-ui.json` — a response whose `text` field contains
  HTML or JSX-like markup (`<script>`, `<div onclick=...>`, etc.).
  The test verifies the app escapes these on render, never
  inserting them as raw HTML. (The JSON itself is valid; the
  rejection is about rendering, not parsing.)
- `timeout.json` — a simulated timeout.
- `idk.json` — a "I don't know" response for a Rule 7 test.

**Schema validation.** Every AI response is validated against its
expected Zod schema. Tests verify:

- Valid responses pass.
- Invalid responses (missing fields, wrong types) are rejected.
- Rejected responses trigger a retry, not a crash.

**Prompt construction.** Tests verify that every prompt includes:

- The eight rules verbatim.
- The minimal context (`{ currentMode, focusedItem }`).
- The available tools.
- The output schema.

### What not to test

- **Line coverage.** Coverage is a red herring. A projection with
  100% coverage can still be wrong. Test behavior, not lines.
- **Snapshots of large components.** They break on trivial
  changes and provide little value. Use visual regression instead.
- **Third-party APIs.** Mock them.
- **Time-dependent code.** Inject time; never use `Date.now()` in
  tests.
- **Random behavior.** No `Math.random()` in tests. Seed it if
  needed.
- **Private functions.** Test through the public API.
- **CSS classes.** Test behavior, not styling.

### Coverage targets

None. Coverage is tracked but not gated. A PR with 60% coverage
and good tests is better than one with 95% and brittle tests.

The only coverage gate: **every projection has a compute/apply
test**, and **every log entry type has a schema test**. These are
enforced by a test that checks for the existence of the test, not
by coverage percentage.

### Test structure

    src/
    ├── projections/
    │   ├── task-list.ts
    │   ├── task-list.test.ts         ← compute/apply tests
    │   └── __fixtures__/
    │       ├── task-lifecycle.json
    │       └── empty.json
    ├── domain/
    │   └── events/
    │       ├── task-created.ts
    │       └── task-created.test.ts  ← schema tests
    └── ai/
        └── tiers/
            ├── tier-1.ts
            └── tier-1.test.ts        ← parsing + constitution

### Running tests

    pnpm test           # unit + integration (fast, <60s)
    pnpm test:e2e       # Playwright e2e
    pnpm test:visual    # Playwright visual regression
    pnpm test:a11y      # axe
    pnpm test:perf      # nightly performance

CI runs all except performance on every PR. Performance runs
nightly.

## Examples

**A projection test.**

    // src/projections/task-list.test.ts
    import { describe, test, expect } from 'vitest';
    import { computeTaskList, applyTaskList, emptyTaskList } from './task-list';
    import taskLifecycle from './__fixtures__/task-lifecycle.json';

    describe('task_list', () => {
      test('compute and apply agree', () => {
        const params = { scope: 'today' as const };
        expect(applyTaskList(taskLifecycle, emptyTaskList()))
          .toEqual(computeTaskList(taskLifecycle, params));
      });

      test('deferred tasks are hidden until defer date', () => {
        // ...
      });

      test('empty log returns empty list', () => {
        expect(computeTaskList([], { scope: 'today' })).toEqual([]);
      });
    });

**A schema test.**

    // src/domain/events/task-created.test.ts
    test('TaskCreatedSchema rejects missing title', () => {
      const result = TaskCreatedSchema.safeParse({
        task_id: '01HX...',
        area_id: '01HX...',
      });
      expect(result.success).toBe(false);
    });

**A constitution test.**

    // src/ai/tiers/tier-2.test.ts
    test('proposals always include an explanation', () => {
      const proposal = mockTier2Response('break-down');
      expect(proposal.proposals[0].explanation).toBeTruthy();
    });

    test('health-adjacent research includes evidence labels', () => {
      const proposal = mockTier2Response('research-sleep');
      for (const source of proposal.sources) {
        expect(source.evidence_strength).toMatch(
          /established|emerging|anecdotal/,
        );
      }
    });

**A visual test.**

    // tests/visual/calendar.spec.ts
    test('calendar day view matches baseline', async ({ page }) => {
      await page.goto('/calendar?seed=day-typical');
      await expect(page).toHaveScreenshot('calendar-day.png', {
        fullPage: true,
      });
    });

**A e2e test.**

    // tests/e2e/capture-complete-undo.spec.ts
    test('capture, complete, undo', async ({ page }) => {
      await page.goto('/tasks');
      await page.getByTestId('capture-field').fill('Buy groceries');
      await page.keyboard.press('Enter');

      await page.getByText('Buy groceries').swipe('right');
      await expect(page.getByText('Completed. Undo?')).toBeVisible();

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByText('Buy groceries')).toBeVisible();
    });

## What this doc must NOT do

- This doc does not define the log. It defines how to test it.
- This doc does not define the AI constitution. It defines how to
  test adherence. The constitution is
  `04-ai/constitution.md`.
- This doc does not define visual design. It defines how to test
  visual consistency. Design is
  `03-experience/design-tokens.md`.
- This doc does not define CI configuration. That is
  `10-engineering/quality-standards.md`.
- This doc does not prescribe specific test runners beyond
  Vitest (unit) and Playwright (e2e, visual).
- This doc does not set coverage targets. There are none.