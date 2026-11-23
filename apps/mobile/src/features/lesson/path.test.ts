import { eq } from 'drizzle-orm';
import { phrases, topics } from '@/db/schema';
import { seedContent } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import { Rating } from '@/lib/fsrs';
import { recordReview } from '../review/repository';
import { getLessonPhrases, getPath, LESSON_SIZE } from './path';

function setup() {
  const db = createTestDb();
  const mk = (topicId: string, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${topicId}${i}`,
      topicId,
      text: `${topicId} ${i}`,
      meaningVi: `${topicId} ${i}`,
      level: 'A1' as const,
    }));
  seedContent(
    db,
    {
      contentVersion: 1,
      topics: [
        { id: 'b', title: 'B', level: 'A2', sortOrder: 2 },
        { id: 'a', title: 'A', level: 'A1', sortOrder: 1 },
      ],
      phrases: [...mk('a', LESSON_SIZE + 2), ...mk('b', 3)],
    },
    0,
  );
  return db;
}

describe('getPath', () => {
  it('chia chủ đề thành bài theo LESSON_SIZE, theo thứ tự chủ đề', () => {
    const { units, current } = getPath(setup());
    expect(units.map((u) => u.id)).toEqual(['a', 'b']);
    expect(units[0]?.lessons.map((l) => l.size)).toEqual([LESSON_SIZE, 2]);
    expect(units[1]?.lessons.map((l) => l.size)).toEqual([3]);
    expect(current).toMatchObject({ topicId: 'a', index: 0 });
  });

  it('bài xong khi mọi cụm đã có thẻ; bài hiện tại là bài chưa xong đầu tiên', () => {
    const db = setup();
    for (const p of getLessonPhrases(db, 'a', 0))
      recordReview(db, { phraseId: p.id, rating: Rating.Good, exerciseType: 'intro', now: 1 });
    const { units, current } = getPath(db);
    expect(units[0]?.lessons[0]).toMatchObject({ done: true, learned: LESSON_SIZE });
    expect(units[0]?.learned).toBe(LESSON_SIZE);
    expect(current).toMatchObject({ topicId: 'a', index: 1 });
  });

  it('bỏ cụm và chủ đề đã gỡ; xong hết thì current = null', () => {
    const db = setup();
    db.update(topics).set({ deletedAt: 1 }).where(eq(topics.id, 'b')).run();
    db.update(phrases).set({ deletedAt: 1 }).where(eq(phrases.id, 'a6')).run();
    const { units } = getPath(db);
    expect(units.map((u) => u.id)).toEqual(['a']);
    expect(units[0]?.phraseCount).toBe(LESSON_SIZE + 1);
    for (const l of [0, 1])
      for (const p of getLessonPhrases(db, 'a', l))
        recordReview(db, { phraseId: p.id, rating: Rating.Good, exerciseType: 'intro', now: 1 });
    expect(getPath(db).current).toBeNull();
  });
});

describe('getLessonPhrases', () => {
  it('lấy đúng đoạn cụm của bài', () => {
    const db = setup();
    expect(getLessonPhrases(db, 'a', 1).map((p) => p.id)).toEqual(['a5', 'a6']);
    expect(getLessonPhrases(db, 'a', 9)).toEqual([]);
  });
});
