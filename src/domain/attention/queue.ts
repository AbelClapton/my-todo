import { dayAt } from '@/domain/day';
import type { Instant } from '@/domain/ids';

import {
  CAPS,
  SURFACES,
  type Dismissal,
  type Firing,
  type NudgeFrequency,
  type SurfaceId,
} from './catalog';

/**
 * The queue itself (`03-experience/attention-budget.md` §The queue).
 *
 * Six steps in the doc, and this is those six: check the budget, check the
 * context, look for mergeable candidates, pick the highest priority, fire, and
 * leave the recording to the caller. **Silence is the default** — every early
 * return here is `null`, because a scheduler whose failure mode is a guess is a
 * scheduler that guesses.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type QuietHours = { readonly startHour: number; readonly endHour: number };

/** What the app is allowed to know about the moment it is in. */
export type Context = {
  readonly now: Instant;
  readonly quietHours: QuietHours;
  /**
   * The offset that turns an instant into a local hour, in minutes east of UTC.
   * Quiet hours are *local* by definition, so the offset travels with the context
   * rather than being read from the clock — a scheduler that called `getHours()`
   * would answer differently on the test machine and on the phone.
   */
  readonly tzOffsetMinutes: number;
  /** Focus mode's end. Absent when focus is not running. */
  readonly focusUntil?: Instant;
  /** The current event's end. Absent when the user is not in one. */
  readonly inEventUntil?: Instant;
};

export type BlockReason = 'quiet_hours' | 'focus' | 'in_event';

/**
 * Nothing fires during focus mode, during a calendar event, or outside quiet hours.
 *
 * **In-event suppression wins outright** where two could apply (`06-flows/doing-the-day.md`),
 * which is why the order here is quiet hours, then focus, then the event: the
 * reason reported is the outermost one, and any of them blocks.
 */
export function blockReason(context: Context): BlockReason | null {
  const now = Date.parse(context.now);

  if (context.focusUntil !== undefined && Date.parse(context.focusUntil) > now) {
    return 'focus';
  }
  if (context.inEventUntil !== undefined && Date.parse(context.inEventUntil) > now) {
    return 'in_event';
  }

  const localHour = new Date(now + context.tzOffsetMinutes * MINUTE_MS).getUTCHours();
  const { startHour, endHour } = context.quietHours;
  // Quiet hours cross midnight in the default 22:00–07:00, so the window is a
  // union of two ranges rather than one comparison.
  const inside =
    startHour <= endHour
      ? localHour >= startHour && localHour < endHour
      : localHour >= startHour || localHour < endHour;
  return inside ? 'quiet_hours' : null;
}

export type BudgetParams = {
  readonly now: Instant;
  readonly firings: readonly Firing[];
  readonly frequency: NudgeFrequency;
  readonly tzOffsetMinutes: number;
  readonly boundaryHour: number;
};

export type BudgetState = {
  readonly allowed: boolean;
  /** Nudges fired this Day, against the daily cap. */
  readonly firedToday: number;
  readonly perDay: number;
  /** When the hourly slot opens again. `null` when nothing has fired. */
  readonly nextSlotAt: Instant | null;
};

/**
 * The caps: **one per hour, three per day**, tightened by the frequency setting.
 *
 * A firing is counted twice — against the hour and against the Day — because both
 * caps exist and either can be the one that blocks. The two daily obligations and
 * the now line are not firings at all and never reach here.
 */
export function budgetState(params: BudgetParams): BudgetState {
  const nowMs = Date.parse(params.now);
  const caps = CAPS[params.frequency];
  const today = dayAt(params.now, params.tzOffsetMinutes, params.boundaryHour);

  const firedToday = params.firings.filter(
    (firing) =>
      dayAt(firing.at, params.tzOffsetMinutes, params.boundaryHour) === today &&
      Date.parse(firing.at) <= nowMs,
  ).length;

  const last = params.firings
    .filter((firing) => Date.parse(firing.at) <= nowMs)
    .reduce<Firing | null>(
      (latest, firing) =>
        latest === null || Date.parse(firing.at) > Date.parse(latest.at) ? firing : latest,
      null,
    );

  const nextSlotAt =
    last === null ? null : new Date(Date.parse(last.at) + caps.hourMs).toISOString();
  const hourClear = nextSlotAt === null || nowMs >= Date.parse(nextSlotAt);

  return {
    allowed: hourClear && firedToday < caps.perDay,
    firedToday,
    perDay: caps.perDay,
    nextSlotAt,
  };
}

/** A surface that wants to fire. The flow decides when it becomes true. */
export type Candidate = {
  readonly surface: SurfaceId;
  /**
   * When the condition became true. **The TTL does not run from here** — see
   * `effectiveStart` — but a candidate with no start is treated as brand new.
   */
  readonly becameTrueAt: Instant;
  /** A candidate may beat its surface's typical score, never assume its own. */
  readonly urgency?: number;
  readonly relevance?: number;
};

export type QueueParams = {
  readonly candidates: readonly Candidate[];
  readonly context: Context;
  readonly budget: BudgetState;
  /** Per-surface toggles. An absent entry means enabled, which is the default. */
  readonly disabled?: readonly SurfaceId[];
  readonly dismissals?: readonly Dismissal[];
  /** How recently a surface fired, which is the novelty term. */
  readonly firings?: readonly Firing[];
};

/** What the queue decided to fire, and what it folded into it. */
export type QueueDecision = {
  readonly surfaces: readonly SurfaceId[];
  readonly at: Instant;
  readonly score: number;
};

