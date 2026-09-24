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

- Capture is available from every list surface via the pull-down
  gesture. The surface list is `03-experience/gesture-vocabulary.md`'s
  gesture matrix, which is authoritative: it grants **Pull ↓** to
  **six** surfaces — the Task, Habit, Note, People and Search-results
  lists, and the Inbox. **The Calendar has no capture gesture** — its
  two rows are assigned other gestures — so capture from the Calendar
  runs through the command palette. Availability means *every surface
  the matrix grants the gesture to*, not *every screen*.
- Capture never requires the user to pick a type. Tier 1 parses; the
  user confirms or corrects.
- Capture is under two seconds from gesture to input field, **on the
  entry points that begin with a gesture** — pull-down and the
  in-field microphone. This invariant does not cover the command
  palette (`Cmd+K`, then type, then pick a result) or the share sheet
  (which starts in another app), because neither begins with a
  gesture. **One** of the four entry points is measured by this
  clause.
- Capture works fully offline.
- Nothing captured is lost. If parsing fails, the raw text becomes an
  inbox note.
- Capture does not consume attention budget
  (`03-experience/attention-budget.md`).
- **Capture handles text and links only.** Photos and files are out
  of scope for v1. Notes are text (`05-modules/notes.md`).

## Specification

### The four entry points

1. **Pull-down.** On a list surface, pull down to reveal the capture
   field at the top. The surface is one of the six the gesture matrix
   grants the gesture to — see §Invariants.
2. **Command palette.** `Cmd+K` → type → the first result is
   "Capture: <text>."
3. **Share sheet.** From any other app, share text or a link to this
   app. Photos and files are not accepted.
4. **Voice.** Push-to-talk microphone inside the capture field, or
   from the command palette.

All four feed the same pipeline. Note that the palette is a modal
surface (`02-architecture/app-shell.md`), so palette capture and
gesture capture are different interactions over the same field, not
two doors into one screen.

### The capture field

A single-line input at the top of the screen, expanding to multi-line
as the user types. No type picker, no date picker, no Area picker.
One field.

Below the field, Tier 1 shows a live preview of what it will parse:

    [ Buy standing desk under $500            ]  [🎤]
    → task · area: Inbox · parsed

The preview updates as the user types. At high confidence it is
informational: a live read of Tier 1's parse, not a request for
permission, and the capture is created without the user touching it.
At medium confidence the same position is a two-button confirmation
("Yes" / "Edit"), and leaving it unanswered **is** a decision — the
parse is not applied (§The pipeline step 3). "The user does not have
to act on it" is therefore true of one band and false of the other.
The chip's controls and its exact thresholds are owned by
`04-ai/tier-1-parsing.md`; this doc does not restate them.

### The pipeline

1. User types or speaks.
2. Tier 1 (`04-ai/tier-1-parsing.md`) parses.
3. Three outcomes based on confidence. **The bands themselves — both
   their values and their boundaries — are owned by
   `04-ai/tier-1-parsing.md`; this list names the outcomes, not the
   numbers.**
   - **High.** Apply silently. Show a "parsed" chip.
   - **Medium.** Show a confirmation chip: "Did you mean X?"
     Left unanswered, the parse is not applied: the raw text is kept
     as an unparsed note, with the parse still on offer.
   - **Low.** Raw text becomes an inbox note with an
     "[unparsed]" title prefix.
4. The user can tap the chip to edit the parse, or ignore it.
5. The parsed result is created (or noted in the inbox).

### The capture outcomes

- **Task.** Created with `task.created`. The type is parsed; the
  **Area is not**, and defaults to Inbox (§Area assignment,
  `05-modules/areas-and-goals.md`). The task appears in Tasks → Today if
  it carries a due date, and in Next, Someday, or All otherwise — those
  four are the mode's scopes (`05-modules/tasks.md`). **Inbox is not one
  of them.** It is the Area on the task, and it is where a capture lands
  rather than where it is later found.
- **Event.** Created with `calendar.created`. Appears in the
  Calendar. If the calendar integration is enabled, it syncs to the
  source.
- **Habit.** Created with `habit.created`. Appears in Habits → Today.
- **Note.** Created with `note.created`, attached to today's Day by
  default.
- **Unparsed.** Created as a note attached to today's Day, with
  the title prefixed "[unparsed]." Surfaces in the inbox sort
  ritual.

#### The outcome this list omits

Two of the three bands fall back to the same place — an unparsed note
in the inbox — so the inbox is where most uncertain captures end up.
Leaving it is a supported outcome, and this list should say so:

- **Left in the inbox.** The capture stays as-is. The inbox is a
  valid resting state, not a backlog to clear; the ritual "ends when
  the inbox is empty **or the user exits**" (§The sort ritual), and
  exiting is a normal ending.

Captures leave the inbox in exactly three ways: **classified** (a
sort-ritual gesture, or editing the note), **removed** (swipe down,
§The sort ritual), or **left there**. Only the first is named above.

**Note the ambiguity in "Remove"** (§The sort ritual). It "takes the
capture out of the inbox, reversibly" and does not say what happens
to the underlying note. It cannot be a delete — a capture that was
never parsed is a note, and `05-modules/notes.md` and ADR 0016 give
a note no removal state, which is why the note list's own swipe-down
was disabled. Until this is resolved, read "Remove" as *removing the
inbox marking*, not the note.

### The inbox

Captures that could not be parsed, or that the user marked as "don't
decide now," land in the inbox. The inbox is:

- A list of unparsed notes and unclassified tasks.
- Accessible from the Tasks mode (a filter) or via the command
  palette.
- Surfaced by the sort ritual when it contains more than 10
  captures
  (`03-experience/attention-budget.md`).

### The sort ritual

When the inbox holds more than 10 captures, a nudge fires (subject to
the attention budget). Tapping opens the sort ritual: a 60-second
sweep of the inbox, one capture at a time.

Four gestures, no menus:

- **Swipe right.** "Today." Creates or schedules the capture for
  today.
- **Swipe left.** "Someday." Marks the capture as someday.
- **Swipe up.** "Attach." Opens the attachment picker (Person, Area,
  Goal, or an existing task).
- **Swipe down.** "Remove." Takes the capture out of the inbox,
  reversibly — never a delete. (Deleting is not a gesture; see
  `03-experience/gesture-vocabulary.md`.)

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

**Two of these contradict `05-modules/notes.md`, and both are
resolvable in this doc's favour.**

*"Does not require the user to pick anything"* — that doc's New note
action opens an attachment target picker "because a note without a
parent is not a thing this app has". This flow creates exactly that
kind of note: attached to today's Day, no decision. **The default
parent already exists**, and the Notes mode is the one place not using
it. The reconciliation options are in that doc's §Empty states.

*"Does not use a full-screen editor"* — but a captured note is a note,
and that doc specifies the only way to edit one: a full-screen markdown
editor. So capture creates notes that must be edited in the surface
this list rules out. Either a captured note is editable in place, or
this line is about the *capture* moment only and should say so.

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

    Nudge: "12 captures in your inbox. Sort now?"
    User taps.
    Inbox opens in sort mode.
    Capture 1: "The thing with the stuff"
    User swipes down → removed from the inbox (reversibly).
    Capture 2: "Buy standing desk"
    User swipes right → scheduled today.
    Capture 3: "Idea: try morning walks"
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