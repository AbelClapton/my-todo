import type { BaseEntry } from '../events/entry';

/**
 * The log's storage port.
 *
 * The domain depends on this and not on SQLite, which is what lets a test fold
 * an in-memory log and the app fold the real one. The implementation is
 * `src/db/log-store.ts`.
 *
 * **There is no `update` and no `delete` on purpose.** The log is append-only
 * (`02-architecture/event-log.md`); undo is a compensation entry.
 */
export type LogStore = {
  readonly append: (entry: BaseEntry) => Promise<void>;
  readonly readAll: () => Promise<readonly BaseEntry[]>;
  /** The highest `seq` this device has written, or 0. */
  readonly lastSeq: (deviceId: string) => Promise<number>;
};

export type InMemoryLogStore = LogStore & {
  /** Test-only: the entries as written, unvalidated and unordered. */
  readonly snapshot: () => readonly BaseEntry[];
};

export function createInMemoryLogStore(): InMemoryLogStore {
  const entries: BaseEntry[] = [];

  return {
    append: async (entry) => {
      entries.push(entry);
    },
    readAll: async () => [...entries],
    lastSeq: async (deviceId) =>
      entries.reduce(
        (highest, entry) =>
          entry.device_id === deviceId && entry.seq > highest ? entry.seq : highest,
        0,
      ),
    snapshot: () => [...entries],
  };
}
