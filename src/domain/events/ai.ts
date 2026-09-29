import { z } from 'zod';

import { UlidSchema } from '../ids';

/**
 * The `ai` domain.
 *
 * These entries record what the AI did, not what it could do. `ai.applied`
 * carries one ULID per resulting entry and all of them share a `proposal_id`,
 * which is what lets undo reverse a multi-entry action atomically.
 */

export const AiTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const AiProposedSchema = z.object({
  proposal_id: UlidSchema,
  tier: AiTierSchema,
  context: z.unknown(),
  proposal: z.unknown(),
  explanation: z.string(),
});

export const AiAppliedSchema = z.object({
  proposal_id: UlidSchema,
  /** One entry per mutation, all sharing the `proposal_id`. */
  applied_as: z.array(UlidSchema),
});

export const AiRejectedSchema = z.object({
  proposal_id: UlidSchema,
  reason: z.string().max(500).optional(),
});

export const AiResearchStartedSchema = z.object({
  task_id: UlidSchema,
  query: z.string(),
  tier: z.literal(2),
});

export const AiResearchCompletedSchema = z.object({
  task_id: UlidSchema,
  note_id: UlidSchema,
  retrieved_at: z.string().datetime(),
  sources: z.array(z.unknown()),
});

export const AiFailedSchema = z.object({
  call_id: UlidSchema,
  tier: AiTierSchema,
  kind: z.enum(['network', 'schema', 'timeout', 'refused']),
  duration_ms: z.number().int().nonnegative(),
});

export type AiTier = z.infer<typeof AiTierSchema>;
export type AiProposedPayload = z.infer<typeof AiProposedSchema>;
export type AiAppliedPayload = z.infer<typeof AiAppliedSchema>;
export type AiRejectedPayload = z.infer<typeof AiRejectedSchema>;
export type AiResearchStartedPayload = z.infer<typeof AiResearchStartedSchema>;
export type AiResearchCompletedPayload = z.infer<typeof AiResearchCompletedSchema>;
export type AiFailedPayload = z.infer<typeof AiFailedSchema>;
