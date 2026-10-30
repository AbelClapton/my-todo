import { useCallback, useMemo, useState } from 'react';

import { DEFAULT_DAY_BOUNDARY_HOUR } from '@/domain/day';
import { budgetState, blockReason, type BlockReason } from '@/domain/attention/queue';
import { readNudgeSettings } from '@/domain/attention/settings';
import type { Firing, FiringId } from '@/domain/attention/catalog';

import { useLog } from '@/ui/data/use-log';

/**
 * The budget's ledger, client-side.
 *
 * *"Firings are recorded in the client diagnostics buffer (not the event log)"*
 * (`03-experience/attention-budget.md` §The queue), so this is local storage and
 * not a write. Only a **refusal** the user gave has to survive a restart, and that
 * is `system.nudges_silenced` — a different thing, logged, not here.
 *
 * Firings older than a day are dropped on read: the caps are an hour and a day, so
 * a longer ledger would be a record nobody consults.
 */

const LEDGER_KEY = 'small-wins.nudge-ledger';
const LEDGER_KEEP_MS = 24 * 60 * 60 * 1000;

type Ledger = { readonly firings: readonly Firing[] };

function readLedger(now: string): Ledger {
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY);
    if (raw === null) {
      return { firings: [] };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('firings' in parsed)) {
      return { firings: [] };
    }
    const firings = (parsed as Ledger).firings;
    if (!Array.isArray(firings)) {
      return { firings: [] };
    }
    return {
      firings: firings.filter(
        (firing) =>
          typeof firing?.at === 'string' &&
          Date.parse(now) - Date.parse(firing.at) < LEDGER_KEEP_MS,
      ),
    };
  } catch {
    // A corrupt ledger is a ledger that has never fired anything: the budget fails
    // open, and the caps are a courtesy rather than a lock.
    return { firings: [] };
  }
}

export type NudgeBudget = {
  /** True when the hourly and daily caps both have room. */
  readonly allowed: boolean;
  /** Why the app is quiet right now, if it is. */
  readonly blocked: BlockReason | null;
  /** The two together, which is what a surface actually asks. */
  readonly maySurface: boolean;
  readonly block: (surface: FiringId) => void;
};

export type NudgeBudgetContext = {
  readonly focusUntil?: string;
  readonly inEventUntil?: string;
};

export function useNudgeBudget(now: string, context: NudgeBudgetContext = {}): NudgeBudget {
  const { entries } = useLog();
  const [ledger, setLedger] = useState<Ledger>(() => readLedger(now));
  const focusUntil = context.focusUntil;
  const inEventUntil = context.inEventUntil;

  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);
  const settings = useMemo(() => readNudgeSettings(entries), [entries]);

  const budget = useMemo(
    () =>
      budgetState({
        now,
        firings: ledger.firings,
        frequency: settings.frequency,
        tzOffsetMinutes,
        boundaryHour: DEFAULT_DAY_BOUNDARY_HOUR,
      }),
    [now, ledger.firings, settings.frequency, tzOffsetMinutes],
  );

  const blocked = useMemo(
    () =>
      blockReason({
        now,
        tzOffsetMinutes,
        quietHours: settings.quietHours,
        ...(focusUntil === undefined ? {} : { focusUntil }),
        ...(inEventUntil === undefined ? {} : { inEventUntil }),
      }),
    [now, tzOffsetMinutes, settings.quietHours, focusUntil, inEventUntil],
  );

  const block = useCallback(
    (surface: FiringId) => {
      setLedger((current) => {
        const next: Ledger = { firings: [...current.firings, { surface, at: now }] };
        try {
          window.localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
        } catch {
          // A ledger that cannot be written is still the one in memory; the cost of
          // failing to persist it is one extra nudge next session.
        }
        return next;
      });
    },
    [now],
  );

  return {
    allowed: budget.allowed,
    blocked,
    maySurface: budget.allowed && blocked === null,
    block,
  };
}
