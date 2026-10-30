import { describe, expect, it } from 'vitest';

import type { DateString } from '@/domain/ids';
import { INBOX_AREA_ID } from '@/domain/layers/area';
import { createTestLog } from '@/test-support/log';

import { computeWeekView, hasConflict, weekStartOf } from './week';

/** 2026-09-28 is a Monday; 2026-10-04 is the Sunday that closes its week. */
const MONDAY: DateString = '2026-09-28';
const SUNDAY: DateString = '2026-10-04';

describe('weekStartOf', () => {
  it('is the Monday, from any day in the week', () => {
    expect(weekStartOf(MONDAY)).toBe(MONDAY);
    expect(weekStartOf('2026-09-30')).toBe(MONDAY);
  });

  it('puts Sunday at the end of the week, not the start', () => {
    expect(weekStartOf(SUNDAY)).toBe(MONDAY);
  });
});

describe('computeWeekView', () => {
  it('spans seven days and labels the range', async () => {
    const log = createTestLog();
    const week = computeWeekView(log.entries(), { date: '2026-10-01', today: MONDAY });

    expect(week.days).toHaveLength(7);
    expect(week.start).toBe(MONDAY);
    expect(week.label).toBe('Week 40 · 28 Sep–4 Oct');
    expect(week.days.map((day) => day.weekday)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('marks the Day the clock is in, and only that one', async () => {
    const log = createTestLog();
    const week = computeWeekView(log.entries(), { date: MONDAY, today: '2026-09-30' });

    expect(week.days.filter((day) => day.isToday).map((day) => day.date)).toEqual(['2026-09-30']);
  });

  it('draws an event that covers two days in the band, which only a week can show', async () => {
    const log = createTestLog();
    await log.append({
      type: 'calendar.created',
      actor: { type: 'user' },
      payload: {
        event_id: '01J0TASK000000000000000020',
        title: 'Night shift',
        start: '2026-09-28T22:00:00.000Z',
        end: '2026-09-29T06:00:00.000Z',
        all_day: false,
        day: MONDAY,
      },
    });

    const week = computeWeekView(log.entries(), { date: MONDAY, today: MONDAY });
    expect(week.days[0]?.allDay.map((event) => event.title)).toEqual(['Night shift']);
    expect(week.days[0]?.events).toEqual([]);
  });

  it('counts the day’s open tasks and habits', async () => {
    const log = createTestLog();
    await log.append({
      type: 'task.created',
      actor: { type: 'user' },
      payload: {
        task_id: '01J0TASK000000000000000021',
        title: 'Standup notes',
        area_id: INBOX_AREA_ID,
        scheduled_day: MONDAY,
        scheduled_time: '09:30',
        source: 'user',
      },
    });

    const week = computeWeekView(log.entries(), { date: MONDAY, today: MONDAY });
    expect(week.days[0]?.tasksDue).toBe(1);
    expect(week.days[0]?.points).toHaveLength(1);
  });
});

describe('hasConflict', () => {
  const mark = (startMinutes: number, endMinutes: number) => ({ startMinutes, endMinutes });

  it('marks both blocks when two overlap', () => {
    const marks = [mark(60, 90), mark(75, 105)];
    expect(hasConflict(marks, 0)).toBe(true);
    expect(hasConflict(marks, 1)).toBe(true);
  });

  it('marks neither when they merely touch', () => {
    const marks = [mark(60, 90), mark(90, 120)];
    expect(hasConflict(marks, 0)).toBe(false);
  });
});
