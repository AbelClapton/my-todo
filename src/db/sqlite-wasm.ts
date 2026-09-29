import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import migrationSql from '@drizzle/migrations/0000_log_entries.sql?raw';

import { createSqliteLogStore } from './log-store';

/**
 * The local log, in the browser, over SQLite/WASM.
 *
 * This file is the **only** place that knows a WASM SQLite exists. Everything
 * above it talks to `LogStore`, which is why the domain and every projection
 * test run in Node with no browser at all.
 *
 * Rows come back as **arrays** by design: `sqlite-proxy` pairs a row's values
 * with the column list the query declared, so `rowMode: 'array'` is the shape it
 * wants — and a hand-written `SELECT` therefore loses its column names. See
 * `log-store.ts`, where that cost a browser session to find.
 *
 * **Persistence is not free, and the obvious call does not do it.**
 * `sqlite3.oo1.DB(filename)` is not a file: the default VFS has no filesystem in
 * a browser, so every open is a fresh in-memory database and the log empties on
 * reload — measured, not assumed: append, close, reopen gave `rows: 0`. A log
 * that empties on reload is not a log, so this uses the **OPFS** VFS. The plain
 * `opfs` VFS only works inside a Worker, which is why it is the **SAH pool**
 * (`installOpfsSAHPoolVfs`), which is designed for the main thread.
 *
 * `persistent` reports which one was obtained, because "your log is safe" and
 * "your log is a scratchpad" are different promises and only one of them is
 * local-first.
 */

const DATABASE_FILE = 'smallwins.sqlite3';
const POOL_NAME = 'smallwins-pool';

/** The slice of the WASM API this file uses, so the module needs no `any`. */
type SqliteDb = {
  readonly exec: (options: string | Readonly<Record<string, unknown>>) => unknown;
  readonly close: () => void;
};

type OpfsPool = {
  readonly OpfsSAHPoolDb: new (filename: string) => SqliteDb;
};

type SqliteModule = {
  readonly oo1: { readonly DB: new (filename: string, flags: string) => SqliteDb };
  readonly installOpfsSAHPoolVfs?: (options?: { readonly name?: string }) => Promise<OpfsPool>;
};

export type LocalLog = {
  readonly store: ReturnType<typeof createSqliteLogStore>;
  /** False when the browser gave no OPFS and the log lives only in memory. */
  readonly persistent: boolean;
  readonly close: () => void;
};

/** A pool may only be installed once per page, so it is installed lazily. */
let pool: Promise<OpfsPool> | undefined;

async function openDatabase(
  sqlite3: SqliteModule,
): Promise<{ db: SqliteDb; persistent: boolean }> {
  if (sqlite3.installOpfsSAHPoolVfs !== undefined) {
    try {
      const install = sqlite3.installOpfsSAHPoolVfs.bind(sqlite3);
      pool ??= install({ name: POOL_NAME });
      const installed = await pool;
      return { db: new installed.OpfsSAHPoolDb(`/${DATABASE_FILE}`), persistent: true };
    } catch {
      // No OPFS in this context — a private window, or a browser that refuses
      // it. Reporting `persistent: false` is what keeps that from being silent.
      pool = undefined;
    }
  }

  // `ct` = create if missing. This one does not survive a reload.
  return { db: new sqlite3.oo1.DB(DATABASE_FILE, 'ct'), persistent: false };
}

export async function openLocalLog(): Promise<LocalLog> {
  const sqlite3 = (await sqlite3InitModule()) as unknown as SqliteModule;
  const { db, persistent } = await openDatabase(sqlite3);

  db.exec(migrationSql);

  const proxy = drizzle(async (query, params, method) => {
    if (method === 'run') {
      db.exec({ sql: query, bind: params });
      return { rows: [] };
    }

    const rows: unknown[][] = [];
    db.exec({
      sql: query,
      bind: params,
      rowMode: 'array',
      callback: (row: unknown[]) => {
        rows.push(row);
      },
    });
    return { rows };
  });

  return {
    store: createSqliteLogStore(proxy),
    persistent,
    close: () => {
      db.close();
    },
  };
}
