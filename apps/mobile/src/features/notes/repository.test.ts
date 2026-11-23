import { createTestDb } from '@/db/test-db';
import {
  cleanTags,
  createNote,
  deleteNote,
  findNoteBySource,
  getNote,
  listNotes,
  listTags,
  updateNote,
} from './repository';

const ids = (xs: { body: string }[]) => xs.map((n) => n.body);

describe('cleanTags', () => {
  it('bỏ #, khoảng trắng, trùng (không phân biệt hoa thường)', () => {
    expect(cleanTags([' #Travel ', 'travel', '', 'work  life', '##work life'])).toEqual([
      'Travel',
      'work life',
    ]);
  });
});

describe('notes repository (S2-01)', () => {
  it('tạo, đọc, sửa, xóa', () => {
    const db = createTestDb();
    const n = createNote(db, { body: '  Hello there  ', tags: ['#greet'] }, 100);
    expect(n).toMatchObject({
      body: 'Hello there',
      tags: ['greet'],
      pinned: false,
      source: 'manual',
    });
    expect(getNote(db, n.id)).toEqual(n);

    const u = updateNote(db, n.id, { body: 'Hi', pinned: true }, 200);
    expect(u).toMatchObject({
      body: 'Hi',
      tags: ['greet'],
      pinned: true,
      updatedAt: 200,
      createdAt: 100,
    });

    deleteNote(db, n.id);
    expect(getNote(db, n.id)).toBeUndefined();
    expect(updateNote(db, n.id, { body: 'x' }, 300)).toBeUndefined();
  });

  it('không cho nội dung rỗng', () => {
    const db = createTestDb();
    expect(() => createNote(db, { body: '   ' }, 1)).toThrow();
    const n = createNote(db, { body: 'a' }, 1);
    expect(() => updateNote(db, n.id, { body: ' ' }, 2)).toThrow();
  });

  it('ghim lên đầu, rồi mới sửa gần nhất (FR-N-04)', () => {
    const db = createTestDb();
    const a = createNote(db, { body: 'A' }, 1);
    createNote(db, { body: 'B' }, 2);
    createNote(db, { body: 'C' }, 3);
    updateNote(db, a.id, { pinned: true }, 4);
    expect(ids(listNotes(db))).toEqual(['A', 'C', 'B']);
  });

  it('lưu nguồn và tìm lại theo nguồn (FR-N-05)', () => {
    const db = createTestDb();
    createNote(db, { body: 'Nice to meet you', source: 'vocab', sourceRef: 'nice-to-meet-you' }, 1);
    expect(findNoteBySource(db, 'vocab', 'nice-to-meet-you')?.body).toBe('Nice to meet you');
    expect(findNoteBySource(db, 'chat', 'nice-to-meet-you')).toBeUndefined();
  });
});

describe('tìm kiếm và lọc tag (S2-02, FR-N-02, FR-N-03)', () => {
  function setup() {
    const db = createTestDb();
    createNote(db, { body: 'Chào buổi sáng = Good morning', tags: ['Greetings'] }, 1);
    createNote(db, { body: 'Đi đường cẩn thận', tags: ['travel', 'greetings'] }, 2);
    createNote(db, { body: 'Could I get the bill?', tags: ['restaurant'] }, 3);
    createNote(db, { body: '100% sure, use_case' }, 4);
    return db;
  }

  it('không phân biệt hoa thường và dấu tiếng Việt', () => {
    const db = setup();
    expect(ids(listNotes(db, { query: 'chao' }))).toEqual(['Chào buổi sáng = Good morning']);
    expect(ids(listNotes(db, { query: 'DUONG' }))).toEqual(['Đi đường cẩn thận']);
    expect(ids(listNotes(db, { query: 'đi' }))).toEqual(['Đi đường cẩn thận']);
    expect(ids(listNotes(db, { query: 'BILL' }))).toEqual(['Could I get the bill?']);
  });

  it('nhiều từ: phải có đủ tất cả; tìm cả trong tag', () => {
    const db = setup();
    expect(ids(listNotes(db, { query: 'good sang' }))).toEqual(['Chào buổi sáng = Good morning']);
    expect(listNotes(db, { query: 'good bill' })).toEqual([]);
    expect(ids(listNotes(db, { query: 'restaurant' }))).toEqual(['Could I get the bill?']);
  });

  it('% và _ được tìm như chữ thường, không phải ký tự đại diện', () => {
    const db = setup();
    expect(ids(listNotes(db, { query: '%' }))).toEqual(['100% sure, use_case']);
    expect(ids(listNotes(db, { query: 'e_c' }))).toEqual(['100% sure, use_case']);
    expect(listNotes(db, { query: 'u_e' })).toEqual([]);
  });

  it('lọc theo tag không phân biệt hoa thường, kết hợp được với từ khóa', () => {
    const db = setup();
    expect(ids(listNotes(db, { tag: 'greetings' }))).toEqual([
      'Đi đường cẩn thận',
      'Chào buổi sáng = Good morning',
    ]);
    expect(ids(listNotes(db, { tag: 'GREETINGS', query: 'sang' }))).toEqual([
      'Chào buổi sáng = Good morning',
    ]);
  });

  it('listTags đếm theo tag, gộp hoa thường', () => {
    const db = setup();
    expect(listTags(db)).toEqual([
      { tag: expect.stringMatching(/^greetings$/i), count: 2 },
      { tag: 'restaurant', count: 1 },
      { tag: 'travel', count: 1 },
    ]);
  });

  it('sửa nội dung thì cập nhật chỉ mục tìm kiếm', () => {
    const db = setup();
    const n = listNotes(db, { query: 'bill' })[0];
    updateNote(db, n?.id ?? '', { body: 'Check, please' }, 10);
    expect(listNotes(db, { query: 'bill' })).toEqual([]);
    expect(listNotes(db, { query: 'check' })).toHaveLength(1);
  });
});

describe('hiệu năng (S2-07, BRD §4.2)', () => {
  it('1.000 ghi chú: tìm kiếm dưới 1 giây', () => {
    const db = createTestDb();
    for (let i = 0; i < 1000; i++) {
      createNote(
        db,
        { body: `Ghi chú số ${i}: phrase number ${i} về chủ đề ${i % 7}`, tags: [`t${i % 5}`] },
        i,
      );
    }
    const t0 = performance.now();
    const r1 = listNotes(db, { query: 'phrase 99' });
    const r2 = listNotes(db, { query: 'chu de', tag: 't3' });
    const ms = performance.now() - t0;
    expect(r1.length).toBeGreaterThan(0);
    expect(r2.length).toBe(200);
    expect(ms).toBeLessThan(1000);
  });
});
