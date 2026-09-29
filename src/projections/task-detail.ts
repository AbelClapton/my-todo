import type { Note } from '@/domain/atoms/note';
import type { Task } from '@/domain/atoms/task';
import type { LogEntry } from '@/domain/events';

import { foldLog, type Fold, type Projection } from './framework';
import { applyNoteEntry } from './note-fold';
import { applyTaskEntry } from './task-fold';

/**
 * `task_detail` — a single task with all attributes, its linked notes, and its
 * subtasks (`02-architecture/projections.md`).
 *
 * The fold derives every task and every note, and the selection picks the one
 * asked for. That is deliberate: a projection that filtered the log down to one
 * `task_id` first would have to be told about parent and child entries anyway,
 * and the invalidation table is coarse on purpose.
 */

export type TaskDetailParams = {
  readonly task_id: string;
};

export type TaskDetailState = {
  readonly tasks: readonly Task[];
  readonly notes: readonly Note[];
};

export type TaskDetailView =
  | {
      readonly task: Task;
      /** Not deleted, and attached to this task. */
      readonly notes: readonly Note[];
      /** Subtasks: tasks whose parent is this one. */
      readonly children: readonly Task[];
    }
  | undefined;

export const emptyTaskDetail = (): TaskDetailState => ({ tasks: [], notes: [] });

export function applyTaskDetail(state: TaskDetailState, entry: LogEntry): TaskDetailState {
  const tasks = applyTaskEntry(state.tasks, entry);
  const notes = applyNoteEntry(state.notes, entry);
  if (tasks === state.tasks && notes === state.notes) {
    return state;
  }
  return { tasks, notes };
}

export const taskDetailFold: Fold<TaskDetailState> = {
  empty: emptyTaskDetail(),
  apply: applyTaskDetail,
};

export function computeTaskDetailState(entries: readonly LogEntry[]): TaskDetailState {
  return foldLog(taskDetailFold, entries);
}

export function computeTaskDetail(
  entries: readonly LogEntry[],
  params: TaskDetailParams,
): TaskDetailView {
  return selectTaskDetail(computeTaskDetailState(entries), params);
}

export function selectTaskDetail(state: TaskDetailState, params: TaskDetailParams): TaskDetailView {
  const task = state.tasks.find((candidate) => candidate.id === params.task_id);
  if (task === undefined) {
    return undefined;
  }

  return {
    task,
    notes: state.notes.filter(
      (note) =>
        !note.deleted && note.attached_to.type === 'task' && note.attached_to.id === task.id,
    ),
    children: state.tasks.filter((candidate) => candidate.parent_task_id === task.id),
  };
}

export const taskDetailProjection: Projection<TaskDetailState, TaskDetailParams, TaskDetailView> = {
  name: 'task_detail',
  fold: taskDetailFold,
  compute: computeTaskDetail,
};
