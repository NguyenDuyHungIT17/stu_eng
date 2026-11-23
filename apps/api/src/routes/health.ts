import { Hono } from 'hono';
import type { AppEnv } from '../env';

export const health = new Hono<AppEnv>().get('/health', (c) =>
  c.json({ ok: true, env: c.env.APP_ENV, time: new Date().toISOString() }),
);
