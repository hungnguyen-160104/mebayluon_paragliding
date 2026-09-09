/**
 * Apps Script cho trang báo bay nội bộ — bản `baobay-multispot-v30`.
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
    'Trạng thái': 'submitted',
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
    'STT trong ngày': 'daySeq',
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
    'Đã xuất vé': 'ticketIssued',
    'Vệt thu tiền': 'collectedLog',
    'Trạng thái': 'status',
    'Dời từ': 'rescheduledFrom',
    'Giao cho': 'assignedTo',
    'Đã nhận khách': 'accepted',
    'Đã liên hệ khách': 'contacted',
    'Bay không vé': 'noTicketFlight',
    'Ghi chú gọi khách': 'contactNote',
    'Chiết khấu đại lý': 'commission',
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
  flycamcancel: {
    'Khoá': 'key',
    'Ngày bay': 'date',
    'Điểm bay': 'spot',
    'Mã vé huỷ': 'ticketCode',
    'Đoàn khách': 'booking',
    'Phi công bay kèm': 'pilotName',
    'Lý do huỷ': 'reason',
    'Cách hoàn': 'refundMode',
    'Số tiền hoàn': 'amount',
    'STK khách': 'bankAccount',
    'Trạng thái': 'status',
    'Mã chuyển khoản': 'transferCode',
    'Người chuyển': 'paidBy',
    'Người lập': 'createdBy',
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
    version: 'baobay-multispot-v30',
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

    /**
     * Sổ tay Sa Pa: tab tháng có sẵn, bố cục riêng của người dựng bảng nên đi
     * đường riêng, không qua bảng KINDS.
     *   sapapull  — ĐỌC, trả về các dòng trong khoảng ngày (nút "Lấy từ bảng")
     *   sapabook  — GHI một dòng (app lưu booking)
     *   sapabatch — GHI nhiều dòng (nút "Đẩy lên bảng")
     */
    if (body.kind === 'sapapull') return layDongSapa_(body);
    if (body.kind === 'sapabook') return ghiDongSapa_(body);
    if (body.kind === 'sapabatch') return ghiNhieuDongSapa_(body);

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

/* ===================================================================== */
/* SỔ TAY SA PA — NỐI HAI CHIỀU VỚI SỔ BOOKING CỦA APP                    */
/* ===================================================================== */
/**
 * Chỉ bảng "Bảng theo dõi chuyến bay" của SA PA cần phần này. Dán cả tệp vào
 * bảng nào cũng không sao: phần dưới chỉ chạy khi app gửi kind 'sapa*' hoặc
 * khi có người đặt đồng hồ cho quetSoBookingSapa.
 *
 * BẢNG SA PA KHÔNG GIỐNG CÁC TAB DO SCRIPT TỰ TẠO:
 *   hàng 1–2  tiêu đề gộp ô ("THÔNG TIN VÉ", "NGƯỜI NHẬN TIỀN"…)
 *   hàng 3    TÊN CỘT thật  ← script dò cột ở đây
 *   hàng 4    dòng tổng (=sum cả cột)
 *   hàng 5→   dữ liệu
 * Cột "Thành tiền" và "TỔNG THU" là CÔNG THỨC, cột "Chi TM"/"Chi CK"/"phi công
 * bay" là Ô GỘP THEO NGÀY. Script KHÔNG BAO GIỜ ghi vào bốn cột đó — đè lên là
 * kế toán mất phép tự cộng, hoặc vỡ ô gộp.
 */

