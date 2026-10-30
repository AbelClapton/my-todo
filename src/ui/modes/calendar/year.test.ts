import { describe, expect, it } from 'vitest';

import type { DateString } from '@/domain/ids';
import { createTestLog, taskIdFor } from '@/test-support/log';

import { computeYearView } from './year';

/**
 * The Year's two load-bearing rules: **twelve equal rows on one shared scale**, and
 * a quiet day that still marks its place.
 */

const TODAY: DateString = '2026-09-28';

async function seed() {
  const log = createTestLog({ startAt: '2026-09-01T08:00:00.000Z' });
  const user = { type: 'user' } as const;

  const event = async (n: number, start: string) => {
    await log.append({
      type: 'calendar.created',
      actor: user,
      payload: {
        event_id: taskIdFor(n),
        title: `Event ${n}`,
        start,
        end: start,
        all_day: false,
        day: start.slice(0, 10) as DateString,
      },
    });
  };

  // Three on one day, one on another, and nothing anywhere else.
  await event(1, '2026-09-28T09:00:00.000Z');
  await event(2, '2026-09-28T13:00:00.000Z');
  await event(3, '2026-09-28T17:00:00.000Z');
  await event(4, '2026-03-02T09:00:00.000Z');

  return log;
}

describe('year_view', () => {
  it('draws twelve rows, labelled, with the days in calendar order', async () => {
    const log = await seed();
    const year = computeYearView(log.entries(), { date: TODAY, today: TODAY });

    expect(year.year).toBe(2026);
    expect(year.months.map((month) => month.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    // No weekday alignment: a month's strip is its days, first to last.
    expect(year.months[0]?.days[0]?.date).toBe('2026-01-01');
    expect(year.months[1]?.days).toHaveLength(28);
    expect(year.months[8]?.days).toHaveLength(30);
  });

  it('normalises every day against the busiest day of the year', async () => {
    const log = await seed();
    const year = computeYearView(log.entries(), { date: TODAY, today: TODAY });

    expect(year.maxLoad).toBe(3);
    const september = year.months[8];
    const busy = september?.days.find((day) => day.date === '2026-09-28');
    expect(busy?.load).toBe(3);
    expect(busy?.heightPercent).toBe(100);

    // The same scale across months: one event in March is a third of the ridge.
    const march = year.months[2]?.days.find((day) => day.date === '2026-03-02');
    expect(march?.heightPercent).toBeCloseTo(100 / 3);

    // A quiet day has no height at all, and the screen draws its baseline.
    expect(september?.days.find((day) => day.date === '2026-09-27')?.heightPercent).toBe(0);
  });

  it('totals each month and accents only the current one', async () => {
    const log = await seed();
    const year = computeYearView(log.entries(), { date: TODAY, today: TODAY });

    expect(year.months[8]?.total).toBe(3);
    expect(year.months[2]?.total).toBe(1);
    expect(year.months[0]?.total).toBe(0);
    expect(year.months.filter((month) => month.isCurrent).map((month) => month.label)).toEqual([
      'Sep',
    ]);
  });

  it('marks today in the strip, and marks it in no other year', async () => {
    const log = await seed();
    const y2026 = computeYearView(log.entries(), { date: TODAY, today: TODAY });
    expect(y2026.months.flatMap((month) => month.days).filter((day) => day.isToday)).toHaveLength(
      1,
    );

    const y2027 = computeYearView(log.entries(), { date: '2027-05-04', today: TODAY });
    expect(y2027.months.flatMap((month) => month.days).some((day) => day.isToday)).toBe(false);
    expect(y2027.months.some((month) => month.isCurrent)).toBe(false);
  });

  it('survives a year with nothing in it', async () => {
    const log = createTestLog({ startAt: '2026-09-01T08:00:00.000Z' });
    const year = computeYearView(log.entries(), { date: TODAY, today: TODAY });

    expect(year.maxLoad).toBe(0);
    expect(year.months).toHaveLength(12);
    // Every day is on the floor rather than dividing by zero.
    expect(year.months.flatMap((month) => month.days).every((day) => day.heightPercent === 0)).toBe(
      true,
    );
  });
});
