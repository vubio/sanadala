# Sanadala · Học tiếng Trung

Website học tiếng Trung bằng tiếng Việt tại **https://tiengtrung.sanadala.com**.

## Hiện có

- HSK 3.0 cấp 1–6: 5.456 mục từ từ bảng Excel đã được chuẩn hóa.
- Thẻ ghi nhớ: chạm/nhấn Space để lật; vuốt ngang, phím mũi tên hoặc nút để chuyển từ.
- Duyệt từ vựng và bộ lọc cấp độ, từ khóa, danh sách yêu thích, xáo trộn.
- Đọc tiếng Trung bằng Web Speech API trên thiết bị người học; không lưu tệp âm thanh.
- Lưu từ yêu thích trên trình duyệt hiện tại bằng `localStorage`.
- Thông tin ủng hộ ở chân trang và hộp thoại xuất hiện một lần sau khoảng 4 phút học trong mỗi phiên tab.

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `index.html` | Giao diện tiếng Việt |
| `styles.css` | Giao diện máy tính và điện thoại |
| `app.js` | Chế độ học, bộ lọc, đọc giọng và lưu từ |
| `data/catalog.json` | Danh mục cấp độ |
| `data/hsk-N.json` | Từ vựng của từng cấp HSK |
| `scripts/convert_excel.py` | Công cụ chuyển Excel thành JSON |
| `CNAME` | Tên miền phụ sử dụng với GitHub Pages |

## Cập nhật học liệu từ Excel

Không đưa bản `.xlsx` gốc vào repository công khai. Từ máy cá nhân có Python và `openpyxl`:

```bash
python scripts/convert_excel.py "HSK_3.0_Levels_1-6_Revised.xlsx"
```

Sau đó commit các tệp `data/*.json`. Công cụ tự nhận cột `Level`, `STT`, `Vocabulary`, `Pinyin`, `Vietnamese` và các cột ví dụ như trong bảng gốc. Khi có Excel riêng cho cấp 7–9 theo cùng cấu trúc, chạy lại công cụ với tệp mới; cấp 1–6 được giữ nguyên.

## Đưa lên GitHub Pages

Tại `Settings → Pages`, chọn `Deploy from a branch`, nhánh `main`, thư mục `/ (root)`, rồi lưu. Đặt **Custom domain** là `tiengtrung.sanadala.com`. Trong Namecheap Advanced DNS, tạo `CNAME` với host `tiengtrung` và value `vubio.github.io`.

## Lưu ý

- Giọng đọc Web Speech API tùy thuộc vào trình duyệt, hệ điều hành và các giọng tiếng Trung có sẵn trên thiết bị. Không yêu cầu API key.
- Dữ liệu JSON được phục vụ công khai cùng website (không phải tệp Excel gốc).
- Danh sách yêu thích chỉ tồn tại trong trình duyệt; chưa đồng bộ giữa nhiều thiết bị.
- Ngữ pháp HSK 3.0 và cấp 7–9 đang được để dành cho các bộ học liệu bổ sung.
