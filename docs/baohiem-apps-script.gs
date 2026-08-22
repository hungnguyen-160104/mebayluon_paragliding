/**
 * Apps Script cho BẢNG BẢO HIỂM — bản `baohiem-v1`.
 *
 * Ghi hồ sơ người bay (họ tên, ngày sinh, giấy tờ, giới tính, ngày bay, điểm
 * bay) vào ĐÚNG BẢNG LÂU NAY NHÂN VIÊN NHẬP TAY, không lập bảng mới.
 *
 * Dán TOÀN BỘ tệp này vào Apps Script (Tiện ích mở rộng → Apps Script), xoá
 * nội dung cũ trước khi dán, rồi Triển khai → Ứng dụng web · thực thi với tư
 * cách TÔI · quyền truy cập BẤT KỲ AI. Dán địa chỉ nhận được vào biến môi
 * trường INSURANCE_SHEET_WEBHOOK_URL trên Vercel.
 *
 * Ba điều đáng nhớ:
 *
 *  1. GHI THEO TÊN CỘT, không theo thứ tự. Bảng đang có cột nào thì ghi vào cột
 *     đó; cột script không biết (cột riêng của nhân viên) thì để yên. Nhờ vậy
 *     nhân viên vẫn sửa tay được như trước.
 *
 *  2. MỖI NGƯỜI MỘT DÒNG, ghi đè theo cột "Khoá". Đẩy lại bao nhiêu lần cũng
 *     chỉ sửa đúng dòng đó — không đẻ dòng trùng. Bảng chưa có cột "Khoá" thì
 *     script tự thêm vào cuối.
 *
 *  3. TRÙNG SỐ GIẤY TỜ THÌ BÔI ĐỎ, kể cả trùng với dòng nhân viên gõ tay từ
 *     trước — khai hai lần là bảo hiểm tính phí hai lần cho một người.
 */

// Mã bảo vệ: kho mã là kho CÔNG KHAI nên không để chuỗi thật ở đây. Dán chuỗi
// thật vào đây trên Apps Script, rồi khai đúng chuỗi đó ở INSURANCE_SHEET_SECRET.
const SECRET = 'DAN_MA_BAO_VE_CUA_BAN_VAO_DAY';

// Bảng đích. Để rỗng nghĩa là bảng đang gắn script này.
const SPREADSHEET_ID = '1mk8q10xHVpr5NSi5ipvWvo-n5sM1x79kVIfJnpH9NAU';

/**
 * Tab dự phòng khi app không gửi kèm tên tab. Bình thường MỖI ĐIỂM BAY MỘT TAB
 * và app gửi kèm tên tab ("Khau Phạ", "Hà Nội", "Sa Pa"…); tab chưa có thì
 * script tự tạo kèm hàng tiêu đề. Để rỗng thì rơi về tab đầu tiên của bảng.
 */
const SHEET_NAME = '';

/**
 * Mỗi trường của app ứng với những TÊN CỘT nào đang có thật trên bảng.
 *
 * Liệt kê nhiều cách viết vì bảng do người gõ: có dấu, không dấu, tiếng Anh đều
 * gặp. So khớp bỏ dấu và không phân biệt hoa thường, nên "Họ và tên", "HO VA
 * TEN", "Họ tên" đều về một mối. Bảng thiếu cột nào thì script THÊM cột đó vào
 * cuối bằng tên đầu danh sách.
 */
const FIELD_TITLES = {
  flightDate: ['Ngày bay', 'Ngày', 'Date', 'Ngày sử dụng'],
  daySeq: ['Số TT', 'STT', 'Số thứ tự', 'Số thứ tự bay'],
  spotName: ['Điểm bay', 'Địa điểm', 'Location', 'Nơi bay'],
  fullName: ['Họ và tên', 'Họ tên', 'Tên khách', 'Full name', 'Name'],
  birthday: ['Ngày sinh', 'Năm sinh', 'Date of birth', 'DOB'],
  gender: ['Giới tính', 'Sex', 'Gender'],
  idType: ['Loại giấy tờ', 'Loại GT'],
  idNumber: ['Số CCCD/Hộ chiếu', 'Số CCCD', 'CCCD', 'CCCD/Passport', 'Số giấy tờ', 'CMND/CCCD', 'Passport', 'ID'],
  nationality: ['Quốc tịch', 'Nationality'],
  isChild: ['Trẻ em', 'Trẻ nhỏ'],
  bookingCode: ['Mã booking', 'Booking', 'Mã đặt chỗ'],
  phone: ['SĐT', 'Số điện thoại', 'Điện thoại', 'Phone'],
  note: ['Ghi chú', 'Note'],
  status: ['Trạng thái', 'Status'],
  enteredBy: ['Nguồn nhập', 'Nhập bởi', 'Nguồn'],
  updatedAt: ['Cập nhật lúc', 'Cập nhật', 'Updated'],
  // Cột kỹ thuật, để cuối cùng cho khuất mắt: nhờ nó mà mỗi người chỉ có một dòng
  key: ['Khoá', 'Khóa', 'Key', 'Ma dong'],
};

