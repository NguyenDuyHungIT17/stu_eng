import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { phrases, reviewCards, topics } from '@/db/schema';
import type { Db } from '@/db/types';

export type Topic = typeof topics.$inferSelect;
export type Phrase = typeof phrases.$inferSelect;
export type TopicWithStats = Topic & { phraseCount: number; learnedCount: number };

/** Danh sách chủ đề đang hiển thị, kèm số cụm và số cụm đã học (FR-V-01). */
export function listTopics(db: Db): TopicWithStats[] {
  return db
    .select({
      id: topics.id,
      title: topics.title,
      level: topics.level,
      sortOrder: topics.sortOrder,
      deletedAt: topics.deletedAt,
      phraseCount: sql<number>`count(${phrases.id})`,
      learnedCount: sql<number>`count(${reviewCards.phraseId})`,
    })
    .from(topics)
    .leftJoin(phrases, and(eq(phrases.topicId, topics.id), isNull(phrases.deletedAt)))
    .leftJoin(reviewCards, eq(reviewCards.phraseId, phrases.id))
    .where(isNull(topics.deletedAt))
    .groupBy(topics.id)
    .orderBy(asc(topics.sortOrder), asc(topics.id))
    .all();
}

/** Các cụm đang hiển thị của một chủ đề, theo thứ tự biên soạn. */
export function listPhrasesByTopic(db: Db, topicId: string): Phrase[] {
  return db
    .select()
    .from(phrases)
    .where(and(eq(phrases.topicId, topicId), isNull(phrases.deletedAt)))
    .orderBy(asc(phrases.sortOrder), asc(phrases.id))
    .all();
}

export function getPhrase(db: Db, id: string): Phrase | undefined {
  return db.select().from(phrases).where(eq(phrases.id, id)).get();
}
