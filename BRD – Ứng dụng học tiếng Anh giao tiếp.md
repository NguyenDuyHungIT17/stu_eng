# BRD – Ứng dụng học tiếng Anh giao tiếp

*Tài liệu phân tích nghiệp vụ. Phiên bản 1.1, ngày 18/11/2026. Đi kèm tài liệu Thiết kế kỹ thuật v1.1 và PLAN.md.*

## 0. Thay đổi so với v1.0

| # | Thay đổi | Lý do |
| --- | --- | --- |
| 1 | FR-V-04: MVP chỉ giữ 3 kiểu bài tập, 2 kiểu còn lại chuyển P1 | Giảm phạm vi MVP cho 1 lập trình viên |
| 2 | FR-V-02 và tiêu chí offline: audio đọc bằng TTS trên máy, app kiểm tra và hướng dẫn tải giọng tiếng Anh nếu thiếu | TTS Android không phải lúc nào cũng có sẵn giọng offline |
| 3 | FR-N-05: ghi chú lưu nguồn, phần "nghe lại" đọc bằng TTS; không lưu file ghi âm ở MVP | TTS hệ thống không xuất được ra file |
| 4 | FR-A-01: MVP dùng **chạm để nói / chạm để ngắt**; đàm thoại rảnh tay (tự bật mic, nói chen) chuyển P1 | Vọng âm TTS vào mic và STT tự ngắt khiến chế độ rảnh tay rất khó làm ổn định |
| 5 | FR-A-06: MVP chỉ lưu câu của AI vào **ghi chú**; lưu thành thẻ từ vựng chuyển P1 (đi cùng FR-V-07) | Thẻ cần nghĩa tiếng Việt, mà phần gợi nghĩa bằng AI là P1 |
| 6 | FR-P-01: MVP dùng tự đánh giá + trắc nghiệm nghe/đọc; phần nói chuyển P1 | Chấm nói phụ thuộc STT, rủi ro cao nhất |
| 7 | Thêm FR-A-10 (giới hạn riêng cho "Giải thích tiếng Việt"), FR-U-05 (xóa toàn bộ dữ liệu) | Bổ sung yêu cầu còn thiếu |
| 8 | FR-U-02: thông báo rõ nhà cung cấp AI miễn phí có thể dùng dữ liệu hội thoại | Gói free một số nhà cung cấp dùng dữ liệu để cải thiện mô hình |
| 9 | Định nghĩa "một ngày" (mục 5.1) | Streak, mục tiêu ngày và quota cần cách tính thống nhất |
| 10 | Mục 10: các câu hỏi mở có quyết định tạm | Để bắt đầu làm được |

## 1. Tổng quan

### 1.1 Bối cảnh

Nhiều người Việt học tiếng Anh nhiều năm nhưng vẫn khó nói chuyện với người nước ngoài và khó nghe hiểu tiếng nói tự nhiên. Nguyên nhân phổ biến: học từ vựng rời rạc, ít luyện phản xạ nói, ít tiếp xúc với giọng nói thật (nối âm, nói tắt, nhiều giọng vùng miền), và thiếu người để thực hành an toàn, không sợ mắc lỗi.

### 1.2 Mục tiêu sản phẩm

Xây dựng ứng dụng Android (APK) giúp người học đạt trình độ **giao tiếp độc lập, tương đương khoảng B1 đến B2 (CEFR)**: nói được trong các tình huống đời thực và nghe hiểu người bản xứ nói ở tốc độ tự nhiên.

### 1.3 Nguyên tắc cốt lõi

- Nghe và nói là trọng tâm; từ vựng và ngữ pháp là công cụ phục vụ hai kỹ năng này.
- Học theo **cụm từ và mẫu câu trong tình huống thật**, không học từ rời.
- Luyện nói bằng cách **trò chuyện với AI** trong môi trường không phán xét.
- Chi phí vận hành bằng 0 ở giai đoạn đầu: các tính năng không dùng AI phải chạy được offline.
- Không hướng tới luyện thi (IELTS, TOEIC).

### 1.4 Phạm vi

**Trong phạm vi:** học cụm từ theo chủ đề, ghi chú, luyện nghe, luyện nói, hội thoại với AI, kiểm tra đầu vào, theo dõi tiến độ, nhắc học.

**Ngoài phạm vi (giai đoạn này):** phiên bản iOS, lớp học trực tuyến với giáo viên thật, mạng xã hội và bảng xếp hạng, thanh toán và gói trả phí, luyện thi chứng chỉ, giao diện đa ngôn ngữ.

