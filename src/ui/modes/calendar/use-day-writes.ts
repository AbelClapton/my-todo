import { useCallback } from 'react';

import type { LogEntry } from '@/domain/events';
import type { DateString } from '@/domain/ids';

import { useLog } from '@/ui/data/use-log';

/**
 * The Day view's writes.
 *
 * Three of them, and they are the three the view is allowed to make: the habit
 * check on this Day, its reversal, and completing a task from the plan or the
 * top three. **Nothing here edits an event** — an event's detail is its own
 * screen (`05-modules/calendar.md` §Surfaces), and the Day view only ever draws
 * what the Day holds.
 */

export type DayWrites = {
  readonly canWrite: boolean;
  readonly checkHabit: (habitId: string, day: DateString) => Promise<LogEntry>;
  readonly uncheckHabit: (habitId: string, day: DateString) => Promise<LogEntry>;
  readonly completeTask: (taskId: string) => Promise<LogEntry>;
};

export function useDayWrites(): DayWrites {
  const { append, status } = useLog();

  const checkHabit = useCallback(
    async (habitId: string, day: DateString): Promise<LogEntry> =>
      append({
        type: 'habit.checked',
        actor: { type: 'user' },
        payload: { habit_id: habitId, day, version: 'full' },
      }),
    [append],
  );

  const uncheckHabit = useCallback(
    async (habitId: string, day: DateString): Promise<LogEntry> =>
      append({
        type: 'habit.unchecked',
        actor: { type: 'user' },
        payload: { habit_id: habitId, day },
      }),
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

  return { canWrite: status === 'ready', checkHabit, uncheckHabit, completeTask };
}
