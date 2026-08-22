/**
 * THÊM VÀO PROJECT APPS SCRIPT CẦU NỐI BOT (project đang có getKnowledge/getState/saveBooking).
 *
 * Việc của đoạn này: nhận action "setLiveData" từ app mebayluon.com và ghi khối
 * DỮ LIỆU SỐNG (lịch bay + phòng trống) vào Doc tri thức, giữa hai mốc:
 *   [LIVE_DATA_START]  ...  [LIVE_DATA_END]
 * Chưa có mốc thì tự thêm vào CUỐI Doc. Mỗi lần ghi là thay trọn ruột giữa hai mốc.
 *
 * CÁCH LẮP (2 bước):
 * 1. Dán nguyên hàm setLiveData_ bên dưới vào cuối file Code.gs.
 * 2. Trong doPost, chỗ đang rẽ nhánh theo action (cạnh getKnowledge), thêm nhánh:
 *
 *      if (action === 'setLiveData') {
 *        return jsonOk_({ updated: setLiveData_(String(body.text || '')) });
 *      }
 *
 *    (jsonOk_ = hàm đang dùng để trả {ok:true, data:...} — tên có thể khác,
 *     cứ trả đúng dạng các action kia đang trả.)
 * 3. Deploy > Manage deployments > Edit > Version: New version > Deploy
 *    (giữ nguyên URL cũ, KHÔNG tạo deployment mới — URL đổi là app gọi trượt).
 */

function setLiveData_(text) {
  // Dùng đúng DOC_ID mà getKnowledge đang mở — nếu script khai hằng số khác tên
  // thì thay vào đây.
  var doc = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();
  var START = '[LIVE_DATA_START]';
  var END = '[LIVE_DATA_END]';

  var paras = body.getParagraphs();
  var pStart = null, pEnd = null;
  for (var i = 0; i < paras.length; i++) {
    var t = paras[i].getText().trim();
    if (t === START && !pStart) pStart = paras[i];
    else if (t === END && pStart && !pEnd) pEnd = paras[i];
  }

  var lines = String(text).replace(/\r/g, '').split('\n');

  if (!pStart || !pEnd) {
    // Chưa có mốc: dựng cả cụm ở cuối Doc
    body.appendParagraph(START);
    for (var a = 0; a < lines.length; a++) body.appendParagraph(lines[a]);
    body.appendParagraph(END);
  } else {
    // Xoá ruột cũ giữa hai mốc (đi từ dưới lên cho khỏi trượt vị trí)
    var iStart = body.getChildIndex(pStart);
    var iEnd = body.getChildIndex(pEnd);
    for (var j = iEnd - 1; j > iStart; j--) body.getChild(j).removeFromParent();
    // Chèn ruột mới ngay dưới mốc mở (chèn ngược để giữ thứ tự dòng)
    var at = body.getChildIndex(pStart) + 1;
    for (var k = lines.length - 1; k >= 0; k--) body.insertParagraph(at, lines[k]);
  }

  doc.saveAndClose();
  return true;
}