## 2. Đối tượng người dùng

| Persona | Mô tả | Nhu cầu chính | Nỗi đau |
| --- | --- | --- | --- |
| **Lan, 24 tuổi, nhân viên văn phòng** | Học từ nhỏ nhưng ngại nói, đi làm cần email và họp với đối tác nước ngoài | Phản xạ giao tiếp công việc, nghe hiểu cuộc họp | Biết ngữ pháp nhưng đứng hình khi nói |
| **Minh, 20 tuổi, sinh viên** | Muốn đi du học hoặc thực tập nước ngoài | Giao tiếp đời sống, nghe giảng và nói chuyện với bạn bè | Nghe người bản xứ nói nhanh thì không hiểu |
| **Hùng, 32 tuổi, người đi làm bận rộn** | Chỉ có 15 đến 20 phút mỗi ngày, hay học dở dang | Lộ trình rõ, bài ngắn, nhắc học đều | Mất động lực, không biết học gì tiếp |

**Trình độ đầu vào dự kiến:** từ A1/A2. **Trình độ đích:** B1 đến B2.

## 3. Hành trình người dùng chính

1. Cài app, đọc và đồng ý thông báo quyền riêng tư, chọn mục tiêu (công việc, du lịch, đời sống) và thời gian học mỗi ngày.
2. Tự đánh giá trình độ và làm bài kiểm tra đầu vào ngắn (nghe, đọc) để xếp trình độ.
3. Nhận lộ trình: vài cụm từ mới mỗi ngày, ôn thẻ đến hạn, một buổi nói với AI.
4. Học cụm từ, ôn tập đúng lịch, ghi chú những điều đáng nhớ.
5. Đóng vai tình huống với AI bằng giọng nói (chạm để nói), nhận tổng kết lỗi cuối buổi.
6. Xem tiến độ, giữ chuỗi ngày học (streak), nhận nhắc học.
7. *(Giai đoạn 2)* Nghe bài theo từng chế độ, luyện nhắc lại câu mẫu.

## 4. Yêu cầu chức năng

Mức ưu tiên: **P0** = bắt buộc cho MVP, **P1** = giai đoạn 2, **P2** = giai đoạn 3.

### 4.1 Module Từ vựng và cụm từ theo chủ đề

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-V-01 | Hiển thị danh mục chủ đề (làm quen, nhà hàng, sân bay, mua sắm, công việc, họp, small talk, nhờ giúp đỡ...) và các bộ cụm từ trong mỗi chủ đề | P0 |
| FR-V-02 | Mỗi thẻ gồm: cụm từ, phiên âm IPA, nghĩa tiếng Việt, ví dụ trong ngữ cảnh, mức độ trang trọng, nút phát âm (TTS trên máy) | P0 |
| FR-V-03 | Thuật toán ôn tập ngắt quãng tự lên lịch; người học tự đánh giá Quên / Khó / Được / Dễ | P0 |
| FR-V-04a | Bài tập MVP: **xem thẻ (lật thẻ)**, **chọn nghĩa đúng**, **nghe rồi chọn cụm từ** | P0 |
| FR-V-04b | Bài tập bổ sung: điền chỗ trống, nghe rồi gõ lại | P1 |
| FR-V-05 | Giới hạn số cụm mới mỗi ngày theo mục tiêu người dùng; hiển thị số thẻ cần ôn hôm nay | P0 |
| FR-V-06 | Người dùng tự tạo bộ từ và thêm cụm từ riêng | P1 |
| FR-V-07 | AI gợi ý nghĩa, ví dụ khi người dùng thêm cụm mới | P1 |
| FR-V-08 | Cụm từ sai nhiều tự được đưa vào danh sách luyện lại | P1 |

**Tiêu chí nghiệm thu:**

- Cụm từ đã ôn xong không xuất hiện lại trước ngày hẹn ôn kế tiếp.
- Nút phát âm hoạt động khi không có mạng **nếu máy đã có giọng tiếng Anh offline**; nếu chưa có, app phát hiện và hướng dẫn người dùng tải giọng.
- Số thẻ ôn hôm nay trên màn hình chính khớp với số thẻ thực tế.
- Số cụm mới trong ngày không vượt quá mục tiêu đã chọn.

