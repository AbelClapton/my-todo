import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

import migrationSql from '@drizzle/migrations/0000_log_entries.sql?raw';

import type { StorageReason, WorkerReply, WorkerRequest } from './sqlite-protocol';

/**
 * The worker that owns SQLite.
 *
 * **Why a worker at all: OPFS.** The main thread cannot do durable storage —
 * `installOpfsSAHPoolVfs` raises *"Missing required OPFS APIs"* there in every
 * browser tested. `createSyncAccessHandle`, which is what the OPFS VFS is built
 * on, exists in a **dedicated worker**, so the durable log has to live in one.
 * That also takes the 869 KB WASM compile and every query off the main thread.
 *
 * The fallback stays inside the worker rather than on the main thread, so there
 * is one place that opens a database and one place that reports whether it will
 * survive a reload.
 */

const DATABASE_FILE = 'smallwins.sqlite3';
const POOL_NAME = 'smallwins-pool';

/** The slice of the WASM API this file uses, so the module needs no `any`. */
type SqliteDb = {
  readonly exec: (options: string | Readonly<Record<string, unknown>>) => unknown;
};

type OpfsPool = {
  readonly OpfsSAHPoolDb: new (filename: string) => SqliteDb;
};

type SqliteModule = {
  readonly oo1: { readonly DB: new (filename: string, flags: string) => SqliteDb };
  readonly installOpfsSAHPoolVfs?: (options?: { readonly name?: string }) => Promise<OpfsPool>;
};

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerReply) => void;
};

/**
 * `oo1.DB(filename)` is **not** a file: the default VFS has no filesystem here,
 * so it is an in-memory database that empties when the page reloads. OPFS is the
 * only durable option, and it must be asked for by name.
 *
 * **OPFS gives exactly one access handle per file.** That is why this retries:
 * on a reload the new document's worker can start before the old document's
 * worker has released its handles, and the install then fails with
 * *NoModificationAllowedError — Access Handles cannot be created if there is
 * another open Access Handle*. The platform releases them as the old context
 * dies, so a short retry turns a lost race into a succeeded open — and a genuine
 * conflict (two tabs) into a fallback that reports itself.
 */
async function installPool(
  install: NonNullable<SqliteModule['installOpfsSAHPoolVfs']>,
): Promise<OpfsPool> {
  const waits = [150, 300, 600, 1200];
  let lastError: unknown = new Error('The OPFS pool could not be installed.');

  for (const wait of [0, ...waits]) {
    if (wait > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, wait);
      });
    }
    try {
      return await install({ name: POOL_NAME });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function openDatabase(
  sqlite3: SqliteModule,
): Promise<{ db: SqliteDb; persistent: boolean; reason: StorageReason }> {
  const install = sqlite3.installOpfsSAHPoolVfs;

  if (install === undefined) {
    return {
      db: new sqlite3.oo1.DB(DATABASE_FILE, 'ct'),
      persistent: false,
      reason: 'no_opfs',
    };
  }

  try {
    const pool = await installPool(install);
    return {
      db: new pool.OpfsSAHPoolDb(`/${DATABASE_FILE}`),
      persistent: true,
      reason: 'ok',
    };
  } catch (error) {
    // Say **which** failure it was. `in_use` is the common one — a second tab,
    // or a reload racing the previous document — and telling the user the
    // browser has no storage would send them looking in the wrong place.
    const held = error instanceof Error && error.name === 'NoModificationAllowedError';
    console.warn(
      held
        ? 'The log has no durable storage: another document holds the OPFS pool.'
        : 'The log has no durable storage: this browser cannot install the OPFS VFS.',
      error,
    );

    return {
      db: new sqlite3.oo1.DB(DATABASE_FILE, 'ct'),
      persistent: false,
      reason: held ? 'in_use' : 'no_opfs',
    };
  }
}

let opening: Promise<{
  readonly db: SqliteDb;
  readonly persistent: boolean;
  readonly reason: StorageReason;
}> | undefined;

function open(): Promise<{
  readonly db: SqliteDb;
  readonly persistent: boolean;
  readonly reason: StorageReason;
}> {
  opening ??= (async () => {
    const sqlite3 = (await sqlite3InitModule()) as unknown as SqliteModule;
    const opened = await openDatabase(sqlite3);
    // Every statement is `IF NOT EXISTS`, which it has to be: there is no
    // migrator in a browser and this runs on every open.
    opened.db.exec(migrationSql);
    return opened;
  })();
  return opening;
}

async function handle(request: WorkerRequest): Promise<void> {
  try {
    const { db } = await open();

    if (request.method === 'run') {
      db.exec({ sql: request.sql, bind: request.params });
      scope.postMessage({ kind: 'result', id: request.id, rows: [] });
      return;
    }

    const rows: unknown[][] = [];
    db.exec({
      sql: request.sql,
      bind: request.params,
      // Rows as **arrays**, paired with the column list the query declared.
      // `sqlite-proxy` wants exactly this shape, and it is why a hand-written
      // `SELECT` loses its column names (`log-store.ts`).
      rowMode: 'array',
      callback: (row: unknown[]) => {
        rows.push(row);
      },
    });
    scope.postMessage({ kind: 'result', id: request.id, rows });
  } catch (error) {
    scope.postMessage({
      kind: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data);
};

void open().then(
  ({ persistent, reason }) => {
    scope.postMessage({ kind: 'ready', persistent, reason });
  },
  (error: unknown) => {
    // The main thread is waiting on `ready` and will time out; saying why here
    // is what makes that failure debuggable rather than silent.
    scope.postMessage({
      kind: 'error',
      id: -1,
      message: error instanceof Error ? error.message : String(error),
    });
  },
);
