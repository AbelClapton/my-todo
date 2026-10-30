import { Check, Clock } from 'lucide-react';
import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { iconSize, duration, easing } from '@/ui/tokens';
import { usePrefersReducedMotion } from '@/ui/use-reduced-motion';

import { lockAxis, resolveSwipe, revealOffset, swipeTriggerAt, type SwipeAxis } from './swipe';

/**
 * The row's two swipe actions: **right completes, left opens the defer sheet**,
 * with the row following the finger and the reveal coloured by direction.
 *
 * `03-experience/gesture-vocabulary.md` §Swipe thresholds and feel is the whole
 * specification: the row slides, *"actions are color-coded on reveal: complete
 * is `accent-subtle` … defer, remove, and attach are `surface-3`"*, and *"no
 * swipe is ever `danger-subtle`, because no swipe is destructive"*. The
 * arithmetic — threshold, axis lock, where the row stops following — is in
 * `swipe.ts`, so it is tested rather than eyeballed.
 *
 * **Mouse never swipes.** *"Desktop. No touch gestures. Keyboard and mouse
 * only"*, and dragging a row with a mouse is a thing this app does not do. The
 * keyboard equivalents (`E` and `D`) live on the row itself, because they are
 * the primary path on the web and the only path without a pointer.
 *
 * The one value that is not a token is the offset itself: it is *where the
 * finger is*, which no token set can enumerate.
 */

const MARK_SIZE = iconSize['icon-xs'];

type Drag = {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly width: number;
  axis: SwipeAxis;
};

export type SwipeSurfaceProps = {
  readonly children: ReactNode;
  readonly onComplete: () => void;
  readonly onDefer: () => void;
  /** True while the row is leaving: a commit must not be started twice. */
  readonly disabled?: boolean;
};

export function SwipeSurface({
  children,
  onComplete,
  onDefer,
  disabled = false,
}: SwipeSurfaceProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const moved = useRef(false);
  const [offset, setOffset] = useState(0);
  const [following, setFollowing] = useState(false);

  const reset = () => {
    drag.current = null;
    setFollowing(false);
    setOffset(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.pointerType === 'mouse') {
      return;
    }
    const width = ref.current?.getBoundingClientRect().width ?? 0;
    if (width === 0) {
      return;
    }
    moved.current = false;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width,
      axis: 'undecided',
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (current.axis === 'undecided') {
      const axis = lockAxis(dx, dy);
      if (axis === 'undecided') {
        return;
      }
      current.axis = axis;
      if (axis === 'vertical') {
        // A scroll is not a gesture. Hand the drag back to the list untouched.
        drag.current = null;
        return;
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture needs a live pointer, and a synthesised event has none. The
        // gesture still works without it; it just ends early if the finger
        // leaves the row.
      }
      setFollowing(true);
    }

    moved.current = true;
    setOffset(revealOffset(dx, current.width));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    setFollowing(false);

    if (current.axis !== 'horizontal') {
      setOffset(0);
      return;
    }

    const action = resolveSwipe(event.clientX - current.startX, current.width);
    if (action === 'complete') {
      // The row holds its reveal; the completion animation takes it from here.
      setOffset(swipeTriggerAt(current.width));
      onComplete();
      return;
    }
    if (action === 'defer') {
      // The sheet rises over the row, so the row returns to its place rather
      // than staying swiped behind a scrim.
      setOffset(0);
      onDefer();
      return;
    }
    setOffset(0);
  };

  /** A drag that committed must not also be a tap on the link underneath it. */
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (moved.current) {
      moved.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const style: CSSProperties = {
    transform: `translateX(${offset}px)`,
    // `duration-default` / `ease-standard` — the list row reveal's own entry in
    // the transition catalog (`03-experience/motion-vocabulary.md`).
    transition:
      following || reduced
        ? 'none'
        : `transform ${duration['duration-default']} ${easing['ease-standard']}`,
  };

  return (
    <div
      ref={ref}
      className="relative touch-pan-y overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={reset}
      onClickCapture={handleClickCapture}
    >
      <div
        aria-hidden
        className={[
          'absolute inset-0 flex items-center px-space-4',
          offset >= 0
            ? 'justify-start bg-accent-subtle text-accent-default'
            : 'justify-end bg-surface-3 text-text-muted',
        ].join(' ')}
      >
        {offset >= 0 ? <Check size={MARK_SIZE} /> : <Clock size={MARK_SIZE} />}
      </div>
      <div className="relative bg-bg-base" style={style}>
        {children}
      </div>
    </div>
  );
}
