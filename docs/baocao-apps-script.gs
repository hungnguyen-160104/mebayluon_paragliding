/**
 * Apps Script cho trang báo bay nội bộ — bản `baobay-multispot-v22`.
 *
 * Dán TOÀN BỘ tệp này vào Apps Script của bảng tính (Tiện ích mở rộng → Apps
 * Script), xoá hết nội dung cũ trước khi dán, rồi Triển khai → Tuỳ chọn triển
 * khai mới (Ứng dụng web · thực thi với tư cách TÔI · quyền truy cập BẤT KỲ AI).
 *
 * Mỗi điểm bay một bảng tính riêng, nhưng dùng CHUNG đúng tệp script này.
 * Hướng dẫn từng bước: docs/baocao-apps-script.md
 */

// Chuỗi mật khẩu của bảng tính này. Kho mã là kho CÔNG KHAI nên không để chuỗi
// thật ở đây — dán chuỗi thật vào Apps Script, rồi gõ đúng chuỗi đó vào ô
// "Mã bảo vệ" của điểm bay tương ứng ở /baocao/admin.
const SECRET = 'DAN_MA_BAO_VE_CUA_BAN_VAO_DAY';

/**
 * Bộ cột theo LOẠI báo cáo (body.kind) — KHÔNG theo tên tab.
 *
 * Vì sao: báo cáo phi công được ghi vào THẺ RIÊNG của từng người theo tháng
 * ("Giàng A Sáu 2026-08"), tên tab sinh tự động nên không liệt kê trước được.
 * Website gửi kèm body.kind để script biết dùng bộ cột nào; tab chưa có thì tự
 * tạo kèm hàng tiêu đề.
 *
 * Script ghi theo TÊN CỘT ở hàng 1, không theo thứ tự: kéo cột đổi chỗ hay chèn
 * cột ghi chú riêng của kế toán đều không sao.
 *
 * TUYỆT ĐỐI KHÔNG đặt tên cột chỉ gồm chữ số (bản đầu đặt '360'): JavaScript xếp
 * khoá dạng số lên trước làm sai thứ tự tiêu đề, và Sheets đổi ô đó thành SỐ làm
 * lệch phép đối chiếu tên cột. Cả hai đã xảy ra thật.
 */