/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  CHẾ ĐỘ CHỈ ĐỌC — BẬT SẴN. Script KHÔNG ghi một ô nào lên bảng này.  │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Bảng tính là sổ SỐNG của một nhân viên đang làm việc thật trên đó hằng ngày.
 * Chừng nào cách nhập booking trong app và thói quen của người đó chưa khớp
 * nhau, mọi phép ghi tự động đều là ghi đè lên công việc của người khác — mà
 * ghi đè trên Google Sheets thì người ta chỉ biết khi số đã sai.
 *
 * Đang bật thì:
 *   - app vẫn ĐỌC được (nút "Lấy từ bảng" chạy bình thường);
 *   - mọi lệnh ghi bị từ chối kèm lý do, kể cả việc thêm cột riêng của app;
 *   - đồng hồ quetSoBookingSapa nằm im — dùng nút trong app thay thế.
 *
 * MỞ KHOÁ thì phải mở CẢ HAI ĐẦU, đây là chủ ý: đổi dòng dưới thành `false`,
 * và khai `SAPA_SHEET_WRITE=1` trên Vercel. Quên một cái thì vẫn không ai ghi
 * bậy được.
 */
const SAPA_CHI_DOC = true;

/** Địa chỉ web app. Đổi khi chạy thử trên bản nháp. */
const SAPA_APP_URL = 'https://www.mebayluon.com';

/**
 * Mã bí mật script dùng khi GỌI SANG APP. Phải trùng với biến môi trường
 * SAPA_SHEET_SECRET khai trên Vercel (chưa khai thì app đọc BAOBAY_SHEET_SECRET).
 * Mặc định dùng luôn SECRET của bảng cho khỏi phải nhớ hai chuỗi.
 */
const SAPA_APP_SECRET = SECRET;

/** Hàng tiêu đề thật và hàng dữ liệu đầu tiên của tab tháng Sa Pa. */
const SAPA_HEADER_ROW = 3;
const SAPA_FIRST_ROW = 5;

/**
 * Chỉ quét các chuyến trong 45 ngày gần đây và mọi chuyến ở TƯƠNG LAI.
 * Tháng cũ là sổ kế toán đã chốt — quét lại chỉ tổ đánh thức hàng nghìn dòng
 * lịch sử rồi đẩy hết sang app.
 */
const SAPA_SCAN_DAYS = 45;
/** Mỗi lượt quét gửi tối đa 50 dòng (cửa app chặn ở 60) — lượt sau gửi tiếp. */
const SAPA_MAX_ROWS = 50;
/** Trần một lượt "Lấy từ bảng": đủ ôm cả tháng đông khách mà không vỡ bộ nhớ. */
const SAPA_MAX_PULL = 400;

/** Tên tab tháng: "T9-2026" và cả kiểu cũ "T1-26". */
const SAPA_TAB_RE = /^T\s*0?(\d{1,2})\s*-\s*(?:20)?(\d{2})$/i;

/** Tên trường app  →  TIÊU ĐỀ CỘT ở hàng 3. */
const SAPA_FIELD_HEADER = {
  month: 'Tháng',
  daySeq: 'Ghi chú',
  flightDate: 'Ngày bay',
  source: 'Code đại lý or lẻ',
  bookingCode: 'Số booking',
  guestNames: 'TÊN ĐĂNG KÝ',
  guestCount: 'SL MCC',
  unitPrice: 'Đơn giá',
  thanhTien: 'Thành tiền',
  flycam: 'Flycam',
  video360: '360',
  extraFee: 'Phụ thu khác',
  total: 'TỔNG THU',
  deposit: 'ĐẶT CỌC',
  commission: 'Chiết khấu đại lý',
  /**
   * NGƯỜI NHẬN TIỀN — từ 09/09/2026 app quản luôn "tiền về quỹ nào", nên nó
   * biết số nào vào cột nào. Mã quỹ khai ở lib/baobay/money-dest.ts; đổi tên
   * người thì sửa CẢ HAI nơi cho khớp (bên đó là `label`, bên này là tên cột).
   *
   * App CHỈ gửi quỹ nào thật sự có tiền — quỹ trống thì không gửi, và ô trên
   * bảng nằm yên. Nhờ vậy con số kế toán đã gõ tay từ trước không bị xoá
   * trắng chỉ vì app chưa biết tới nó.
   */
  'dest:tk-truong': 'TK Trường',
  'dest:tm-yen': 'TM c Yến',
  'dest:ngoai-te': 'NGOẠI TỆ',
  'dest:tk-cty': 'TK Cty',
  'dest:pos': 'POS',
};

