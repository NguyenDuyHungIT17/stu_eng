import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RawBundle } from './validate-bundle';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

/** Đọc toàn bộ thư mục data/ từ đĩa (dùng cho script validate và test, không dùng trong app). */
export function loadFromDisk(dataDir: string): RawBundle & { dialogueFiles: string[] } {
  const dialogueFiles = readdirSync(join(dataDir, 'dialogues'))
    .filter((f) => f.endsWith('.json'))
    .sort();
  const dialogues = dialogueFiles.flatMap(
    (f) => readJson(join(dataDir, 'dialogues', f)) as unknown[],
  );
  return {
    contentVersion: readJson(join(dataDir, 'version.json')),
    topics: readJson(join(dataDir, 'topics.json')) as unknown[],
    dialogues,
    scenarios: readJson(join(dataDir, 'scenarios.json')) as unknown[],
    placement: readJson(join(dataDir, 'placement.json')) as unknown[],
    dialogueFiles,
  };
}
