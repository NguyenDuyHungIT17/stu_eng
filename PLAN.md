# PLAN – Ứng dụng học tiếng Anh giao tiếp

_Kế hoạch triển khai và theo dõi tiến độ. Đi kèm BRD v1.1 và Thiết kế kỹ thuật v1.1. Bắt đầu: 18/11/2026._

## Cách dùng file này

- Mỗi việc có **mã** (ví dụ `S1-07`). Ghi mã vào tên nhánh hoặc commit: `feat(vocab): phiên ôn FSRS [S1-07]`.
- Đánh dấu trạng thái bằng checkbox:
  - `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` bỏ hoặc hoãn (ghi lý do)
- Một việc chỉ được đánh `[x]` khi đạt **DoD** (cuối file).
- Cuối mỗi ngày làm việc: cập nhật checkbox. Cuối mỗi tuần: cập nhật **Bảng tổng quan** và **Nhật ký tuần**.
- Cột _Tham chiếu_ trỏ tới mã yêu cầu trong BRD (FR-...) hoặc mục trong Thiết kế kỹ thuật (TK §...).

## Bảng tổng quan

| Sprint  | Mục tiêu           | Ước tính                       | Bắt đầu | Kết thúc | Tiến độ              | Trạng thái                                          |
| ------- | ------------------ | ------------------------------ | ------- | -------- | -------------------- | --------------------------------------------------- |
| 0       | Nền móng + spike   | 1,5 tuần                       | 18/11   |          | 10/24 (+11 đang làm) | Chờ secrets GitHub, PR vào main, keystore, máy thật |
| 1       | Từ vựng và ôn tập  | 2 tuần                         | 23/11   |          | 0/18 (+17 code xong) | Chờ PR, duyệt nội dung, thử máy thật                |
| 2       | Ghi chú và tiến độ | 1 tuần                         | 23/11   |          | 0/14 (+12 code xong) | Còn: thử thông báo trên 2 máy, APK                  |
| 3a      | Chat bằng chữ      | 1,5 tuần                       |         |          | 0/18                 | Chưa bắt đầu                                        |
| 3b      | Chat bằng giọng    | 1,5 tuần                       |         |          | 0/13                 | Chưa bắt đầu                                        |
| 4       | Hoàn thiện MVP     | 1,5 tuần                       |         |          | 0/17                 | Chưa bắt đầu                                        |
| **MVP** |                    | **~9 tuần (+20–30% dự phòng)** |         |          | **0/104**            |                                                     |

Mốc quan trọng:

- [ ] **M0** – APK ký từ CI cài lên máy thật, gọi được `/health`, 8 spike có kết luận (hết Sprint 0)
- [ ] **M1** – Học và ôn một phiên hoàn toàn offline (hết Sprint 1)
- [ ] **M2** – Một buổi hội thoại bằng chữ có tổng kết (hết Sprint 3a)
- [ ] **M3** – Một buổi hội thoại trọn vẹn bằng giọng (hết Sprint 3b)
- [ ] **M4** – APK MVP gửi 5–10 người thử (hết Sprint 4)

---

## Việc trước khi code

| Mã   | Việc                                                     | Trạng thái                                                         |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| P-01 | Xác nhận 6 quyết định tạm ở BRD §10                      | [~] đã chốt package `com.engoats.mobile`; còn 6 quyết định BRD §10 |
| P-02 | Tạo tài khoản GitHub repo, Cloudflare                    | [x] repo `stu_eng`, Cloudflare đã `wrangler login`                 |
| P-03 | Đăng ký khóa API miễn phí của ít nhất 2 nhà cung cấp LLM | [ ]                                                                |
| P-04 | Chuẩn bị 2–3 điện thoại Android khác hãng để test        | [ ]                                                                |

---

## Sprint 0 – Nền móng và spike (1,5 tuần)

**Mục tiêu:** môi trường chạy được từ đầu đến cuối và loại bỏ các rủi ro lớn trước khi viết tính năng.

### Hạ tầng repo

- [x] `S0-01` Khởi tạo monorepo: pnpm workspace, `.npmrc` (`node-linker=hoisted`), Turborepo, Biome, `tsconfig` strict dùng chung — TK §11
- [~] `S0-02` Tạo `apps/mobile` (Expo + Expo Router + NativeWind), chạy được trên development build — TK §11 _(22/11: chạy được bản debug trên máy ảo; còn máy thật + merge main)_
- [x] `S0-03` Tạo `apps/api` (Hono, Cloudflare Workers), route `GET /health` — TK §7.1
- [x] `S0-04` Tạo `packages/shared` (Zod: `Level`, `ChatRequest`), import được từ cả mobile và api
- [x] `S0-05` Tạo `packages/content` khung: schema Zod cho topic/phrase/scenario, script `validate.ts`, `version.json`
- [x] `S0-06` Cấu hình test: Vitest cho api/shared/content, jest-expo cho mobile; mỗi nơi có 1 test mẫu chạy được
- [x] `S0-07` `.gitignore` (android/, .dev.vars, keystore), README hướng dẫn chạy

### CI/CD

- [~] `S0-08` `ci.yml`: install, Biome, typecheck, test, validate content — TK §10
- [ ] `S0-09` Tạo keystore, sao lưu 2 nơi, lưu vào GitHub Secrets — TK §10
- [x] `S0-10` Config plugin `with-release-signing.js` — TK §10
- [~] `S0-11` `android-apk.yml` build APK release đã ký — TK §10
- [~] `S0-12` Tạo D1 `dev` và `prod`, migration `0001_usage.sql` — TK §7.2 _(đã tạo 2 DB; dev đã migrate; prod chưa — migrate khi tag đầu tiên)_
- [~] `S0-13` `api-deploy.yml`: migrate D1 + `wrangler deploy` (dev khi merge, prod khi tag) _(23/11: đã deploy dev bằng tay; workflow chưa chạy — cần secrets + merge)_
- [x] `S0-14` Config `API_BASE_URL` theo môi trường trong `app.config.ts`

### Spike (ghi kết quả vào bảng "Kết quả spike")

