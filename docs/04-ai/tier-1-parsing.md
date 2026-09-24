# Tier 1 — Parsing

## Purpose

This doc defines Tier 1: the ambient parsing layer that converts
natural language input (typed or spoken) into structured data. It
exists because Tier 1 is where the majority of perceived AI value
lives — it is what makes capture feel effortless — and it is also
where the constitution's Rule 7 (say "I don't know") is most
load-bearing.

Tier 1 runs on-device. It is fast, free, and private.

## Invariants

- Tier 1 runs on-device. It does not send input to a cloud model.
- Tier 1 produces structured data, never UI (Rule 2).
- Tier 1 may apply its output silently if confidence is high, with
  a "parsed" chip the user can tap to correct. This is the *only*
  context in which the AI mutates state without a discrete tap.
- If confidence is below threshold, Tier 1 asks a clarifying
  question or falls back to raw text.
- Every Tier 1 application is logged (`ai.proposed` then
  `ai.applied`, or `ai.proposed` then `ai.rejected`).
- Tier 1 never guesses. Rule 7 applies.

## Specification

### Inputs

- Text from the capture field.
- Text from the voice STT stream (push-to-talk).
- Text from email forwarding (the subject + body).
- Text from the share sheet (link title + URL, or selected text).

### Outputs

Tier 1 produces one or more structured items:

    {
      items: Array<{
        type: 'task' | 'event' | 'note' | 'habit',
        payload: object,        // matches the atom's create schema
        confidence: number,     // 0.0 – 1.0
        explanation: string     // one line, in the user's language
      }>,
      unclear?: string          // if input couldn't be parsed
    }

### Confidence thresholds

This doc owns the thresholds. The ranges below are **half-open and
adjacent**, so every confidence in `0.0 – 1.0` falls in exactly one
band and there is no value that belongs to none or to two.

- **`c ≥ 0.85`.** Apply silently. Show a "parsed" chip.
- **`0.60 ≤ c < 0.85`.** Show a confirmation chip: "Did you mean X?"
- **`c < 0.60`.** Do not apply. Keep the raw text as a note in the
  inbox with the "[unparsed]" title prefix.

The thresholds are tunable via ADR. The contract is: high
confidence is silent, medium asks, low falls back to raw.

### What Tier 1 can parse

**Tasks.** "Call dentist Tuesday" → task with due next Tuesday.
"Buy milk and eggs" → task. "Email Sarah about the contract" →
task with Person link (if Sarah is in People).

**Events.** "Dentist Tuesday 3pm" → event. "Standup every weekday
at 9" → recurring event (if the calendar integration supports
recurrence; otherwise a note asking the user to add it in their
calendar).

**Habits.** "Meditate every morning" → habit with daily cadence.
"Run 3 times a week" → habit with interval cadence.

**Notes.** "Note: the contractor said the tile arrives Friday" →
note attached to today's Day. "Idea: try a standing desk" → note
attached to today's Day, tagged "idea."

**Dates and times.** Natural language dates: "tomorrow," "next
Tuesday," "in 3 days," "end of month." Times: "3pm," "15:00,"
"morning," "after lunch." Recurrence: "every day," "weekly," "3
times a week," "every other Monday."

**People.** Names matched against the People list. Only if the
match is unambiguous. "Email Sarah" matches if there is exactly
one Sarah. If there are two, Tier 1 asks.

**Priorities.** "Urgent: file taxes" → priority "now." "Someday:
learn Japanese" → marked someday.

### What Tier 1 cannot parse

- **Ambiguous dates.** "Let's meet sometime next week" → falls
  back to raw text in the inbox.
- **Multi-step tasks.** "Plan the party: book venue, send invites,
  order cake" → falls back to raw text, or produces one task with
  the full text. It does not auto-create subtasks.
- **Conditional tasks.** "If the weather is nice, go for a run"
  → raw text.
- **Anything requiring external knowledge.** "Buy the thing I
  mentioned to Mark" → raw text; Tier 1 does not search history.
- **Health-adjacent claims.** Tier 1 does not parse "I should
  sleep more" into a protocol. Protocols are Tier 3 (see
  `04-ai/research-and-protocols.md`).
