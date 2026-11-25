import { createTestDb } from '@/db/test-db';
import { getDeviceId, randomUuid } from './device-id';

describe('device id', () => {
  it('dạng UUID v4, hợp lệ với header X-Device-Id của server', () => {
    const id = randomUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('sinh một lần rồi giữ nguyên', () => {
    const db = createTestDb();
    expect(getDeviceId(db)).toBe(getDeviceId(db));
  });
});
