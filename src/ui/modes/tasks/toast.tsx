import { useEffect, useState } from 'react';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { haptic } from '@/ui/haptics';

/**
 * The toast: **fixed, sliding up from the bottom edge at `elevation-4`**
 * (`03-experience/components.md`).
 *
 * `components.md` names two toasts, and they are one container in two
 * configurations:
 *
 * - the **undo toast** — a five-second hold that carries the reversal. Its copy
 *   is specified: *"Completed. Undo?"* (`06-flows/completion.md`).
 * - the **confirmation toast** — a fixed two-second hold with **no action**,
 *   for when something succeeded and there is nothing to undo: *"Captured to
 *   Inbox"*.
 *
 * Both are **consequence surfaces** — they render a mutation the user just made
 * — so they are outside the attention budget and outside quiet hours *by
 * definition* rather than by exemption (ADR 0023).
 */

/** Five seconds for the reversal, two for a confirmation. */
export const TOAST_HOLDS = { undo: 5000, confirm: 2000 } as const;

type ToastProps = {
  readonly message: string;
  readonly holdMs: number;
  readonly onDismiss: () => void;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

export function Toast({ message, holdMs, onDismiss, actionLabel, onAction }: ToastProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // One frame before the entrance so the transition has a start state to move
    // from, rather than the toast simply already being there.
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const expiry = window.setTimeout(onDismiss, holdMs);
    // "An undo window expiring without user action (soft warning)": the Error
    // haptic fires 500ms before the toast leaves — t=4.5s of a five-second hold
    // (`03-experience/haptic-vocabulary.md` §Examples).
    const warning =
      onAction === undefined
        ? undefined
        : window.setTimeout(() => haptic('error'), Math.max(0, holdMs - 500));
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(expiry);
      if (warning !== undefined) {
        window.clearTimeout(warning);
      }
    };
  }, [holdMs, message, onAction, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed inset-x-space-5 bottom-space-5 z-50 flex items-center gap-space-3 rounded-lg border border-border-subtle bg-bg-raised px-space-5 py-space-4 shadow-elevation-4',
        'text-type-body text-text-primary',
        'transition-transform duration-duration-default ease-ease-standard',
        entered ? 'translate-y-space-0' : 'translate-y-full',
      ].join(' ')}
    >
      <span className="min-w-0 flex-1">{message}</span>
      {onAction === undefined || actionLabel === undefined ? null : (
        <button
          type="button"
          onClick={onAction}
          className={`shrink-0 rounded-md border border-transparent px-space-3 py-space-2 text-type-subhead text-accent-text ${FOCUS_RING}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
