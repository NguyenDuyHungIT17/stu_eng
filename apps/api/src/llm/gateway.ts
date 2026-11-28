import type { z } from 'zod';
import type { Env } from '../env';
import { mockJson, mockReply } from './mock';
import { parseOpenAiStream } from './openai-stream';
import { getProviders, type Provider } from './providers';

/** LLM Gateway (TK §7.4): nhiều nhà cung cấp OpenAI-compatible, tự chuyển khi lỗi. */

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type FetchFn = typeof fetch;

export class LlmError extends Error {}

const TIMEOUT_MS = 15_000;

function post(p: Provider, body: object, fetchFn: FetchFn): Promise<Response> {
  return fetchFn(`${p.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify({ model: p.model, ...body }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Stream câu trả lời. Chỉ chuyển sang nhà cung cấp kế tiếp khi CHƯA gửi token nào;
 * đã gửi một phần mà lỗi thì ném lỗi (app hiển thị "Thử lại").
 */
export async function* streamChat(
  env: Env,
  messages: Msg[],
  fetchFn: FetchFn = fetch,
): AsyncGenerator<string> {
  let lastError: unknown = new LlmError('no_provider');
  for (const p of getProviders(env)) {
    if (p.name === 'mock') {
      yield* mockReply(messages);
      return;
    }
    let started = false;
    try {
      const res = await post(
        p,
        { messages, stream: true, temperature: 0.7, max_tokens: 800 },
        fetchFn,
      );
      if (!res.ok || !res.body) throw new LlmError(`${p.name}:${res.status}`);
      for await (const token of parseOpenAiStream(res.body)) {
        started = true;
        yield token;
      }
      if (!started) throw new LlmError(`${p.name}:empty`);
      return;
    } catch (e) {
      if (started) throw e;
      console.warn('[llm] fallback', p.name, e instanceof Error ? e.message : 'error');
      lastError = e;
    }
  }
  throw lastError;
}

/** Bóc JSON từ câu trả lời (có model bọc trong ```json ... ```). */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
}

/**
 * Gọi không stream, trả JSON đã kiểm tra bằng Zod. Mỗi nhà cung cấp thử tối đa 2 lần
 * (lần 2 khi JSON sai định dạng), rồi chuyển nhà cung cấp kế tiếp.
 */
export async function completeJson<S extends z.ZodType>(
  env: Env,
  messages: Msg[],
  schema: S,
  opts: { kind: 'explain' | 'feedback'; fetchFn?: FetchFn },
): Promise<z.infer<S>> {
  const fetchFn = opts.fetchFn ?? fetch;
  let lastError: unknown = new LlmError('no_provider');
  for (const p of getProviders(env)) {
    if (p.name === 'mock') return schema.parse(mockJson(opts.kind, messages));
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await post(
          p,
          {
            messages,
            temperature: 0.3,
            max_tokens: 800,
            ...(p.supportsJsonMode ? { response_format: { type: 'json_object' } } : {}),
          },
          fetchFn,
        );
        if (!res.ok) throw new LlmError(`${p.name}:${res.status}`);
        const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const content = body.choices?.[0]?.message?.content ?? '';
        const parsed = schema.safeParse(extractJson(content));
        if (parsed.success) return parsed.data;
        lastError = new LlmError(`${p.name}:bad_json`);
      } catch (e) {
        lastError = e;
        console.warn('[llm] json fallback', p.name, e instanceof Error ? e.message : 'error');
        // Lỗi mạng/HTTP: không thử lại cùng nhà cung cấp, chuyển luôn.
        if (!(e instanceof SyntaxError)) break;
      }
    }
  }
  throw lastError;
}
