import { useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { ulid } from 'ulid';

import { addDays, localDayOf } from '@/domain/day';
import type { DateString } from '@/domain/ids';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';
import { clockLabel, formatDay } from '@/ui/format';

/**
 * The New event screen (`05-modules/calendar.md` §Surfaces — New event).
 *
 * **A screen, not a sheet**, for the doc's reason: two of its fields would open an
 * overlay of their own, and `03-experience/app-shell.md` allows at most one sheet
 * at a time, so a sheet-hosted form would have each field replace the form it
 * belongs to.
 *
 * **"When" is not a picker.** *"Three canned answers cover the common case in one
 * tap and only "Other…" opens the date picker"* — and every row shows the moment
 * it resolves to, the same rule the defer sheet follows, so the promise is on
 * screen rather than in the reader's head. The doc does not name its three
 * answers, so they are the three a person makes from a calendar: **now**, **in an
 * hour**, **tomorrow at this time**. `Other…` is a native date and time input
 * until the Calendar overlay exists, exactly as the defer sheet's is.
 *
 * **Two fields are absent, not stubbed.** `with` opens the person picker (People is
 * Phase 4) and `note` *"is attached after the event exists"* — there is no Event
 * detail screen yet, which is where `05-modules/notes.md` attaches one.
 */

type WhenKey = 'now' | 'in-an-hour' | 'tomorrow' | 'other';

type Moment = { readonly day: DateString; readonly time: string };

/** The next quarter hour, because a start at 15:07 is nobody's intent. */
function nextQuarter(now: Date): Moment {
  const rounded = new Date(now.getTime());
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil((rounded.getMinutes() + 0.001) / 15) * 15);

  const offset = -now.getTimezoneOffset();
  const local = new Date(rounded.getTime() + offset * 60_000);
  return {
    day: local.toISOString().slice(0, 10) as DateString,
    time: clockLabel(local.getUTCHours(), local.getUTCMinutes()),
  };
}

function momentsFrom(
  now: Date,
): readonly { readonly key: WhenKey; readonly label: string; readonly at: Moment }[] {
  const first = nextQuarter(now);
  const hourLater = nextQuarter(new Date(now.getTime() + 60 * 60_000));
  const tomorrow = { day: addDays(first.day, 1), time: first.time };
  return [
    { key: 'now', label: 'Now', at: first },
    { key: 'in-an-hour', label: 'In an hour', at: hourLater },
    { key: 'tomorrow', label: 'Tomorrow', at: tomorrow },
  ];
}

export function NewEventScreen() {
  const { append, status } = useLog();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<WhenKey>('now');
  const [other, setOther] = useState<{ readonly day: string; readonly time: string }>({
    day: '',
    time: '09:00',
  });
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const moments = momentsFrom(now);
  const chosen =
    when === 'other'
      ? { day: other.day as DateString, time: other.time }
      : moments.find((moment) => moment.key === when)?.at;

  const canSave =
    status === 'ready' &&
    !saving &&
    title.trim() !== '' &&
    chosen !== undefined &&
    chosen.day !== '' &&
    /^\d{2}:\d{2}$/.test(chosen.time);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave || chosen === undefined) {
      return;
    }
    setSaving(true);
    // The instant is built from the *local* date and time the user chose, which
    // is the only reading of "tomorrow at 3" that means what they meant.
    const start = new Date(`${chosen.day}T${chosen.time}:00`);
    await append({
      type: 'calendar.created',
      actor: { type: 'user' },
      payload: {
        event_id: ulid(),
        title: title.trim(),
        start: start.toISOString(),
        all_day: false,
        day: localDayOf(start.toISOString(), -start.getTimezoneOffset()),
      },
    });
    await navigate({ to: '/' });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-7 px-space-5 py-space-8">
      <h1 className="text-type-title-1 text-text-primary">New event</h1>

      <form onSubmit={submit} className="flex flex-col gap-space-7">
        <label className="flex flex-col gap-space-2">
          <span className="text-type-subhead text-text-secondary">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            className={`h-control-lg rounded-md border border-border-default bg-bg-sunken px-space-5 text-type-body text-text-primary ${FOCUS_RING}`}
          />
        </label>

        <fieldset className="flex flex-col gap-space-1">
          <legend className="pb-space-2 text-type-subhead text-text-secondary">When</legend>
          {moments.map((moment) => (
            <button
              key={moment.key}
              type="button"
              onClick={() => setWhen(moment.key)}
              aria-pressed={when === moment.key}
              className={`flex min-h-control-md items-center justify-between gap-space-4 rounded-md px-space-2 text-left ${FOCUS_RING}`}
            >
              <span className="text-type-body text-text-primary">{moment.label}</span>
              <span className="text-type-footnote tabular-nums text-text-secondary">
                {formatDay(moment.at.day)} · {moment.at.time}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWhen('other')}
            aria-pressed={when === 'other'}
            className={`flex min-h-control-md items-center rounded-md px-space-2 text-left text-type-body text-text-primary ${FOCUS_RING}`}
          >
            Other…
          </button>
          {when === 'other' ? (
            <div className="flex gap-space-3 px-space-2 py-space-2">
              <input
                type="date"
                aria-label="Date"
                value={other.day}
                onChange={(event) =>
                  setOther((current) => ({ ...current, day: event.target.value }))
                }
                className={`h-control-lg flex-1 rounded-md border border-border-default bg-bg-sunken px-space-4 text-type-body text-text-primary ${FOCUS_RING}`}
              />
              <input
                type="time"
                aria-label="Time"
                value={other.time}
                onChange={(event) =>
                  setOther((current) => ({ ...current, time: event.target.value }))
                }
                className={`h-control-lg rounded-md border border-border-default bg-bg-sunken px-space-4 text-type-body text-text-primary ${FOCUS_RING}`}
              />
            </div>
          ) : null}
        </fieldset>

        <button
          type="submit"
          disabled={!canSave}
          className={`h-control-lg rounded-md border border-transparent bg-accent-default text-type-subhead text-on-fill disabled:bg-surface-3 disabled:text-text-disabled ${FOCUS_RING}`}
        >
          Add event
        </button>
      </form>
    </main>
  );
}