- [~] `S0-15` **S1** – Stream SSE bằng `expo/fetch` trên APK release — TK §11.1
- [~] `S0-16` **S2** – STT tiếng Anh giọng Việt trên 2–3 máy
- [~] `S0-17` **S3** – TTS tiếng Anh offline, liệt kê giọng
- [x] `S0-18` **S4** – D1 đếm đúng khi 20 request song song; ghi hạn mức free D1/Workers _(23/11: đạt trên D1 thật)_
- [x] `S0-19` **S5** – Metro + pnpm + `@app/shared` khi build release _(23/11: build release ở máy đạt)_
- [~] `S0-20` **S6** – Drizzle migration + FTS5 trên expo-sqlite
- [ ] `S0-21` **S7** – Hạn mức free và độ trễ token đầu của 2 nhà cung cấp LLM
- [ ] `S0-22` **S8** – APK ký từ CI cài được trên máy thật, gọi `/health`

### Tổng kết sprint

- [x] `S0-23` Ghi các phiên bản công cụ đã chọn (Node, Expo SDK, JDK) vào README
- [ ] `S0-24` Cập nhật Thiết kế kỹ thuật/ADR nếu có spike thất bại → **Mốc M0**

---

## Sprint 1 – Từ vựng và ôn tập (2 tuần)

**Mục tiêu:** học và ôn một phiên hoàn toàn offline, lịch ôn đúng.

### Dữ liệu

- [~] `S1-01` Drizzle schema đầy đủ cho MVP + migration đầu tiên — TK §5 _(23/11: code + test xong (`b0ec426`); thêm `phrases.sort_order`, `topics.deleted_at` so với TK §5)_
- [~] `S1-02` `lib/day.ts` (`localDayKey`, `startOfLocalDay`) + test _(23/11: code + test xong (`b0ec426`); thêm `addLocalDays`)_
- [~] `S1-03` Seed theo `content_version` (upsert, `deletedAt`, không chạm tiến độ) + test — TK §5 _(23/11: code + test xong (`b0ec426`); chạy lúc khởi động trong `DbProvider`)_
- [~] `S1-04` Nội dung: 3 chủ đề, 60 cụm từ (có IPA, nghĩa, ví dụ, register), đã duyệt — BRD §6 _(23/11: 60 cụm (`9acb97c`), qua validate; **chưa duyệt** (cần người duyệt tiếng Anh))_

### Logic

- [~] `S1-05` `lib/fsrs.ts` – `scheduleNext(card, rating, now)` + test — TK §6.1 _(23/11: code + test xong (`b0ec426`), dùng `ts-fsrs` 6)_
- [~] `S1-06` Repository vocab: danh sách chủ đề, cụm theo chủ đề _(23/11: code + test xong (`b0ec426`))_
- [~] `S1-07` Repository review: thẻ đến hạn, thẻ mới còn lại trong ngày (theo `dailyNewLimit`) + test — FR-V-05 _(23/11: code + test xong (`b0ec426`))_
- [~] `S1-08` Ghi kết quả ôn trong 1 transaction (`review_cards`, `review_logs`, `daily_activity`) + test — TK §6.1 _(23/11: code + test xong (`b0ec426`))_
- [~] `S1-09` Sinh đáp án nhiễu cho bài trắc nghiệm (cùng chủ đề) + test _(23/11: code + test xong (`b0ec426`); bỏ đáp án trùng nghĩa)_

### Giao diện

- [~] `S1-10` `services/tts.ts` (đọc, dừng, chọn giọng, tốc độ) _(23/11: code xong (`8d6b81b`); chưa có màn chọn giọng (Cài đặt, Sprint 2/4))_
- [~] `S1-11` Tab Học: danh sách chủ đề → danh sách cụm — FR-V-01 _(23/11: code xong (`8d6b81b`))_
- [~] `S1-12` Thẻ cụm từ (IPA, nghĩa, ví dụ, register, nút phát âm) — FR-V-02 _(23/11: code xong (`8d6b81b`), có nút nghe chậm)_
- [~] `S1-13` Bài tập lật thẻ — FR-V-04a _(23/11: code + test component (`8d6b81b`))_
- [~] `S1-14` Bài tập chọn nghĩa đúng — FR-V-04a _(23/11: code + test component (`8d6b81b`))_
- [~] `S1-15` Bài tập nghe rồi chọn cụm từ — FR-V-04a _(23/11: code + test component (`8d6b81b`))_
- [~] `S1-16` Phiên ôn: Quên/Khó/Được/Dễ, màn kết thúc phiên — FR-V-03 _(23/11: code + test logic phiên (`8d6b81b`))_
- [~] `S1-17` Trang chủ: số thẻ cần ôn hôm nay, số cụm mới còn lại — FR-V-05 _(23/11: code xong (`8d6b81b`))_

### Tổng kết sprint

- [ ] `S1-18` Kiểm tra trên máy thật ở chế độ máy bay; build APK → **Mốc M1**

---

## Sprint 2 – Ghi chú và tiến độ (1 tuần)

**Mục tiêu:** ghi chú offline đầy đủ, streak và nhắc học hoạt động.

### Ghi chú

- [~] `S2-01` Repository notes: thêm, sửa, xóa, ghim + test — FR-N-01, FR-N-04 _(23/11: code + test (`a6ab269`))_
- [~] `S2-02` Bảng FTS5 + trigger (hoặc `LIKE` theo kết quả spike S6) + test tìm kiếm — FR-N-03 _(23/11: spike S6: FTS5 có, nhưng MVP dùng cột `search_text` bỏ dấu + `LIKE` (tìm không dấu); test (`a6ab269`))_
- [~] `S2-03` Danh sách ghi chú ảo hóa, ghim lên đầu, ô tìm kiếm — FR-N-03, FR-N-04 _(23/11: code (`608a822`), FlatList)_
- [~] `S2-04` Màn sửa ghi chú, gắn tag, lọc theo tag — FR-N-01, FR-N-02 _(23/11: code (`608a822`))_
- [~] `S2-05` Lưu nhanh từ thẻ từ vựng (`source=vocab`, `sourceRef`) — FR-N-05 _(23/11: code + test `saveFromPhrase` (`608a822`))_
- [~] `S2-06` Nút đọc lại bằng TTS cho ghi chú có nguồn — FR-N-05 _(23/11: code (`608a822`): dòng đầu ghi chú có nguồn là câu tiếng Anh)_
- [~] `S2-07` Kiểm tra 1.000 ghi chú: tìm kiếm dưới 1 giây — BRD §4.2 _(23/11: test 1.000 ghi chú < 1 s trên better-sqlite3 (`a6ab269`); còn đo trên máy thật)_

### Tiến độ và nhắc học

