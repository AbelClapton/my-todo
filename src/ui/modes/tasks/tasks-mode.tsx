import { useCallback, useRef, useState, type FormEvent } from 'react';

import type { TaskListRow, TaskScope } from '@/projections/task-list';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';

import { EMPTY_STATES, type EmptyState } from './empty-states';
import { TaskRow } from './task-row';
import { TOAST_HOLDS, Toast } from './toast';
import { useTaskWrites } from './use-task-writes';
import { useAreaNames, useTasks } from './use-tasks';

/**
 * The Tasks mode: four scopes, a capture field, and the list.
 *
 * `05-modules/tasks.md`'s invariant for the module is that it is *"a list of
 * things with a completion state"* rather than a project manager, and the two
 * things this screen must never do are implied by its empty states — offer an
 * action where there is nothing to repair, and read as a prompt to fill the
 * Someday pile.
 */

const SCOPES: readonly TaskScope[] = ['today', 'next', 'someday', 'all'];

const SCOPE_LABELS: Readonly<Record<TaskScope, string>> = {
  today: 'Today',
  next: 'Next',
  someday: 'Someday',
  all: 'All',
};

type ToastState = {
  readonly message: string;
  readonly holdMs: number;
  readonly undo?: { readonly taskId: string; readonly entryId: string };
};

/**
 * What to say when there is no durable storage — and it is two different things.
 *
 * The second is the one worth naming. OPFS allows **one access handle per file**,
 * so a second tab cannot open the log and neither can a reload that arrives
 * before the previous document has let go. "This browser gave the app no
 * storage" would be false in that case and would send the user looking for a
 * setting; naming the tab tells them what to do about it.
 */
const STORAGE_NOTICES: Readonly<Record<'no_opfs' | 'in_use', string>> = {
  no_opfs: 'This browser gave the app no storage, so the log will not survive a reload.',
  in_use: 'Another tab of this app has the log open, so this tab’s log will not survive a reload.',
};

export function TasksMode() {
  const [scope, setScope] = useState<TaskScope>('today');
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  const { rows } = useTasks(scope);
  const areaName = useAreaNames();
  const { storageReason } = useLog();
  const { canWrite, createTask, completeTask, undoCompletion } = useTaskWrites();

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleCapture = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canWrite) {
        return;
      }
      await createTask(draft);
      setDraft('');
      // The confirmation toast: a two-second hold and **no action**, because
      // there is nothing to undo (`03-experience/components.md`).
      setToast({ message: 'Captured to Inbox', holdMs: TOAST_HOLDS.confirm });
    },
    [canWrite, createTask, draft],
  );

  const handleComplete = useCallback(
    async (row: TaskListRow) => {
      const entry = await completeTask(row.task.id);
      // "Completed. Undo?" is the copy `06-flows/completion.md` specifies for the
      // five-second undo toast, which is how Invariant 1 holds: every completion
      // is undoable, and the undo is a compensation rather than a deletion.
      setToast({
        message: 'Completed. Undo?',
        holdMs: TOAST_HOLDS.undo,
        undo: { taskId: row.task.id, entryId: entry.id },
      });
    },
    [completeTask],
  );

  const handleUndo = useCallback(async () => {
    const undo = toast?.undo;
    if (undo === undefined) {
      return;
    }
    await undoCompletion(undo.taskId, undo.entryId);
    setToast(null);
  }, [toast, undoCompletion]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-6 px-space-5 py-space-8">
      <h1 className="text-type-title-1 text-text-primary">Tasks</h1>

      <ScopeControl scope={scope} onChange={setScope} />

      <form onSubmit={handleCapture} className="flex items-center gap-space-3">
        <input
          ref={captureRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Capture a task"
          placeholder="Capture something"
          disabled={!canWrite}
          className={`h-control-lg min-w-0 flex-1 rounded-md border border-border-default bg-bg-sunken px-space-5 text-type-body text-text-primary placeholder:text-text-muted disabled:text-text-disabled ${FOCUS_RING}`}
        />
        <button
          type="submit"
          disabled={!canWrite || draft.trim() === ''}
          className={`h-control-lg shrink-0 rounded-md border border-transparent bg-accent-default px-space-5 text-type-subhead text-on-fill disabled:bg-surface-3 disabled:text-text-disabled ${FOCUS_RING}`}
        >
          Add
        </button>
      </form>

      {storageReason === 'ok' ? null : (
        // A status line, not a repair: nothing is failing and nothing can be
        // retried. It exists because a log that empties on reload looks
        // identical to one that does not, right up until it matters.
        //
        // The log stays `ok` until it has actually asked for storage, so this
        // says nothing while the WASM compiles. An earlier version keyed on "not
        // persistent" and accused the browser of having no storage before the
        // question had been put to it.
        <p className="text-type-footnote text-text-muted">{STORAGE_NOTICES[storageReason]}</p>
      )}

      {rows.length === 0 ? (
        <EmptyStateBlock
          state={EMPTY_STATES[scope]}
          isToday={scope === 'today'}
          onAction={() => captureRef.current?.focus()}
        />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <TaskRow
              key={row.task.id}
              row={row}
              areaName={areaName(row.task.area_id)}
              onToggleDone={() => {
                void handleComplete(row);
              }}
            />
          ))}
        </ul>
      )}

      {toast === null ? null : (
        <Toast
          message={toast.message}
          holdMs={toast.holdMs}
          onDismiss={dismissToast}
          {...(toast.undo === undefined
            ? {}
            : {
                actionLabel: 'Undo',
                onAction: () => {
                  void handleUndo();
                },
              })}
        />
      )}
    </main>
  );
}

