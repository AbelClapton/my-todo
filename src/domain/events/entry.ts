import { z } from 'zod';

import { UlidSchema } from '../ids';

/**
 * The shape every log entry shares (`02-architecture/event-log.md`).
 *
 * A per-type entry narrows `type` and `payload` via `EventEntry`; the union of
 * all of them is the registry of "what events exist" — there is no other
 * registry (`10-engineering/code-conventions.md`).
 */

export const ActorTypeSchema = z.enum(['user', 'ai', 'system', 'integration']);

export const ActorSchema = z.object({
  type: ActorTypeSchema,
  /** device_id for a user, the tier for ai, the name for an integration. */
  id: z.string().optional(),
});

export type ActorType = z.infer<typeof ActorTypeSchema>;
export type Actor = z.infer<typeof ActorSchema>;

/**
 * Every type starts at 1. The version increments only when a payload changes
 * in a breaking way; adding an optional field is not breaking.
 */
export const SCHEMA_VERSION = 1;

export const BaseEntrySchema = z.object({
  id: UlidSchema,
  type: z.string(),
  /** Type-specific and untyped until narrowed by `type`. */
  payload: z.unknown(),
  /** ISO-8601, UTC. */
  timestamp: z.string().datetime(),
  actor: ActorSchema,
  /** ULID of the entry this one reverses. A compensation is never compensated. */
  compensation_for: UlidSchema.optional(),
  schema_version: z.number().int().positive(),
  device_id: UlidSchema,
  /** Per-device monotonic counter. The third key of the total order. */
  seq: z.number().int().nonnegative(),
  /**
   * Routing, not payload: the sync engine reads it and no projection ever
   * does. `false` is local-only (ADR 0008 — note bodies, metric logs, person
   * data).
   */
  sync: z.boolean().optional(),
});

export type BaseEntry = z.infer<typeof BaseEntrySchema>;

export type EventEntry<TType extends string, TPayload> = BaseEntry & {
  readonly type: TType;
  readonly payload: TPayload;
};

/**
 * The total order (`02-architecture/event-log.md` §Ordering): timestamp, then
 * device_id, then seq. Two devices with skewed clocks still agree, because the
 * last two break ties deterministically.
 */
export function compareEntries(a: BaseEntry, b: BaseEntry): number {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp < b.timestamp ? -1 : 1;
  }
  if (a.device_id !== b.device_id) {
    return a.device_id < b.device_id ? -1 : 1;
  }
  return a.seq - b.seq;
}

/** Ordered copy. Folds never assume the caller handed them a sorted log. */
export function ordered<T extends BaseEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(compareEntries);
}
