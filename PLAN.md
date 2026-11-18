# PLAN – Ứng dụng học tiếng Anh giao tiếp

*Kế hoạch triển khai và theo dõi tiến độ. Đi kèm BRD v1.1 và Thiết kế kỹ thuật v1.1. Bắt đầu: 18/11/2026.*

## Cách dùng file này

- Mỗi việc có **mã** (ví dụ `S1-07`). Ghi mã vào tên nhánh hoặc commit: `feat(vocab): phiên ôn FSRS [S1-07]`.
- Đánh dấu trạng thái bằng checkbox:
  - `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[-]` bỏ hoặc hoãn (ghi lý do)
- Một việc chỉ được đánh `[x]` khi đạt **DoD** (cuối file).
- Cuối mỗi ngày làm việc: cập nhật checkbox. Cuối mỗi tuần: cập nhật **Bảng tổng quan** và **Nhật ký tuần**.
- Cột *Tham chiếu* trỏ tới mã yêu cầu trong BRD (FR-...) hoặc mục trong Thiết kế kỹ thuật (TK §...).

## Bảng tổng quan

| Sprint | Mục tiêu | Ước tính | Bắt đầu | Kết thúc | Tiến độ | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Nền móng + spike | 1,5 tuần | | | 0/24 | Chưa bắt đầu |
| 1 | Từ vựng và ôn tập | 2 tuần | | | 0/18 | Chưa bắt đầu |
| 2 | Ghi chú và tiến độ | 1 tuần | | | 0/14 | Chưa bắt đầu |
| 3a | Chat bằng chữ | 1,5 tuần | | | 0/18 | Chưa bắt đầu |
| 3b | Chat bằng giọng | 1,5 tuần | | | 0/13 | Chưa bắt đầu |
| 4 | Hoàn thiện MVP | 1,5 tuần | | | 0/17 | Chưa bắt đầu |
| **MVP** | | **~9 tuần (+20–30% dự phòng)** | | | **0/104** | |

Mốc quan trọng:

- [ ] **M0** – APK ký từ CI cài lên máy thật, gọi được `/health`, 8 spike có kết luận (hết Sprint 0)
- [ ] **M1** – Học và ôn một phiên hoàn toàn offline (hết Sprint 1)
- [ ] **M2** – Một buổi hội thoại bằng chữ có tổng kết (hết Sprint 3a)
- [ ] **M3** – Một buổi hội thoại trọn vẹn bằng giọng (hết Sprint 3b)
- [ ] **M4** – APK MVP gửi 5–10 người thử (hết Sprint 4)

---

## Việc trước khi code

| Mã | Việc | Trạng thái |
| --- | --- | --- |
| P-01 | Xác nhận 6 quyết định tạm ở BRD §10 | [ ] |
| P-02 | Tạo tài khoản GitHub repo, Cloudflare | [ ] |
| P-03 | Đăng ký khóa API miễn phí của ít nhất 2 nhà cung cấp LLM | [ ] |
| P-04 | Chuẩn bị 2–3 điện thoại Android khác hãng để test | [ ] |

---

## Sprint 0 – Nền móng và spike (1,5 tuần)

**Mục tiêu:** môi trường chạy được từ đầu đến cuối và loại bỏ các rủi ro lớn trước khi viết tính năng.

### Hạ tầng repo

- [ ] `S0-01` Khởi tạo monorepo: pnpm workspace, `.npmrc` (`node-linker=hoisted`), Turborepo, Biome, `tsconfig` strict dùng chung — TK §11
- [ ] `S0-02` Tạo `apps/mobile` (Expo + Expo Router + NativeWind), chạy được trên development build — TK §11
- [ ] `S0-03` Tạo `apps/api` (Hono, Cloudflare Workers), route `GET /health` — TK §7.1
- [ ] `S0-04` Tạo `packages/shared` (Zod: `Level`, `ChatRequest`), import được từ cả mobile và api
- [ ] `S0-05` Tạo `packages/content` khung: schema Zod cho topic/phrase/scenario, script `validate.ts`, `version.json`
- [ ] `S0-06` Cấu hình test: Vitest cho api/shared/content, jest-expo cho mobile; mỗi nơi có 1 test mẫu chạy được
- [ ] `S0-07` `.gitignore` (android/, .dev.vars, keystore), README hướng dẫn chạy

### CI/CD

- [ ] `S0-08` `ci.yml`: install, Biome, typecheck, test, validate content — TK §10
- [ ] `S0-09` Tạo keystore, sao lưu 2 nơi, lưu vào GitHub Secrets — TK §10
- [ ] `S0-10` Config plugin `with-release-signing.js` — TK §10
- [ ] `S0-11` `android-apk.yml` build APK release đã ký — TK §10
- [ ] `S0-12` Tạo D1 `dev` và `prod`, migration `0001_usage.sql` — TK §7.2
- [ ] `S0-13` `api-deploy.yml`: migrate D1 + `wrangler deploy` (dev khi merge, prod khi tag)
- [ ] `S0-14` Config `API_BASE_URL` theo môi trường trong `app.config.ts`