- **Areas.** There is no Area prefix syntax. `05-modules/areas-and-goals.md`
  previously said the parser "may infer an Area from the text (`work: file
  taxes` → Work)"; that is withdrawn, and this doc is where the withdrawal
  is binding, because this doc owns what Tier 1 recognises and it lists no
  Area prefix. `area_id` defaults to Inbox on every capture
  (`06-flows/capture.md`'s invariant is that the user picks neither a type
  nor an Area nor a date at capture time), and the Area is set later from
  the task detail via `task.reassigned_area`.

### The "parsed" chip

When Tier 1 applies silently:

- A small chip appears next to the item: "parsed."
- Tapping the chip reveals what was parsed: "task · due Tue Sep
  29 · area Inbox."
- The user can edit any field. Editing logs `ai.rejected` for the
  original parse and applies a new entry.
- If the user does nothing, the parse stands.

The chip is not a confirmation. It is a receipt. It exists so the
user can audit, not so they have to approve.

### The confirmation chip

When confidence is in the medium band (`0.60 ≤ c < 0.85`, see
§Confidence thresholds):

- The chip appears: "Did you mean: task · due Tue Sep 29?"
- Two buttons: "Yes" and "Edit."
- "Yes" logs `ai.applied`. "Edit" opens the item's editor.
- **If the user does nothing, the parse is not applied.** The chip
  fades, the raw text is kept as an unparsed note in the inbox, and
  the parse stays available there as a suggestion.

An unanswered confirmation never applies itself. A timer that turns
silence into consent is a silent mutation, which is the one thing
Invariant 2 forbids (`01-foundation/principles.md`). Leaving it
unanswered costs nothing: the input is preserved verbatim in the
inbox, and the parse remains on offer there.

This is the only Tier 1 flow that has a visible confirmation. It
exists because mid-confidence parses are more likely to be wrong,
and a silent wrong parse is worse than a brief interruption.

### Fallback behavior

If input cannot be parsed (confidence < 0.60):

- The raw text becomes a note in the inbox. The note's title is
  prefixed with "[unparsed]" for identification in the inbox
  list. This is a display convention, not an entity attribute.
- No chip appears. The user sees their text preserved.
- The inbox sort ritual (see `06-flows/capture.md`) will surface
  it later for manual classification.

### Voice input

Voice input is push-to-talk STT (see `07-infrastructure/stack.md`).
The transcribed text is fed to Tier 1 exactly like typed text. The
only difference is that the transcription includes a confidence
score; if transcription confidence is low, Tier 1 falls back to
raw text even if parse confidence would have been high.

### On-device model

Tier 1 uses a small on-device model (or a rules-based parser
augmented by a small model) for parsing. The model is:

- Under 100MB.
- Runs in under 200ms on a modern phone.
- Runs in a Web Worker (web) or a background thread (native shell)
  so the UI never blocks.
- Does not send data off-device.

The specific model is an implementation detail. The contract is:
fast, local, private.

### Locale handling

Tier 1 respects the user's locale.

- The on-device model is loaded for the user's locale if available.
- If the locale is not supported, Tier 1 falls back to raw capture
  (unparsed inbox note) with a one-time notice: "Parsing isn't
  available in your language yet. Your captures are saved as
  notes."
- Date and time parsing uses the locale's conventions. "3pm" works
  in en-US; "15:00" works in en-GB; both work if the parser is
  confident.
- The parser does not attempt cross-language parsing.

The locale is a user setting (`locale.override`) and defaults to the
device locale.

## Examples

**High-confidence parse (silent).**

    Input: "Call dentist Tuesday 3pm"

    Output:
      {
        items: [{
          type: 'task',
          payload: {
            title: "Call dentist",
            due: "2026-09-29T15:00:00Z",
            area_id: <inbox>
          },
          confidence: 0.92,
          explanation: "Task due next Tuesday at 3pm"
        }]
      }

    Applied silently. "Parsed" chip appears.

**Mid-confidence parse (confirmation).**

    Input: "Meet Mark next week"

    Output:
      {
        items: [{
          type: 'task',
          payload: {
            title: "Meet Mark",
            due: null,
            defer: null,
            area_id: <inbox>
          },
          confidence: 0.71,
          explanation: "Task 'Meet Mark', no date"
        }]
      }

    "Did you mean: task 'Meet Mark', no date?" appears.
    User taps "Edit" and sets a date.

**Low-confidence parse (fallback).**

    Input: "The thing with the stuff"

    Output:
      { items: [], unclear: "The thing with the stuff" }

    Raw text becomes an inbox note with an "[unparsed]" title
    prefix.

**Multiple items.**

    Input: "Call dentist Tuesday and pick up dry cleaning Friday"

    Output:
      {
        items: [
          { type: 'task', payload: { title: "Call dentist",
            due: "2026-09-29T15:00:00Z" }, confidence: 0.88,
            explanation: "Task due Tue Sep 29" },
          { type: 'task', payload: { title: "Pick up dry cleaning",
            due: "2026-10-02T00:00:00Z" }, confidence: 0.88,
            explanation: "Task due Fri Oct 2" }
        ]
      }

    Both applied. Two "parsed" chips appear.

**Ambiguous person.**

    Input: "Email Sarah"

    People list contains two Sarahs.
    Output:
      { items: [], unclear: "Which Sarah?" }

    The capture field shows a disambiguation chip.
    User picks. Then the parse applies.

## What this doc must NOT do

- This doc does not define the constitution. It references Rules 2
  and 7. The rules live in `04-ai/constitution.md`.
- This doc does not define the capture flow. It defines the
  parsing that happens within it. The flow lives in
  `06-flows/capture.md`.
- This doc does not define Tier 2 or Tier 3. Tiers are separate
  docs.
- This doc does not define the on-device model or its training.
  Those are implementation details.
- This doc does not define voice STT. It defines what happens to
  the transcribed text. Voice lives in
  `07-infrastructure/stack.md`.
- This doc does not define every parsable phrase. It defines the
  pattern. The full grammar is implemented in
  `src/ai/tier-1/`.