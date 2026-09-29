import type { Cadence, HabitCheckVersion } from '../events/habit';
import type { DateString } from '../ids';

/**
 * The Habit atom (`02-architecture/object-model.md`): anything with a
 * recurrence and a compliance state.
 */

/**
 * Five compliance states, of which **four are logged**. `'missed'` is derived —
 * a scheduled day with no entry — and is never a log entry.
 */
export type ComplianceState = 'done_full' | 'done_minimum' | 'done_repair' | 'skipped' | 'missed';

export type ComplianceEntry = {
  readonly day: DateString;
  readonly state: ComplianceState;
};

/** The logged half: what a check or a skip produced. */
export type LoggedComplianceState = Exclude<ComplianceState, 'missed'>;

export const complianceStateForCheck = (version: HabitCheckVersion): LoggedComplianceState =>
  version === 'full' ? 'done_full' : version === 'minimum' ? 'done_minimum' : 'done_repair';

export type Habit = {
  readonly id: string;
  readonly name: string;
  readonly cadence: Cadence;
  /** A display string for the floor, not a number of minutes. */
  readonly minimum_viable?: string;
  readonly area_id: string;
  /** Set when the habit is part of a protocol. */
  readonly protocol_id?: string;
  readonly state: 'active' | 'archived';
  /** Derived from the log, never stored. */
  readonly compliance: readonly ComplianceEntry[];
};