- [~] `S2-08` Tính streak từ `daily_activity` (theo BRD §5.1) + test — FR-P-03 _(23/11: code + test (`a6ab269`))_
- [~] `S2-09` Đếm thời gian học (`studySeconds`) khi ở màn học/ôn/chat _(23/11: code + test (`6101e8a`), đếm ở màn ôn; màn chat thêm ở Sprint 3a)_
- [~] `S2-10` Màn thống kê: streak, số cụm đã thuộc, số phút, số buổi nói — FR-P-03 _(23/11: code + test (`6101e8a`), hiện trên Trang chủ)_
- [~] `S2-11` Mục tiêu ngày (số cụm mới, số phút) trên trang chủ — FR-P-02 _(23/11: code (`6101e8a`), chọn trong Cài đặt)_
- [~] `S2-12` `services/notifications.ts`: nhắc học hằng ngày, đổi giờ, tắt — FR-P-04 _(23/11: code + test (`12670fc`): lên lịch 7 ngày, bỏ hôm nay nếu đã học; chọn giờ/tắt trong Hồ sơ)_
- [ ] `S2-13` Kiểm tra thông báo đúng giờ trên 2 máy (kể cả sau khi khởi động lại máy)
- [ ] `S2-14` Build APK cuối sprint

---

## Sprint 3a – Chat bằng chữ (1,5 tuần)

**Mục tiêu:** một buổi hội thoại bằng chữ có streaming, giải thích tiếng Việt và tổng kết.

### Backend

- [ ] `S3a-01` Schema Zod trong `shared`: `ChatRequest`, `ExplainRequest/Response`, `FeedbackRequest/Response`, `QuotaResponse` — TK §7.1
- [ ] `S3a-02` `providers.ts` đọc `LLM_PROVIDERS` + secrets — TK §7.4
- [ ] `S3a-03` `sse-parser.ts` parse stream OpenAI-compatible + test (token cắt giữa chunk, `[DONE]`)
- [ ] `S3a-04` `gateway.streamChat` với fallback chỉ trước token đầu + test — TK §7.4
- [ ] `S3a-05` `gateway.completeJson` (JSON mode, Zod, thử lại 1 lần) + test
- [ ] `S3a-06` `quota/counter.ts` + middleware `rate-limit` (thiết bị, IP, toàn cục) + test — TK §7.2
- [ ] `S3a-07` Middleware `device-id`, `error`; không log nội dung hội thoại — TK §7.6
- [ ] `S3a-08` Prompt builder: chat, explain, feedback + test — TK §7.5
- [ ] `S3a-09` Route `POST /chat` (SSE) — TK §7.3
- [ ] `S3a-10` Route `POST /chat/explain`, `POST /chat/feedback`, `GET /quota` — FR-A-05, FR-A-04, FR-A-07
- [ ] `S3a-11` Cron Trigger dọn bảng `usage` — TK §7.2
- [ ] `S3a-12` Nội dung: 3 kịch bản (vai, mục tiêu, từ khóa gợi ý, câu mở đầu), đã duyệt — BRD §6

### Mobile

- [ ] `S3a-13` `lib/device-id.ts` (SecureStore), `services/api-client.ts` đọc SSE — TK §6.2
- [ ] `S3a-14` Tab Chat: danh sách kịch bản, lượt còn lại, trạng thái "cần mạng" — FR-A-02, FR-A-07
- [ ] `S3a-15` Màn chat gõ chữ: streaming, render theo lô, nút Thử lại khi lỗi — TK §6.2
- [ ] `S3a-16` Nút "Giải thích tiếng Việt" trên từng câu AI, cache vào DB — FR-A-05
- [ ] `S3a-17` Lưu câu AI vào ghi chú (`source=chat`) — FR-A-06a
- [ ] `S3a-18` Kết thúc buổi → màn tổng kết; thông báo hết lượt kèm giờ làm mới → **Mốc M2**

---

## Sprint 3b – Chat bằng giọng (1,5 tuần)

**Mục tiêu:** một buổi hội thoại trọn vẹn bằng giọng, chạm để nói.

- [ ] `S3b-01` `services/stt.ts`: bắt đầu/dừng, kết quả tạm thời, kết quả cuối, xử lý lỗi — TK §6.2
- [ ] `S3b-02` Xin quyền micro kèm giải thích; từ chối thì chuyển gõ chữ — FR-U-02
- [ ] `S3b-03` Máy trạng thái `voice-controller` (idle/listening/thinking/speaking/typing) + test — TK §6.2
- [ ] `S3b-04` Sentence splitter (bỏ qua Mr./Dr./e.g.) + test
- [ ] `S3b-05` Hàng đợi TTS đọc từng câu khi đang stream — TK §6.2
- [ ] `S3b-06` Chạm để ngắt AI; chạm mic khi AI đang đọc → dừng TTS rồi mới nghe — FR-A-01a
- [ ] `S3b-07` Hiển thị chữ đang nhận diện (interim) và trạng thái "đang nghĩ"
- [ ] `S3b-08` Chuyển qua lại giọng nói ↔ gõ chữ trong cùng buổi
- [ ] `S3b-09` Thông báo quyền riêng tư lần đầu dùng chat — FR-U-02
- [ ] `S3b-10` Nội dung: tăng lên 10 kịch bản, đã duyệt
- [ ] `S3b-11` Đo độ trễ: chữ đầu tiên ≤ 3 giây sau khi dừng nói (4G) — BRD §4.5
- [ ] `S3b-12` Thử trên 2–3 máy, ghi các lỗi STT gặp phải
- [ ] `S3b-13` Build APK → **Mốc M3**

---

## Sprint 4 – Hoàn thiện MVP (1,5 tuần)

**Mục tiêu:** APK đủ tốt để đưa cho 5–10 người thử.

### Onboarding

- [ ] `S4-01` Màn chào + thông báo quyền riêng tư — FR-U-02
- [ ] `S4-02` Chọn mục tiêu (công việc, du lịch, đời sống) và thời gian học/ngày — FR-P-02
- [ ] `S4-03` Kiểm tra giọng TTS, hướng dẫn tải nếu thiếu — TK §6.3
- [ ] `S4-04` Nội dung: ~30 câu xếp trình độ A1–B2, đã duyệt
- [ ] `S4-05` Xếp trình độ: tự đánh giá + trắc nghiệm thích ứng + test — FR-P-01a, TK §6.4
- [ ] `S4-06` Đặt giờ nhắc học lần đầu — FR-P-04

