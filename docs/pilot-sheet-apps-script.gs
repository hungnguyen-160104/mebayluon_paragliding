const SECRET = 'MAT_KHAU_CUA_BAN';

/**
 * Tên cột -> tên trường trong dữ liệu gửi sang.
 *
 * Script ghi theo TÊN CỘT ở hàng 1, không theo thứ tự. Nhờ vậy:
 *  - Kéo cột đổi chỗ trong bảng: vẫn ghi đúng ô.
 *  - Thêm cột mới ở giữa: không phải sửa gì.
 *  - Chèn cột ghi chú riêng của mình: script bỏ qua, không đụng vào.
 *
 * Bản cũ ghi theo thứ tự (appendRow một mảng), nên chỉ cần lệch một cột là
 * toàn bộ dữ liệu từ đó trở đi rơi sai ô — và không có cách nào biết.
 */
const COLUMNS = {
  'Mã đăng ký': 'code',
  'Thời điểm đăng ký': 'createdAt',
  'Họ tên': 'fullName',
  'CCCD/Passport': 'idNumber',
  'Quốc tịch': 'nationality',
  'Điện thoại': 'phone',
  'Email': 'email',
  'Địa chỉ': 'address',
  'CLB/Hội': 'club',
  'Loại hình bay': 'flyingKind',
  'Loại máy': 'motorType',
  'Cấp dù': 'wingClass',
  'Đợt bay': 'period',
  'Ngày bay': 'dates',
  'Số ngày': 'dayCount',
  'Người nhà': 'companionCount',
  'Phí điểm bay': 'siteFeeMode',
  'Chi tiết phí': 'feeDetail',
  'Tổng tiền': 'feeTotal',
  'Yêu cầu riêng': 'specialRequest',
  'Cỡ áo': 'shirtSize',
  'Kéo cờ khai mạc': 'flagFlight',
};

/**
 * Mở thẳng đường dẫn /exec trên trình duyệt sẽ chạy hàm này.
 * Nó liệt kê luôn các cột script ĐANG nhìn thấy — nhờ đó biết ngay bản đang
 * chạy có phải bản mới không, khỏi phải đoán.
 */
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const headers = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    : [];
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      version: 'ghi-theo-ten-cot-v2',
      headersInSheet: headers,
      known: Object.keys(COLUMNS),
    }))
    .setMimeType(ContentService.MimeType.JSON);
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

    // Bảng còn trống: tạo hàng tiêu đề theo đúng thứ tự khai ở COLUMNS.
    if (sheet.getLastRow() === 0) {
      const headers = Object.keys(COLUMNS);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const r = body.row || {};

    // Dựng một hàng đúng bằng số cột đang có, điền theo tên cột.
    const line = headers.map(function (title) {
      const field = COLUMNS[String(title).trim()];
      if (!field) return '';           // cột riêng của anh: không đụng vào
      const v = r[field];
      return (v === undefined || v === null) ? '' : v;
    });

    // Cột script biết mà bảng chưa có: báo về để còn biết đường thêm.
    const missing = Object.keys(COLUMNS).filter(function (title) {
      return headers.indexOf(title) === -1;
    });

    sheet.appendRow(line);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, missingColumns: missing }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
