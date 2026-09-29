/**
 * The Person layer (`02-architecture/object-model.md`): a human.
 *
 * A Person has **no field a link cannot produce** — that is the enforceable
 * half of "it does not exist on its own" (`05-modules/people.md`), and it is
 * what the prep card's "adds no data" depends on. A Person can therefore exist
 * without links, but cannot *arrive* without them.
 */

export type PersonState = 'active' | 'archived';

export type Person = {
  readonly id: string;
  readonly name: string;
  /** How the Person arrived — manual, or the app's only bulk creation. */
  readonly source: 'manual' | 'contacts';
  readonly state: PersonState;
};
