import { describe, expect, it } from 'vitest';

import { INBOX_AREA_ID } from '@/domain/layers/area';
import { createTestLog, taskIdFor } from '@/test-support/log';

import {
  applyTaskDetail,
  computeTaskDetail,
  computeTaskDetailState,
  emptyTaskDetail,
} from './task-detail';

const PARENT = taskIdFor(1);
const CHILD = taskIdFor(2);
const HABIT = taskIdFor(9);

const user = { type: 'user' } as const;

/** A task with a child, one real note, and three notes that must not appear. */
async function seed() {
  const log = createTestLog();

  await log.append({
    type: 'task.created',
    actor: user,
    payload: { task_id: PARENT, title: 'Plan a birthday', area_id: INBOX_AREA_ID, source: 'user' },
  });
  await log.append({
    type: 'task.created',
    actor: user,
    payload: { task_id: CHILD, title: 'Book the table', area_id: INBOX_AREA_ID, source: 'user' },
  });
  await log.append({
    type: 'task.set_parent',
    actor: user,
    payload: { task_id: CHILD, parent_task_id: PARENT },
  });

  await log.append({
    type: 'note.created',
    actor: user,
    payload: {
      note_id: taskIdFor(10),
      body: 'She mentioned wanting to try pottery.',
      attached_to: { type: 'task', id: PARENT },
    },
  });
  // Attached to a Day, not this task.
  await log.append({
    type: 'note.created',
    actor: user,
    payload: {
      note_id: taskIdFor(11),
      body: 'Felt sharp this morning.',
      attached_to: { type: 'day', id: '2026-09-28' },
    },
  });
  // Attached to this task, then reattached away.
  await log.append({
    type: 'note.created',
    actor: user,
    payload: {
      note_id: taskIdFor(12),
      body: 'Moved off this task.',
      attached_to: { type: 'task', id: PARENT },
    },
  });
  await log.append({
    type: 'note.reattached',
    actor: user,
    payload: {
      note_id: taskIdFor(12),
      from: { type: 'task', id: PARENT },
      to: { type: 'habit', id: HABIT },
    },
  });
  // Attached to this task, then deleted.
  await log.append({
    type: 'note.created',
    actor: user,
    payload: {
      note_id: taskIdFor(13),
      body: 'Gone.',
      attached_to: { type: 'task', id: PARENT },
    },
  });
  await log.append({
    type: 'note.deleted',
    actor: user,
    payload: { note_id: taskIdFor(13) },
  });

  return log;
}

describe('task_detail', () => {
  it('returns the task, its notes and its subtasks', async () => {
    const log = await seed();
    const view = computeTaskDetail(log.entries(), { task_id: PARENT });

    expect(view?.task.title).toBe('Plan a birthday');
    expect(view?.notes).toHaveLength(1);
    expect(view?.notes[0]?.body).toBe('She mentioned wanting to try pottery.');
    expect(view?.children.map((child) => child.id)).toEqual([CHILD]);
  });

  it('returns nothing for an id the log does not hold', async () => {
    const log = await seed();
    expect(computeTaskDetail(log.entries(), { task_id: taskIdFor(77) })).toBeUndefined();
  });

  it('carries the fields a task has, including the estimate', async () => {
    const log = await seed();
    await log.append({
      type: 'task.estimated',
      actor: user,
      payload: { task_id: PARENT, estimated_minutes: 45 },
    });

    const view = computeTaskDetail(log.entries(), { task_id: PARENT });
    expect(view?.task.estimated_minutes).toBe(45);

    // An absent key clears it — the one way to say "not estimated".
    await log.append({ type: 'task.estimated', actor: user, payload: { task_id: PARENT } });
    expect(
      computeTaskDetail(log.entries(), { task_id: PARENT })?.task.estimated_minutes,
    ).toBeUndefined();
  });

  it('agrees with a fresh fold when applied one entry at a time', async () => {
    const log = await seed();
    const entries = log.entries();

    const incremental = entries.reduce(applyTaskDetail, emptyTaskDetail());
    const once = computeTaskDetailState(entries);

    expect(incremental.tasks).toEqual(once.tasks);
    expect(incremental.notes).toEqual(once.notes);
  });
});
