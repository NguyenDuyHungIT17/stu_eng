const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Ho_Chi_Minh, không có giờ mùa hè
const DAY_MS = 24 * 60 * 60 * 1000;

/** Khoá ngày yyyy-mm-dd theo giờ Việt Nam. Dùng cho quota (BRD §5.1). */
export function vnDayKey(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Thời điểm 00:00 giờ Việt Nam kế tiếp, dạng ISO (UTC). */
export function nextVnMidnightIso(now: Date): string {
  const vnNow = now.getTime() + VN_OFFSET_MS;
  const nextVnMidnight = Math.floor(vnNow / DAY_MS) * DAY_MS + DAY_MS;
  return new Date(nextVnMidnight - VN_OFFSET_MS).toISOString();
}

/** Khoá ngày cách `now` một số ngày (âm = quá khứ). */
export function vnDayKeyOffset(now: Date, days: number): string {
  return vnDayKey(new Date(now.getTime() + days * DAY_MS));
}
