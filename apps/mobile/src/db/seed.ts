import type { PhraseContent, TopicContent } from '@app/shared';
import { and, eq, inArray, isNull, not } from 'drizzle-orm';
import { phrases, topics } from './schema';
import { getSetting, SettingKey, setSetting } from './settings';
import type { Db } from './types';

export type ContentBundle = {
  contentVersion: number;
  topics: TopicContent[];
  phrases: PhraseContent[];
};

/**
 * Nạp nội dung học từ gói vào SQLite theo `contentVersion`. Xem Thiết kế kỹ thuật §5.
 * - Cùng phiên bản → bỏ qua (trả `false`).
 * - Upsert chủ đề và cụm từ theo id; dòng không còn trong gói thì gán `deletedAt` (không xóa).
 * - Không bao giờ chạm `review_cards`, `review_logs`, `notes`, `chat_*`, và cụm `isCustom`.
 * - Tất cả trong một transaction.
 */
export function seedContent(db: Db, bundle: ContentBundle, now: number): boolean {
  if (getSetting(db, SettingKey.contentVersion) === String(bundle.contentVersion)) return false;

  db.transaction((tx) => {
    for (const t of bundle.topics) {
      const row = { title: t.title, level: t.level, sortOrder: t.sortOrder, deletedAt: null };
      tx.insert(topics)
        .values({ id: t.id, ...row })
        .onConflictDoUpdate({ target: topics.id, set: row })
        .run();
    }

    bundle.phrases.forEach((p, i) => {
      const row = {
        topicId: p.topicId,
        text: p.text,
        ipa: p.ipa ?? null,
        meaningVi: p.meaningVi,
        example: p.example ?? null,
        register: p.register ?? null,
        level: p.level,
        sortOrder: i,
        deletedAt: null,
      };
      tx.insert(phrases)
        .values({ id: p.id, isCustom: false, ...row })
        .onConflictDoUpdate({ target: phrases.id, set: row, setWhere: eq(phrases.isCustom, false) })
        .run();
    });

    const topicIds = bundle.topics.map((t) => t.id);
    const phraseIds = bundle.phrases.map((p) => p.id);
    // inArray với mảng rỗng sinh SQL "false", nên not(...) thành "true": đúng ý (gỡ tất cả).
    tx.update(topics)
      .set({ deletedAt: now })
      .where(and(isNull(topics.deletedAt), not(inArray(topics.id, topicIds))))
      .run();
    tx.update(phrases)
      .set({ deletedAt: now })
      .where(
        and(
          eq(phrases.isCustom, false),
          isNull(phrases.deletedAt),
          not(inArray(phrases.id, phraseIds)),
        ),
      )
      .run();

    setSetting(tx as unknown as Db, SettingKey.contentVersion, String(bundle.contentVersion));
  });
  return true;
}
