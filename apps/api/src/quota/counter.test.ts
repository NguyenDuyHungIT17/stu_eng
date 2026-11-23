import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../../test/d1';
import { hit, peek, purgeBefore, undo } from './counter';

let db: D1Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await createTestDb());
});
afterAll(async () => {
  await dispose();
});

describe('quota counter (D1)', () => {
  it('đếm tăng dần theo khoá', async () => {
    expect(await hit(db, 'k1', '2026-11-18')).toBe(1);
    expect(await hit(db, 'k1', '2026-11-18')).toBe(2);
    expect(await peek(db, 'k1')).toBe(2);
    expect(await peek(db, 'chua-co')).toBe(0);
  });

  it('spike S4: 20 request song song không mất lượt', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => hit(db, 'concurrent', '2026-11-18')),
    );
    expect(new Set(results).size).toBe(20);
    expect(await peek(db, 'concurrent')).toBe(20);
  });

  it('undo trả lại một lượt, không xuống dưới 0', async () => {
    await hit(db, 'u1', '2026-11-18');
    await undo(db, 'u1');
    await undo(db, 'u1');
    expect(await peek(db, 'u1')).toBe(0);
  });

  it('purgeBefore xoá các ngày cũ', async () => {
    await hit(db, 'old', '2026-11-10');
    await hit(db, 'new', '2026-11-18');
    await purgeBefore(db, '2026-11-16');
    expect(await peek(db, 'old')).toBe(0);
    expect(await peek(db, 'new')).toBe(1);
  });
});
