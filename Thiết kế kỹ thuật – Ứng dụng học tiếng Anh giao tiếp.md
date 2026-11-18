# Thiết kế kỹ thuật – Ứng dụng học tiếng Anh giao tiếp

*Kiến trúc, tech stack, cấu trúc source code và kế hoạch triển khai. Phiên bản 1.1, ngày 18/11/2026. Đi kèm BRD v1.1. Tiến độ chi tiết theo dõi trong `PLAN.md`.*

## 0. Thay đổi so với v1.0

| # | Thay đổi | Lý do |
| --- | --- | --- |
| 1 | Quota chuyển từ **Cloudflare KV sang D1** | KV gói free giới hạn số lượt ghi mỗi ngày rất thấp, mỗi khóa chỉ ghi được khoảng 1 lần/giây và không có thao tác nguyên tử; D1 đếm chính xác bằng một câu SQL |
| 2 | Client SSE dùng **`expo/fetch`** (hỗ trợ đọc stream), có phương án dự phòng | `fetch` mặc định của React Native không đọc được body theo từng đoạn |
| 3 | Voice loop MVP: **chạm để nói / chạm để ngắt**; STT luôn tắt khi TTS đang đọc | Tránh vọng âm TTS vào mic; chế độ rảnh tay để P1 |
| 4 | Thêm endpoint `POST /chat/explain` và hạn mức riêng | Đáp ứng FR-A-05, FR-A-10 |
| 5 | Test mobile dùng **jest-expo**; Vitest chỉ cho `api`, `shared`, `content` | Hệ sinh thái RN/Expo dựa trên Jest |
| 6 | Bổ sung cấu hình Metro + pnpm, migration Drizzle, ký APK khi `expo prebuild` | Các điểm dễ vướng khi dựng môi trường |
| 7 | Schema: bỏ `notes.audio_ref`, thêm `notes.source_ref`, bảng `daily_activity`, bảng ảo FTS5 cho ghi chú | Khớp BRD v1.1 (FR-N-03, FR-N-05, FR-P-03) |
| 8 | Quy tắc seed nội dung theo phiên bản (upsert, không đụng tiến độ học) | Tránh mất dữ liệu khi cập nhật nội dung |
| 9 | Feedback dùng chế độ trả JSON của nhà cung cấp nếu có | Giảm lỗi JSON sai định dạng |
| 10 | Sprint 0 có danh sách **spike kiểm chứng** bắt buộc; kế hoạch chia lại thành 3a/3b | Đẩy rủi ro lớn ra sớm |

## 1. Mục tiêu kỹ thuật và ràng buộc

| Hạng mục | Quyết định |
| --- | --- |
| Nền tảng | Android (APK), một codebase TypeScript |
| Chi phí hạ tầng | 0 đồng: chỉ dùng các gói miễn phí |
| Ưu tiên | Offline-first; chỉ hội thoại AI cần mạng |
| Đội ngũ | 1 lập trình viên (backend quen thuộc, frontend mobile mới): ưu tiên công cụ ít cấu hình, ít thứ phải tự vận hành |
| Không cần Docker | Dev, test và build đều chạy không cần container |

**Lưu ý về phiên bản:** không ghi cứng số phiên bản. Khi khởi tạo, dùng bản stable mới nhất của từng công cụ và đối chiếu yêu cầu Node/JDK/Android SDK trong tài liệu chính thức của Expo. Ghi lại các phiên bản đã chọn vào README sau Sprint 0.

**Lưu ý về gói miễn phí:** hạn mức của nhà cung cấp AI và Cloudflare thay đổi thường xuyên. Mọi con số hạn mức trong tài liệu này phải **kiểm tra lại trên trang chính thức** ở Sprint 0 và ghi vào `PLAN.md` (bảng kết quả spike). Kiến trúc cho phép đổi nhà cung cấp chỉ bằng cấu hình.

## 2. Kiến trúc tổng thể

```
┌──────────────────────── Điện thoại Android ────────────────────────┐
│  Expo / React Native app                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │
│  │ Vocab+FSRS │ │   Notes    │ │ Progress / │ │ Chat AI        │   │
│  │            │ │  (+FTS5)   │ │ Onboarding │ │ (chạm để nói)  │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘   │
│        └──────────────┴── SQLite (Drizzle) ───────────┘            │
│  STT/TTS của Android (on-device, miễn phí)        │ HTTPS + SSE     │
│                                                   │ (expo/fetch)    │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    ▼
                         ┌────── Cloudflare Workers (Hono) ──────┐
                         │  middleware: device-id, rate limit    │
                         │  routes: /chat, /chat/explain,        │
                         │          /chat/feedback, /quota, ...  │
                         │  LLM Gateway (fallback, OpenAI-compat)│
                         └───────┬───────────────┬───────────────┘
                                 ▼               ▼
                          D1 (bộ đếm quota)  Gemini / Groq / OpenRouter ...
```

**Nguyên tắc kiến trúc:**

1. **Dữ liệu người dùng nằm trên máy** (SQLite). Backend không giữ dữ liệu học ở MVP.
2. **Backend mỏng, không trạng thái nghiệp vụ:** chỉ làm proxy AI an toàn. D1 chỉ chứa bộ đếm quota, không chứa nội dung.
3. **Giọng nói xử lý trên thiết bị:** app chỉ gửi văn bản lên backend.
4. **Nội dung học đóng gói trong app** (JSON seed), cập nhật theo bản phát hành.
5. **Schema dùng chung** giữa app và backend viết một lần bằng Zod trong `packages/shared`.