/**
 * Những cột BẮT BUỘC phải có để script làm việc được. Bảng chưa có thì script
 * tự thêm vào cuối.
 *
 * `bookingCode` và `enteredBy` nằm trong đây vì đó là hai thứ người soát bảng
 * cần nhất: dòng này thuộc booking nào, và ai đưa vào — APP đẩy sang hay nhân
 * viên tự gõ. Không phân biệt được thì lúc lệch số không biết hỏi ai.
 */
const REQUIRED_FIELDS = [
  'key', 'flightDate', 'daySeq', 'fullName', 'birthday', 'gender', 'idNumber', 'status', 'bookingCode', 'enteredBy',
];

/** Bỏ dấu, bỏ khoảng trắng thừa, chữ thường — để so tên cột. */
function norm(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function targetSheet(name) {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const want = String(name || SHEET_NAME || '').trim();
  if (!want) return ss.getSheets()[0];
  // Điểm bay mới mở là có tab mới ngay, khỏi phải vào kẻ tay trước
  return ss.getSheetByName(want) || ss.insertSheet(want);
}

/**
 * Dò xem mỗi trường nằm ở cột số mấy. Trường bắt buộc mà bảng chưa có cột thì
 * thêm cột mới vào cuối — thà thêm một cột còn hơn ghi lệch cột.
 */
function mapColumns(sheet) {
  /**
   * BẢNG MỚI TINH: dựng sẵn cả hàng tiêu đề theo đúng thứ tự khai ở FIELD_TITLES,
   * in đậm và ghim hàng 1. Không làm thế thì script chỉ thêm dần từng cột bắt
   * buộc, bảng ra lộn xộn và thiếu các cột chỉ để đọc (điểm bay, quốc tịch…).
   */
  if (sheet.getLastRow() === 0) {
    const titles = Object.keys(FIELD_TITLES).map(function (f) { return FIELD_TITLES[f][0]; });
    sheet.getRange(1, 1, 1, titles.length).setValues([titles]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const lastCol = Math.max(1, sheet.getLastColumn());
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};

  function findCol(titles) {
    for (let t = 0; t < titles.length; t++) {
      const want = norm(titles[t]);
      for (let c = 0; c < headers.length; c++) {
        if (norm(headers[c]) === want) return c + 1;
      }
    }
    return 0;
  }

  Object.keys(FIELD_TITLES).forEach(function (field) {
    map[field] = findCol(FIELD_TITLES[field]);
  });

  const added = [];
  REQUIRED_FIELDS.forEach(function (field) {
    if (map[field]) return;
    const col = Math.max(sheet.getLastColumn(), headers.length) + 1 + added.length;
    sheet.getRange(1, col).setValue(FIELD_TITLES[field][0]).setFontWeight('bold');
    map[field] = col;
    added.push(FIELD_TITLES[field][0]);
  });
  if (added.length) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  return { map: map, added: added, width: sheet.getLastColumn() };
}

/**
 * Bôi ĐỎ những ô số giấy tờ xuất hiện nhiều hơn một lần trong cùng một NGÀY BAY
 * (kể cả dòng nhân viên gõ tay), bỏ màu những ô không trùng.
 *
 * So theo ngày bay chứ không so cả bảng: cùng một người bay hai ngày khác nhau
 * là hai hợp đồng bảo hiểm khác nhau, hoàn toàn bình thường.
 */
function markDuplicates(sheet, map) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !map.idNumber) return [];

  const ids = sheet.getRange(2, map.idNumber, lastRow - 1, 1).getValues();
  const dates = map.flightDate ? sheet.getRange(2, map.flightDate, lastRow - 1, 1).getDisplayValues() : null;
  const statuses = map.status ? sheet.getRange(2, map.status, lastRow - 1, 1).getValues() : null;

  const count = {};
  const keyOf = function (i) {
    const id = norm(ids[i][0]).replace(/\s/g, '');
    if (!id) return '';
    // Dòng đã HUỶ hoặc đã THU HỒI thì không còn hiệu lực, đừng tính là trùng
    if (statuses) {
      const st = norm(statuses[i][0]);
      if (st === 'huy' || st === 'thu hoi') return '';
    }
    return (dates ? norm(dates[i][0]) : '') + '#' + id;
  };

  for (let i = 0; i < ids.length; i++) {
    const k = keyOf(i);
    if (k) count[k] = (count[k] || 0) + 1;
  }

  const colors = [];
  const dups = [];
  for (let i = 0; i < ids.length; i++) {
    const k = keyOf(i);
    const bad = k && count[k] > 1;
    colors.push([bad ? '#ffd5d5' : null]);
    if (bad && dups.indexOf(String(ids[i][0])) < 0) dups.push(String(ids[i][0]));
  }
  sheet.getRange(2, map.idNumber, ids.length, 1).setBackgrounds(colors);
  return dups;
}

