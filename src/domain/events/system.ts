import { z } from 'zod';

import { DateStringSchema } from '../ids';

import { SurfaceIdSchema, SettingsKeySchema } from './settings-key';

/**
 * The `system` domain.
 *
 * Three of these are refusals recorded so a flow's exits are entries rather
 * than inferences: `system.nudges_silenced` (ADR 0024) and
 * `system.lapse_skipped` (ADR 0021). Sync operations and nudge firings are
 * **not** here — both are client-side diagnostics, in a buffer, not the log.
 */

export const SystemSettingsChangedSchema = z.object({
  key: SettingsKeySchema,
  value: z.unknown(),
});

/**
 * A per-day refusal. The array is the decision: a second refusal of the same
 * day extends the first instead of overwriting it, which two per-flow types
 * could not do (ADR 0024). A new entry, never an amendment — the projection
 * reads the latest array for the day.
 */
export const SystemNudgesSilencedSchema = z.object({
  day: DateStringSchema,
  surface_ids: z.array(SurfaceIdSchema),
});

/** One of the lapse's three exits. No `system.lapse_shown`: firings are not logged. */
export const SystemLapseSkippedSchema = z.object({
  lapsed_days: z.number().int().nonnegative(),
});

export const SystemFreshStartSchema = z.object({
  lapsed_days: z.number().int().nonnegative(),
  archived_tasks: z.number().int().nonnegative(),
  archived_protocols: z.number().int().nonnegative(),
});

export const SystemCatchUpSchema = z.object({
  lapsed_days: z.number().int().nonnegative(),
});

export const SystemClockCorrectedSchema = z.object({
  skew_seconds: z.number().int(),
});

export const SystemAuthExpiredSchema = z.object({
  reason: z.string().max(500),
});

export type SystemSettingsChangedPayload = z.infer<typeof SystemSettingsChangedSchema>;
export type SystemNudgesSilencedPayload = z.infer<typeof SystemNudgesSilencedSchema>;
export type SystemLapseSkippedPayload = z.infer<typeof SystemLapseSkippedSchema>;
export type SystemFreshStartPayload = z.infer<typeof SystemFreshStartSchema>;
export type SystemCatchUpPayload = z.infer<typeof SystemCatchUpSchema>;
export type SystemClockCorrectedPayload = z.infer<typeof SystemClockCorrectedSchema>;
export type SystemAuthExpiredPayload = z.infer<typeof SystemAuthExpiredSchema>;
