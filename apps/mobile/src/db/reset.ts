import { eq } from 'drizzle-orm';
import {
  chatMessages,
  chatSessions,
  dailyActivity,
  notes,
  phrases,
  reviewCards,
  reviewLogs,
  settings,
} from './schema';
import type { Db } from './types';

/**
 * Xóa toàn bộ dữ liệu học của người dùng (FR-U-05, S4-08), đưa app về trạng thái ban đầu.
 * Giữ lại dữ liệu nội dung đóng gói (topics, dialogues, phrases có `isCustom = false`) và
 * giữ `content_version` để không phải seed lại không cần thiết.
 */
export function resetAllData(db: Db): void {
  db.transaction((tx) => {
    tx.delete(reviewLogs).run();
    tx.delete(reviewCards).run();
    tx.delete(notes).run();
    tx.delete(chatMessages).run();
    tx.delete(chatSessions).run();
    tx.delete(dailyActivity).run();
    tx.delete(phrases).where(eq(phrases.isCustom, true)).run();
    tx.delete(settings).run();
  });
}
