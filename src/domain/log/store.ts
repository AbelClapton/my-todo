import type { LogEntry } from '../events';

/**
 * The log's storage port.
 *
 * The domain depends on this and not on SQLite, which is what lets a test fold
 * an in-memory log and the app fold the real one. The implementation is
 * `src/db/log-store.ts`.
 *
 * **Every entry in a store is a fully-formed `LogEntry`**, not a bare base
 * entry: the only way in is `append`, which validates the payload before it
 * builds one. Saying so here is what keeps two casts out of the call sites.
 *
 * **There is no `update` and no `delete` on purpose.** The log is append-only
 * (`02-architecture/event-log.md`); undo is a compensation entry.
 */
export type LogStore = {
  readonly append: (entry: LogEntry) => Promise<void>;
  readonly readAll: () => Promise<readonly LogEntry[]>;
  /** The highest `seq` this device has written, or 0. */
  readonly lastSeq: (deviceId: string) => Promise<number>;
};

export type InMemoryLogStore = LogStore & {
  /** Test-only: the entries as written, in write order. */
  readonly snapshot: () => readonly LogEntry[];
};

export function createInMemoryLogStore(): InMemoryLogStore {
  const entries: LogEntry[] = [];

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