### Spike (ghi kết quả vào bảng "Kết quả spike")

- [ ] `S0-15` **S1** – Stream SSE bằng `expo/fetch` trên APK release — TK §11.1
- [ ] `S0-16` **S2** – STT tiếng Anh giọng Việt trên 2–3 máy
- [ ] `S0-17` **S3** – TTS tiếng Anh offline, liệt kê giọng
- [ ] `S0-18` **S4** – D1 đếm đúng khi 20 request song song; ghi hạn mức free D1/Workers
- [ ] `S0-19` **S5** – Metro + pnpm + `@app/shared` khi build release
- [ ] `S0-20` **S6** – Drizzle migration + FTS5 trên expo-sqlite
- [ ] `S0-21` **S7** – Hạn mức free và độ trễ token đầu của 2 nhà cung cấp LLM
- [ ] `S0-22` **S8** – APK ký từ CI cài được trên máy thật, gọi `/health`

### Tổng kết sprint

- [ ] `S0-23` Ghi các phiên bản công cụ đã chọn (Node, Expo SDK, JDK) vào README
- [ ] `S0-24` Cập nhật Thiết kế kỹ thuật/ADR nếu có spike thất bại → **Mốc M0**

---

## Sprint 1 – Từ vựng và ôn tập (2 tuần)

**Mục tiêu:** học và ôn một phiên hoàn toàn offline, lịch ôn đúng.

### Dữ liệu

- [ ] `S1-01` Drizzle schema đầy đủ cho MVP + migration đầu tiên — TK §5
- [ ] `S1-02` `lib/day.ts` (`localDayKey`, `startOfLocalDay`) + test
- [ ] `S1-03` Seed theo `content_version` (upsert, `deletedAt`, không chạm tiến độ) + test — TK §5
- [ ] `S1-04` Nội dung: 3 chủ đề, 60 cụm từ (có IPA, nghĩa, ví dụ, register), đã duyệt — BRD §6

### Logic

- [ ] `S1-05` `lib/fsrs.ts` – `scheduleNext(card, rating, now)` + test — TK §6.1
- [ ] `S1-06` Repository vocab: danh sách chủ đề, cụm theo chủ đề
- [ ] `S1-07` Repository review: thẻ đến hạn, thẻ mới còn lại trong ngày (theo `dailyNewLimit`) + test — FR-V-05
- [ ] `S1-08` Ghi kết quả ôn trong 1 transaction (`review_cards`, `review_logs`, `daily_activity`) + test — TK §6.1
- [ ] `S1-09` Sinh đáp án nhiễu cho bài trắc nghiệm (cùng chủ đề) + test

### Giao diện

- [ ] `S1-10` `services/tts.ts` (đọc, dừng, chọn giọng, tốc độ)
- [ ] `S1-11` Tab Học: danh sách chủ đề → danh sách cụm — FR-V-01
- [ ] `S1-12` Thẻ cụm từ (IPA, nghĩa, ví dụ, register, nút phát âm) — FR-V-02
- [ ] `S1-13` Bài tập lật thẻ — FR-V-04a
- [ ] `S1-14` Bài tập chọn nghĩa đúng — FR-V-04a
- [ ] `S1-15` Bài tập nghe rồi chọn cụm từ — FR-V-04a
- [ ] `S1-16` Phiên ôn: Quên/Khó/Được/Dễ, màn kết thúc phiên — FR-V-03
- [ ] `S1-17` Trang chủ: số thẻ cần ôn hôm nay, số cụm mới còn lại — FR-V-05

### Tổng kết sprint

- [ ] `S1-18` Kiểm tra trên máy thật ở chế độ máy bay; build APK → **Mốc M1**

---

## Sprint 2 – Ghi chú và tiến độ (1 tuần)

**Mục tiêu:** ghi chú offline đầy đủ, streak và nhắc học hoạt động.

### Ghi chú

- [ ] `S2-01` Repository notes: thêm, sửa, xóa, ghim + test — FR-N-01, FR-N-04
- [ ] `S2-02` Bảng FTS5 + trigger (hoặc `LIKE` theo kết quả spike S6) + test tìm kiếm — FR-N-03
- [ ] `S2-03` Danh sách ghi chú ảo hóa, ghim lên đầu, ô tìm kiếm — FR-N-03, FR-N-04
- [ ] `S2-04` Màn sửa ghi chú, gắn tag, lọc theo tag — FR-N-01, FR-N-02
- [ ] `S2-05` Lưu nhanh từ thẻ từ vựng (`source=vocab`, `sourceRef`) — FR-N-05
- [ ] `S2-06` Nút đọc lại bằng TTS cho ghi chú có nguồn — FR-N-05
- [ ] `S2-07` Kiểm tra 1.000 ghi chú: tìm kiếm dưới 1 giây — BRD §4.2

