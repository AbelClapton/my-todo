import { describe, expect, it } from 'vitest';

import { lockAxis, resolveSwipe, revealOffset, swipeTriggerAt } from './swipe';

/**
 * The row is 332px wide at 390px — the measurement `task-row.tsx` records — so
 * the 120px ceiling is the half of the rule that binds on a phone.
 */
const ROW_WIDTH = 332;

describe('swipeTriggerAt', () => {
  it('takes 40% of the row when that is the smaller half', () => {
    expect(swipeTriggerAt(200)).toBe(80);
  });

  it('caps at 120px, which is what a phone row uses', () => {
    expect(swipeTriggerAt(ROW_WIDTH)).toBe(120);
  });
});

describe('resolveSwipe', () => {
  it('completes on a right swipe at the threshold', () => {
    expect(resolveSwipe(120, ROW_WIDTH)).toBe('complete');
  });

  it('defers on a left swipe at the threshold', () => {
    expect(resolveSwipe(-120, ROW_WIDTH)).toBe('defer');
  });

  it('means nothing one pixel short of the threshold', () => {
    expect(resolveSwipe(119, ROW_WIDTH)).toBeNull();
    expect(resolveSwipe(-119, ROW_WIDTH)).toBeNull();
  });

  it('means nothing for no movement', () => {
    expect(resolveSwipe(0, ROW_WIDTH)).toBeNull();
  });
});

describe('lockAxis', () => {
  it('stays undecided inside the slop', () => {
    expect(lockAxis(3, -4)).toBe('undecided');
  });

  it('locks horizontal when the drag is mostly sideways', () => {
    expect(lockAxis(14, 6)).toBe('horizontal');
  });

  it('locks vertical so a scroll is never stolen by a row', () => {
    expect(lockAxis(4, -18)).toBe('vertical');
  });
});

describe('revealOffset', () => {
  it('follows the finger below the trigger', () => {
    expect(revealOffset(60, ROW_WIDTH)).toBe(60);
  });

  it('locks just past the trigger rather than following further', () => {
    expect(revealOffset(300, ROW_WIDTH)).toBe(128);
    expect(revealOffset(-300, ROW_WIDTH)).toBe(-128);
  });
});
