import { z } from 'zod';

import { DateStringSchema, UlidSchema } from '../ids';

/**
 * The `note` domain.
 *
 * A Note attaches to exactly one entity (edge 11), and it cannot be
 * unattached — only reattached. There is no removal state (ADR 0016), so there
 * is no `note.archived`.
 *
 * `note.edited` carries the **whole body**, and the log states no coalescing
 * rule, which is why the editor's write rate is a decision still open rather
 * than an implementation detail.
 */

export const AttachmentTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task'), id: UlidSchema }),
  z.object({ type: z.literal('event'), id: UlidSchema }),
  z.object({ type: z.literal('habit'), id: UlidSchema }),
  z.object({ type: z.literal('protocol'), id: UlidSchema }),
  /** A Day's identity is its date, not a ULID. */
  z.object({ type: z.literal('day'), id: DateStringSchema }),
  z.object({ type: z.literal('person'), id: UlidSchema }),
]);

export const NoteCreatedSchema = z.object({
  note_id: UlidSchema,
  body: z.string(),
  title: z.string().max(500).optional(),
  attached_to: AttachmentTargetSchema,
});

export const NoteEditedSchema = z.object({
  note_id: UlidSchema,
  body: z.string(),
  title: z.string().max(500).optional(),
});

export const NoteReattachedSchema = z.object({
  note_id: UlidSchema,
  from: AttachmentTargetSchema,
  to: AttachmentTargetSchema,
});

export const NoteDeletedSchema = z.object({ note_id: UlidSchema });

export type AttachmentTarget = z.infer<typeof AttachmentTargetSchema>;
export type NoteCreatedPayload = z.infer<typeof NoteCreatedSchema>;
export type NoteEditedPayload = z.infer<typeof NoteEditedSchema>;
export type NoteReattachedPayload = z.infer<typeof NoteReattachedSchema>;
export type NoteDeletedPayload = z.infer<typeof NoteDeletedSchema>;
