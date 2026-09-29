import { ulid } from 'ulid';

import { SCHEMA_VERSION, type Actor, type LogEntry, type EventType } from '../events';
import { parsePayload } from '../events';

import type { LogStore } from './store';

/**
 * The log append API.
 *
 * `append` is the **only** path to a state change
 * (`10-engineering/code-conventions.md`). It validates the payload at the
 * boundary, assigns the identity and ordering fields, and writes one entry.
 * Nothing in the app mutates state directly.
 */

export type PendingEntry = {
  readonly type: EventType;
  /** Validated here, never trusted from the caller. */
  readonly payload: unknown;
  readonly actor: Actor;
  /** Routing. `false` is local-only (ADR 0008). Defaults to `true`. */
  readonly sync?: boolean;
  /** The entry this one reverses. A compensation is never compensated. */
  readonly compensation_for?: string;
};

export type AppendContext = {
  readonly store: LogStore;
  readonly deviceId: string;
  /** Injected so the domain never reads the clock itself. */
  readonly now: () => Date;
  /** Defaults to a ULID seeded from `now()`. Injected only by tests. */
  readonly newId?: () => string;
};

export type Append = (pending: PendingEntry) => Promise<LogEntry>;

export function createAppend(context: AppendContext): Append {
  /** Per-device monotonic counter, seeded from the store on first append. */
  let seq = 0;
  let seeded: Promise<void> | undefined;

  return async function append(pending: PendingEntry): Promise<LogEntry> {
    if (seeded === undefined) {
      const store = context.store;
      const deviceId = context.deviceId;
      seeded = store.lastSeq(deviceId).then((last) => {
        seq = last;
      });
    }
    await seeded;

    if (pending.compensation_for !== undefined) {
      await assertCompensable(context.store, pending.compensation_for);
    }

    const at = context.now();
    const payload = parsePayload(pending.type, pending.payload);
    seq += 1;

    // The compiler cannot verify that a `type` string and a separately parsed
    // payload belong to the same member of an 80-member union. `parsePayload`
    // is what guarantees it, keyed on this same `type`.
    const entry = {
      id: (context.newId ?? (() => ulid(at.getTime())))(),
      type: pending.type,
      timestamp: at.toISOString(),
      actor: pending.actor,
      payload,
      schema_version: SCHEMA_VERSION,
      device_id: context.deviceId,
      seq,
      ...(pending.compensation_for === undefined
        ? {}
        : { compensation_for: pending.compensation_for }),
      ...(pending.sync === undefined ? {} : { sync: pending.sync }),
    } as LogEntry;

    await context.store.append(entry);
    return entry;
  };
}

/**
 * A compensation of a compensation is not allowed
 * (`02-architecture/event-log.md` §Compensation). To redo, append a fresh entry
 * of the original type.
 *
 * This reads the whole log, which is fine while the log is small and a
 * projection cache is the thing that will replace it.
 */
async function assertCompensable(store: LogStore, target: string): Promise<void> {
  const entries = await store.readAll();
  const found = entries.find((entry) => entry.id === target);
  if (found !== undefined && found.compensation_for !== undefined) {
    throw new Error(
      `Cannot compensate ${target}: it is itself a compensation. Append a fresh entry instead.`,
    );
  }
}
