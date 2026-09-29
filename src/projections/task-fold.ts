import type { Task } from '@/domain/atoms/task';
import type { LogEntry, PayloadFor } from '@/domain/events';
import { withOptional } from '@/domain/optional';

/**
 * The Task fold. `task_list` and `task_detail` are two shapes over the same
 * derived state, so the mutation logic lives here once — a projection that
 * re-implemented half of it is how two views come to disagree about what
 * "completed" means.
 */

/**
 * The priority a task lands with when nothing said otherwise.
 *
 * The docs do not state a default, and the field is required on the atom. Of
 * the three, `now` draws the row's indicator and `next` reads as a flag, so
 * `later` is the one that means "captured, not flagged".
 */
const DEFAULT_PRIORITY = 'later';

export function taskFromCreated(payload: PayloadFor<'task.created'>): Task {
  const task: Task = {
    id: payload.task_id,
    title: payload.title,
    area_id: payload.area_id,
    priority: payload.priority ?? DEFAULT_PRIORITY,
    people: [],
    state: 'open',
  };
  return withOptional(task, {
    due: payload.due,
    defer: payload.defer,
    scheduled_day: payload.scheduled_day,
    scheduled_time: payload.scheduled_time,
    estimated_minutes: payload.estimated_minutes,
  });
}

type TaskPatch = (task: Task) => Partial<{ [K in keyof Task]: Task[K] | undefined }>;

function patchTask(tasks: readonly Task[], taskId: string, patch: TaskPatch): readonly Task[] {
  return tasks.map((task) => (task.id === taskId ? withOptional(task, patch(task)) : task));
}

export function applyTaskEntry(tasks: readonly Task[], entry: LogEntry): readonly Task[] {
  switch (entry.type) {
    case 'task.created':
      return [...tasks, taskFromCreated(entry.payload)];

    case 'task.renamed': {
      const { task_id, title } = entry.payload;
      return patchTask(tasks, task_id, () => ({ title }));
    }

    case 'task.rescheduled': {
      // Both keys are always present in the patch, so an absent one *clears* —
      // which is what `task.rescheduled` means by "the entry that owns them".
      const { task_id, due, defer } = entry.payload;
      return patchTask(tasks, task_id, () => ({ due, defer }));
    }

    case 'task.scheduled_to_day': {
      const { task_id, day, time } = entry.payload;
      // Setting, changing and clearing the hour are one type with three
      // payloads: absent `time` is "belongs to the day, not placed in it".
      return patchTask(tasks, task_id, () => ({ scheduled_day: day, scheduled_time: time }));
    }

    case 'task.unscheduled_from_day': {
      const { task_id } = entry.payload;
      // The payload's `day` is the guard the surface held; the fold does not
      // need it, because a task has at most one scheduled day.
      return patchTask(tasks, task_id, () => ({
        scheduled_day: undefined,
        scheduled_time: undefined,
      }));
    }

    case 'task.reassigned_area': {
      const { task_id, area_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ area_id }));
    }

    case 'task.linked_person': {
      const { task_id, person_id } = entry.payload;
      return patchTask(tasks, task_id, (task) => ({
        people: task.people.includes(person_id) ? task.people : [...task.people, person_id],
      }));
    }

    case 'task.unlinked_person': {
      const { task_id, person_id } = entry.payload;
      return patchTask(tasks, task_id, (task) => ({
        people: task.people.filter((id) => id !== person_id),
      }));
    }

    case 'task.set_parent': {
      const { task_id, parent_task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ parent_task_id }));
    }

    case 'task.cleared_parent': {
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ parent_task_id: undefined }));
    }

    case 'task.priority_changed': {
      const { task_id, priority } = entry.payload;
      return patchTask(tasks, task_id, () => ({ priority }));
    }

    case 'task.estimated': {
      const { task_id, estimated_minutes } = entry.payload;
      // Absent clears: an absent key is the one way to say "not estimated".
      return patchTask(tasks, task_id, () => ({ estimated_minutes }));
    }

    case 'task.completed': {
      const { task_id, completed_at, note } = entry.payload;
      return patchTask(tasks, task_id, () => ({
        state: 'completed',
        completed_at,
        completion_note: note,
      }));
    }

    case 'task.uncompleted': {
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({
        state: 'open',
        completed_at: undefined,
        completion_note: undefined,
      }));
    }

    case 'task.marked_someday': {
      const { task_id } = entry.payload;
      // Deliberately does not clear a due date. `Next` is the complement of
      // Today and Someday (ADR 0028), and what a `someday` task with a due date
      // does is an open item ADR 0028 records rather than settles.
      return patchTask(tasks, task_id, () => ({ state: 'someday' }));
    }

    case 'task.unmarked_someday': {
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ state: 'open' }));
    }

    case 'task.archived': {
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ state: 'archived' }));
    }

    case 'task.unarchived': {
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ state: 'open' }));
    }

    case 'task.deleted': {
      // A tombstone: the entry stays in the log, the projection stops showing
      // the task.
      const { task_id } = entry.payload;
      return patchTask(tasks, task_id, () => ({ state: 'deleted' }));
    }

    default:
      return tasks;
  }
}