### Cài đặt và dữ liệu

- [ ] `S4-07` Cài đặt: trình độ, mục tiêu, giọng đọc, tốc độ đọc, sáng/tối, giờ nhắc — FR-U-01
- [ ] `S4-08` Xóa toàn bộ dữ liệu (có xác nhận) — FR-U-05

### Chất lượng

- [ ] `S4-09` Màn hình trống và màn hình lỗi cho mọi tab
- [ ] `S4-10` Dark mode rà toàn bộ màn hình
- [ ] `S4-11` Nội dung: tăng lên ~200 cụm từ, đã duyệt — BRD §6
- [ ] `S4-12` Maestro e2e: onboarding, học + ôn 1 thẻ, tạo/tìm ghi chú, chat gõ chữ (API giả lập) — TK §9
- [ ] `S4-13` Đo thời gian mở app (< 3 giây trên máy tầm trung)
- [ ] `S4-14` Rà soát BRD: mọi yêu cầu P0 đã đạt tiêu chí nghiệm thu (bảng bên dưới)
- [ ] `S4-15` Deploy API `prod`, tag `v0.1.0`, build APK release
- [ ] `S4-16` Mẫu khảo sát cho người thử (độ tự tin khi nói, lỗi gặp phải) — BRD §7
- [ ] `S4-17` Gửi APK cho 5–10 người thử → **Mốc M4**

---

## Sau MVP (chưa chia việc chi tiết)

| Sprint | Nội dung                                                                                                                                                  | Tham chiếu                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 5      | Bài nghe, tốc độ, transcript, nối âm/nói tắt, shadowing, bài phản xạ                                                                                      | FR-L-*, FR-S-01..03                                                  |
| 6      | Rảnh tay, bộ từ tự tạo + enrich, lưu câu AI thành thẻ, ghi chú → thẻ, lịch sử chat, sao lưu, bài tập điền từ/nghe gõ lại, phần nói trong kiểm tra đầu vào | FR-A-01b, FR-V-04b/06/07/08, FR-A-06b/08, FR-N-06, FR-U-03, FR-P-01b |
| 7      | Đăng nhập, đồng bộ, chấm ngữ điệu, báo cáo tiến bộ, kịch bản tự tạo                                                                                       | P2                                                                   |

Chia việc chi tiết cho Sprint 5 sau khi có phản hồi từ người thử ở M4.

---

## Kết quả spike (Sprint 0)

| Spike                  | Kết quả                   | Số liệu/ghi chú                                                                                                                                                                                                         | Quyết định                                                                                                                                 |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| S1 – SSE `expo/fetch`  | Đạt (máy ảo, APK release) | 23/11, máy ảo API 37, APK release build ở máy: token đầu 259 ms, tổng 1,9 s, 12 chunk, nhận dần. Còn: 1 máy thật                                                                                                        | Giữ `expo/fetch` + bộ đọc SSE tự viết                                                                                                      |
| S2 – STT trên máy thật | Chờ máy thật              | Máy: ...                                                                                                                                                                                                                |                                                                                                                                            |
| S3 – TTS offline       | Đạt (máy ảo)              | Máy ảo: 473 giọng, 51 giọng tiếng Anh, có giọng `-local` (offline). Engine khởi động lần đầu ~2–5 s. Còn: máy thật ở chế độ máy bay                                                                                     | Không chặn giao diện chờ engine TTS (timeout 2 s)                                                                                          |
| S4 – D1 quota          | Đạt                       | D1 dev thật (23/11): 20 lệnh `hit()` song song → trả về đúng 1..20, không trùng, tổng 20. Free: Workers 100.000 request/ngày (thấy trên dashboard), CPU 10 ms/request; D1 5 triệu dòng đọc, 100.000 dòng ghi/ngày, 5 GB | Giữ thiết kế đếm bằng 1 câu `INSERT … ON CONFLICT … RETURNING`; mỗi lượt chat tốn ~1–3 dòng ghi → dư sức cho MVP                           |
| S5 – Metro + pnpm      | Đạt                       | 23/11: `expo run:android --variant release` build native release ở máy (Windows) thành công, app chạy, import `@app/*` và migration `.sql` OK. Lần đầu ~20 phút (C++ 4 ABI)                                             | Giữ `node-linker=hoisted`; thêm `metro.config.js` (đuôi .sql) và `babel.config.js` (inline-import)                                         |
| S6 – Drizzle + FTS5    | Đạt (máy ảo)              | Drizzle migration + seed chạy lúc mở app (APK release). expo-sqlite: SQLite 3.53.3, FTS5 hoạt động                                                                                                                      | MVP tìm ghi chú bằng cột `search_text` chuẩn hóa (bỏ dấu, đ→d) + `LIKE`: tìm không dấu, 1.000 ghi chú < 1 s. FTS5 để dành khi cần xếp hạng |
| S7 – Nhà cung cấp LLM  | Chưa làm                  | Cần khóa API (P-03)                                                                                                                                                                                                     |                                                                                                                                            |
| S8 – APK ký từ CI      | Một phần                  | APK release build ở máy cài lên máy ảo, gọi `/health` → 200 (lần đầu 2,1 s). Còn: chạy `android-apk.yml` + cài lên máy thật                                                                                             |                                                                                                                                            |

## Kiểm tra nghiệm thu P0 (điền ở Sprint 4)

| Yêu cầu  | Tiêu chí                                                         | Đạt |
| -------- | ---------------------------------------------------------------- | --- |
| FR-V-03  | Thẻ đã ôn không xuất hiện lại trước hạn                          | [ ] |
| FR-V-02  | Phát âm offline (khi có giọng) / có hướng dẫn tải giọng          | [ ] |
| FR-V-05  | Số thẻ ôn hôm nay khớp thực tế; số cụm mới ≤ mục tiêu            | [ ] |
| FR-N-07  | Ghi chú tạo offline còn nguyên khi mở lại                        | [ ] |
| FR-N-03  | Tìm kiếm < 1 giây với 1.000 ghi chú                              | [ ] |
| FR-A-01a | Chữ đầu tiên ≤ 3 giây; AI đọc câu đầu trước khi stream xong      | [ ] |
| FR-A-01a | STT lỗi/không quyền → chuyển gõ chữ, không mất buổi              | [ ] |
| FR-A-04  | Tổng kết chỉ ra lỗi lặp lại của buổi đó                          | [ ] |
| FR-A-07  | Hết lượt: thông báo rõ giờ làm mới, tính năng khác vẫn dùng được | [ ] |
| FR-P-04  | Nhắc học đúng giờ, đổi giờ và tắt được                           | [ ] |
| FR-U-05  | Xóa dữ liệu xóa sạch, app về trạng thái ban đầu                  | [ ] |

