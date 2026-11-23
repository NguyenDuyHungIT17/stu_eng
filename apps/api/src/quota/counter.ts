/** Tăng bộ đếm của `key` lên 1 và trả về giá trị mới. Nguyên tử nhờ một câu SQL duy nhất. */
export async function hit(db: D1Database, key: string, day: string): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO usage (key, day, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, day)
    .first<{ count: number }>();
  return row?.count ?? 1;
}

/** Đọc bộ đếm hiện tại (0 nếu chưa có). */
export async function peek(db: D1Database, key: string): Promise<number> {
  const row = await db
    .prepare('SELECT count FROM usage WHERE key = ?1')
    .bind(key)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

/** Trả lại một lượt (best-effort khi LLM lỗi hoàn toàn). */
export async function undo(db: D1Database, key: string): Promise<void> {
  await db.prepare('UPDATE usage SET count = MAX(count - 1, 0) WHERE key = ?1').bind(key).run();
}

/** Xoá các dòng có ngày nhỏ hơn `day` (chạy bởi Cron Trigger). */
export async function purgeBefore(db: D1Database, day: string): Promise<void> {
  await db.prepare('DELETE FROM usage WHERE day < ?1').bind(day).run();
}
