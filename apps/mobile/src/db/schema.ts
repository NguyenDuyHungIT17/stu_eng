import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Schema SQLite trên máy cho MVP. Xem Thiết kế kỹ thuật §5. Đổi schema → `pnpm db:generate`. */

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  level: text('level').notNull(), // A1 | A2 | B1 | B2
  sortOrder: integer('sort_order').notNull().default(0),
  deletedAt: integer('deleted_at'), // chủ đề bị gỡ khỏi gói nội dung: ẩn, không xóa
});

export const phrases = sqliteTable(
  'phrases',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').notNull(),
    text: text('text').notNull(),
    ipa: text('ipa'),
    meaningVi: text('meaning_vi').notNull(),
    example: text('example'),
    register: text('register'), // formal | neutral | casual
    level: text('level').notNull(),
    /** Thứ tự trong gói nội dung, để học cụm mới theo đúng trình tự biên soạn. */
    sortOrder: integer('sort_order').notNull().default(0),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    deletedAt: integer('deleted_at'), // nội dung bị gỡ khỏi gói: ẩn, không xóa
  },
  (t) => [index('phrases_topic_idx').on(t.topicId)],
);

/** Trạng thái FSRS lưu JSON; cột `due` tách riêng để truy vấn bằng index. */
export const reviewCards = sqliteTable(
  'review_cards',
  {
    phraseId: text('phrase_id').primaryKey(),
    due: integer('due').notNull(), // epoch ms
    fsrsState: text('fsrs_state').notNull(),
    createdAt: integer('created_at').notNull(), // dùng để đếm số thẻ mới trong ngày
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('review_cards_due_idx').on(t.due),
    index('review_cards_created_idx').on(t.createdAt),
  ],
);

export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: text('id').primaryKey(),
    phraseId: text('phrase_id').notNull(),
    rating: integer('rating').notNull(), // 1 Again, 2 Hard, 3 Good, 4 Easy
    exerciseType: text('exercise_type').notNull(), // flip | choose_meaning | listen_choose
    reviewedAt: integer('reviewed_at').notNull(),
  },
  (t) => [index('review_logs_phrase_idx').on(t.phraseId)],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    body: text('body').notNull(),
    tags: text('tags').notNull().default('[]'), // JSON mảng chuỗi
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    source: text('source').notNull().default('manual'), // manual | vocab | chat
    sourceRef: text('source_ref'), // phraseId hoặc chatMessageId
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('notes_updated_idx').on(t.updatedAt)],
);

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull(),
  level: text('level').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  feedbackJson: text('feedback_json'),
});

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    role: text('role').notNull(), // user | assistant
    content: text('content').notNull(),
    explanationVi: text('explanation_vi'), // cache kết quả "Giải thích tiếng Việt"
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('chat_messages_session_idx').on(t.sessionId, t.createdAt)],
);

/** Một dòng mỗi ngày (giờ máy) để tính streak và thống kê. */
export const dailyActivity = sqliteTable('daily_activity', {
  day: text('day').primaryKey(), // yyyy-mm-dd theo giờ máy
  newCards: integer('new_cards').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  chatSessions: integer('chat_sessions').notNull().default(0),
  studySeconds: integer('study_seconds').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // level, dailyNewLimit, voice, rate, reminderTime, content_version...
});
