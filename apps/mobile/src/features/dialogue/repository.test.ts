import { dialogueToPhrases } from '@app/content';
import type { DialogueContent } from '@app/shared';
import { eq } from 'drizzle-orm';
import { dialogues as dialoguesTable } from '@/db/schema';
import { seedContent } from '@/db/seed';
import { createTestDb } from '@/db/test-db';
import { Rating } from '@/lib/fsrs';
import { recordReview } from '../review/repository';
import {
  blankDistractors,
  contextBefore,
  getDialogue,
  listSections,
  nextDialogue,
  replyDistractors,
} from './repository';

const sp = { a: { name: 'Tom', roleVi: 'Đồng nghiệp' }, b: { name: 'Lan', roleVi: 'Bạn' } };
const dlg = (id: string, topicId: string, n = 4): DialogueContent => ({
  id,
  topicId,
  title: `Hội thoại ${id}`,
  level: 'A1',
  situationVi: `Tình huống ${id}`,
  speakers: sp,
  lines: Array.from({ length: n }, (_, i) => ({
    speaker: i % 2 === 0 ? ('a' as const) : ('b' as const),
    text: `${id} line ${i} key${i}`,
    meaningVi: `${id} nghĩa ${i}`,
    ...(i === n - 1 ? {} : { blank: `${id} line ${i}` }),
  })),
});

function setup() {
  const db = createTestDb();
  const ds = [dlg('d1', 't1'), dlg('d2', 't1'), dlg('d3', 't2')];
  seedContent(
    db,
    {
      contentVersion: 1,
      topics: [
        { id: 't2', title: 'T2', level: 'A2', sortOrder: 2 },
        { id: 't1', title: 'T1', level: 'A1', sortOrder: 1 },
      ],
      dialogues: ds,
      phrases: ds.flatMap(dialogueToPhrases),
    },
    0,
  );
  return db;
}

describe('listSections / nextDialogue', () => {
  it('nhóm theo chủ đề, đếm câu then chốt; xong khi mọi câu then chốt có thẻ', () => {
    const db = setup();
    let sections = listSections(db);
    expect(sections.map((s) => s.id)).toEqual(['t1', 't2']);
    expect(sections[0]?.dialogues.map((d) => [d.id, d.keyLines, d.learned])).toEqual([
      ['d1', 3, 0],
      ['d2', 3, 0],
    ]);
    expect(sections[0]?.dialogues[0]?.speakers.b.name).toBe('Lan');
    expect(nextDialogue(sections)?.id).toBe('d1');

    for (const i of [0, 1, 2])
      recordReview(db, {
        phraseId: `d1-l${i}`,
        rating: Rating.Good,
        exerciseType: 'fill_blank',
        now: 1,
      });
    sections = listSections(db);
    expect(sections[0]?.dialogues[0]).toMatchObject({ learned: 3, done: true });
    expect(nextDialogue(sections)?.id).toBe('d2');
  });

  it('bỏ hội thoại đã gỡ khỏi gói', () => {
    const db = setup();
    db.update(dialoguesTable).set({ deletedAt: 1 }).where(eq(dialoguesTable.id, 'd2')).run();
    expect(listSections(db)[0]?.dialogues.map((d) => d.id)).toEqual(['d1']);
  });
});

describe('getDialogue / contextBefore', () => {
  it('trả các câu theo thứ tự, kèm người nói và cụm then chốt', () => {
    const d = getDialogue(setup(), 'd1');
    expect(d?.lines.map((l) => [l.lineNo, l.speaker, l.blank])).toEqual([
      [0, 'a', 'd1 line 0'],
      [1, 'b', 'd1 line 1'],
      [2, 'a', 'd1 line 2'],
      [3, 'b', null],
    ]);
    expect(contextBefore(d?.lines ?? [], 3, 2).map((l) => l.lineNo)).toEqual([1, 2]);
    expect(getDialogue(setup(), 'nope')).toBeNull();
  });
});

describe('đáp án nhiễu', () => {
  it('cụm nhiễu: khác đáp án, không trùng nhau, ưu tiên cùng chủ đề', () => {
    const db = setup();
    const line = getDialogue(db, 'd1')?.lines[0];
    if (!line) throw new Error('missing');
    const out = blankDistractors(db, line, 3, () => 0.5);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    expect(out).not.toContain('d1 line 0');
    expect(out.filter((b) => b.startsWith('d2')).length).toBe(3);
  });

  it('câu đáp nhiễu lấy từ hội thoại khác', () => {
    const db = setup();
    const line = getDialogue(db, 'd1')?.lines[1];
    if (!line) throw new Error('missing');
    const out = replyDistractors(db, line, 2, () => 0.5);
    expect(out).toHaveLength(2);
    expect(out.every((p) => p.dialogueId !== 'd1')).toBe(true);
    expect(out.every((p) => p.topicId === 't1')).toBe(true);
  });
});
