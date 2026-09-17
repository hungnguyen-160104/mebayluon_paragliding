// lib/baobay/ve-qr.ts
/**
 * MÃ VÉ QR TỪNG KHÁCH — điểm Sa Pa (và booking PPG ở Khau Phạ), chủ 17/09/2026.
 *
 * Sa Pa không dùng vé giấy đánh số sẵn mà in vé nhiệt: mỗi KHÁCH một tấm, trên
 * vé có mã QR. Phi công phục vụ khách nào thì QUÉT mã của khách ấy trước khi
 * bay ("chiếm" mã), bay xong tích "đã bay xong"; không hoàn thành thì "hoàn
 * mã" cho phi công khác quét. Cuối ngày báo cáo phi công tự cộng từ những mã
 * đã chiếm: mấy chuyến, mấy 360, mấy flycam, mấy cờ đỏ — để tính lương.
 *
 * NỘI DUNG QR = NGÀY CẤP + SỐ THỨ TỰ + SỐ KHÁCH + MÃ CHỐNG GIẢ, ví dụ "22/12/2026 #3.2 Q3M9"
 * (vé in trước 18/09 đuôi là mã điểm "SAPA", máy vẫn đọc):
 * khách đặt bay ngày 22/12, booking số 3 trong ngày, khách thứ 2 của đoàn.
 * Không phải mã vé chống sao chép A2D8 (mã ấy vẫn in cạnh số để đối chiếu
 * vé chép). Chủ chốt kiểu này vì người đọc được bằng mắt, và DỜI NGÀY THÌ
 * KHÔNG ĐỔI: ngày trong mã là ngày cấp vé (căn cước), booking sang ngày mới
 * vẫn cầm đúng mã ấy — máy chủ biết nó thuộc booking nào và đang ở ngày nào.
 * Số thứ tự của ngày cấp KHÔNG được cấp lại cho booking khác khi đoàn dời đi
 * (xem updateBookingStatus), nếu không hai vé cùng "22/12 #3".
 *
 * Thuần tính, không mạng, không mongoose — để cả máy chủ, trang in vé và trang
 * quét dùng chung một cách đọc/ghi mã.
 */

import { formatDateKeyVN, isDateKey } from "./date";

/** Ba dịch vụ đi kèm có thể gắn cho từng khách ở Sa Pa (chủ 17/09: "chỉ có 360, flycam và cờ đỏ"). */
export const DICH_VU_VE = ["video360", "flycam", "redFlag"] as const;
export type DichVuVe = (typeof DICH_VU_VE)[number];
export type DichVuKhach = Record<DichVuVe, boolean>;

export const TEN_DICH_VU: Record<DichVuVe, string> = { video360: "Cam 360", flycam: "Flycam", redFlag: "Cờ đỏ" };

export const KHONG_DICH_VU: DichVuKhach = { video360: false, flycam: false, redFlag: false };

/** Mã điểm in trên QR — ngắn, viết hoa, không dấu để mọi máy đọc được. */
const MA_DIEM: Record<string, string> = { sapa: "SAPA", "khau-pha": "KHAUPHA", "ha-noi": "HANOI" };
const DIEM_THEO_MA: Record<string, string> = Object.fromEntries(Object.entries(MA_DIEM).map(([k, v]) => [v, k]));

/**
 * "2026-12-22", 3, 2, "Q3M9" → "22/12/2026 #3.2 Q3M9".
 *
 * Đuôi là MÃ CHỐNG GIẢ của khách (chủ 18/09: "bỏ chữ SAPA trong QR, thay bằng
 * mã chống giả") — máy quét đối chiếu với mã đã cấp trong sổ, vé chép hay vé
 * tự in không có mã đúng là lộ ngay. Chưa có mã (vé in trước khi qua sổ) thì
 * vẫn in mã điểm như cũ để không hỏng phép đọc.
 */
export function veQrText(spot: string, ngay: string, so: number, guestNo: number, maChongGia?: string): string {
  const ma = String(maChongGia ?? "").trim().toUpperCase();
  const duoi = /^[A-Z0-9]{3,8}$/.test(ma) ? ma : (MA_DIEM[spot] ?? spot.toUpperCase());
  return `${formatDateKeyVN(ngay)} #${so}.${guestNo} ${duoi}`;
}

export type VeQrDoc = {
  spot: string | null;
  ngay: string;
  so: number;
  guestNo: number;
  /** Mã chống giả ở đuôi QR (vé từ 18/09); null nếu đuôi là mã điểm hoặc thiếu. */
  ma: string | null;
};

/**
 * Đọc chuỗi trong QR (hoặc người gõ tay "22/12 #3.2"). Chấp nhận thiếu năm
 * (lấy năm gần nhất hợp lý: ngày ấy trong ±180 ngày quanh hôm nay), thiếu
 * số khách (= 1), thiếu mã điểm. Trả null nếu không phải mã vé.
 */
