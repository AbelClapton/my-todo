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
 * ⚠️ This is the one piece of Phase 0 that cannot be verified without a
 * browser: the WASM bootstrap and Drizzle's `sqlite-proxy` callback signature
 * are the two things to check first if the client will not open.
 */

const DATABASE_FILE = 'smallwins.sqlite3';

export type LocalLog = {
  readonly store: ReturnType<typeof createSqliteLogStore>;
  readonly close: () => void;
};

export async function openLocalLog(filename: string = DATABASE_FILE): Promise<LocalLog> {
  const sqlite3 = await sqlite3InitModule();

  // `ct` = create if missing. The log is created empty; migrations fill it.
  const db = new sqlite3.oo1.DB(filename, 'ct');
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
    close: () => {
      db.close();
    },
  };
}