## 3. Tech stack

| Tầng | Công nghệ | Lý do chọn |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Chia sẻ code, build có cache. Dùng `node-linker=hoisted` để Metro chạy ổn |
| Ngôn ngữ | TypeScript chế độ strict | Một ngôn ngữ cho cả app và API |
| Mobile | Expo (React Native, kiến trúc mới) + development build | Một codebase, có sẵn mic, audio, thông báo |
| Điều hướng | Expo Router | Routing theo cấu trúc file |
| UI | NativeWind | Viết nhanh, hỗ trợ dark mode |
| State UI | Zustand | Nhẹ, ít boilerplate |
| Gọi API | TanStack Query + `expo/fetch` | Cache, retry; `expo/fetch` đọc được stream SSE |
| DB cục bộ | expo-sqlite + Drizzle ORM | Offline-first, type-safe, có migration |
| Tìm kiếm ghi chú | SQLite FTS5 (bảng ảo) | Tìm dưới 1 giây với hàng nghìn ghi chú |
| Ôn tập ngắt quãng | ts-fsrs | Thuật toán FSRS thuần JS |
| Nhận diện giọng nói | expo-speech-recognition | Dùng engine của Android, miễn phí |
| Đọc văn bản | expo-speech | TTS hệ thống, miễn phí |
| Âm thanh (P1) | expo-audio | Phát và thu âm cho luyện nghe, shadowing |
| Thông báo | expo-notifications | Nhắc học bằng local notification |
| Backend | Hono + Zod trên Cloudflare Workers | Gói free, không quản server |
| Lưu quota | **Cloudflare D1** | Đếm nguyên tử bằng `INSERT ... ON CONFLICT ... RETURNING` |
| AI | LLM Gateway gọi Gemini/Groq/OpenRouter | Chuẩn OpenAI-compatible, có fallback |
| Lint, format | Biome | Thay ESLint và Prettier |
| Test | Vitest (api, shared, content), jest-expo + Testing Library (mobile), Maestro (e2e) | Dùng đúng công cụ cho từng môi trường |
| CI/CD | GitHub Actions | Build APK không cần cài Android SDK trên máy |

**Tại sao không chọn phương án khác:**

- *Flutter/Kotlin:* phải học thêm ngôn ngữ, mất khả năng dùng chung schema với backend.
- *Firebase/Supabase làm backend chính:* MVP chưa cần vì dữ liệu nằm trên máy.
- *Server riêng + Docker:* tốn công vận hành.
- *KV cho quota (bản v1.0):* hạn mức ghi thấp, không nguyên tử, khóa "toàn cục" bị ghi liên tục.

## 4. Cấu trúc source code

```
english-app/
├─ apps/
│  ├─ mobile/                       # Expo app
│  │  ├─ app/                       # Expo Router
│  │  │  ├─ (tabs)/
│  │  │  │  ├─ index.tsx            # Trang chủ: thẻ cần ôn, mục tiêu ngày, streak
│  │  │  │  ├─ learn.tsx            # Chủ đề và cụm từ
│  │  │  │  ├─ chat.tsx             # Danh sách kịch bản, lượt còn lại
│  │  │  │  ├─ notes.tsx
│  │  │  │  └─ settings.tsx
│  │  │  ├─ chat/[scenarioId].tsx   # Màn hình hội thoại
│  │  │  ├─ chat/summary/[sessionId].tsx
│  │  │  ├─ review.tsx              # Phiên ôn tập
│  │  │  ├─ notes/[id].tsx          # Sửa ghi chú
│  │  │  ├─ onboarding/             # Quyền riêng tư, mục tiêu, xếp trình độ, kiểm tra giọng TTS
│  │  │  └─ _layout.tsx
│  │  ├─ src/
│  │  │  ├─ features/
│  │  │  │  ├─ vocab/               # components, hooks, repository
│  │  │  │  ├─ review/              # phiên ôn, bài tập
│  │  │  │  ├─ notes/
│  │  │  │  ├─ chat/                # voice controller, stream client, sentence splitter
│  │  │  │  ├─ onboarding/          # bài xếp trình độ
│  │  │  │  └─ progress/            # streak, thống kê, daily_activity
│  │  │  ├─ db/
│  │  │  │  ├─ schema.ts
│  │  │  │  ├─ client.ts
│  │  │  │  ├─ migrations/          # sinh bởi drizzle-kit
│  │  │  │  └─ seed.ts              # nạp nội dung từ packages/content
│  │  │  ├─ services/
│  │  │  │  ├─ stt.ts  tts.ts
│  │  │  │  ├─ api-client.ts        # gọi backend, đọc SSE qua expo/fetch
│  │  │  │  └─ notifications.ts
│  │  │  ├─ components/             # UI dùng chung
│  │  │  └─ lib/                    # fsrs.ts, device-id.ts, day.ts, config.ts
│  │  ├─ plugins/
│  │  │  └─ with-release-signing.js # config plugin ký APK khi prebuild
│  │  ├─ metro.config.js            # thêm đuôi .sql cho migration
│  │  ├─ babel.config.js            # inline-import cho .sql
│  │  ├─ app.config.ts
│  │  └─ package.json
│  └─ api/                          # Hono trên Cloudflare Workers
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ routes/
│     │  │  ├─ chat.ts
│     │  │  ├─ explain.ts
│     │  │  ├─ feedback.ts
│     │  │  ├─ quota.ts
│     │  │  └─ health.ts
│     │  ├─ llm/
│     │  │  ├─ gateway.ts           # fallback, gọi không stream / có stream
│     │  │  ├─ sse-parser.ts        # parse stream OpenAI-compatible
│     │  │  ├─ providers.ts         # đọc cấu hình nhà cung cấp từ env
│     │  │  └─ prompts/             # chat, explain, feedback
│     │  ├─ quota/
│     │  │  └─ counter.ts           # đếm bằng D1
│     │  ├─ middleware/
│     │  │  ├─ device-id.ts
│     │  │  ├─ rate-limit.ts
│     │  │  └─ error.ts
│     │  └─ env.ts
│     ├─ migrations/                # D1 migration
│     ├─ wrangler.toml
│     └─ package.json
├─ packages/
│  ├─ shared/                       # Zod schema và type dùng chung
│  │  └─ src/{chat.ts, content.ts, levels.ts, quota.ts}
│  └─ content/                      # nội dung học dạng JSON + script validate
│     ├─ topics/*.json
│     ├─ phrases/*.json
│     ├─ scenarios/*.json
│     ├─ placement/*.json           # câu hỏi xếp trình độ
│     ├─ version.json               # { "contentVersion": N }
│     └─ scripts/validate.ts
├─ .github/workflows/{ci.yml, android-apk.yml, api-deploy.yml}
├─ .npmrc                           # node-linker=hoisted
├─ biome.json  turbo.json  pnpm-workspace.yaml  package.json
├─ docs/adr/                        # ADR mới sau v1.1
├─ PLAN.md
└─ README.md
```

