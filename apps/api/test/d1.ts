import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

const migrationsDir = join(import.meta.dirname, '../migrations');

/** Tạo D1 local trong bộ nhớ (không lưu ra đĩa) và chạy toàn bộ migration. */
export async function createTestDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: join(import.meta.dirname, '../wrangler.toml'),
    persist: false,
  });
  const db = proxy.env.DB;
  for (const file of readdirSync(migrationsDir).sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    for (const stmt of sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)) {
      await db.prepare(stmt).run();
    }
  }
  return { db, dispose: () => proxy.dispose() };
}
