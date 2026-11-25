import { getSetting, SettingKey, setSetting } from '@/db/settings';
import type { Db } from '@/db/types';

/** UUID v4 ngẫu nhiên (không cần mật mã học: chỉ là định danh ẩn danh để chia quota). */
export function randomUuid(rand: () => number = Math.random): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(rand() * 16);
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Định danh thiết bị gửi kèm `X-Device-Id` (TK §7.6): sinh lần đầu, lưu trong SQLite.
 * Ẩn danh, mất khi gỡ app/xóa dữ liệu (khi đó quota tính như máy mới).
 */
export function getDeviceId(db: Db): string {
  const existing = getSetting(db, SettingKey.deviceId);
  if (existing) return existing;
  const id = randomUuid();
  setSetting(db, SettingKey.deviceId, id);
  return id;
}