**Quy tắc tổ chức:**

- Mỗi thư mục trong `features/` tự chứa màn hình con, hook và logic. Feature không import trực tiếp lẫn nhau; dùng chung qua `components/`, `lib/`, `db/`.
- Truy cập database chỉ qua *repository* trong từng feature.
- `packages/shared` là nguồn sự thật duy nhất cho dữ liệu trao đổi giữa app và API.
- `packages/content` có script validate bằng Zod chạy trong CI (đúng schema, không trùng id, tham chiếu `topicId` hợp lệ).

## 5. Mô hình dữ liệu (SQLite trên máy)

```ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  level: text('level').notNull(), // A1 | A2 | B1 | B2
  sortOrder: integer('sort_order').notNull().default(0),
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
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    deletedAt: integer('deleted_at'), // nội dung bị gỡ khỏi gói: ẩn, không xóa
  },
  (t) => [index('phrases_topic_idx').on(t.topicId)],
);

// Trạng thái FSRS lưu JSON; cột due tách riêng để truy vấn bằng index.
export const reviewCards = sqliteTable(
  'review_cards',
  {
    phraseId: text('phrase_id').primaryKey(),
    due: integer('due').notNull(), // epoch ms
    fsrsState: text('fsrs_state').notNull(),
    createdAt: integer('created_at').notNull(), // dùng để đếm số thẻ mới trong ngày
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('review_cards_due_idx').on(t.due)],
);

export const reviewLogs = sqliteTable('review_logs', {
  id: text('id').primaryKey(),
  phraseId: text('phrase_id').notNull(),
  rating: integer('rating').notNull(), // 1 Again, 2 Hard, 3 Good, 4 Easy
  exerciseType: text('exercise_type').notNull(), // flip | choose_meaning | listen_choose
  reviewedAt: integer('reviewed_at').notNull(),
});

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

// Một dòng mỗi ngày (giờ địa phương) để tính streak và thống kê.
export const dailyActivity = sqliteTable('daily_activity', {
  day: text('day').primaryKey(), // yyyy-mm-dd theo giờ máy
  newCards: integer('new_cards').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  chatSessions: integer('chat_sessions').notNull().default(0),
  studySeconds: integer('study_seconds').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // level, dailyNewLimit, voice, rate, reminderTime, theme, content_version, privacy_ack...
});

// P1: speaking_attempts (shadowing) thêm bằng migration khi làm Sprint 5.
```

