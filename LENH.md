# Các lệnh thường dùng

Chạy trong Terminal của VS Code (`` Ctrl+` ``, PowerShell).

## 0. Cài đặt một lần

```powershell
# Đặt biến ANDROID_HOME vĩnh viễn (chạy 1 lần, rồi mở lại VS Code)
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")

# Cài thư viện cho cả dự án (chạy lại khi pull code mới có thay đổi package.json)
cd d:\Hung\eng
pnpm install
```

## 1. Build và cài app lên máy (lần đầu / sau khi thêm thư viện native)

```powershell
cd d:\Hung\eng\apps\mobile
pnpm android
```

- Lần đầu mất 20–40 phút, các lần sau 3–8 phút.
- Giữ cửa sổ Terminal mở (đó là Metro, phục vụ code cho app).
- Có cả máy ảo và điện thoại: lệnh sẽ hỏi chọn máy.
- **Không chạy 2 lần build cùng lúc.**

## 2. Làm việc hằng ngày (app đã cài, chỉ sửa code)

```powershell
cd d:\Hung\eng\apps\mobile
pnpm start
```

Trong cửa sổ Metro: `a` = mở trên Android, `r` = tải lại app, `j` = mở công cụ debug.
Sửa code TypeScript → app tự cập nhật trong 1–2 giây, không cần build.

## 3. Máy chủ API ở máy tính

```powershell
cd d:\Hung\eng\apps\api
pnpm exec wrangler d1 migrations apply english-app-quota-dev --local   # lần đầu
pnpm dev                                                                  # http://localhost:8787/health
```

Máy ảo gọi API ở máy tính qua địa chỉ `http://10.0.2.2:8787` (đã cấu hình sẵn).

## 4. Kiểm tra code trước khi commit

```powershell
cd d:\Hung\eng
pnpm test               # chạy toàn bộ test
pnpm typecheck          # kiểm tra kiểu TypeScript
pnpm lint               # kiểm tra định dạng (Biome)
pnpm format             # tự sửa định dạng
pnpm validate:content   # kiểm tra nội dung học (JSON)
```

## 5. Máy ảo và điện thoại

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l                                   # xem máy đang kết nối
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds              # danh sách máy ảo
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone_API_37.0   # bật máy ảo
& $adb shell pm list packages com.engoats           # app đã cài chưa
& $adb uninstall com.engoats.mobile                 # gỡ app
```

## 6. Khi build lỗi hoặc chậm bất thường

```powershell
cd d:\Hung\eng\apps\mobile\android
.\gradlew.bat --stop          # dừng toàn bộ tiến trình Gradle đang chạy ngầm

cd d:\Hung\eng\apps\mobile
pnpm prebuild                 # dựng lại thư mục android/ từ đầu
pnpm android
```

Xem tiến trình Gradle/Java đang chạy:

```powershell
Get-Process java | Select-Object Id, CPU, StartTime
```

## 7. Cloudflare (API trên mạng)

```powershell
cd d:\Hung\eng\apps\api
pnpm exec wrangler whoami                     # đang đăng nhập tài khoản nào
pnpm exec wrangler login                      # đăng nhập lại
pnpm exec wrangler deploy                     # deploy bản dev
pnpm exec wrangler deploy --env prod          # deploy bản prod
pnpm exec wrangler d1 list                    # danh sách database
pnpm exec wrangler d1 migrations apply english-app-quota-dev --remote   # tạo/sửa bảng trên D1 thật
pnpm exec wrangler d1 execute english-app-quota-dev --remote --command "SELECT * FROM usage"
pnpm exec wrangler tail                       # xem log API trực tiếp
```

## 8. Git

```powershell
cd d:\Hung\eng
git status                    # xem file đã sửa
git pull                      # lấy code mới nhất
git add -A
git commit -m "feat(vocab): mô tả ngắn [S1-07]"
git push                      # đẩy lên GitHub (nhánh eng_hungnd)
```
