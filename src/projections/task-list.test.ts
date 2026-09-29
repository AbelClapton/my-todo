import { describe, expect, it } from 'vitest';

import type { DateString } from '@/domain/ids';
import type { PayloadFor } from '@/domain/events';
import { INBOX_AREA_ID } from '@/domain/layers/area';
import { createTestLog, taskIdFor, type TestLog } from '@/test-support/log';

import {
  applyTaskList,
  computeTaskList,
  computeTaskListState,
  emptyTaskList,
  scopeOfTask,
} from './task-list';

const TODAY: DateString = '2026-09-28';

type TaskSeed = Omit<PayloadFor<'task.created'>, 'task_id' | 'title' | 'area_id' | 'source'>;

type Fixture = {
  readonly log: TestLog;
  readonly id: (title: string) => string;
};

/**
 * Twelve realistic tasks, chosen so that each scope's *source* is present once
 * and so that the two shapes ADR 0028 was written to fix are both in here: a
 * task whose only date is a deadline (what the parser produces for "call
 * dentist Tuesday"), and a `priority: later` task that no scope used to claim.
 */
async function seed(): Promise<Fixture> {
  const log = createTestLog();
  const ids = new Map<string, string>();
  let n = 0;

  const add = async (title: string, payload: TaskSeed = {}): Promise<void> => {
    const id = taskIdFor(n++);
    ids.set(title, id);
    await log.append({
      type: 'task.created',
      actor: { type: 'user' },
      payload: { task_id: id, title, area_id: INBOX_AREA_ID, source: 'user', ...payload },
    });
  };

  await add('scheduled today', { scheduled_day: TODAY });
  await add('due today', { due: TODAY });
  await add('overdue', { due: '2026-09-20' });
  await add('deferred to today', { defer: TODAY });
  await add('deferred into the past', { defer: '2026-09-21' });
  await add('due friday', { due: '2026-10-02' });
  await add('flagged next', { priority: 'next' });
  await add('flagged later', { priority: 'later' });
  await add('deferred to next week', { defer: '2026-10-05' });
  await add('parked');
  await add('filed away');
  await add('finished');

  await log.append({
    type: 'task.marked_someday',
    actor: { type: 'user' },
    payload: { task_id: ids.get('parked') ?? '' },
  });
  await log.append({
    type: 'task.archived',
    actor: { type: 'user' },
    payload: { task_id: ids.get('filed away') ?? '' },
  });
  await log.append({
    type: 'task.completed',
    actor: { type: 'user' },
    payload: {
      task_id: ids.get('finished') ?? '',
      completed_at: '2026-09-27T10:00:00.000Z',
    },
  });

  return { log, id: (title) => ids.get(title) ?? '' };
}

describe('the four scopes', () => {
  it('partition the tasks that have a scope, with none in two and none in none', async () => {
    const { log } = await seed();
    const state = computeTaskListState(log.entries());
    const open = state.tasks.filter((task) => task.state === 'open');

    const counts = { today: 0, next: 0, someday: 0 };
    for (const task of state.tasks) {
      const scope = scopeOfTask(task, TODAY);
      if (scope === null) continue;
      counts[scope] += 1;
    }

    // `deferred to next week` is *membership* next and *hidden* from Next's
    // list — which is why membership and visibility are asserted separately.
    expect(counts).toEqual({ today: 5, next: 4, someday: 1 });
    expect(open).toHaveLength(9);
  });

  it('puts a due-only task in a scope — the shape ADR 0028 was written for', async () => {
    const { log, id } = await seed();
    const state = computeTaskListState(log.entries());
    const task = state.tasks.find((candidate) => candidate.id === id('due friday'));

    expect(task).toBeDefined();
    expect(scopeOfTask(task!, TODAY)).toBe('next');
  });

  it('claims a `priority: later` task, which no scope used to hold', async () => {
    const { log, id } = await seed();
    const state = computeTaskListState(log.entries());
    const task = state.tasks.find((candidate) => candidate.id === id('flagged later'));

    expect(scopeOfTask(task!, TODAY)).toBe('next');
  });
});

describe('defer is visibility, not membership', () => {
  it('hides a deferred task from Today and Next but never from All', async () => {
    const { log } = await seed();
    const entries = log.entries();

    const next = computeTaskList(entries, { scope: 'next', today: TODAY });
    expect(next.map((row) => row.task.title)).not.toContain('deferred to next week');

    const all = computeTaskList(entries, { scope: 'all', today: TODAY });
    expect(all.map((row) => row.task.title)).toContain('deferred to next week');
  });

  it('ranks overdue first and deferred-past second', async () => {
    const { log } = await seed();
    const today = computeTaskList(log.entries(), { scope: 'today', today: TODAY });

    expect(today[0]?.task.title).toBe('overdue');
    expect(today[1]?.task.title).toBe('deferred into the past');
  });
});

describe('the completion log is a state of All', () => {
  it('returns a recent completion and hides one outside the window', async () => {
    const { log } = await seed();
    await log.append({
      type: 'task.created',
      actor: { type: 'user' },
      payload: {
        task_id: taskIdFor(99),
        title: 'ancient',
        area_id: INBOX_AREA_ID,
        source: 'user',
      },
    });
    await log.append({
      type: 'task.completed',
      actor: { type: 'user' },
      payload: { task_id: taskIdFor(99), completed_at: '2026-07-01T10:00:00.000Z' },
    });

    const completed = computeTaskList(log.entries(), {
      scope: 'all',
      today: TODAY,
      completed: true,
      tz_offset_minutes: 0,
    });

    expect(completed.map((row) => row.task.title)).toEqual(['finished']);

    const wide = computeTaskList(log.entries(), {
      scope: 'all',
      today: TODAY,
      completed: true,
      window_days: 90,
      tz_offset_minutes: 0,
    });
    expect(wide).toHaveLength(2);
  });
});

describe('apply agrees with a fresh fold', () => {
  it('produces the same state incrementally as in one pass', async () => {
    const { log } = await seed();
    const entries = log.entries();

    const incremental = entries.reduce(applyTaskList, emptyTaskList());
    const once = computeTaskListState(entries);

    expect(incremental.tasks).toEqual(once.tasks);
    expect([...incremental.note_targets.entries()]).toEqual([...once.note_targets.entries()]);
  });

  it('is left unchanged by an entry from another domain', async () => {
    const { log } = await seed();
    const state = computeTaskListState(log.entries());

    await log.append({
      type: 'area.renamed',
      actor: { type: 'user' },
      payload: { area_id: INBOX_AREA_ID, name: 'Inbox!' },
    });

    const after = computeTaskListState(log.entries());
    expect(after.tasks).toEqual(state.tasks);
  });
});
