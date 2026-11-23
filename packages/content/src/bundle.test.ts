import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dialogues, getScenario, phrases, scenarios, topics } from './index';
import { loadFromDisk } from './load-from-disk';
import { validateBundle } from './validate-bundle';

const dataDir = fileURLToPath(new URL('../data', import.meta.url));
const disk = loadFromDisk(dataDir);

describe('nội dung đóng gói', () => {
  it('toàn bộ dữ liệu trên đĩa hợp lệ', () => {
    expect(validateBundle(disk)).toEqual([]);
  });

  it('index.ts import đủ mọi file trong data/dialogues', () => {
    const bundledIds = dialogues.map((d) => d.id).sort();
    const diskIds = (disk.dialogues as { id: string }[]).map((d) => d.id).sort();
    expect(bundledIds).toEqual(diskIds);
  });

  it('mỗi câu hội thoại thành một phrase có ngữ cảnh', () => {
    const total = dialogues.reduce((n, d) => n + d.lines.length, 0);
    expect(phrases).toHaveLength(total);
    expect(phrases[0]).toMatchObject({ dialogueId: dialogues[0]?.id, lineNo: 0 });
  });

  it('có chủ đề và kịch bản', () => {
    expect(topics.length).toBeGreaterThan(0);
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('getScenario tìm theo id', () => {
    expect(getScenario('restaurant-order')?.level).toBe('A2');
    expect(getScenario('nope')).toBeUndefined();
  });
});
