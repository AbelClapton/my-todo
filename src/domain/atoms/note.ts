import type { AttachmentTarget } from '../events/note';

/**
 * The Note atom (`02-architecture/object-model.md`): anything with a body.
 *
 * `attached_to` is edge 11 and it is exactly one target — a Note cannot attach
 * to two and cannot be unattached, only reattached. There is no removal state
 * (ADR 0016), so `deleted` is the only lifecycle flag.
 */
export type Note = {
  readonly id: string;
  readonly title?: string;
  /** Markdown. */
  readonly body: string;
  readonly attached_to: AttachmentTarget;
  readonly deleted: boolean;
};
