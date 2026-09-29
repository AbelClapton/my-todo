import { z } from 'zod';

import { UlidSchema } from '../ids';

/**
 * The `area` and `goal` domains — two of the four layers.
 *
 * `area.unarchived` and `goal.reassigned_area` both exist because ADR 0022
 * found the log could archive an Area with no inverse and could not move a
 * Goal. `area.deleted` is deliberately absent (ADR 0012).
 */

export const AreaCreatedSchema = z.object({
  area_id: UlidSchema,
  name: z.string().min(1).max(200),
});

export const AreaRenamedSchema = z.object({
  area_id: UlidSchema,
  name: z.string().min(1).max(200),
});

export const AreaArchivedSchema = z.object({ area_id: UlidSchema });
export const AreaUnarchivedSchema = z.object({ area_id: UlidSchema });

export type AreaCreatedPayload = z.infer<typeof AreaCreatedSchema>;
export type AreaRenamedPayload = z.infer<typeof AreaRenamedSchema>;
export type AreaArchivedPayload = z.infer<typeof AreaArchivedSchema>;
export type AreaUnarchivedPayload = z.infer<typeof AreaUnarchivedSchema>;

export const GoalCreatedSchema = z.object({
  goal_id: UlidSchema,
  name: z.string().min(1).max(200),
  area_id: UlidSchema,
});

export const GoalRenamedSchema = z.object({
  goal_id: UlidSchema,
  name: z.string().min(1).max(200),
});

/**
 * Re-filing does not change the outcome: a Goal's protocols belong to the
 * Goal, so they move with it (ADR 0022).
 */
export const GoalReassignedAreaSchema = z.object({
  goal_id: UlidSchema,
  area_id: UlidSchema,
});

export const GoalAchievedSchema = z.object({ goal_id: UlidSchema });

export const GoalAbandonedSchema = z.object({
  goal_id: UlidSchema,
  reason: z.string().max(500).optional(),
});

export const GoalReopenedSchema = z.object({ goal_id: UlidSchema });

export type GoalCreatedPayload = z.infer<typeof GoalCreatedSchema>;
export type GoalRenamedPayload = z.infer<typeof GoalRenamedSchema>;
export type GoalReassignedAreaPayload = z.infer<typeof GoalReassignedAreaSchema>;
export type GoalAchievedPayload = z.infer<typeof GoalAchievedSchema>;
export type GoalAbandonedPayload = z.infer<typeof GoalAbandonedSchema>;
export type GoalReopenedPayload = z.infer<typeof GoalReopenedSchema>;
