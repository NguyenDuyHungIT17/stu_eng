import type {
  DialogueContent,
  PhraseContent,
  PlacementQuestion,
  ScenarioContent,
  TopicContent,
} from '@app/shared';
import complaints from '../data/dialogues/complaints.json';
import dailyLife from '../data/dialogues/daily-life.json';
import directions from '../data/dialogues/directions.json';
import feelingsOpinions from '../data/dialogues/feelings-opinions.json';
import greetings from '../data/dialogues/greetings.json';
import health from '../data/dialogues/health.json';
import jobInterview from '../data/dialogues/job-interview.json';
import makingPlans from '../data/dialogues/making-plans.json';
import meetings from '../data/dialogues/meetings.json';
import negotiation from '../data/dialogues/negotiation.json';
import phoneCalls from '../data/dialogues/phone-calls.json';
import politeRequests from '../data/dialogues/polite-requests.json';
import presentations from '../data/dialogues/presentations.json';
import restaurant from '../data/dialogues/restaurant.json';
import shopping from '../data/dialogues/shopping.json';
import smallTalk from '../data/dialogues/small-talk.json';
import travel from '../data/dialogues/travel.json';
import workplace from '../data/dialogues/workplace.json';
import placementJson from '../data/placement.json';
import scenariosJson from '../data/scenarios.json';
import topicsJson from '../data/topics.json';
import versionJson from '../data/version.json';
import { dialogueToPhrases } from './dialogues';

/**
 * Nội dung học được đóng gói vào app và API: các đoạn hội thoại theo chủ đề.
 * Thêm file mới trong data/dialogues thì chạy `python scripts/gen-index.py`;
 * test `bundle.test.ts` sẽ báo nếu quên. Dữ liệu đã được validate trong CI, nên ép kiểu ở đây là an toàn.
 */
export const contentVersion: number = versionJson.contentVersion;
export const topics = topicsJson as TopicContent[];
export const dialogues = [
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
] as DialogueContent[];
/** Mỗi câu hội thoại là một mục ôn tập. */
export const phrases: PhraseContent[] = dialogues.flatMap(dialogueToPhrases);
export const scenarios = scenariosJson as ScenarioContent[];
export const placement = placementJson as PlacementQuestion[];

export function getScenario(id: string): ScenarioContent | undefined {
  return scenarios.find((s) => s.id === id);
}

export { dialogueToPhrases, lineId } from './dialogues';
export { validateBundle } from './validate-bundle';
