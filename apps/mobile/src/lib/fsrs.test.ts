import { newCard, parseCard, Rating, scheduleNext, serializeCard } from './fsrs';

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date(2026, 10, 23, 9, 0).getTime();

describe('fsrs', () => {
  it('thẻ mới đến hạn ngay', () => {
    const c = newCard(t0);
    expect(c.due).toBe(t0);
    expect(c.reps).toBe(0);
    expect(c.lastReview).toBeNull();
  });

  it('chấm Quên lần đầu: ôn lại trong vài phút (bước học ngắn)', () => {
    const c = scheduleNext(null, Rating.Again, t0);
    expect(c.due).toBeGreaterThan(t0);
    expect(c.due - t0).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(c.reps).toBe(1);
    expect(c.lastReview).toBe(t0);
  });

  it('khoảng cách tăng dần: Dễ > Được > Khó > Quên', () => {
    const due = (r: Rating) => scheduleNext(null, r, t0).due;
    expect(due(Rating.Easy)).toBeGreaterThan(due(Rating.Good));
    expect(due(Rating.Good)).toBeGreaterThan(due(Rating.Hard));
    expect(due(Rating.Hard)).toBeGreaterThan(due(Rating.Again));
  });

  it('ôn đúng liên tục thì khoảng cách lớn dần, tính bằng ngày', () => {
    let c = scheduleNext(null, Rating.Easy, t0);
    let gap = c.due - t0;
    for (let i = 0; i < 4; i++) {
      const now = c.due;
      c = scheduleNext(c, Rating.Good, now);
      const next = c.due - now;
      expect(next).toBeGreaterThan(gap);
      gap = next;
    }
    expect(gap).toBeGreaterThan(7 * DAY);
  });

  it('quên sau khi đã thuộc: tăng lapses và đến hạn sớm', () => {
    let c = scheduleNext(null, Rating.Easy, t0);
    c = scheduleNext(c, Rating.Good, c.due);
    const now = c.due;
    const after = scheduleNext(c, Rating.Again, now);
    expect(after.lapses).toBe(1);
    expect(after.due - now).toBeLessThan(DAY);
  });

  it('serialize/parse giữ nguyên trạng thái', () => {
    const c = scheduleNext(null, Rating.Good, t0);
    expect(parseCard(serializeCard(c))).toEqual(c);
    const d = scheduleNext(parseCard(serializeCard(c)), Rating.Good, c.due);
    expect(d).toEqual(scheduleNext(c, Rating.Good, c.due));
  });

  it('parseCard báo lỗi khi JSON hỏng', () => {
    expect(() => parseCard('{"due":"x"}')).toThrow();
  });
});