## Nhật ký quyết định

Ghi mọi thay đổi so với BRD/Thiết kế kỹ thuật phát sinh khi làm.

| Ngày       | Quyết định                                                                                                                                                     | Lý do                                                                       | Ảnh hưởng                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 18/11/2026 | Áp dụng BRD v1.1 và Thiết kế kỹ thuật v1.1                                                                                                                     | Cắt phạm vi MVP, sửa rủi ro kỹ thuật                                        | Xem mục 0 của hai tài liệu                                                                                                                  |
| 18/11/2026 | Expo SDK 58, TypeScript 6.0                                                                                                                                    | Bản stable mới nhất; template Expo dùng TS 6.0 (TS 7 chưa an toàn với Expo) | —                                                                                                                                           |
| 18/11/2026 | Route mobile ở `apps/mobile/src/app`                                                                                                                           | Quy ước của Expo SDK 58                                                     | Khác đường dẫn TK §4                                                                                                                        |
| 18/11/2026 | Biến môi trường `EXPO_PUBLIC_API_BASE_URL` thay cho `extra` trong app config                                                                                   | Cách chuẩn của Expo, tự nhúng lúc bundle                                    | —                                                                                                                                           |
| 18/11/2026 | Test API dùng Vitest + `getPlatformProxy()` của wrangler, bỏ `@cloudflare/vitest-pool-workers`                                                                 | Gói này deprecated, không hợp Vitest 5                                      | Test không chạy trong runtime workerd                                                                                                       |
| 18/11/2026 | NativeWind hoãn sang Sprint 1 (khi làm UI thật); Sprint 0 dùng StyleSheet                                                                                      | Giảm cấu hình khi chưa có màn hình thật                                     | S0-02 chưa có NativeWind                                                                                                                    |
| 18/11/2026 | Android package `com.engoats.mobile` (bạn đã chốt)                                                                                                             | Tên chính thức                                                              | **Không đổi sau khi phát hành**                                                                                                             |
| 23/11/2026 | Thêm cột `phrases.sort_order`, `topics.deleted_at` (khác TK §5)                                                                                                | Học cụm mới đúng thứ tự biên soạn; ẩn chủ đề bị gỡ khỏi gói                 | Migration `0000_init`                                                                                                                       |
| 23/11/2026 | Test repository bằng `better-sqlite3` + đúng migration của app; repository nhận kiểu `Db` (Drizzle chế độ sync)                                                | expo-sqlite không chạy trong Node; hai driver cùng chế độ sync              | Không cần giả lập DB trong test                                                                                                             |
| 23/11/2026 | Trình độ mặc định `B2` (mở toàn bộ nội dung) cho đến khi có bài xếp trình độ                                                                                   | Mặc định A1 chỉ có vài cụm, người học hết bài ngay                          | Sửa khi làm onboarding (Sprint 4)                                                                                                           |
| 23/11/2026 | Tiếp tục dùng StyleSheet, chưa thêm NativeWind                                                                                                                 | Tránh thêm cấu hình Babel/Metro khi chưa thử được trên máy thật             | Xem lại ở Sprint 4                                                                                                                          |
| 23/11/2026 | Phiên ôn: thẻ chấm "Quên" quay lại cuối phiên (tối đa 2 lần) dạng lật thẻ                                                                                      | Củng cố ngay trong phiên, không kéo dài vô hạn                              | `features/review/session.ts`                                                                                                                |
| 23/11/2026 | Giao diện kiểu lộ trình (chặng = chủ đề, bài = 5 câu), bài học từng bước; bỏ thanh tự chấm 4 mức, mức FSRS suy ra từ số lần sai (0 → Được, 1 → Khó, ≥2 → Quên) | Bạn yêu cầu giao diện thân thiện, bớt thứ thừa                              | Thay `session.ts`/`exercises.tsx` bằng `features/lesson/*`; mục tiêu "cụm mới/ngày" không còn chặn học                                      |
| 23/11/2026 | Thêm bài ghép câu (chạm ô chữ) và chọn câu tiếng Anh từ nghĩa                                                                                                  | Hợp với câu giao tiếp dài                                                   | `ExerciseType` thêm `intro`, `choose_text`, `build_sentence`                                                                                |
| 23/11/2026 | Nội dung lên 18 chủ đề / 465 câu (phần lớn 6–15 từ), contentVersion 3                                                                                          | Bạn yêu cầu thêm nhiều câu dài                                              | **Bản nháp do AI soạn, cần người duyệt**                                                                                                    |
| 23/11/2026 | 4 tab: Học, Luyện nói, Sổ tay, Hồ sơ; trang spike ẩn (nhấn giữ số phiên bản)                                                                                   | Bớt thứ thừa trên màn chính                                                 | —                                                                                                                                           |
| 23/11/2026 | **Chuyển sang học theo đoạn hội thoại**: 72 hội thoại / 741 câu trong 18 chủ đề, mỗi hội thoại gắn tình huống cụ thể (ai, ở đâu, vì sao); bỏ 465 câu rời       | Bạn muốn tập trung giao tiếp thật, câu rời không phù hợp                    | Bảng `dialogues`, cột `phrases.dialogue_id/line_no/speaker/blank/note_vi` (migration `0002`); contentVersion 4; thẻ ôn cũ của câu rời bị ẩn |
| 23/11/2026 | Bài luyện: tình huống → nghe cả đoạn (2 giọng) → nghe-điền cụm then chốt → nhập vai chọn câu đáp / ghép câu; ôn tập trong ngữ cảnh hội thoại                   | Luyện nghe và phản xạ đáp trong ngữ cảnh                                    | `features/dialogue/*`, `features/lesson/*` viết lại                                                                                         |
| 23/11/2026 | Giao diện kiểu ứng dụng nhắn tin (bong bóng chat, avatar, màu chàm/san hô, thẻ phẳng đổ bóng nhẹ), bỏ lộ trình kiểu trò chơi                                   | Bạn muốn khác Duolingo                                                      | Tab: Hội thoại, Nói với AI, Sổ tay, Hồ sơ                                                                                                   |

