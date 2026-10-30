import { useSyncExternalStore } from 'react';

import type { LogEntry } from '@/domain/events';
import type { PendingEntry } from '@/domain/log/append';

import type { ScheduledBefore } from './rituals';

/**
 * The ritual undo, held **outside** the surface that commits it.
 *
 * Both flows land the user on the day view the moment they commit
 * (`06-flows/shutdown.md` §The commit), and Invariant 1 keeps the reversal
 * reachable for five seconds after that. A toast owned by the ritual screen would
 * unmount with it, so the pending batch lives here and the Calendar draws the
 * toast — which is the same split `tasks-mode.tsx` uses between its write and its
 * toast, one route further apart.
 *
 * A module-level store rather than context because the consumer is a different
 * route: the ritual commits, the router swaps the tree, and the toast has to
 * survive that swap. It holds no domain state — only the entries a commit just
 * appended and what they replaced.
 */

export type PendingRitualUndo = {
  readonly message: string;
  readonly appended: readonly LogEntry[];
  readonly before: {
    readonly previousNoteBody?: string;
    readonly tasks: readonly ScheduledBefore[];
  };
  readonly compensate: (entries: readonly PendingEntry[]) => Promise<void>;
};

let pending: PendingRitualUndo | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function setPendingUndo(next: PendingRitualUndo): void {
  pending = next;
  emit();
}

export function clearPendingUndo(): void {
  pending = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingUndo(): PendingRitualUndo | null {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => pending,
  );
}
