# Surfaces

## Purpose

This doc enumerates every surface the app renders: the four modes, the
screens inside them, and the transient surfaces that appear over them. It
exists because surfaces are specified where they belong — a module owns
its screens, a flow owns its ritual — and nothing listed them in one
place. A designer needs the list, and so does anyone checking whether a
change quietly added a fifteenth card.

**This doc is an index. It owns no behavior.**

## Invariants

- Every surface the app can render is listed here. Adding one means
  adding it here *and* to the doc that owns it.
- **The owning doc wins.** If this doc and a module or flow doc disagree,
  the module doc is right and this one is stale.
- This doc adds no surfaces, no copy, no layout, and no behavior.
- Every row names the doc that specifies it, so a designer can find the
  rules without reading the whole set.

## Specification

### Surface kinds

    Mode      top-level, in the mode navigation
    Screen    a full view inside a mode
    Overlay   a sheet, popover, or full-screen boundary over a screen
    Card      content in a stream that is not itself a screen
    Ambient   always visible, not navigable

### The four modes

Calendar, Tasks, Habits, Notes (`05-modules/`). Settings is a surface,
not a mode, and has no entry in the navigation
(`05-modules/settings.md`). Everything else in this doc lives inside one
of these, or floats over them.

### Calendar — `05-modules/calendar.md`

| Surface | Kind | Entry |
|---|---|---|
| Day view (default) | Mode | Mode navigation |
| Week view | Screen | Pinch from Day |
| Month view | Screen | Pinch from Week |
| Year view | Screen | Pinch from Month |
| Event detail | Screen | Tap an event |
| New event sheet | Overlay | `+` in the header, or capture |
| Date picker | Overlay | Tap the date in the day header |
| Time machine | Screen (read-only) | Tap a date → "As of" |
| Freshness annotation | Ambient | Any mirrored event |

The Day view is a fixed vertical **order** of eight parts, specified as a
numbered list in the module doc: day header, now line, timeline, habits
due, metric log row, day-note preview cards, top three, completed. The order
is fixed and the height is not — the view scrolls, with the header and the now
line held in place (`05-modules/calendar.md`, "The fold").

