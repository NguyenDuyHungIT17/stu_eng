import { z } from 'zod';
import { Level, Register } from './levels';

const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id phải là kebab-case chữ thường');

export const TopicContent = z.object({
  id: Id,
  title: z.string().min(1),
  level: Level,
  sortOrder: z.number().int(),
});
export type TopicContent = z.infer<typeof TopicContent>;

export const PhraseContent = z.object({
  id: Id,
  topicId: Id,
  text: z.string().min(1),
  ipa: z.string().optional(),
  meaningVi: z.string().min(1),
  example: z.string().optional(),
  register: Register.optional(),
  level: Level,
  /** Câu thuộc đoạn hội thoại (sinh tự động từ dialogues, không viết tay). */
  dialogueId: Id.optional(),
  lineNo: z.number().int().min(0).optional(),
  speaker: z.enum(['a', 'b']).optional(),
  blank: z.string().optional(),
  noteVi: z.string().optional(),
});
export type PhraseContent = z.infer<typeof PhraseContent>;

/** Một lượt nói trong đoạn hội thoại. */
export const DialogueLine = z.object({
  speaker: z.enum(['a', 'b']),
  text: z.string().min(1),
  meaningVi: z.string().min(1),
  /**
   * Cụm giao tiếp then chốt của câu (xuất hiện nguyên văn trong `text`). Dùng cho bài
   * nghe-điền và là câu được ôn lại. Câu không có `blank` chỉ làm ngữ cảnh.
   */
  blank: z.string().min(1).optional(),
  /** Ghi chú ngắn bằng tiếng Việt: khi nào dùng, sắc thái. */
  noteVi: z.string().min(1).optional(),
});
export type DialogueLine = z.infer<typeof DialogueLine>;

export const Speaker = z.object({ name: z.string().min(1), roleVi: z.string().min(1) });

/** Đoạn hội thoại gắn với một tình huống cụ thể. */
export const DialogueContent = z
  .object({
    id: Id,
    topicId: Id,
    title: z.string().min(1),
    level: Level,
    /** Tình huống bằng tiếng Việt: ai, ở đâu, chuyện gì. */
    situationVi: z.string().min(1),
    speakers: z.object({ a: Speaker, b: Speaker }),
    lines: z.array(DialogueLine).min(4).max(16),
  })
  .superRefine((d, ctx) => {
    d.lines.forEach((l, i) => {
      if (l.blank && !l.text.includes(l.blank)) {
        ctx.addIssue({
          code: 'custom',
          message: `blank "${l.blank}" không có trong câu`,
          path: ['lines', i, 'blank'],
        });
      }
    });
    if (!d.lines.some((l) => l.blank)) {
      ctx.addIssue({ code: 'custom', message: 'cần ít nhất 1 câu có blank', path: ['lines'] });
    }
  });
export type DialogueContent = z.infer<typeof DialogueContent>;

export const ScenarioContent = z.object({
  id: Id,
  title: z.string().min(1),
  level: Level,
  /** Vai của AI, tiếng Anh, dùng trong system prompt. */
  aiRole: z.string().min(1),
  userRole: z.string().min(1),
  goalVi: z.string().min(1),
  /** Bối cảnh, tiếng Anh, dùng trong system prompt. */
  setting: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  /** Câu mở đầu của AI, hiển thị sẵn, không tốn request. */
  opener: z.string().min(1),
});
export type ScenarioContent = z.infer<typeof ScenarioContent>;

export const PlacementQuestion = z
  .object({
    id: Id,
    level: Level,
    kind: z.enum(['listen_choose', 'read_choose']),
    /** Câu tiếng Anh: đọc bằng TTS (listen) hoặc hiển thị (read). */
    prompt: z.string().min(1),
    questionVi: z.string().min(1),
    options: z.array(z.string().min(1)).length(4),
    answerIndex: z.number().int().min(0),
  })
  .refine((q) => q.answerIndex < q.options.length, {
    message: 'answerIndex nằm ngoài options',
    path: ['answerIndex'],
  });
export type PlacementQuestion = z.infer<typeof PlacementQuestion>;

export const ContentVersion = z.object({ contentVersion: z.number().int().min(1) });
