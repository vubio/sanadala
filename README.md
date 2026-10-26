# Sanadala · Học tiếng Trung

Website học tiếng Trung bằng tiếng Việt tại **https://tiengtrung.sanadala.com**.

## Hiện có

- HSK 3.0 cấp 1–6: 5.456 mục từ từ bảng Excel đã được chuẩn hóa.
- HSK 2.0 cấp 1–6: 5.000 mục từ, với nghĩa tiếng Việt, nghĩa tiếng Anh và ví dụ; **không có** trường Hán Việt.
- Chuyển đổi HSK 2.0 / 3.0 trực tiếp từ thanh trên cùng hoặc thư viện chương trình.
- Flashcards: chạm/nhấn Space để lật; vuốt ngang, phím mũi tên hoặc nút để chuyển từ.
- **Danh sách từ** dạng từ điển gọn, có thể mở ví dụ và nghe phát âm từng từ. **Bộ lọc** giữ các thẻ chi tiết kèm trạng thái học tập.
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
| `data/catalog.json`, `data/catalog2.json` | Danh mục HSK 3.0 và 2.0 |
| `data/hsk-N.json`, `data/hsk2-N.json` | Từ vựng của từng cấp theo phiên bản |
| `scripts/convert_excel.py` | Chuyển HSK 3.0 Excel thành JSON |
| `scripts/convert_hsk2.py` | Chuyển sáu Excel HSK 2.0 thành JSON |
| `CNAME` | Tên miền phụ sử dụng với GitHub Pages |

## Cập nhật học liệu từ Excel

Không đưa bản `.xlsx` gốc vào repository công khai. Từ máy cá nhân có Python và `openpyxl`:

```bash
python scripts/convert_excel.py "HSK_3.0_Levels_1-6_Revised.xlsx"
```

Sau đó commit các tệp `data/*.json`. Công cụ tự nhận cột `Level`, `STT`, `Vocabulary`, `Pinyin`, `Vietnamese` và các cột ví dụ như trong bảng gốc. Khi có Excel riêng cho cấp 7–9 theo cùng cấu trúc, chạy lại công cụ với tệp mới; cấp 1–6 được giữ nguyên.

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
- Ngữ pháp HSK 3.0 và cấp 7–9 đang được để dành cho các bộ học liệu bổ sung.