The Week view is not an order of parts but a single instrument: seven days as
columns over one shared time gutter, with event titles omitted because a
proportional column cannot hold one (`05-modules/calendar.md`, "The Week view
layout").

### Tasks — `05-modules/tasks.md`

| Surface | Kind | Entry |
|---|---|---|
| Task list | Mode | Mode navigation |
| Scopes: Today / Next / Someday / All | Screen (same screen, four states) | Segmented control in the header |
| Someday pile | Screen | The Someday scope |
| Task detail | Screen | Tap a row |
| Defer sheet | Overlay | Swipe left on a row |
| Filter sheet | Overlay | Filter button, `Cmd+F` |
| Completion log | Screen | All → filter "Completed" |
| Inline capture field | Overlay | Pull down |
| Completion note field | Ambient (inline) | After a completion |

### Habits — `05-modules/habits.md`

| Surface | Kind | Entry |
|---|---|---|
| Today view | Mode | Mode navigation |
| All | Screen | Scope |
| History | Screen | Scope, with a window selector |
| Habit detail | Screen | Tap a row |
| Compliance chart | Card | Inside habit detail |
| Long-press mini-menu | Overlay | Long-press a checkbox |
| Habit creation form | Overlay | `+` in the Habits mode |

### Notes — `05-modules/notes.md`

| Surface | Kind | Entry |
|---|---|---|
| List | Mode | Mode navigation |
| Scopes: Recent / All / Daily | Screen (four states) | Segmented control |
| Editor | Screen | Tap a row or a preview |
| Note preview (read-only) | Card | Inside an attachment's detail |
| Search | Screen | Palette, or the search field in the mode |
| "Move to…" target picker | Overlay | Editor overflow menu |

### Cross-cutting: the layers

| Surface | Kind | Defined in |
|---|---|---|
| Protocol list (Active / Proposed / Past) | Screen | `05-modules/protocols.md` |
| Protocol detail | Screen | `05-modules/protocols.md` |
| Protocol proposal sheet | Overlay | `05-modules/protocols.md` |
| Protocol report (read-only note) | Screen | `05-modules/protocols.md`, `04-ai/research-and-protocols.md` |
| People list (All / Recent / Quiet) | Screen | `05-modules/people.md` |
| Person detail | Screen | `05-modules/people.md` |
| Person picker | Overlay | `05-modules/people.md` |
| Area list | Screen (in Settings) | `05-modules/areas-and-goals.md` |
| Area filter | Control | `05-modules/areas-and-goals.md` |
| Goal list | Screen | `05-modules/areas-and-goals.md` |
| Goal detail | Screen | `05-modules/areas-and-goals.md` |
| Goal creation | Overlay | `05-modules/areas-and-goals.md` |
| Review note (weekly / monthly / annual) | Screen | `05-modules/review.md` |
| Review card, in the Day view | Card | `05-modules/review.md` |
| Protocol review | Screen | `05-modules/review.md` |

### Cross-cutting: capture and retrieval

| Surface | Kind | Defined in |
|---|---|---|
| Capture field | Overlay | `06-flows/capture.md` |
| Share-sheet confirm | Screen | `06-flows/capture.md` |
| Inbox list | Screen | `06-flows/capture.md` |
| Sort ritual | Screen | `06-flows/capture.md` |
| Command palette | Overlay | `06-flows/retrieval.md` |
| Search results | Screen | `03-experience/gesture-vocabulary.md`, `04-ai/retrieval-layer.md` |
| Natural-language filter | Overlay | `06-flows/retrieval.md` |
| Time machine | Screen | `06-flows/retrieval.md` |

### Cross-cutting: the day's rituals

| Surface | Kind | Defined in |
|---|---|---|
| Onboarding, screens 1–7 | Screen (sequence) | `06-flows/onboarding.md` |
| Morning plan | Screen | `06-flows/morning-plan.md` |
| Draft schedule + pool | Screen | `06-flows/morning-plan.md` |
| Shutdown (three prompts, one preview) | Screen | `06-flows/shutdown.md` |
| Lapse-recovery card | Card | `06-flows/lapsed-recovery.md` |
| Start-fresh summary | Screen | `06-flows/lapsed-recovery.md` |
| Catch-up list | Screen | `06-flows/lapsed-recovery.md` |

### Cross-cutting: what appears without being asked for

| Surface | Kind | Defined in |
|---|---|---|
| Now line | Ambient | `06-flows/doing-the-day.md` |
| Timeline | Ambient | `05-modules/calendar.md` |
| Prep card | Card | `05-modules/people.md`, `06-flows/doing-the-day.md` |
| Contextual nudge | Card | `06-flows/doing-the-day.md` |
| Gap nudge | Card (`contextual`) | `06-flows/doing-the-day.md` |
| Calendar-shift offer | Card (`contextual`) | `06-flows/disruption.md` |
| Daily obligations card | Card | `03-experience/attention-budget.md` |
| Metric input row | Control | `05-modules/protocols.md` |
| Forgotten / low-energy / people / `streak_repair` | Card | `06-flows/resurfacing.md` |
| "All three done" card | Card (exempt) | `06-flows/completion.md` |
| What-slipped digest | Card | `06-flows/disruption.md` |
| Onboarding local-only banner | Card (exempt) | `06-flows/onboarding.md` |
| Undo toast | Overlay | `01-foundation/principles.md` |
| Tier 2 contextual menu | Overlay | `04-ai/tier-2-contextual.md` |
| Tier 3 assistant sheet | Overlay | `04-ai/tier-3-assistant.md` |

### Cross-cutting: system states

| Surface | Kind | Defined in |
|---|---|---|
| Settings (twelve groups) | Surface | `05-modules/settings.md` |
| Offline banner | Card | `10-engineering/error-handling.md` |
| Sync indicator | Ambient | `07-infrastructure/sync-engine.md` |
| Stale-calendar banner | Card | `05-modules/calendar.md` |
| Quota-exceeded message | Overlay | `07-infrastructure/cost-model.md` |
| Error boundary (app, mode, surface) | Overlay | `10-engineering/error-handling.md` |

### States every surface must be designed in

These are the states a screen is checked for. Not every surface has every
state — a local projection has no loading state — but the question must
be answered per surface, not skipped.

| State | Meaning | Specified in |
|---|---|---|
| Content | The normal case | The owning module |
| Empty | Nothing to show yet | `03-experience/states.md` |
| Waiting | Work in flight | `03-experience/states.md` |
| Stale | Data older than its threshold | `02-architecture/data-lifecycle.md` |
| Partial | Some data arrived, some did not | `02-architecture/local-first.md` |
| Error | A defined failure with defined copy | `10-engineering/error-handling.md` |
| Disabled | A gesture or action unavailable here | `03-experience/gesture-vocabulary.md` |
| Offline | Local-first normal state | `10-engineering/error-handling.md` |
| First-run | Before the user has any data | `06-flows/onboarding.md` |

## Examples

**Cold start to first completed task** — the M0 path, and the surfaces it
touches in order. This is the cheapest end-to-end check that the
inventory is complete, because it is the first milestone
(`09-roadmap/milestones.md`).

    Onboarding screens 1–7            full-screen sequence
      ↳ Screen 4 uses the capture field's Tier 1 fallback
    Land                              Calendar Day view
    Mode navigation → Tasks
    Task list (Today scope)           empty, on a new account
    Pull down → capture field → Tier 1 parses → parsed chip
    Task list (Today scope)           one row, row-rich
    Swipe right                        completion animation
    Undo toast                         five seconds
    Completion note field              inline, optional

Every surface above is listed in this doc. If a design for that path needs
a surface that is not, the doc is missing something.

## The gaps this doc exposed

Fifteen gaps were found across this doc and
`03-experience/components.md` on 2026-09-22. **All of them are now
settled** — each in the doc that owns the surface, not here, because this
doc still adds no surfaces and no layout. The items below are the finding
record; the table at the end says where each was answered.

### The findings, as recorded

1. **The mode navigation.** Four modes are named everywhere and a "mode
   switcher" is referenced (`04-ai/tier-3-assistant.md`,
   `06-flows/retrieval.md`), but no doc specifies its form, its
   placement, or what it looks like on mobile versus desktop.