/**
 * Cột TIỀN của flycam / 360 nằm NGAY BÊN PHẢI cột số lượng và KHÔNG có tiêu
 * đề (bảng gộp ô "Flycam" trùm hai cột). Không dò được bằng tên nên bám theo
 * vị trí — đây là chỗ duy nhất trong tệp phải làm vậy.
 */
const SAPA_MONEY_AFTER = { flycamMoney: 'flycam', video360Money: 'video360' };

/** Cột script tự thêm vào cuối bảng — CHỈ khi đã mở khoá ghi (đúng thứ tự này). */
const SAPA_EXTRA_HEADERS = [
  'SĐT', 'Điểm đón', 'Giờ đón', 'Trạng thái', 'Đã thu (app)', 'Ghi chú app', 'Khoá app', 'Dấu app',
];
const SAPA_EXTRA_FIELD = {
  phone: 'SĐT',
  pickupNote: 'Điểm đón',
  expectedTime: 'Giờ đón',
  statusText: 'Trạng thái',
  paidText: 'Đã thu (app)',
  warn: 'Ghi chú app',
  key: 'Khoá app',
  hash: 'Dấu app',
};

/** Ô CÔNG THỨC và Ô GỘP THEO NGÀY — script không ghi vào đây, không tính vân tay. */
const SAPA_NEVER_WRITE = ['thanhTien', 'total'];

function sapaNorm_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim();
}

/** Câu từ chối dùng chung cho mọi lệnh ghi khi đang khoá. */
function sapaTuChoiGhi_() {
  return json({
    ok: false,
    error: 'Bảng Sa Pa đang ở CHẾ ĐỘ CHỈ ĐỌC — đổi SAPA_CHI_DOC = false trong Apps Script khi muốn cho app ghi vào bảng',
  });
}

/** Tìm tab tháng theo tên app gửi ("T9-2026"), chấp nhận cả cách đặt tên cũ. */
function sapaTimTab_(ss, name) {
  var direct = ss.getSheetByName(name);
  if (direct) return direct;
  var want = SAPA_TAB_RE.exec(sapaNorm_(name));
  if (!want) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var m = SAPA_TAB_RE.exec(sapaNorm_(sheets[i].getName()));
    if (m && Number(m[1]) === Number(want[1]) && Number(m[2]) === Number(want[2])) return sheets[i];
  }
  return null;
}

/**
 * Dò vị trí từng cột trên MỘT tab.
 *
 * `choPhepTaoCot` chỉ được true khi đã mở khoá ghi: thêm một tiêu đề cũng là
 * SỬA BẢNG của người ta. Không tạo thì các cột riêng của app đơn giản là không
 * có trong `col` — mọi hàm dưới đây đều chịu được, chỉ là không nhớ được khoá.
 */
function sapaCols_(sheet, choPhepTaoCot) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(SAPA_HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var pos = {};
  for (var i = 0; i < headers.length; i++) {
    var t = sapaNorm_(headers[i]);
    if (t && pos[t] === undefined) pos[t] = i + 1;
  }

  var col = {};
  for (var field in SAPA_FIELD_HEADER) {
    var c = pos[sapaNorm_(SAPA_FIELD_HEADER[field])];
    if (c) col[field] = c;
  }
  for (var money in SAPA_MONEY_AFTER) {
    var base = col[SAPA_MONEY_AFTER[money]];
    if (base) col[money] = base + 1;
  }

  for (var k = 0; k < SAPA_EXTRA_HEADERS.length; k++) {
    var title = SAPA_EXTRA_HEADERS[k];
    if (pos[sapaNorm_(title)] === undefined && choPhepTaoCot === true) {
      lastCol = lastCol + 1;
      sheet.getRange(SAPA_HEADER_ROW, lastCol).setValue(title).setFontWeight('bold');
      pos[sapaNorm_(title)] = lastCol;
    }
  }
  for (var field2 in SAPA_EXTRA_FIELD) {
    var c2 = pos[sapaNorm_(SAPA_EXTRA_FIELD[field2])];
    if (c2) col[field2] = c2;
  }

  return { col: col, lastCol: lastCol };
}

