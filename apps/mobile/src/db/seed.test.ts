import type { PhraseContent, TopicContent } from '@app/shared';
import { eq } from 'drizzle-orm';
import { phrases, reviewCards, topics } from './schema';
import { type ContentBundle, seedContent } from './seed';
import { getSetting } from './settings';
import { createTestDb } from './test-db';

const T: TopicContent[] = [
  { id: 'greetings', title: 'Chào hỏi', level: 'A1', sortOrder: 1 },
  { id: 'food', title: 'Ăn uống', level: 'A2', sortOrder: 2 },
];
const P: PhraseContent[] = [
  { id: 'hello', topicId: 'greetings', text: 'Hello', meaningVi: 'Xin chào', level: 'A1' },
  { id: 'bye', topicId: 'greetings', text: 'Bye', meaningVi: 'Tạm biệt', level: 'A1' },
  { id: 'menu', topicId: 'food', text: 'Menu, please', meaningVi: 'Cho xem thực đơn', level: 'A2' },
];
const bundle = (v: number, t = T, p = P): ContentBundle => ({
  contentVersion: v,
  topics: t,
  phrases: p,
});
const now = 1_000_000;

describe('seedContent', () => {
  it('lần đầu: nạp đủ chủ đề, cụm từ (giữ thứ tự gói) và ghi content_version', () => {
    const db = createTestDb();
    expect(seedContent(db, bundle(1), now)).toBe(true);
    expect(db.select().from(topics).all()).toHaveLength(2);
    const rows = db.select().from(phrases).orderBy(phrases.sortOrder).all();
    expect(rows.map((r) => r.id)).toEqual(['hello', 'bye', 'menu']);
    expect(rows[0]).toMatchObject({
      meaningVi: 'Xin chào',
      isCustom: false,
      deletedAt: null,
      ipa: null,
    });
    expect(getSetting(db, 'content_version')).toBe('1');
  });

  it('cùng phiên bản: bỏ qua', () => {
    const db = createTestDb();
    seedContent(db, bundle(1), now);
    expect(seedContent(db, bundle(1, T, [P[0] as PhraseContent]), now)).toBe(false);
    expect(db.select().from(phrases).all()).toHaveLength(3);
  });

  it('phiên bản mới: cập nhật nội dung, ẩn cụm bị gỡ, không chạm review_cards và cụm tự thêm', () => {
    const db = createTestDb();
    seedContent(db, bundle(1), now);
    db.insert(reviewCards)
      .values({ phraseId: 'bye', due: 5, fsrsState: '{}', createdAt: 1, updatedAt: 1 })
      .run();
    db.insert(phrases)
      .values({
        id: 'my-own',
        topicId: 'food',
        text: 'x',
        meaningVi: 'y',
        level: 'A1',
        isCustom: true,
      })
      .run();

    const p2 = [{ ...(P[0] as PhraseContent), meaningVi: 'Chào' }, P[2] as PhraseContent];
    expect(seedContent(db, bundle(2, [T[0] as TopicContent], p2), now)).toBe(true);

    const get = (id: string) => db.select().from(phrases).where(eq(phrases.id, id)).get();
    expect(get('hello')?.meaningVi).toBe('Chào');
    expect(get('bye')?.deletedAt).toBe(now);
    expect(get('menu')?.deletedAt).toBeNull();
    expect(get('my-own')?.deletedAt).toBeNull();
    expect(db.select().from(topics).where(eq(topics.id, 'food')).get()?.deletedAt).toBe(now);
    expect(db.select().from(reviewCards).all()).toHaveLength(1);
    expect(getSetting(db, 'content_version')).toBe('2');
  });

  it('cụm từng bị gỡ rồi quay lại gói thì hiện lại', () => {
    const db = createTestDb();
    seedContent(db, bundle(1), now);
    seedContent(db, bundle(2, T, [P[0] as PhraseContent]), now);
    seedContent(db, bundle(3), now);
    const bye = db.select().from(phrases).where(eq(phrases.id, 'bye')).get();
    expect(bye?.deletedAt).toBeNull();
  });

  it('lỗi giữa chừng thì không ghi gì (transaction)', () => {
    const db = createTestDb();
    const bad = bundle(1, T, [
      ...P,
      { ...(P[0] as PhraseContent), text: null as unknown as string },
    ]);
    expect(() => seedContent(db, bad, now)).toThrow();
    expect(db.select().from(phrases).all()).toHaveLength(0);
    expect(getSetting(db, 'content_version')).toBeNull();
  });
});
