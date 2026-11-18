# Ứng dụng học tiếng Anh giao tiếp

Ứng dụng Android giúp người Việt luyện giao tiếp tiếng Anh (A1 → B1/B2): học cụm từ theo chủ đề với ôn tập ngắt quãng, ghi chú và trò chuyện với AI bằng giọng nói.

- Yêu cầu nghiệp vụ: [BRD – Ứng dụng học tiếng Anh giao tiếp.md](BRD%20–%20Ứng%20dụng%20học%20tiếng%20Anh%20giao%20tiếp.md)
- Thiết kế kỹ thuật: [Thiết kế kỹ thuật – Ứng dụng học tiếng Anh giao tiếp.md](Thiết%20kế%20kỹ%20thuật%20–%20Ứng%20dụng%20học%20tiếng%20Anh%20giao%20tiếp.md)
- Tiến độ: [PLAN.md](PLAN.md)

## Cấu trúc

```
apps/mobile       Expo (React Native) – app Android
apps/api          Hono trên Cloudflare Workers – proxy AI, quota (D1)
packages/shared   Zod schema dùng chung app ↔ API
packages/content  Nội dung học (JSON) + script kiểm tra
```

## Phiên bản đã chọn (Sprint 0, 18/11/2026)

| Công cụ             | Phiên bản                                                     |
| ------------------- | ------------------------------------------------------------- |
| Node.js             | ≥ 22.13 (máy dev đang dùng 24.x; CI dùng 22)                  |
| pnpm                | 10.x (`packageManager` trong package.json)                    |
| Expo SDK            | 58 (React Native 0.88, React 19.3)                            |
| TypeScript          | 6.0                                                           |
| JDK (build Android) | 17                                                            |
| Gradle              | 9.4 (do Expo prebuild sinh ra)                                |
| Hono / Wrangler     | 4.x / 4.x                                                     |
| Zod                 | 4.x                                                           |
| Test                | Vitest 5 (api, shared, content), Jest 30 + jest-expo (mobile) |
| Lint/format         | Biome 2.x                                                     |

## Bắt đầu

```bash
pnpm install
pnpm test               # toàn bộ test
pnpm typecheck
pnpm lint               # Biome
pnpm validate:content   # kiểm tra nội dung học
```

### Chạy API ở máy

```bash
cd apps/api
pnpm exec wrangler d1 migrations apply english-app-quota-dev --local
pnpm dev                # http://localhost:8787/health
```

Bí mật khi chạy local đặt trong `apps/api/.dev.vars` (không commit).

### Chạy app trên điện thoại

App dùng native module (nhận diện giọng nói) nên **không chạy trong Expo Go**, phải dùng development build. Cần cài JDK 17 và Android SDK (Android Studio) trên máy, bật USB debugging trên điện thoại:

```bash
cd apps/mobile
pnpm android            # = expo run:android, build và cài development build
```

App gọi API theo biến `EXPO_PUBLIC_API_BASE_URL` (mặc định `http://10.0.2.2:8787` cho emulator). Với điện thoại thật cùng mạng Wi-Fi, chạy `pnpm dev` ở API với `--ip 0.0.0.0` rồi đặt `EXPO_PUBLIC_API_BASE_URL=http://<IP-máy-tính>:8787`.

Không cài Android SDK được thì build APK bằng GitHub Actions (mục dưới).

## Spike Sprint 0

Vào **Cài đặt → Kiểm tra kỹ thuật (Sprint 0)** trên app để chạy S1 (stream SSE), S2 (STT), S3 (TTS), S6 (FTS5), S8 (/health). Ghi kết quả vào bảng "Kết quả spike" trong `PLAN.md`. Màn hình này sẽ bị gỡ trước bản gửi người thử.

## CI/CD

| Workflow          | Khi nào                            | Việc                                      |
| ----------------- | ---------------------------------- | ----------------------------------------- |
| `ci.yml`          | Pull request, push `main`          | Biome, kiểm tra nội dung, typecheck, test |
| `android-apk.yml` | Chạy tay hoặc tag `v*`             | Build APK release, tải về ở mục Artifacts |
| `api-deploy.yml`  | Push `main` (dev), tag `v*` (prod) | Migrate D1 + `wrangler deploy`            |

### Cấu hình một lần

**1. Cloudflare (API + D1)**

```bash
cd apps/api
pnpm exec wrangler login
pnpm exec wrangler d1 create english-app-quota-dev
pnpm exec wrangler d1 create english-app-quota-prod
```

Chép hai `database_id` vào `apps/api/wrangler.toml` (thay các id `0000…`). **Trước khi làm bước này, workflow `api-deploy` sẽ báo lỗi ở bước migrate D1.** Tạo API token (quyền Workers Scripts + D1 Edit) rồi thêm vào GitHub → Settings → Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**2. Keystore ký APK** (làm một lần, **sao lưu ở ít nhất 2 nơi an toàn**; mất keystore là không cập nhật được app đã phát hành)

```bash
keytool -genkeypair -v -keystore release.keystore -alias english-app \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore > release.keystore.b64
```

GitHub Secrets: `ANDROID_KEYSTORE_BASE64` (nội dung file .b64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`english-app`), `ANDROID_KEY_PASSWORD`. Chưa có keystore thì APK vẫn build được nhưng ký bằng debug keystore (chỉ để thử).

**3. URL API cho app**: GitHub → Settings → Variables: `API_BASE_URL_DEV`, `API_BASE_URL_PROD` (URL Workers sau khi deploy).

## Quy ước

- Nhánh `feat/...`, `fix/...`; merge qua pull request.
- Commit theo Conventional Commits, kèm mã việc trong PLAN.md: `feat(vocab): phiên ôn FSRS [S1-07]`.
- Thư mục `apps/mobile/android/` được sinh bởi `expo prebuild`, không commit, không sửa tay; cấu hình native qua `app.config.ts` và config plugin trong `apps/mobile/plugins/`.
- Package Android: `com.engoats.mobile` (đã chốt 18/11/2026). **Không đổi sau khi phát hành.**