## Nhật ký tuần

| Tuần | Đã xong                                                                                                                                                                                                          | Vướng mắc                                                                                | Kế hoạch tuần tới                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Monorepo, shared/content (schema + validate + 24 cụm mẫu, 3 kịch bản), API (`/health`, `/dev/stream`, D1 quota counter, cron), khung app Expo + màn spike, plugin ký APK, 3 workflow CI/CD, README. 42 test xanh | Máy dev chưa có JDK/Android SDK; chưa có tài khoản Cloudflare/GitHub, khóa LLM, máy test | Làm P-01..P-04, push repo lên GitHub, chạy spike trên máy thật, chốt M0 |

## Định nghĩa hoàn thành (DoD)

Một việc chỉ được đánh `[x]` khi:

1. Code đã merge vào `main` qua pull request, CI xanh.
2. Có test cho logic chính (với việc có logic).
3. Không lỗi TypeScript/Biome.
4. Tính năng thuộc nhóm offline đã thử khi bật chế độ máy bay.
5. Đã thử trên ít nhất 1 máy thật (tính năng liên quan giọng nói: 2 máy).
6. Nội dung mới đã qua `validate` và đã được duyệt thủ công.

---

## Nhật ký theo ngày

Mỗi ngày làm việc thêm một mục: đã làm gì, còn dở gì (ghi rõ sprint và mã việc), đang chờ gì.

### Ngày 18/11/2026

**Đã làm (nhánh `feat/sprint-0`, 5 commit, 43 test xanh):**

- Sprint 0: xong 9/24 việc: `S0-01`, `S0-03`, `S0-04`, `S0-05`, `S0-06`, `S0-07`, `S0-10`, `S0-14`, `S0-23`.
- Monorepo pnpm + Turborepo + Biome, TypeScript 6.0, Expo SDK 58.
- `packages/shared`: schema Zod cho chat, giải thích, tổng kết, quota, nội dung học.
- `packages/content`: script kiểm tra nội dung; nội dung mẫu 3 chủ đề, 24 cụm từ, 3 kịch bản, 4 câu xếp trình độ (**chưa duyệt**).
- `apps/api`: `/health`, `/dev/stream` (chỉ bật ở dev), bộ đếm quota D1, cron dọn bảng `usage`. Đã chạy thử `wrangler dev` ở máy.
- `apps/mobile`: khung 5 tab, màn **Kiểm tra kỹ thuật** (spike S1, S2, S3, S6, S8), plugin ký APK (đã thử với `expo prebuild` thật), Metro bundle được.
- CI/CD: `ci.yml`, `android-apk.yml`, `api-deploy.yml`. README hướng dẫn cấu hình.
- Review độc lập toàn nhánh: 0 Critical, đã sửa 3 Important.

**Còn dở:**

| Sprint | Mã việc          | Đang dở ở đâu                                             | Cần gì để xong                                                |
| ------ | ---------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| 0      | `S0-02`          | App chưa chạy trên development build                      | Android Studio + điện thoại                                   |
| 0      | `S0-08`          | CI chỉ mới chạy ở máy                                     | Repo GitHub, push code                                        |
| 0      | `S0-09`          | Chưa tạo keystore                                         | JDK (có sẵn trong Android Studio); bạn tự tạo, sao lưu 2 nơi  |
| 0      | `S0-11`          | Workflow build APK chưa chạy lần nào                      | Repo GitHub + secrets keystore                                |
| 0      | `S0-12`, `S0-13` | Migration D1 đã viết, chưa tạo database thật, chưa deploy | Tài khoản Cloudflare                                          |
| 0      | `S0-15` S1       | Có nút đo trên app và route `/dev/stream`                 | APK + API đã deploy + điện thoại                              |
| 0      | `S0-16` S2       | Có nút thử STT trên app                                   | 2–3 điện thoại khác hãng                                      |
| 0      | `S0-17` S3       | Có nút thử TTS trên app                                   | Điện thoại (bật chế độ máy bay)                               |
| 0      | `S0-18` S4       | Đạt trên D1 ở máy (20 request song song)                  | Tài khoản Cloudflare để thử D1 thật                           |
| 0      | `S0-19` S5       | Bundle JS đạt                                             | Build native release thành công (`S0-11`)                     |
| 0      | `S0-20` S6       | Có nút thử FTS5 trên app                                  | Điện thoại                                                    |
| 0      | `S0-21` S7       | Chưa làm                                                  | 2 khóa API AI miễn phí                                        |
| 0      | `S0-22` S8       | Chưa làm                                                  | APK + API đã deploy                                           |
| 0      | `S0-24`          | Chưa làm                                                  | Kết quả các spike                                             |
| 1      | Toàn bộ          | Chưa bắt đầu (chờ các spike S3, S6)                       | Có thể viết trước phần logic; kiểm tra `S1-18` cần điện thoại |

**Đang chờ bạn:**

- [ ] P-01: xác nhận 6 quyết định tạm ở BRD §10 và **chốt tên package Android** (đang tạm là `com.englishapp.mobile`; chốt trước khi tạo keystore)
- [ ] P-02: tạo repo GitHub và gửi URL; tạo tài khoản Cloudflare rồi chạy `pnpm exec wrangler login` trong `apps/api`
- [ ] P-03: đăng ký 2 khóa API AI miễn phí, đặt vào `apps/api/.dev.vars` (không gửi khóa qua chat)
- [ ] P-04: chuẩn bị ít nhất 1 điện thoại Android (tốt nhất 2–3 máy khác hãng), bật USB debugging
- [ ] Cài Android Studio trên máy tính (có kèm JDK 17 + Android SDK)
- [ ] Duyệt 24 cụm từ mẫu trong `packages/content/data/phrases/`

**Lỗi nhỏ để sau (từ review):**

- ~~Bộ đọc SSE chưa xử lý `\r` đơn, BOM, event rỗng~~ → đã sửa 22/11 (`a62ddb2`, thêm 3 test).
- ~~Màn Kiểm tra kỹ thuật thiếu try/catch ở nút liệt kê giọng TTS và nút bắt đầu STT~~ → đã sửa 22/11 (`a62ddb2`).

**Bước tiếp theo:** khi có repo và Cloudflare thì push code, deploy API. Khi có Android Studio và điện thoại thì chạy app, làm các spike, chốt mốc M0, rồi sang Sprint 1.