**Tìm kiếm ghi chú (FTS5):** tạo bảng ảo bằng SQL viết tay trong migration, đồng bộ bằng trigger:

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(body, tags, content='notes', content_rowid='rowid');
-- trigger AFTER INSERT / UPDATE / DELETE trên notes để cập nhật notes_fts
```

Nếu spike cho thấy build expo-sqlite không có FTS5, dùng `LIKE` (vẫn đạt dưới 1 giây với 1.000 ghi chú) và ghi lại quyết định.

**Migration:** sinh bằng `drizzle-kit generate` (driver expo), chạy bằng `useMigrations` khi app khởi động, trước khi seed. Cần `babel-plugin-inline-import` cho đuôi `.sql` và thêm `sql` vào `resolver.sourceExts` trong `metro.config.js`.

**Seed nội dung theo phiên bản:**

1. So sánh `contentVersion` trong gói với `settings.content_version`. Bằng nhau thì bỏ qua.
2. Trong một transaction: upsert `topics` và `phrases` theo `id` (chỉ ghi các dòng `isCustom = false`); dòng có trong DB nhưng không còn trong gói thì gán `deletedAt`, **không xóa** để giữ `review_cards`.
3. Không bao giờ chạm vào `review_cards`, `review_logs`, `notes`, `chat_*`.
4. Cập nhật `settings.content_version`.

**Quy ước "ngày" trên máy:** mọi hàm tính ngày đi qua `lib/day.ts` (`localDayKey(date)`, `startOfLocalDay(date)`), không tự tính rải rác.

## 6. Thiết kế các luồng chính

### 6.1 Ôn tập ngắt quãng (FSRS)

1. **Thẻ cần ôn:** `due <= now` và `phrases.deletedAt IS NULL`, sắp theo `due`.
2. **Thẻ mới:** số thẻ mới hôm nay = số `review_cards` có `createdAt >= startOfLocalDay(now)`; còn lại = `dailyNewLimit - số đó`. Chọn cụm chưa có thẻ, theo `topics.sortOrder` và trình độ người dùng.
3. Hiển thị bài tập theo một trong 3 kiểu (lật thẻ, chọn nghĩa, nghe rồi chọn). Đáp án sai được trả về từ các cụm cùng chủ đề.
4. Người học chọn Quên / Khó / Được / Dễ (ở kiểu trắc nghiệm: đúng thì mặc định "Được", sai thì "Quên", cho phép sửa).
5. Gọi `scheduleNext(card, rating, now)` trong `lib/fsrs.ts`; ghi `review_cards`, `review_logs`, `daily_activity` trong **một transaction**.

### 6.2 Hội thoại AI bằng giọng nói (MVP: chạm để nói)

**Máy trạng thái của màn hình chat** (`features/chat/voice-controller.ts`):

```
idle ──chạm mic──▶ listening ──kết quả cuối──▶ thinking ──token đầu──▶ speaking
  ▲                    │ lỗi STT / không quyền          │                 │
  │                    ▼                                ▼                 │
  │                 typing (ô gõ chữ) ───gửi──▶ thinking                  │
  └──────────── AI đọc xong / chạm "Dừng" (Speech.stop) ◀────────────────┘
```

- **STT và TTS không bao giờ chạy cùng lúc.** Chạm mic khi đang `speaking` thì dừng TTS trước rồi mới bật STT.
- Gửi **văn bản**, tối đa 12 lượt gần nhất. Lượt mở đầu của AI lấy từ `scenario.opener` trong nội dung, không tốn request.
- **Cắt câu để đọc sớm:** ghép token vào buffer, khi gặp `.`, `?`, `!` theo sau là khoảng trắng (bỏ qua các viết tắt như `Mr.`, `Dr.`, `e.g.`) thì đẩy câu vào hàng đợi TTS. Đọc tuần tự bằng `Speech.speak` với callback `onDone`.
- **Cập nhật UI theo lô:** gom token và render khoảng 50ms một lần.
- **Lỗi:** STT lỗi hoặc không có quyền thì chuyển sang `typing`. Mất mạng hoặc server trả `upstream_failed` thì hiển thị nút "Thử lại" cho lượt đó, không mất lịch sử.
- **Kết thúc buổi:** gọi `POST /chat/feedback` một lần, lưu vào `chat_sessions.feedbackJson`, cộng `daily_activity.chatSessions`.
- **Giải thích tiếng Việt:** gọi `POST /chat/explain` với câu đó và 2 lượt trước để lấy ngữ cảnh; cache vào `chat_messages.explanationVi`.

**P1 (rảnh tay):** sau khi TTS đọc xong thì tự bật STT; nói chen cần mic mở khi TTS đọc, phải xử lý vọng âm. Làm sau khi có phản hồi người thử.

### 6.3 Kiểm tra giọng TTS lúc onboarding

Gọi `Speech.getAvailableVoicesAsync()`, lọc giọng `en-*`. Nếu không có giọng hoặc chỉ có giọng cần mạng, hiển thị hướng dẫn mở cài đặt TTS của Android để tải gói tiếng Anh. Lưu giọng mặc định vào `settings.voice`.

### 6.4 Xếp trình độ (MVP)

1. Người học tự chọn mức (4 mô tả dễ hiểu tương ứng A1 đến B2).
2. Làm 10 đến 15 câu trắc nghiệm (nghe bằng TTS rồi chọn, đọc rồi chọn), bắt đầu ở mức đã tự chọn, lên hoặc xuống mức theo kết quả từng nhóm 3 câu.
3. Trình độ cuối = kết quả bài; người học sửa được trong Cài đặt. Chạy hoàn toàn offline.

### 6.5 Luyện nghe và luyện nói (P1, ghi chú cho sau)

- **Nghe:** TTS nhiều giọng có trên máy; bài tập định nghĩa trong JSON.
- **Shadowing:** không chạy `expo-audio` thu âm song song với STT (tranh nhau micro). Dùng tùy chọn lưu bản ghi âm của `expo-speech-recognition` (Android 13+); máy cũ hơn chỉ chấm văn bản, không nghe lại.
- So sánh câu ở mức từ bằng khoảng cách chỉnh sửa (sau khi chuẩn hóa chữ thường, bỏ dấu câu, mở rộng dạng viết tắt).

## 7. Thiết kế backend

### 7.1 Hợp đồng API (Zod dùng chung)

```ts
// packages/shared/src/chat.ts
import { z } from 'zod';

export const Level = z.enum(['A1', 'A2', 'B1', 'B2']);

const Message = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(1000),
});

