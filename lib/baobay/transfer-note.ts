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
 *  - "KLK123" — mã booking; booking chưa có mã thì lấy SĐT khách thay vào.
 *
 * Một booking chuyển làm nhiều lần (tính năng CHIA BILL) thì mỗi lần một mã QR
 * riêng, đánh số ".1" ".2" sau mã booking — hai dòng sao kê cùng ngày cùng số
 * tiền không còn lẫn vào nhau, và nhìn là biết còn thiếu bill nào chưa về.
 */

/** "2026-08-25" -> "2508". Ngày không đúng dạng thì bỏ qua, không đoán. */
function ddMM(flightDate?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(flightDate ?? "").trim());
  return m ? `${m[3]}${m[2]}` : "";
}

export function buildTransferNote(input: {
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
  const stamp = [ddMM(input.flightDate), input.daySeq && input.daySeq > 0 ? `k${input.daySeq}` : ""]
    .filter(Boolean)
    .join(" ");
  const code = (input.bookingCode || "").trim() || (input.phone || "").trim();
  const suffix = input.part && input.part > 0 ? `.${input.part}` : "";

  // Chưa có mã lẫn SĐT: số bill dính vào phần ngày/STT cho khỏi thành ".1" trơ trọi
  if (!code) return suffix ? `${stamp}${suffix}` : stamp;
  return [stamp, code + suffix].filter(Boolean).join(" ");
}
