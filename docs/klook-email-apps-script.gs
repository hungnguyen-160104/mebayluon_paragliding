/**
 * ĐƯA BOOKING OTA TỪ GMAIL VỀ APP — bản `ota-mail-v4`.
 * Nguồn: Klook · GetYourGuide · KKday · Seek Sophie · Viator · Trip.com.
 *
 * Dùng cho CẢ HAI hộp thư nhận booking:
 *    mebayluon@gmail.com        — nhận cả ba điểm bay, để MAILBOX_SPOT = ''
 *    sapa.paragliding@gmail.com — chỉ nhận điểm Sa Pa, đặt MAILBOX_SPOT = 'sapa'
 * Mỗi hộp một project Apps Script riêng (đăng nhập bằng chính hộp đó rồi dán
 * tệp này), chỉ khác nhau đúng một dòng MAILBOX_SPOT.
 * KHÔNG cần tạo nhãn hay filter cho từng OTA nữa: script tự quét theo ĐỊA CHỈ
 * NGƯỜI GỬI (klook.com, getyourguide.com…), vì tên miền gửi thư của OTA gần như
 * không bao giờ đổi, còn nhãn tay thì dễ gắn thiếu, gắn nhầm.
 *
 * Dán TOÀN BỘ tệp này vào một project Apps Script ĐỨNG RIÊNG (script.google.com →
 * New project), KHÔNG gắn vào bảng tính nào. Ba việc sau khi dán:
 *   1. Sửa hai dòng CẤU HÌNH bên dưới (địa chỉ app + mã bảo vệ).
 *   2. Bấm Run hàm `chayThuMotThu` một lần → Google hỏi quyền đọc Gmail, bấm cho phép.
 *   3. Trigger (biểu tượng đồng hồ) → Add trigger → hàm `quetThuOta`,
 *      Time-driven → Minutes timer → Every 10 minutes.
 *
 * Cách hoạt động: thư nào của OTA mà CHƯA gắn nhãn "OTA/đã-vào-app" thì gửi
 * nguyên văn về app (kèm địa chỉ người gửi) rồi gắn nhãn đó lại. App khoá theo
 * mã thư Gmail nên gửi trùng cũng không tạo booking trùng. Chỉ thư ĐẶT MỚI của
 * Klook (đã có bộ đọc riêng) vào thẳng lịch; mọi thư khác nằm ở CỜ ĐỎ đầu trang
 * điều phối / kế toán chờ người duyệt.
 */

/* ======================= CẤU HÌNH ======================= */

/** Địa chỉ app — đổi thành tên miền thật khi chạy production. */
const APP_URL = 'https://www.mebayluon.com/api/baocao/ota/inbound';

/** Phải GIỐNG HỆT biến OTA_INBOUND_SECRET khai trên Vercel. */
const SECRET = 'DAN_MA_BAO_VE_OTA_VAO_DAY';

/**
 * ĐIỂM BAY CỦA HỘP THƯ NÀY.
 *
 *   ''       — hộp nhận nhiều điểm (mebayluon@gmail.com): app tự đoán điểm bay
 *              theo tên sản phẩm trong thư, như trước.
 *   'sapa'   — hộp sapa.paragliding@gmail.com: mọi thư đều là booking Sa Pa.
 *   'ha-noi' | 'khau-pha' — nếu sau này mở hộp riêng cho hai điểm kia.
 *
 * Vì sao cần: tên sản phẩm của OTA thường không có chữ "Sapa" (vd "Standard
 * Paragliding Tour"), nên đoán theo tên sản phẩm là thư rơi vào khay "không rõ
 * điểm bay" và người trực phải chọn tay từng cái.
 */
const MAILBOX_SPOT = '';

/**
 * Tên miền gửi thư của từng OTA. Thêm OTA mới = thêm một dòng ở đây — app tự
 * nhận diện lại theo người gửi nên bên app không phải sửa gì.
 */
const SOURCES = [
  { ota: 'klook', tuMien: 'klook.com' },
  { ota: 'gyg', tuMien: 'getyourguide.com' },
  { ota: 'kkday', tuMien: 'kkday.com' },
  { ota: 'seeksophie', tuMien: 'seeksophie.com' },
  // {a b} là cú pháp HOẶC của Gmail search — Viator gửi bằng cả hai tên miền
  { ota: 'viator', tuMien: '{viator.com tripadvisor.com}' },
  { ota: 'trip', tuMien: 'trip.com' },
];

/** Nhãn đánh dấu "đã đưa vào app" — đừng đổi tên sau khi đã chạy. */
const DONE_LABEL = 'OTA/đã-vào-app';

/**
 * HẠN MỨC RIÊNG TỪNG NGUỒN mỗi lượt chạy.
 *
 * Hạn mức chung thì nguồn nhiều thư nhất (Klook) ăn sạch, các bên khác không
 * bao giờ tới lượt. Mỗi bên tối đa chừng này thư một lượt; tổng xấu nhất
 * 6×8 = 48 thư vẫn nằm dưới trần 6 phút của Apps Script.
 */
const MAX_MOI_NGUON = 8;

/**
 * XOAY VÒNG thứ tự quét: lượt này bắt đầu từ Klook thì lượt sau bắt đầu từ GYG…
 * Phòng khi một lượt chạy quá giờ bị Google cắt ngang: bên nào cũng có lượt
 * đứng đầu, không bên nào vĩnh viễn bị cắt phần đuôi.
 */
const ROTATE_KEY = 'ota_rotate_index';

