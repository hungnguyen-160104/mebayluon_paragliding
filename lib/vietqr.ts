// lib/vietqr.ts
/**
 * Dựng chuỗi mã VietQR để phi công quét bằng app ngân hàng.
 *
 * Tự dựng chuỗi theo chuẩn EMVCo thay vì gọi ảnh từ img.vietqr.io: mã QR là
 * thứ nằm giữa việc thu tiền, phụ thuộc vào một dịch vụ ngoài nghĩa là hôm
 * nào họ sập thì phi công không chuyển khoản được. Chuỗi dựng tại đây rồi vẽ
 * bằng thư viện `qrcode` vốn đã dùng cho mã QR trên vé bay.
 */

/** Mã ngân hàng theo chuẩn NAPAS. */
export const BANK_BIN = {
  techcombank: "970407",
  bidv: "970418",
  vietcombank: "970436",
} as const;

/**
 * CÁC TÀI KHOẢN NHẬN TIỀN — mỗi mảng việc một tài khoản riêng.
 *
 * Để ở đây (không phải trong component) vì cả mã chạy trên máy chủ lẫn trên
 * trình duyệt đều cần: phiếu ảnh booking vẽ ở trình duyệt, còn thư xác nhận
 * và các trang báo cáo dựng ở máy chủ. Nhét vào một tệp "use client" là mã máy
 * chủ nhập vào sẽ vỡ.
 *
 * TÁCH HAI TÀI KHOẢN LÀ CỐ Ý: tiền bay và tiền quầy/phòng do hai người giữ và
 * hai bộ sổ đối soát khác nhau. Gộp một tài khoản thì sao kê trộn lẫn, không
 * bóc được doanh thu quầy.
 */
export const PAY_ACCOUNT_FLIGHT = {
  bankBin: BANK_BIN.bidv,
  bankName: "BIDV",
  accountNumber: "8875639685",
  accountName: "Đặng Thị Thuỷ",
} as const;

/** Quầy cafe + homestay — bảng QR đặt tại quầy (chủ gửi ảnh 06/09). */
export const PAY_ACCOUNT_CAFE_HOMESTAY = {
  bankBin: BANK_BIN.vietcombank,
  bankName: "Vietcombank",
  accountNumber: "0011004067204",
  accountName: "NGUYEN THI THUY",
} as const;

/** Ghép một trường EMVCo: mã (2 ký tự) + độ dài (2 chữ số) + nội dung. */
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/**
 * CRC16/CCITT-FALSE — chuẩn kiểm tra của EMVCo.
 * Tính trên toàn bộ chuỗi đã có sẵn "6304" ở cuối.
 */
function crc16(input: string): string {
  let crc = 0xffff;

  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Bỏ dấu tiếng Việt trong nội dung chuyển khoản.
 *
 * Nhiều app ngân hàng vẫn từ chối hoặc hiển thị sai chữ có dấu ở ô nội dung,
 * nên "Nguyễn Văn A" thành "Nguyen Van A" — sao kê đọc vẫn ra đúng người.
 */
export function toAsciiNote(raw: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildVietQrPayload(input: {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  note?: string;
}): string {
  const account = String(input.accountNumber).replace(/\D/g, "");
  const amount = Math.round(Number(input.amount) || 0);
  const note = toAsciiNote(input.note || "").slice(0, 99);

  // 38 — thông tin đơn vị thụ hưởng
  const beneficiary = field("00", input.bankBin) + field("01", account);
  const merchant =
    field("00", "A000000727") +
    field("01", beneficiary) +
    // QRIBFTTA = chuyển khoản tới số tài khoản
    field("02", "QRIBFTTA");

  let payload =
    field("00", "01") +
    // 12 = mã động (đã ghi sẵn số tiền), 11 = mã tĩnh
    field("01", amount > 0 ? "12" : "11") +
    field("38", merchant) +
    field("53", "704") +
    (amount > 0 ? field("54", String(amount)) : "") +
    field("58", "VN") +
    (note ? field("62", field("08", note)) : "");

  payload += "6304";
  return payload + crc16(payload);
}
