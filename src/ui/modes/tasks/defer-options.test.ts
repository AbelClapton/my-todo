import { describe, expect, it } from 'vitest';

import type { Task } from '@/domain/atoms/task';
import type { DateString } from '@/domain/ids';

import { deferDateChoices, nextMonday, reschedulePayload } from './defer-options';
import { formatDay } from '@/ui/format';

/** 2026-09-28 is a Monday, which is the case where "next week" could go wrong. */
const MONDAY: DateString = '2026-09-28';
const FRIDAY: DateString = '2026-10-02';
const SUNDAY: DateString = '2026-10-04';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '01J0TASK000000000000000001',
    title: 'File Q4 taxes',
    area_id: '01J0AREA0000000000000000001',
    priority: 'next',
    people: [],
    state: 'open',
    ...overrides,
  } as Task;
}

describe('nextMonday', () => {
  it('skips a week when today is Monday, because next week is not this week', () => {
    expect(nextMonday(MONDAY)).toBe('2026-10-05');
  });

  it('lands three days out from a Friday', () => {
    expect(nextMonday(FRIDAY)).toBe('2026-10-05');
  });

  it('is never today: on a Sunday it is tomorrow', () => {
    expect(nextMonday(SUNDAY)).toBe('2026-10-05');
  });
});

describe('formatDay', () => {
  it('writes the lab’s format', () => {
    expect(formatDay('2026-10-05')).toBe('Mon 5 Oct');
  });
});

describe('deferDateChoices', () => {
  it('resolves both dated rows to the days they name', () => {
    expect(deferDateChoices(MONDAY)).toEqual([
      { key: 'tomorrow', label: 'Tomorrow', day: '2026-09-29', resolved: 'Tue 29 Sep' },
      { key: 'next-week', label: 'Next week', day: '2026-10-05', resolved: 'Mon 5 Oct' },
    ]);
  });
});

describe('reschedulePayload', () => {
  it('keeps the deadline when it sets a defer date', () => {
    expect(reschedulePayload(task({ due: '2026-10-09' }), '2026-09-30')).toEqual({
      task_id: '01J0TASK000000000000000001',
      due: '2026-10-09',
      defer: '2026-09-30',
    });
  });

  it('omits an absent deadline rather than inventing one', () => {
    expect(reschedulePayload(task(), '2026-09-30')).toEqual({
      task_id: '01J0TASK000000000000000001',
      defer: '2026-09-30',
    });
  });

  it('clears the defer date when the snapshot had none, which is the undo', () => {
    expect(reschedulePayload(task({ due: '2026-10-09' }), undefined)).toEqual({
      task_id: '01J0TASK000000000000000001',
      due: '2026-10-09',
    });
  });

  it('restores a defer date that was already set', () => {
    const snapshot = task({ defer: '2026-09-30' });
    expect(reschedulePayload(snapshot, snapshot.defer)).toEqual({
      task_id: '01J0TASK000000000000000001',
      defer: '2026-09-30',
    });
  });
});
