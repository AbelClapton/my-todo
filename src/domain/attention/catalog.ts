import type { Instant } from '@/domain/ids';

/**
 * The attention budget's catalog (`03-experience/attention-budget.md`).
 *
 * **One set with `SurfaceId` in `02-architecture/event-log.md` and the per-surface
 * toggles in `05-modules/settings.md`** — adding a surface updates all three in the
 * same change (ADR 0013).
 */

export type SurfaceId =
  | 'prep_card'
  | 'contextual'
  | 'forgotten'
  | 'people'
  | 'weekly_review'
  | 'protocol_review'
  | 'price_drop'
  | 'what_slipped'
  | 'inbox_ritual'
  | 'streak_milestone'
  | 'streak_repair'
  | 'low_energy';

/**
 * The two rituals occupy a slot without being catalog surfaces.
 *
 * ADR 0013: *"The plan consumes a slot when it fires unprompted; it does not
 * consume a slot when the user opens it deliberately."* They are flows rather than
 * nudges — no TTL, no priority score, no merge, no toggle — so they are not in
 * {@link SurfaceId}, and no queue entry can be one. They are named here because a
 * firing is recorded by what fired, and the caps count firings.
 */
export type RitualSurface = 'morning_plan' | 'shutdown';

/** What a firing is recorded against. */
export type FiringId = SurfaceId | RitualSurface;

export type Surface = {
  readonly id: SurfaceId;
  /** The catalog's `Used for` column, which is what keeps neighbours apart. */
  readonly usedFor: string;
  /** Typical urgency, 0–10. A candidate may raise it for its own case. */
  readonly urgency: number;
  readonly relevance: number;
  /** How long it stays relevant once the budget first permits it to fire. */
  readonly ttlMinutes: number;
  readonly mergeable: boolean;
};

/**
 * The catalog, exactly as the table in `attention-budget.md` reads.
 *
 * The scores are *typical*: `score` prefers a candidate's own urgency, because a
 * prep card for a meeting in ten minutes and one for a meeting in nine are the
 * same row and different candidates.
 */
export const SURFACES: Readonly<Record<SurfaceId, Surface>> = {
  prep_card: {
    id: 'prep_card',
    usedFor: '10 min before an event with people or a note',
    urgency: 10,
    relevance: 8,
    ttlMinutes: 10,
    mergeable: false,
  },
  contextual: {
    id: 'contextual',
    usedFor: 'a gap, a cancellation, a free slot, a day that has shifted',
    urgency: 6,
    relevance: 7,
    ttlMinutes: 30,
    mergeable: false,
  },
  forgotten: {
    id: 'forgotten',
    usedFor: 'captures never acted on',
    urgency: 3,
    relevance: 4,
    ttlMinutes: 7 * 24 * 60,
    mergeable: true,
  },
  people: {
    id: 'people',
    usedFor: 'a relationship gone quiet',
    urgency: 2,
    relevance: 4,
    ttlMinutes: 14 * 24 * 60,
    mergeable: true,
  },
  weekly_review: {
    id: 'weekly_review',
    usedFor: "the week's aggregation",
    urgency: 4,
    relevance: 6,
    ttlMinutes: 7 * 24 * 60,
    mergeable: true,
  },
  protocol_review: {
    id: 'protocol_review',
    usedFor: "a protocol's window comparison",
    urgency: 5,
    relevance: 7,
    ttlMinutes: 7 * 24 * 60,
    mergeable: true,
  },
  price_drop: {
    id: 'price_drop',
    usedFor: 'prices moved on a research note',
    urgency: 6,
    relevance: 5,
    ttlMinutes: 24 * 60,
    mergeable: false,
  },
  what_slipped: {
    id: 'what_slipped',
    usedFor: 'tasks that slipped and were not rescheduled',
    urgency: 4,
    relevance: 5,
    ttlMinutes: 24 * 60,
    mergeable: true,
  },
  inbox_ritual: {
    id: 'inbox_ritual',
    usedFor: 'the inbox passed 10 captures',
    urgency: 5,
    relevance: 6,
    ttlMinutes: 24 * 60,
    mergeable: false,
  },
  streak_milestone: {
    id: 'streak_milestone',
    usedFor: 'a streak reached a 30-day multiple',
    urgency: 3,
    relevance: 5,
    ttlMinutes: 48 * 60,
    mergeable: true,
  },
  streak_repair: {
    id: 'streak_repair',
    usedFor: 'a streak broke, with a repair token available',
    urgency: 3,
    relevance: 5,
    ttlMinutes: 48 * 60,
    mergeable: true,
  },
  low_energy: {
    id: 'low_energy',
    usedFor: 'a light day and short tasks',
    urgency: 2,
    relevance: 3,
    ttlMinutes: 4 * 60,
    mergeable: false,
  },
};

/** The three frequencies the settings offer. */
export type NudgeFrequency = 'standard' | 'reduced' | 'minimal';

/**
 * **Maximum one nudge per hour, three per day** — and the reduced and minimal
 * settings tighten exactly that: "1/2 hours, 1/day" and "1/day". The hourly gap and
 * the daily count are one number each, so the two can never disagree.
 */
export const CAPS: Readonly<
  Record<NudgeFrequency, { readonly hourMs: number; readonly perDay: number }>
> = {
  standard: { hourMs: 60 * 60 * 1000, perDay: 3 },
  reduced: { hourMs: 2 * 60 * 60 * 1000, perDay: 1 },
  minimal: { hourMs: 24 * 60 * 60 * 1000, perDay: 1 },
};

/** A surface that already fired. Firings are local and stay in the diagnostics buffer. */
export type Firing = { readonly surface: FiringId; readonly at: Instant };

/** A dismissal, which is what decay reads. */
export type Dismissal = { readonly surface: SurfaceId; readonly at: Instant };