/**
 * CHỈ QUÉT THƯ MỚI trong bao nhiêu ngày gần đây.
 *
 * Hộp thư có hàng trăm thư OTA cũ. Quét hết là gửi về app cả những chuyến đã
 * bay từ mấy tháng trước — app có chặn (ngày bay đã qua thì bỏ), nhưng quét hết
 * vẫn tốn hàng chục lượt chạy vô ích. Muốn lấy lại thư cũ hơn thì tạm nâng số
 * này lên rồi hạ về sau.
 */
const CHI_QUET_TRONG = '60d';

/**
 * Chuỗi nào thấy trong tiêu đề là BỎ HẲN, không gửi về app.
 *
 * CHỈ chặn thứ chắc chắn là rác (mã đăng nhập, khảo sát…). KHÔNG lọc "thư nào
 * mới là đơn hàng" ở đây nữa — OTA đổi cách đặt tiêu đề bất kỳ lúc nào, lọc
 * chặt ở phía script là có ngày lọc rớt đúng thư booking thật. Cứ gửi hết về,
 * app tự phân loại: rác thì app bỏ, đơn thật thì vào lịch hoặc chờ duyệt.
 */
const SUBJECT_BLOCK = ['verification code', 'otp', 'newsletter', 'webinar', 'merchants support', 'survey', 'unsubscribe'];

function biChan_(subject) {
  const s = String(subject || '').toLowerCase();
  for (var i = 0; i < SUBJECT_BLOCK.length; i++) {
    if (s.indexOf(SUBJECT_BLOCK[i]) >= 0) return true;
  }
  return false;
}

/* ======================= CHẠY ĐỊNH KỲ ======================= */

function quetThuOta() {
  const done = layHoacTaoNhan_(DONE_LABEL);
  const props = PropertiesService.getScriptProperties();
  const batDau = Number(props.getProperty(ROTATE_KEY) || 0) % SOURCES.length;
  // Lượt sau bắt đầu từ nguồn kế tiếp — ghi TRƯỚC khi quét, phòng lượt này bị cắt
  props.setProperty(ROTATE_KEY, String((batDau + 1) % SOURCES.length));

  var tongDaGui = 0;

  for (var i = 0; i < SOURCES.length; i++) {
    const src = SOURCES[(batDau + i) % SOURCES.length];

    /**
     * Tìm theo NGƯỜI GỬI, bỏ sẵn thư đã gắn nhãn "đã vào app" và thư quá cũ.
     * Không cần nhãn OTA/… nào tồn tại trước.
     */
    const query = 'from:' + src.tuMien + ' -label:"' + DONE_LABEL + '" newer_than:' + CHI_QUET_TRONG;
    const threads = GmailApp.search(query, 0, 30);
    var daGui = 0;

    for (var t = 0; t < threads.length; t++) {
      // Hết hạn mức nguồn này: DỪNG mà KHÔNG gắn nhãn, để lượt sau quét lại
      if (daGui >= MAX_MOI_NGUON) break;

      const messages = threads[t].getMessages();
      var tatCaXong = true;
      var biCat = false;

      for (var m = 0; m < messages.length; m++) {
        if (daGui >= MAX_MOI_NGUON) {
          biCat = true;
          break;
        }
        const ketQua = guiVeApp_(src.ota, messages[m]);
        if (ketQua === 'sent') daGui++;
        else if (ketQua === 'fail') tatCaXong = false;
        // 'skip' = thư bị chặn tiêu đề: bỏ qua có chủ ý, không tính là lỗi
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

    tongDaGui += daGui;
    Logger.log(src.ota + ': đã gửi ' + daGui + ' thư');
  }

  Logger.log('Tổng cộng đã gửi ' + tongDaGui + ' thư về app');
}

/** Bấm Run hàm này một lần để duyệt quyền, và để thử một thư mới nhất của Klook. */
function chayThuMotThu() {
  const src = SOURCES[0];
  const threads = GmailApp.search('from:' + src.tuMien + ' newer_than:' + CHI_QUET_TRONG, 0, 1);
  if (!threads.length) {
    throw new Error(
      'Không thấy thư nào từ ' + src.tuMien + ' trong ' + CHI_QUET_TRONG + ' gần đây — nâng CHI_QUET_TRONG lên rồi thử lại',
    );
  }
  const msg = threads[0].getMessages()[0];
  Logger.log('Thử với thư: ' + msg.getSubject());
  guiVeApp_(src.ota, msg);
}

/* ======================= HÀM PHỤ ======================= */

/** Trả 'sent' (đã gửi) · 'skip' (bị chặn tiêu đề) · 'fail' (gửi lỗi). */
function guiVeApp_(ota, msg) {
  if (biChan_(msg.getSubject())) {
    Logger.log('Bỏ qua (tiêu đề bị chặn): ' + msg.getSubject());
    return 'skip';
  }

  // Bản CHỮ trước; thư chỉ có HTML thì gửi HTML — app tự vứt thẻ lấy chữ
  var body = '';
  try {
    body = msg.getPlainBody();
  } catch (e) {
    body = '';
  }
  if (!body || !body.trim()) {
    try {
      body = msg.getBody();
    } catch (e) {
      body = '';
    }
  }

  const payload = {
    ota: ota,
    gmailId: msg.getId(),
    subject: msg.getSubject(),
    body: body,
    // Địa chỉ người gửi: app ưu tiên nó để nhận diện OTA — bền hơn cấu hình tay
    from: msg.getFrom(),
    receivedAt: msg.getDate().toISOString(),
    // Hộp thư riêng của một điểm bay thì nói luôn, app khỏi phải đoán
    spot: MAILBOX_SPOT,
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
