/**
 * Quy ước "ngày" trên máy: theo giờ địa phương của điện thoại.
 * Mọi chỗ cần tính ngày (thẻ mới trong ngày, streak, daily_activity) phải đi qua file này.
 */

type DateInput = Date | number;

const toDate = (d: DateInput) => (typeof d === 'number' ? new Date(d) : d);
const pad = (n: number) => String(n).padStart(2, '0');

/** Khóa ngày dạng `yyyy-mm-dd` theo giờ máy. */
export function localDayKey(d: DateInput): string {
  const x = toDate(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** 00:00 của ngày (giờ máy) chứa `d`, dạng epoch ms. */
export function startOfLocalDay(d: DateInput): number {
  const x = toDate(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
}

/** Cộng `days` ngày lịch (giữ giờ trong ngày). */
export function addLocalDays(d: DateInput, days: number): Date {
  const x = new Date(toDate(d).getTime());
  x.setDate(x.getDate() + days);
  return x;
}
