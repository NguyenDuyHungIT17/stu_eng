import { addLocalDays, localDayKey, startOfLocalDay } from './day';

// Dùng constructor theo giờ máy để test đúng ở mọi múi giờ.
describe('day', () => {
  it('localDayKey trả yyyy-mm-dd theo giờ máy, có số 0 đầu', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDayKey(new Date(2026, 10, 23, 0, 0))).toBe('2026-11-23');
  });

  it('startOfLocalDay trả 00:00 cùng ngày theo giờ máy (epoch ms)', () => {
    const now = new Date(2026, 10, 23, 15, 30, 12, 345);
    expect(startOfLocalDay(now)).toBe(new Date(2026, 10, 23).getTime());
    expect(startOfLocalDay(new Date(2026, 10, 23))).toBe(new Date(2026, 10, 23).getTime());
  });

  it('nhận cả epoch ms', () => {
    const ms = new Date(2026, 1, 28, 12).getTime();
    expect(localDayKey(ms)).toBe('2026-02-28');
    expect(startOfLocalDay(ms)).toBe(new Date(2026, 1, 28).getTime());
  });

  it('addLocalDays cộng theo ngày lịch (qua tháng, năm)', () => {
    expect(localDayKey(addLocalDays(new Date(2026, 11, 31, 10), 1))).toBe('2027-01-01');
    expect(localDayKey(addLocalDays(new Date(2026, 2, 1, 10), -1))).toBe('2026-02-28');
  });
});
