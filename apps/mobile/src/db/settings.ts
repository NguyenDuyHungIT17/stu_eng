import { eq } from 'drizzle-orm';
import { settings } from './schema';
import type { Db } from './types';

/** Khóa cài đặt dùng trong app. Thêm khóa mới ở đây để tránh gõ sai chuỗi. */
export const SettingKey = {
  contentVersion: 'content_version',
  level: 'level',
  dailyNewLimit: 'daily_new_limit',
} as const;
export type SettingKey = (typeof SettingKey)[keyof typeof SettingKey];

export const DEFAULT_DAILY_NEW_LIMIT = 10;

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
  const n = Number(getSetting(db, SettingKey.dailyNewLimit));
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_NEW_LIMIT;
}
