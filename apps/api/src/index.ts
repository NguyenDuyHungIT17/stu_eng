import { Hono } from 'hono';
import { vnDayKeyOffset } from './day';
import type { AppEnv, Env } from './env';
import { purgeBefore } from './quota/counter';
import { chat } from './routes/chat';
import { dev } from './routes/dev';
import { health } from './routes/health';

const app = new Hono<AppEnv>();

app.route('/', health);
app.route('/', dev);
app.route('/', chat);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  // Không log nội dung request (TK §7.6), chỉ log thông tin kỹ thuật.
  console.error(`[${c.req.method} ${c.req.path}]`, err.message);
  return c.json({ error: 'internal' }, 500);
});

export { app };

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env) {
    await purgeBefore(env.DB, vnDayKeyOffset(new Date(), -2));
  },
};
