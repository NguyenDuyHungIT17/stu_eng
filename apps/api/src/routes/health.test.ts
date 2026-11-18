import { describe, expect, it } from 'vitest';
import app from '../index';

describe('GET /health', () => {
  it('trả về ok, không cần X-Device-Id', async () => {
    const res = await app.request('/health', {}, { APP_ENV: 'test' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, env: 'test' });
  });

  it('route không tồn tại trả 404 JSON', async () => {
    const res = await app.request('/khong-co', {}, { APP_ENV: 'test' });
    expect(res.status).toBe(404);
  });
});