const KINDS = {
  pilot: {
    'Khoá': 'key',
    'Ngày bay': 'date',
    'Phi công': 'pilotName',
    'Tài khoản': 'username',
    'Điểm bay': 'spot',
    'Số chuyến': 'flightCount',
    'Số mã vé': 'ticketCount',
    'Mã vé đã bay': 'ticketCodes',
    'Flycam': 'flycam',
    'Mã vé flycam': 'flycamCodes',
    'Camera 360': 'video360',
    'Mã vé 360': 'video360Codes',
    'Dù cờ đỏ': 'redFlag',
    'Mã vé cờ đỏ': 'redFlagCodes',
    'Bay hoàng hôn/săn mây': 'sunset',
    'Mã vé hoàng hôn/săn mây': 'sunsetCodes',
    'Bay kéo cờ': 'flagFlight',
    'Mã vé kéo cờ': 'flagFlightCodes',
    'Khách ngoại giao': 'diplomaticGuests',
    'Mã vé ngoại giao': 'diplomaticCodes',
    'Phí bãi (khách)': 'siteFeeGuests',
    'Nước cho khách': 'waterCost',
    'Xe cho khách': 'guestCarCost',
    'Chuyến PPG': 'ppgFlights',
    'Mã vé PPG': 'ppgCodes',
    'Đón BigC (lượt)': 'pickupBigC',
    'Đón khách sạn (lượt)': 'pickupHotel',
    'Xe lên núi (lượt)': 'mountainTrips',
    'Thu tại bãi': 'thuTotal',
    'Chi khác': 'otherExpense',
    'Chi tiết thu chi': 'expenseDetail',
    'Tổng chi': 'expenseTotal',
    'Ghi chú': 'note',
    'Trạng thái': 'submitted',
    'Trạng thái ngày': 'dayStatus',
    'Phạt nộp muộn': 'latePenalty',
    'Huỷ phạt': 'penaltyWaived',
    'Cập nhật lúc': 'updatedAt',
  },
  dispatcher: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điều phối': 'staffName',
    'Tài khoản': 'username',
    'Điểm bay': 'spot',
    'Số khách': 'guestCount',
    'Vé xuất ra': 'ticketsIssued',
    'Vé thu về': 'ticketsReturned',
    'Dải mã vé': 'issuedRanges',
    'Vé huỷ': 'cancelledCount',
    'Mã vé huỷ': 'cancelledCodes',
    'Chi tiết vé huỷ': 'cancelledDetail',
    'Vé dời lịch': 'rescheduledCount',
    'Mã vé dời lịch': 'rescheduledCodes',
    'Chi tiết dời lịch': 'rescheduledDetail',
    'Flycam': 'flycam',
    'Camera 360': 'video360',
    'Cờ đỏ': 'redFlag',
    'Bay hoàng hôn/săn mây': 'sunset',
    'Bay kéo cờ': 'flagFlight',
    'Khách ngoại giao': 'diplomaticGuests',
    'Mã vé ngoại giao': 'diplomaticCodes',
    'Tiền thu ngoại giao': 'diplomaticAmount',
    'Tiền mặt': 'cashReceived',
    'Chuyển khoản': 'transferReceived',
    'Chi tiết tiền thu': 'revenueDetail',
    'Tổng thu': 'revenueTotal',
    'Nước cho khách': 'guestWaterCost',
    'Xe lên núi': 'mountainCarCost',
    'Xe đưa đón': 'shuttleCarCost',
    'Chi khác': 'otherExpense',
    'Chi tiết chi khác': 'expenseDetail',
    'Tổng chi': 'expenseTotal',
    'Trạng thái ngày': 'dayStatus',
    'Ghi chú': 'note',
    'Cập nhật lúc': 'updatedAt',
  },
  close: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điểm bay': 'spot',
    'Kế toán': 'accountantName',
    'Số khách': 'guestCount',
    'Vé xuất ra': 'ticketsIssued',
    'Vé thu hồi': 'ticketsReturned',
    'Vé huỷ': 'cancelledCount',
    'Khách đăng ký': 'registeredGuests',
    'Mã vé huỷ': 'cancelledCodes',
    'Ghi chú vé huỷ': 'cancelledNote',
    'Vé dời lịch': 'rescheduledCount',
    'Mã vé dời lịch': 'rescheduledCodes',
    'Dải mã vé': 'issuedRanges',
    'Tiền mặt': 'cashTotal',
    'Chuyển khoản': 'transferTotal',
    'Tổng thu': 'revenueTotal',
    'Flycam': 'flycam',
    'Camera 360': 'video360',
    'Dù cờ đỏ': 'redFlag',
    'Bay hoàng hôn/săn mây': 'sunset',
    'Bay kéo cờ': 'flagFlight',
    'Thu chi kế toán': 'ledgerDetail',
    'Đã duyệt chi': 'expensesApproved',
    'Đã duyệt lệch': 'varianceApproved',
    'Trạng thái': 'status',
    'Chốt lúc': 'closedAt',
    'Người chốt': 'closedBy',
    'Ghi chú': 'note',
    'Cập nhật lúc': 'updatedAt',
  },
  cameraman: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Camera man': 'cameramanName',
    'Tài khoản': 'username',
    'Số chuyến flycam': 'flycamFlights',
    'Mã vé flycam': 'flycamCodes',
    'Số quay dù lượn': 'paraglidingFlights',
    'Mã vé quay dù lượn': 'paraglidingCodes',
    'Thu tại bãi': 'thuTotal',
    'Chi tiêu': 'otherExpense',
    'Chi tiết thu chi': 'expenseDetail',
    'Ghi chú': 'note',
    'Trạng thái': 'submitted',
    'Trạng thái ngày': 'dayStatus',
    'Cập nhật lúc': 'updatedAt',
  },
  handover: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điểm bay': 'spot',
    'Người đưa': 'staffName',
    'Tài khoản': 'username',
    'Vai trò': 'role',
    'Người nhận': 'recipientName',
    'Vai trò người nhận': 'recipientRole',
    'Số tiền': 'amount',
    'Hình thức': 'method',
    'Nội dung': 'content',
    'Trạng thái': 'status',
    'Xác nhận lúc': 'confirmedAt',
    'Người xác nhận': 'confirmedBy',
    'Lý do từ chối': 'rejectedReason',
    'Cập nhật lúc': 'updatedAt',
  },
  booking: {
    'Khoá': 'key',
    'Ngày bay': 'flightDate',
    'Điểm bay': 'spot',
    'Nhập lúc': 'createdAt',
    'Người nhập': 'createdBy',
    'Nguồn': 'source',
    'Số booking': 'bookingCode',
    'Tên liên hệ': 'contactName',
    'SĐT': 'phone',
    'Số khách': 'guestCount',
    'Flycam': 'flycam',
    'Camera 360': 'video360',
    'Dù cờ đỏ': 'redFlag',
    'Bay hoàng hôn/săn mây': 'sunset',
    'Bay kéo cờ': 'flagFlight',
    'Đưa đón': 'pickup',
    'Giờ dự kiến': 'expectedTime',
    'Loại hình': 'flightKind',
    'Phí đưa đón': 'pickupFee',
    'Xe lên núi (suất)': 'mountainCar',
    'Đơn giá': 'unitPrice',
    'Giảm trừ': 'discount',
    'Tổng tiền': 'totalAmount',
    'Đã cọc': 'deposit',
    'Còn lại phải thu': 'remaining',
    'Mã chuyển khoản': 'transferCode',
    'Cọc vào TK cty': 'depositToCompany',
    'Trạng thái': 'status',
    'Dời từ': 'rescheduledFrom',
    'Giao cho': 'assignedTo',
    'Ghi chú': 'note',
    'Cập nhật lúc': 'updatedAt',
  },
  collect: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điểm bay': 'spot',
    'Tên khách': 'guestName',
    'Mã booking': 'bookingCode',
    'Đại lý': 'agency',
    'Số người': 'guests',
    'Số tiền': 'amount',
    'Hình thức': 'method',
    'TK công ty': 'toCompanyAccount',
    'Mã chuyển khoản': 'transferCode',
    'Người thu': 'collector',
    'Trạng thái': 'status',
    'Người lập': 'createdBy',
    'Ghi chú': 'note',
    'Cập nhật lúc': 'updatedAt',
  },
  daysummary: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điểm bay': 'spot',
    'Trạng thái': 'status',
    'Số lỗi đỏ': 'issues',
    'Số khách': 'guestCount',
    'Vé xuất ra': 'ticketsIssued',
    'Vé thu hồi': 'ticketsReturned',
    'Vé huỷ': 'cancelledCount',
    'Vé dời lịch': 'rescheduledCount',
    'PC khai chuyến': 'pilotFlights',
    'Số mã đã bay': 'flownCodes',
    'Số PC báo cáo': 'pilotCount',
    'PC đã chốt': 'pilotSubmitted',
    'Tiền mặt': 'cashTotal',
    'Chuyển khoản': 'transferTotal',
    'Tổng thu': 'revenueTotal',
    'Flycam (điều phối)': 'flycamDispatcher',
    'Flycam (camera man)': 'flycamCameraman',
    'Camera 360 (điều phối)': 'video360Dispatcher',
    'Camera 360 (phi công)': 'video360Pilot',
    'Dù cờ đỏ': 'redFlag',
    'Bay hoàng hôn/săn mây': 'sunset',
    'Bay kéo cờ': 'flagFlight',
    'Vé ngoại giao': 'diplomaticTickets',
    'Thu ngoại giao': 'diplomaticAmount',
    'Tổng chi nhân viên': 'expenseTotal',
    'Thu hộ tại bãi': 'thuTotal',
    'Phạt nộp muộn': 'latePenalty',
    'Tiền ứng đã duyệt': 'advanceTotal',
    'Giao tiền đã nhận': 'handoverConfirmed',
    'Giao tiền chờ nhận': 'handoverPending',
    'Kế toán': 'accountantName',
    'Chốt lúc': 'closedAt',
    'Cập nhật lúc': 'updatedAt',
  },
  advance: {
    'Khoá': 'key',
    'Ngày': 'date',
    'Điểm bay': 'spot',
    'Người ứng': 'staffName',
    'Tài khoản': 'username',
    'Vai trò': 'role',
    'Người duyệt': 'recipientName',
    'Số tiền': 'amount',
    'Nội dung ứng': 'content',
    'Trạng thái': 'status',
    'Duyệt lúc': 'confirmedAt',
    'Người duyệt thật': 'confirmedBy',
    'Lý do từ chối': 'rejectedReason',
    'Cập nhật lúc': 'updatedAt',
  },
};

