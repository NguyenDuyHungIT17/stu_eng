import { reminderTimes } from './reminder-times';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();

describe('reminderTimes (S2-12)', () => {
  it('chưa học, chưa tới giờ: nhắc từ hôm nay, đủ 7 ngày', () => {
    const t = reminderTimes(at(23, 9), { hour: 20, minute: 0, todayDone: false });
    expect(t).toHaveLength(7);
    expect(t[0]).toBe(at(23, 20));
    expect(t[6]).toBe(at(29, 20));
  });

  it('hôm nay đã học: bắt đầu từ ngày mai', () => {
    const t = reminderTimes(at(23, 9), { hour: 20, minute: 30, todayDone: true });
    expect(t[0]).toBe(at(24, 20, 30));
    expect(t).toHaveLength(7);
  });

  it('đã qua giờ nhắc: bắt đầu từ ngày mai', () => {
    const t = reminderTimes(at(23, 21), { hour: 20, minute: 0, todayDone: false, days: 2 });
    expect(t).toEqual([at(24, 20), at(25, 20)]);
  });

  it('qua tháng đúng ngày', () => {
    const t = reminderTimes(at(30, 9), { hour: 7, minute: 0, todayDone: true, days: 1 });
    expect(t).toEqual([new Date(2026, 11, 1, 7).getTime()]);
  });
});
