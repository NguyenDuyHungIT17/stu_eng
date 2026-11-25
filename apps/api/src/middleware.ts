import type { ApiErrorCode, QuotaBucket } from '@app/shared';
import type { Context, MiddlewareHandler } from 'hono';
import { vnDayKey } from './day';
import type { AppEnv, Env } from './env';
import { undo } from './quota/counter';

/** Middleware dùng chung cho các route cần định danh và quota (TK §7.2, §7.6). */

export const apiError = (c: Context, code: ApiErrorCode, status: 400 | 404 | 429 | 500 | 502) =>
  c.json({ error: code }, status);

/** `X-Device-Id`: UUID sinh lúc cài app. Ẩn danh, có thể giả mạo (chỉ để chia quota). */
export const requireDeviceId: MiddlewareHandler<AppEnv> = async (c, next) => {
  const id = c.req.header('X-Device-Id') ?? '';
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return apiError(c, 'missing_device_id', 400);
  c.set('deviceId', id);
  await next();
};

export const limits = (env: Env) => ({
  chat: Number(env.CHAT_PER_DEVICE) || 40,
  assist: Number(env.ASSIST_PER_DEVICE) || 20,
  ip: Number(env.REQ_PER_IP) || 150,
  global: Number(env.GLOBAL_DAILY) || 1500,
});

export const quotaKeys = (bucket: QuotaBucket, deviceId: string, ip: string, day: string) => ({
  device: `${bucket}:dev:${deviceId}:${day}`,
  ip: `ip:${ip}:${day}`,
  global: `global:${day}`,
});

/**
 * Trừ 1 lượt trước khi gọi LLM: ba bộ đếm (thiết bị, IP, toàn cục) trong một batch D1.
 * Vượt ngưỡng nào thì trả 429 với mã tương ứng. Lưu khóa thiết bị để trả lại lượt nếu LLM lỗi.
 */
export const rateLimit =
  (bucket: QuotaBucket): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const day = vnDayKey(new Date());
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const keys = quotaKeys(bucket, c.get('deviceId'), ip, day);
    const stmt = c.env.DB.prepare(
      `INSERT INTO usage (key, day, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET count = count + 1
       RETURNING count`,
    );
    const [dev, byIp, all] = await c.env.DB.batch<{ count: number }>([
      stmt.bind(keys.device, day),
      stmt.bind(keys.ip, day),
      stmt.bind(keys.global, day),
    ]);
    const count = (r: typeof dev) => r?.results?.[0]?.count ?? 1;
    const lim = limits(c.env);
    if (count(dev) > lim[bucket]) return apiError(c, 'quota_device', 429);
    if (count(byIp) > lim.ip) return apiError(c, 'quota_ip', 429);
    if (count(all) > lim.global) return apiError(c, 'global_budget', 429);
    c.set('quotaKey', keys.device);
    await next();
  };

/** Trả lại lượt của thiết bị khi LLM lỗi hoàn toàn (best-effort). */
export async function refund(c: Context<AppEnv>): Promise<void> {
  const key = c.get('quotaKey');
  if (key) await undo(c.env.DB, key).catch(() => undefined);
}
