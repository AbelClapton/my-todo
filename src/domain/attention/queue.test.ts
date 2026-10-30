import { describe, expect, it } from 'vitest';

import type { Instant } from '@/domain/ids';

import type { Firing, SurfaceId } from './catalog';
import {
  blockReason,
  budgetState,
  dismissalState,
  effectiveStart,
  isExpired,
  novelty,
  schedule,
  score,
  type Candidate,
  type Context,
} from './queue';

/**
 * The budget's rules are all about **time and precedence**, so every test here
 * works from an explicit clock rather than a real one. `03-experience/attention-budget.md`
 * is the spec; where a case comes from a doc example, the example is named.
 */

/** 2026-10-30T14:05:00Z, a Friday afternoon. */
const NOW: Instant = '2026-10-30T14:05:00.000Z';
const at = (iso: string): Instant => iso;

const QUIET: Context['quietHours'] = { startHour: 22, endHour: 7 };

function context(patch: Partial<Context> = {}): Context {
  return { now: NOW, quietHours: QUIET, tzOffsetMinutes: 0, ...patch };
}

/** `now` on a date, so an assertion can say "an hour later" without arithmetic. */
function offset(iso: string, minutes: number): Instant {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

const NO_FIRINGS: readonly Firing[] = [];

describe('the three context blocks', () => {
  it('blocks inside quiet hours, including the window that crosses midnight', () => {
    // 23:30 local on a default 22:00–07:00 window.
    expect(blockReason(context({ now: at('2026-10-30T23:30:00.000Z') }))).toBe('quiet_hours');
    expect(blockReason(context({ now: at('2026-10-30T06:30:00.000Z') }))).toBe('quiet_hours');
    expect(blockReason(context({ now: at('2026-10-30T07:00:00.000Z') }))).toBeNull();
    expect(blockReason(context({ now: at('2026-10-30T21:59:00.000Z') }))).toBeNull();
  });

  it('blocks during focus and during an event, and names the outermost reason', () => {
    expect(blockReason(context({ focusUntil: at('2026-10-30T14:25:00.000Z') }))).toBe('focus');
    expect(blockReason(context({ inEventUntil: at('2026-10-30T14:45:00.000Z') }))).toBe('in_event');
    // Both over: neither blocks.
    expect(
      blockReason(
        context({
          focusUntil: at('2026-10-30T14:00:00.000Z'),
          inEventUntil: at('2026-10-30T14:01:00.000Z'),
        }),
      ),
    ).toBeNull();
  });
});

describe('the caps', () => {
  const base = { now: NOW, frequency: 'standard', tzOffsetMinutes: 0, boundaryHour: 4 } as const;

  it('allows a nudge when nothing has fired', () => {
    const budget = budgetState({ ...base, firings: NO_FIRINGS });
    expect(budget.allowed).toBe(true);
    expect(budget.firedToday).toBe(0);
    expect(budget.nextSlotAt).toBeNull();
  });

  it('waits an hour after one, and says when the slot opens', () => {
    const firings: readonly Firing[] = [
      { surface: 'prep_card', at: at('2026-10-30T13:30:00.000Z') },
    ];
    const budget = budgetState({ ...base, firings });

    expect(budget.allowed).toBe(false);
    expect(budget.nextSlotAt).toBe('2026-10-30T14:30:00.000Z');
  });

  it('stops at three in a day, even with the hour clear', () => {
    const firings: readonly Firing[] = [
      { surface: 'prep_card', at: at('2026-10-30T08:00:00.000Z') },
      { surface: 'contextual', at: at('2026-10-30T10:00:00.000Z') },
      { surface: 'inbox_ritual', at: at('2026-10-30T12:00:00.000Z') },
    ];
    const budget = budgetState({ ...base, now: at('2026-10-30T16:00:00.000Z'), firings });

    expect(budget.firedToday).toBe(3);
    expect(budget.allowed).toBe(false);
  });

  it('tightens with the frequency setting, which is the same two numbers', () => {
    const firings: readonly Firing[] = [{ surface: 'people', at: at('2026-10-30T13:30:00.000Z') }];
    // Reduced is 1 per two hours: the slot is not open at 14:05.
    expect(budgetState({ ...base, firings, frequency: 'reduced' }).allowed).toBe(false);
    expect(budgetState({ ...base, firings, frequency: 'reduced' }).nextSlotAt).toBe(
      '2026-10-30T15:30:00.000Z',
    );
  });

  it('counts the rituals as firings, because they consume a slot', () => {
    const firings: readonly Firing[] = [
      { surface: 'morning_plan', at: at('2026-10-30T13:45:00.000Z') },
    ];
    expect(budgetState({ ...base, firings }).allowed).toBe(false);
  });

  it('ignores a firing recorded after the clock it is asked about', () => {
    // A replica whose clock went backwards has one entry in the future; it must not
    // silence the app until it catches up.
    const firings: readonly Firing[] = [
      { surface: 'prep_card', at: at('2026-10-30T18:00:00.000Z') },
    ];
    expect(budgetState({ ...base, firings }).allowed).toBe(true);
  });
});

describe('a blocked nudge waits rather than expiring', () => {
  const budget = budgetState({
    now: at('2026-10-30T14:20:00.000Z'),
    firings: [{ surface: 'prep_card', at: at('2026-10-30T13:20:00.000Z') }],
    frequency: 'standard',
    tzOffsetMinutes: 0,
    boundaryHour: 4,
  });

  const contextual: Candidate = {
    surface: 'contextual',
    becameTrueAt: at('2026-10-30T14:05:00.000Z'),
  };

  it('starts the TTL at the moment the slot opened, not when the fact became true', () => {
    // The doc's sharpest case: a 30-minute TTL under a one-per-hour cap. Measured
    // from 14:05 it would expire at 14:35 and the slot opens at 14:20 — so it would
    // lose 15 minutes of its life, and could lose all of it.
    expect(effectiveStart(contextual, budget)).toBe('2026-10-30T14:20:00.000Z');
    expect(isExpired(contextual, budget, at('2026-10-30T14:45:00.000Z'))).toBe(false);
    expect(isExpired(contextual, budget, at('2026-10-30T14:51:00.000Z'))).toBe(true);
  });
});

describe('dismissal decay', () => {
  const surface: SurfaceId = 'people';

  it('downranks for a week, suppresses for thirty days, and ends there', () => {
    const once = [{ surface, at: at('2026-10-30T09:00:00.000Z') }];
    const twice = [...once, { surface, at: at('2026-10-30T10:00:00.000Z') }];
    const thrice = [...twice, { surface, at: at('2026-10-30T11:00:00.000Z') }];

    expect(dismissalState(once, surface, NOW)).toBe('downranked');
    expect(dismissalState(once, surface, at('2026-11-07T09:00:00.000Z'))).toBe('active');

    expect(dismissalState(twice, surface, NOW)).toBe('suppressed');
    // "On day 31, it may appear."
    expect(dismissalState(twice, surface, at('2026-11-30T10:00:00.000Z'))).toBe('active');

    expect(dismissalState(thrice, surface, at('2027-10-30T11:00:00.000Z'))).toBe('disabled');
  });

  it('leaves an untouched surface alone', () => {
    expect(dismissalState([], surface, NOW)).toBe('active');
  });
});

describe('scoring', () => {
  const args = { firings: NO_FIRINGS, dismissals: [], now: NOW } as const;

  it('lets urgency and relevance dominate and novelty break ties', () => {
    const fresh = score({ ...args, surface: 'prep_card' });
    const stale = score({
      ...args,
      surface: 'prep_card',
      firings: [{ surface: 'prep_card', at: offset(NOW, -60) }],
    });

    expect(fresh).toBeGreaterThan(stale);
    // A tie broken by novelty is still a small gap: urgency plus relevance is 18.
    expect(fresh - stale).toBeLessThan(18);
  });

  it('halves a downranked surface rather than hiding it', () => {
    const dismissed = score({
      ...args,
      surface: 'people',
      dismissals: [{ surface: 'people', at: offset(NOW, -60) }],
    });
    expect(dismissed).toBeCloseTo(score({ ...args, surface: 'people' }) / 2);
  });

  it('scores a surface never shown at the top of its novelty range', () => {
    expect(novelty(NO_FIRINGS, 'forgotten', NOW)).toBe(10);
    expect(
      novelty([{ surface: 'forgotten', at: offset(NOW, -60) }], 'forgotten', NOW),
    ).toBeLessThan(1);
  });
});

describe('the queue', () => {
  const clear = budgetState({
    now: NOW,
    firings: NO_FIRINGS,
    frequency: 'standard',
    tzOffsetMinutes: 0,
    boundaryHour: 4,
  });

  it('is silent when there is nothing to say', () => {
    expect(schedule({ candidates: [], context: context(), budget: clear })).toBeNull();
  });

  it('does not fire when the cap is full, however good the candidate', () => {
    const blocked = budgetState({
      now: NOW,
      firings: [{ surface: 'prep_card', at: offset(NOW, -10) }],
      frequency: 'standard',
      tzOffsetMinutes: 0,
      boundaryHour: 4,
    });
    const decision = schedule({
      candidates: [{ surface: 'prep_card', becameTrueAt: NOW, urgency: 10 }],
      context: context(),
      budget: blocked,
    });
    expect(decision).toBeNull();
  });

  it('does not fire during quiet hours', () => {
    const decision = schedule({
      candidates: [{ surface: 'prep_card', becameTrueAt: NOW }],
      context: context({ now: at('2026-10-30T23:00:00.000Z') }),
      budget: clear,
    });
    expect(decision).toBeNull();
  });

  it('picks the higher score, and leaves the rest for the next slot', () => {
    // The doc's busy-afternoon example: the prep card wins and the contextual
    // nudge waits.
    const decision = schedule({
      candidates: [
        { surface: 'contextual', becameTrueAt: NOW },
        { surface: 'prep_card', becameTrueAt: NOW },
        { surface: 'weekly_review', becameTrueAt: NOW },
      ],
      context: context(),
      budget: clear,
    });

    expect(decision?.surfaces).toEqual(['prep_card']);
  });

  it('merges mergeable candidates into one nudge and defers the rest', () => {
    // The doc's Sunday-evening example.
    const decision = schedule({
      candidates: [
        { surface: 'weekly_review', becameTrueAt: NOW },
        { surface: 'protocol_review', becameTrueAt: NOW },
        { surface: 'inbox_ritual', becameTrueAt: NOW },
      ],
      context: context(),
      budget: clear,
    });

    // protocol_review scores higher, so it wins and weekly_review merges into it.
    expect(decision?.surfaces).toEqual(['protocol_review', 'weekly_review']);
  });

  it('does not merge through a winner that is not mergeable', () => {
    const decision = schedule({
      candidates: [
        { surface: 'contextual', becameTrueAt: NOW, urgency: 10 },
        { surface: 'weekly_review', becameTrueAt: NOW },
      ],
      context: context(),
      budget: clear,
    });

    expect(decision?.surfaces).toEqual(['contextual']);
  });

  it('obeys the switches, the suppression, and the clock', () => {
    const candidates: readonly Candidate[] = [
      { surface: 'people', becameTrueAt: NOW },
      { surface: 'forgotten', becameTrueAt: NOW },
      { surface: 'low_energy', becameTrueAt: NOW },
    ];

    expect(
      schedule({
        candidates,
        context: context(),
        budget: clear,
        disabled: ['forgotten', 'low_energy'],
      })?.surfaces,
    ).toEqual(['people']);

    expect(
      schedule({
        candidates,
        context: context(),
        budget: clear,
        dismissals: [
          { surface: 'forgotten', at: offset(NOW, -60) },
          { surface: 'forgotten', at: offset(NOW, -30) },
        ],
      })?.surfaces,
    ).toEqual(['people']);

    // A contextual nudge that became true two hours ago has expired.
    expect(
      schedule({
        candidates: [{ surface: 'contextual', becameTrueAt: offset(NOW, -120) }],
        context: context(),
        budget: clear,
      }),
    ).toBeNull();
  });
});