/**
 * MÚI GIỜ CỦA CHÍNH BẢNG TÍNH, không phải một múi giờ đóng cứng.
 *
 * Sheets lưu ngày dưới dạng SỐ, và `getValue()` dựng ra một Date đúng nửa đêm
 * THEO MÚI GIỜ CỦA BẢNG. Đọc lại bằng múi giờ khác là ngày trượt đi một hôm:
 * bảng đặt ở +12 mà đọc theo giờ Việt Nam thì ô "01/09" hoá "31/08", cả ngày
 * booking rơi sai chỗ. Ô nào cũng phải quy chiếu về đúng khung của bảng.
 */
function sapaTz_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
}

/** Ngày bay của một dòng về "yyyy-MM-dd" theo múi giờ của bảng. */
function sapaNgay_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, sapaTz_(), 'yyyy-MM-dd');
  return sapaNorm_(v);
}

/** Giờ đón về "HH:mm" (ô kiểu giờ trong Sheets là một Date mốc 1899). */
function sapaGio_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, sapaTz_(), 'HH:mm');
  return sapaNorm_(v);
}

/**
 * VÂN TAY CỦA MỘT DÒNG — gộp mọi ô hai bên cùng trông coi.
 *
 * KHÔNG tính cột "Dấu app" (chính nó) và hai cột công thức: công thức tự đổi
 * khi ô khác đổi, tính vào thì dòng nào cũng "vừa có người sửa".
 */
function sapaVanTay_(col, values) {
  var parts = [];
  var keys = Object.keys(col).sort();
  for (var i = 0; i < keys.length; i++) {
    var f = keys[i];
    if (f === 'hash' || SAPA_NEVER_WRITE.indexOf(f) >= 0) continue;
    var v = values[col[f] - 1];
    if (f === 'flightDate') v = sapaNgay_(v);
    else if (f === 'expectedTime') v = sapaGio_(v);
    parts.push(f + '=' + sapaNorm_(v));
  }
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, parts.join('|'), Utilities.Charset.UTF_8);
  var hex = '';
  for (var j = 0; j < digest.length; j++) {
    hex += ('0' + (digest[j] & 0xff).toString(16)).slice(-2);
  }
  return hex;
}

/** Ghi một ô CHỈ KHI khác giá trị đang có — đỡ hàng trăm lượt ghi mỗi lượt. */
function sapaGhiO_(sheet, row, colIndex, value, current) {
  if (!colIndex) return false;
  var now = current === undefined ? sheet.getRange(row, colIndex).getValue() : current;
  if (sapaNorm_(now) === sapaNorm_(value)) return false;
  sheet.getRange(row, colIndex).setValue(value === undefined || value === null ? '' : value);
  return true;
}

/** Số cột → chữ cột ("A", "AB") để dựng công thức. */
function sapaA1_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/**
 * Bóc MỘT dòng của bảng thành gói dữ liệu gửi sang app.
 * `null` = dòng này không phải khách (dòng chi phí chung của ngày, dòng trống).
 */
