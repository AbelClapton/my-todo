# Code Conventions

## Purpose

This doc defines how code is written in this repository: language
strictness, file organization, naming, type patterns, and the
specific conventions that keep AI-generated code consistent with
the architecture. It exists because the "feels off" problem is not
limited to UI — it applies to code too. Two files written in
different sessions will diverge unless the rules are written down.

These conventions are the ones the AI must follow when generating
any code. They are enforced by linters where possible and by review
where not.

## Invariants

- TypeScript is strict. `any` is prohibited except in narrowly
  documented cases.
- The event log is the only path to state change. Code never mutates
  state directly.
- Projections are pure functions. No I/O, no side effects.
- Zod validates every external input. No unvalidated data enters
  the domain.
- Functions and data only. No classes.
- No default exports, except TanStack route files, which require
  them.

## Specification

### TypeScript strictness

`tsconfig.json` must enable:

    {
      "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "noFallthroughCasesInSwitch": true,
        "exactOptionalPropertyTypes": true,
        "noPropertyAccessFromIndexSignature": true,
        "verbatimModuleSyntax": true
      }
    }

Rules:

- No `any`. Use `unknown` for untyped input and narrow with Zod.
- No `as` casts unless the value is verified. If a cast is needed,
  a comment explains why.
- No non-null assertion (`!`) except in tests.
- Prefer `readonly` for data that does not change.
- Prefer discriminated unions to optional fields.

### File organization

The `src/` tree mirrors the architecture:

    src/
    ├── domain/
    │   ├── atoms/         ← Task, Event, Note, Habit types + schemas
    │   ├── layers/        ← Area, Goal, Protocol, Person
    │   ├── edges/         ← canonical edge types
    │   └── events/        ← log entry types + schemas
    ├── projections/
    │   ├── task-list.ts
    │   ├── day-view.ts
    │   └── ...
    ├── ai/
    │   ├── constitution.ts
    │   ├── tiers/
    │   │   ├── tier-1.ts
    │   │   ├── tier-2.ts
    │   │   └── tier-3.ts
    │   ├── retrieval/
    │   │   ├── tools.ts
    │   │   └── router.ts
    │   └── research/
    ├── ui/
    │   ├── tokens.ts
    │   ├── components/    ← shadcn + custom primitives
    │   ├── modes/         ← calendar, tasks, habits, notes
    │   └── flows/         ← capture, morning-plan, shutdown
    ├── sync/
    ├── shell/             ← Capacitor wrappers
    └── app/               ← routing, layout, entry

Rules:

- One primary export per file. Utility files may export groups of
  related helpers.
- Tests live next to the file they test:
  `task-list.ts` → `task-list.test.ts`.
- No barrel files (`index.ts` re-exports) except at folder roots
  where it adds clarity. Prefer direct imports.
- Maximum file length: 400 lines. Beyond that, split by concern.

### Naming

| Kind | Convention | Example |
|---|---|---|
| Files | kebab-case | `task-list.ts` |
| React components (files) | kebab-case | `task-row.tsx` |
| React components (exports) | PascalCase | `export function TaskRow()` |
| Types and interfaces | PascalCase | `LogEntry`, `Task` |
| Zod schemas | PascalCase + `Schema` | `TaskCreatedSchema` |
| Variables and functions | camelCase | `computeTaskList` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_NUDGE_PER_HOUR` |
| Log entry types | dot.case string | `'task.created'` |
| Projection names | snake_case string | `'task_list'` |
| Edge type strings | `A → B` in docs, `a_to_b` in code | `'task_to_person'` |
| Boolean variables | `is`/`has`/`should` prefix | `isCompleted`, `hasDue` |

Log entry types and projection names are strings that match the
docs exactly. If the doc says `task.created`, the code says
`'task.created'`. No synonyms.

### Types

**Prefer discriminated unions.** A union with a `type` field, where
each variant is narrow. The log entry union is the canonical example:

    type LogEntry =
      | { type: 'task.created'; payload: TaskCreatedPayload; ... }
      | { type: 'task.completed'; payload: TaskCompletedPayload; ... }
      | ...

**Prefer readonly.** Entities and payloads are `readonly`. State
changes are new values, not mutations.

**Prefer narrow types.** No `string` where a union of literals
would work. `priority: 'now' | 'next' | 'later'` is better than
`priority: string`.

**Optional means absent, not empty.** Prefer `{ due?: Date }` to
`{ due: Date | null }`. An absent field is one state, and
`exactOptionalPropertyTypes` keeps `undefined` from becoming a
second. Use a discriminated union when the field's presence changes
what the object *is* — a `task.completed` entry carries a
`completion_note`, a `task.created` entry has no such field. Use a
nullable field only when the value is genuinely present-and-empty.
This is what the payloads in `02-architecture/event-log.md` do.

**Use `type`, not `interface`,** for all app types. `interface` is
only used when augmenting a third-party type.

### The event log as a code artifact

Every log entry has:

1. A TypeScript type in `src/domain/events/`.
2. A Zod schema for validation.
3. A `type` string literal matching the doc.
4. A registered handler in the projection layer for every
   projection it affects.

The event log type union is the source of truth for "what events
exist." There is no registry file. The union itself is the registry.

    // src/domain/events/task-created.ts
    export const TaskCreatedSchema = z.object({
      task_id: z.string().ulid(),
      title: z.string().min(1).max(500),
      area_id: z.string().ulid(),
      due: z.string().datetime().optional(),
      defer: z.string().datetime().optional(),
      priority: z.enum(['now', 'next', 'later']).optional(),
      source: z.enum(['user', 'ai.tier1']),
    });

    export type TaskCreatedPayload = z.infer<typeof TaskCreatedSchema>;

### Projections as a code artifact

Every projection has:

    export function computeX(input: LogEntry[], params: XParams): XState
    export function applyX(state: XState, entry: LogEntry): XState

`computeX` and `applyX` must agree. This is enforced by test
(`10-engineering/testing.md`).

Projection functions are pure. No `Date.now()`, no `Math.random()`,
no I/O, no `localStorage`. If a projection needs the current time,
it is passed in as a parameter.

### Zod at boundaries

Every external input is validated with Zod before entering the
domain. Boundaries:

- User input (form fields, capture text, voice transcript).
- AI responses (parsed against the expected schema).
- API responses (calendar, health, contacts, weather).
- File reads (imports, exports, snapshots).
- Local storage and IndexedDB reads.

Inside the domain, types are trusted. No validation between
`computeTaskList` and `applyTaskList`.

### Errors

Two kinds, handled differently:

**Expected errors** — network down, AI unavailable, invalid user
input, sync conflict. These are values, not exceptions. Return a
`Result<T, E>`:

    type Result<T, E> =
      | { ok: true; value: T }
      | { ok: false; error: E }

    async function callAssistant(input: string): Promise<Result<Answer, AssistantError>> {
      // ...
    }

**Unexpected errors** — bugs, invalid state, missing files. These
throw and are caught by an error boundary
(`10-engineering/error-handling.md`).

Rule: if the caller is expected to handle it, it is a Result. If
it indicates a bug, it throws.

### Imports

- Absolute imports from `src/` use the `@/` alias.
- Relative imports are allowed within a folder for sibling files.
- Import order: types, then values, then styles. Alphabetical
  within each group.
- No circular imports. Enforced by `eslint-plugin-import`.

### No classes

The codebase is functional. No `class` declarations.

**React error boundaries** are the one framework feature that
historically required classes. This is solved by using the
`react-error-boundary` library, which wraps a class-based boundary
in a function-component API. The codebase never writes a class.

No other exceptions. If a future library requires a class to
extend, it must be wrapped in a function or factory before use.
This is a hard rule, not a preference.

### Comments

- Explain *why*, not *what*. The code says what.
- Every non-obvious decision gets a comment. Every obvious one does
  not.
- Doc comments (`/** */`) on exported functions and types.
- TODO comments include a reason and owner:
  `// TODO(@author): reason`.

