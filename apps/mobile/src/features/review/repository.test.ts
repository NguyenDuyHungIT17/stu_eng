import type { PhraseContent, TopicContent } from '@app/shared';
import { eq } from 'drizzle-orm';
import { dailyActivity, phrases, reviewCards, reviewLogs } from '@/db/schema';
import { seedContent } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import { Rating } from '@/lib/fsrs';
import {
  countDueToday,
  countNewToday,
  getDueCards,
  getNewPhrases,
  levelsUpTo,
  newRemainingToday,
  pickDistractors,
  recordReview,
  shuffle,
} from './repository';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const day1 = new Date(2026, 10, 23, 9, 0).getTime();

const T: TopicContent[] = [
  { id: 'meet', title: 'Gặp gỡ', level: 'A1', sortOrder: 1 },
  { id: 'food', title: 'Ăn uống', level: 'A2', sortOrder: 2 },
  { id: 'work', title: 'Công việc', level: 'B1', sortOrder: 3 },
];
const ph = (
  id: string,
  topicId: string,
  level: PhraseContent['level'],
  meaningVi = `nghĩa ${id}`,
) => ({ id, topicId, text: `text ${id}`, meaningVi, level }) satisfies PhraseContent;
const P: PhraseContent[] = [
  ph('m1', 'meet', 'A1'),
  ph('m2', 'meet', 'A1'),
  ph('m3', 'meet', 'A1'),
  ph('m4', 'meet', 'A1'),
  ph('f1', 'food', 'A2'),
  ph('f2', 'food', 'A2'),
  ph('w1', 'work', 'B1'),
];

function setup(phraseList = P) {
  const db = createTestDb();
  seedContent(db, { contentVersion: 1, topics: T, phrases: phraseList }, 0);
  return db;
}
const learn = (
  db: ReturnType<typeof setup>,
  id: string,
  now: number,
  rating: Rating = Rating.Good,
) => recordReview(db, { phraseId: id, rating, exerciseType: 'flip', now });

describe('levelsUpTo', () => {
  it('từ A1 đến trình độ hiện tại', () => {
    expect(levelsUpTo('A1')).toEqual(['A1']);
    expect(levelsUpTo('B1')).toEqual(['A1', 'A2', 'B1']);
  });
});

describe('recordReview (S1-08)', () => {
  it('thẻ mới: tạo review_cards, review_logs, daily_activity trong một lần', () => {
    const db = setup();
    const card = learn(db, 'm1', day1);
    const rc = db.select().from(reviewCards).where(eq(reviewCards.phraseId, 'm1')).get();
    expect(rc).toMatchObject({ due: card.due, createdAt: day1, updatedAt: day1 });
    expect(db.select().from(reviewLogs).all()).toEqual([
      expect.objectContaining({
        phraseId: 'm1',
        rating: 3,
        exerciseType: 'flip',
        reviewedAt: day1,
      }),
    ]);
    expect(db.select().from(dailyActivity).all()).toEqual([
      expect.objectContaining({ newCards: 1, reviews: 1 }),
    ]);
  });

  it('ôn lại thẻ cũ: cập nhật thẻ, giữ createdAt, chỉ tăng reviews', () => {
    const db = setup();
    const first = learn(db, 'm1', day1);
    learn(db, 'm1', first.due);
    const rc = db.select().from(reviewCards).where(eq(reviewCards.phraseId, 'm1')).get();
    expect(rc?.createdAt).toBe(day1);
    expect(rc?.updatedAt).toBe(first.due);
    expect(db.select().from(reviewLogs).all()).toHaveLength(2);
    expect(db.select().from(dailyActivity).get()).toMatchObject({ newCards: 1, reviews: 2 });
  });

  it('lỗi giữa chừng thì không ghi gì (transaction)', () => {
    const db = setup();
    db.insert(reviewCards)
      .values({ phraseId: 'm1', due: 0, fsrsState: 'không phải json', createdAt: 0, updatedAt: 0 })
      .run();
    expect(() => learn(db, 'm1', day1)).toThrow();
    expect(db.select().from(reviewLogs).all()).toHaveLength(0);
    expect(db.select().from(dailyActivity).all()).toHaveLength(0);
  });
});