/** Cột dùng để nhận ra "vẫn là báo cáo cũ" -> ghi đè thay vì thêm dòng. */
const KEY_COLUMN = 'Khoá';

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mở thẳng đường dẫn /exec trên trình duyệt sẽ chạy hàm này — liệt kê các loại
 * báo cáo script biết, để biết ngay bản đang chạy có phải bản mới không.
 */
function doGet() {
  return json({
    ok: true,
    version: 'baobay-multispot-v22',
    kinds: Object.keys(KINDS),
    sheets: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) { return s.getName(); }),
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SECRET && body.secret !== SECRET) {
      return json({ ok: false, error: 'sai mã bảo vệ' });
    }

    const columns = KINDS[body.kind];
    if (!columns) {
      return json({ ok: false, error: 'không biết loại báo cáo: ' + body.kind });
    }
    if (!body.sheet) {
      return json({ ok: false, error: 'thiếu tên tab' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(body.sheet);
    if (!sheet) sheet = ss.insertSheet(body.sheet);

    // Tab còn trống: tạo hàng tiêu đề theo đúng thứ tự khai ở KINDS.
    if (sheet.getLastRow() === 0) {
      const titles = Object.keys(columns);
      sheet.appendRow(titles);
      sheet.getRange(1, 1, 1, titles.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const r = body.row || {};

    // null = cột riêng của kế toán, không thuộc script -> không ghi vào ô đó.
    const line = headers.map(function (title) {
      const field = columns[String(title).trim()];
      if (!field) return null;
      const v = r[field];
      return (v === undefined || v === null) ? '' : v;
    });

    // Tìm dòng cũ cùng Khoá (ngày|tài khoản) để ghi đè.
    let targetRow = 0;
    const keyCol = headers.map(function (h) { return String(h).trim(); }).indexOf(KEY_COLUMN) + 1;
    const lastRow = sheet.getLastRow();

    if (keyCol > 0 && r.key && lastRow > 1) {
      const keys = sheet.getRange(2, keyCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]).trim() === String(r.key).trim()) {
          targetRow = i + 2;
          break;
        }
      }
    }

    /**
     * Ghi MỘT lần cho cả dòng. Bản đầu ghi từng ô bằng setValue() — 15-30 lượt
     * gọi cho một dòng, đo thực tế 3,6-13,6s, có lần chạm ngưỡng chờ của website
     * nên báo "chưa sang bảng" dù bảng đã nhận đủ.
     */
    const isNew = targetRow === 0;

    if (isNew) {
      sheet.appendRow(line.map(function (v) { return v === null ? '' : v; }));
      targetRow = sheet.getLastRow();
    } else {
      const rangeObj = sheet.getRange(targetRow, 1, 1, headers.length);
      const current = rangeObj.getValues()[0];
      rangeObj.setValues([line.map(function (v, i) {
        return v === null ? current[i] : v;   // cột riêng của kế toán: giữ nguyên
      })]);
    }

    // Cột script biết mà bảng chưa có: báo về để còn biết đường thêm tiêu đề.
    const headerTexts = headers.map(function (h) { return String(h).trim(); });
    const missing = Object.keys(columns).filter(function (title) {
      return headerTexts.indexOf(title) === -1;
    });

    return json({ ok: true, row: targetRow, created: isNew, missingColumns: missing });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}
