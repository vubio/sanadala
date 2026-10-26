# Sanadala · Học tiếng Trung

Website học tiếng Trung bằng tiếng Việt tại **https://tiengtrung.sanadala.com**.

## Hiện có

- HSK 3.0 cấp 1–6: 5.456 mục từ từ bảng Excel đã được chuẩn hóa.
- HSK 2.0 cấp 1–6: 5.000 mục từ, với nghĩa tiếng Việt, nghĩa tiếng Anh và ví dụ; **không có** trường Hán Việt.
- HSK 3.0 cấp 7–9: **5.636 mục từ trong một bộ nâng cao riêng**, với Hán Việt, nghĩa tiếng Việt, ví dụ tiếng Trung và phiên âm cho ví dụ. Bảng nguồn nhóm 7–9 chung, không ghi cấp 7, 8, 9 của từng từ.
- Ngữ pháp HSK 3.0: **572 bài học từ bảy workbook** (cấp 1–6 và nhóm 7–9), với 958 cấu trúc giảng dạy và 1.549 câu/đoạn ví dụ có pinyin và nghĩa tiếng Việt. Các bài học giữ liên kết gốc giữa `Lessons` → `Lesson_Items` → `Teaching_Items` → `Examples`.
- Chuyển đổi ba bộ (HSK 2.0, HSK 3.0 cấp 1–6 và HSK 7–9) trực tiếp từ thanh trên cùng hoặc thư viện chương trình.
- Flashcards: chạm/nhấn Space để lật; vuốt ngang, phím mũi tên hoặc nút để chuyển từ.
- **Danh sách từ** dạng từ điển gọn, có thể mở ví dụ và nghe phát âm từng từ. **Bộ lọc** giữ các thẻ chi tiết kèm trạng thái học tập.
- **Ngữ pháp** theo bài học và chủ đề, có tìm kiếm, giải thích cách dùng, ví dụ nói và nghe từng câu hoặc cả đoạn văn; có thể hiện/ẩn Hán Việt. Người học có thể đánh dấu đã học/đang học và lưu bài yêu thích ngay trên thiết bị.
- Bộ lọc cấp độ, từ khóa, danh sách yêu thích, xáo trộn và tiến độ học.
- Liên kết đến kênh YouTube [Luyện Tiếng Trung](https://www.youtube.com/@luyentiengtrung) ở chân trang.
- Đọc tiếng Trung bằng Web Speech API trên thiết bị người học; không lưu tệp âm thanh.
- Đánh dấu **Sẽ học / Đang học / Đã học** và **Yêu thích** cho từng từ; lưu trên thiết bị bằng `localStorage`. Có nút tiếp tục ở từ gần nhất và bộ lọc tiến độ.
- Thông tin ủng hộ ở chân trang và hộp thoại xuất hiện một lần sau khoảng 4 phút học trong mỗi phiên tab.

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `index.html` | Giao diện tiếng Việt |
| `styles.css` | Giao diện máy tính và điện thoại |
| `app.js` | Chế độ học, bộ lọc, đọc giọng và lưu từ |
| `grammar.js` | Giao diện bài ngữ pháp, tìm kiếm, ví dụ, tiến độ và điều hướng |
| `data/catalog.json`, `data/catalog2.json`, `data/catalog79.json` | Ba danh mục bộ từ |
| `data/hsk-N.json`, `data/hsk2-N.json`, `data/hsk79-N.json` | Từ vựng theo bộ, HSK 7–9 chia tệp để tải nhanh |
| `data/grammar-catalog.json`, `data/grammar-N.json` | Danh mục và dữ liệu bài học ngữ pháp từng cấp, tải theo cấp khi cần |
| `scripts/convert_excel.py` | Chuyển HSK 3.0 Excel thành JSON |
| `scripts/convert_hsk2.py` | Chuyển sáu Excel HSK 2.0 thành JSON |
| `scripts/convert_hsk79.py` | Chuyển Excel nâng cao HSK 7–9 thành JSON riêng |
| `scripts/convert_grammar.py` | Chuyển 7 workbook ngữ pháp thành JSON bài học |
| `CNAME` | Tên miền phụ sử dụng với GitHub Pages |

## Cập nhật học liệu từ Excel

Không đưa bản `.xlsx` gốc vào repository công khai. Từ máy cá nhân có Python và `openpyxl`:

```bash
python scripts/convert_excel.py "HSK_3.0_Levels_1-6_Revised.xlsx"
```

Sau đó commit các tệp `data/*.json`. Công cụ HSK 3.0 cấp 1–6 tự nhận cột `Level`, `STT`, `Vocabulary`, `Pinyin`, `Vietnamese` và các cột ví dụ như trong bảng gốc.

Với bảng HSK 7–9 riêng (các cột `Level`, `Number`, `Vocabulary`, `Sinovietnamese`, `Pinyin`, `Vietnamese`, `Example_Chinese`, `Example_Sinovietnamese`, `Example_Pinyin`, `Example_Vietnamese`):

```bash
python scripts/convert_hsk79.py "HSK7_Examples_1-5636_Complete_with_Example_Readings.xlsx"
```

Công cụ chuyển riêng sheet `HSK_1-5636` sang `catalog79.json` và các đoạn `hsk79-N.json`, giữ nguyên dữ liệu của HSK 3.0 cấp 1–6. Sheet biên tập `Gloss_Changes` không được đưa lên web.

Với ngữ pháp, đặt các file `Grammar_HSK_1.xlsx` đến `Grammar_HSK_6.xlsx` và `Grammar_HSK_7_9.xlsx` trong một thư mục:

```bash
python scripts/convert_grammar.py "/duong-dan/toi/thu-muc"
```

Quá trình chuyển đổi giữ nguyên thứ tự bài học, các tiểu mục và câu ví dụ. Nội dung trong `Read_Me`, `Review_Log` và `Source_Lines` không được công khai. Danh mục ngữ pháp chỉ tải từng cấp khi người học lựa chọn.

Với HSK 2.0, đặt sáu Excel có tên `150 HSK1.xlsx`, `150 HSK2.xlsx`, `300 HSK3.xlsx`, `600 HSK4.xlsx`, `1300 HSK5.xlsx`, `2500 HSK6.xlsx` trong cùng một thư mục rồi chạy:

```bash
python scripts/convert_hsk2.py "/duong-dan/toi/thu-muc"
```

HSK 2.0 sử dụng hai trường từ gốc (`Chinese`, `Pinyin`) và bản từ/phiên âm cho người học (cột F, G); một số từ gốc có chú thích từ loại. Dữ liệu chính sử dụng cột F–L; cột M trở đi trong tệp nguồn không có tiêu đề rõ ràng và chỉ là dữ liệu phụ, không đưa vào website. Bản Excel tổng hợp dành cho tác giả được lưu riêng, không công khai trong repository.

## Đưa lên GitHub Pages

Tại `Settings → Pages`, chọn `Deploy from a branch`, nhánh `main`, thư mục `/ (root)`, rồi lưu. Đặt **Custom domain** là `tiengtrung.sanadala.com`. Trong Namecheap Advanced DNS, tạo `CNAME` với host `tiengtrung` và value `vubio.github.io`.

## Lưu ý

- Giọng đọc Web Speech API tùy thuộc vào trình duyệt, hệ điều hành và các giọng tiếng Trung có sẵn trên thiết bị. Không yêu cầu API key.
- Dữ liệu JSON được phục vụ công khai cùng website (không phải tệp Excel gốc).
- Tiến độ, lần học gần nhất và yêu thích được lưu riêng theo phiên bản HSK và **chỉ trong trình duyệt trên thiết bị hiện tại**. Xóa dữ liệu website/chế độ riêng tư có thể xóa tiến độ; không có tài khoản, máy chủ dữ liệu hay đồng bộ giữa các thiết bị. Dữ liệu này không được ghi lên GitHub.
- Tiến độ ngữ pháp dùng bộ khóa `localStorage` riêng, không ảnh hưởng đến tiến độ học từ vựng.