function sapaDocDong_(col, v, rowNo) {
  var ngay = sapaNgay_(v[col.flightDate - 1]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;

  /**
   * BỎ QUA DÒNG KHÔNG PHẢI KHÁCH: mỗi ngày trên bảng còn có dòng ghi chi phí
   * chung (chỉ có ngày + mấy ô "Chi khác"). Nhận nhầm là app đẻ ra booking ma
   * không tên không khách.
   */
  var coTen = col.guestNames ? sapaNorm_(v[col.guestNames - 1]) !== '' : false;
  var coKhach = col.guestCount ? Number(v[col.guestCount - 1]) > 0 : false;
  var coMa = col.bookingCode ? sapaNorm_(v[col.bookingCode - 1]) !== '' : false;
  if (!coTen && !coKhach && !coMa) return null;

  var payload = { row: rowNo, flightDate: ngay };
  for (var field in col) {
    if (field === 'hash' || field === 'warn' || field === 'flightDate') continue;
    var raw = v[col[field] - 1];
    if (field === 'expectedTime') raw = sapaGio_(raw);
    else if (raw instanceof Date) raw = sapaNgay_(raw);
    payload[field] = raw === null || raw === undefined ? '' : raw;
  }
  return payload;
}

/**
 * ĐỌC — nút "Lấy từ bảng" bên app gọi vào đây.
 *
 * Chạy được cả khi đang khoá ghi: đọc thì không làm hỏng gì của ai. Đây cũng
 * là lý do nút "Lấy" trong app dùng được ngay còn nút "Đẩy" thì không.
 */
function layDongSapa_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sapaTimTab_(ss, body.sheet);
  if (!sheet) return json({ ok: false, error: 'không tìm thấy tab tháng: ' + body.sheet });

  var info = sapaCols_(sheet, false);
  var col = info.col;
  if (!col.flightDate) return json({ ok: false, error: 'tab thiếu cột "Ngày bay"' });

  var lastRow = sheet.getLastRow();
  if (lastRow < SAPA_FIRST_ROW) return json({ ok: true, rows: [], sheet: sheet.getName() });
  var grid = sheet.getRange(SAPA_FIRST_ROW, 1, lastRow - SAPA_FIRST_ROW + 1, info.lastCol).getValues();

  var from = sapaNorm_(body.from);
  var to = sapaNorm_(body.to);
  var rows = [];
  for (var i = 0; i < grid.length && rows.length < SAPA_MAX_PULL; i++) {
    var p = sapaDocDong_(col, grid[i], SAPA_FIRST_ROW + i);
    if (!p) continue;
    if (from && p.flightDate < from) continue;
    if (to && p.flightDate > to) continue;
    rows.push(p);
  }
  return json({ ok: true, sheet: sheet.getName(), rows: rows, chiDoc: SAPA_CHI_DOC });
}

/**
 * GHI một booking vào tab tháng (dùng chung cho lệnh một dòng và lệnh cả lô).
 *
 * Tìm dòng theo cột "Khoá app". Chưa có thì CHÈN dòng mới ngay dưới dòng cuối
 * cùng của CÙNG NGÀY BAY — để các chuyến một ngày vẫn nằm liền khối như nhân
 * viên vẫn xếp; không thấy ngày đó thì thêm xuống cuối bảng.
 */
