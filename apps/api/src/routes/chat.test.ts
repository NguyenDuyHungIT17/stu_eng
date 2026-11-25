import { SseParser } from '@app/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../../test/d1';
import type { Env } from '../env';
import { app } from '../index';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await createTestDb());
});
afterAll(async () => {
  await dispose();
});

/** Không có API key → môi trường test dùng nhà cung cấp giả (mock). */
const env = (extra: Partial<Env> = {}): Env => ({
  APP_ENV: 'test',
  DB: db,
  CHAT_PER_DEVICE: '3',
  ASSIST_PER_DEVICE: '2',
  REQ_PER_IP: '100',
  GLOBAL_DAILY: '1000',
  LLM_PROVIDERS: '[]',
  ...extra,
});

let n = 0;
const newDevice = () => `device-test-${++n}-abcdef`;

const post = (path: string, body: unknown, device: string | null, e = env()) =>
  app.request(
    path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(device ? { 'X-Device-Id': device } : {}),
        'CF-Connecting-IP': '1.2.3.4',
      },
      body: JSON.stringify(body),
    },
    e,
  );

const chatBody = {
  scenarioId: 'restaurant-order',
  level: 'A2',
  messages: [
    { role: 'assistant', content: 'Good evening! Can I get you something to drink?' },
    { role: 'user', content: 'A coffee please.' },
  ],
};

async function readSse(res: Response) {
  const p = new SseParser();
  return p.push(`${await res.text()}\n\n`);
}

describe('POST /chat', () => {
  it('thiếu X-Device-Id → 400 missing_device_id', async () => {
    const res = await post('/chat', chatBody, null);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'missing_device_id' });
  });

  it('body sai → 400 invalid_request; kịch bản lạ → unknown_scenario', async () => {
    const d = newDevice();
    expect((await post('/chat', { ...chatBody, messages: [] }, d)).status).toBe(400);
    const res = await post('/chat', { ...chatBody, scenarioId: 'nope' }, d);
    expect(await res.json()).toEqual({ error: 'unknown_scenario' });
  });

  it('stream SSE {t} rồi event done', async () => {
    const res = await post('/chat', chatBody, newDevice());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const events = await readSse(res);
    const text = events
      .filter((e) => e.event === 'message')
      .map((e) => (JSON.parse(e.data) as { t: string }).t)
      .join('');
    expect(text).toMatch(/^\(demo\) .+\?$/);
    expect(events.at(-1)).toEqual({ event: 'done', data: '' });
  });

  it('hết lượt thiết bị → 429 quota_device; /quota báo đúng số đã dùng', async () => {
    const d = newDevice();
    for (let i = 0; i < 3; i++) expect((await post('/chat', chatBody, d)).status).toBe(200);
    const res = await post('/chat', chatBody, d);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'quota_device' });

    const q = await app.request('/quota', { headers: { 'X-Device-Id': d } }, env());
    const body = (await q.json()) as { chat: { used: number; limit: number }; resetsAt: string };
    expect(body.chat).toEqual({ used: 4, limit: 3 });
    expect(body.resetsAt).toMatch(/T17:00:00.000Z$/);
  });

  it('prod chưa có nhà cung cấp → event error upstream_failed và trả lại lượt', async () => {
    const d = newDevice();
    const e = env({ APP_ENV: 'prod' });
    const events = await readSse(await post('/chat', chatBody, d, e));
    expect(events.at(-1)).toEqual({ event: 'error', data: 'upstream_failed' });
    const q = await app.request('/quota', { headers: { 'X-Device-Id': d } }, e);
    expect(((await q.json()) as { chat: { used: number } }).chat.used).toBe(0);
  });

  it('vượt ngân sách toàn cục → 429 global_budget', async () => {
    const res = await post('/chat', chatBody, newDevice(), env({ GLOBAL_DAILY: '1' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'global_budget' });
  });
});

describe('POST /chat/explain, /chat/feedback', () => {
  it('trả JSON đúng schema; tính vào lượt assist', async () => {
    const d = newDevice();
    const ex = await post(
      '/chat/explain',
      { level: 'A2', sentence: 'Can I get you something to drink?', context: [] },
      d,
    );
    expect(ex.status).toBe(200);
    expect(await ex.json()).toMatchObject({
      translation: expect.any(String),
      notes: expect.any(Array),
    });

    const fb = await post('/chat/feedback', chatBody, d);
    expect(fb.status).toBe(200);
    expect(await fb.json()).toMatchObject({
      summary: expect.any(String),
      mistakes: expect.any(Array),
      usefulPhrases: expect.any(Array),
    });

    const third = await post('/chat/feedback', chatBody, d);
    expect(third.status).toBe(429);
  });

  it('prod chưa có nhà cung cấp → 502 upstream_failed', async () => {
    const res = await post(
      '/chat/explain',
      { level: 'A2', sentence: 'Hi', context: [] },
      newDevice(),
      env({ APP_ENV: 'prod' }),
    );
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream_failed' });
  });
});
