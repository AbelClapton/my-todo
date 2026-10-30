/**
 * The arithmetic of a row swipe, apart from the pointer plumbing.
 *
 * `03-experience/gesture-vocabulary.md` §Swipe thresholds and feel gives three
 * rules, and all three are here:
 *
 * - *"Swipe to trigger: 40% of row width, or 120px, whichever is less."*
 * - *"Beyond the trigger point, the action 'locks in' and releasing commits
 *   it. Before the trigger point, releasing snaps back."*
 * - Right is complete, left is defer (`05-modules/tasks.md` §Actions).
 *
 * Kept pure so the threshold can be tested without a pointer event: a gesture
 * that only exists inside a `onPointerMove` is a gesture nothing can check.
 */

/** The ceiling in the doc's "40% of row width, or 120px, whichever is less". */
export const SWIPE_TRIGGER_MAX_PX = 120;

/** The fraction in the same sentence. */
export const SWIPE_TRIGGER_FRACTION = 0.4;

/**
 * How far a swipe must travel before releasing commits it.
 *
 * A 332px content box at 390px triggers at 120px — the ceiling, not the
 * fraction — so the "or 120px" half is the one that binds on a phone, which is
 * what the doc's measurement implies.
 */
export function swipeTriggerAt(rowWidth: number): number {
  return Math.min(rowWidth * SWIPE_TRIGGER_FRACTION, SWIPE_TRIGGER_MAX_PX);
}

export type SwipeAction = 'complete' | 'defer';

/**
 * What a released swipe means, given how far it travelled.
 *
 * The sign is the meaning: positive is right (complete), negative is left
 * (defer). A swipe that did not reach the threshold means nothing, which is the
 * snap-back case rather than an error.
 */
export function resolveSwipe(dx: number, rowWidth: number): SwipeAction | null {
  const trigger = swipeTriggerAt(rowWidth);
  if (dx >= trigger) {
    return 'complete';
  }
  if (dx <= -trigger) {
    return 'defer';
  }
  return null;
}

export type SwipeAxis = 'undecided' | 'horizontal' | 'vertical';

/**
 * Which axis a drag belongs to.
 *
 * A list row must not steal a vertical scroll, and it must not commit a
 * horizontal action from a diagonal flick. So the axis is decided once, by the
 * first movement past `slop`, and then never revisited for that drag.
 */
export function lockAxis(dx: number, dy: number, slop = 8): SwipeAxis {
  if (Math.abs(dx) < slop && Math.abs(dy) < slop) {
    return 'undecided';
  }
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
}

/**
 * Where the row draws while the finger is down.
 *
 * Past the trigger the row stops following: *"the action locks in"*, so there
 * is nothing left for further travel to express. The extra 8px is what makes
 * the lock legible as a stop rather than an elastic wall — enough to feel like
 * a detent, small enough that the row is not visibly shoved.
 */
export function revealOffset(dx: number, rowWidth: number): number {
  const trigger = swipeTriggerAt(rowWidth);
  const limit = trigger + 8;
  return Math.max(-limit, Math.min(limit, dx));
}
