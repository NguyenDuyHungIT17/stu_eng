import { LEVELS, type Level } from '@app/shared';
import { and, asc, eq, gte, inArray, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import { dailyActivity, phrases, reviewCards, reviewLogs, topics } from '@/db/schema';
import type { Db } from '@/db/types';
import { addLocalDays, localDayKey, startOfLocalDay } from '@/lib/day';
import { type CardState, parseCard, type Rating, scheduleNext, serializeCard } from '@/lib/fsrs';
import { createId } from '@/lib/id';

/** Ôn tập ngắt quãng. Xem Thiết kế kỹ thuật §6.1, BRD FR-V-03, FR-V-05. */

export type Phrase = typeof phrases.$inferSelect;
export type ExerciseType = 'flip' | 'choose_meaning' | 'listen_choose';
export type DueCard = { phrase: Phrase; card: CardState };

const visible = and(isNull(phrases.deletedAt), isNull(topics.deletedAt));

/** Thẻ đến hạn (`due <= now`), sắp theo `due`; bỏ cụm/chủ đề đã gỡ. */
export function getDueCards(db: Db, now: number, limit = 200): DueCard[] {
  return db
    .select({ phrase: phrases, fsrsState: reviewCards.fsrsState })
    .from(reviewCards)
    .innerJoin(phrases, eq(phrases.id, reviewCards.phraseId))
    .innerJoin(topics, eq(topics.id, phrases.topicId))
    .where(and(lte(reviewCards.due, now), visible))
    .orderBy(asc(reviewCards.due))
    .limit(limit)
    .all()
    .map((r) => ({ phrase: r.phrase, card: parseCard(r.fsrsState) }));
}

/** Số thẻ cần ôn trong hôm nay (đến hạn trước 00:00 ngày mai, giờ máy). */
export function countDueToday(db: Db, now: number): number {
  const endOfDay = startOfLocalDay(addLocalDays(now, 1));
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewCards)
    .innerJoin(phrases, eq(phrases.id, reviewCards.phraseId))
    .innerJoin(topics, eq(topics.id, phrases.topicId))
    .where(and(lt(reviewCards.due, endOfDay), visible))
    .get();
  return row?.n ?? 0;
}

/** Số thẻ mới đã bắt đầu học hôm nay (theo `review_cards.createdAt`). */
export function countNewToday(db: Db, now: number): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewCards)
    .where(gte(reviewCards.createdAt, startOfLocalDay(now)))
    .get();
  return row?.n ?? 0;
}

/** Số cụm mới còn được học hôm nay, không âm. */
export function newRemainingToday(db: Db, now: number, dailyNewLimit: number): number {
  return Math.max(0, dailyNewLimit - countNewToday(db, now));
}

/** Các trình độ người học được thấy: từ A1 đến trình độ hiện tại. */
export function levelsUpTo(level: Level): Level[] {
  return LEVELS.slice(0, LEVELS.indexOf(level) + 1);
}

/**
 * Cụm mới để học hôm nay: chưa có thẻ, đúng trình độ, theo thứ tự chủ đề rồi thứ tự biên soạn.
 * Số lượng ≤ số còn lại của mục tiêu ngày (FR-V-05).
 */
export function getNewPhrases(
  db: Db,
  now: number,
  opts: { dailyNewLimit: number; level: Level },
): Phrase[] {
  const remaining = newRemainingToday(db, now, opts.dailyNewLimit);
  if (remaining === 0) return [];
  return db
    .select({ phrase: phrases })
    .from(phrases)
    .innerJoin(topics, eq(topics.id, phrases.topicId))
    .leftJoin(reviewCards, eq(reviewCards.phraseId, phrases.id))
    .where(
      and(visible, isNull(reviewCards.phraseId), inArray(phrases.level, levelsUpTo(opts.level))),
    )
    .orderBy(asc(topics.sortOrder), asc(phrases.sortOrder), asc(phrases.id))
    .limit(remaining)
    .all()
    .map((r) => r.phrase);
}

export type ReviewInput = {
  phraseId: string;
  rating: Rating;
  exerciseType: ExerciseType;
  now: number;
};

/**
 * Ghi kết quả một lượt ôn trong MỘT transaction: `review_cards` (tạo hoặc cập nhật),
 * `review_logs`, `daily_activity` (newCards nếu là thẻ mới, reviews +1). Trả trạng thái thẻ mới.
 */
export function recordReview(db: Db, input: ReviewInput): CardState {
  const { phraseId, rating, exerciseType, now } = input;
  return db.transaction((tx) => {
    const existing = tx
      .select({ fsrsState: reviewCards.fsrsState })
      .from(reviewCards)
      .where(eq(reviewCards.phraseId, phraseId))
      .get();
    const isNew = !existing;
    const next = scheduleNext(existing ? parseCard(existing.fsrsState) : null, rating, now);
    const state = serializeCard(next);

    if (isNew) {
      tx.insert(reviewCards)
        .values({ phraseId, due: next.due, fsrsState: state, createdAt: now, updatedAt: now })
        .run();
    } else {
      tx.update(reviewCards)
        .set({ due: next.due, fsrsState: state, updatedAt: now })
        .where(eq(reviewCards.phraseId, phraseId))
        .run();
    }

    tx.insert(reviewLogs)
      .values({ id: createId(now), phraseId, rating, exerciseType, reviewedAt: now })
      .run();

    const newCards = isNew ? 1 : 0;
    tx.insert(dailyActivity)
      .values({ day: localDayKey(now), newCards, reviews: 1 })
      .onConflictDoUpdate({
        target: dailyActivity.day,
        set: {
          newCards: sql`${dailyActivity.newCards} + ${newCards}`,
          reviews: sql`${dailyActivity.reviews} + 1`,
        },
      })
      .run();

    return next;
  });
}

/**
 * Đáp án nhiễu cho bài trắc nghiệm: ưu tiên cụm cùng chủ đề, thiếu thì lấy chủ đề khác.
 * Bỏ cụm trùng nghĩa/trùng chữ với đáp án đúng để không có hai đáp án đúng.
 */
export function pickDistractors(
  db: Db,
  phraseId: string,
  count = 3,
  rng: () => number = Math.random,
): Phrase[] {
  const target = db.select().from(phrases).where(eq(phrases.id, phraseId)).get();
  if (!target) return [];

  const pool = db
    .select({ phrase: phrases })
    .from(phrases)
    .innerJoin(topics, eq(topics.id, phrases.topicId))
    .where(and(visible, ne(phrases.id, phraseId)))
    .all()
    .map((r) => r.phrase)
    .filter(
      (p) =>
        p.meaningVi.trim().toLowerCase() !== target.meaningVi.trim().toLowerCase() &&
        p.text.trim().toLowerCase() !== target.text.trim().toLowerCase(),
    );

  const same = shuffle(
    pool.filter((p) => p.topicId === target.topicId),
    rng,
  );
  const other = shuffle(
    pool.filter((p) => p.topicId !== target.topicId),
    rng,
  );
  return [...same, ...other].slice(0, count);
}

/** Trộn ngẫu nhiên (Fisher–Yates), trả mảng mới. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}
