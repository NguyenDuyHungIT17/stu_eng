import { reviewCards } from '@/db/schema';
import { seedContent } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import { listPhrasesByTopic, listTopics } from './repository';

function setup() {
  const db = createTestDb();
  seedContent(
    db,
    {
      contentVersion: 1,
      topics: [
        { id: 'b-topic', title: 'B', level: 'A2', sortOrder: 2 },
        { id: 'a-topic', title: 'A', level: 'A1', sortOrder: 1 },
        { id: 'empty', title: 'Rỗng', level: 'A1', sortOrder: 3 },
      ],
      phrases: [
        { id: 'p1', topicId: 'a-topic', text: 'one', meaningVi: 'một', level: 'A1' },
        { id: 'p2', topicId: 'a-topic', text: 'two', meaningVi: 'hai', level: 'A1' },
        { id: 'p3', topicId: 'b-topic', text: 'three', meaningVi: 'ba', level: 'A2' },
      ],
    },
    0,
  );
  return db;
}

describe('vocab repository', () => {
  it('listTopics: theo sortOrder, có số cụm và số đã học', () => {
    const db = setup();
    db.insert(reviewCards)
      .values({ phraseId: 'p1', due: 0, fsrsState: '{}', createdAt: 0, updatedAt: 0 })
      .run();
    const t = listTopics(db);
    expect(t.map((x) => [x.id, x.phraseCount, x.learnedCount])).toEqual([
      ['a-topic', 2, 1],
      ['b-topic', 1, 0],
      ['empty', 0, 0],
    ]);
  });

  it('listPhrasesByTopic: theo thứ tự gói, bỏ cụm đã gỡ', () => {
    const db = setup();
    expect(listPhrasesByTopic(db, 'a-topic').map((p) => p.id)).toEqual(['p1', 'p2']);
    seedContent(
      db,
      {
        contentVersion: 2,
        topics: [{ id: 'a-topic', title: 'A', level: 'A1', sortOrder: 1 }],
        phrases: [{ id: 'p2', topicId: 'a-topic', text: 'two', meaningVi: 'hai', level: 'A1' }],
      },
      1,
    );
    expect(listPhrasesByTopic(db, 'a-topic').map((p) => p.id)).toEqual(['p2']);
    expect(listTopics(db).map((x) => x.id)).toEqual(['a-topic']);
  });
});
