import { z } from 'zod';

import { DateStringSchema, UlidSchema } from '../ids';

/**
 * The `calendar` domain — the Event atom.
 *
 * The domain is `calendar`, not `event`, because `event` collided with the
 * Event atom (ADR 0007).
 */

export const CalendarSourceSchema = z.enum([
  'in_app',
  'google_calendar',
  'apple_calendar',
  'outlook_calendar',
]);

export const CalendarCreatedSchema = z.object({
  event_id: UlidSchema,
  title: z.string().min(1).max(500),
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  /** Clock values are not drawn; the event belongs in the day's band. */
  all_day: z.boolean(),
  day: DateStringSchema,
});

export const CalendarUpdatedSchema = z.object({
  event_id: UlidSchema,
  title: z.string().min(1).max(500).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  all_day: z.boolean().optional(),
});

export const CalendarLinkedPersonSchema = z.object({
  event_id: UlidSchema,
  person_id: UlidSchema,
});

export const CalendarUnlinkedPersonSchema = z.object({
  event_id: UlidSchema,
  person_id: UlidSchema,
});

export const CalendarDeletedSchema = z.object({ event_id: UlidSchema });

export const CalendarMirroredSchema = z.object({
  event_id: UlidSchema,
  source: CalendarSourceSchema.exclude(['in_app']),
  retrieved_at: z.string().datetime(),
  /**
   * Normalized at retrieval. `raw` is kept unchanged, so an entry written
   * before ADR 0026 carries no normalized key and a projection reads `raw` for
   * it — a permanent fallback, not a migration that ends.
   */
  all_day: z.boolean().optional(),
  raw: z.unknown(),
});

export type CalendarSource = z.infer<typeof CalendarSourceSchema>;
export type CalendarCreatedPayload = z.infer<typeof CalendarCreatedSchema>;
export type CalendarUpdatedPayload = z.infer<typeof CalendarUpdatedSchema>;
export type CalendarLinkedPersonPayload = z.infer<typeof CalendarLinkedPersonSchema>;
export type CalendarUnlinkedPersonPayload = z.infer<typeof CalendarUnlinkedPersonSchema>;
export type CalendarDeletedPayload = z.infer<typeof CalendarDeletedSchema>;
export type CalendarMirroredPayload = z.infer<typeof CalendarMirroredSchema>;
