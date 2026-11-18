import { describe, expect, it } from 'vitest';
import app from '../index';

describe('GET /dev/stream (spike S1)', () => {
  it('stream các sự kiện SSE dạng {"t":...} rồi kết thúc bằng event done', async () => {
    const res = await app.request('/dev/stream?delay=0', {}, { APP_ENV: 'local' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('data: {"t":"Hello"}');
    expect(body).toMatch(/event: done/);
  });

  it('không tồn tại ở môi trường prod', async () => {
    const res = await app.request('/dev/stream', {}, { APP_ENV: 'prod' });
    expect(res.status).toBe(404);
  });
});
