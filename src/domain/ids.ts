import { z } from 'zod';

/**
 * Identity and time primitives.
 *
 * The three temporal shapes on purpose, because the docs distinguish them:
 *
 * - `DateString` — a **Day**, `YYYY-MM-DD` in the user's local timezone. Not
 *   an instant, and not "a 24-hour window in UTC"
 *   (`02-architecture/day-as-unit.md`). `due`, `defer` and `scheduled_day` are
 *   Days.
 * - `TimeString` — a **time of day**, `HH:mm` local wall-clock, meaningful
 *   only alongside a Day and a point rather than a span (ADR 0025).
 * - `Instant` — ISO-8601 UTC, for things that happened at a moment
 *   (`timestamp`, `completed_at`, an Event's `start`).
 */

/**
 * A ULID: 26 Crockford base32 characters, lexicographically sortable.
 *
 * **Zod 3 is pinned deliberately.** `z.string().ulid()` and
 * `z.string().datetime()` — the forms `10-engineering/code-conventions.md`'s own
 * example uses — are v3's. Zod 4 moves both to top-level (`z.ulid()`,
 * `z.iso.datetime()`), so the major is the doc's choice rather than a
 * preference. Changing it means changing every schema below and the doc.
 */
export const UlidSchema = z.string().ulid();

/** A Day. Deliberately a plain date string, never an instant. */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected a Day as YYYY-MM-DD');

/** A time of day. Deliberately unzoned: the hour is an offset into a Day. */
export const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected a time of day as 'HH:mm'");

/** An instant, ISO-8601, UTC. */
export const InstantSchema = z.string().datetime();

export type Ulid = z.infer<typeof UlidSchema>;
export type DateString = z.infer<typeof DateStringSchema>;
export type TimeString = z.infer<typeof TimeStringSchema>;
export type Instant = z.infer<typeof InstantSchema>;

/**
 * Entity ids are ULIDs and are structurally identical. They are aliased rather
 * than branded because the log payloads name each one (`task_id`, `area_id`),
 * which is where the type information actually lives.
 */
export type TaskId = Ulid;
export type EventId = Ulid;
export type NoteId = Ulid;
export type HabitId = Ulid;
export type AreaId = Ulid;
export type GoalId = Ulid;
export type ProtocolId = Ulid;
export type PersonId = Ulid;
export type EntryId = Ulid;
export type ProposalId = Ulid;
