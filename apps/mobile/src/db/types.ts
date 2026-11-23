import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Kiểu database dùng trong mọi repository.
 * Chế độ `sync` khớp cả expo-sqlite (trên máy) và better-sqlite3 (trong test).
 */
// biome-ignore lint/suspicious/noExplicitAny: kiểu kết quả `run` khác nhau giữa hai driver
export type Db = BaseSQLiteDatabase<'sync', any, typeof schema>;