### 4.2 Module Ghi chú

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-N-01 | Tạo, sửa, xóa ghi chú dạng văn bản | P0 |
| FR-N-02 | Gắn thẻ (tag) và lọc theo thẻ | P0 |
| FR-N-03 | Tìm kiếm ghi chú theo từ khóa | P0 |
| FR-N-04 | Ghim ghi chú quan trọng lên đầu danh sách | P0 |
| FR-N-05 | Lưu nhanh vào ghi chú từ: thẻ từ vựng, tin nhắn của AI (và câu trong bài nghe ở P1). Ghi chú lưu kèm nguồn; câu tiếng Anh trong ghi chú có nút đọc lại bằng TTS | P0 |
| FR-N-06 | Chuyển một ghi chú thành thẻ từ vựng để ôn tập | P1 |
| FR-N-07 | Hoạt động đầy đủ khi offline | P0 |

**Tiêu chí nghiệm thu:** ghi chú tạo khi offline vẫn còn nguyên khi mở lại app; tìm kiếm trả kết quả dưới 1 giây với 1.000 ghi chú.

### 4.3 Module Luyện nghe (giai đoạn 2)

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-L-01 | Thư viện bài nghe theo trình độ và chủ đề (hội thoại, đoạn độc thoại ngắn) | P1 |
| FR-L-02 | Điều chỉnh tốc độ phát (0.75x, 1x, 1.25x) và nghe lại từng câu | P1 |
| FR-L-03 | Ba chế độ tăng dần: chậm có transcript, tốc độ thật có transcript, tốc độ thật không transcript | P1 |
| FR-L-04 | Bài tập sau khi nghe: câu hỏi hiểu ý chính, điền từ còn thiếu, chép chính tả | P1 |
| FR-L-05 | Nhiều giọng: Mỹ, Anh, Úc, Ấn Độ và giọng không phải bản xứ (phụ thuộc giọng có trên máy) | P1 |
| FR-L-06 | Chuyên đề nối âm và nói tắt (gonna, wanna, whaddaya, nuốt âm) kèm ví dụ nghe-so sánh | P1 |
| FR-L-07 | Bấm vào từ hoặc câu trong transcript để lưu vào ghi chú hoặc từ vựng | P1 |

**Tiêu chí nghiệm thu:** người học nghe lại được từng câu trong 1 thao tác; kết quả bài tập được lưu vào lịch sử học.

### 4.4 Module Luyện nói (giai đoạn 2)

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-S-01 | Shadowing: app đọc mẫu, người học đọc theo, nghe lại bản của mình cạnh bản mẫu (nghe lại bản thu cần Android 13+) | P1 |
| FR-S-02 | Nhận diện giọng nói và đối chiếu với câu gốc, đánh dấu từ nói chưa đúng | P1 |
| FR-S-03 | Bài phản xạ: app đưa câu hỏi, người học trả lời bằng giọng nói trong thời gian giới hạn | P1 |
| FR-S-04 | Chấm ngữ điệu và nhịp nói | P2 |
| FR-S-05 | Từ phát âm sai nhiều được đưa vào danh sách luyện riêng | P2 |

### 4.5 Module Giao tiếp với AI

**Mô tả:** tính năng khác biệt chính. Người học nói chuyện với AI theo tình huống thực, AI nói ở đúng độ khó của trình độ người học.

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-A-01a | Hội thoại bằng giọng nói kiểu **chạm để nói**: người học chạm nút mic để nói, AI trả lời bằng chữ và giọng đọc; chạm vào nút dừng để ngắt AI đang đọc; có chế độ gõ chữ thay thế | P0 |
| FR-A-01b | Chế độ đàm thoại rảnh tay: tự bật mic sau khi AI đọc xong, nói chen để ngắt AI | P1 |
| FR-A-02 | Thư viện kịch bản đóng vai (gọi món, phỏng vấn, hỏi đường, đặt phòng, họp công việc...) và chế độ trò chuyện tự do | P0 |
| FR-A-03 | AI điều chỉnh từ vựng, độ dài câu và tốc độ theo trình độ người dùng | P0 |
| FR-A-04 | AI không ngắt hội thoại để sửa từng lỗi; cuối buổi hiển thị tổng kết: lỗi lặp lại, cách nói tự nhiên hơn, cụm từ nên lưu | P0 |
| FR-A-05 | Nút "Giải thích bằng tiếng Việt" cho từng câu của AI | P0 |
| FR-A-06a | Lưu câu hoặc cụm từ hay vào **ghi chú** bằng một chạm | P0 |
| FR-A-06b | Lưu câu hoặc cụm từ thành thẻ từ vựng (AI gợi nghĩa, xem FR-V-07) | P1 |
| FR-A-07 | Giới hạn số lượt hội thoại mỗi ngày, hiển thị lượt còn lại | P0 |
| FR-A-08 | Lưu lịch sử buổi hội thoại để xem lại | P1 |
| FR-A-09 | Kịch bản do người dùng tự mô tả (ví dụ "phỏng vấn vị trí kế toán") | P2 |
| FR-A-10 | "Giải thích tiếng Việt" và "Tổng kết cuối buổi" có hạn mức riêng, không trừ vào lượt hội thoại | P0 |

