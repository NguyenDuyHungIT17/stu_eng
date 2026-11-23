import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getScenario, phrases, scenarios, topics } from './index';
import { loadFromDisk } from './load-from-disk';
import { validateBundle } from './validate-bundle';

const dataDir = fileURLToPath(new URL('../data', import.meta.url));
const disk = loadFromDisk(dataDir);

describe('nội dung đóng gói', () => {
  it('toàn bộ dữ liệu trên đĩa hợp lệ', () => {
    expect(validateBundle(disk)).toEqual([]);
  });

  it('index.ts import đủ mọi file trong data/phrases', () => {
    const bundledIds = phrases.map((p) => p.id).sort();
    const diskIds = (disk.phrases as { id: string }[]).map((p) => p.id).sort();
    expect(bundledIds).toEqual(diskIds);
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