### Ngày 19–22/11/2026

**Đã làm (nhánh `eng_hungnd`):**

- P-01 (một phần): chốt package Android `com.engoats.mobile` (`9ce1e39`).
- P-02: có repo GitHub `NguyenDuyHungIT17/stu_eng`; Cloudflare đã `wrangler login`.
- `S0-12`: tạo D1 `english-app-quota-dev` và `english-app-quota-prod`, điền `database_id` (`2fe1ce6`). D1 dev đã chạy migration (`wrangler d1 migrations list --remote` báo không còn migration nào); **D1 prod chưa migrate**.
- Cài Android Studio; `expo prebuild` + Gradle build được `app-debug.apk`, **chạy được trên máy ảo** (`S0-02` gần xong).
- Sửa lỗi build Windows: đường dẫn C++ của `react-native-gesture-handler` vượt 260 ký tự → gỡ khỏi `package.json` (`baa23bf`) và tắt autolinking trong `apps/mobile/react-native.config.js` (**file này chưa commit**).
- Thêm `LENH.md` tổng hợp lệnh thường dùng.

**Phát hiện khi kiểm tra 22/11:**

- `origin/main` vẫn chỉ có commit docs đầu tiên → `ci.yml`, `android-apk.yml`, `api-deploy.yml` chưa chạy trên GitHub.
- Nhánh `eng_hungnd` đi trước `origin` 1 commit (`baa23bf` chưa push).
- Worker `english-app-api` chưa tồn tại trên Cloudflare (chưa deploy lần nào).
- Chưa có keystore release, chưa có `apps/api/.dev.vars` (khóa LLM).
- Bản đã chạy là **debug**, spike S1/S5/S8 yêu cầu **release đã ký**.

**Checklist hoàn thành Sprint 0 (theo thứ tự):**

| #   | Việc                                                                                                                                                                | Mã                        | Ai làm                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------- |
| 1   | Commit `react-native.config.js`, push nhánh `eng_hungnd`                                                                                                            | `S0-02`                   | Claude/bạn                 |
| 2   | Thêm secret `CLOUDFLARE_API_TOKEN` vào GitHub (Account ID và URL dev đã để trong code, 23/11)                                                                       | `S0-13`                   | Bạn                        |
| 3   | Mở PR `eng_hungnd` → `main`, sửa đến khi `ci.yml` xanh, merge                                                                                                       | `S0-08`                   | Claude/bạn                 |
| 4   | Merge kích hoạt `api-deploy.yml` → API dev deploy, kiểm tra `GET /health`                                                                                           | `S0-13`, `S0-12`          | Tự động                    |
| 5   | Tạo keystore release (`keytool`), sao lưu 2 nơi, thêm 4 secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | `S0-09`                   | Bạn (Claude hướng dẫn)     |
| 6   | Chạy `android-apk.yml` → APK release đã ký                                                                                                                          | `S0-11`, `S0-19` (S5)     | Tự động                    |
| 7   | Cài APK lên **điện thoại thật**, gọi `/health`                                                                                                                      | `S0-22` (S8), `S0-02`     | Bạn                        |
| 8   | Trên màn Kiểm tra kỹ thuật: đo SSE, TTS (chế độ máy bay), FTS5                                                                                                      | `S0-15`, `S0-17`, `S0-20` | Bạn (máy ảo đo sơ bộ được) |
| 9   | Thử STT giọng Việt trên 2–3 máy thật                                                                                                                                | `S0-16` (S2)              | Bạn                        |
| 10  | Kiểm tra hạn mức free D1/Workers thật; chạy 20 request song song lên API dev                                                                                        | `S0-18` (S4)              | Claude                     |
| 11  | Đăng ký 2 khóa LLM free, đặt vào `.dev.vars` + `wrangler secret`; đo hạn mức và độ trễ token đầu                                                                    | `S0-21` (S7), P-03        | Bạn lấy khóa, Claude đo    |
| 12  | Migrate D1 prod (tự động khi tag, hoặc chạy tay)                                                                                                                    | `S0-12`                   | Claude/bạn                 |
| 13  | Điền bảng "Kết quả spike", cập nhật TK/ADR nếu spike nào thất bại → **M0**                                                                                          | `S0-24`                   | Claude                     |

