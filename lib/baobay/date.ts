// lib/baobay/date.ts
/**
 * Ngày bay luôn tính theo giờ Việt Nam và lưu dạng chuỗi "YYYY-MM-DD".
 *
 * KHÔNG lưu Date: máy chủ Vercel chạy UTC, nên `new Date()` lúc 7 giờ tối
 * Việt Nam vẫn còn là ngày hôm trước theo UTC — phi công báo bay buổi chiều
 * sẽ bị ghi lệch một ngày. Chuỗi "YYYY-MM-DD" cũng so sánh và sắp xếp được
 * trực tiếp trong MongoDB (thứ tự chữ trùng với thứ tự thời gian), nên truy
 * vấn theo khoảng ngày không cần chuyển đổi gì.
 */

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Hôm nay theo giờ Việt Nam, dạng "YYYY-MM-DD". */
export function todayInVN(): string {
  return toDateKeyVN(new Date());
}

export function toDateKeyVN(d: Date): string {
  // en-CA cho ra đúng dạng YYYY-MM-DD, khỏi phải tự ghép chuỗi.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Chặn 2026-02-31: dựng lại ngày rồi so sánh với chuỗi ban đầu.
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Dời một ngày đi `days` (âm là về trước), vẫn theo chuỗi ngày. */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** "2026-08-11" -> "11/08/2026" để hiện lên bảng cho dễ đọc. */
export function formatDateKeyVN(key: string): string {
  if (!isDateKey(key)) return key;
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

/** Giờ phút hiện tại theo giờ Việt Nam, dạng "HH:mm" — so được trực tiếp bằng chuỗi. */
export function nowTimeVN(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Đã quá mốc chốt báo cáo của một ngày bay chưa (deadline dạng "HH:mm", giờ VN).
 *
 * Ngày báo cáo là hôm qua trở về trước thì đương nhiên đã quá mốc; đúng hôm nay
 * thì so giờ phút. "HH:mm" so chuỗi là đúng thứ tự thời gian nên không cần đổi
 * sang số.
 */
export function isPastSubmitDeadline(reportDate: string, deadline: string): boolean {
  const today = todayInVN();
  if (reportDate < today) return true;
  if (reportDate > today) return false;
  return nowTimeVN() > deadline;
}

/** Thời điểm hiện tại dạng đọc được, dùng cho cột "Cập nhật lúc" của bảng tính. */
export function nowStampVN(): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * NGÀY CỦA KHOẢN CỌC — mốc để đối soát sao kê xếp khoản cọc vào đúng ngày.
 *
 * Trả về `depositDate` nếu quầy đã nhập tay (khách trả cọc hôm khác hôm lập
 * booking), không thì rơi về ngày LẬP BOOKING như trước. Mọi chỗ cần biết
 * "khoản cọc này thuộc ngày nào" phải đi qua đây, đừng đọc thẳng `depositDate`
 * — trống không có nghĩa là không có ngày, mà là "đúng hôm lập booking".
 */
export function depositDayOf(b: { depositDate?: string; createdAt?: Date | string | null }): string {
  if (isDateKey(b.depositDate)) return b.depositDate as string;
  if (!b.createdAt) return "";
  const d = new Date(b.createdAt);
  return Number.isFinite(d.getTime()) ? toDateKeyVN(d) : "";
}
