import { z } from 'zod';

import { DateStringSchema, UlidSchema } from '../ids';

/**
 * The `habit` domain.
 *
 * `habit.unarchived` exists because archival is reversible (ADR 0012); the
 * compliance entry it feeds is derived, and `'missed'` is never logged.
 */

export const WeekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const CadenceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({ type: z.literal('weekly'), days: z.array(WeekdaySchema).min(1) }),
  z.object({
    type: z.literal('interval'),
    every: z.number().int().positive(),
    unit: z.enum(['day', 'week']),
  }),
]);

/** The four logged states. `missed` is a scheduled day with no entry. */
export const HabitCheckVersionSchema = z.enum(['full', 'minimum', 'repair']);

export const HabitCreatedSchema = z.object({
  habit_id: UlidSchema,
  name: z.string().min(1).max(200),
  cadence: CadenceSchema,
  /** A display string for the floor, not a number of minutes. */
  minimum_viable: z.string().max(200).optional(),
  area_id: UlidSchema,
  protocol_id: UlidSchema.optional(),
});

export const HabitRenamedSchema = z.object({
  habit_id: UlidSchema,
  name: z.string().min(1).max(200),
});

export const HabitCadenceChangedSchema = z.object({
  habit_id: UlidSchema,
  cadence: CadenceSchema,
});

export const HabitMinimumChangedSchema = z.object({
  habit_id: UlidSchema,
  minimum_viable: z.string().max(200),
});

export const HabitLinkedProtocolSchema = z.object({
  habit_id: UlidSchema,
  protocol_id: UlidSchema,
});

export const HabitUnlinkedProtocolSchema = z.object({
  habit_id: UlidSchema,
  protocol_id: UlidSchema,
});

export const HabitCheckedSchema = z.object({
  habit_id: UlidSchema,
  day: DateStringSchema,
  version: HabitCheckVersionSchema,
});

export const HabitUncheckedSchema = z.object({
  habit_id: UlidSchema,
  day: DateStringSchema,
});

export const HabitSkippedSchema = z.object({
  habit_id: UlidSchema,
  day: DateStringSchema,
  reason: z.string().max(200).optional(),
});

export const HabitArchivedSchema = z.object({ habit_id: UlidSchema });
export const HabitUnarchivedSchema = z.object({ habit_id: UlidSchema });

export type Weekday = z.infer<typeof WeekdaySchema>;
export type Cadence = z.infer<typeof CadenceSchema>;
export type HabitCheckVersion = z.infer<typeof HabitCheckVersionSchema>;
export type HabitCreatedPayload = z.infer<typeof HabitCreatedSchema>;
export type HabitRenamedPayload = z.infer<typeof HabitRenamedSchema>;
export type HabitCadenceChangedPayload = z.infer<typeof HabitCadenceChangedSchema>;
export type HabitMinimumChangedPayload = z.infer<typeof HabitMinimumChangedSchema>;
export type HabitLinkedProtocolPayload = z.infer<typeof HabitLinkedProtocolSchema>;
export type HabitUnlinkedProtocolPayload = z.infer<typeof HabitUnlinkedProtocolSchema>;
export type HabitCheckedPayload = z.infer<typeof HabitCheckedSchema>;
export type HabitUncheckedPayload = z.infer<typeof HabitUncheckedSchema>;
export type HabitSkippedPayload = z.infer<typeof HabitSkippedSchema>;
export type HabitArchivedPayload = z.infer<typeof HabitArchivedSchema>;
export type HabitUnarchivedPayload = z.infer<typeof HabitUnarchivedSchema>;
