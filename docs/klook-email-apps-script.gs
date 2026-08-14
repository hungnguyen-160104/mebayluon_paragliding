/**
 * ĐƯA BOOKING KLOOK TỪ GMAIL VỀ APP — bản `ota-mail-v1`.
 *
 * Dán TOÀN BỘ tệp này vào một project Apps Script ĐỨNG RIÊNG (script.google.com →
 * New project), KHÔNG gắn vào bảng tính nào. Chạy trên chính hộp thư nhận thư OTA.
 *
 * Ba việc phải làm sau khi dán:
 *   1. Sửa hai dòng CẤU HÌNH bên dưới (địa chỉ app + mã bảo vệ).
 *   2. Bấm Run hàm `chayThuMotThu` một lần → Google hỏi quyền đọc Gmail, bấm cho phép.
 *   3. Trigger (biểu tượng đồng hồ) → Add trigger → hàm `quetThuOta`,
 *      Time-driven → Minutes timer → Every 10 minutes.
 *
 * Cách hoạt động: quét nhãn OTA/Klook, thư nào CHƯA gắn nhãn "OTA/đã-vào-app" thì
 * gửi nguyên văn về app rồi gắn nhãn đó lại. App khoá theo mã thư Gmail nên gửi
 * trùng cũng không tạo booking trùng.
 */

/* ======================= CẤU HÌNH ======================= */

/** Địa chỉ app — đổi thành tên miền thật khi chạy production. */
const APP_URL = 'https://www.mebayluon.com/api/baocao/ota/inbound';

/** Phải GIỐNG HỆT biến OTA_INBOUND_SECRET khai trên Vercel. */
const SECRET = 'DAN_MA_BAO_VE_OTA_VAO_DAY';

/** Nhãn Gmail cần quét → tên OTA gửi kèm cho app. */
const SOURCES = [
  { label: 'OTA/Klook', ota: 'klook' },
  // Mở dần khi làm tiếp các bên khác:
  // { label: 'OTA/GYG', ota: 'gyg' },
  // { label: 'OTA/KKday', ota: 'kkday' },
  // { label: 'OTA/Trip', ota: 'trip' },
  // { label: 'OTA/SeekSophie', ota: 'seeksophie' },
];

/** Nhãn đánh dấu "đã đưa vào app" — đừng đổi tên sau khi đã chạy. */
const DONE_LABEL = 'OTA/đã-vào-app';

/** Mỗi lần chạy xử lý tối đa bao nhiêu thư (đỡ chạm giới hạn 6 phút của Apps Script). */
const MAX_PER_RUN = 25;

/**
 * CHỈ QUÉT THƯ MỚI trong bao nhiêu ngày gần đây.
 *
 * Hộp thư đang có hàng trăm thư Klook cũ. Quét hết là gửi về app cả những chuyến
 * đã bay từ mấy tháng trước — app có chặn (ngày bay đã qua thì bỏ), nhưng quét
 * hết vẫn tốn hàng chục lượt chạy vô ích. Muốn lấy lại thư cũ hơn thì tạm nâng
 * số này lên rồi hạ về sau.
 */
const CHI_QUET_TRONG = '60d';

/**
 * Chỉ nhận THƯ ĐƠN HÀNG. Nhãn OTA/Klook đang lẫn cả thư mã xác thực
 * ("Klook - Verification code") và thư quảng cáo của Merchants Support Team —
 * gửi hết về app chỉ làm khay soát đầy rác.
 */
const SUBJECT_FILTER =
  '(subject:"order confirmed" OR subject:"order canceled" OR subject:"order cancelled" OR subject:"booking amendment")';

/** Chốt cửa thứ hai, xét từng thư: chuỗi nào thấy trong tiêu đề là BỎ. */
const SUBJECT_BLOCK = ['verification code', 'otp', 'newsletter', 'webinar', 'merchants support'];

/** Tiêu đề có phải thư đơn hàng không (dùng cho từng thư trong hội thoại). */
function laThuDonHang_(subject) {
  const s = String(subject || '').toLowerCase();
  for (var i = 0; i < SUBJECT_BLOCK.length; i++) {
    if (s.indexOf(SUBJECT_BLOCK[i]) >= 0) return false;
  }
  return (
    s.indexOf('order confirmed') >= 0 ||
    s.indexOf('order canceled') >= 0 ||
    s.indexOf('order cancelled') >= 0 ||
    s.indexOf('booking amendment') >= 0
  );
}

