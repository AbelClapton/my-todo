# Quality Standards

## Purpose

This doc defines what "done" means, how work is reviewed, and what
runs in CI. It exists because "done" is where quality either
happens or doesn't, and because a small team moving fast needs
objective gates rather than taste-based review.

The rule is: **every PR meets the same bar, or it doesn't merge.**
There are no exceptions for small changes.

## Invariants

- Every PR passes all CI checks before merge.
- Every PR is reviewed by at least one other person, or by the
  author's own checklist if solo.
- Every structural change has an ADR.
- Every UI change has a visual regression baseline update.
- Every new feature has tests.
- No `TODO` in merged code without an owner and a reason.

## Specification

### Definition of done

A change is done when:

- [ ] It does what the linked doc(s) say it does.
- [ ] All CI checks pass (lint, type, test, visual, a11y, build).
- [ ] It has tests for new behavior.
- [ ] It has no `any`, no `as` without justification, no
      non-null assertions.
- [ ] It uses only tokens for any visual value.
- [ ] It updates the relevant docs if behavior changed.
- [ ] If structural (new entity, new event type, new edge), an ADR
      exists.
- [ ] It works offline.
- [ ] It respects the AI constitution, if AI-related.
- [ ] It respects the attention budget, if it produces nudges.
- [ ] No new console errors or warnings in development.
- [ ] Performance budgets are met (for performance-sensitive
      changes).

### The review checklist

For each PR:

**Architecture.**

- Does it change the event log, object model, or projections? If
  so, is there an ADR?
- Does it introduce a new entity, event type, or edge? If so, is
  it justified?
- Does it bypass the log to mutate state? (It must not.)

**Code.**

- Does it follow `10-engineering/code-conventions.md`?
- Are types narrow and unions preferred to optionals?
- Are external inputs validated with Zod?
- Are expected errors returned as Results?
- Are unexpected errors caught by boundaries?

**UI.**

- Does it use only design tokens?
- Are gesture, motion, and haptic vocabularies respected?
- Does it pass visual regression?
- Does it pass axe?

**AI.**

- Does the prompt include all eight constitution rules?
- Are proposals always reversible?
- Are health claims labeled?

**Tests.**

- Does new behavior have tests?
- Are projection tests updated?
- Are e2e tests added for new flows?

### CI checks

Runs on every PR. All must pass.

| Check | Tool | Fails on |
|---|---|---|
| Lint | ESLint | Any lint error |
| Tailwind | `eslint-plugin-tailwindcss` | Any arbitrary value |
| Type | `tsc --noEmit` | Any type error |
| Unit + integration | Vitest | Any test failure |
| E2E | Playwright | Any flow failure |
| Visual regression | Playwright | Any pixel diff > threshold |
| Accessibility | axe-core | Any AA violation |
| Build | Vite | Any build failure |
| Bundle size | `size-limit` | Regression > 10% |
| Circular imports | `eslint-plugin-import` | Any cycle |

### Performance budgets

Enforced nightly, not per-PR. Regressions > 20% fail the nightly
build.

| Metric | Budget |
|---|---|
| Cold start | < 3s |
| Warm start | < 500ms |
| Log append | < 10ms |
| Projection recompute (incremental) | < 50ms |
| Tier 1 parse | < 200ms |
| Semantic search | < 300ms |
| Calendar day render | < 100ms |
| JS bundle (initial) | < 250KB gzipped |
| Full app (cached) | < 500KB gzipped |

### Accessibility standards

Enforced per-PR.

