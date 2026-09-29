import { z } from 'zod';

import { DateStringSchema, TimeStringSchema, UlidSchema } from '../ids';

/**
 * The `task` domain (`02-architecture/event-log.md` §The full type list).
 *
 * A creation carries all four temporal fields, and a later change goes through
 * the entry that owns it: `task.rescheduled` for `due`/`defer`,
 * `task.scheduled_to_day` for the day and its hour. An absent key means "not
 * set", including on the change entries, where it therefore *clears* the field
 * (`10-engineering/code-conventions.md`).
 */

export const TaskPrioritySchema = z.enum(['now', 'next', 'later']);
export const TaskSourceSchema = z.enum(['user', 'ai.tier1']);

export const TaskCreatedSchema = z.object({
  task_id: UlidSchema,
  title: z.string().min(1).max(500),
  area_id: UlidSchema,
  due: DateStringSchema.optional(),
  defer: DateStringSchema.optional(),
  scheduled_day: DateStringSchema.optional(),
  /** A clock time is always placed on a day (ADR 0025). */
  scheduled_time: TimeStringSchema.optional(),
  /** A span in minutes. Not a position — see `scheduled_time` (ADR 0031). */
  estimated_minutes: z.number().int().positive().optional(),
  priority: TaskPrioritySchema.optional(),
  source: TaskSourceSchema,
});

export const TaskRenamedSchema = z.object({
  task_id: UlidSchema,
  title: z.string().min(1).max(500),
});

export const TaskRescheduledSchema = z.object({
  task_id: UlidSchema,
  due: DateStringSchema.optional(),
  defer: DateStringSchema.optional(),
});

export const TaskScheduledToDaySchema = z.object({
  task_id: UlidSchema,
  day: DateStringSchema,
  /** Absent means "belongs to the day, not placed in it". */
  time: TimeStringSchema.optional(),
});

export const TaskUnscheduledFromDaySchema = z.object({
  task_id: UlidSchema,
  day: DateStringSchema,
});

export const TaskReassignedAreaSchema = z.object({
  task_id: UlidSchema,
  area_id: UlidSchema,
});

export const TaskLinkedPersonSchema = z.object({
  task_id: UlidSchema,
  person_id: UlidSchema,
});

export const TaskUnlinkedPersonSchema = z.object({
  task_id: UlidSchema,
  person_id: UlidSchema,
});

export const TaskSetParentSchema = z.object({
  task_id: UlidSchema,
  parent_task_id: UlidSchema,
});

export const TaskClearedParentSchema = z.object({ task_id: UlidSchema });

export const TaskPriorityChangedSchema = z.object({
  task_id: UlidSchema,
  priority: TaskPrioritySchema,
});

export const TaskEstimatedSchema = z.object({
  task_id: UlidSchema,
  /** Absent clears it: an absent key is the one way to say "not estimated". */
  estimated_minutes: z.number().int().positive().optional(),
});

export const TaskCompletedSchema = z.object({
  task_id: UlidSchema,
  completed_at: z.string().datetime(),
  note: z.string().optional(),
});

export const TaskUncompletedSchema = z.object({ task_id: UlidSchema });
export const TaskMarkedSomedaySchema = z.object({ task_id: UlidSchema });
export const TaskUnmarkedSomedaySchema = z.object({ task_id: UlidSchema });
export const TaskArchivedSchema = z.object({ task_id: UlidSchema });
export const TaskUnarchivedSchema = z.object({ task_id: UlidSchema });

/** A tombstone. The entry stays; the projection stops showing the task. */
export const TaskDeletedSchema = z.object({ task_id: UlidSchema });

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskSource = z.infer<typeof TaskSourceSchema>;
export type TaskCreatedPayload = z.infer<typeof TaskCreatedSchema>;
export type TaskRenamedPayload = z.infer<typeof TaskRenamedSchema>;
export type TaskRescheduledPayload = z.infer<typeof TaskRescheduledSchema>;
export type TaskScheduledToDayPayload = z.infer<typeof TaskScheduledToDaySchema>;
export type TaskUnscheduledFromDayPayload = z.infer<typeof TaskUnscheduledFromDaySchema>;
export type TaskReassignedAreaPayload = z.infer<typeof TaskReassignedAreaSchema>;
export type TaskLinkedPersonPayload = z.infer<typeof TaskLinkedPersonSchema>;
export type TaskUnlinkedPersonPayload = z.infer<typeof TaskUnlinkedPersonSchema>;
export type TaskSetParentPayload = z.infer<typeof TaskSetParentSchema>;
export type TaskClearedParentPayload = z.infer<typeof TaskClearedParentSchema>;
export type TaskPriorityChangedPayload = z.infer<typeof TaskPriorityChangedSchema>;
export type TaskEstimatedPayload = z.infer<typeof TaskEstimatedSchema>;
export type TaskCompletedPayload = z.infer<typeof TaskCompletedSchema>;
export type TaskUncompletedPayload = z.infer<typeof TaskUncompletedSchema>;
export type TaskMarkedSomedayPayload = z.infer<typeof TaskMarkedSomedaySchema>;
export type TaskUnmarkedSomedayPayload = z.infer<typeof TaskUnmarkedSomedaySchema>;
export type TaskArchivedPayload = z.infer<typeof TaskArchivedSchema>;
export type TaskUnarchivedPayload = z.infer<typeof TaskUnarchivedSchema>;
export type TaskDeletedPayload = z.infer<typeof TaskDeletedSchema>;