export const ChatRequest = z.object({
  scenarioId: z.string().min(1),
  level: Level,
  messages: z.array(Message).min(1).max(24),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const ExplainRequest = z.object({
  level: Level,
  sentence: z.string().min(1).max(1000),
  context: z.array(Message).max(4),
});
export const ExplainResponse = z.object({
  translation: z.string(),
  notes: z.array(z.object({ phrase: z.string(), meaning: z.string() })).max(5),
});

export const FeedbackRequest = z.object({
  scenarioId: z.string().min(1),
  level: Level,
  messages: z.array(Message).min(2).max(60),
});
export const FeedbackResponse = z.object({
  summary: z.string(),
  mistakes: z.array(z.object({ original: z.string(), better: z.string(), note: z.string() })),
  usefulPhrases: z.array(z.string()),
});

// packages/shared/src/quota.ts
export const QuotaResponse = z.object({
  chat: z.object({ used: z.number(), limit: z.number() }),
  assist: z.object({ used: z.number(), limit: z.number() }), // explain + feedback
  resetsAt: z.string(), // ISO, 00:00 giờ Việt Nam kế tiếp
});
```

**Kịch bản ở server:** `scenarioId` được map sang prompt bằng file JSON trong `packages/content/scenarios`, được bundle vào Worker lúc build. Server **không nhận prompt từ app** để tránh lạm dụng làm chatbot tự do.

| Endpoint | Chức năng | Quota |
| --- | --- | --- |
| `POST /chat` | Stream phản hồi AI (SSE) | Trừ 1 lượt `chat` cho mỗi lượt người học nói |
| `POST /chat/explain` | Giải thích tiếng Việt một câu (JSON) | Trừ 1 lượt `assist` |
| `POST /chat/feedback` | Tổng kết cuối buổi (JSON) | Trừ 1 lượt `assist` |
| `GET /quota` | Số lượt còn lại hôm nay | Không trừ |
| `GET /health` | Kiểm tra dịch vụ | Không cần `X-Device-Id` |
| `POST /vocab/enrich` | Gợi ý nghĩa cho cụm từ tự thêm | P1 |

**Hạn mức mặc định (cấu hình qua biến môi trường):** `CHAT_PER_DEVICE=40`, `ASSIST_PER_DEVICE=20`, `REQ_PER_IP=150`, `GLOBAL_DAILY=1500`. Điều chỉnh theo hạn mức thực tế của nhà cung cấp ghi ở Sprint 0.

### 7.2 Quota bằng D1

```sql
-- apps/api/migrations/0001_usage.sql
CREATE TABLE usage (
  key   TEXT PRIMARY KEY,   -- 'chat:dev:{deviceId}:{day}', 'ip:{ip}:{day}', 'global:{day}'
  day   TEXT NOT NULL,      -- yyyy-mm-dd theo giờ Việt Nam
  count INTEGER NOT NULL
);
CREATE INDEX usage_day_idx ON usage(day);
```

```ts
// apps/api/src/quota/counter.ts
export async function hit(db: D1Database, key: string, day: string): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO usage (key, day, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, day)
    .first<{ count: number }>();
  return row?.count ?? 1;
}
```

- Middleware `rate-limit.ts` gọi `hit` cho ba khóa (thiết bị, IP, toàn cục) bằng `db.batch`. Vượt bất kỳ ngưỡng nào thì trả `429` với mã lỗi `quota_device`, `quota_ip` hoặc `global_budget`.
- Đếm trước khi gọi LLM. Nếu LLM lỗi hoàn toàn thì trừ lại lượt của thiết bị (best-effort).
- **Cron Trigger** hằng ngày xóa các dòng có `day` cũ hơn 2 ngày.
- Ngày tính theo `Asia/Ho_Chi_Minh` (UTC+7, không có giờ mùa hè), hàm `vnDayKey(now)`.

### 7.3 Route chat (khung mã)

```ts
// apps/api/src/routes/chat.ts
export const chat = new Hono<{ Bindings: Env }>().post(
  '/chat',
  zValidator('json', ChatRequest),
  rateLimit('chat'),
  async (c) => {
    const req = c.req.valid('json');
    const scenario = getScenario(req.scenarioId);
    if (!scenario) return c.json({ error: 'unknown_scenario' }, 400);
    const system = buildChatPrompt(scenario, req.level);

    return streamSSE(c, async (stream) => {
      try {
        for await (const token of streamChat(c.env, [
          { role: 'system', content: system },
          ...req.messages,
        ])) {
          await stream.writeSSE({ data: JSON.stringify({ t: token }) });
        }
        await stream.writeSSE({ event: 'done', data: '' });
      } catch {
        await stream.writeSSE({ event: 'error', data: 'upstream_failed' });
      }
    });
  },
);
```

Token gửi dưới dạng JSON (`{"t":"..."}`) để không lỗi khi token chứa xuống dòng.

### 7.4 LLM Gateway

```ts
// apps/api/src/llm/gateway.ts
export async function* streamChat(env: Env, messages: Msg[]) {
  let lastError: unknown;
  for (const p of getProviders(env)) {
    let started = false;
    try {
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
        body: JSON.stringify({ model: p.model, messages, stream: true, temperature: 0.7, max_tokens: 300 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok || !res.body) throw new Error(`${p.name}:${res.status}`);
      for await (const token of parseOpenAiStream(res.body)) {
        started = true;
        yield token;
      }
      return;
    } catch (e) {
      if (started) throw e; // đã gửi một phần: không fallback, báo lỗi
      lastError = e;
    }
  }
  throw lastError;
}

// completeJson(env, messages, schema): gọi không stream, bật response_format json
// nếu providers.ts đánh dấu nhà cung cấp hỗ trợ; validate bằng Zod, thử lại 1 lần.
```

**Cấu hình nhà cung cấp:** biến `LLM_PROVIDERS` (JSON: thứ tự, tên, baseUrl, model, `supportsJsonMode`), API key ở Workers Secrets (`LLM_KEY_GEMINI`, `LLM_KEY_GROQ`, ...). Không viết cứng tên model trong code.

### 7.5 System prompt

Prompt hội thoại ghép từ ba phần: **vai và bối cảnh** (từ kịch bản), **trình độ** (từ vựng, độ dài câu), và **quy tắc**:

- Luôn trả lời bằng tiếng Anh, 1 đến 3 câu ngắn, tự nhiên như văn nói.
- Giữ vai, mỗi lượt kết thúc bằng câu hỏi hoặc gợi mở.
- Không sửa lỗi giữa chừng; chỉ hỏi lại khi không hiểu.
- Không dùng markdown, emoji hay danh sách (vì sẽ được đọc bằng TTS).
- Từ chối khéo yêu cầu ngoài phạm vi kịch bản, kéo về tình huống.

Prompt giải thích trả JSON `ExplainResponse` bằng tiếng Việt. Prompt tổng kết trả JSON `FeedbackResponse`, chỉ dựa trên các lượt `user` của buổi đó.

### 7.6 Bảo mật và chống lạm dụng

| Lớp | Cách làm |
| --- | --- |
| Khóa API | Chỉ nằm trong Workers Secrets |
| Định danh | `X-Device-Id` (UUID sinh lần đầu cài, lưu ở SecureStore). Ẩn danh, **có thể giả mạo** |
| Quota | D1: theo thiết bị, theo IP (`CF-Connecting-IP`), ngân sách toàn cục |
| Phạm vi dùng | Server chỉ nhận `scenarioId`, prompt nằm ở server |
| Kiểm tra đầu vào | Zod giới hạn độ dài và số lượt |
| Logging | Không ghi log nội dung hội thoại; chỉ ghi route, mã trạng thái, nhà cung cấp, độ trễ |
| Xác thực mạnh hơn | Giai đoạn sau: Play Integrity hoặc đăng nhập |

## 8. Chiến lược offline và hiệu năng

- **Offline hoàn toàn:** từ vựng, ôn tập, ghi chú, tiến độ, nhắc học, xếp trình độ. Màn chat hiển thị trạng thái "cần mạng" (dùng `expo-network`).
- **Khởi động:** migration + seed chỉ chạy khi cần, trong transaction, có màn hình tải.
- **Danh sách dài:** dùng FlashList hoặc FlatList ảo hóa.
- **Streaming:** render theo lô khoảng 50ms.
- **Nhắc học:** lập lịch thông báo lặp hằng ngày bằng `expo-notifications`, lập lại khi đổi giờ trong Cài đặt.

## 9. Kiểm thử và chất lượng

| Loại | Công cụ | Phạm vi |
| --- | --- | --- |
| Unit (API, shared) | Vitest | Parse SSE, gateway fallback (có/không token đầu), quota counter (D1 local qua Miniflare), prompt builder, `vnDayKey` |
| Unit (mobile logic) | jest-expo | `lib/fsrs.ts`, `lib/day.ts`, sentence splitter, chọn thẻ mới/thẻ đến hạn, seed upsert, xếp trình độ |
| Component | jest-expo + Testing Library RN | Thẻ ôn tập, danh sách ghi chú, trạng thái màn chat |
| Kiểm tra nội dung | `packages/content/scripts/validate.ts` (Vitest/tsx) | Đúng schema, không trùng id, tham chiếu hợp lệ |
| E2E | Maestro | Onboarding, học và ôn một thẻ, tạo/tìm ghi chú, chat bằng gõ chữ với API giả lập |
| Thủ công trên máy thật | 2 đến 3 dòng máy khác hãng | STT, TTS, quyền micro, thông báo, offline |
| Tĩnh | TypeScript strict + Biome | Chạy trong CI cho mọi pull request |

**DoD cho mỗi tính năng:** có test cho logic chính; chạy offline nếu thuộc nhóm offline; không lỗi TypeScript/Biome; đã thử trên máy thật; nội dung mới đã qua validate; đánh dấu xong trong `PLAN.md`.

## 10. CI/CD và build APK

- `ci.yml`: mỗi pull request chạy cài đặt, Biome, typecheck, test (Vitest + jest-expo), validate nội dung.
- `android-apk.yml`: build APK, chạy thủ công hoặc khi gắn tag `v*`.
- `api-deploy.yml`: `wrangler d1 migrations apply` rồi `wrangler deploy` lên `dev` khi merge vào `main`; lên `prod` khi gắn tag.

```yaml
name: android-apk
on:
  workflow_dispatch: {}
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22        # đối chiếu yêu cầu Expo
          cache: pnpm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17        # đối chiếu yêu cầu Android Gradle Plugin
      - run: pnpm install --frozen-lockfile
      - name: Giải mã keystore
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > apps/mobile/release.keystore
      - run: pnpm --filter mobile exec expo prebuild --platform android --clean
        env:
          API_BASE_URL: ${{ vars.API_BASE_URL_PROD }}
      - run: ./gradlew assembleRelease
        working-directory: apps/mobile/android
        env:
          ANDROID_KEYSTORE_PATH: ${{ github.workspace }}/apps/mobile/release.keystore
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: apps/mobile/android/app/build/outputs/apk/release/*.apk
```

**Ký APK:** `expo prebuild --clean` tạo lại thư mục `android/` mỗi lần build, nên cấu hình ký đặt trong config plugin `plugins/with-release-signing.js`. Plugin chèn `signingConfigs.release` vào `app/build.gradle`, đọc đường dẫn và mật khẩu từ biến môi trường ở trên. Keystore tạo một lần, lưu base64 trong GitHub Secrets, **sao lưu ở ít nhất 2 nơi an toàn**, không commit vào repo.

**Thư mục `android/`** không commit (thêm vào `.gitignore`); luôn sinh lại bằng prebuild.

**Phương án build thay thế:** build local (cần JDK + Android SDK) hoặc EAS Build (kiểm tra hạn mức free trước khi phụ thuộc).

## 11. Khởi tạo dự án (Sprint 0)

```bash
# Yêu cầu: Node.js LTS, pnpm, Git
mkdir english-app && cd english-app
git init && pnpm init
# tạo pnpm-workspace.yaml (apps/*, packages/*) và .npmrc (node-linker=hoisted)

pnpm create expo-app@latest apps/mobile
pnpm create hono@latest apps/api        # template cloudflare-workers
mkdir -p packages/shared/src packages/content

pnpm add -Dw turbo @biomejs/biome typescript
pnpm --filter api add -D vitest @cloudflare/vitest-pool-workers
pnpm --filter mobile add -D jest-expo @testing-library/react-native

# D1 local
pnpm --filter api exec wrangler d1 create english-app-quota
pnpm --filter api exec wrangler d1 migrations apply english-app-quota --local

# chạy thử
pnpm --filter api dev
pnpm --filter mobile exec expo run:android   # development build (cần máy thật hoặc emulator)
```

STT là native module nên **không chạy trong Expo Go**; dùng development build ngay từ Sprint 0.

### 11.1 Spike kiểm chứng bắt buộc ở Sprint 0

Kết quả mỗi spike ghi vào bảng "Kết quả spike" trong `PLAN.md`. Spike thất bại thì chạy phương án dự phòng **trước khi** sang Sprint 1.

| Mã | Câu hỏi cần trả lời | Tiêu chí đạt | Phương án dự phòng |
| --- | --- | --- | --- |
| S1 | `expo/fetch` đọc được SSE từ Worker trên APK release? | Token hiện dần trên máy thật | `react-native-sse` hoặc XHR `onprogress` |
| S2 | STT tiếng Anh giọng Việt trên 2–3 máy khác hãng | Nhận đúng phần lớn câu thử ngắn, có kết quả tạm thời | Ưu tiên gõ chữ; cân nhắc STT cloud ở giai đoạn sau |
| S3 | TTS tiếng Anh offline có sẵn? Liệt kê được giọng? | Đọc được khi bật chế độ máy bay | Luồng hướng dẫn tải giọng (mục 6.3) |
| S4 | D1 đếm quota đúng khi gọi đồng thời; hạn mức free thực tế | Không mất lượt khi 20 request song song | Workers Rate Limiting binding hoặc Durable Objects |
| S5 | Metro + pnpm + workspace package `shared` | App import được `@app/shared` khi chạy và khi build release | Bỏ Turborepo, dùng `nohoist`/copy package |
| S6 | Drizzle migration + FTS5 trên expo-sqlite | Migration chạy khi khởi động; truy vấn FTS5 có kết quả | Dùng `LIKE` cho tìm kiếm |
| S7 | Hạn mức free của 2 nhà cung cấp LLM, độ trễ token đầu từ Việt Nam | Ghi số liệu; token đầu trung bình dưới 2 giây | Đổi thứ tự hoặc đổi nhà cung cấp |
| S8 | APK ký từ GitHub Actions cài lên máy thật | Cài được, mở được, gọi được `/health` | Build local |

## 12. Kế hoạch triển khai

Chi tiết từng việc, trạng thái và tiêu chí xong nằm trong **`PLAN.md`**. Tóm tắt:

| Sprint | Thời lượng (toàn thời gian) | Kết quả chính |
| --- | --- | --- |
| **0. Nền móng + spike** | 1,5 tuần | Monorepo, CI, development build, APK ký từ CI, 8 spike có kết luận |
| **1. Từ vựng và ôn tập** | 2 tuần | Schema, migration, seed 60 cụm, màn học, 3 kiểu bài tập, phiên ôn FSRS, TTS |
| **2. Ghi chú và tiến độ** | 1 tuần | CRUD ghi chú, tag, tìm kiếm, ghim, lưu nhanh, streak, thống kê, nhắc học |
| **3a. Chat bằng chữ** | 1,5 tuần | Gateway, fallback, SSE, quota D1, `/quota`, explain, feedback, 3 kịch bản |
| **3b. Chat bằng giọng** | 1,5 tuần | Voice controller, cắt câu đọc sớm, chạm để ngắt, chuyển gõ chữ, 10 kịch bản |
| **4. Hoàn thiện MVP** | 1,5 tuần | Onboarding, xếp trình độ, cài đặt, xóa dữ liệu, trạng thái lỗi/trống, đủ 200 cụm, APK cho người thử |
| **5. Nghe và nói (P1)** | 3 đến 4 tuần | Bài nghe, tốc độ, transcript, nối âm, shadowing |
| **6. Nâng cao (P1)** | Tùy | Rảnh tay, bộ từ tự tạo + enrich, lưu câu AI thành thẻ, lịch sử chat, sao lưu |
| **7. Mở rộng (P2)** | Tùy | Đăng nhập, đồng bộ, chấm ngữ điệu, báo cáo tiến bộ |

**Tổng MVP (Sprint 0–4): khoảng 9 tuần toàn thời gian.** Dự phòng thêm 20 đến 30% cho việc mới học mobile, tức khoảng 11 đến 12 tuần. Làm bán thời gian thì nhân khoảng gấp đôi.

## 13. Quyết định kiến trúc (ADR)

| # | Quyết định | Lý do | Đánh đổi |
| --- | --- | --- | --- |
| 1 | Dữ liệu người dùng lưu trên máy ở MVP | Không tốn hạ tầng, offline, riêng tư | Mất máy là mất dữ liệu nếu chưa có sao lưu |
| 2 | Backend chỉ làm proxy AI | Giấu khóa, chặn lạm dụng | Thêm một thành phần phải triển khai |
| 3 | STT/TTS của hệ điều hành | Miễn phí, chạy trên máy | Chất lượng phụ thuộc thiết bị |
| 4 | Chuẩn OpenAI-compatible cho LLM | Đổi nhà cung cấp bằng cấu hình | Mất tính năng riêng của từng nhà cung cấp |
| 5 | FSRS thay vì SM-2 | Hiện đại hơn, thuần JS | Phụ thuộc thư viện, đã bọc wrapper |
| 6 | Nội dung học dạng JSON trong repo | Dễ review, có kiểm tra schema | Cập nhật nội dung phải phát hành bản mới |
| 7 | Danh tính thiết bị ẩn danh | Không cần đăng nhập | Dễ giả mạo; bù bằng quota IP và ngân sách toàn cục |
| 8 | **D1 cho quota** (thay KV) | Đếm nguyên tử, hạn mức ghi đủ dùng | Thêm migration D1; truy vấn có độ trễ cao hơn KV một chút |
| 9 | **Chạm để nói ở MVP** | Tránh vọng âm, STT ổn định hơn | Kém tự nhiên hơn đàm thoại rảnh tay |
| 10 | **Prompt kịch bản nằm ở server** | App không gửi prompt tùy ý, chống lạm dụng | Thêm kịch bản phải deploy cả API |
| 11 | **jest-expo cho mobile, Vitest cho phần còn lại** | Dùng đúng công cụ của từng môi trường | Hai test runner trong một repo |

## 14. Rủi ro kỹ thuật và biện pháp

| Rủi ro | Mức độ | Biện pháp |
| --- | --- | --- |
| Gói AI miễn phí bị cắt hoặc giảm hạn mức | Cao | Fallback nhiều nhà cung cấp, quota thấp mặc định, ngân sách toàn cục |
| STT Android không ổn định trên một số máy | Cao | Spike S2, luôn có chế độ gõ chữ |
| Không đọc được stream SSE trên RN | Cao | Spike S1, có phương án dự phòng |
| Máy không có giọng TTS offline | Trung bình | Spike S3, hướng dẫn tải giọng lúc onboarding |
| Metro/pnpm/prebuild gây lỗi môi trường | Trung bình | Spike S5, S8 ngay Sprint 0 |
| Độ trễ voice loop cao | Trung bình | Đọc theo câu, `max_tokens` thấp, hiển thị "đang nghĩ", chọn nhà cung cấp nhanh nhất làm mặc định |
| Mất keystore | Cao | Sao lưu ở ít nhất 2 nơi ngay khi tạo |
| Nội dung AI sinh bị sai | Trung bình | Duyệt thủ công trước khi vào `packages/content` |
| Một người làm, trễ tiến độ | Cao | Phạm vi MVP đã cắt, theo dõi hằng tuần bằng `PLAN.md`, mỗi sprint ra APK |

## 15. Quy ước làm việc

- **Nhánh:** `main` luôn build được; làm trên `feat/...`, `fix/...`; gộp bằng pull request để CI chạy.
- **Commit:** Conventional Commits (`feat:`, `fix:`, `chore:`), ghi mã việc trong PLAN.md nếu có (ví dụ `feat(vocab): phiên ôn FSRS [S1-07]`).
- **TypeScript:** `strict: true`, cấm `any` tự do; dữ liệu ngoài biên luôn qua Zod.
- **Đặt tên:** file `kebab-case`, component `PascalCase`, hàm và biến `camelCase`, hằng số `UPPER_SNAKE_CASE`.
- **Phiên bản:** khóa lockfile, không nâng cấp lớn giữa sprint.
- **Bí mật:** `.dev.vars` cho Workers khi chạy local, nằm trong `.gitignore`.
- **Tài liệu:** README mô tả cách chạy; ADR mới đặt trong `docs/adr/`; cập nhật `PLAN.md` cuối mỗi ngày làm việc.

## 16. Việc cần làm ngay

1. Xác nhận các quyết định tạm ở mục 10 của BRD v1.1.
2. Đăng ký tài khoản Cloudflare và khóa API miễn phí của ít nhất hai nhà cung cấp AI.
3. Bắt đầu Sprint 0 theo `PLAN.md`, ưu tiên các spike S1, S2, S3.
4. Song song: soạn 3 chủ đề, khoảng 60 cụm từ, 3 kịch bản hội thoại.
