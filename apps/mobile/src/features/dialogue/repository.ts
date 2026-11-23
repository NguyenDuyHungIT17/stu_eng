import { and, asc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { dialogues, phrases, reviewCards, topics } from '@/db/schema';
import type { Db } from '@/db/types';
import { shuffle } from '../review/repository';

/**
 * Đoạn hội thoại theo tình huống. Mỗi câu là một dòng `phrases` (có `dialogueId`, `lineNo`,
 * `speaker`); câu có `blank` là câu then chốt, được luyện và ôn lại.
 */

export type Line = typeof phrases.$inferSelect;
export type Speakers = { a: { name: string; roleVi: string }; b: { name: string; roleVi: string } };
export type Dialogue = {
  id: string;
  topicId: string;
  title: string;
  level: string;
  situationVi: string;
  speakers: Speakers;
};
export type DialogueWithLines = Dialogue & { lines: Line[] };
export type DialogueSummary = Dialogue & { keyLines: number; learned: number; done: boolean };
export type TopicSection = {
  id: string;
  title: string;
  level: string;
  dialogues: DialogueSummary[];
};

const FALLBACK_SPEAKERS: Speakers = {
  a: { name: 'A', roleVi: '' },
  b: { name: 'B', roleVi: '' },
};

function parseSpeakers(raw: string): Speakers {
  try {
    const v = JSON.parse(raw) as Speakers;
    return v?.a?.name && v?.b?.name ? v : FALLBACK_SPEAKERS;
  } catch {
    return FALLBACK_SPEAKERS;
  }
}

const toDialogue = (r: typeof dialogues.$inferSelect): Dialogue => ({
  id: r.id,
  topicId: r.topicId,
  title: r.title,
  level: r.level,
  situationVi: r.situationVi,
  speakers: parseSpeakers(r.speakers),
});

/** Chủ đề kèm các hội thoại và tiến độ (số câu then chốt đã học). */
export function listSections(db: Db): TopicSection[] {
  const rows = db
    .select({
      d: dialogues,
      topicTitle: topics.title,
      topicLevel: topics.level,
      keyLines: sql<number>`count(${phrases.id})`,
      learned: sql<number>`count(${reviewCards.phraseId})`,
    })
    .from(dialogues)
    .innerJoin(topics, eq(topics.id, dialogues.topicId))
    .leftJoin(
      phrases,
      and(
        eq(phrases.dialogueId, dialogues.id),
        isNotNull(phrases.blank),
        isNull(phrases.deletedAt),
      ),
    )
    .leftJoin(reviewCards, eq(reviewCards.phraseId, phrases.id))
    .where(and(isNull(dialogues.deletedAt), isNull(topics.deletedAt)))
    .groupBy(dialogues.id)
    .orderBy(asc(topics.sortOrder), asc(topics.id), asc(dialogues.sortOrder))
    .all();

  const sections: TopicSection[] = [];
  for (const r of rows) {
    let s = sections[sections.length - 1];
    if (!s || s.id !== r.d.topicId) {
      s = { id: r.d.topicId, title: r.topicTitle, level: r.topicLevel, dialogues: [] };
      sections.push(s);
    }
    s.dialogues.push({
      ...toDialogue(r.d),
      keyLines: r.keyLines,
      learned: r.learned,
      done: r.keyLines > 0 && r.learned >= r.keyLines,
    });
  }
  return sections;
}

/** Hội thoại nên học tiếp: cái đầu tiên chưa xong theo thứ tự chủ đề. */
export function nextDialogue(sections: TopicSection[]): DialogueSummary | null {
  for (const s of sections) for (const d of s.dialogues) if (!d.done) return d;
  return null;
}

export function getDialogue(db: Db, id: string): DialogueWithLines | null {
  const row = db.select().from(dialogues).where(eq(dialogues.id, id)).get();
  if (!row) return null;
  const lines = db
    .select()
    .from(phrases)
    .where(and(eq(phrases.dialogueId, id), isNull(phrases.deletedAt)))
    .orderBy(asc(phrases.lineNo))
    .all();
  return { ...toDialogue(row), lines };
}

/** Các câu trước `lineNo` trong cùng hội thoại (ngữ cảnh cho bài tập), tối đa `max` câu. */
export function contextBefore(lines: Line[], lineNo: number, max = 3): Line[] {
  const before = lines.filter((l) => (l.lineNo ?? 0) < lineNo);
  return before.slice(Math.max(0, before.length - max));
}

/** Câu khác (ưu tiên cùng chủ đề, khác hội thoại) để làm đáp án nhiễu. */
function otherLines(db: Db, line: Line): Line[] {
  return db
    .select({ p: phrases })
    .from(phrases)
    .innerJoin(dialogues, eq(dialogues.id, phrases.dialogueId))
    .where(
      and(
        isNull(phrases.deletedAt),
        isNull(dialogues.deletedAt),
        ne(phrases.id, line.id),
        line.dialogueId ? ne(phrases.dialogueId, line.dialogueId) : undefined,
      ),
    )
    .all()
    .map((r) => r.p);
}

function preferSameTopic(line: Line, pool: Line[], rng: () => number): Line[] {
  return [
    ...shuffle(
      pool.filter((p) => p.topicId === line.topicId),
      rng,
    ),
    ...shuffle(
      pool.filter((p) => p.topicId !== line.topicId),
      rng,
    ),
  ];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Đáp án nhiễu cho bài nghe-điền: cụm then chốt của câu khác, không trùng đáp án. */
export function blankDistractors(
  db: Db,
  line: Line,
  count = 3,
  rng: () => number = Math.random,
): string[] {
  const answer = norm(line.blank ?? '');
  const seen = new Set([answer]);
  const out: string[] = [];
  for (const p of preferSameTopic(
    line,
    otherLines(db, line).filter((p) => p.blank),
    rng,
  )) {
    const b = p.blank ?? '';
    if (seen.has(norm(b))) continue;
    seen.add(norm(b));
    out.push(b);
    if (out.length === count) break;
  }
  return out;
}

/** Đáp án nhiễu cho bài chọn câu đáp: câu của hội thoại khác, ưu tiên cùng chủ đề. */
export function replyDistractors(
  db: Db,
  line: Line,
  count = 2,
  rng: () => number = Math.random,
): Line[] {
  const seen = new Set([norm(line.text)]);
  const out: Line[] = [];
  for (const p of preferSameTopic(line, otherLines(db, line), rng)) {
    if (seen.has(norm(p.text))) continue;
    seen.add(norm(p.text));
    out.push(p);
    if (out.length === count) break;
  }
  return out;
}

/** Các câu then chốt của hội thoại đã có thẻ ôn. */
export function countLearned(db: Db, dialogueId: string): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(reviewCards)
    .innerJoin(phrases, eq(phrases.id, reviewCards.phraseId))
    .where(eq(phrases.dialogueId, dialogueId))
    .get();
  return row?.n ?? 0;
}