- WCAG AA contrast (4.5:1 body, 3:1 large text).
- Every interactive element has a focus indicator.
- Every form input has a label.
- Every image has alt text or is marked decorative.
- Keyboard navigation works for all interactive surfaces.
- Screen reader announcements for state changes (e.g., "task
  completed").
- Motion respects `prefers-reduced-motion`.

### Git conventions

**Branching.** Trunk-based development. Short-lived feature
branches (< 3 days). No long-lived branches.

**Branch names:** `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`,
followed by a short kebab-case description. Example:
`feat/capture-pull-down`.

**Commits.** Conventional Commits.

    <type>(<scope>): <subject>

    <body>

    <footer>

Examples:

    feat(tasks): add defer sheet
    fix(sync): handle mid-pull disconnect
    docs(ai): clarify constitution rule 5
    refactor(projections): extract task materialization

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`,
`perf`, `build`.

**Subject:** imperative, lowercase, no period, < 72 chars.

**Body:** explains why, not what. The diff says what.

**PR size.** Small and focused. A PR that touches more than one
concern is split. Guideline: < 400 lines of non-test diff.

**PR description.** Includes:

- What changed.
- Why (linked doc or issue).
- What was tested.
- Screenshots for UI changes.

### The ADR process

An ADR is required when a change:

- Adds or removes a log entry type.
- Adds or removes an entity, edge type, or field.
- Changes an invariant.
- Changes the constitution.
- Adds or removes an integration.
- Changes the stack.

ADRs are numbered sequentially, immutable once accepted. Superseding
an ADR means writing a new one that references the old.

### Doc updates

Behavior changes require doc updates in the same PR. If a doc is
wrong, fix it. If a feature changes the doc, update the doc.

A PR that changes behavior without updating docs is incomplete.

### Deploys

- Every merge to `main` deploys to staging automatically.
- Production deploys are manual, one per day (batched), after
  staging has been verified.
- Rollback is a one-command revert of the previous production
  deploy.
- Database migrations are forward-only. Reversing requires a new
  migration.

### Monitoring

- Error rate, latency, and uptime are tracked (Sentry, or
  equivalent).
- A daily digest is posted to the team.
- Alerts fire on error rate > 1%, latency > 500ms p95, or uptime <
  99.9%.
- **No product analytics.** No usage tracking, no feature flags, no
  session recording, no event telemetry beyond crash reports.
  Crash reports are opt-in and contain no user data. The event log
  (`08-decisions/0001-event-sourcing.md`) makes this analysis
  technically possible; declining to build it is a values decision,
  not a technical limitation.

### Solo author note

If the team is one person, "review by another person" is replaced
by:

- Sleeping on it. Do not merge the same day as the final commit.
- Walking the diff. Read every line in the PR view, not the editor.
- Running the checklist. Explicitly mark each item.

This is not the same as peer review, but it catches most of what
peer review catches.

## Examples

**A well-scoped PR.**

    Branch: feat/capture-pull-down
    Commit: feat(capture): pull down reveals capture field

    Adds pull-to-reveal on all list surfaces. Uses the same
    capture field across surfaces. Tier 1 parsing is not included
    (next PR).

    Tests: unit for gesture handler, e2e for pull-reveal-capture.
    Docs: no doc changes (behavior matches 06-flows/capture.md).

    Screenshots: [attached]

**A PR that should be split.**

    Branch: feat/big-update
    Touches: log schema, projection layer, three UI modes,
    AI prompts.

    This should be 4 PRs: schema, projections, UI, AI. Each has
    its own review, its own tests, its own rollback.

**A PR that needs an ADR.**

    Branch: feat/tags
    Adds a `tag` entity and a many-to-many edge.

    Blocked. This is structural. Requires an ADR justifying the
    entity and the edge. The ADR is reviewed first, then the code.

**A solo review.**

    Author finishes work at 4pm.
    Does not merge.
    Next morning: reads the diff in the PR view.
    Runs the checklist explicitly.
    Notices a missing edge case.
    Fixes it. Merges.

## What this doc must NOT do

- This doc does not define code conventions. Those are
  `10-engineering/code-conventions.md`.
- This doc does not define tests. Those are
  `10-engineering/testing.md`.
- This doc does not define error handling. That is
  `10-engineering/error-handling.md`.
- This doc does not define the product. It defines how product
  changes are shipped.
- This doc does not lock in specific tools beyond what is named.
  Tool changes are ADR territory if they affect the pipeline.