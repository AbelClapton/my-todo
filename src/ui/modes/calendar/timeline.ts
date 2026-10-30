import type { DateString, Instant } from '@/domain/ids';

/**
 * The Day's timeline arithmetic (`05-modules/calendar.md` §The axis).
 *
 * Three numbers are quoted from the doc and none of them is a token:
 *
 * - **56px per hour** — *"the scale is the Week's, and the Month's"*, chosen so
 *   the pinch between the views is a real zoom rather than a rescale.
 * - **a 19px floor** — anything under ~19 minutes *"cannot hold its own name"*, so
 *   it draws at the floor and *"the time label carries the truth"*.
 * - **the window is the Day** — `[boundary, boundary + 24h)`, which is 1344px and
 *   scrolls inside itself.
 *
 * Concurrency follows the Day's own implementation of the one rule — *"two items
 * sit side by side at half width each and three at thirds … A cluster of four or
 * more collapses to one block plus a `+N` chip"*.
 */

export const HOUR_HEIGHT_PX = 56;
export const BLOCK_FLOOR_PX = 19;
export const MINUTES_PER_DAY = 24 * 60;

/** The floor in minutes, so clusters can be measured before they are drawn. */
const FLOOR_MINUTES = Math.ceil((BLOCK_FLOOR_PX / HOUR_HEIGHT_PX) * 60);

const MAX_LANES = 3;

export type AxisItem = {
  readonly id: string;
  readonly kind: 'event' | 'task';
  readonly title: string;
  /** Minutes from the Day's boundary, 0–1440. */
  readonly startMinutes: number;
  readonly durationMinutes: number;
};

/**
 * Where an instant falls in the Day, in minutes from its boundary.
 *
 * The boundary is a *local* clock hour on a *named* Day, so it is rebuilt from
 * the date and the offset rather than read from the instant: that is the whole
 * reason the boundary is recorded on `day.opened` (ADR 0027).
 */
export function minutesSinceBoundary(
  instant: Instant,
  date: DateString,
  boundaryHour: number,
  tzOffsetMinutes: number,
): number {
  const boundaryMs =
    Date.parse(`${date}T00:00:00Z`) + boundaryHour * 3_600_000 - tzOffsetMinutes * 60_000;
  return (Date.parse(instant) - boundaryMs) / 60_000;
}

/** A block's drawn height: its duration, with the floor. */
export function heightFor(durationMinutes: number): number {
  return Math.max(BLOCK_FLOOR_PX, (durationMinutes / 60) * HOUR_HEIGHT_PX);
}

export type AxisMark = AxisItem & {
  readonly topPx: number;
  readonly heightPx: number;
  /** Which of the cluster's side-by-side positions this mark occupies. */
  readonly lane: number;
  /** How many positions the cluster has. */
  readonly lanes: number;
};

/** A cluster of items that touch, drawn either as lanes or as one block. */
export type AxisCluster = {
  readonly marks: readonly AxisMark[];
  /** Non-zero when the cluster was too large to split, and carries a `+N` chip. */
  readonly overflow: number;
};

type Span = {
  readonly item: AxisItem;
  /** The interval the *drawing* occupies, which is the floor when it is short. */
  readonly from: number;
  readonly to: number;
};

function toSpan(item: AxisItem): Span {
  const from = Math.max(0, Math.min(MINUTES_PER_DAY, item.startMinutes));
  const drawn = Math.max(item.durationMinutes, FLOOR_MINUTES);
  return { item, from, to: Math.min(MINUTES_PER_DAY, from + drawn) };
}

/** Greedy lane assignment: the first lane whose last item has already ended. */
function assignLanes(spans: readonly Span[]): Map<string, number> {
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();

  for (const span of spans) {
    let lane = laneEnds.findIndex((end) => end <= span.from);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.to);
    } else {
      laneEnds[lane] = span.to;
    }
    laneOf.set(span.item.id, lane);
  }

  return laneOf;
}

export function layoutAxis(items: readonly AxisItem[]): readonly AxisCluster[] {
  const spans = items
    .map(toSpan)
    .sort((a, b) => a.from - b.from || (a.item.id < b.item.id ? -1 : 1));

  const clusters: Span[][] = [];
  let current: Span[] = [];
  let reach = -Infinity;

  for (const span of spans) {
    if (span.from >= reach) {
      if (current.length > 0) {
        clusters.push(current);
      }
      current = [span];
      reach = span.to;
      continue;
    }
    current.push(span);
    reach = Math.max(reach, span.to);
  }
  if (current.length > 0) {
    clusters.push(current);
  }

  return clusters.map((cluster): AxisCluster => {
    const laneOf = assignLanes(cluster);
    const laneCount = Math.max(...[...laneOf.values()]) + 1;

    // Four or more cannot hold a name at a third of the block's width, so the
    // cluster becomes one block and a count — the doc's own reading of the rule
    // at this width.
    if (laneCount > MAX_LANES) {
      const [first] = cluster;
      const kept = first === undefined ? [] : [first];
      return {
        marks: kept.map((span) => markOf(span, 0, 1)),
        overflow: cluster.length - kept.length,
      };
    }

    return {
      marks: cluster.map((span) => markOf(span, laneOf.get(span.item.id) ?? 0, laneCount)),
      overflow: 0,
    };
  });
}

function markOf(span: Span, lane: number, lanes: number): AxisMark {
  return {
    ...span.item,
    topPx: (span.from / 60) * HOUR_HEIGHT_PX,
    heightPx: heightFor(span.item.durationMinutes),
    lane,
    lanes,
  };
}

/**
 * The hour labels down the axis, as clock times.
 *
 * The window starts at `boundary_hour`, so the first label is that hour; the
 * hours past midnight are labelled `00:00`–`03:00` rather than `25:30`, because
 * *"a reader thinks in clock times"*.
 */
export function hourLabels(
  boundaryHour: number,
): readonly { readonly topPx: number; readonly label: string }[] {
  return Array.from({ length: 24 }, (_unused, index) => {
    const hour = (boundaryHour + index) % 24;
    return {
      topPx: index * HOUR_HEIGHT_PX,
      label: `${String(hour).padStart(2, '0')}:00`,
    };
  });
}

/** Where the midnight divider sits — the one line the axis draws twice a Day. */
export function midnightTopPx(boundaryHour: number): number {
  return ((24 - boundaryHour) % 24) * HOUR_HEIGHT_PX;
}
