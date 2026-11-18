import { describe, expect, it } from 'vitest';
import { nextVnMidnightIso, vnDayKey } from './day';

describe('vnDayKey', () => {
  it('tính ngày theo giờ Việt Nam (UTC+7)', () => {
    // 16:59 UTC = 23:59 giờ VN cùng ngày
    expect(vnDayKey(new Date('2026-11-18T16:59:00Z'))).toBe('2026-11-18');
    // 17:00 UTC = 00:00 giờ VN ngày hôm sau
    expect(vnDayKey(new Date('2026-11-18T17:00:00Z'))).toBe('2026-11-19');
  });
});

describe('nextVnMidnightIso', () => {
  it('trả về 00:00 giờ VN kế tiếp dưới dạng ISO UTC', () => {
    expect(nextVnMidnightIso(new Date('2026-11-18T10:00:00Z'))).toBe('2026-11-18T17:00:00.000Z');
    expect(nextVnMidnightIso(new Date('2026-11-18T17:00:00Z'))).toBe('2026-11-19T17:00:00.000Z');
  });
});
