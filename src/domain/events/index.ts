import { z } from 'zod';

import {
  AiAppliedSchema,
  AiFailedSchema,
  AiProposedSchema,
  AiRejectedSchema,
  AiResearchCompletedSchema,
  AiResearchStartedSchema,
} from './ai';
import {
  AreaArchivedSchema,
  AreaCreatedSchema,
  AreaRenamedSchema,
  AreaUnarchivedSchema,
  GoalAbandonedSchema,
  GoalAchievedSchema,
  GoalCreatedSchema,
  GoalReassignedAreaSchema,
  GoalRenamedSchema,
  GoalReopenedSchema,
} from './areas-and-goals';
import {
  CalendarCreatedSchema,
  CalendarDeletedSchema,
  CalendarLinkedPersonSchema,
  CalendarMirroredSchema,
  CalendarUnlinkedPersonSchema,
  CalendarUpdatedSchema,
} from './calendar';
import {
  DayClosedSchema,
  DayNoteCreatedSchema,
  DayOpenedSchema,
  DayPlannedSchema,
  DayPlanSkippedSchema,
} from './day';
import { BaseEntrySchema, type EventEntry } from './entry';
import {
  HabitArchivedSchema,
  HabitCadenceChangedSchema,
  HabitCheckedSchema,
  HabitCreatedSchema,
  HabitLinkedProtocolSchema,
  HabitMinimumChangedSchema,
  HabitRenamedSchema,
  HabitSkippedSchema,
  HabitUnarchivedSchema,
  HabitUncheckedSchema,
  HabitUnlinkedProtocolSchema,
} from './habit';
import {
  NoteCreatedSchema,
  NoteDeletedSchema,
  NoteEditedSchema,
  NoteReattachedSchema,
} from './note';
import {
  PersonArchivedSchema,
  PersonCreatedSchema,
  PersonRenamedSchema,
  PersonUnarchivedSchema,
} from './person';
import {
  ProtocolAbandonedSchema,
  ProtocolActivatedSchema,
  ProtocolAdoptedSchema,
  ProtocolCompletedSchema,
  ProtocolEditedSchema,
  ProtocolMetricLoggedSchema,
  ProtocolProposedSchema,
  ProtocolReviewedSchema,
} from './protocol';
import {
  SystemAuthExpiredSchema,
  SystemCatchUpSchema,
  SystemClockCorrectedSchema,
  SystemFreshStartSchema,
  SystemLapseSkippedSchema,
  SystemNudgesSilencedSchema,
  SystemSettingsChangedSchema,
} from './system';
import {
  TaskArchivedSchema,
  TaskClearedParentSchema,
  TaskCompletedSchema,
  TaskCreatedSchema,
  TaskDeletedSchema,
  TaskEstimatedSchema,
  TaskLinkedPersonSchema,
  TaskMarkedSomedaySchema,
  TaskPriorityChangedSchema,
  TaskReassignedAreaSchema,
  TaskRenamedSchema,
  TaskRescheduledSchema,
  TaskScheduledToDaySchema,
  TaskSetParentSchema,
  TaskUnarchivedSchema,
  TaskUncompletedSchema,
  TaskUnlinkedPersonSchema,
  TaskUnmarkedSomedaySchema,
  TaskUnscheduledFromDaySchema,
} from './task';

export type { Actor, ActorType, BaseEntry, EventEntry } from './entry';
export { ActorSchema, BaseEntrySchema, SCHEMA_VERSION, compareEntries, ordered } from './entry';
export * from './settings-key';

/**
 * The full type list (`02-architecture/event-log.md`), in the doc's order:
 * 80 types across 11 domains. `attention` is not a domain — nudge telemetry is
 * client-side only — and sync telemetry is not in the log either.
 *
 * **This array and `PAYLOAD_SCHEMAS` below are the registry.** There is no
 * other place that knows what events exist, so adding one is an edit here, an
 * ADR, and a doc change.
 */