2. **Empty states.** Referenced in three places — a spacing token, a type
   size, and one line in `06-flows/onboarding.md` ("empty states have a
   single primary action") — and governed by no doc.
3. **Loading and progress.** Only two concrete cases exist: the sync
   counter and AI work in flight. In a local-first app, most loading is
   instant, so this may be a short rule rather than a surface — but it is
   currently absent rather than short.
4. **Search results.** The gesture matrix gives the surface a row, and
   `04-ai/retrieval-layer.md` defines how results are ranked, but no doc
   specifies the surface itself.
5. **The command palette.** Commands and their behaviour are specified;
   the palette's own layout is not.
6. **Onboarding chrome.** The seven screens' content is specified. The
   shell around them — progress indication, where "Skip" sits, whether
   they are pages or a stack — is not.
7. **How the Day view presents "top three" is unspecified.**
   `05-modules/calendar.md` lists it as the seventh part of the Day view
   and says nothing about its form. The related confusion is gone:
   `03-experience/design-tokens.md` described `row-hero` as "today's top
   task," no surface specified such a row, and the token's one real user
   is the protocol card — so the token note now says that. The top three
   still needs a form.
8. **Cache updates have no surface.** `07-infrastructure/stack.md` has a
   service worker serving the app shell from cache, and nothing says
   whether the user is ever told a new version is ready. Possibly the
   answer is "never" — this is a web app that updates itself — but the
   answer is currently absent.

### Where each was settled

| Gap | Settled in |
|---|---|
| The mode navigation | `03-experience/app-shell.md` — a rail on desktop and tablet, a dock on mobile |
| Empty states | `03-experience/states.md` |
| Loading and progress | `03-experience/states.md` — waiting never animates, and the reason is argued there |
| Search results | `06-flows/retrieval.md` |
| The command palette's layout | `03-experience/app-shell.md`, with the contents in `06-flows/retrieval.md` |
| Onboarding chrome | `06-flows/onboarding.md`, with the frame in `03-experience/app-shell.md` |
| The top three's presentation | `05-modules/calendar.md` |
| Cache-update notices | `03-experience/app-shell.md` — decided as *no surface*: the app updates silently on next cold launch (ADR 0020) |
| Container vocabulary | `03-experience/components.md` |
| Focus and hover treatment | `03-experience/design-tokens.md`, Interaction states |
| Confirmation presentation | `03-experience/components.md` |
| Tooltips | `03-experience/components.md` |
| Which shadcn primitives are stock | `03-experience/components.md` |
| `row-hero`'s usage note | `03-experience/design-tokens.md` — it names the protocol card, its only real user |
| The address placeholder | `07-infrastructure/integrations.md` — now `in.<domain>` |

Two of those rows are **decisions** rather than specifications, and both
are argued where they live and recorded as ADRs: **ADR 0019** (waiting
never animates) and **ADR 0020** (an update is never announced). Neither
is obvious, so neither should be changed quietly or re-decided in a doc.
The other thirteen are specifications and can be edited in place.

## What this doc must NOT do

- This doc does not define behavior, layout, copy, tokens, or components.
  Each surface names the doc that does.
- This doc does not add a surface. A surface that is not in a module or
  flow doc does not exist, and listing it here would not create it.
- This doc does not carry the answers to the gaps it found. Each answer
  lives in the doc that owns the surface, and the table above says where.
- This doc does not define the state machine of a surface. It names the
  states that must be considered, not the transitions between them.
