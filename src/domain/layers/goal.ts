/**
 * The Goal layer (`02-architecture/object-model.md`): an outcome under an Area.
 *
 * A Goal is a **screen**, unlike an Area: it accumulates a history (protocols,
 * reports, metric series) and has an action on it. `area_id` is rewritable, and
 * moving a Goal carries its protocols — they belong to the Goal, not the Area
 * (ADR 0022).
 */

export type GoalState = 'active' | 'achieved' | 'abandoned';

export type Goal = {
  readonly id: string;
  readonly name: string;
  readonly area_id: string;
  readonly state: GoalState;
};