describe('thẻ đến hạn (S1-07, FR-V-03)', () => {
  it('thẻ vừa ôn không xuất hiện lại trước hạn', () => {
    const db = setup();
    const card = learn(db, 'm1', day1, Rating.Easy);
    expect(getDueCards(db, day1 + MIN)).toHaveLength(0);
    expect(getDueCards(db, card.due - 1)).toHaveLength(0);
    expect(getDueCards(db, card.due).map((c) => c.phrase.id)).toEqual(['m1']);
  });

  it('sắp theo due, bỏ cụm đã gỡ khỏi gói', () => {
    const db = setup();
    learn(db, 'm1', day1, Rating.Easy);
    learn(db, 'm2', day1, Rating.Again);
    learn(db, 'f1', day1, Rating.Good);
    const later = day1 + 60 * DAY;
    expect(getDueCards(db, later).map((c) => c.phrase.id)).toEqual(['m2', 'f1', 'm1']);

    seedContent(
      db,
      { contentVersion: 2, topics: T, phrases: P.filter((p) => p.id !== 'f1') },
      day1,
    );
    expect(getDueCards(db, later).map((c) => c.phrase.id)).toEqual(['m2', 'm1']);
  });

  it('countDueToday tính cả thẻ đến hạn muộn hơn trong ngày, không tính ngày mai', () => {
    const db = setup();
    learn(db, 'm1', day1, Rating.Again); // ôn lại sau vài phút → hôm nay
    learn(db, 'm2', day1, Rating.Easy); // vài ngày sau
    expect(countDueToday(db, day1)).toBe(1);
  });
});

describe('thẻ mới trong ngày (S1-07, FR-V-05)', () => {
  it('chọn theo trình độ, thứ tự chủ đề rồi thứ tự biên soạn', () => {
    const db = setup();
    expect(getNewPhrases(db, day1, { dailyNewLimit: 10, level: 'A1' }).map((p) => p.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ]);
    expect(getNewPhrases(db, day1, { dailyNewLimit: 10, level: 'B1' }).map((p) => p.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
      'f1',
      'f2',
      'w1',
    ]);
  });

  it('không vượt mục tiêu ngày; học rồi thì không lặp lại; sang ngày mới thì có lượt mới', () => {
    const db = setup();
    const opts = { dailyNewLimit: 3, level: 'B1' } as const;
    expect(getNewPhrases(db, day1, opts)).toHaveLength(3);

    learn(db, 'm1', day1);
    learn(db, 'm2', day1 + MIN);
    expect(countNewToday(db, day1 + 2 * MIN)).toBe(2);
    expect(newRemainingToday(db, day1 + 2 * MIN, 3)).toBe(1);
    expect(getNewPhrases(db, day1 + 2 * MIN, opts).map((p) => p.id)).toEqual(['m3']);

    learn(db, 'm3', day1 + 3 * MIN);
    expect(getNewPhrases(db, day1 + 4 * MIN, opts)).toEqual([]);
    expect(newRemainingToday(db, day1, 2)).toBe(0); // giảm mục tiêu: không âm

    const day2 = new Date(2026, 10, 24, 8, 0).getTime();
    expect(getNewPhrases(db, day2, opts).map((p) => p.id)).toEqual(['m4', 'f1', 'f2']);
  });
});

describe('pickDistractors (S1-09)', () => {
  it('ưu tiên cùng chủ đề, không có chính nó', () => {
    const db = setup();
    const d = pickDistractors(db, 'm1', 3);
    expect(d.map((p) => p.id).sort()).toEqual(['m2', 'm3', 'm4']);
  });

  it('thiếu thì lấy chủ đề khác', () => {
    const db = setup();
    const d = pickDistractors(db, 'f1', 3);
    expect(d[0]?.id).toBe('f2');
    expect(d).toHaveLength(3);
    expect(d.map((p) => p.id)).not.toContain('f1');
  });

  it('bỏ cụm trùng nghĩa để không có hai đáp án đúng; bỏ cụm đã gỡ', () => {
    const db = setup([
      ph('a', 'meet', 'A1', 'Xin chào'),
      ph('b', 'meet', 'A1', 'xin chào '),
      ph('c', 'meet', 'A1', 'Tạm biệt'),
      ph('d', 'meet', 'A1', 'Cảm ơn'),
    ]);
    db.update(phrases).set({ deletedAt: 1 }).where(eq(phrases.id, 'd')).run();
    expect(pickDistractors(db, 'a', 3).map((p) => p.id)).toEqual(['c']);
  });

  it('cụm không tồn tại → mảng rỗng', () => {
    expect(pickDistractors(setup(), 'nope')).toEqual([]);
  });
});

describe('shuffle', () => {
  it('giữ đủ phần tử, không sửa mảng gốc', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, () => 0.3);
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});
