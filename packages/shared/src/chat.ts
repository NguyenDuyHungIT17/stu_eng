import { z } from 'zod';
import { Level } from './levels';

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_CHAT_MESSAGES = 24;

export const ChatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ChatRequest = z.object({
  scenarioId: z.string().min(1).max(64),
  level: Level,
  messages: z.array(ChatMessage).min(1).max(MAX_CHAT_MESSAGES),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

/** Một sự kiện SSE dữ liệu của /chat: `data: {"t":"..."}`. */
export const ChatStreamChunk = z.object({ t: z.string() });
export type ChatStreamChunk = z.infer<typeof ChatStreamChunk>;

export const ExplainRequest = z.object({
  level: Level,
  sentence: z.string().min(1).max(MAX_MESSAGE_CHARS),
  context: z.array(ChatMessage).max(4),
});
export type ExplainRequest = z.infer<typeof ExplainRequest>;

export const ExplainResponse = z.object({
  translation: z.string(),
  notes: z.array(z.object({ phrase: z.string(), meaning: z.string() })).max(5),
});
export type ExplainResponse = z.infer<typeof ExplainResponse>;

export const FeedbackRequest = z.object({
  scenarioId: z.string().min(1).max(64),
  level: Level,
  messages: z.array(ChatMessage).min(2).max(60),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;

export const FeedbackResponse = z.object({
  summary: z.string(),
  mistakes: z.array(z.object({ original: z.string(), better: z.string(), note: z.string() })),
  usefulPhrases: z.array(z.string()),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponse>;

/** Mã lỗi API trả về trong body `{ error: ApiErrorCode }`. */
export const API_ERROR_CODES = [
  'invalid_request',
  'missing_device_id',
  'unknown_scenario',
  'quota_device',
  'quota_ip',
  'global_budget',
  'upstream_failed',
  'internal',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
