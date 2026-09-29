import type { HabitSpec, MetricSpec } from '../events/protocol';
import type { Instant } from '../ids';

/**
 * The Protocol layer (`02-architecture/object-model.md`): a time-boxed
 * experiment.
 *
 * `baseline` is not a warm-up: the metric is logged daily through it, so
 * abandoning on baseline day 13 still leaves 13 metric entries. That is why the
 * report threshold counts **logged** days rather than active ones.
 */

export type ProtocolStatus = 'proposed' | 'baseline' | 'active' | 'completed' | 'abandoned';

/** The statuses during which the hypothesis, metric and habit list are frozen. */
export const FROZEN_PROTOCOL_STATUSES: readonly ProtocolStatus[] = ['baseline', 'active'];

export type Protocol = {
  readonly id: string;
  readonly goal_id: string;
  readonly hypothesis: string;
  /** Become Habits on adoption. */
  readonly habit_specs: readonly HabitSpec[];
  readonly metric: MetricSpec;
  readonly baseline_days: number;
  readonly duration_days: number;
  readonly status: ProtocolStatus;
  readonly started_at?: Instant;
  readonly baseline_ends_at?: Instant;
  readonly review_at?: Instant;
  readonly source: 'ai' | 'user';
  readonly explanation: string;
};

/**
 * `M` on the protocol card, defined once and consumed in three places: the
 * card's "day N of M", the review date, and the report's window — all three are
 * `adoption_date + baseline_days + duration_days`.
 */
export function protocolTotalDays(protocol: Protocol): number {
  return protocol.baseline_days + protocol.duration_days;
}
