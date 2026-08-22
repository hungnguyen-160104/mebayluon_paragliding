# Năm script Google nối với app — cái nào làm gì

Tất cả đều là Apps Script. Quy tắc chung khi sửa: **Triển khai → Quản lý mục
triển khai → biểu tượng bút chì → Phiên bản: Mới** rồi Deploy. Đừng tạo mục
triển khai mới — địa chỉ web sẽ đổi và app gọi trượt.

| Tệp | Dán vào đâu | App nối bằng gì | Trạng thái |
| --- | --- | --- | --- |
| `baohiem-apps-script.gs` | bảng **Bảo hiểm** (bảng mới) | `INSURANCE_SHEET_WEBHOOK_URL` + `INSURANCE_SHEET_SECRET` | **chờ anh dán & khai biến** |
| `baocao-apps-script.gs` | bảng **Báo bay** của TỪNG điểm bay | `BAOBAY_SHEET_WEBHOOK_URL` + `BAOBAY_SHEET_SECRET` (hoặc khai riêng từng điểm ở `/baocao/admin`) | đang chạy |
| `pilot-sheet-apps-script.gs` | bảng **Đăng ký phi công** (Mùa Vàng) | `PILOT_SHEET_WEBHOOK_URL` + `PILOT_SHEET_SECRET` | đang chạy |
| `klook-email-apps-script.gs` | project **đứng riêng**, đăng nhập bằng chính hộp thư | script tự gọi `https://www.mebayluon.com/api/baocao/ota/inbound`, mã bảo vệ khớp `OTA_INBOUND_SECRET` | đang chạy (2 hộp: mebayluon@ và sapa.paragliding@) |
| `bot-bridge-setLiveData.gs` | **thêm vào** project cầu nối bot đang có | `BOT_BRIDGE_URL` + `BOT_BRIDGE_SECRET` | đây là **đoạn vá**, dán thêm vào Code.gs |

## Hướng chảy của dữ liệu

- **App → bảng tính**: bảo hiểm, báo bay, đăng ký phi công. App đẩy sang, bảng
  là bản sao cho người đọc. Đẩy hỏng thì bản ghi mang dấu "chưa sang bảng" và có
  nút đẩy lại — số liệu gốc luôn nằm trong cơ sở dữ liệu.
- **Gmail → app**: thư OTA (Klook, GetYourGuide, KKday, Seek Sophie, Viator,
  Trip.com). Script chạy theo giờ, quét theo địa chỉ người gửi rồi POST về app.
- **App → Google Doc**: khối dữ liệu sống (lịch bay, phòng trống) cho chatbot
  đọc. Đây là đoạn vá `setLiveData_` cắm vào cầu nối bot sẵn có.

## Mã bảo vệ

Kho mã này là kho **công khai**, nên mọi tệp `.gs` ở đây đều để chuỗi giả
(`DAN_MA_BAO_VE_...`). Dán chuỗi thật trực tiếp trên Apps Script, rồi khai đúng
chuỗi đó vào biến môi trường tương ứng trên Vercel.

Hướng dẫn chi tiết từng script: `baohiem-apps-script.md`, `baocao-apps-script.md`,
`pilot-sheet-apps-script.md`.
