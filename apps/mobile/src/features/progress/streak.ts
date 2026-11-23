import { gte } from 'drizzle-orm';
import { dailyActivity } from '@/db/schema';
import type { Db } from '@/db/types';
import { addLocalDays, localDayKey } from '@/lib/day';

/**
 * Chuỗi ngày học liên tiếp (FR-P-03). Định nghĩa "ngày có học" theo BRD §5.1:
 * ôn/học ít nhất 1 thẻ, hoặc hoàn thành 1 buổi hội thoại. Ngày theo giờ máy.
 */

export type DayActivity = { day: string; newCards: number; reviews: number; chatSessions: number };

export function isActiveDay(a: DayActivity): boolean {
  return a.newCards + a.reviews > 0 || a.chatSessions > 0;
}

export type Streak = {
  /** Số ngày liên tiếp có học, tính đến hôm nay (hoặc hôm qua nếu hôm nay chưa học). */
  current: number;
  /** Hôm nay đã có học chưa: chưa thì chuỗi vẫn giữ, nhưng sẽ mất nếu hết ngày. */
  todayDone: boolean;
};

/** Tính streak từ danh sách ngày (thứ tự bất kỳ). Hàm thuần để dễ test. */
export function computeStreak(days: DayActivity[], now: number): Streak {
  const active = new Set(days.filter(isActiveDay).map((d) => d.day));
  const todayDone = active.has(localDayKey(now));
  let cursor = todayDone ? now : addLocalDays(now, -1).getTime();
  let current = 0;
  while (active.has(localDayKey(cursor))) {
    current++;
    cursor = addLocalDays(cursor, -1).getTime();
  }
  return { current, todayDone };
}

/** Đọc `daily_activity` (tối đa `maxDays` ngày gần nhất) và tính streak. */
export function getStreak(db: Db, now: number, maxDays = 3660): Streak {
  const from = localDayKey(addLocalDays(now, -maxDays));
  const rows = db.select().from(dailyActivity).where(gte(dailyActivity.day, from)).all();
  return computeStreak(rows, now);
}
