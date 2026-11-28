import { resetAllData } from './reset';
import {
  chatMessages,
  chatSessions,
  dailyActivity,
  notes,
  phrases,
  reviewCards,
  reviewLogs,
} from './schema';
import { seedContent } from './seed';
import { hasOnboardingDone, hasPrivacyAck, setOnboardingDone, setPrivacyAck } from './settings';
import { createTestDb } from './test-db';

describe('resetAllData', () => {
  it('xóa sạch tiến độ, ghi chú, hội thoại AI, cài đặt và giữ nội dung đóng gói', () => {
    const db = createTestDb();
    seedContent(
      db,
      {
        contentVersion: 1,
        topics: [{ id: 't1', title: 'Chào', level: 'A1', sortOrder: 1 }],
        phrases: [{ id: 'p1', topicId: 't1', text: 'Hi', meaningVi: 'Chào', level: 'A1' }],
      },
      100,
    );
    db.insert(phrases)
      .values({
        id: 'custom-1',
        topicId: 't1',
        text: 'Yo',
        meaningVi: 'Chào',
        level: 'A1',
        isCustom: true,
      })
      .run();
    db.insert(reviewCards)
      .values({ phraseId: 'p1', due: 200, fsrsState: '{}', createdAt: 100, updatedAt: 100 })
      .run();
    db.insert(reviewLogs)
      .values({ id: 'l1', phraseId: 'p1', rating: 3, exerciseType: 'flip', reviewedAt: 100 })
      .run();
    db.insert(notes)
      .values({ id: 'n1', body: 'Note', searchText: 'note', createdAt: 100, updatedAt: 100 })
      .run();
    db.insert(chatSessions)
      .values({ id: 's1', scenarioId: 'meet-colleague', level: 'A1', startedAt: 100 })
      .run();
    db.insert(chatMessages)
      .values({ id: 'm1', sessionId: 's1', role: 'user', content: 'Hi', createdAt: 100 })
      .run();
    db.insert(dailyActivity).values({ day: '2026-11-28', reviews: 1 }).run();
    setOnboardingDone(db);
    setPrivacyAck(db);

    resetAllData(db);

    expect(db.select().from(reviewCards).all()).toHaveLength(0);
    expect(db.select().from(reviewLogs).all()).toHaveLength(0);
    expect(db.select().from(notes).all()).toHaveLength(0);
    expect(db.select().from(chatSessions).all()).toHaveLength(0);
    expect(db.select().from(chatMessages).all()).toHaveLength(0);
    expect(db.select().from(dailyActivity).all()).toHaveLength(0);
    expect(hasOnboardingDone(db)).toBe(false);
    expect(hasPrivacyAck(db)).toBe(false);
    // Chỉ còn câu đóng gói, câu custom bị xóa.
    expect(
      db
        .select()
        .from(phrases)
        .all()
        .map((p) => p.id),
    ).toEqual(['p1']);
  });
});
