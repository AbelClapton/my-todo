import { z } from 'zod';

import { UlidSchema } from '../ids';

/**
 * The `person` domain.
 *
 * A Person has no field a link cannot produce — that is the enforceable half of
 * "it does not exist on its own" (`05-modules/people.md`), and it is what the
 * prep card's "adds no data" depends on. `source` records how the Person
 * arrived, which is also the only bulk-creation path the app has.
 */

export const PersonCreatedSchema = z.object({
  person_id: UlidSchema,
  name: z.string().min(1).max(200),
  source: z.enum(['manual', 'contacts']),
});

export const PersonRenamedSchema = z.object({
  person_id: UlidSchema,
  name: z.string().min(1).max(200),
});

export const PersonArchivedSchema = z.object({ person_id: UlidSchema });
export const PersonUnarchivedSchema = z.object({ person_id: UlidSchema });

export type PersonCreatedPayload = z.infer<typeof PersonCreatedSchema>;
export type PersonRenamedPayload = z.infer<typeof PersonRenamedSchema>;
export type PersonArchivedPayload = z.infer<typeof PersonArchivedSchema>;
export type PersonUnarchivedPayload = z.infer<typeof PersonUnarchivedSchema>;
