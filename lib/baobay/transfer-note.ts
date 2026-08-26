// lib/baobay/transfer-note.ts
/**
 * NỘI DUNG CHUYỂN KHOẢN chuẩn của sổ điều hành: "2508 k3 KLK123".
 *
 * Kế toán dò sao kê ngân hàng bằng đúng dòng chữ này, nên nó phải nói được ba
 * điều mà một mình mã booking không nói:
 *
 *  - "2508"   — NGÀY BAY 25/08. Tiền về trước ngày bay cả tuần là chuyện
 *               thường, nên ngày trên sao kê không dùng để tìm khách được.
 *  - "k3"     — KHÁCH SỐ 3 trong ngày (`daySeq`, con số đỏ trên mọi bảng).
 *               Khách gõ sai mã booking thì vẫn còn ngày + số thứ tự để lần ra.
 *               HÀ NỘI ghi "HN3" thay cho "k3": số thứ tự đếm riêng từng điểm
 *               nên khách #3 ngày 25/08 ở Hà Nội và ở Khau Phạ ra cùng một
 *               chuỗi, nhìn vào không biết của bên nào.
 *  - "KLK123" — mã booking; booking chưa có mã thì lấy SĐT khách thay vào.
 *
 * Một booking chuyển làm nhiều lần (tính năng CHIA BILL) thì mỗi lần một mã QR
 * riêng, đánh số ".1" ".2" sau mã booking — hai dòng sao kê cùng ngày cùng số
 * tiền không còn lẫn vào nhau, và nhìn là biết còn thiếu bill nào chưa về.
 */

/**
 * CHỮ ĐỨNG TRƯỚC SỐ THỨ TỰ, theo điểm bay.
 *
 * Khau Phạ giữ "k" — chữ ấy đã in trên hàng nghìn mã QR cũ và nhân viên đã
 * quen tay, đổi là vừa lệch với vé đang lưu hành vừa phải dạy lại cả đội.
 * Hà Nội dùng "HN" cho khỏi lẫn.
 *
 * Sa Pa cũng đang để "k": chủ chưa yêu cầu đổi. Muốn tách thì thêm một dòng
 * ở đây — bộ dò sao kê đã nhận sẵn cả "SP" rồi (xem SEQ_PREFIX ở
 * lib/baobay/bank-check.ts), không phải sửa gì thêm bên đó.
 */
const SEQ_LETTER: Record<string, string> = { "ha-noi": "HN" };
const SEQ_LETTER_DEFAULT = "k";

/** "2026-08-25" -> "2508". Ngày không đúng dạng thì bỏ qua, không đoán. */
function ddMM(flightDate?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(flightDate ?? "").trim());
  return m ? `${m[3]}${m[2]}` : "";
}

export function buildTransferNote(input: {
  /**
   * Điểm bay của booking — quyết chữ đứng trước số thứ tự ("k3" hay "HN3").
   * Bỏ trống thì dùng "k" như cũ, để chỗ gọi nào chưa kịp sửa vẫn chạy đúng
   * như trước chứ không sinh ra chuỗi lạ.
   */
  spot?: string;
  /** Ngày bay dạng "YYYY-MM-DD". */
  flightDate?: string;
  /** Số thứ tự khách trong ngày. Booking mới chưa lưu thì chưa có — bỏ trống. */
  daySeq?: number;
  bookingCode?: string;
  /** Dự phòng khi booking chưa có mã. */
  phone?: string;
  /** Bill thứ mấy khi chia bill CK (1, 2, 3…). Bỏ trống = chuyển một lần. */
  part?: number;
}): string {
  const letter = SEQ_LETTER[String(input.spot ?? "").trim()] ?? SEQ_LETTER_DEFAULT;
  const stamp = [
    ddMM(input.flightDate),
    input.daySeq && input.daySeq > 0 ? `${letter}${input.daySeq}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const code = (input.bookingCode || "").trim() || (input.phone || "").trim();
  const suffix = input.part && input.part > 0 ? `.${input.part}` : "";

  // Chưa có mã lẫn SĐT: số bill dính vào phần ngày/STT cho khỏi thành ".1" trơ trọi
  if (!code) return suffix ? `${stamp}${suffix}` : stamp;
  return [stamp, code + suffix].filter(Boolean).join(" ");
}
