import { eq, sql } from 'drizzle-orm';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';

import { logEntries, type LogEntryRow, type NewLogEntryRow } from '@drizzle/schema';

import type { LogEntry } from '@/domain/events';
import { parseLogEntry } from '@/domain/events';
import type { LogStore } from '@/domain/log/store';

/**
 * The `LogStore` over SQLite (`drizzle/schema.ts` holds the table;
 * `drizzle/migrations/` holds the DDL and the append-only triggers).
 *
 * **The reads go through the query builder, and that is not a style choice.**
 * `sqlite-proxy` hands Drizzle rows as *arrays*, paired with the column list the
 * query declared — so a hand-written `SELECT` has no column names and every
 * field arrives `undefined`. That is exactly what the first compensation did in
 * the browser: `parseLogEntry` refused the row rather than letting a shapeless
 * object into the log, which is the boundary doing its job. The query builder is
 * what supplies the columns.
 *
 * The parameter is the driver's own database type rather than a hand-written
 * port, because the point above is a property of the driver.
 */
export function createSqliteLogStore(db: SqliteRemoteDatabase): LogStore {
  return {
    append: async (entry: LogEntry) => {
      await db.insert(logEntries).values(toRow(entry));
    },

    readAll: async () => {
      const rows = await db
        .select()
        .from(logEntries)
        .orderBy(logEntries.timestamp, logEntries.deviceId, logEntries.seq);
      return rows.map(rowToEntry);
    },

    lastSeq: async (deviceId: string) => {
      const rows = await db
        .select({ seq: sql<number | null>`max(${logEntries.seq})` })
        .from(logEntries)
        .where(eq(logEntries.deviceId, deviceId));
      return rows[0]?.seq ?? 0;
    },
  };
}

function toRow(entry: LogEntry): NewLogEntryRow {
  return {
    id: entry.id,
    type: entry.type,
    timestamp: entry.timestamp,
    actorType: entry.actor.type,
    actorId: entry.actor.id ?? null,
    payload: entry.payload,
    compensationFor: entry.compensation_for ?? null,
    schemaVersion: entry.schema_version,
    deviceId: entry.device_id,
    seq: entry.seq,
    // Routing, not payload: an absent `sync` means the default, which is true.
    sync: entry.sync !== false,
  };
}

/**
 * Storage is a boundary, so the row is **validated** rather than trusted: the
 * log is the source of truth, and a value that cannot be validated is not one.
 */
function rowToEntry(row: LogEntryRow): LogEntry {
  return parseLogEntry({
    id: row.id,
    type: row.type,
    timestamp: row.timestamp,
    actor:
      row.actorId === null ? { type: row.actorType } : { type: row.actorType, id: row.actorId },
    payload: row.payload,
    ...(row.compensationFor === null ? {} : { compensation_for: row.compensationFor }),
    schema_version: row.schemaVersion,
    device_id: row.deviceId,
    seq: row.seq,
    ...(row.sync ? {} : { sync: false }),
  });
}