### Tiến độ và nhắc học

- [ ] `S2-08` Tính streak từ `daily_activity` (theo BRD §5.1) + test — FR-P-03
- [ ] `S2-09` Đếm thời gian học (`studySeconds`) khi ở màn học/ôn/chat
- [ ] `S2-10` Màn thống kê: streak, số cụm đã thuộc, số phút, số buổi nói — FR-P-03
- [ ] `S2-11` Mục tiêu ngày (số cụm mới, số phút) trên trang chủ — FR-P-02
- [ ] `S2-12` `services/notifications.ts`: nhắc học hằng ngày, đổi giờ, tắt — FR-P-04
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

| Sprint | Nội dung | Tham chiếu |
| --- | --- | --- |
| 5 | Bài nghe, tốc độ, transcript, nối âm/nói tắt, shadowing, bài phản xạ | FR-L-*, FR-S-01..03 |
| 6 | Rảnh tay, bộ từ tự tạo + enrich, lưu câu AI thành thẻ, ghi chú → thẻ, lịch sử chat, sao lưu, bài tập điền từ/nghe gõ lại, phần nói trong kiểm tra đầu vào | FR-A-01b, FR-V-04b/06/07/08, FR-A-06b/08, FR-N-06, FR-U-03, FR-P-01b |
| 7 | Đăng nhập, đồng bộ, chấm ngữ điệu, báo cáo tiến bộ, kịch bản tự tạo | P2 |

Chia việc chi tiết cho Sprint 5 sau khi có phản hồi từ người thử ở M4.

---

## Kết quả spike (Sprint 0)

| Spike | Kết quả | Số liệu/ghi chú | Quyết định |
| --- | --- | --- | --- |
| S1 – SSE `expo/fetch` | | | |
| S2 – STT trên máy thật | | Máy: ... | |
| S3 – TTS offline | | Giọng có sẵn: ... | |
| S4 – D1 quota | | Hạn mức free: ... | |
| S5 – Metro + pnpm | | | |
| S6 – Drizzle + FTS5 | | | |
| S7 – Nhà cung cấp LLM | | Hạn mức/độ trễ: ... | |
| S8 – APK ký từ CI | | | |

## Kiểm tra nghiệm thu P0 (điền ở Sprint 4)

| Yêu cầu | Tiêu chí | Đạt |
| --- | --- | --- |
| FR-V-03 | Thẻ đã ôn không xuất hiện lại trước hạn | [ ] |
| FR-V-02 | Phát âm offline (khi có giọng) / có hướng dẫn tải giọng | [ ] |
| FR-V-05 | Số thẻ ôn hôm nay khớp thực tế; số cụm mới ≤ mục tiêu | [ ] |
| FR-N-07 | Ghi chú tạo offline còn nguyên khi mở lại | [ ] |
| FR-N-03 | Tìm kiếm < 1 giây với 1.000 ghi chú | [ ] |
| FR-A-01a | Chữ đầu tiên ≤ 3 giây; AI đọc câu đầu trước khi stream xong | [ ] |
| FR-A-01a | STT lỗi/không quyền → chuyển gõ chữ, không mất buổi | [ ] |
| FR-A-04 | Tổng kết chỉ ra lỗi lặp lại của buổi đó | [ ] |
| FR-A-07 | Hết lượt: thông báo rõ giờ làm mới, tính năng khác vẫn dùng được | [ ] |
| FR-P-04 | Nhắc học đúng giờ, đổi giờ và tắt được | [ ] |
| FR-U-05 | Xóa dữ liệu xóa sạch, app về trạng thái ban đầu | [ ] |

## Nhật ký quyết định

Ghi mọi thay đổi so với BRD/Thiết kế kỹ thuật phát sinh khi làm.

| Ngày | Quyết định | Lý do | Ảnh hưởng |
| --- | --- | --- | --- |
| 18/11/2026 | Áp dụng BRD v1.1 và Thiết kế kỹ thuật v1.1 | Cắt phạm vi MVP, sửa rủi ro kỹ thuật | Xem mục 0 của hai tài liệu |

## Nhật ký tuần

| Tuần | Đã xong | Vướng mắc | Kế hoạch tuần tới |
| --- | --- | --- | --- |
| 1 | | | |

## Định nghĩa hoàn thành (DoD)

Một việc chỉ được đánh `[x]` khi:

1. Code đã merge vào `main` qua pull request, CI xanh.
2. Có test cho logic chính (với việc có logic).
3. Không lỗi TypeScript/Biome.
4. Tính năng thuộc nhóm offline đã thử khi bật chế độ máy bay.
5. Đã thử trên ít nhất 1 máy thật (tính năng liên quan giọng nói: 2 máy).
6. Nội dung mới đã qua `validate` và đã được duyệt thủ công.
