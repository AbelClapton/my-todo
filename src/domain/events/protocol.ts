import { z } from 'zod';

import { DateStringSchema, UlidSchema } from '../ids';

import { CadenceSchema } from './habit';

/**
 * The `protocol` domain — a time-boxed experiment.
 *
 * The projection layer enforces immutability during `baseline`/`active` even
 * though the UI does too, because a sync from another device or a bug could
 * append a forbidden entry (`02-architecture/projections.md`).
 */

export const HabitSpecSchema = z.object({
  name: z.string().min(1).max(200),
  cadence: CadenceSchema,
  minimum_viable: z.string().max(200).optional(),
});

export const MetricSpecSchema = z.object({
  name: z.string().min(1).max(200),
  scale: z.tuple([z.number(), z.number()]),
  labels: z.array(z.string()).optional(),
});

export const ProtocolProposedSchema = z.object({
  protocol_id: UlidSchema,
  goal_id: UlidSchema,
  hypothesis: z.string().min(1),
  habits: z.array(HabitSpecSchema),
  metric: MetricSpecSchema,
  baseline_days: z.number().int().nonnegative(),
  duration_days: z.number().int().positive(),
  source: z.enum(['ai', 'user']),
  explanation: z.string(),
});

export const ProtocolEditedSchema = z.object({
  protocol_id: UlidSchema,
  /** Only while the protocol is `proposed`. */
  changes: z.record(z.string(), z.unknown()),
});

export const ProtocolAdoptedSchema = z.object({ protocol_id: UlidSchema });
export const ProtocolActivatedSchema = z.object({ protocol_id: UlidSchema });

export const ProtocolMetricLoggedSchema = z.object({
  protocol_id: UlidSchema,
  day: DateStringSchema,
  value: z.number(),
});

export const ProtocolReviewedSchema = z.object({
  protocol_id: UlidSchema,
  report_note_id: UlidSchema,
  decision: z.enum(['continue', 'modify', 'stop']),
});

export const ProtocolCompletedSchema = z.object({ protocol_id: UlidSchema });

export const ProtocolAbandonedSchema = z.object({
  protocol_id: UlidSchema,
  reason: z.string().max(500).optional(),
});

export type HabitSpec = z.infer<typeof HabitSpecSchema>;
export type MetricSpec = z.infer<typeof MetricSpecSchema>;
export type ProtocolProposedPayload = z.infer<typeof ProtocolProposedSchema>;
export type ProtocolEditedPayload = z.infer<typeof ProtocolEditedSchema>;
export type ProtocolAdoptedPayload = z.infer<typeof ProtocolAdoptedSchema>;
export type ProtocolActivatedPayload = z.infer<typeof ProtocolActivatedSchema>;
export type ProtocolMetricLoggedPayload = z.infer<typeof ProtocolMetricLoggedSchema>;
export type ProtocolReviewedPayload = z.infer<typeof ProtocolReviewedSchema>;
export type ProtocolCompletedPayload = z.infer<typeof ProtocolCompletedSchema>;
export type ProtocolAbandonedPayload = z.infer<typeof ProtocolAbandonedSchema>;
