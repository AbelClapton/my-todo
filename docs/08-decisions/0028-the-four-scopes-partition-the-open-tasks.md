# ADR 0028 — The Four Scopes Partition the Open Tasks

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

`05-modules/tasks.md` §Scopes gives each of the four scopes one sentence. Three of them define a
**set**: Today (scheduled for today, or deferred to today or earlier), Someday (marked
`someday`), and All (everything open). **Next defined a different kind of thing** — *"tasks with
`priority: now` or `priority: next` that are not scheduled for today"* — so the four sets were
neither total nor disjoint, and nothing said they were meant to be.

Measured over twelve realistic tasks in `design/tasks-lab.html` ("The four scopes"), by the
doc's own predicates:

- **5 of 12 belonged to no scope at all**: a task whose only date is a deadline (`due`), a task
  with `priority: later`, and a task with no date and no priority. **All was the only place they
  existed.**
- **1 of 12 belonged to two**: a task deferred into the past *while* carrying `priority: next`.
- `priority: later` — the third of the field's three values — was claimed by **no** scope.

**And the missing rule is already written down three times.** `06-flows/resurfacing.md`,
`06-flows/disruption.md` and ADR 0006 all state that an overdue task appears *in the Today scope
with a chip*, while Today's own definition contains no `due` at all. `tasks.md`'s own worked
example, "A typical Today view", carried **2 of its 4 rows** that its definition excludes — the
doc's test case failing the doc's rule, which this set has now recorded five times.

**The hole is not a corner.** `04-ai/tier-1-parsing.md` turns *"call dentist Tuesday"* into a task
with `due` and nothing else, so **the app's most common capture was in no scope but All.** And
nothing in the set *produces* `next` or `later` at all: Tier 1 writes `now` for *"Urgent: …"* and
the *state* `someday` for *"Someday: …"*, and the only other control that could set a priority is
a field on a detail screen this lab has just drawn for the first time.

## Decision

**The four scopes partition the open tasks, and Next is defined as the complement.**

- **Today** — scheduled for today, **due today or earlier**, or deferred to today or earlier.
  Three sources, and the row carries the reason it is there.
- **Someday** — `state: 'someday'`.
- **Next** — everything open that Today and Someday do not hold.
- **All** — everything open, sorted by due date ascending, then priority.

**`priority` stops being a scope key.** It keeps two jobs — the row's indicator (`now` gets the
dot) and All's second sort — and loses the one it had, which was to decide whether a task existed
in a list at all. A rank is not a set.

Docs updated in the same change: `05-modules/tasks.md` (§Scopes, §The completion log),
`06-flows/completion.md`, `03-experience/surfaces.md` (the Completion log is a **State**),
`03-experience/components.md` (the window selector gains a second owner), and
`08-decisions/README.md`.

## Consequences

**Positive.**

- **Every open task is in exactly one scope.** Nothing can be invisible, which is the property the
  four sentences were assumed to have and did not.
- The parser's most common output has a home: a task with a deadline and nothing else is in Next.
- The sets are now testable. A projection can assert the partition over its own data, which no
  rule could do while one member was defined by a rank.
- Two of the three defects the lab measured close together — the orphaned `later` and the
  five orphans — because both were the same missing property.
- Today agrees with the three docs that already described it, and with the doc's own example.

**Negative.**

- **Next becomes the largest list in the app.** It now holds every undated capture as well as
  everything not scheduled today, so a user with a fast capture habit meets a growing Next — the
  backlog the app otherwise works to avoid showing. The counter-argument is that All already held
  those tasks, and a default view that lies about its own contents is worse than a long one.
- `priority: now` and `priority: next` no longer change **where** a task is, only how it looks and
  how All sorts. A user who used priority to file work has lost the mechanism.
- Today grows as well: `due today or earlier` admits every overdue task, so the screen owes a
  reason per row — which is why the row now carries one.
- **Next needs a sort and this ADR does not state one.** A `priority: later` task and a
  `priority: now` one are identical there but for the dot, and All's "due ascending, then
  priority" is not obviously right for a backlog.

**Neutral.**

- No log type, no `SurfaceId`, no field, and no change to `priority`'s three values. Nothing to
  migrate: the projection's membership rule changes, not the data.

## Alternatives considered

**Add `later` to Next, keeping `priority` as the key.** Rejected: it closes one hole and leaves
two — a task with no priority and no dates is still in no scope, and a `due`-only task still has
none. A filter that was never total cannot be made total by widening it.

**Retire `priority: later`.** Rejected: the field would become binary (`now | next`), which
changes an entity field's value set and needs a migration for entries written under the old shape
— and it does not fix the hole, because a task with **no** priority still has no scope.

**Give `later` a scope of its own — a fifth.** Rejected: it turns a *rank* into a *place*, and the
control that switches scopes would carry a fifth label whose membership overlaps the other four,
which is the defect this ADR exists to remove.

**Key Next on dates** — scheduled later than today, or deferred later than today. Rejected: it is
the same defect one level down. A task with no dates is then in no scope again, which is precisely
what the twelve-task fixture measured.

**Delete Next; use All with filters.** Rejected: three flows route to scopes by name, `surfaces.md`
files four states of one screen, and "not today" is what Next already means to a user.

## Open question recorded by this ADR

**What happens to a task marked `someday` that has a due date?** Someday's definition — *"no due
dates, no scheduling"* — constrains the scope's **contents** and says nothing about what happens
to the dates a task already has when the state is set. The candidates (clear them, keep them and
hide them, refuse the mark while a date exists) write different entries, and one of them loses
data. Recorded rather than decided because it is a rule about `task.marked_someday`, and it wants
its own ADR.
