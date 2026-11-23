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
});
export type PhraseContent = z.infer<typeof PhraseContent>;

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