/**
 * A segmented control at `control-sm` (`03-experience/components.md`).
 *
 * The **visual** pill is `control-sm` (32px) and the **hit area** is
 * `touch-min` (44px), which is how the token doc says a control smaller than the
 * minimum is handled: "padding or a transparent hit area fills the difference".
 * Both live here as two elements because one element cannot be two heights.
 */
function ScopeControl({
  scope,
  onChange,
}: {
  readonly scope: TaskScope;
  readonly onChange: (next: TaskScope) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Scope" className="flex items-center gap-space-2">
      {SCOPES.map((option) => {
        const isSelected = option === scope;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option)}
            className={`flex min-h-touch-min min-w-touch-min flex-1 items-center justify-center rounded-sm border border-transparent px-space-2 ${FOCUS_RING}`}
          >
            <span
              className={
                isSelected
                  ? 'flex h-control-sm w-full items-center justify-center rounded-sm bg-surface-3 text-type-subhead text-text-primary'
                  : 'flex h-control-sm w-full items-center justify-center rounded-sm text-type-subhead text-text-secondary'
              }
            >
              {SCOPE_LABELS[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The form is `03-experience/states.md`'s: a `type-display` headline, one line in
 * `text-secondary`, one action, `space-10` padding, static, and no glyph.
 *
 * The action **repairs the cause of the emptiness**, which is why the Someday
 * pile renders none: an empty parking lot is an answer, not a dead end, so there
 * is nothing to repair and offering *Capture something* there would be the one
 * thing that scope must never do.
 */
function EmptyStateBlock({
  state,
  isToday,
  onAction,
}: {
  readonly state: EmptyState;
  readonly isToday: boolean;
  readonly onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-space-4 p-space-10 text-center">
      <p className="text-type-display text-text-primary">{state.headline}</p>
      <p className="max-w-prose text-type-body text-text-secondary">{state.detail}</p>
      {isToday ? (
        // Today's detail line is deliberate: capture puts a task in Inbox, not
        // on today, so the line says what actually puts one here.
        <p className="text-type-footnote text-text-muted">
          Capture puts a task in Inbox, not on today.
        </p>
      ) : null}
      {state.action === 'capture' ? (
        <button
          type="button"
          onClick={onAction}
          className={`h-control-md rounded-md border border-transparent bg-accent-default px-space-5 text-type-subhead text-on-fill ${FOCUS_RING}`}
        >
          Capture something
        </button>
      ) : null}
    </div>
  );
}