**Tiêu chí nghiệm thu:**

- Chữ đầu tiên của phản hồi AI hiển thị trong khoảng 3 giây sau khi người học dừng nói (mạng 4G bình thường).
- AI bắt đầu đọc câu đầu tiên trước khi phản hồi được tạo xong.
- Tổng kết cuối buổi chỉ ra tối thiểu các lỗi lặp lại của chính buổi đó.
- Khi STT lỗi hoặc không có quyền micro, app chuyển sang ô gõ chữ mà không mất buổi hội thoại.
- Khi hết lượt trong ngày, app thông báo rõ thời điểm lượt được làm mới và vẫn cho dùng các tính năng khác.

### 4.6 Module Kiểm tra đầu vào, lộ trình và tiến độ

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-P-01a | Xếp trình độ A1 đến B2 bằng tự đánh giá kết hợp bài trắc nghiệm ngắn (nghe và đọc cụm từ, khoảng 10 đến 15 câu); người dùng sửa được trình độ trong Cài đặt | P0 |
| FR-P-01b | Bổ sung phần nói vào bài kiểm tra đầu vào | P1 |
| FR-P-02 | Mục tiêu học hằng ngày (số cụm mới, số phút) do người dùng chọn | P0 |
| FR-P-03 | Chuỗi ngày học liên tiếp (streak) và thống kê cơ bản: số cụm đã thuộc, số phút học, số buổi nói | P0 |
| FR-P-04 | Nhắc học hằng ngày bằng thông báo, người dùng chỉnh giờ hoặc tắt được | P0 |
| FR-P-05 | Báo cáo tiến bộ theo từng kỹ năng nghe và nói | P2 |
| FR-P-06 | Lộ trình cá nhân hóa dựa trên lỗi và kết quả học | P2 |

### 4.7 Module Cài đặt và dữ liệu người dùng

| Mã | Yêu cầu | Ưu tiên |
| --- | --- | --- |
| FR-U-01 | Cài đặt: trình độ, mục tiêu, giọng đọc, tốc độ đọc, giao diện sáng/tối | P0 |
| FR-U-02 | Xin quyền micro khi cần, giải thích rõ lý do. Lần đầu dùng hội thoại AI, hiển thị thông báo: nội dung **văn bản** hội thoại được gửi tới dịch vụ AI bên thứ ba, có thể được nhà cung cấp dùng để cải thiện dịch vụ; không nên nhập thông tin cá nhân | P0 |
| FR-U-03 | Sao lưu và xuất dữ liệu (ghi chú, tiến độ) | P1 |
| FR-U-04 | Đăng nhập và đồng bộ dữ liệu giữa các thiết bị | P2 |
| FR-U-05 | Xóa toàn bộ dữ liệu học trên máy (có xác nhận) | P0 |

## 5. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| --- | --- |
| **Chi phí** | Vận hành bằng các gói miễn phí; mọi tính năng không dùng AI chạy được mà không tốn request |
| **Offline** | Từ vựng, ôn tập, ghi chú, tiến độ, nhắc học dùng được khi không có mạng; chỉ hội thoại AI cần mạng |
| **Hiệu năng** | Mở app dưới 3 giây trên máy tầm trung (trừ lần đầu nạp nội dung); chuyển màn hình mượt; phản hồi AI hiển thị dần (streaming) |
| **Bảo mật** | Khóa API của dịch vụ AI không nằm trong app; giới hạn lượt dùng theo thiết bị, theo IP và tổng toàn hệ thống |
| **Quyền riêng tư** | Không thu thập thông tin định danh; chỉ gửi văn bản, không gửi audio; không lưu nội dung hội thoại trên server; người dùng xóa được dữ liệu của mình |
| **Tương thích** | Android 8 trở lên (đối chiếu yêu cầu tối thiểu của Expo khi khởi tạo); hỗ trợ màn hình nhỏ; có chế độ gõ chữ khi nhận diện giọng nói không hoạt động |
| **Khả dụng** | Giao diện tiếng Việt, thao tác chính không quá 2 chạm, chữ đủ lớn, hỗ trợ chế độ tối |
| **Bảo trì** | Nội dung học (cụm từ, kịch bản, bài nghe) tách khỏi mã nguồn để cập nhật mà không sửa code |

