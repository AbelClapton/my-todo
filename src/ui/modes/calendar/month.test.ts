import { describe, expect, it } from 'vitest';

import { createTestLog } from '@/test-support/log';

import { MONTH_CELLS, computeMonthView, markTopPercent } from './month';

/** October 2026 starts on a Thursday, so its grid opens on Monday 28 September. */
const OCTOBER: string = '2026-10-15';

describe('the month grid', () => {
  it('is always six rows of seven, whatever the month needs', async () => {
    const log = createTestLog();
    const month = computeMonthView(log.entries(), { date: OCTOBER, today: OCTOBER });

    expect(month.cells).toHaveLength(MONTH_CELLS);
    expect(MONTH_CELLS).toBe(42);
  });

  it('opens on the Monday of the week holding the first', async () => {
    const log = createTestLog();
    const month = computeMonthView(log.entries(), { date: OCTOBER, today: OCTOBER });

    expect(month.cells[0]?.date).toBe('2026-09-28');
    expect(month.label).toBe('October 2026');
  });

  it('marks the neighbouring months as out of month rather than blanking them', async () => {
    const log = createTestLog();
    const month = computeMonthView(log.entries(), { date: OCTOBER, today: OCTOBER });

    expect(month.cells.filter((cell) => cell.inMonth)).toHaveLength(31);
    // 28–30 September lead the grid, and November fills the tail.
    expect(month.cells[0]?.inMonth).toBe(false);
    expect(month.cells[3]?.inMonth).toBe(true);
  });
});

describe('a mark’s position', () => {
  it('runs on the Week’s window, so the same event sits in the same place', () => {
    expect(markTopPercent('2026-09-28T08:00:00.000Z', '2026-09-28', 0)).toBe(0);
    expect(markTopPercent('2026-09-28T13:00:00.000Z', '2026-09-28', 0)).toBe(50);
    expect(markTopPercent('2026-09-28T18:00:00.000Z', '2026-09-28', 0)).toBe(100);
  });

  it('clamps an event outside the crop to the edge of the cell', () => {
    expect(markTopPercent('2026-09-28T06:00:00.000Z', '2026-09-28', 0)).toBe(0);
    expect(markTopPercent('2026-09-28T22:00:00.000Z', '2026-09-28', 0)).toBe(100);
  });
});
