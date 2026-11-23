import { sql } from 'drizzle-orm';
import { createTestDb } from './test-db';

describe('migration', () => {
  it('tạo đủ các bảng của MVP', () => {
    const db = createTestDb();
    const rows = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
    );
    const tables = rows
      .map((r) => r.name)
      .filter((n) => !n.startsWith('__') && !n.startsWith('sqlite_'));
    expect(tables).toEqual([
      'chat_messages',
      'chat_sessions',
      'daily_activity',
      'dialogues',
      'notes',
      'phrases',
      'review_cards',
      'review_logs',
      'settings',
      'topics',
    ]);
  });
});
