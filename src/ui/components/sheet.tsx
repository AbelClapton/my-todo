import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { usePrefersReducedMotion } from '@/ui/use-reduced-motion';

/**
 * The Sheet: *"slides up from the bottom edge; dismissed by drag or backdrop —
 * the default overlay on every platform"* (`03-experience/components.md`).
 *
 * **The behaviour is Radix's, the identity is ours**, which is the division
 * `components.md` draws for shadcn: *"A custom component consumes a shadcn
 * primitive where one fits. It does not reimplement focus handling, escape-key
 * behaviour, or scroll locking."* shadcn's own Sheet is this same primitive, so
 * the only thing here is the styling — tokens for the ground, the radius and
 * the elevation, and `03-experience/motion-vocabulary.md` for the timing.
 *
 * **Why the presence state exists.** Radix unmounts a closed dialog on the next
 * render, which would cut the exit transition to zero frames. `present` holds
 * the portal mounted for exactly as long as the exit takes, so *"dismiss with
 * `duration-default`, `ease-exit`"* is a thing that can actually happen. Under
 * `prefers-reduced-motion` the duration becomes `duration-instant` and the hold
 * is zero.
 */

/** `duration-default` — the sheet's entry and exit both spend it. */
const EXIT_MS = 200;

/**
 * How far the sheet must be dragged down before releasing dismisses it.
 *
 * The sheet has no threshold in the docs; the row swipe does, and it is *"40% of
 * row width, or 120px, whichever is less"*. A sheet is taller than a row by an
 * order of magnitude, so the same rule reads as 40% of the sheet capped at
 * 160px — the cap is what makes a tall sheet dismissible without a long drag.
 */
const DRAG_FRACTION = 0.4;
const DRAG_MAX_PX = 160;

export type SheetProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The dialog's accessible name. Radix requires one. */
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
};

export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  const reduced = usePrefersReducedMotion();
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);

  const exitMs = reduced ? 0 : EXIT_MS;

  useEffect(() => {
    if (open) {
      setPresent(true);
      // One frame before the entrance, so the transition has a start state to
      // move from rather than the sheet simply already being there.
      const frame = window.requestAnimationFrame(() => setEntered(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setEntered(false);
    const timer = window.setTimeout(() => setPresent(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  const duration = reduced ? 'duration-duration-instant' : 'duration-duration-default';

  /**
   * Drag-to-dismiss, on the grab handle only.
   *
   * `components.md` calls the sheet *"dismissed by drag or backdrop"*, and the
   * lab draws the handle — so the handle has to do something. Restricting the
   * drag to it is what keeps the rows tappable: a sheet whose whole surface
   * moves under the finger cannot also be a menu.
   */
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ readonly pointerId: number; readonly startY: number } | null>(null);
  const dragYRef = useRef(0);
  const [dragY, setDragYState] = useState(0);
  const [dragging, setDragging] = useState(false);

  const setDragY = (next: number) => {
    // The ref is what the release reads: pointer events for one gesture arrive
    // in a single task, so React has not re-rendered between the last move and
    // the up, and state would still say the drag never moved.
    dragYRef.current = next;
    setDragYState(next);
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      return;
    }
    drag.current = { pointerId: event.pointerId, startY: event.clientY };
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    setDragging(true);
    // Downward only: the sheet has nowhere to go but away.
    setDragY(Math.max(0, event.clientY - current.startY));
  };

  const handleDragEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    drag.current = null;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    setDragging(false);
    const traveled = dragYRef.current;
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0;
    if (traveled >= Math.min(height * DRAG_FRACTION, DRAG_MAX_PX)) {
      onOpenChange(false);
    }
    setDragY(0);
  };

  return (
    <Dialog.Root
      open={present}
      onOpenChange={(next) => {
        // Radix reports Escape and backdrop presses here; the exit animation is
        // ours, so the parent is told the sheet is *closing* and `present` keeps
        // the portal alive until it has finished.
        if (!next) {
          onOpenChange(false);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={[
            // `space-0`, not `0`: the spacing scale is the token set, and it has
            // no bare `inset-0` — that key does not exist, so the class would
            // compile to nothing and the scrim would collapse to zero height.
            'fixed inset-space-0 z-40 bg-bg-overlay transition-opacity ease-ease-standard',
            duration,
            entered ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
        <Dialog.Content
          // Radix warns when a dialog has neither a description nor an explicit
          // opt-out; without one there is nothing for the attribute to point at.
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
          ref={sheetRef}
          style={
            dragY === 0
              ? undefined
              : { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : undefined }
          }
          className={[
            'fixed inset-x-space-0 bottom-space-0 z-50 mx-auto flex w-full max-w-2xl flex-col',
            'rounded-t-lg border-t border-border-subtle bg-bg-raised shadow-elevation-3',
            'transition-transform ease-ease-standard',
            duration,
            // An inline transform during the drag wins over this one, so the
            // enter/exit slide and the follow-the-finger slide never fight.
            entered ? 'translate-y-space-0' : 'translate-y-full',
          ].join(' ')}
        >
          {/* The grab handle: the sheet's drag affordance, and the only part of
              it a drag may start on. */}
          <div
            aria-hidden
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className="mx-auto mt-space-3 h-space-1 w-space-8 shrink-0 touch-none rounded-full bg-border-strong"
          />
          <Dialog.Title className="px-space-5 pb-space-1 pt-space-4 text-type-title-3 text-text-primary">
            {title}
          </Dialog.Title>
          {description === undefined ? null : (
            <Dialog.Description className="px-space-5 pb-space-3 text-type-footnote text-text-secondary">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
