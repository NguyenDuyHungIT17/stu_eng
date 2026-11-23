import { eq } from 'drizzle-orm';
import { dailyActivity, phrases } from '@/db/schema';
import { seedContent } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import { Rating } from '@/lib/fsrs';
import { recordReview } from '../review/repository';
import { getStats } from './stats';
import { addStudySeconds } from './streak';

const at = (d: number, h = 10) => new Date(2026, 10, d, h).getTime();

function setup() {
  const db = createTestDb();
  seedContent(
    db,
    {
      contentVersion: 1,
      topics: [{ id: 't', title: 'T', level: 'A1', sortOrder: 1 }],
      phrases: ['a', 'b', 'c'].map((id) => ({
        id,
        topicId: 't',
        text: id,
        meaningVi: id,
        level: 'A1' as const,
      })),
    },
    0,
  );
  return db;
}

describe('getStats (S2-10)', () => {
  it('chưa học gì: toàn 0', () => {
    expect(getStats(setup(), at(23))).toEqual({
      streak: { current: 0, todayDone: false },
      mastered: 0,
      started: 0,
      totalMinutes: 0,
      todayMinutes: 0,
      chatSessions: 0,
    });
  });

  it('đếm cụm đã bắt đầu / đã thuộc, phút học, buổi nói, streak', () => {
    const db = setup();
    // a: Dễ → vào thẳng Review (đã thuộc). b: Quên → còn đang học.
    recordReview(db, { phraseId: 'a', rating: Rating.Easy, exerciseType: 'flip', now: at(22) });
    recordReview(db, { phraseId: 'b', rating: Rating.Again, exerciseType: 'flip', now: at(23) });
    addStudySeconds(db, 150, at(22));
    addStudySeconds(db, 200, at(23));
    db.update(dailyActivity)
      .set({ chatSessions: 2 })
      .where(eq(dailyActivity.day, '2026-11-23'))
      .run();

    const s = getStats(db, at(23, 20));
    expect(s).toMatchObject({
      started: 2,
      mastered: 1,
      totalMinutes: 5,
      todayMinutes: 3,
      chatSessions: 2,
      streak: { current: 2, todayDone: true },
    });
  });

  it('cụm bị gỡ khỏi gói không tính', () => {
    const db = setup();
    recordReview(db, { phraseId: 'a', rating: Rating.Easy, exerciseType: 'flip', now: at(22) });
    db.update(phrases).set({ deletedAt: 1 }).where(eq(phrases.id, 'a')).run();
    expect(getStats(db, at(23))).toMatchObject({ started: 0, mastered: 0 });
  });
});
