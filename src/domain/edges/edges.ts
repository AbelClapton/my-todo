import type { EventType } from '../events';

/**
 * The eleven canonical edges (`02-architecture/object-model.md`).
 *
 * The graph is typed and the AI may not invent an edge type. Any relationship
 * outside this set is a **free-text mention**, not an edge: a note whose body
 * says "talk to Sarah" creates nothing.
 *
 * Adding an edge type requires an ADR.
 */

export const EDGE_TYPES = [
  'task_to_area',
  'task_to_person',
  'task_to_day',
  'task_to_task',
  'event_to_person',
  'event_to_day',
  'habit_to_area',
  'habit_to_protocol',
  'protocol_to_goal',
  'goal_to_area',
  'note_to_attachment',
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export type Edge = {
  readonly type: EdgeType;
  /** The doc's rendering, kept verbatim so doc and code are greppable together. */
  readonly doc: string;
  readonly cardinality: 'many-to-one' | 'many-to-many';
  readonly required: boolean;
  readonly rewritable: boolean;
  /** Every log type that can write this edge. */
  readonly writers: readonly EventType[];
};

export const EDGES = [
  {
    type: 'task_to_area',
    doc: 'Task → Area',
    cardinality: 'many-to-one',
    required: true,
    rewritable: true,
    writers: ['task.created', 'task.reassigned_area'],
  },
  {
    type: 'task_to_person',
    doc: 'Task → Person',
    cardinality: 'many-to-many',
    required: false,
    rewritable: true,
    writers: ['task.linked_person', 'task.unlinked_person'],
  },
  {
    type: 'task_to_day',
    doc: 'Task → Day',
    cardinality: 'many-to-one',
    required: false,
    rewritable: true,
    writers: ['task.created', 'task.scheduled_to_day', 'task.unscheduled_from_day'],
  },
  {
    type: 'task_to_task',
    doc: 'Task → Task',
    cardinality: 'many-to-one',
    required: false,
    rewritable: true,
    writers: ['task.set_parent', 'task.cleared_parent'],
  },
  {
    type: 'event_to_person',
    doc: 'Event → Person',
    cardinality: 'many-to-many',
    required: false,
    rewritable: true,
    writers: ['calendar.linked_person', 'calendar.unlinked_person'],
  },
  {
    type: 'event_to_day',
    doc: 'Event → Day',
    cardinality: 'many-to-one',
    required: true,
    rewritable: true,
    // Rewritable only because `start` is: the Day is derived from it.
    writers: ['calendar.created', 'calendar.updated'],
  },
  {
    type: 'habit_to_area',
    doc: 'Habit → Area',
    cardinality: 'many-to-one',
    required: true,
    rewritable: false,
    writers: ['habit.created'],
  },
  {
    type: 'habit_to_protocol',
    doc: 'Habit → Protocol',
    cardinality: 'many-to-one',
    required: false,
    rewritable: true,
    writers: ['habit.created', 'habit.linked_protocol', 'habit.unlinked_protocol'],
  },
  {
    type: 'protocol_to_goal',
    doc: 'Protocol → Goal',
    cardinality: 'many-to-one',
    required: true,
    rewritable: false,
    writers: ['protocol.proposed'],
  },
  {
    type: 'goal_to_area',
    doc: 'Goal → Area',
    cardinality: 'many-to-one',
    required: true,
    rewritable: true,
    writers: ['goal.created', 'goal.reassigned_area'],
  },
  {
    // Edge 11 is polymorphic and it is still **one** edge: exactly one target,
    // required, and it can be changed but never removed (ADR 0016).
    type: 'note_to_attachment',
    doc: 'Note → exactly one of {Task, Event, Habit, Protocol, Day, Person}',
    cardinality: 'many-to-one',
    required: true,
    rewritable: true,
    writers: ['note.created', 'note.reattached'],
  },
] as const satisfies readonly Edge[];

/** The count the glossary and `object-model.md` both state. */
export const EDGE_COUNT = EDGES.length;