### Async patterns

- No floating promises. Every `async` call is awaited or explicitly
  voided with `.catch()`.
- Use `Promise.all` for parallel independent work.
- Use `AbortController` for cancellable operations (search, sync,
  AI calls).
- No `setTimeout` for state changes. Use scheduled tasks in the log.

### React conventions

- Function components only. No class components.
- Error boundaries use `react-error-boundary`, which is a function
  component. No exception.
- Hooks in `use*` files, one hook per file when non-trivial.
- Props are typed with an explicit `type Props = { ... }`.
- No prop spreading except for pass-through primitives.
- Event handlers are named `handleX` internally, `onX` in props.
- No inline styles. Tailwind tokens only.
- Memoization only when measured. Do not pre-optimize.

### Tailwind conventions

- Only tokens (`03-experience/design-tokens.md`). Arbitrary values
  are prohibited and fail the linter.
- Use `gap` for spacing between children. Avoid `margin`.
- Never use negative margins.
- Conditional classes use `clsx` or `cn`.
- Variants (via `cva` or similar) are preferred to conditional
  class strings.

### Example — a correctly written module

    // src/projections/task-list.ts
    import type { LogEntry } from '@/domain/events';
    import type { Task } from '@/domain/atoms/task';

    export type TaskListParams = {
      readonly scope: 'today' | 'next' | 'someday' | 'all';
      readonly area_id?: string;
    };

    export type TaskListState = readonly Task[];

    export function computeTaskList(
      entries: readonly LogEntry[],
      params: TaskListParams,
    ): TaskListState {
      const state = entries.reduce(applyTaskList, emptyTaskList());
      return filterByScope(state, params);
    }

    export function applyTaskList(
      state: TaskListState,
      entry: LogEntry,
    ): TaskListState {
      switch (entry.type) {
        case 'task.created':
          return [...state, materializeTask(entry.payload)];
        case 'task.completed':
          return state.map((t) =>
            t.id === entry.payload.task_id
              ? { ...t, state: 'completed' as const }
              : t,
          );
        default:
          return state;
      }
    }

## Examples

**Wrong.**

    // Uses `any`, default export, class, arbitrary Tailwind
    export default class TaskManager {
      tasks: any[] = [];
      add(task: any) { this.tasks.push(task); }
    }

**Right.**

    // Typed, named export, function, tokens
    export function applyTaskCreated(
      state: readonly Task[],
      payload: TaskCreatedPayload,
    ): readonly Task[] {
      return [...state, materializeTask(payload)];
    }

**Wrong — a class-based error boundary.**

    class MyErrorBoundary extends React.Component {
      // ...
    }

**Right — using react-error-boundary.**

    import { ErrorBoundary } from 'react-error-boundary';

    export function ModeRoot({ children }: { children: React.ReactNode }) {
      return (
        <ErrorBoundary
          FallbackComponent={ModeErrorFallback}
          onError={reportToSentry}
        >
          {children}
        </ErrorBoundary>
      );
    }

## What this doc must NOT do

- This doc does not define the architecture. It defines how code is
  written within it.
- This doc does not define tests. Testing is
  `10-engineering/testing.md`.
- This doc does not define quality gates. Quality is
  `10-engineering/quality-standards.md`.
- This doc does not define error handling behavior. That is
  `10-engineering/error-handling.md`.
- This doc does not define what to build. It defines how to write
  what is built.