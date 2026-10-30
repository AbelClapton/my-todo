import { describe, expect, it } from 'vitest';

import { cadenceSchedules, weekdayOf } from './cadence';
import type { Cadence } from './events/habit';
import type { DateString } from './ids';

/** 2026-09-28 is a Monday. */
const MONDAY: DateString = '2026-09-28';
const CREATED: DateString = '2026-09-25';

describe('weekdayOf', () => {
  it('names the weekday of a Day', () => {
    expect(weekdayOf(MONDAY)).toBe('mon');
    expect(weekdayOf('2026-10-04')).toBe('sun');
  });
});

describe('a daily cadence', () => {
  it('schedules every day from creation', () => {
    const cadence = { type: 'daily' } as const;
    expect(cadenceSchedules(cadence, CREATED, MONDAY)).toBe(true);
  });

  it('schedules nothing before the habit existed', () => {
    expect(cadenceSchedules({ type: 'daily' }, CREATED, '2026-09-24')).toBe(false);
  });
});

describe('a weekly cadence', () => {
  const monday: Cadence = { type: 'weekly', days: ['mon'] };

  it('schedules the named weekday', () => {
    expect(cadenceSchedules(monday, CREATED, MONDAY)).toBe(true);
  });

  it('schedules nothing on the others', () => {
    expect(cadenceSchedules(monday, CREATED, '2026-09-29')).toBe(false);
  });
});

describe('an interval cadence', () => {
  it('counts whole days from creation, which is the anchor the log has', () => {
    const everyThreeDays = { type: 'interval', every: 3, unit: 'day' } as const;
    expect(cadenceSchedules(everyThreeDays, CREATED, CREATED)).toBe(true);
    expect(cadenceSchedules(everyThreeDays, CREATED, '2026-09-26')).toBe(false);
    expect(cadenceSchedules(everyThreeDays, CREATED, '2026-09-27')).toBe(false);
    expect(cadenceSchedules(everyThreeDays, CREATED, MONDAY)).toBe(true);
  });

  it('counts weeks as seven days each', () => {
    const fortnightly = { type: 'interval', every: 2, unit: 'week' } as const;
    expect(cadenceSchedules(fortnightly, CREATED, MONDAY)).toBe(false);
    expect(cadenceSchedules(fortnightly, CREATED, '2026-10-09')).toBe(true);
  });
});
