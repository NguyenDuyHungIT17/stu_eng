import { eq, sql } from 'drizzle-orm';
import { dailyActivity, phrases, reviewCards } from '@/db/schema';
import type { Db } from '@/db/types';
import { localDayKey } from '@/lib/day';
import { getStreak, type Streak } from './streak';

/** Trạng thái FSRS "Review" = đã qua giai đoạn học, coi là "đã thuộc". */
const FSRS_STATE_REVIEW = 2;

export type Stats = {
  streak: Streak;
  /** Số cụm đã thuộc (thẻ ở trạng thái Review, cụm chưa bị gỡ). */
  mastered: number;
  /** Số cụm đã bắt đầu học. */
  started: number;
  totalMinutes: number;
  todayMinutes: number;
  chatSessions: number;
};

/** Thống kê cơ bản (FR-P-03). */
export function getStats(db: Db, now: number): Stats {
  const cards = db
    .select({
      started: sql<number>`count(*)`,
      mastered: sql<number>`coalesce(sum(json_extract(${reviewCards.fsrsState}, '$.state') = ${FSRS_STATE_REVIEW}), 0)`,
    })
    .from(reviewCards)
    .innerJoin(phrases, eq(phrases.id, reviewCards.phraseId))
    .where(sql`${phrases.deletedAt} IS NULL`)
    .get();
  const totals = db
    .select({
      seconds: sql<number>`coalesce(sum(${dailyActivity.studySeconds}), 0)`,
      chats: sql<number>`coalesce(sum(${dailyActivity.chatSessions}), 0)`,
    })
    .from(dailyActivity)
    .get();
  const today = db
    .select({ seconds: dailyActivity.studySeconds })
    .from(dailyActivity)
    .where(eq(dailyActivity.day, localDayKey(now)))
    .get();
  return {
    streak: getStreak(db, now),
    mastered: cards?.mastered ?? 0,
    started: cards?.started ?? 0,
    totalMinutes: Math.floor((totals?.seconds ?? 0) / 60),
    todayMinutes: Math.floor((today?.seconds ?? 0) / 60),
    chatSessions: totals?.chats ?? 0,
  };
}
