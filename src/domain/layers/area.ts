/**
 * The Area layer (`02-architecture/object-model.md`): a life domain.
 *
 * An Area is a **filter**, not a destination — it has no detail screen; a Goal
 * does (`03-experience/surfaces.md`).
 */

export type AreaState = 'active' | 'archived';

export type Area = {
  readonly id: string;
  /** User-editable, which is why identity is the id and not the name. */
  readonly name: string;
  readonly state: AreaState;
};

/**
 * The id of a built-in Area.
 *
 * Fixed rather than generated, because three rules key on identity and none of
 * them can key on a name: **Inbox cannot be archived**, the four seeds draw a
 * glyph, and onboarding offers the four (`05-modules/areas-and-goals.md`).
 *
 * `01J` + a Crockford-safe tag + zero padding = 26 characters. A unit test
 * asserts the result is a valid ULID, which is what catches a wrong length or
 * a letter the alphabet excludes.
 */
function builtInAreaId(n: number): string {
  return `01J0AREASEED${'0'.repeat(12)}${String(n).padStart(2, '0')}`;
}

export const BUILT_IN_AREA_IDS = {
  /** Where capture puts everything, and the default Area for a task. */
  inbox: builtInAreaId(1),
  health: builtInAreaId(2),
  work: builtInAreaId(3),
  home: builtInAreaId(4),
  learning: builtInAreaId(5),
} as const;

/**
 * The four areas first launch seeds. **Inbox is not one of them** — it is the
 * fifth built-in and the one that cannot be archived, which is why the Area
 * list has no empty state at all.
 *
 * The glyphs in `03-experience/components.md` bind to these **ids**, not to the
 * names, so renaming an Area does not lose its glyph (ADR 0022).
 */
export const SEEDED_AREAS = [
  { id: BUILT_IN_AREA_IDS.health, name: 'Health' },
  { id: BUILT_IN_AREA_IDS.work, name: 'Work' },
  { id: BUILT_IN_AREA_IDS.home, name: 'Home' },
  { id: BUILT_IN_AREA_IDS.learning, name: 'Learning' },
] as const;

export const INBOX_AREA_ID = BUILT_IN_AREA_IDS.inbox;

/** Inbox cannot be archived; every other Area can. */
export function canArchiveArea(areaId: string): boolean {
  return areaId !== INBOX_AREA_ID;
}