function ghiMotDongSapa_(sheet, info, r) {
  var col = info.col;
  var lastRow = sheet.getLastRow();
  var height = Math.max(0, lastRow - SAPA_FIRST_ROW + 1);
  var grid = height > 0 ? sheet.getRange(SAPA_FIRST_ROW, 1, height, info.lastCol).getValues() : [];

  var target = 0;
  var lastOfDay = 0;
  for (var i = 0; i < grid.length; i++) {
    if (sapaNorm_(grid[i][col.key - 1]) === sapaNorm_(r.key)) { target = SAPA_FIRST_ROW + i; break; }
    if (sapaNgay_(grid[i][col.flightDate - 1]) === sapaNorm_(r.flightDate)) lastOfDay = SAPA_FIRST_ROW + i;
  }

  var created = false;
  if (!target) {
    if (lastOfDay) { sheet.insertRowAfter(lastOfDay); target = lastOfDay + 1; }
    else { target = Math.max(lastRow + 1, SAPA_FIRST_ROW); }
    created = true;
  }

  var cur = sheet.getRange(target, 1, 1, info.lastCol).getValues()[0];
  for (var field in col) {
    if (field === 'hash' || field === 'warn' || SAPA_NEVER_WRITE.indexOf(field) >= 0) continue;
    if (r[field] === undefined) continue;
    var val = r[field];
    if (field === 'flightDate' && val) {
      /**
       * GIỮA TRƯA, không phải nửa đêm.
       *
       * `new Date(y, m-1, d)` là nửa đêm theo múi giờ script chạy. Bảng lại
       * hiển thị ngày theo múi giờ CỦA NÓ — hai múi giờ lệch nhau vài tiếng là
       * ô hiện sang hôm trước, và cả khối ngày trên sổ xô lệch một hôm mà
       * không ai ngờ tới (phép thử trên bản sao bảng thật đã bắt được).
       * Neo vào 12:00 thì lệch tới ±12 tiếng vẫn nguyên ngày.
       */
      var p = String(val).split('-');
      val = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
    }
    sapaGhiO_(sheet, target, col[field], val, created ? undefined : cur[col[field] - 1]);
  }

  /**
   * Dòng MỚI thì đặt lại hai công thức của bảng. Dòng CŨ để nguyên: nhân viên
   * hay gõ đè số vào đó (giá thoả thuận riêng, gộp hai khách) và số gõ tay ấy
   * mới là số đúng — máy không được lật lại.
   */
  if (created) {
    if (col.thanhTien && col.unitPrice && col.guestCount) {
      sheet.getRange(target, col.thanhTien).setFormula(
        '=' + sapaA1_(col.unitPrice) + target + '*' + sapaA1_(col.guestCount) + target);
    }
    if (col.total && col.thanhTien && col.flycamMoney && col.video360Money && col.extraFee) {
      sheet.getRange(target, col.total).setFormula(
        '=' + sapaA1_(col.thanhTien) + target + '+' + sapaA1_(col.flycamMoney) + target +
        '+' + sapaA1_(col.video360Money) + target + '+' + sapaA1_(col.extraFee) + target);
    }
  }

  if (col.hash) {
    var after = sheet.getRange(target, 1, 1, info.lastCol).getValues()[0];
    sheet.getRange(target, col.hash).setValue(sapaVanTay_(col, after));
  }
  return { row: target, created: created };
}

/** Kiểm tab + cột trước khi ghi. Trả chuỗi lỗi, hoặc null nếu ổn. */
function sapaSanSangGhi_(info) {
  var col = info.col;
  if (!col.flightDate || !col.daySeq) return 'tab thiếu cột bắt buộc (Ngày bay / Ghi chú)';
  if (!col.key) return 'tab chưa có cột "Khoá app" — không bám được dòng nào ứng với booking nào';
  return null;
}

/** APP → BẢNG, một booking (app gọi mỗi lần lưu). */
function ghiDongSapa_(body) {
  if (SAPA_CHI_DOC) return sapaTuChoiGhi_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sapaTimTab_(ss, body.sheet);
  if (!sheet) return json({ ok: false, error: 'không tìm thấy tab tháng: ' + body.sheet });

  var r = body.row || {};
  if (!r.key) return json({ ok: false, error: 'thiếu khoá booking' });

  var info = sapaCols_(sheet, true);
  var thieu = sapaSanSangGhi_(info);
  if (thieu) return json({ ok: false, error: thieu });

  var out = ghiMotDongSapa_(sheet, info, r);
  return json({ ok: true, row: out.row, created: out.created });
}

/**
 * APP → BẢNG, CẢ LÔ — nút "Đẩy lên bảng" bên app gọi vào đây.
 *
 * Một lượt gọi ghi nhiều dòng vì Apps Script "nguội" mất mấy giây chỉ để thức
 * dậy: gọi 40 lần cho 40 dòng thì phần lớn thời gian là chờ Google, không phải
 * chờ ghi. Dòng nào hỏng thì ghi lại lý do rồi đi tiếp, không bỏ cả lô.
 */
