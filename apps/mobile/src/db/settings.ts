import { LEVELS, type Level } from '@app/shared';
import { eq } from 'drizzle-orm';
import { settings } from './schema';
import type { Db } from './types';

/** Khóa cài đặt dùng trong app. Thêm khóa mới ở đây để tránh gõ sai chuỗi. */
export const SettingKey = {
  contentVersion: 'content_version',
  level: 'level',
  dailyNewLimit: 'daily_new_limit',
  ttsVoice: 'tts_voice',
  ttsRate: 'tts_rate',
  dailyMinutesGoal: 'daily_minutes_goal',
  reminderEnabled: 'reminder_enabled',
  reminderTime: 'reminder_time',
  deviceId: 'device_id',
  privacyAck: 'privacy_ack',
  onboardingDone: 'onboarding_done',
  learningGoal: 'learning_goal',
  themeMode: 'theme_mode',
} as const;
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey];

export const DEFAULT_DAILY_NEW_LIMIT = 10;
export const DEFAULT_DAILY_MINUTES_GOAL = 10;
export const NEW_LIMIT_CHOICES = [5, 10, 15, 20] as const;
export const MINUTES_GOAL_CHOICES = [5, 10, 15, 20, 30] as const;
/** Chưa có bài xếp trình độ (Sprint 4) thì mở toàn bộ nội dung, học theo thứ tự chủ đề. */
export const DEFAULT_LEVEL: Level = 'B2';

export function getSetting(db: Db, key: SettingKey): string | null {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(db: Db, key: SettingKey, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

/** Đọc số nguyên ≥ 0; thiếu hoặc hỏng thì dùng `fallback`. Lưu ý: Number(null) = 0. */
function getIntSetting(db: Db, key: SettingKey, fallback: number): number {
  const raw = getSetting(db, key);
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Số cụm mới tối đa mỗi ngày (FR-V-05, FR-P-02). */
export function getDailyNewLimit(db: Db): number {
  return getIntSetting(db, SettingKey.dailyNewLimit, DEFAULT_DAILY_NEW_LIMIT);
}

/** Mục tiêu số phút học mỗi ngày (FR-P-02). */
export function getDailyMinutesGoal(db: Db): number {
  return getIntSetting(db, SettingKey.dailyMinutesGoal, DEFAULT_DAILY_MINUTES_GOAL);
}

export function getLevel(db: Db): Level {
  const v = getSetting(db, SettingKey.level);
  return (LEVELS as readonly string[]).includes(v ?? '') ? (v as Level) : DEFAULT_LEVEL;
}

/** Giọng và tốc độ TTS người dùng đã chọn (null = mặc định của máy). */
export function getTtsPrefs(db: Db): { voice: string | null; rate: number | undefined } {
  const rate = Number(getSetting(db, SettingKey.ttsRate));
  return {
    voice: getSetting(db, SettingKey.ttsVoice),
    rate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
  };
}

/** Nhắc học hằng ngày (FR-P-04). Mặc định bật lúc 20:00. */
export type ReminderPrefs = { enabled: boolean; hour: number; minute: number };
export const DEFAULT_REMINDER: ReminderPrefs = { enabled: true, hour: 20, minute: 0 };
export const REMINDER_HOUR_CHOICES = [7, 12, 18, 20, 21] as const;

export function getReminderPrefs(db: Db): ReminderPrefs {
  const enabled = getSetting(db, SettingKey.reminderEnabled);
  const m = /^(\d{1,2}):(\d{2})$/.exec(getSetting(db, SettingKey.reminderTime) ?? '');
  const hour = m ? Number(m[1]) : DEFAULT_REMINDER.hour;
  const minute = m ? Number(m[2]) : DEFAULT_REMINDER.minute;
  const valid = hour < 24 && minute < 60;
  return {
    enabled: enabled === null ? DEFAULT_REMINDER.enabled : enabled === '1',
    hour: valid ? hour : DEFAULT_REMINDER.hour,
    minute: valid ? minute : DEFAULT_REMINDER.minute,
  };
}

export function setReminderPrefs(db: Db, prefs: ReminderPrefs): void {
  setSetting(db, SettingKey.reminderEnabled, prefs.enabled ? '1' : '0');
  const mm = String(prefs.minute).padStart(2, '0');
  setSetting(db, SettingKey.reminderTime, `${prefs.hour}:${mm}`);
}

/** Người dùng đã đọc thông báo quyền riêng tư trước khi dùng hội thoại AI chưa (FR-U-02, S3b-09). */
export function hasPrivacyAck(db: Db): boolean {
  return getSetting(db, SettingKey.privacyAck) === '1';
}

export function setPrivacyAck(db: Db): void {
  setSetting(db, SettingKey.privacyAck, '1');
}

export function hasOnboardingDone(db: Db): boolean {
  return getSetting(db, SettingKey.onboardingDone) === '1';
}

export function setOnboardingDone(db: Db): void {
  setSetting(db, SettingKey.onboardingDone, '1');
}

export const LEARNING_GOALS = [
  { id: 'work', label: '💼 Công việc' },
  { id: 'travel', label: '✈️ Du lịch' },
  { id: 'life', label: '💬 Đời sống' },
] as const;
export type LearningGoal = (typeof LEARNING_GOALS)[number]['id'];

export function getLearningGoal(db: Db): LearningGoal {
  const v = getSetting(db, SettingKey.learningGoal);
  return v === 'work' || v === 'travel' || v === 'life' ? v : 'life';
}

export const THEME_MODES = [
  { id: 'system', label: 'Theo máy' },
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
] as const;
export type ThemeMode = (typeof THEME_MODES)[number]['id'];

export function getThemeMode(db: Db): ThemeMode {
  const v = getSetting(db, SettingKey.themeMode);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}
