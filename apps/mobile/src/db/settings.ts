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
} as const;
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey];

export const DEFAULT_DAILY_NEW_LIMIT = 10;
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

/** Số cụm mới tối đa mỗi ngày (FR-V-05). Giá trị hỏng thì dùng mặc định. */
export function getDailyNewLimit(db: Db): number {
  const raw = getSetting(db, SettingKey.dailyNewLimit);
  // Lưu ý: Number(null) = 0, nên phải kiểm tra thiếu giá trị trước.
  if (raw === null || raw.trim() === '') return DEFAULT_DAILY_NEW_LIMIT;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_NEW_LIMIT;
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
