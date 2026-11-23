/** Id ngẫu nhiên cho dòng dữ liệu trên máy (không cần chuẩn UUID, chỉ cần không trùng). */
export function createId(now: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${now.toString(36)}-${rand}`;
}