function ghiNhieuDongSapa_(body) {
  if (SAPA_CHI_DOC) return sapaTuChoiGhi_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sapaTimTab_(ss, body.sheet);
  if (!sheet) return json({ ok: false, error: 'không tìm thấy tab tháng: ' + body.sheet });

  var info = sapaCols_(sheet, true);
  var thieu = sapaSanSangGhi_(info);
  if (thieu) return json({ ok: false, error: thieu });

  var rows = body.rows || [];
  var written = 0;
  var errors = [];
  var lastRow = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r || !r.key) { errors.push('dòng thứ ' + (i + 1) + ': thiếu khoá booking'); continue; }
    try {
      /**
       * Đọc lại bố cục sau MỖI dòng: ghi một dòng mới là chèn hàng, mọi số
       * hàng bên dưới xê dịch. Dùng lại ảnh chụp cũ là dòng sau ghi đè dòng
       * trước — và trên Google Sheets thì không có nút hoàn tác cho máy.
       */
      var out = ghiMotDongSapa_(sheet, info, r);
      lastRow = out.row;
      written++;
    } catch (err) {
      errors.push('khoá ' + r.key + ': ' + String(err));
    }
  }
  return json({ ok: true, row: lastRow, written: written, errors: errors });
}

/**
 * BẢNG → APP theo ĐỒNG HỒ: gửi sang app những dòng người vừa gõ, rồi ghi ngược
 * khoá / số thứ tự khách / trạng thái / cảnh báo.
 *
 * NẰM IM khi đang ở chế độ chỉ đọc — vì nó cần ghi cột "Dấu app" để nhớ đã
 * khớp tới đâu; không ghi được thì mỗi 5 phút lại gửi lại nguyên bảng. Lúc đó
 * dùng nút "Lấy từ bảng" trong app thay thế.
 *
 * ĐẶT ĐỒNG HỒ (sau khi đã mở khoá): Triggers → quetSoBookingSapa →
 * Time-driven → Minutes timer → Every 5 minutes.
 */
