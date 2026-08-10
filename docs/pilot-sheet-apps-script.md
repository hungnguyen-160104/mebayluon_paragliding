# Nối trang đăng ký phi công với Google Sheets

Mỗi lượt phi công bấm "Xác nhận đăng ký" sẽ được ghi thêm một dòng vào bảng tính.
Cách nối dùng Apps Script webhook — không cần bật Google API, không cần file khoá JSON.

Làm một lần, khoảng 5 phút.

## 1. Tạo bảng tính

Tạo một Google Sheets mới, đặt tên ví dụ **Đăng ký phi công 2026**.
Không cần tự gõ tiêu đề cột — script sẽ tự tạo ở lần ghi đầu tiên.

## 2. Dán script

Trong bảng tính: **Tiện ích mở rộng → Apps Script**. Xoá hết nội dung có sẵn rồi dán đoạn dưới đây.

Đổi `MAT_KHAU_CUA_BAN` thành một chuỗi bất kỳ do anh tự đặt (chữ và số, không dấu).
Chuỗi này dùng để chặn người lạ ghi bừa vào bảng.

```javascript
const SECRET = 'MAT_KHAU_CUA_BAN';

const HEADERS = [
  'Mã đăng ký', 'Thời điểm đăng ký', 'Họ tên', 'CCCD/Passport', 'Quốc tịch',
  'Điện thoại', 'Email', 'Địa chỉ', 'CLB/Hội',
  'Loại hình bay', 'Loại máy', 'Cấp dù',
  'Đợt bay', 'Ngày bay', 'Số ngày', 'Người nhà',
  'Phí điểm bay', 'Chi tiết phí', 'Tổng tiền', 'Yêu cầu riêng', 'Cỡ áo',
];

/**
 * Mở thẳng đường dẫn /exec trên trình duyệt sẽ chạy hàm này.
 * Thấy chữ "OK" nghĩa là script đã deploy đúng và ai cũng gọi được.
 */
function doGet() {
  return ContentService
    .createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SECRET && body.secret !== SECRET) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'sai mã bảo vệ' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Lần đầu tiên: tạo hàng tiêu đề và ghim lại cho dễ đọc.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const r = body.row || {};
    sheet.appendRow([
      r.code, r.createdAt, r.fullName, r.idNumber, r.nationality,
      r.phone, r.email, r.address, r.club,
      r.flyingKind, r.motorType, r.wingClass,
      r.period, r.dates, r.dayCount, r.companionCount,
      r.siteFeeMode, r.feeDetail, r.feeTotal, r.specialRequest, r.shirtSize,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Triển khai lấy đường dẫn

Bấm **Triển khai → Tuỳ chọn triển khai mới**:

- Loại: **Ứng dụng web**
- Thực thi với tư cách: **Tôi**
- Ai có quyền truy cập: **Bất kỳ ai** — bắt buộc, vì máy chủ website gọi vào mà không đăng nhập Google. Đường dẫn vẫn được bảo vệ bằng chuỗi mật khẩu ở bước 2.

Google sẽ hỏi cấp quyền lần đầu, chọn tài khoản rồi **Nâng cao → Đi tới (không an toàn)** — đây là script của chính anh nên cứ cho phép.

Xong sẽ có một đường dẫn dạng `https://script.google.com/macros/s/AKfy.../exec`. Sao chép nó.

## 4. Kiểm tra nhanh

Mở đường dẫn `.../exec` bằng trình duyệt. Phải thấy đúng chữ **OK**.

- Thấy **OK** → script chạy đúng, sang bước 4.
- Thấy **"Rất tiếc, không thể mở tệp"** → quyền truy cập chưa phải "Bất kỳ ai".
- Thấy **"TypeError… (dòng 1, tệp Mã)"** hoặc lỗi khác → trong tệp còn sót nội dung cũ.
  Vào Apps Script, bấm vào ô soạn thảo, **Ctrl/Cmd + A** rồi xoá sạch, dán lại
  đoạn script trên (chỉ phần JavaScript, KHÔNG lấy dòng ```), bấm lưu.

**Sửa script xong phải triển khai lại một PHIÊN BẢN MỚI**, nếu không Google vẫn
chạy bản cũ: **Triển khai → Quản lý các bản triển khai → biểu tượng bút chì →
Phiên bản: Phiên bản mới → Triển khai**.

> ⚠️ Phải đi đúng đường **Quản lý các bản triển khai → bút chì**. Nếu bấm
> **Tuỳ chọn triển khai mới** thì Google cấp một đường dẫn `/exec` KHÁC và
> đường cũ chết ngay — production vẫn cầm đường cũ nên mọi đăng ký sẽ trả về
> 404 và không có dòng nào vào bảng. Chuyện này đã xảy ra một lần: 14 đăng ký
> nằm im trong cơ sở dữ liệu mà bảng trống trơn. Lỡ tạo bản triển khai mới thì
> phải cập nhật `PILOT_SHEET_WEBHOOK_URL` trên Vercel rồi deploy lại.

**Thêm cột vào bảng đang chạy**: script chỉ tự ghi dòng tiêu đề khi bảng còn
trống. Bảng đã có dữ liệu thì phải tự gõ tên cột mới vào ô trống kế tiếp ở
hàng 1 (ví dụ `Cỡ áo`), đúng thứ tự như trong `HEADERS`.

## 5. Khai vào biến môi trường

Trên Vercel (**Settings → Environment Variables**) và trong `.env.local` khi chạy máy mình:

```
PILOT_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
PILOT_SHEET_SECRET=MAT_KHAU_CUA_BAN
```

Khai xong phải **deploy lại** trên Vercel thì biến mới có hiệu lực.

## Khi nào cần lo

Đăng ký **không bao giờ hỏng vì bảng tính**: dữ liệu luôn được lưu vào cơ sở dữ liệu trước,
bảng tính chỉ là bản sao cho tiện theo dõi. Nếu ghi sang bảng thất bại, bản ghi trong cơ sở
dữ liệu sẽ có `sheetSynced: false` kèm lý do trong `sheetError`, và nhật ký máy chủ ghi
`[PilotRegistration] sheet sync failed`.

Chưa khai `PILOT_SHEET_WEBHOOK_URL` thì trang vẫn chạy bình thường, chỉ là chưa có dòng nào
chảy sang bảng tính.
