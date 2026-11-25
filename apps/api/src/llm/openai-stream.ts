import { SseParser } from '@app/shared';

/**
 * Đọc stream `chat/completions` dạng OpenAI (SSE) và trả từng đoạn chữ.
 * Dừng ở `data: [DONE]`. Bỏ qua sự kiện không có nội dung (role, finish_reason...).
 */
export async function* parseOpenAiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    while (true) {
      const { done, value } = await reader.read();
      const text = done ? decoder.decode() : decoder.decode(value, { stream: true });
      for (const ev of parser.push(done ? `${text}\n\n` : text)) {
        if (ev.data.trim() === '[DONE]') return;
        let json: unknown;
        try {
          json = JSON.parse(ev.data);
        } catch {
          continue;
        }
        const t = (json as { choices?: { delta?: { content?: unknown } }[] }).choices?.[0]?.delta
          ?.content;
        if (typeof t === 'string' && t.length > 0) yield t;
      }
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}
