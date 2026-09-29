import { describe, expect, it } from 'vitest';

import { ordered, type LogEntry } from '@/domain/events';
import { INBOX_AREA_ID } from '@/domain/layers/area';
import { computeTaskListState } from '@/projections/task-list';
import { createTestLog, taskIdFor, TEST_DEVICE_ID } from '@/test-support/log';

const user = { type: 'user' } as const;
const TASK = taskIdFor(1);

async function createTask(log: ReturnType<typeof createTestLog>): Promise<void> {
  await log.append({
    type: 'task.created',
    actor: user,
    payload: { task_id: TASK, title: 'Buy desk', area_id: INBOX_AREA_ID, source: 'user' },
  });
}

describe('append', () => {
  it('assigns id, timestamp, device and a per-device seq starting at 1', async () => {
    const log = createTestLog();
    await createTask(log);
    await log.append({
      type: 'task.renamed',
      actor: user,
      payload: { task_id: TASK, title: 'Buy a standing desk' },
    });

    const [first, second] = log.entries();
    expect(first?.seq).toBe(1);
    expect(second?.seq).toBe(2);
    expect(first?.device_id).toBe(TEST_DEVICE_ID);
    expect(first?.timestamp).toBe('2026-09-28T09:00:00.000Z');
    expect(second?.timestamp).toBe('2026-09-28T09:00:01.000Z');
    expect(first?.schema_version).toBe(1);
    // Routing is absent, not false: the default is `true` (ADR 0008's opt-in).
    expect(first?.sync).toBeUndefined();
  });

  it('rejects an invalid payload and writes nothing', async () => {
    const log = createTestLog();
    await expect(
      log.append({
        type: 'task.created',
        actor: user,
        payload: { task_id: 'not-a-ulid', title: 'x', area_id: INBOX_AREA_ID, source: 'user' },
      }),
    ).rejects.toThrow();

    expect(log.entries()).toHaveLength(0);
  });

  it('records `sync: false` for a local-only entry', async () => {
    const log = createTestLog();
    await createTask(log);
    const note = await log.append({
      type: 'note.created',
      actor: user,
      sync: false,
      payload: {
        note_id: taskIdFor(50),
        body: 'Local only.',
        attached_to: { type: 'task', id: TASK },
      },
    });

    expect(note.sync).toBe(false);
  });
});

describe('compensation', () => {
  it('leaves the original in the log and the task open', async () => {
    const log = createTestLog();
    await createTask(log);
    const completed = await log.append({
      type: 'task.completed',
      actor: user,
      payload: { task_id: TASK, completed_at: '2026-09-28T10:00:00.000Z' },
    });

    await log.append({
      type: 'task.uncompleted',
      actor: user,
      compensation_for: completed.id,
      payload: { task_id: TASK },
    });

    // Both entries exist: the log is append-only and undo is never a deletion.
    expect(log.entries()).toHaveLength(3);
    const state = computeTaskListState(log.entries());
    expect(state.tasks[0]?.state).toBe('open');
    expect(state.tasks[0]?.completed_at).toBeUndefined();
  });

  it('refuses to compensate a compensation', async () => {
    const log = createTestLog();
    await createTask(log);
    const completed = await log.append({
      type: 'task.completed',
      actor: user,
      payload: { task_id: TASK, completed_at: '2026-09-28T10:00:00.000Z' },
    });
    const undone = await log.append({
      type: 'task.uncompleted',
      actor: user,
      compensation_for: completed.id,
      payload: { task_id: TASK },
    });

    await expect(
      log.append({
        type: 'task.completed',
        actor: user,
        compensation_for: undone.id,
        payload: { task_id: TASK, completed_at: '2026-09-28T11:00:00.000Z' },
      }),
    ).rejects.toThrow(/itself a compensation/);
  });
});

describe('ordering', () => {
  it('breaks a timestamp tie by device_id, then by seq', () => {
    const make = (device: string, seq: number): LogEntry =>
      ({
        id: `${device}-${seq}`,
        type: 'task.deleted',
        timestamp: '2026-09-28T09:00:00.000Z',
        actor: { type: 'user' },
        payload: { task_id: TASK },
        schema_version: 1,
        device_id: device,
        seq,
      }) as LogEntry;

    const orderedEntries = ordered([make('b-device', 1), make('a-device', 2), make('a-device', 1)]);

    expect(orderedEntries.map((entry) => `${entry.device_id}:${entry.seq}`)).toEqual([
      'a-device:1',
      'a-device:2',
      'b-device:1',
    ]);
  });
});
