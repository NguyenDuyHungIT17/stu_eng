/**
 * Thời điểm nhắc học cho `days` ngày tới (FR-P-04), hàm thuần để test.
 * Bỏ hôm nay nếu đã học xong hoặc đã qua giờ nhắc. Ngày theo giờ máy.
 */
export function reminderTimes(
  now: number,
  opts: { hour: number; minute: number; todayDone: boolean; days?: number },
): number[] {
  const days = opts.days ?? 7;
  const out: number[] = [];
  const base = new Date(now);
  for (let i = 0; out.length < days && i <= days; i++) {
    const d = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate() + i,
      opts.hour,
      opts.minute,
    );
    if (i === 0 && (opts.todayDone || d.getTime() <= now)) continue;
    out.push(d.getTime());
  }
  return out;
}