function quetSoBookingSapa() {
  if (SAPA_CHI_DOC) {
    console.warn('quetSoBookingSapa: đang ở CHẾ ĐỘ CHỈ ĐỌC, không chạy. Dùng nút "Lấy từ bảng" trong app.');
    return { sent: 0, problems: ['chế độ chỉ đọc'] };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();
  var min = new Date(now.getTime() - SAPA_SCAN_DAYS * 24 * 3600 * 1000);
  var minKey = Utilities.formatDate(min, sapaTz_(), 'yyyy-MM-dd');

  var names = [
    'T' + (now.getMonth() + 1) + '-' + now.getFullYear(),
    'T' + (now.getMonth() === 0 ? 12 : now.getMonth()) + '-' + (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()),
  ];

  var sent = 0;
  var report = [];
  for (var n = 0; n < names.length && sent < SAPA_MAX_ROWS; n++) {
    var sheet = sapaTimTab_(ss, names[n]);
    if (!sheet) continue;
    var info = sapaCols_(sheet, true);
    var col = info.col;
    if (!col.flightDate || !col.key || !col.hash) continue;

    var lastRow = sheet.getLastRow();
    if (lastRow < SAPA_FIRST_ROW) continue;
    var grid = sheet.getRange(SAPA_FIRST_ROW, 1, lastRow - SAPA_FIRST_ROW + 1, info.lastCol).getValues();

    var batch = [];
    for (var i = 0; i < grid.length && batch.length + sent < SAPA_MAX_ROWS; i++) {
      var v = grid[i];
      var rowNo = SAPA_FIRST_ROW + i;
      var payload = sapaDocDong_(col, v, rowNo);
      if (!payload || payload.flightDate < minKey) continue;

      var vanTay = sapaVanTay_(col, v);
      if (sapaNorm_(v[col.hash - 1]) === vanTay && sapaNorm_(v[col.key - 1]) !== '') continue;
      payload.hash = vanTay;
      batch.push(payload);
    }

    if (!batch.length) continue;
    sent += batch.length;

    var res = UrlFetchApp.fetch(SAPA_APP_URL + '/api/baocao/booking/inbound-sheet', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sheet-secret': SAPA_APP_SECRET },
      payload: JSON.stringify({ sheet: sheet.getName(), rows: batch }),
      muteHttpExceptions: true,
    });
    var text = res.getContentText();
    if (res.getResponseCode() !== 200) {
      report.push(sheet.getName() + ': app trả ' + res.getResponseCode() + ' — ' + text.slice(0, 200));
      continue;
    }
    var results = (JSON.parse(text) || {}).results || [];

    for (var k = 0; k < results.length; k++) {
      var rs = results[k];
      if (!rs.row || rs.action === 'error' || rs.action === 'skipped') {
        if (rs.action === 'error') report.push('dòng ' + rs.row + ': ' + rs.error);
        continue;
      }
      var cur = sheet.getRange(rs.row, 1, 1, info.lastCol).getValues()[0];
      var w = rs.write || {};
      /**
       * Chỉ ghi ngược những ô APP LÀM CHỦ. Các ô nhân viên vừa gõ thì để
       * nguyên — họ gõ sau nên họ thắng, ghi đè ngay lúc này là chữ vừa gõ
       * biến mất trước mắt người đang gõ.
       */
      var cuaApp = ['daySeq', 'statusText', 'paidText', 'month'];
      for (var c = 0; c < cuaApp.length; c++) {
        var f = cuaApp[c];
        if (w[f] === undefined || !col[f]) continue;
        sapaGhiO_(sheet, rs.row, col[f], w[f], cur[col[f] - 1]);
      }
      sapaGhiO_(sheet, rs.row, col.key, rs.key, cur[col.key - 1]);
      sapaGhiO_(sheet, rs.row, col.warn, rs.warn || '', cur[col.warn - 1]);
      var after = sheet.getRange(rs.row, 1, 1, info.lastCol).getValues()[0];
      sheet.getRange(rs.row, col.hash).setValue(sapaVanTay_(col, after));
    }
  }

  if (report.length) console.warn('quetSoBookingSapa: ' + report.join(' | '));
  return { sent: sent, problems: report };
}

/** Bấm tay để soi ngay — Tiện ích mở rộng → Apps Script → chọn hàm → Run. */
function chayThuQuetSapa() {
  var r = quetSoBookingSapa();
  Logger.log('đã gửi %s dòng; vướng: %s', r.sent, r.problems.join(' | ') || 'không');
}

/** Xem bảng đang cho phép ghi hay không, không đụng vào ô nào. */
function xemCheDoSapa() {
  SpreadsheetApp.getUi().alert(
    SAPA_CHI_DOC
      ? 'Bảng đang ở CHẾ ĐỘ CHỈ ĐỌC.\n\nApp chỉ ĐỌC được, không ghi một ô nào lên bảng này.\nMở khoá: sửa SAPA_CHI_DOC = false trong Apps Script, và khai SAPA_SHEET_WRITE=1 trên Vercel.'
      : 'Bảng ĐANG CHO APP GHI.\n\nApp ghi thẳng vào tab tháng: số thứ tự khách, trạng thái, khoá app.\nKhoá lại: sửa SAPA_CHI_DOC = true trong Apps Script.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sổ booking')
    .addItem('Xem chế độ (chỉ đọc hay cho ghi)', 'xemCheDoSapa')
    .addItem('Quét sổ Sa Pa ngay', 'chayThuQuetSapa')
    .addToUi();
}
