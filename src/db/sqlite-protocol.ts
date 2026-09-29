/**
 * The message protocol between the main thread and the SQLite worker.
 *
 * It is a separate module because **both sides must agree**, and two copies of a
 * message shape is how a field gets renamed on one side. It is also the only
 * thing the two share: the worker owns SQLite and the migration, and the main
 * thread never imports the WASM module at all when the worker starts.
 */

export type WorkerMethod = 'run' | 'all';

/**
 * Why the log has no durable storage, when it has none.
 *
 * The two causes need different words on screen. "This browser gave the app no
 * storage" is **wrong** when the browser gave it to another tab, and it sends
 * the user looking for a setting instead of closing a tab.
 *
 * - `ok` — durable, nothing to say.
 * - `no_opfs` — the browser cannot install the OPFS VFS at all.
 * - `in_use` — **OPFS allows one access handle per file**, so another document
 *   holds the pool. A second tab does this, and so does a reload that starts
 *   before the previous document has let go.
 */
export type StorageReason = 'ok' | 'no_opfs' | 'in_use';

export type WorkerRequest = {
  readonly id: number;
  readonly method: WorkerMethod;
  readonly sql: string;
  readonly params: readonly unknown[];
};

/**
 * `ready` is sent once, after the database is open and migrated — it is what
 * carries `persistent`, so the main thread learns whether this log will survive
 * a reload *before* it reports anything to the user.
 */
export type WorkerReply =
  | { readonly kind: 'ready'; readonly persistent: boolean; readonly reason: StorageReason }
  | { readonly kind: 'result'; readonly id: number; readonly rows: unknown[][] }
  | { readonly kind: 'error'; readonly id: number; readonly message: string };
