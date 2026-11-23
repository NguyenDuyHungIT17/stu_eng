import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AppEnv } from '../env';

/** Chỉ bật ở các môi trường này; thiếu hoặc gõ sai APP_ENV thì đóng (fail closed). */
const DEV_ENVS = new Set(['local', 'dev', 'test']);

const WORDS = [
  'Hello',
  '!',
  ' This',
  ' is',
  ' a',
  ' streaming',
  ' test',
  ' from',
  ' the',
  ' API',
  '.',
];

/** Route chỉ dùng cho spike S1 (đo stream SSE trên máy thật). Không bật ở prod. */
export const dev = new Hono<AppEnv>()
  .use('/dev/*', async (c, next) => {
    if (!DEV_ENVS.has(c.env.APP_ENV)) return c.json({ error: 'not_found' }, 404);
    await next();
  })
  .get('/dev/stream', (c) => {
    const delay = Math.min(Number(c.req.query('delay') ?? 150) || 0, 1000);
    return streamSSE(c, async (stream) => {
      for (const t of WORDS) {
        await stream.writeSSE({ data: JSON.stringify({ t }) });
        if (delay > 0) await stream.sleep(delay);
      }
      await stream.writeSSE({ event: 'done', data: '' });
    });
  });
