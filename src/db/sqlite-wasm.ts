import { drizzle } from 'drizzle-orm/sqlite-proxy';

import { createSqliteLogStore } from './log-store';
import { openInMemoryLog } from './sqlite-memory';
import type { StorageReason } from './sqlite-protocol';
import { createWorkerClient } from './sqlite-worker-client';

/**
 * The local log, and the policy for opening it.
 *
 * Everything above this file talks to `LogStore`, which is why the domain and
 * every projection test run in Node with no browser at all. This is the only
 * file that knows a WASM SQLite exists, and it knows two things about browsers
 * that cost a session each to learn:
 *
 * 1. **`oo1.DB(filename)` is not a file.** The default VFS has no filesystem in
 *    a browser, so it is an in-memory database that empties on reload —
 *    measured: append, close, reopen gave `rows: 0`.
 * 2. **Durable storage only exists in a worker.** `installOpfsSAHPoolVfs` raises
 *    *"Missing required OPFS APIs"* on the main thread in every browser tested,
 *    because the OPFS VFS is built on `createSyncAccessHandle`, which is a
 *    dedicated-worker API.
 *
 * So there are three tiers, and the caller is **told which one it got** rather
 * than left to assume:
 *
 * 1. the worker with OPFS — durable;
 * 2. the worker without OPFS — the worker reports `persistent: false`;
 * 3. no worker at all — the main-thread session log, `persistent: false`.
 *
 * "Your log is safe" and "your log is a scratchpad" are different promises, and
 * only the first one is local-first.
 */

export type LocalLog = {
  readonly store: ReturnType<typeof createSqliteLogStore>;
  /** False when there is no durable storage, so the log ends with the session. */
  readonly persistent: boolean;
  /** Which of the two failures it was, or `ok`. See `StorageReason`. */
  readonly reason: StorageReason;
  readonly close: () => void;
};

export async function openLocalLog(): Promise<LocalLog> {
  try {
    const worker = new Worker(new URL('./sqlite-worker.ts', import.meta.url), {
      type: 'module',
      name: 'smallwins-log',
    });
    const client = createWorkerClient(worker);
    const { persistent, reason } = await client.ready;

    // Rows travel as arrays, which is the shape `sqlite-proxy` wants: it pairs
    // them with the column list the query declared. A hand-written `SELECT`
    // therefore loses its column names — see `log-store.ts`.
    const proxy = drizzle((sql, params, method) =>
      client.call(method === 'run' ? 'run' : 'all', sql, params),
    );

    return {
      store: createSqliteLogStore(proxy),
      persistent,
      reason,
      close: () => {
        worker.terminate();
      },
    };
  } catch {
    // The worker would not load or would not answer. Degrade to a log for this
    // session rather than to no app at all.
    const memory = await openInMemoryLog();
    return { store: memory.store, persistent: false, reason: 'no_opfs', close: memory.close };
  }
}
