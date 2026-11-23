import {
  ContentVersion,
  DialogueContent,
  PlacementQuestion,
  ScenarioContent,
  TopicContent,
} from '@app/shared';
import type { z } from 'zod';
import { dialogueToPhrases } from './dialogues';

export type RawBundle = {
  contentVersion: unknown;
  topics: unknown[];
  dialogues: unknown[];
  scenarios: unknown[];
  placement: unknown[];
};

function checkList<S extends z.ZodType>(
  name: string,
  schema: S,
  items: unknown[],
  errors: string[],
) {
  const parsed: z.infer<S>[] = [];
  items.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) {
      parsed.push(r.data);
    } else {
      for (const issue of r.error.issues) {
        errors.push(`${name}[${i}].${issue.path.join('.')}: ${issue.message}`);
      }
    }
  });
  return parsed;
}

function checkDuplicates(name: string, ids: string[], errors: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${name}: trùng id "${id}"`);
    seen.add(id);
  }
}

/** Kiểm tra schema và tham chiếu chéo của toàn bộ nội dung. Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateBundle(bundle: RawBundle): string[] {
  const errors: string[] = [];

  const v = ContentVersion.safeParse(bundle.contentVersion);
  if (!v.success) errors.push('version.json: cần { "contentVersion": số nguyên >= 1 }');

  const topics = checkList('topics', TopicContent, bundle.topics, errors);
  const dialogues = checkList('dialogues', DialogueContent, bundle.dialogues, errors);
  const scenarios = checkList('scenarios', ScenarioContent, bundle.scenarios, errors);
  const placement = checkList('placement', PlacementQuestion, bundle.placement, errors);

  checkDuplicates(
    'topics',
    topics.map((t) => t.id),
    errors,
  );
  checkDuplicates(
    'dialogues',
    dialogues.map((d) => d.id),
    errors,
  );
  checkDuplicates(
    'câu hội thoại',
    dialogues.flatMap(dialogueToPhrases).map((p) => p.id),
    errors,
  );
  checkDuplicates(
    'scenarios',
    scenarios.map((s) => s.id),
    errors,
  );
  checkDuplicates(
    'placement',
    placement.map((q) => q.id),
    errors,
  );

  const topicIds = new Set(topics.map((t) => t.id));
  for (const d of dialogues) {
    if (!topicIds.has(d.topicId))
      errors.push(`dialogues "${d.id}": topicId "${d.topicId}" không tồn tại`);
  }

  return errors;
}
