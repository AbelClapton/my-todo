import { z } from 'zod';

import { DateStringSchema, UlidSchema } from '../ids';

/**
 * The `day` domain — the app's atomic product unit (ADR 0002).
 *
 * Only five things are logged about a Day; everything else on it is derived.
 * Both rituals write `day.planned` and `day.plan_skipped`, which is why both
 * carry the ritual that wrote them.
 */

/**
 * The boundary that framed the Day at its open (ADR 0027). Recorded on the
 * entry rather than inferred from `system.settings_changed`, which can be
 * absent on a replica holding no `sync: false` entries.
 */
export const DayBoundaryHourSchema = z.union([
  z.literal(0),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const DayOpenedSchema = z.object({
  day: DateStringSchema,
  tz_offset_minutes: z.number().int(),
  /** Entries written before ADR 0027 carry no boundary; projections fall back. */
  boundary_hour: DayBoundaryHourSchema.optional(),
});

/** One-to-three. Three is the target, one is a real plan, zero is a skip. */
export const TopThreeSchema = z.array(UlidSchema).min(1).max(3);

export const DayPlannedSchema = z.object({
  day: DateStringSchema,
  top_three: TopThreeSchema,
  /**
   * Two rituals emit this type and the entry means something different
   * depending on which: `morning` is a commitment the user made, `shutdown` is
   * a tomorrow-plan set up the night before.
   */
  source: z.enum(['morning', 'shutdown']),
});

export const DayPlanSkippedSchema = z.object({
  day: DateStringSchema,
  kind: z.enum(['morning', 'shutdown']),
});

export const DayClosedSchema = z.object({ day: DateStringSchema });

/** Written as `daily_note.created` before ADR 0012. Projections accept both. */
export const DayNoteCreatedSchema = z.object({
  note_id: UlidSchema,
  day: DateStringSchema,
});

export type DayBoundaryHour = z.infer<typeof DayBoundaryHourSchema>;
export type DayOpenedPayload = z.infer<typeof DayOpenedSchema>;
export type DayPlannedPayload = z.infer<typeof DayPlannedSchema>;
export type DayPlanSkippedPayload = z.infer<typeof DayPlanSkippedSchema>;
export type DayClosedPayload = z.infer<typeof DayClosedSchema>;
export type DayNoteCreatedPayload = z.infer<typeof DayNoteCreatedSchema>;
