# Capture

## Purpose

This flow defines how anything enters the app: a thought, a task, a
note, a link, a voice memo. It exists because capture is the first
thing a user does and the moment where the app either feels
effortless or feels like data entry.

The rule is: **capture without deciding.** At capture time, the user
does not pick a type, an Area, a date, or a project. Those decisions
happen later, either by AI or by the sort ritual.

## Invariants

- Capture is available from anywhere via the pull-down gesture
  (`03-experience/gesture-vocabulary.md`).
- Capture never requires the user to pick a type. Tier 1 parses; the
  user confirms or corrects.
- Capture is under two seconds from gesture to input field.
- Capture works fully offline.
- Nothing captured is lost. If parsing fails, the raw text becomes an
  inbox note.
- Capture does not consume attention budget
  (`03-experience/attention-budget.md`).
- **Capture handles text and links only.** Photos and files are out
  of scope for v1. Notes are text (`05-modules/notes.md`).

## Specification

### The four entry points

1. **Pull-down.** On any scrollable list, pull down to reveal the
   capture field at the top.
2. **Command palette.** `Cmd+K` → type → the first result is
   "Capture: <text>."
3. **Share sheet.** From any other app, share text or a link to this
   app. Photos and files are not accepted.
4. **Voice.** Push-to-talk microphone inside the capture field, or
   from the command palette.

All four feed the same pipeline.

### The capture field

A single-line input at the top of the screen, expanding to multi-line
as the user types. No type picker, no date picker, no Area picker.
One field.

Below the field, Tier 1 shows a live preview of what it will parse:

    [ Buy standing desk under $500            ]  [🎤]
    → task · area: Inbox · parsed

The preview updates as the user types. It is informational, not a
confirmation. The user does not have to act on it.

### The pipeline

1. User types or speaks.
2. Tier 1 (`04-ai/tier-1-parsing.md`) parses.
3. Three outcomes based on confidence:
   - **≥ 0.85.** Apply silently. Show a "parsed" chip.
   - **0.60 – 0.84.** Show a confirmation chip: "Did you mean X?"
   - **< 0.60.** Raw text becomes an inbox note with an
     "[unparsed]" title prefix.
4. The user can tap the chip to edit the parse, or ignore it.
5. The item is created (or noted in the inbox).

### The capture outcomes

- **Task.** Created with `task.created`. Appears in Tasks → Today if
  scheduled, or Next / Someday / Inbox otherwise.
- **Event.** Created with `calendar.created`. Appears in the
  Calendar. If the calendar integration is enabled, it syncs to the
  source.
- **Habit.** Created with `habit.created`. Appears in Habits → Today.
- **Note.** Created with `note.created`, attached to today's Day by
  default.
- **Unparsed.** Created as a note attached to today's Day, with
  the title prefixed "[unparsed]." Surfaces in the inbox sort
  ritual.

### The inbox

Items that could not be parsed, or that the user marked as "don't
decide now," land in the inbox. The inbox is:

- A list of unparsed notes and unclassified tasks.
- Accessible from the Tasks mode (a filter) or via the command
  palette.
- Surfaced by the sort ritual when it contains > 10 items
  (`03-experience/attention-budget.md`).

### The sort ritual

When the inbox has > 10 items, a nudge fires (subject to the
attention budget). Tapping opens the sort ritual: a 60-second sweep
of the inbox, one item at a time.

Four gestures, no menus:

- **Swipe right.** "Today." Creates or schedules the item for today.
- **Swipe left.** "Someday." Marks the item as someday.
- **Swipe up.** "Attach." Opens the attachment picker (Person, Area,
  Goal, or an existing task).
- **Swipe down.** "Delete." Tombstones the item (undoable).

The ritual ends when the inbox is empty or the user exits. Progress
is not saved mid-ritual (each gesture commits immediately).

### The share sheet

The app registers as a share target for **text and URLs only**.

When the user shares from another app:

1. The app receives the shared payload (text or URL).
2. If the payload is text with a URL, Tier 1 parses it as a note
   with the URL.
