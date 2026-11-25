import {
  type ChatMessage,
  ExplainResponse,
  FeedbackResponse,
  type ExplainResponse as TExplain,
  type FeedbackResponse as TFeedback,
} from '@app/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { chatMessages, chatSessions, dailyActivity } from '@/db/schema';
import type { Db } from '@/db/types';
import { localDayKey } from '@/lib/day';
import { createId } from '@/lib/id';
import { createNote, findNoteBySource, type Note } from '../notes/repository';

/** Buổi hội thoại với AI lưu trên máy (TK §5, §6.2). */

export type Session = typeof chatSessions.$inferSelect;
export type Message = Omit<typeof chatMessages.$inferSelect, 'explanationVi'> & {
  role: 'user' | 'assistant';
  explanation: TExplain | null;
};

/** Số lượt gần nhất gửi lên server (server cũng cắt còn 12). */
export const MAX_SENT_MESSAGES = 24;

function parseJson<T>(
  raw: string | null,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
): T | null {
  if (!raw) return null;
  try {
    const r = schema.safeParse(JSON.parse(raw));
    return r.success ? (r.data ?? null) : null;
  } catch {
    return null;
  }
}

const toMessage = (r: typeof chatMessages.$inferSelect): Message => {
  const { explanationVi, ...rest } = r;
  return {
    ...rest,
    role: r.role === 'user' ? 'user' : 'assistant',
    explanation: parseJson(explanationVi, ExplainResponse),
  };
};

/** Buổi đang dở (chưa kết thúc) gần nhất của kịch bản. */
export function getOpenSession(db: Db, scenarioId: string): Session | undefined {
  return db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.scenarioId, scenarioId), isNull(chatSessions.endedAt)))
    .orderBy(desc(chatSessions.startedAt))
    .get();
}

/** Bắt đầu buổi mới; câu mở đầu của AI lấy từ kịch bản (không tốn lượt). */
export function startSession(
  db: Db,
  input: { scenarioId: string; level: string; opener: string },
  now: number,
): Session {
  return db.transaction((tx) => {
    const session = tx
      .insert(chatSessions)
      .values({
        id: createId(now),
        scenarioId: input.scenarioId,
        level: input.level,
        startedAt: now,
      })
      .returning()
      .get();
    tx.insert(chatMessages)
      .values({
        id: createId(now),
        sessionId: session.id,
        role: 'assistant',
        content: input.opener,
        createdAt: now,
      })
      .run();
    return session;
  });
}

export function addMessage(
  db: Db,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  now: number,
): Message {
  return toMessage(
    db
      .insert(chatMessages)
      .values({ id: createId(now), sessionId, role, content: content.trim(), createdAt: now })
      .returning()
      .get(),
  );
}

export function listMessages(db: Db, sessionId: string): Message[] {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id))
    .all()
    .map(toMessage);
}

/** Lịch sử gửi lên API: các lượt gần nhất, bỏ lượt rỗng. */
export function toApiMessages(messages: Message[]): ChatMessage[] {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_SENT_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
}

/** Cache kết quả "Giải thích tiếng Việt" (FR-A-05). */
export function saveExplanation(db: Db, messageId: string, ex: TExplain): void {
  db.update(chatMessages)
    .set({ explanationVi: JSON.stringify(ex) })
    .where(eq(chatMessages.id, messageId))
    .run();
}

/** Kết thúc buổi: lưu tổng kết, cộng `daily_activity.chatSessions` (tính streak). */
export function finishSession(db: Db, sessionId: string, feedback: TFeedback, now: number): void {
  db.transaction((tx) => {
    const updated = tx
      .update(chatSessions)
      .set({ endedAt: now, feedbackJson: JSON.stringify(feedback) })
      .where(and(eq(chatSessions.id, sessionId), isNull(chatSessions.endedAt)))
      .returning({ id: chatSessions.id })
      .all();
    if (updated.length === 0) return; // đã kết thúc trước đó
    tx.insert(dailyActivity)
      .values({ day: localDayKey(now), chatSessions: 1 })
      .onConflictDoUpdate({
        target: dailyActivity.day,
        set: { chatSessions: sql`${dailyActivity.chatSessions} + 1` },
      })
      .run();
  });
}

export function getFeedback(session: Session): TFeedback | null {
  return parseJson(session.feedbackJson, FeedbackResponse);
}

/** Số buổi đã hoàn thành theo kịch bản (hiện ở danh sách). */
export function countFinishedByScenario(db: Db): Record<string, number> {
  const rows = db
    .select({ id: chatSessions.scenarioId, n: sql<number>`count(*)` })
    .from(chatSessions)
    .where(sql`${chatSessions.endedAt} is not null`)
    .groupBy(chatSessions.scenarioId)
    .all();
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

/** Lưu câu của AI (kèm nghĩa nếu đã giải thích) vào ghi chú (FR-A-06a). Không tạo trùng. */
export function saveMessageToNotes(db: Db, m: Message, now: number): Note {
  const existing = findNoteBySource(db, 'chat', m.id);
  if (existing) return existing;
  const lines = [m.content];
  if (m.explanation) lines.push(m.explanation.translation);
  return createNote(db, { body: lines.join('\n'), source: 'chat', sourceRef: m.id }, now);
}
