import { dailyActivity } from '@/db/schema';
import { createTestDb } from '@/db/test-db';
import { computeStreak, type DayActivity, getStreak, isActiveDay } from './streak';

const d = (day: string, reviews = 1, newCards = 0, chatSessions = 0): DayActivity => ({
  day,
  reviews,
  newCards,
  chatSessions,
});
const at = (y: number, m: number, day: number, h = 10) => new Date(y, m - 1, day, h).getTime();

describe('isActiveDay', () => {
  it('có thẻ hoặc có buổi hội thoại là có học', () => {
    expect(isActiveDay(d('x', 0, 0, 0))).toBe(false);
    expect(isActiveDay(d('x', 0, 1, 0))).toBe(true);
    expect(isActiveDay(d('x', 0, 0, 1))).toBe(true);
  });
});

describe('computeStreak', () => {
  it('chưa học ngày nào → 0', () => {
    expect(computeStreak([], at(2026, 11, 23))).toEqual({ current: 0, todayDone: false });
  });

  it('học liên tiếp đến hôm nay', () => {
    const days = [d('2026-11-21'), d('2026-11-22'), d('2026-11-23')];
    expect(computeStreak(days, at(2026, 11, 23))).toEqual({ current: 3, todayDone: true });
  });

  it('hôm nay chưa học: vẫn giữ chuỗi đến hôm qua', () => {
    const days = [d('2026-11-21'), d('2026-11-22')];
    expect(computeStreak(days, at(2026, 11, 23, 23))).toEqual({ current: 2, todayDone: false });
  });

  it('bỏ một ngày thì chuỗi đứt', () => {
    const days = [d('2026-11-20'), d('2026-11-21'), d('2026-11-23')];
    expect(computeStreak(days, at(2026, 11, 23))).toEqual({ current: 1, todayDone: true });
    expect(computeStreak([d('2026-11-21')], at(2026, 11, 23))).toEqual({
      current: 0,
      todayDone: false,
    });
  });

  it('dòng có nhưng không học (0 thẻ, 0 buổi) không tính', () => {
    const days = [d('2026-11-22'), d('2026-11-23', 0, 0, 0)];
    expect(computeStreak(days, at(2026, 11, 23))).toEqual({ current: 1, todayDone: false });
  });

  it('qua tháng, qua năm', () => {
    const days = [d('2026-12-30'), d('2026-12-31'), d('2027-01-01')];
    expect(computeStreak(days, at(2027, 1, 1))).toEqual({ current: 3, todayDone: true });
  });
});

describe('getStreak', () => {
  it('đọc từ daily_activity', () => {
    const db = createTestDb();
    db.insert(dailyActivity)
      .values([
        { day: '2026-11-22', reviews: 3 },
        { day: '2026-11-23', newCards: 2 },
      ])
      .run();
    expect(getStreak(db, at(2026, 11, 23))).toEqual({ current: 2, todayDone: true });
  });
});
