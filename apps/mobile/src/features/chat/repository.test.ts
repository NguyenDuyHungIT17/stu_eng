import { eq } from 'drizzle-orm';
import { dailyActivity } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import {
  addMessage,
  countFinishedByScenario,
  finishSession,
  getFeedback,
  getOpenSession,
  listMessages,
  MAX_SENT_MESSAGES,
  saveExplanation,
  saveMessageToNotes,
  startSession,
  toApiMessages,
} from './repository';

const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m).getTime();
const fb = { summary: 'Tốt', mistakes: [], usefulPhrases: ['Could I…?'] };

describe('chat repository', () => {
  it('bắt đầu buổi với câu mở đầu của AI; tìm lại buổi đang dở', () => {
    const db = createTestDb();
    const s = startSession(db, { scenarioId: 'sc', level: 'A2', opener: 'Hello!' }, at(9));
    expect(listMessages(db, s.id)).toMatchObject([{ role: 'assistant', content: 'Hello!' }]);
    expect(getOpenSession(db, 'sc')?.id).toBe(s.id);
    expect(getOpenSession(db, 'other')).toBeUndefined();
  });

  it('thêm lượt theo thứ tự; lịch sử gửi API cắt còn các lượt gần nhất', () => {
    const db = createTestDb();
    const s = startSession(db, { scenarioId: 'sc', level: 'A2', opener: 'Hi' }, at(9));
    addMessage(db, s.id, 'user', '  A coffee, please. ', at(9, 1));
    addMessage(db, s.id, 'assistant', 'Sure!', at(9, 2));
    const msgs = listMessages(db, s.id);
    expect(toApiMessages(msgs)).toEqual([
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'A coffee, please.' },
      { role: 'assistant', content: 'Sure!' },
    ]);
    const first = msgs[0];
    if (!first) throw new Error('missing');
    const many = Array.from({ length: 40 }, (_, i) => ({ ...first, content: `m${i}` }));
    expect(toApiMessages(many)).toHaveLength(MAX_SENT_MESSAGES);
  });

  it('cache giải thích; lưu câu AI vào ghi chú không trùng', () => {
    const db = createTestDb();
    const s = startSession(db, { scenarioId: 'sc', level: 'A2', opener: 'Fancy a cuppa?' }, at(9));
    const [m] = listMessages(db, s.id);
    if (!m) throw new Error('missing');
    saveExplanation(db, m.id, { translation: 'Uống trà không?', notes: [] });
    const withEx = listMessages(db, s.id)[0];
    expect(withEx?.explanation?.translation).toBe('Uống trà không?');
    if (!withEx) throw new Error('missing');
    const n1 = saveMessageToNotes(db, withEx, at(10));
    const n2 = saveMessageToNotes(db, withEx, at(11));
    expect(n1.id).toBe(n2.id);
    expect(n1).toMatchObject({ source: 'chat', body: 'Fancy a cuppa?\nUống trà không?' });
  });

  it('kết thúc buổi: lưu tổng kết, cộng chatSessions một lần', () => {
    const db = createTestDb();
    const s = startSession(db, { scenarioId: 'sc', level: 'A2', opener: 'Hi' }, at(9));
    finishSession(db, s.id, fb, at(10));
    finishSession(db, s.id, fb, at(10, 5));
    const row = db.select().from(dailyActivity).where(eq(dailyActivity.day, '2026-11-25')).get();
    expect(row?.chatSessions).toBe(1);
    expect(getOpenSession(db, 'sc')).toBeUndefined();
    expect(countFinishedByScenario(db)).toEqual({ sc: 1 });
  });

  it('getFeedback bỏ qua JSON hỏng', () => {
    expect(getFeedback({ feedbackJson: '{bad' } as never)).toBeNull();
    expect(getFeedback({ feedbackJson: JSON.stringify(fb) } as never)).toEqual(fb);
  });
});
