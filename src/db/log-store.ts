import { sql, type SQL } from 'drizzle-orm';

import { logEntries } from '@drizzle/schema';

import type { BaseEntry, LogEntry } from '@/domain/events';
import { parseLogEntry } from '@/domain/events';
import type { LogStore } from '@/domain/log/store';

/**
 * The `LogStore` over SQLite (`drizzle/schema.ts` holds the table, and
 * `drizzle/migrations/` holds the DDL and the append-only triggers).
 *
 * The parameter is **structural** — `run` and `all` are the two operations the
 * log needs — so the WASM proxy, a Node driver and an in-memory double all
 * satisfy it without this file importing any of them. That is also why the
 * column list is written out: a raw statement names its columns, and the table
 * name still comes from the schema so the two cannot drift.
 *
 * The column list here and `drizzle/schema.ts` are the one duplicated fact in
 * this file. It is bounded, visible, and checked by the migration test.
 */
export type SqliteHandle = {
  readonly run: (query: SQL) => Promise<unknown>;
  readonly all: <T>(query: SQL) => Promise<T[]>;
};

type LogRow = {
  readonly id: string;
  readonly type: string;
  readonly timestamp: string;
  readonly actor_type: string;
  readonly actor_id: string | null;
  readonly payload: unknown;
  readonly compensation_for: string | null;
  readonly schema_version: number;
  readonly device_id: string;
  readonly seq: number;
  /** SQLite has no boolean; the driver may hand back either shape. */
  readonly sync: number | boolean;
};

export function createSqliteLogStore(db: SqliteHandle): LogStore {
  return {
    append: async (entry: BaseEntry) => {
      await db.run(sql`
        INSERT INTO ${logEntries}
          (id, type, timestamp, actor_type, actor_id, payload,
           compensation_for, schema_version, device_id, seq, sync)
        VALUES (
          ${entry.id},
          ${entry.type},
          ${entry.timestamp},
          ${entry.actor.type},
          ${entry.actor.id ?? null},
          ${JSON.stringify(entry.payload)},
          ${entry.compensation_for ?? null},
          ${entry.schema_version},
          ${entry.device_id},
          ${entry.seq},
          ${entry.sync === false ? 0 : 1}
        )
      `);
    },

    readAll: async () => {
      const rows = await db.all<LogRow>(sql`
        SELECT id, type, timestamp, actor_type, actor_id, payload,
               compensation_for, schema_version, device_id, seq, sync
        FROM ${logEntries}
        ORDER BY timestamp, device_id, seq
      `);
      return rows.map(rowToEntry);
    },

    lastSeq: async (deviceId: string) => {
      const rows = await db.all<{ seq: number | null }>(sql`
        SELECT MAX(seq) AS seq FROM ${logEntries} WHERE device_id = ${deviceId}
      `);
      return rows[0]?.seq ?? 0;
    },
  };
}

/**
 * Storage is a boundary, so the row is **validated** rather than trusted: the
 * log is the source of truth, and a value that cannot be validated is not one.
 */
function rowToEntry(row: LogRow): LogEntry {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  return parseLogEntry({
    id: row.id,
    type: row.type,
    timestamp: row.timestamp,
    actor:
      row.actor_id === null ? { type: row.actor_type } : { type: row.actor_type, id: row.actor_id },
    payload,
    ...(row.compensation_for === null ? {} : { compensation_for: row.compensation_for }),
    schema_version: row.schema_version,
    device_id: row.device_id,
    seq: row.seq,
    ...(row.sync === 0 || row.sync === false ? { sync: false } : {}),
  });
}
