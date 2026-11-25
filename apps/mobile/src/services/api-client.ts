import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type ChatRequest,
  type ExplainRequest,
  ExplainResponse,
  type FeedbackRequest,
  FeedbackResponse,
  QuotaResponse,
  SseParser,
} from '@app/shared';
import { fetch } from 'expo/fetch';
import type { z } from 'zod';
import { API_BASE_URL } from '@/lib/config';

/** Gọi backend (TK §7.1). Mọi lỗi được quy về `ApiError` có mã, để hiển thị tiếng Việt. */

export type ClientErrorCode = ApiErrorCode | 'network' | 'bad_response';

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    readonly status = 0,
  ) {
    super(code);
  }
}

const KNOWN = new Set<string>(API_ERROR_CODES);

/** Đổi phản hồi lỗi `{ error: code }` thành ApiError. */
export async function toApiError(res: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && KNOWN.has(body.error))
      return new ApiError(body.error as ApiErrorCode, res.status);
  } catch {
    // body không phải JSON
  }
  return new ApiError(res.status === 429 ? 'quota_device' : 'internal', res.status);
}

/** Thông báo tiếng Việt cho từng mã lỗi. */
export function errorMessage(code: ClientErrorCode): string {
  switch (code) {
    case 'network':
      return 'Không kết nối được. Kiểm tra mạng rồi thử lại.';
    case 'quota_device':
      return 'Bạn đã dùng hết lượt hôm nay. Lượt mới có lúc 0 giờ.';
    case 'quota_ip':
    case 'global_budget':
      return 'Hệ thống đang quá tải hôm nay. Bạn thử lại vào ngày mai nhé.';
    case 'upstream_failed':
      return 'AI đang bận, chưa trả lời được. Thử lại sau ít giây.';
    case 'unknown_scenario':
      return 'Kịch bản này chưa có trên máy chủ. Hãy cập nhật app.';
    default:
      return 'Có lỗi xảy ra. Thử lại nhé.';
  }
}

export function createApi(deviceId: string, base = API_BASE_URL) {
  const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId };

  async function call(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
  ) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
      if (!res.ok) throw await toApiError(res);
      return res;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('network');
    }
  }

  async function json<S extends z.ZodType>(
    res: { status: number; json: () => Promise<unknown> },
    schema: S,
  ): Promise<z.infer<S>> {
    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) throw new ApiError('bad_response', res.status);
    return parsed.data;
  }

  return {
    /** Stream câu trả lời: gọi `onToken` cho từng đoạn chữ; xong khi nhận `event: done`. */
    async streamChat(req: ChatRequest, onToken: (t: string) => void, signal?: AbortSignal) {
      const res = await call('/chat', { method: 'POST', body: req, signal });
      const reader = res.body?.getReader();
      if (!reader) throw new ApiError('bad_response');
      const decoder = new TextDecoder();
      const parser = new SseParser();
      try {
        while (true) {
          const { done, value } = await reader.read();
          const text = done ? '\n\n' : decoder.decode(value, { stream: true });
          for (const ev of parser.push(text)) {
            if (ev.event === 'done') return;
            if (ev.event === 'error') throw new ApiError('upstream_failed');
            try {
              const t = (JSON.parse(ev.data) as { t?: unknown }).t;
              if (typeof t === 'string') onToken(t);
            } catch {
              // bỏ qua dòng hỏng
            }
          }
          if (done) throw new ApiError('network'); // đứt giữa chừng, chưa nhận `done`
        }
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError('network');
      }
    },
    async explain(req: ExplainRequest) {
      return json(await call('/chat/explain', { method: 'POST', body: req }), ExplainResponse);
    },
    async feedback(req: FeedbackRequest) {
      return json(await call('/chat/feedback', { method: 'POST', body: req }), FeedbackResponse);
    },
    async quota() {
      return json(await call('/quota', { method: 'GET' }), QuotaResponse);
    },
  };
}

export type Api = ReturnType<typeof createApi>;
