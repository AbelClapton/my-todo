import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The `log_entries` table (`02-architecture/event-log.md`).
 *
 * One table holds the whole log. Everything the app shows is derived from it,
 * and **nothing is ever updated or deleted** — undo is a compensation entry.
 * The migration adds triggers that make that a property of the store rather
 * than a convention.
 *
 * `payload` is stored as JSON text. It is validated on the way in and on the
 * way out, so the column's type is deliberately loose: the log's own
 * `schema_version` is what describes it, not the schema of this table.
 *
 * The ordering columns are indexed together because the fold reads them
 * together (timestamp, device_id, seq).
 */
export const logEntries = sqliteTable(
  'log_entries',
  {
    /** ULID. Sortable, globally unique, never reused. */
    id: text('id').primaryKey(),
    /** Namespaced, e.g. `task.created`. Determines the payload schema. */
    type: text('type').notNull(),
    /** ISO-8601, UTC. The first key of the total order. */
    timestamp: text('timestamp').notNull(),
    actorType: text('actor_type').notNull(),
    /** device_id for a user, the tier for ai, the name for an integration. */
    actorId: text('actor_id'),
    payload: text('payload', { mode: 'json' }).notNull(),
    /** ULID of the entry this one reverses. */
    compensationFor: text('compensation_for'),
    schemaVersion: integer('schema_version').notNull(),
    /** The second key of the total order, and the sync cursor's owner. */
    deviceId: text('device_id').notNull(),
    /** Per-device monotonic counter. The third key of the total order. */
    seq: integer('seq').notNull(),
    /**
     * Routing, not payload: the sync engine reads it and no projection ever
     * does. `false` is local-only (ADR 0008).
     */
    sync: integer('sync', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [
    index('log_entries_order_idx').on(table.timestamp, table.deviceId, table.seq),
    index('log_entries_device_seq_idx').on(table.deviceId, table.seq),
    index('log_entries_type_idx').on(table.type),
    index('log_entries_compensation_idx').on(table.compensationFor),
  ],
);

export type LogEntryRow = typeof logEntries.$inferSelect;
export type NewLogEntryRow = typeof logEntries.$inferInsert;