### 5.1 Định nghĩa "một ngày"

- **Streak, mục tiêu ngày, số thẻ cần ôn:** tính theo giờ địa phương của điện thoại, ngày mới bắt đầu lúc 00:00.
- **Lượt hội thoại AI:** tính theo giờ Việt Nam (UTC+7) trên server, làm mới lúc 00:00 giờ Việt Nam. App hiển thị thời điểm làm mới.
- Một ngày được tính là "có học" khi người học hoàn thành ít nhất một trong các việc: ôn hoặc học ít nhất 1 thẻ, hoặc hoàn thành 1 buổi hội thoại.

## 6. Nội dung học

- **Cụm từ và mẫu câu:** khoảng 60 cụm (3 chủ đề) để thử sớm, tăng lên khoảng 200 cụm cho bản MVP gửi người thử; mở rộng dần lên vài nghìn cụm.
- **Kịch bản hội thoại AI:** 3 kịch bản để thử sớm, khoảng 10 kịch bản cho MVP; mỗi kịch bản có mục tiêu, vai AI, vai người học, từ khóa gợi ý, câu mở đầu.
- **Bài kiểm tra đầu vào:** khoảng 30 câu trắc nghiệm chia theo A1 đến B2.
- **Bài nghe (giai đoạn 2):** dùng giọng tổng hợp (TTS) nhiều giọng; bổ sung nguồn audio có giấy phép mở hoặc tự thu khi có điều kiện.
- **Quy trình:** AI sinh bản nháp, người biên tập duyệt lại về độ chính xác và độ tự nhiên trước khi đưa vào app.
- **Bản quyền:** chỉ dùng nội dung tự soạn hoặc có giấy phép rõ ràng; không sao chép giáo trình hay audio có bản quyền.

## 7. Chỉ số thành công

| Chỉ số | Mục tiêu tham khảo |
| --- | --- |
| Người dùng quay lại sau 7 ngày | từ 25% trở lên |
| Số ngày học trung bình mỗi tuần | từ 4 ngày |
| Số buổi hội thoại AI hoàn thành mỗi tuần mỗi người dùng tích cực | từ 3 buổi |
| Tỷ lệ hoàn thành bài kiểm tra đầu vào | từ 70% |
| Điểm tự đánh giá "tự tin khi nói" sau 8 tuần | tăng so với ban đầu |

Ở MVP không có analytics trên server, nên các chỉ số trên được thu bằng **phỏng vấn và khảo sát nhóm người thử** (5 đến 10 người), kết hợp màn hình thống kê trong app. Các con số cần hiệu chỉnh sau khi có dữ liệu thực tế.

## 8. Phân giai đoạn

| Giai đoạn | Nội dung chính |
| --- | --- |
| **MVP (P0)** | Cụm từ theo chủ đề + ôn tập ngắt quãng (3 kiểu bài tập), Ghi chú, Hội thoại AI chạm để nói theo kịch bản + giải thích tiếng Việt + tổng kết, xếp trình độ (không chấm nói), nhắc học, tiến độ cơ bản, xóa dữ liệu |
| **Giai đoạn 2 (P1)** | Thư viện bài nghe nhiều giọng và nhiều tốc độ, shadowing, nối âm và nói tắt, đàm thoại rảnh tay, bộ từ tự tạo + AI gợi nghĩa, lưu câu AI thành thẻ, lịch sử hội thoại, sao lưu, phần nói trong kiểm tra đầu vào |
| **Giai đoạn 3 (P2)** | Chấm ngữ điệu, báo cáo tiến bộ theo kỹ năng, lộ trình cá nhân hóa, đăng nhập và đồng bộ, kịch bản tự tạo |

## 9. Giả định, ràng buộc và rủi ro

### 9.1 Giả định