/**
 * NGÀY MỚI LÊN ĐẦU, ngày cũ tụt xuống dưới.
 *
 * Người soát bảng bảo hiểm chỉ quan tâm hôm nay và vài hôm tới; bắt họ kéo qua
 * hàng nghìn dòng cũ mỗi lần mở bảng là kiểu gì cũng có ngày sót người.
 *
 * Sắp bằng cách sort cả vùng dữ liệu theo cột Ngày bay giảm dần — ngày ghi dạng
 * "2026-08-25" (năm-tháng-ngày) nên xếp theo chữ cũng ra đúng thứ tự thời gian.
 * Cùng ngày thì xếp theo mã booking để cả đoàn nằm liền nhau.
 */
function sortNewestFirst(sheet, map) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3 || !map.flightDate) return;
  const rules = [{ column: map.flightDate, ascending: false }];
  // Cùng ngày thì xếp theo SỐ THỨ TỰ BAY — đúng thứ tự quầy gọi khách lên bãi.
  // Số TT ghi dạng SỐ nên xếp đúng 2 < 10, ghi dạng chữ thì "10" lại đứng trước "2".
  if (map.daySeq) rules.push({ column: map.daySeq, ascending: true });
  else if (map.bookingCode) rules.push({ column: map.bookingCode, ascending: true });
  sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).sort(rules);
}

/**
 * TÁCH NGÀY CHO DỄ ĐỌC: dòng đầu của mỗi ngày được IN ĐẬM ô ngày và kẻ một vạch
 * đậm ngang phía trên, những dòng còn lại trong ngày để chữ thường.
 *
 * Không chèn dòng trống làm vách ngăn: dòng trống không có ngày nên lần sắp xếp
 * sau sẽ dồn hết nó xuống đáy bảng, vách ngăn biến mất còn bảng thì thủng lỗ.
 * Kẻ viền thì sắp lại bao nhiêu lần cũng vẽ lại đúng chỗ.
 */
function styleDateGroups(sheet, map) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !map.flightDate) return;
  const n = lastRow - 1;
  const width = sheet.getLastColumn();

  const dates = sheet.getRange(2, map.flightDate, n, 1).getDisplayValues();
  // Xoá viền cũ của cả vùng rồi kẻ lại — không thì vạch của lần sắp xếp trước còn nằm đó
  sheet.getRange(2, 1, n, width).setBorder(false, false, false, false, false, false);

  const weights = [];
  for (let i = 0; i < n; i++) {
    const isFirst = i === 0 || dates[i][0] !== dates[i - 1][0];
    weights.push([isFirst ? 'bold' : 'normal']);
    if (isFirst && i > 0) {
      sheet
        .getRange(i + 2, 1, 1, width)
        .setBorder(true, null, null, null, null, null, '#64748b', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
  }
  sheet.getRange(2, map.flightDate, n, 1).setFontWeights(weights);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) return json({ ok: false, error: 'sai mã bảo vệ' });

    const rows = body.rows || [];
    if (!rows.length) return json({ ok: true, written: 0, duplicates: [] });

    const sheet = targetSheet(body.sheet);
    const info = mapColumns(sheet);
    const map = info.map;

    // Đọc cột Khoá một lần rồi tra trong bộ nhớ — đọc từng dòng thì chậm gấp bội.
    const lastRow = sheet.getLastRow();
    const keyRow = {};
    if (lastRow > 1) {
      const keys = sheet.getRange(2, map.key, lastRow - 1, 1).getValues();
      for (let i = 0; i < keys.length; i++) {
        const k = String(keys[i][0] || '').trim();
        if (k) keyRow[k] = i + 2;
      }
    }

    let written = 0;
    let nextRow = lastRow + 1;

    rows.forEach(function (r) {
      const key = String(r.key || '').trim();
      if (!key) return;
      const row = keyRow[key] || nextRow;
      if (!keyRow[key]) {
        keyRow[key] = row;
        nextRow += 1;
      }

      Object.keys(FIELD_TITLES).forEach(function (field) {
        const col = map[field];
        if (!col) return;
        const v = r[field];
        if (v === undefined || v === null) return;
        // Ngày sinh và số giấy tờ ghi dạng CHỮ: Sheets tự đổi "01/01/1990" thành
        // ngày tháng theo múi giờ bảng, và cắt số 0 đứng đầu số CCCD.
        if (field === 'birthday' || field === 'idNumber' || field === 'phone') {
          sheet.getRange(row, col).setNumberFormat('@').setValue(String(v));
        } else {
          sheet.getRange(row, col).setValue(v);
        }
      });
      written += 1;
    });

    sortNewestFirst(sheet, map);
    // Kẻ vạch và bôi màu SAU khi sắp xếp — làm trước thì bám nhầm dòng
    styleDateGroups(sheet, map);
    const duplicates = markDuplicates(sheet, map);
    return json({ ok: true, written: written, duplicates: duplicates, addedColumns: info.added });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json({ ok: true, version: 'baohiem-v1', fields: Object.keys(FIELD_TITLES) });
}
