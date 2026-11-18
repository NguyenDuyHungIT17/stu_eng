import type { PhraseContent, PlacementQuestion, ScenarioContent, TopicContent } from '@app/shared';
import greetings from '../data/phrases/greetings.json';
import meetings from '../data/phrases/meetings.json';
import restaurant from '../data/phrases/restaurant.json';
import placementJson from '../data/placement.json';
import scenariosJson from '../data/scenarios.json';
import topicsJson from '../data/topics.json';
import versionJson from '../data/version.json';

/**
 * Nội dung học được đóng gói vào app và API.
 * Thêm file mới trong data/phrases thì phải import ở đây; test `bundle.test.ts` sẽ báo nếu quên.
 * Dữ liệu đã được validate trong CI (`pnpm validate:content`), nên ép kiểu ở đây là an toàn.
 */
export const contentVersion: number = versionJson.contentVersion;
export const topics = topicsJson as TopicContent[];
export const phrases = [...greetings, ...restaurant, ...meetings] as PhraseContent[];
export const scenarios = scenariosJson as ScenarioContent[];
export const placement = placementJson as PlacementQuestion[];

export function getScenario(id: string): ScenarioContent | undefined {
  return scenarios.find((s) => s.id === id);
}

export { validateBundle } from './validate-bundle';
