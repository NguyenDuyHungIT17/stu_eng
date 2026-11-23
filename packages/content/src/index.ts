import type { PhraseContent, PlacementQuestion, ScenarioContent, TopicContent } from '@app/shared';
import complaints from '../data/phrases/complaints.json';
import dailyLife from '../data/phrases/daily-life.json';
import directions from '../data/phrases/directions.json';
import feelingsOpinions from '../data/phrases/feelings-opinions.json';
import greetings from '../data/phrases/greetings.json';
import health from '../data/phrases/health.json';
import jobInterview from '../data/phrases/job-interview.json';
import makingPlans from '../data/phrases/making-plans.json';
import meetings from '../data/phrases/meetings.json';
import negotiation from '../data/phrases/negotiation.json';
import phoneCalls from '../data/phrases/phone-calls.json';
import politeRequests from '../data/phrases/polite-requests.json';
import presentations from '../data/phrases/presentations.json';
import restaurant from '../data/phrases/restaurant.json';
import shopping from '../data/phrases/shopping.json';
import smallTalk from '../data/phrases/small-talk.json';
import travel from '../data/phrases/travel.json';
import workplace from '../data/phrases/workplace.json';
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
export const phrases = [
  ...complaints,
  ...dailyLife,
  ...directions,
  ...feelingsOpinions,
  ...greetings,
  ...health,
  ...jobInterview,
  ...makingPlans,
  ...meetings,
  ...negotiation,
  ...phoneCalls,
  ...politeRequests,
  ...presentations,
  ...restaurant,
  ...shopping,
  ...smallTalk,
  ...travel,
  ...workplace,
] as PhraseContent[];
export const scenarios = scenariosJson as ScenarioContent[];
export const placement = placementJson as PlacementQuestion[];

export function getScenario(id: string): ScenarioContent | undefined {
  return scenarios.find((s) => s.id === id);
}

export { validateBundle } from './validate-bundle';
