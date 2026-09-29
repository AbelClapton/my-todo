import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';

import migrationSql from '@drizzle/migrations/0000_log_entries.sql?raw';

import { createSqliteLogStore } from './log-store';

/**
 * The **in-memory** log, on the main thread, for when the worker cannot start at
 * all — a bundling failure, a browser that blocks workers.
 *
 * It exists so that losing durable storage degrades to *a log for this session*
 * rather than to *no app*: the session path is verified working, and a fallback
 * that keeps the product usable is worth twenty lines. It does **not** attempt
 * OPFS, because the main thread cannot have it — `installOpfsSAHPoolVfs` raises
 * *"Missing required OPFS APIs"* there in every browser tested, and asking twice
 * per launch to be refused twice is noise.
 */

const DATABASE_FILE = 'smallwins.sqlite3';

type SqliteDb = {
  readonly exec: (options: string | Readonly<Record<string, unknown>>) => unknown;
  readonly close: () => void;
};

type SqliteModule = {
  readonly oo1: { readonly DB: new (filename: string, flags: string) => SqliteDb };
};

export async function openInMemoryLog(): Promise<{
  readonly store: ReturnType<typeof createSqliteLogStore>;
  readonly close: () => void;
}> {
  const sqlite3 = (await sqlite3InitModule()) as unknown as SqliteModule;

  // `ct` = create if missing. This one does not survive a reload.
  const db = new sqlite3.oo1.DB(DATABASE_FILE, 'ct');
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