/**
 * The moment a surface's TTL starts, which is **not** when it became true.
 *
 * *"The countdown starts when the budget first permits the surface to fire. A
 * blocked nudge waits, and the wait does not consume it."* So the clock starts at
 * whichever is later: the condition, or the moment the hourly slot opened. Without
 * this a `contextual` nudge — a 30-minute TTL against a one-per-hour cap — would
 * expire 30 minutes before its slot arrived and never fire at all.
 */
export function effectiveStart(candidate: Candidate, budget: BudgetState): Instant {
  if (budget.nextSlotAt === null) {
    return candidate.becameTrueAt;
  }
  return Date.parse(candidate.becameTrueAt) >= Date.parse(budget.nextSlotAt)
    ? candidate.becameTrueAt
    : budget.nextSlotAt;
}

export function isExpired(candidate: Candidate, budget: BudgetState, now: Instant): boolean {
  const ttlMs = SURFACES[candidate.surface].ttlMinutes * MINUTE_MS;
  return Date.parse(now) - Date.parse(effectiveStart(candidate, budget)) > ttlMs;
}

export type DismissalState = 'active' | 'downranked' | 'suppressed' | 'disabled';

/** First dismissal downranks for a week; the second suppresses for thirty days. */
const DOWNRANK_MS = 7 * DAY_MS;
const SUPPRESS_MS = 30 * DAY_MS;

/**
 * Dismissal decay (`attention-budget.md` §Dismissal decay).
 *
 * Three strikes, and the third is permanent: *"permanent until re-enabled in
 * settings"*. The state is a function of the count **and** the time since the last
 * dismissal, so the second strike wears off after thirty days and the third does
 * not — which is the only reading of the doc's example in which day 31 means
 * anything.
 */
export function dismissalState(
  dismissals: readonly Dismissal[],
  surface: SurfaceId,
  now: Instant,
): DismissalState {
  const mine = dismissals.filter((dismissal) => dismissal.surface === surface);
  if (mine.length === 0) {
    return 'active';
  }
  if (mine.length >= 3) {
    return 'disabled';
  }

  const lastAt = mine.reduce(
    (latest, dismissal) => Math.max(latest, Date.parse(dismissal.at)),
    Number.NEGATIVE_INFINITY,
  );
  const since = Date.parse(now) - lastAt;

  if (mine.length === 2) {
    return since < SUPPRESS_MS ? 'suppressed' : 'active';
  }
  return since < DOWNRANK_MS ? 'downranked' : 'active';
}

/**
 * A surface shown a moment ago scores lower than one never shown —
 * *"novelty breaks ties"* — so the term is bounded below urgency and relevance and
 * cannot outvote either.
 */
export function novelty(firings: readonly Firing[], surface: SurfaceId, now: Instant): number {
  const last = firings
    .filter((firing) => firing.surface === surface)
    .reduce((latest, firing) => Math.max(latest, Date.parse(firing.at)), Number.NEGATIVE_INFINITY);

  if (last === Number.NEGATIVE_INFINITY) {
    return 10;
  }
  return Math.max(0, Math.min(10, ((Date.parse(now) - last) / DAY_MS) * 10));
}

export function score(params: {
  readonly surface: SurfaceId;
  readonly urgency?: number;
  readonly relevance?: number;
  readonly firings: readonly Firing[];
  readonly dismissals: readonly Dismissal[];
  readonly now: Instant;
}): number {
  const row = SURFACES[params.surface];
  const urgency = params.urgency ?? row.urgency;
  const relevance = params.relevance ?? row.relevance;
  const noveltyTerm = novelty(params.firings, params.surface, params.now) / 2;
  const history = dismissalState(params.dismissals ?? [], params.surface, params.now);
  const multiplier = history === 'downranked' ? 0.5 : 1;
  return (urgency + relevance + noveltyTerm) * multiplier;
}

/**
 * The scheduler: budget, context, merge, pick, fire.
 *
 * Merging is **preferred** rather than optional (`§Merging`), so every other
 * eligible candidate marked mergeable is folded into the winner and the whole thing
 * counts as one nudge. A candidate that is not mergeable is simply left in the
 * queue for the next slot — it is not dropped.
 */
export function schedule(params: QueueParams): QueueDecision | null {
  const { context, budget } = params;
  const now = context.now;

  if (!budget.allowed || blockReason(context) !== null) {
    return null;
  }

  const disabled = new Set(params.disabled ?? []);
  const dismissals = params.dismissals ?? [];
  const firings = params.firings ?? [];

  const eligible = params.candidates.filter((candidate) => {
    const state = dismissalState(dismissals, candidate.surface, now);
    if (disabled.has(candidate.surface) || state === 'suppressed' || state === 'disabled') {
      return false;
    }
    return !isExpired(candidate, budget, now);
  });

  const scored = eligible
    .map((candidate) => ({
      candidate,
      value: score({
        surface: candidate.surface,
        ...(candidate.urgency === undefined ? {} : { urgency: candidate.urgency }),
        ...(candidate.relevance === undefined ? {} : { relevance: candidate.relevance }),
        firings,
        dismissals,
        now,
      }),
    }))
    .sort((a, b) => b.value - a.value);

  const winner = scored[0];
  if (winner === undefined) {
    return null;
  }

  const merged = SURFACES[winner.candidate.surface].mergeable
    ? scored
        .slice(1)
        .map((entry) => entry.candidate.surface)
        .filter((surface) => SURFACES[surface].mergeable)
    : [];

  return {
    surfaces: [winner.candidate.surface, ...merged],
    at: now,
    score: winner.value,
  };
}
