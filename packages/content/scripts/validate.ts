import { fileURLToPath } from 'node:url';
import { loadFromDisk } from '../src/load-from-disk';
import { validateBundle } from '../src/validate-bundle';

const dataDir = fileURLToPath(new URL('../data', import.meta.url));
const bundle = loadFromDisk(dataDir);
const errors = validateBundle(bundle);

if (errors.length > 0) {
  console.error(`Nội dung KHÔNG hợp lệ (${errors.length} lỗi):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `Nội dung hợp lệ: ${bundle.topics.length} chủ đề, ${bundle.phrases.length} cụm từ ` +
    `(${bundle.phraseFiles.length} file), ${bundle.scenarios.length} kịch bản, ` +
    `${bundle.placement.length} câu xếp trình độ.`,
);
