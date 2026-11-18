import { Hono } from 'hono';
import { vnDayKeyOffset } from './day';
import type { AppEnv, Env } from './env';
import { purgeBefore } from './quota/counter';
import { health } from './routes/health';

const app = new Hono<AppEnv>();

app.route('/', health);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  // Không log nội dung request (TK §7.6), chỉ log thông tin kỹ thuật.
  console.error(`[${c.req.method} ${c.req.path}]`, err.message);
  return c.json({ error: 'internal' }, 500);
});

export default {
  fetch: app.fetch,
  request: app.request,
  async scheduled(_event: ScheduledController, env: Env) {
    await purgeBefore(env.DB, vnDayKeyOffset(new Date(), -2));
  },
};
