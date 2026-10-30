import { describe, expect, it } from 'vitest';

import {
  BLOCK_FLOOR_PX,
  HOUR_HEIGHT_PX,
  heightFor,
  hourLabels,
  layoutAxis,
  midnightTopPx,
  minutesSinceBoundary,
  type AxisItem,
} from './timeline';

function item(id: string, startMinutes: number, durationMinutes: number): AxisItem {
  return { id, kind: 'event', title: id, startMinutes, durationMinutes };
}

describe('minutesSinceBoundary', () => {
  it('counts from a local boundary, not from midnight UTC', () => {
    // 09:00 UTC on a 4am-boundary Day at UTC+0 is 300 minutes in.
    expect(minutesSinceBoundary('2026-09-28T09:00:00.000Z', '2026-09-28', 4, 0)).toBe(300);
  });

  it('moves with the timezone offset', () => {
    // The same instant is 10:00 local at UTC+1, which is 360 minutes past 04:00.
    expect(minutesSinceBoundary('2026-09-28T09:00:00.000Z', '2026-09-28', 4, 60)).toBe(360);
  });
});

describe('heightFor', () => {
  it('draws an hour at the axis scale', () => {
    expect(heightFor(60)).toBe(HOUR_HEIGHT_PX);
  });

  it('gives a five-minute item the floor, because 4.6px cannot hold its name', () => {
    expect(heightFor(5)).toBe(BLOCK_FLOOR_PX);
  });
});

describe('layoutAxis', () => {
  it('keeps items that do not touch in separate clusters', () => {
    const clusters = layoutAxis([item('a', 60, 30), item('b', 120, 30)]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]?.marks[0]?.lanes).toBe(1);
  });

  it('splits two concurrent items into halves', () => {
    const clusters = layoutAxis([item('a', 60, 60), item('b', 90, 60)]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.marks.map((mark) => mark.lane)).toEqual([0, 1]);
    expect(clusters[0]?.marks.every((mark) => mark.lanes === 2)).toBe(true);
  });

  it('splits three into thirds', () => {
    const clusters = layoutAxis([item('a', 60, 60), item('b', 60, 60), item('c', 60, 60)]);
    expect(clusters[0]?.marks.map((mark) => mark.lanes)).toEqual([3, 3, 3]);
  });

  it('collapses four or more into one block plus a count', () => {
    const clusters = layoutAxis([
      item('a', 60, 60),
      item('b', 60, 60),
      item('c', 60, 60),
      item('d', 60, 60),
    ]);
    expect(clusters[0]?.marks).toHaveLength(1);
    expect(clusters[0]?.overflow).toBe(3);
  });

  it('treats the floor as touching, which is the second case of the same rule', () => {
    // Two five-minute items twenty minutes apart are drawn adjacent.
    const clusters = layoutAxis([item('a', 60, 5), item('b', 80, 5)]);
    expect(clusters).toHaveLength(1);
  });
});

describe('the axis labels', () => {
  it('start at the boundary and wrap past midnight as clock times', () => {
    const labels = hourLabels(4);
    expect(labels[0]?.label).toBe('04:00');
    expect(labels[20]?.label).toBe('00:00');
    expect(labels).toHaveLength(24);
  });

  it('put the midnight divider twenty hours in', () => {
    expect(midnightTopPx(4)).toBe(20 * HOUR_HEIGHT_PX);
  });
});