/* ======================= CHẠY ĐỊNH KỲ ======================= */

function quetThuOta() {
  const done = layHoacTaoNhan_(DONE_LABEL);
  let daGui = 0;

  SOURCES.forEach(function (src) {
    if (daGui >= MAX_PER_RUN) return;
    const label = GmailApp.getUserLabelByName(src.label);
    if (!label) {
      Logger.log('Chưa có nhãn ' + src.label + ' — bỏ qua');
      return;
    }

    /**
     * Tìm theo câu lệnh thay vì lấy hết nhãn: bỏ sẵn thư đã gắn nhãn "đã vào app",
     * thư quá cũ, và thư không phải đơn hàng.
     */
    const query =
      'label:"' + src.label + '" -label:"' + DONE_LABEL + '" newer_than:' + CHI_QUET_TRONG + ' ' + SUBJECT_FILTER;
    const threads = GmailApp.search(query, 0, 40);

    for (var t = 0; t < threads.length; t++) {
      // Hết hạn mức lượt này: DỪNG mà KHÔNG gắn nhãn, để lượt sau quét lại
      if (daGui >= MAX_PER_RUN) break;

      const messages = threads[t].getMessages();
      var tatCaXong = true;
      var biCat = false;

      for (var m = 0; m < messages.length; m++) {
        if (daGui >= MAX_PER_RUN) {
          biCat = true;
          break;
        }
        const ketQua = guiVeApp_(src.ota, messages[m]);
        if (ketQua === 'sent') daGui++;
        else if (ketQua === 'fail') tatCaXong = false;
        // 'skip' = thư không phải đơn hàng: bỏ qua có chủ ý, không tính là lỗi
      }

      /**
       * CHỈ gắn nhãn "đã vào app" khi mọi thư trong hội thoại đã gửi xong.
       * Gắn nhãn khi còn thư lỗi (hoặc bị cắt giữa vòng) là thư đó vĩnh viễn
       * không được gửi lại — mất luôn booking mà chẳng ai biết.
       */
      if (tatCaXong && !biCat) {
        threads[t].addLabel(done);
      } else {
        Logger.log(
          'CHƯA gắn nhãn (còn thư chưa gửi được, lượt sau quét lại): ' + threads[t].getFirstMessageSubject(),
        );
      }
    }
  });

  Logger.log('Đã gửi ' + daGui + ' thư về app');
}

/** Bấm Run hàm này một lần để duyệt quyền, và để thử một thư mới nhất. */
function chayThuMotThu() {
  const src = SOURCES[0];
  const threads = GmailApp.search(
    'label:"' + src.label + '" newer_than:' + CHI_QUET_TRONG + ' ' + SUBJECT_FILTER,
    0,
    1,
  );
  if (!threads.length) {
    throw new Error(
      'Không thấy thư nào trong nhãn ' + src.label + ' trong ' + CHI_QUET_TRONG + ' gần đây — nâng CHI_QUET_TRONG lên rồi thử lại',
    );
  }
  const msg = threads[0].getMessages()[0];
  Logger.log('Thử với thư: ' + msg.getSubject());
  guiVeApp_(src.ota, msg);
}

/* ======================= HÀM PHỤ ======================= */

/** Trả 'sent' (đã gửi) · 'skip' (không phải đơn hàng) · 'fail' (gửi lỗi). */
function guiVeApp_(ota, msg) {
  if (!laThuDonHang_(msg.getSubject())) {
    Logger.log('Bỏ qua (không phải thư đơn hàng): ' + msg.getSubject());
    return 'skip';
  }

  const payload = {
    ota: ota,
    gmailId: msg.getId(),
    subject: msg.getSubject(),
    // Lấy bản CHỮ: bản HTML nhiều rác, mà app bóc theo dòng "Nhãn: giá trị"
    body: msg.getPlainBody(),
    receivedAt: msg.getDate().toISOString(),
  };

  try {
    const res = UrlFetchApp.fetch(APP_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-ota-secret': SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    Logger.log(msg.getSubject() + ' → ' + code + ' ' + res.getContentText().slice(0, 200));
    return code >= 200 && code < 300 ? 'sent' : 'fail';
  } catch (err) {
    Logger.log('Lỗi gửi thư: ' + err);
    return 'fail';
  }
}

function layHoacTaoNhan_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
