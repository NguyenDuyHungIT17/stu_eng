import { z } from 'zod';
import type { Env } from '../env';

/**
 * Nhà cung cấp LLM (TK §7.4). Cấu hình bằng biến `LLM_PROVIDERS` (JSON, theo thứ tự ưu tiên),
 * API key nằm ở Workers Secrets, tên biến do `keyVar` chỉ định. Không viết cứng model trong code.
 *
 * Nhà cung cấp thiếu key thì bị bỏ qua. Không còn nhà cung cấp nào và không phải prod thì dùng
 * `mock` (trả lời giả) để phát triển app khi chưa có key.
 */

export const ProviderConfig = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  model: z.string().min(1),
  keyVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  supportsJsonMode: z.boolean().default(false),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

export type Provider = Omit<ProviderConfig, 'keyVar'> & { apiKey: string };

export const MOCK: Provider = {
  name: 'mock',
  baseUrl: 'https://mock.invalid',
  model: 'mock',
  apiKey: '',
  supportsJsonMode: true,
};

export function getProviders(env: Env): Provider[] {
  let configs: ProviderConfig[] = [];
  try {
    configs = z.array(ProviderConfig).parse(JSON.parse(env.LLM_PROVIDERS ?? '[]'));
  } catch {
    configs = [];
  }
  const secrets = env as unknown as Record<string, unknown>;
  const providers = configs.flatMap((p): Provider[] => {
    const key = secrets[p.keyVar];
    if (typeof key !== 'string' || key.length === 0) return [];
    const { keyVar: _, ...rest } = p;
    return [{ ...rest, apiKey: key }];
  });
  if (providers.length === 0 && env.APP_ENV !== 'prod') return [MOCK];
  return providers;
}