**Đang chờ bạn:** keystore (#5), secrets GitHub (#2, #5), ít nhất 1 điện thoại thật (#7–9), 2 khóa LLM (#11), 6 quyết định BRD §10.

### Ngày 23/11/2026

**Đã làm:**

- Cloudflare: đăng ký subdomain `nguyenduyhungit17.workers.dev`; deploy API dev bằng tay → `https://english-app-api.nguyenduyhungit17.workers.dev` (`/health` 200, `/dev/stream` chạy).
- Spike S4 đạt trên D1 thật (`S0-18` xong). Spike S1 đạt phía server.
- Sửa 2 lỗi nhỏ từ review (bộ đọc SSE, try/catch màn spike) — `a62ddb2`.
- `apps/mobile/.env.local` (không commit) trỏ app build ở máy tới API dev thật.

**Checklist cập nhật:** #1 xong, #10 xong; #4 deploy dev đã làm tay (workflow vẫn cần chạy sau merge).

**Đang chờ bạn:** secret `CLOUDFLARE_API_TOKEN` (#2; Account ID và URL dev đã đưa vào code vì không bí mật), mở PR và merge (#3), keystore (#5), điện thoại thật, 2 khóa LLM, 6 quyết định BRD §10.

### Ngày 23/11/2026 (chiều) – Sprint 1

**Đã làm (nhánh `eng_hungnd`, 3 commit, 63 test mobile xanh):**

- Dữ liệu và logic (`b0ec426`): Drizzle schema + migration, `DbProvider` chạy migration và seed lúc mở app, `lib/day.ts`, `lib/fsrs.ts`, seed theo `contentVersion`, repository vocab/review, đáp án nhiễu. Mọi repository có test trên SQLite thật (`better-sqlite3`).
- Giao diện (`8d6b81b`): TTS, tab Học → chủ đề → cụm, thẻ cụm từ, 3 bài tập, phiên ôn + màn kết thúc, Trang chủ. Có test component cho 3 bài tập.
- Nội dung (`9acb97c`): 60 cụm (3 × 20), `contentVersion` 2. **Bản nháp, chưa duyệt.**
- Test bắt được 1 lỗi thật: thiếu cài đặt `daily_new_limit` → mục tiêu thành 0 (`Number(null) = 0`), đã sửa.

**Còn dở:**

| Mã              | Cần gì                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `S1-04`         | Người duyệt 465 câu (IPA, nghĩa, ví dụ) trong `packages/content/data/phrases/` |
| `S1-01`…`S1-17` | Mở PR `eng_hungnd` → `main`, CI xanh, merge; thử trên máy thật (DoD)           |
| `S1-18`         | APK + điện thoại, bật chế độ máy bay, học và ôn một phiên → **M1**             |

**Sprint 2 (cùng ngày, sau khi Sprint 1 chạy trên máy ảo):**

- Logic: streak, ghi chú (thêm/sửa/xóa/ghim, tag, nguồn), tìm kiếm không dấu, đếm thời gian học, thống kê (`a6ab269`, `6101e8a`).
- Giao diện: tab Ghi chú, màn sửa, lưu nhanh từ thẻ cụm, Trang chủ có streak/phút/thống kê, Cài đặt chọn mục tiêu (`608a822`, `6101e8a`).
- Còn: `S2-12` thông báo nhắc học (cần cài `expo-notifications`, build lại native), `S2-13` thử trên 2 máy, `S2-14` APK.

**Thử trên máy ảo (APK release, 23/11):** mở app → migration + seed OK; học 10 cụm mới (1 thẻ Quên quay lại cuối phiên) → màn kết thúc đúng; Trang chủ cập nhật 10 thẻ cần ôn / 0 cụm mới; tab Học hiện 10/20. Phát hiện và sửa: phiên ôn chờ ~5 s vì engine TTS (`6581cdd`), thanh tab thiếu icon.

**Tối 23/11 – giao diện mới, nội dung, nhắc học (`7b00bee`, `12670fc`):**

- Nội dung: 18 chủ đề, 465 câu (phần lớn 6–15 từ), contentVersion 3. Máy ảo đang có dữ liệu cũ nâng cấp lên bản 3 không mất tiến độ (10 câu đã học vẫn giữ).
- Giao diện: Trang chủ là lộ trình (chặng = chủ đề, bài = 5 câu, nút tròn uốn lượn, bài xong màu vàng, bài hiện tại có nhãn BẮT ĐẦU); bài học từng bước có thanh tiến độ, nút KIỂM TRA, dải đúng/sai, câu sai quay lại cuối bài, màn kết thúc (độ chính xác, số câu, thời gian). 4 tab: Học, Luyện nói, Sổ tay, Hồ sơ.
- `S2-12`: xin quyền thông báo lúc mở app, lên lịch 7 lời nhắc (`dumpsys alarm` thấy đủ lịch), đổi giờ/tắt trong Hồ sơ.
- **Thử trên máy ảo (APK release):** học trọn bài 3 chặng 1 gồm giới thiệu, chọn nghĩa, ghép câu, nghe chọn, làm lại câu sai → màn kết thúc 67%; Trang chủ cập nhật 3 bài xong, bài 4 là bài hiện tại; Hồ sơ hiện thống kê đúng. Bài nghe đã hiện (bản sửa khởi động TTS sớm `34b1aa4` có tác dụng).
- Sửa sau khi thử: icon tab bị cắt, tô xanh/đỏ đáp án sau khi kiểm tra, cố định thời gian ở màn kết thúc.
- Còn: `S2-13` thử thông báo đúng giờ trên 2 máy thật (kể cả khởi động lại máy), `S2-14` APK, người duyệt 465 câu.

**Tối 23/11 (muộn) – chuyển sang hội thoại (`2c7bf6c`):**

- Nội dung: 72 hội thoại / 741 câu, 18 chủ đề × 4 tình huống; mỗi câu then chốt có cụm cần nhớ và (một số) ghi chú cách dùng. **Bản nháp do AI soạn, cần người duyệt.**
- **Thử trên máy ảo (APK release):** nâng cấp nội dung lên bản 4 OK; trang chính hiện 72 hội thoại; luyện trọn "Chào đồng nghiệp mới": tình huống → nghe cả đoạn (tô sáng câu đang đọc) → nghe-điền 7 câu → nhập vai chọn câu đáp → làm lại câu sai → màn kết thúc liệt kê cụm giao tiếp; trang chính đánh dấu ✓ và hiện 7 câu cần ôn; ôn tập hiện đúng ngữ cảnh; màn xem hội thoại hiện nghĩa từng câu.
- Sửa: chữ thanh trạng thái màu trắng trên nền sáng.

---

## Cần chuẩn bị để hoàn thành toàn bộ MVP

Danh sách tổng hợp những thứ ngoài code cần có. Đánh dấu khi đã có.

| #   | Cần có                                                                      | Dùng cho                                 | Sprint       | Đã có            |
| --- | --------------------------------------------------------------------------- | ---------------------------------------- | ------------ | ---------------- |
| 1   | Quyết định BRD §10 + tên package Android                                    | Toàn dự án, keystore                     | 0            | [~] package xong |
| 2   | Repo GitHub (free)                                                          | CI, build APK                            | 0            | [x]              |
| 3   | Tài khoản Cloudflare (free)                                                 | API, D1                                  | 0, 3a        | [x]              |
| 4   | Android Studio (JDK 17 + Android SDK)                                       | Build và chạy app trên máy               | 0 → 4        | [x]              |
| 5   | 1 điện thoại Android (tốt nhất 2–3 máy khác hãng)                           | Spike, kiểm tra từng sprint              | 0 → 4        | [ ]              |
| 6   | Keystore + mật khẩu, sao lưu 2 nơi                                          | Ký APK phát hành                         | 0            | [ ]              |
| 7   | 2 khóa API AI miễn phí                                                      | Spike S7, hội thoại AI                   | 0, 3a        | [ ]              |
| 8   | Người duyệt nội dung tiếng Anh                                              | Duyệt cụm từ, kịch bản, câu xếp trình độ | 1, 3a, 3b, 4 | [ ]              |
| 9   | Nội dung: 60 cụm (S1) → 200 cụm (S4); 3 → 10 kịch bản; ~30 câu xếp trình độ | Học, chat, onboarding                    | 1, 3a, 3b, 4 | [ ]              |
| 10  | 5–10 người thử + mẫu khảo sát                                               | Mốc M4                                   | 4            | [ ]              |
