/**
 * Chuẩn hóa chuỗi để tìm kiếm: chữ thường, bỏ dấu tiếng Việt (kể cả đ → d), gộp khoảng trắng.
 * "Chào BẠN  đẹp" → "chao ban dep".
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape ký tự đặc biệt của LIKE (dùng kèm `ESCAPE '\'`). */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
