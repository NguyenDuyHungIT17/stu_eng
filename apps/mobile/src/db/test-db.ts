import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import type { Db } from './types';

/** Database SQLite trong bộ nhớ, đã chạy đúng các migration của app. Chỉ dùng trong test. */
export function createTestDb(): Db {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  return db;
}
