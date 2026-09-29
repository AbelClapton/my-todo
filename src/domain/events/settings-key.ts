import { z } from 'zod';

/**
 * `SettingsKey` and the two unions it is derived from
 * (`02-architecture/event-log.md`).
 *
 * Three sets move together: the attention budget's surface catalog, the
 * settings toggles, and this union (ADR 0013). Adding a key is a doc change,
 * which is why the list is written out rather than generated — the point of
 * the union is that a new key cannot appear by accident.
 */

/** The attention budget catalog. `attention` is not a log domain. */
export const SURFACE_IDS = [
  'prep_card',
  'contextual',
  'forgotten',
  'people',
  'weekly_review',
  'protocol_review',
  'price_drop',
  'what_slipped',
  'inbox_ritual',
  'streak_milestone',
  'streak_repair',
  'low_energy',
] as const;

export const SurfaceIdSchema = z.enum(SURFACE_IDS);
export type SurfaceId = z.infer<typeof SurfaceIdSchema>;

/** Channels are app-wide, not per-surface. */
export const NOTIFICATION_CHANNELS = ['push', 'in_app_banner', 'badge'] as const;

export const NotificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/**
 * 26 plain keys plus the two templates expanded — 41 concrete keys, which is
 * the number `05-modules/settings.md` counts when it says "Reset all settings"
 * writes 41 entries.
 */
export const SETTINGS_KEYS = [
  'quiet_hours.start',
  'quiet_hours.end',
  'nudge.frequency',
  'sync.enabled',
  'sync.sensitive_backup',
  'day.boundary_hour',
  'day.week_starts_on',
  'review.weekly_day',
  'review.weekly_time',
  'review.monthly_enabled',
  'review.annual_enabled',
  'theme',
  'default_mode',
  'haptics.enabled',
  'developer_mode',
  'crash_reports.enabled',
  'auto_linking.enabled',
  'lapse.threshold_days',
  'locale.override',
  'ai.on_device_only',
  'ai.audit_mode',
  'integration.calendar.enabled',
  'integration.contacts.enabled',
  'integration.health.enabled',
  'integration.weather.enabled',
  'integration.weather.home_location',
  'nudge.surface.prep_card.enabled',
  'nudge.surface.contextual.enabled',
  'nudge.surface.forgotten.enabled',
  'nudge.surface.people.enabled',
  'nudge.surface.weekly_review.enabled',
  'nudge.surface.protocol_review.enabled',
  'nudge.surface.price_drop.enabled',
  'nudge.surface.what_slipped.enabled',
  'nudge.surface.inbox_ritual.enabled',
  'nudge.surface.streak_milestone.enabled',
  'nudge.surface.streak_repair.enabled',
  'nudge.surface.low_energy.enabled',
  'notification.channel.push.enabled',
  'notification.channel.in_app_banner.enabled',
  'notification.channel.badge.enabled',
] as const;

export const SettingsKeySchema = z.enum(SETTINGS_KEYS);
export type SettingsKey = z.infer<typeof SettingsKeySchema>;

/**
 * Which keys get a row, which are preferences for "Reset all settings", and
 * which need a confirmation are three different classifications the flat union
 * cannot express (`05-modules/settings.md`). They are not modelled yet; the
 * union is deliberately flat until a surface needs the split.
 */
