import { useCallback } from 'react';
import { ulid } from 'ulid';

import type { LogEntry } from '@/domain/events';
import { BUILT_IN_AREA_IDS } from '@/domain/layers/area';

import { useLog } from '@/ui/data/use-log';

/**
 * The three writes the Tasks mode has.
 *
 * They live apart from the reads so the detail screen does not have to compute a
 * list it will not draw. Every one of them is an `append` and nothing else —
 * there is no local mutation, because the projection is what holds the state
 * (`02-architecture/projections.md`).
 */

export type TaskWrites = {
  /** False when the log could not be opened, so a write would be lost. */
  readonly canWrite: boolean;
  readonly createTask: (title: string) => Promise<void>;
  readonly completeTask: (taskId: string) => Promise<LogEntry>;
  readonly undoCompletion: (taskId: string, completedEntryId: string) => Promise<void>;
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

  return { canWrite: status === 'ready', createTask, completeTask, undoCompletion };
}
