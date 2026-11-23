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
