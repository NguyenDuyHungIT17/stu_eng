import { and, asc, eq, isNull } from 'drizzle-orm';
import { phrases, reviewCards, topics } from '@/db/schema';
import type { Db } from '@/db/types';
import type { Phrase } from '../review/repository';

/**
 * Lộ trình học: mỗi chủ đề là một chặng, chia thành các bài LESSON_SIZE cụm theo thứ tự
 * biên soạn. Bài "xong" khi mọi cụm trong bài đã có thẻ ôn.
 */

export const LESSON_SIZE = 5;

export type LessonNode = {
  topicId: string;
  index: number;
  size: number;
  learned: number;
  done: boolean;
};

export type Unit = {
  id: string;
  title: string;
  level: string;
  phraseCount: number;
  learned: number;
  lessons: LessonNode[];
};

export type Path = { units: Unit[]; current: LessonNode | null };

export function getPath(db: Db): Path {
  const rows = db
    .select({
      topicId: topics.id,
      title: topics.title,
      level: topics.level,
      phraseId: phrases.id,
      learned: reviewCards.phraseId,
    })
    .from(topics)
    .innerJoin(phrases, and(eq(phrases.topicId, topics.id), isNull(phrases.deletedAt)))
    .leftJoin(reviewCards, eq(reviewCards.phraseId, phrases.id))
    .where(isNull(topics.deletedAt))
    .orderBy(asc(topics.sortOrder), asc(topics.id), asc(phrases.sortOrder), asc(phrases.id))
    .all();

  const units: Unit[] = [];
  for (const r of rows) {
    let u = units[units.length - 1];
    if (!u || u.id !== r.topicId) {
      u = {
        id: r.topicId,
        title: r.title,
        level: r.level,
        phraseCount: 0,
        learned: 0,
        lessons: [],
      };
      units.push(u);
    }
    const index = Math.floor(u.phraseCount / LESSON_SIZE);
    let lesson = u.lessons[index];
    if (!lesson) {
      lesson = { topicId: u.id, index, size: 0, learned: 0, done: false };
      u.lessons.push(lesson);
    }
    lesson.size++;
    u.phraseCount++;
    if (r.learned) {
      lesson.learned++;
      u.learned++;
    }
  }
  for (const u of units) for (const l of u.lessons) l.done = l.learned === l.size;

  const current = units.flatMap((u) => u.lessons).find((l) => !l.done) ?? null;
  return { units, current };
}

/** Các cụm của bài thứ `index` trong chủ đề. */
export function getLessonPhrases(db: Db, topicId: string, index: number): Phrase[] {
  return db
    .select()
    .from(phrases)
    .where(and(eq(phrases.topicId, topicId), isNull(phrases.deletedAt)))
    .orderBy(asc(phrases.sortOrder), asc(phrases.id))
    .limit(LESSON_SIZE)
    .offset(index * LESSON_SIZE)
    .all();
}