export const EVENT_TYPES = [
  // task
  'task.created',
  'task.renamed',
  'task.rescheduled',
  'task.scheduled_to_day',
  'task.unscheduled_from_day',
  'task.reassigned_area',
  'task.linked_person',
  'task.unlinked_person',
  'task.set_parent',
  'task.cleared_parent',
  'task.priority_changed',
  'task.estimated',
  'task.completed',
  'task.uncompleted',
  'task.marked_someday',
  'task.unmarked_someday',
  'task.archived',
  'task.unarchived',
  'task.deleted',
  // calendar (the Event atom)
  'calendar.created',
  'calendar.updated',
  'calendar.linked_person',
  'calendar.unlinked_person',
  'calendar.deleted',
  'calendar.mirrored',
  // habit
  'habit.created',
  'habit.renamed',
  'habit.cadence_changed',
  'habit.minimum_changed',
  'habit.linked_protocol',
  'habit.unlinked_protocol',
  'habit.checked',
  'habit.unchecked',
  'habit.skipped',
  'habit.archived',
  'habit.unarchived',
  // note
  'note.created',
  'note.edited',
  'note.reattached',
  'note.deleted',
  // area
  'area.created',
  'area.renamed',
  'area.archived',
  'area.unarchived',
  // goal
  'goal.created',
  'goal.renamed',
  'goal.reassigned_area',
  'goal.achieved',
  'goal.abandoned',
  'goal.reopened',
  // protocol
  'protocol.proposed',
  'protocol.edited',
  'protocol.adopted',
  'protocol.activated',
  'protocol.metric_logged',
  'protocol.reviewed',
  'protocol.completed',
  'protocol.abandoned',
  // person
  'person.created',
  'person.renamed',
  'person.archived',
  'person.unarchived',
  // day
  'day.opened',
  'day.planned',
  'day.plan_skipped',
  'day.closed',
  'day.note_created',
  // ai
  'ai.proposed',
  'ai.applied',
  'ai.rejected',
  'ai.research_started',
  'ai.research_completed',
  'ai.failed',
  // system
  'system.settings_changed',
  'system.nudges_silenced',
  'system.lapse_skipped',
  'system.fresh_start',
  'system.catch_up',
  'system.clock_corrected',
  'system.auth_expired',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EventTypeSchema = z.enum(EVENT_TYPES);

/** Payload schema per type. The `type` string is the only key that matters. */
export const PAYLOAD_SCHEMAS = {
  'task.created': TaskCreatedSchema,
  'task.renamed': TaskRenamedSchema,
  'task.rescheduled': TaskRescheduledSchema,
  'task.scheduled_to_day': TaskScheduledToDaySchema,
  'task.unscheduled_from_day': TaskUnscheduledFromDaySchema,
  'task.reassigned_area': TaskReassignedAreaSchema,
  'task.linked_person': TaskLinkedPersonSchema,
  'task.unlinked_person': TaskUnlinkedPersonSchema,
  'task.set_parent': TaskSetParentSchema,
  'task.cleared_parent': TaskClearedParentSchema,
  'task.priority_changed': TaskPriorityChangedSchema,
  'task.estimated': TaskEstimatedSchema,
  'task.completed': TaskCompletedSchema,
  'task.uncompleted': TaskUncompletedSchema,
  'task.marked_someday': TaskMarkedSomedaySchema,
  'task.unmarked_someday': TaskUnmarkedSomedaySchema,
  'task.archived': TaskArchivedSchema,
  'task.unarchived': TaskUnarchivedSchema,
  'task.deleted': TaskDeletedSchema,
  'calendar.created': CalendarCreatedSchema,
  'calendar.updated': CalendarUpdatedSchema,
  'calendar.linked_person': CalendarLinkedPersonSchema,
  'calendar.unlinked_person': CalendarUnlinkedPersonSchema,
  'calendar.deleted': CalendarDeletedSchema,
  'calendar.mirrored': CalendarMirroredSchema,
  'habit.created': HabitCreatedSchema,
  'habit.renamed': HabitRenamedSchema,
  'habit.cadence_changed': HabitCadenceChangedSchema,
  'habit.minimum_changed': HabitMinimumChangedSchema,
  'habit.linked_protocol': HabitLinkedProtocolSchema,
  'habit.unlinked_protocol': HabitUnlinkedProtocolSchema,
  'habit.checked': HabitCheckedSchema,
  'habit.unchecked': HabitUncheckedSchema,
  'habit.skipped': HabitSkippedSchema,
  'habit.archived': HabitArchivedSchema,
  'habit.unarchived': HabitUnarchivedSchema,
  'note.created': NoteCreatedSchema,
  'note.edited': NoteEditedSchema,
  'note.reattached': NoteReattachedSchema,
  'note.deleted': NoteDeletedSchema,
  'area.created': AreaCreatedSchema,
  'area.renamed': AreaRenamedSchema,
  'area.archived': AreaArchivedSchema,
  'area.unarchived': AreaUnarchivedSchema,
  'goal.created': GoalCreatedSchema,
  'goal.renamed': GoalRenamedSchema,
  'goal.reassigned_area': GoalReassignedAreaSchema,
  'goal.achieved': GoalAchievedSchema,
  'goal.abandoned': GoalAbandonedSchema,
  'goal.reopened': GoalReopenedSchema,
  'protocol.proposed': ProtocolProposedSchema,
  'protocol.edited': ProtocolEditedSchema,
  'protocol.adopted': ProtocolAdoptedSchema,
  'protocol.activated': ProtocolActivatedSchema,
  'protocol.metric_logged': ProtocolMetricLoggedSchema,
  'protocol.reviewed': ProtocolReviewedSchema,
  'protocol.completed': ProtocolCompletedSchema,
  'protocol.abandoned': ProtocolAbandonedSchema,
  'person.created': PersonCreatedSchema,
  'person.renamed': PersonRenamedSchema,
  'person.archived': PersonArchivedSchema,
  'person.unarchived': PersonUnarchivedSchema,
  'day.opened': DayOpenedSchema,
  'day.planned': DayPlannedSchema,
  'day.plan_skipped': DayPlanSkippedSchema,
  'day.closed': DayClosedSchema,
  'day.note_created': DayNoteCreatedSchema,
  'ai.proposed': AiProposedSchema,
  'ai.applied': AiAppliedSchema,
  'ai.rejected': AiRejectedSchema,
  'ai.research_started': AiResearchStartedSchema,
  'ai.research_completed': AiResearchCompletedSchema,
  'ai.failed': AiFailedSchema,
  'system.settings_changed': SystemSettingsChangedSchema,
  'system.nudges_silenced': SystemNudgesSilencedSchema,
  'system.lapse_skipped': SystemLapseSkippedSchema,
  'system.fresh_start': SystemFreshStartSchema,
  'system.catch_up': SystemCatchUpSchema,
  'system.clock_corrected': SystemClockCorrectedSchema,
  'system.auth_expired': SystemAuthExpiredSchema,
} as const;

export type PayloadFor<T extends EventType> = z.infer<(typeof PAYLOAD_SCHEMAS)[T]>;

/**
 * The log entry union — one member per type, so `switch (entry.type)` narrows
 * `entry.payload` with no cast anywhere in a projection.
 */
export type LogEntry = { [T in EventType]: EventEntry<T, PayloadFor<T>> }[EventType];

/** The domain a type belongs to, which is the grain of the invalidation table. */
export type EventDomain = EventType extends `${infer D}.${string}` ? D : never;

export function domainOf(type: EventType): EventDomain {
  const [domain] = type.split('.');
  // `split` on a dotted type string always yields at least one segment; the
  // assertion is what tells the compiler what the template literal above means.
  return domain as EventDomain;
}

/** Throws on a payload that does not match its type. Boundaries validate. */
export function parsePayload(type: EventType, payload: unknown): PayloadFor<EventType> {
  const schema: z.ZodTypeAny = PAYLOAD_SCHEMAS[type];
  return schema.parse(payload) as PayloadFor<EventType>;
}

/**
 * Validate an entry read back from storage (a boundary — file reads, storage
 * reads, snapshots all validate).
 */
export function parseLogEntry(input: unknown): LogEntry {
  const base = BaseEntrySchema.parse(input);
  const type = EventTypeSchema.parse(base.type);
  const payload = parsePayload(type, (input as { payload?: unknown }).payload);
  // The compiler cannot verify that a literal `type` and a separately parsed
  // payload belong to the same member of an 80-member union. The two schemas
  // above are what guarantee it.
  return { ...base, type, payload } as LogEntry;
}