3. If the payload is a URL alone, it becomes a note with the link.
4. If the payload is an image or file, the app shows a notice:
   "Photos and files aren't supported yet. Send text or a link."
   The share is rejected. Nothing is captured.
5. For accepted payloads, the user sees a quick confirm screen:
   "Captured to Inbox."
6. The user can optionally add a line of text before saving.

Image and file sharing is out of scope for v1. Notes are text
(`05-modules/notes.md`).

### Voice capture

Push-to-talk (`07-infrastructure/stack.md`):

1. Hold the mic button.
2. Live partial transcription appears in the field.
3. Release.
4. The final transcript is submitted as if typed.
5. If STT confidence is low, the raw transcript becomes an inbox
   note with an "[unparsed]" title prefix (Tier 1 does not
   attempt to parse a low-confidence transcript).

Voice never opens a chat. It feeds the same pipeline.

### Email forwarding

The user can forward email to a personal forwarding address
(`07-infrastructure/integrations.md`). The subject and body arrive as
a capture:

1. Tier 1 parses the subject line.
2. The body becomes a note.
3. If parsed as a task, the note is attached to the task.
4. Otherwise, the note attaches to today's Day.

### What capture does not do

- Does not require the user to pick anything.
- Does not open a chat or a modal.
- Does not use a full-screen editor.
- Does not ask for confirmation unless Tier 1 is mid-confidence.
- Does not block on network. Everything is local-first.
- Does not accept photos or file attachments.

## Examples

**A quick task capture.**

    User pulls down on the Tasks mode.
    Field appears: [                            ] [🎤]
    User types: "Call dentist Tuesday 3pm"
    Live preview: → task · due Tue Sep 29, 3pm
    User hits Enter.
    Task created. "Parsed" chip appears on the new row.
    Field clears, stays focused.
    User pulls down to dismiss.

**A low-confidence capture.**

    User types: "The thing with the stuff"
    Live preview: → note · unparsed
    User hits Enter.
    Inbox note created: "The thing with the stuff."
    No chip (unparsed is not parsed).

**Voice capture.**

    User holds the mic button.
    Speaks: "Remind me to pick up the dry cleaning Friday."
    Live partial text appears as they speak.
    Releases.
    Final transcript parses: → task · due Fri Oct 2.
    Task created.

**Share sheet from Safari (a URL).**

    User is reading an article, taps Share → this app.
    App receives: title "The Case for Standing Desks", URL.
    Quick confirm screen: "Captured to Inbox."
    User adds: "For the home office."
    Saves.
    Note created, attached to today's Day.

**Share sheet of a photo (rejected).**

    User shares a photo from Photos.
    App shows: "Photos and files aren't supported yet. Send text
    or a link."
    Share rejected. Nothing captured.

**Sort ritual.**

    Nudge: "12 items in your inbox. Sort now?"
    User taps.
    Inbox opens in sort mode.
    Item 1: "The thing with the stuff"
    User swipes down → deleted.
    Item 2: "Buy standing desk"
    User swipes right → scheduled today.
    Item 3: "Idea: try morning walks"
    User swipes up → attach to Health area as a habit draft.
    ... continues until inbox is empty or user exits.

**Email forward.**

    User forwards a contractor email to their address.
    App receives: Subject "Re: tile delivery", Body with the
    details.
    Tier 1 parses subject as a task: "Re: tile delivery."
    Body becomes a note attached to the task.
    Task appears in Inbox.

## What this doc must NOT do

- This doc does not define the capture UI's tokens. It references
  them.
- This doc does not define Tier 1 parsing rules. Those are in
  `04-ai/tier-1-parsing.md`.
- This doc does not define the share sheet integration. That is
  `07-infrastructure/integrations.md`.
- This doc does not define voice STT. That is
  `07-infrastructure/stack.md`.
- This doc does not define the email forwarding pipeline. That is
  `07-infrastructure/integrations.md`.
- This doc does not define the inbox sort ritual's copy. It defines
  the gestures and outcomes.
- This doc does not accept photo or file attachments.