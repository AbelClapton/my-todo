import { describe, expect, it } from 'vitest';

import { addDays, dayAt, daysBetween, isoWeekNumber, localDayOf } from './day';
import type { Instant } from './ids';

/**
 * The boundary is the subtle part: ADR 0027 records it on `day.opened` because
 * "which Day is it" is not derivable from the clock alone.
 */
describe('the Day boundary', () => {
  it('puts 02:00 on the previous Day at the 4am boundary', () => {
    const at2am = '2026-09-28T02:00:00.000Z' as Instant;

    expect(dayAt(at2am, 0, 4)).toBe('2026-09-27');
    expect(dayAt(at2am, 0, 0)).toBe('2026-09-28');
  });

  it('puts 05:00 on the same Day at the 4am boundary', () => {
    expect(dayAt('2026-09-28T05:00:00.000Z' as Instant, 0, 4)).toBe('2026-09-28');
  });

  it('reads the offset as minutes east of UTC', () => {
    // 01:00 in America/New_York (-300) is already 2026-09-28 there.
    expect(localDayOf('2026-09-28T05:00:00.000Z' as Instant, -300)).toBe('2026-09-28');
    expect(localDayOf('2026-09-28T02:00:00.000Z' as Instant, -300)).toBe('2026-09-27');
  });
});

describe('Day arithmetic', () => {
  it('counts whole calendar days across a month end', () => {
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
    expect(daysBetween('2026-10-05', '2026-09-28')).toBe(-7);
  });

  it('adds and subtracts days', () => {
    expect(addDays('2026-09-28', 1)).toBe('2026-09-29');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});

describe('the ISO week number', () => {
  it('numbers the week that holds the Day’s Thursday', () => {
    expect(isoWeekNumber('2026-09-28')).toBe(40);
    expect(isoWeekNumber('2026-10-04')).toBe(40);
    expect(isoWeekNumber('2026-10-05')).toBe(41);
  });

  it('gives the first days of January the previous year’s last week', () => {
    // 2026-01-01 is a Thursday, so it opens week 1 — and 2025-12-29 belongs to it.
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2025-12-29')).toBe(1);
  });
});