- Người dùng có điện thoại Android và micro hoạt động tốt.
- Có kết nối mạng khi dùng tính năng hội thoại AI.
- Nhận diện giọng nói của hệ điều hành đủ dùng cho tiếng Anh giọng người Việt. **Giả định này phải được kiểm chứng ở Sprint 0** trên ít nhất 2 đến 3 máy khác hãng.

### 9.2 Ràng buộc

- Ngân sách hạ tầng bằng 0, phụ thuộc hạn mức của các gói miễn phí.
- Nguồn lực phát triển: 1 người. Phạm vi MVP đã được cắt cho phù hợp (xem mục 0).

### 9.3 Rủi ro

| Rủi ro | Mức độ | Hướng xử lý |
| --- | --- | --- |
| Gói AI miễn phí bị giảm hạn mức hoặc ngừng | Cao | Hỗ trợ nhiều nhà cung cấp, giới hạn lượt dùng, ngân sách toàn hệ thống |
| Chất lượng nhận diện giọng nói thay đổi theo thiết bị | Cao | Kiểm tra sớm trên nhiều máy, luôn có chế độ gõ chữ |
| Máy chưa có giọng tiếng Anh offline | Trung bình | Phát hiện và hướng dẫn tải giọng ngay lúc onboarding |
| Giọng đọc tổng hợp thiếu tự nhiên, ít giọng | Trung bình | Chọn giọng tốt nhất sẵn có, bổ sung nguồn audio thật dần |
| Nội dung học sai hoặc thiếu tự nhiên do AI sinh | Trung bình | Bắt buộc có bước biên tập, thu thập phản hồi từ người dùng |
| Người dùng bỏ học giữa chừng | Cao | Bài ngắn, nhắc học, streak, lộ trình rõ ràng |
| Lo ngại quyền riêng tư với dữ liệu hội thoại | Trung bình | Chỉ gửi văn bản, không gửi định danh, thông báo minh bạch (FR-U-02) |
| Tiến độ trễ do 1 người làm | Cao | Phạm vi MVP đã cắt; mỗi sprint ra một APK cài được; theo dõi bằng PLAN.md |

## 10. Câu hỏi mở và quyết định tạm

Các quyết định dưới đây là **tạm thời** để bắt đầu triển khai; chủ sản phẩm xác nhận hoặc sửa lại.

| # | Câu hỏi | Quyết định tạm | Trạng thái |
| --- | --- | --- | --- |
| 1 | Nội dung bài nghe lấy từ đâu? | Giai đoạn 2 dùng TTS trên máy; audio thật có giấy phép bổ sung sau | Chờ xác nhận |
| 2 | MVP có cần tài khoản người dùng? | **Không.** Dùng cục bộ, danh tính thiết bị ẩn danh | Chờ xác nhận |
| 3 | Có cần đa ngôn ngữ giao diện? | **Không**, chỉ tiếng Việt | Chờ xác nhận |
| 4 | Đo mức độ "giao tiếp được" thế nào? | MVP: tự đánh giá định kỳ trong app + phỏng vấn người thử | Chờ xác nhận |
| 5 | Mô hình duy trì lâu dài? | MVP hoàn toàn miễn phí; quyết định sau khi có dữ liệu sử dụng | Chờ xác nhận |
| 6 | Có chấp nhận nhà cung cấp AI miễn phí có thể dùng dữ liệu hội thoại? | **Chấp nhận**, kèm thông báo FR-U-02; ưu tiên nhà cung cấp không dùng dữ liệu nếu hạn mức tương đương | Chờ xác nhận |

## 11. Thuật ngữ

| Thuật ngữ | Giải thích |
| --- | --- |
| CEFR | Khung tham chiếu trình độ ngôn ngữ châu Âu (A1 đến C2) |
| Ôn tập ngắt quãng | Phương pháp ôn lại kiến thức đúng thời điểm sắp quên để nhớ lâu hơn |
| Shadowing | Nghe và nhắc lại ngay theo người nói để luyện phát âm, ngữ điệu |
| STT / TTS | Chuyển giọng nói thành văn bản / chuyển văn bản thành giọng nói |
| Chạm để nói | Người học chạm nút mic để bắt đầu nói; app ngừng nghe khi người học dừng nói hoặc chạm lại |
| Streaming | Hiển thị phản hồi dần dần khi đang được tạo, thay vì chờ hoàn thành |
| MVP | Phiên bản tối thiểu dùng được để thử nghiệm với người dùng thật |
