import { describe, expect, it } from 'vitest';

import type { DateString } from '@/domain/ids';
import { INBOX_AREA_ID } from '@/domain/layers/area';
import { createTestLog, taskIdFor } from '@/test-support/log';

import { computeNowLine, NOTHING_SCHEDULED } from './now-line';

const TODAY: DateString = '2026-09-28';
const user = { type: 'user' } as const;

async function logWith(configure: (log: ReturnType<typeof createTestLog>) => Promise<void>) {
  const log = createTestLog({ startAt: '2026-09-28T08:00:00.000Z' });
  await configure(log);
  return log;
}

function task(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'task.created' as const,
    actor: user,
    payload: { task_id: id, title, area_id: INBOX_AREA_ID, source: 'user' as const, ...extra },
  };
}

function event(id: string, title: string, start: string, end?: string) {
  return {
    type: 'calendar.created' as const,
    actor: user,
    payload: {
      event_id: id,
      title,
      start,
      all_day: false,
      day: TODAY,
      ...(end === undefined ? {} : { end }),
    },
  };
}

describe('now_line', () => {
  it('names the event in progress first', async () => {
    const log = await logWith(async (log) => {
      await log.append(
        event(taskIdFor(20), 'Retro', '2026-09-28T09:40:00.000Z', '2026-09-28T10:20:00.000Z'),
      );
      await log.append(task(taskIdFor(1), 'File Q4 taxes'));
    });

    const line = computeNowLine(log.entries(), { now: '2026-09-28T10:00:00.000Z', date: TODAY });
    expect(line.kind).toBe('event');
    expect(line.label).toBe('Retro (in progress)');
  });

  it('counts down to the next event when it is within two hours', async () => {
    const log = await logWith(async (log) => {
      await log.append(event(taskIdFor(20), 'Design review', '2026-09-28T10:18:00.000Z'));
    });

    const line = computeNowLine(log.entries(), { now: '2026-09-28T10:00:00.000Z', date: TODAY });
    expect(line.label).toBe('Design review in 18 min');
  });

  it('skips an event that is more than two hours out and uses the next task instead', async () => {
    const log = await logWith(async (log) => {
      await log.append(event(taskIdFor(20), 'Offsite', '2026-09-28T14:00:00.000Z'));
      await log.append(
        task(taskIdFor(1), 'Standup notes', { scheduled_day: TODAY, scheduled_time: '10:30' }),
      );
    });

    const line = computeNowLine(log.entries(), { now: '2026-09-28T10:00:00.000Z', date: TODAY });
    expect(line.label).toBe('Standup notes at 10:30');
  });

  it('falls back to the top-priority open task of the day', async () => {
    const log = await logWith(async (log) => {
      await log.append(
        task(taskIdFor(1), 'Later thing', { scheduled_day: TODAY, priority: 'later' }),
      );
      await log.append(task(taskIdFor(2), 'Now thing', { scheduled_day: TODAY, priority: 'now' }));
    });

    const line = computeNowLine(log.entries(), { now: '2026-09-28T10:00:00.000Z', date: TODAY });
    expect(line.label).toBe('Now thing');
  });

  it('says so when the day holds nothing', async () => {
    const log = await logWith(async () => undefined);

    const line = computeNowLine(log.entries(), { now: '2026-09-28T10:00:00.000Z', date: TODAY });
    expect(line).toEqual({ kind: 'empty', label: NOTHING_SCHEDULED });
  });
});
