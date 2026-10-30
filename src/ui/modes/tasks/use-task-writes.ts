import { useCallback } from 'react';
import { ulid } from 'ulid';

import type { Task } from '@/domain/atoms/task';
import type { LogEntry } from '@/domain/events';
import type { DateString } from '@/domain/ids';
import type { TaskRescheduledPayload } from '@/domain/events/task';
import { BUILT_IN_AREA_IDS } from '@/domain/layers/area';

import { useLog } from '@/ui/data/use-log';

import { reschedulePayload } from './defer-options';

/**
 * The writes the Tasks mode has.
 *
 * They live apart from the reads so the detail screen does not have to compute a
 * list it will not draw. Every one of them is an `append` and nothing else —
 * there is no local mutation, because the projection is what holds the state
 * (`02-architecture/projections.md`).
 *
 * **Every write has a reversal of the same shape.** `02-architecture/event-log.md`
 * §Compensation is explicit that undo is *"a compensation entry, never a
 * deletion"*, so each mutation here is paired with the event that undoes it
 * rather than with a delete — including the two the defer sheet introduced.
 */

export type TaskWrites = {
  /** False when the log could not be opened, so a write would be lost. */
  readonly canWrite: boolean;
  readonly createTask: (title: string) => Promise<void>;
  readonly completeTask: (taskId: string) => Promise<LogEntry>;
  /**
   * The checkbox is a toggle, so a completed row's tap has to reopen it rather
   * than complete it twice. Not a compensation — the completion it reverses is
   * not the entry this call is about, and undo already has its own path.
   */
  readonly uncompleteTask: (taskId: string) => Promise<LogEntry>;
  readonly undoCompletion: (taskId: string, completedEntryId: string) => Promise<void>;
  /** Sets the defer date, leaving `due` exactly as it was. */
  readonly deferTask: (task: Task, day: DateString) => Promise<LogEntry>;
  /** Re-states a task's temporal pair, which is how a defer is undone. */
  readonly restoreSchedule: (payload: TaskRescheduledPayload) => Promise<LogEntry>;
  /** The sheet's fourth row: a state, not a date (`05-modules/tasks.md`). */
  readonly markSomeday: (taskId: string) => Promise<LogEntry>;
  readonly undoMarkSomeday: (taskId: string) => Promise<LogEntry>;
};

export function useTaskWrites(): TaskWrites {
  const { append, status } = useLog();

  const createTask = useCallback(
    async (title: string): Promise<void> => {
      const trimmed = title.trim();
      if (trimmed === '') {
        return;
      }

      // Capture is **typed only** in Phase 0 — Tier 1 parsing is Phase 3 — and it
      // puts the task in Inbox with **no dates**, which is why a freshly captured
      // task is in `All` and in `Next` and not in `Today`.
      await append({
        type: 'task.created',
        actor: { type: 'user' },
        payload: {
          task_id: ulid(),
          title: trimmed,
          area_id: BUILT_IN_AREA_IDS.inbox,
          source: 'user',
        },
      });
    },
    [append],
  );

  const completeTask = useCallback(
    async (taskId: string): Promise<LogEntry> =>
      append({
        type: 'task.completed',
        actor: { type: 'user' },
        payload: { task_id: taskId, completed_at: new Date().toISOString() },
      }),
    [append],
  );

  const uncompleteTask = useCallback(
    async (taskId: string): Promise<LogEntry> =>
      append({
        type: 'task.uncompleted',
        actor: { type: 'user' },
        payload: { task_id: taskId },
      }),
    [append],
  );

  /**
   * Undo is a **compensation**, never a deletion: a fresh `task.uncompleted`
   * pointing at the completion it reverses, so the original stays in the log and
   * the log keeps growing monotonically (`02-architecture/event-log.md`
   * §Compensation).
   */
  const undoCompletion = useCallback(
    async (taskId: string, completedEntryId: string): Promise<void> => {
      await append({
        type: 'task.uncompleted',
        actor: { type: 'user' },
        compensation_for: completedEntryId,
        payload: { task_id: taskId },
      });
    },
    [append],
  );

  const deferTask = useCallback(
    async (task: Task, day: DateString): Promise<LogEntry> =>
      append({
        type: 'task.rescheduled',
        actor: { type: 'user' },
        payload: reschedulePayload(task, day),
      }),
    [append],
  );

  const restoreSchedule = useCallback(
    async (payload: TaskRescheduledPayload): Promise<LogEntry> =>
      append({ type: 'task.rescheduled', actor: { type: 'user' }, payload }),
    [append],
  );

  const markSomeday = useCallback(
    async (taskId: string): Promise<LogEntry> =>
      append({
        type: 'task.marked_someday',
        actor: { type: 'user' },
        payload: { task_id: taskId },
      }),
    [append],
  );

  const undoMarkSomeday = useCallback(
    async (taskId: string): Promise<LogEntry> =>
      append({
        type: 'task.unmarked_someday',
        actor: { type: 'user' },
        payload: { task_id: taskId },
      }),
    [append],
  );

  return {
    canWrite: status === 'ready',
    createTask,
    completeTask,
    uncompleteTask,
    undoCompletion,
    deferTask,
    restoreSchedule,
    markSomeday,
    undoMarkSomeday,
  };
}