export function parseVeQrText(raw: string, homNay?: string): VeQrDoc | null {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const m = /^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\s*[-–·]?\s*#\s*(\d+)(?:[.,](\d+))?\s*([A-Z0-9-]+)?$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = m[3] ? Number(m[3]) : NaN;
  if (Number.isFinite(y) && y < 100) y += 2000;
  if (!Number.isFinite(y)) {
    const today = homNay && isDateKey(homNay) ? new Date(`${homNay}T12:00:00+07:00`) : new Date();
    const nam = today.getFullYear();
    const cand = [nam - 1, nam, nam + 1].map((n) => ({ n, t: new Date(Date.UTC(n, mo - 1, d)).getTime() }));
    y = cand.reduce((a, b) => (Math.abs(b.t - today.getTime()) < Math.abs(a.t - today.getTime()) ? b : a)).n;
  }
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  const ngay = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const so = Number(m[4]);
  const guestNo = m[5] ? Number(m[5]) : 1;
  if (!so || !guestNo) return null;
  const duoi = m[6] ?? "";
  /** Đuôi là mã điểm (vé cũ) hay mã chống giả (vé mới)? Mã điểm có trong bảng; còn lại coi là mã chống giả. */
  if (duoi && DIEM_THEO_MA[duoi]) return { spot: DIEM_THEO_MA[duoi], ngay, so, guestNo, ma: null };
  return { spot: null, ngay, so, guestNo, ma: duoi || null };
}

/** "#3.2" — nhãn ngắn của một khách (đoàn 1 người vẫn "#3.1" trên QR nhưng hiện "#3"). */
export function nhanVe(so: number, guestNo: number, guestCount: number): string {
  return guestCount > 1 ? `#${so}.${guestNo}` : `#${so}`;
}

/**
 * Điểm nào QUÉT VÉ: Sa Pa mọi booking; Khau Phạ chỉ booking có PPG (chủ
 * 17/09: "khau phạ hiện sẽ viết tay, còn quét mã chỉ dành cho booking có PPG").
 */
export function coQuetVe(spot: string, b: { flightKind?: string; ppgGuests?: number }): boolean {
  if (spot === "sapa") return true;
  if (spot === "khau-pha") return b.flightKind === "ppg" || (b.ppgGuests ?? 0) > 0;
  return false;
}

/**
 * CHIA DỊCH VỤ CHO TỪNG KHÁCH lúc in vé (chủ 17/09, mục 11): đoàn 10 khách có
 * 10 flycam → mỗi người một; có 8 thì máy KHÔNG đoán, nhân viên tích tay.
 * Trả `auto: true` khi mọi dịch vụ đều là 0 hoặc bằng đúng số khách.
 */
export function chiaDichVu(
  guestCount: number,
  so: { video360: number; flycam: number; redFlag: number },
): { auto: boolean; khach: DichVuKhach[] } {
  const n = Math.max(1, guestCount);
  const auto = DICH_VU_VE.every((k) => so[k] === 0 || so[k] >= n);
  const khach: DichVuKhach[] = Array.from({ length: n }, () => ({ ...KHONG_DICH_VU }));
  if (auto) for (const k of DICH_VU_VE) if (so[k] >= n) for (const x of khach) x[k] = true;
  return { auto, khach };
}

/** Tên rút gọn cho danh sách in: "Nguyễn Văn An" → "N.V.An"; tên ngắn giữ nguyên. */
export function tenVietTat(ten: string): string {
  const p = String(ten ?? "").trim().split(/\s+/).filter(Boolean);
  if (p.length <= 2) return p.join(" ");
  return p.slice(0, -1).map((x) => x[0]!.toUpperCase() + ".").join("") + p[p.length - 1];
}

export function dichVuChu(d: Partial<DichVuKhach> | undefined): string[] {
  return DICH_VU_VE.filter((k) => d?.[k]).map((k) => TEN_DICH_VU[k]);
}

/* ------------------------------------------------------------------ */
/* Trạng thái của một mã                                               */
/* ------------------------------------------------------------------ */

/** Một khách trên booking, phần lưu trong `booking.veQr.khach[]`. */
export type VeQrKhach = {
  guestNo: number;
  dichVu: DichVuKhach;
  /** Phi công đang giữ mã (đã quét). Trống = mã trống, ai quét cũng được. */
  phiCong?: { username: string; name: string; luc: string } | null;
  /** Đã tích "bay xong". */
  bayXong?: { luc: string } | null;
  /** Dịch vụ lẻ phi công đã HOÀN (không hoàn thành được) — vẫn giữ chuyến. */
  hoanDichVu?: Partial<DichVuKhach>;
  /**
   * THU HỒI: điều phối huỷ / dời booking (hoặc thu hồi tay) khi phi công đã
   * chiếm — mã trắng lại, còn dòng này giữ để phi công thấy cảnh báo và số
   * chuyến/dịch vụ liên quan bị rút. Phi công bấm "đã xem" thì `daXem`.
   */
  thuHoi?: { ly: "huy" | "doi" | "tay"; luc: string; phiCong: string; phiCongTen: string; boi: string; daXem?: boolean; daBayXong?: boolean; dichVu: DichVuKhach } | null;
  lichSu: Array<{ luc: string; boi: string; viec: string; ghiChu?: string }>;
};

export type VeQrDTO = {
  /** Ngày cấp vé (căn cước trong QR) — dời lịch không đổi. */
  ngay: string;
  /** Số thứ tự trong ngày cấp — không đổi. */
  so: number;
  capLuc: string;
  capBoi: string;
  khach: VeQrKhach[];
};

export type TrangThaiMa = "trong" | "chiem" | "bayxong";

export function trangThaiMa(k: Pick<VeQrKhach, "phiCong" | "bayXong">): TrangThaiMa {
  if (k.bayXong) return "bayxong";
  if (k.phiCong) return "chiem";
  return "trong";
}

/** Booking "đã bay hết" khi mọi khách đều đã tích bay xong (chủ 17/09, mục 13). */
export function daBayHet(ve: VeQrDTO | undefined | null, guestCount: number): boolean {
  if (!ve?.khach?.length) return false;
  const n = Math.max(1, guestCount);
  return ve.khach.length >= n && ve.khach.slice(0, n).every((k) => Boolean(k.bayXong));
}
