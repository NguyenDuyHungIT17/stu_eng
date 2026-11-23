import { and, desc, eq, type SQL, sql } from 'drizzle-orm';
import { notes } from '@/db/schema';
import type { Db } from '@/db/types';
import { createId } from '@/lib/id';
import { escapeLike, normalizeSearch } from '@/lib/search-text';

/** Ghi chú (FR-N-01…05, FR-N-07: hoàn toàn offline). */

export type NoteSource = 'manual' | 'vocab' | 'chat';
export type Note = Omit<typeof notes.$inferSelect, 'tags' | 'source' | 'searchText'> & {
  tags: string[];
  source: NoteSource;
};

export type NoteInput = {
  body: string;
  tags?: string[];
  pinned?: boolean;
  source?: NoteSource;
  sourceRef?: string | null;
};

/** Tag: bỏ khoảng trắng thừa, bỏ dấu # đầu, bỏ trùng (không phân biệt hoa thường), giữ thứ tự. */
export function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

const searchTextOf = (body: string, tags: string[]) => normalizeSearch(`${body} ${tags.join(' ')}`);

function toNote(row: typeof notes.$inferSelect): Note {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    // tags hỏng: coi như không có tag, không làm hỏng cả danh sách
  }
  const { searchText: _s, ...rest } = row;
  return { ...rest, tags, source: row.source as NoteSource };
}

export function createNote(db: Db, input: NoteInput, now: number): Note {
  const body = input.body.trim();
  if (!body) throw new Error('Ghi chú không được để trống');
  const tags = cleanTags(input.tags ?? []);
  const row = db
    .insert(notes)
    .values({
      id: createId(now),
      body,
      tags: JSON.stringify(tags),
      pinned: input.pinned ?? false,
      source: input.source ?? 'manual',
      sourceRef: input.sourceRef ?? null,
      searchText: searchTextOf(body, tags),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  return toNote(row);
}

export function getNote(db: Db, id: string): Note | undefined {
  const row = db.select().from(notes).where(eq(notes.id, id)).get();
  return row ? toNote(row) : undefined;
}

/** Sửa nội dung/tag/ghim. Trả `undefined` nếu ghi chú không tồn tại. */
export function updateNote(
  db: Db,
  id: string,
  patch: { body?: string; tags?: string[]; pinned?: boolean },
  now: number,
): Note | undefined {
  const current = getNote(db, id);
  if (!current) return undefined;
  const body = patch.body === undefined ? current.body : patch.body.trim();
  if (!body) throw new Error('Ghi chú không được để trống');
  const tags = patch.tags === undefined ? current.tags : cleanTags(patch.tags);
  const row = db
    .update(notes)
    .set({
      body,
      tags: JSON.stringify(tags),
      pinned: patch.pinned ?? current.pinned,
      searchText: searchTextOf(body, tags),
      updatedAt: now,
    })
    .where(eq(notes.id, id))
    .returning()
    .get();
  return row ? toNote(row) : undefined;
}

export function deleteNote(db: Db, id: string): void {
  db.delete(notes).where(eq(notes.id, id)).run();
}

/**
 * Danh sách ghi chú: ghim lên đầu, rồi mới sửa gần nhất (FR-N-04).
 * `query`: tìm không phân biệt hoa thường/dấu, mọi từ đều phải có (FR-N-03).
 * `tag`: lọc theo tag, không phân biệt hoa thường (FR-N-02).
 */
export function listNotes(
  db: Db,
  opts: { query?: string; tag?: string; limit?: number } = {},
): Note[] {
  const conds: SQL[] = [];
  for (const word of normalizeSearch(opts.query ?? '')
    .split(' ')
    .filter(Boolean)) {
    conds.push(sql`${notes.searchText} LIKE ${`%${escapeLike(word)}%`} ESCAPE '\\'`);
  }
  if (opts.tag) {
    conds.push(
      sql`EXISTS (SELECT 1 FROM json_each(${notes.tags}) WHERE lower(json_each.value) = lower(${opts.tag}))`,
    );
  }
  return db
    .select()
    .from(notes)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(notes.pinned), desc(notes.updatedAt), desc(notes.id))
    .limit(opts.limit ?? 1000)
    .all()
    .map(toNote);
}

/** Tất cả tag đang dùng kèm số ghi chú, nhiều nhất lên trước. */
export function listTags(db: Db): { tag: string; count: number }[] {
  return db.all<{ tag: string; count: number }>(
    sql`SELECT json_each.value AS tag, count(*) AS count
        FROM ${notes}, json_each(${notes.tags})
        GROUP BY lower(json_each.value)
        ORDER BY count DESC, tag`,
  );
}

/** Ghi chú đã lưu từ một nguồn (vd. thẻ từ vựng) — để hiện "Đã lưu" và không lưu trùng. */
export function findNoteBySource(db: Db, source: NoteSource, sourceRef: string): Note | undefined {
  const row = db
    .select()
    .from(notes)
    .where(and(eq(notes.source, source), eq(notes.sourceRef, sourceRef)))
    .get();
  return row ? toNote(row) : undefined;
}

/**
 * Lưu nhanh một cụm từ vào ghi chú (FR-N-05). Dòng đầu là câu tiếng Anh (để nút "Nghe lại" đọc).
 * Đã lưu rồi thì trả ghi chú cũ, không tạo trùng.
 */
export function saveFromPhrase(
  db: Db,
  phrase: { id: string; text: string; meaningVi: string; example: string | null },
  now: number,
): Note {
  const existing = findNoteBySource(db, 'vocab', phrase.id);
  if (existing) return existing;
  const lines = [phrase.text, phrase.meaningVi];
  if (phrase.example) lines.push(`Ví dụ: ${phrase.example}`);
  return createNote(db, { body: lines.join('\n'), source: 'vocab', sourceRef: phrase.id }, now);
}
