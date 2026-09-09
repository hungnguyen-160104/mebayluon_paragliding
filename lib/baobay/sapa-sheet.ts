// lib/baobay/sapa-sheet.ts
/**
 * CẦU NỐI HAI CHIỀU giữa SỔ BOOKING của app và SỔ TAY GOOGLE SHEETS của Sa Pa.
 *
 * Sa Pa có một nhân viên ngồi gõ thẳng vào bảng tính "Bảng theo dõi chuyến bay"
 * (mỗi tháng một tab: T1-26, T2-26, T3-26, T4-2026 … T9-2026). Bảng đó là sổ
 * KẾ TOÁN SAU CHUYẾN BAY: đơn giá, thành tiền, flycam, 360, tổng thu, đặt cọc,
 * ai nhận tiền. Còn sổ booking của app là sổ ĐẶT TRƯỚC: khách nào, số điện
 * thoại, đón ở đâu, mấy giờ, đã bay hay huỷ.
 *
 * Hai bên nói về CÙNG một chuyến bay nên phải nối lại, nhưng không bên nào bỏ
 * được: kế toán quen bảng tính, điều phối cần sổ booking. Vì vậy tệp này chỉ
 * làm đúng một việc — DỊCH qua lại giữa hai cách ghi.
 *
 * ┌── quy ước sống còn ────────────────────────────────────────────────────┐
 * │ MỘT CÁCH CẤP SỐ DUY NHẤT: cột B của bảng tính ("Ghi chú" — thật ra là  │
 * │ số thứ tự khách trong ngày) CHÍNH LÀ `daySeq` của app. App là nơi duy  │
 * │ nhất cấp số; nhân viên gõ dòng mới không điền số thì vài phút sau máy  │
 * │ điền vào. Nhờ vậy "khách số 4 ngày 12/9" là một người duy nhất, gọi ở  │
 * │ bảng tính hay trong app đều ra đúng người đó.                          │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * BỐ CỤC TAB THÁNG (đọc từ chính tệp .xlsx của bảng, tab T9-2026):
 *   hàng 1–2: tiêu đề gộp ô ("THÔNG TIN VÉ", "NGƯỜI NHẬN TIỀN"…)
 *   hàng 3  : TÊN CỘT thật
 *   hàng 4  : dòng tổng (=sum của cả cột)
 *   hàng 5→ : dữ liệu
 *
 *   A Tháng · B Ghi chú (=STT khách trong ngày) · C Ngày bay · D Code đại lý or lẻ
 *   E Số booking · F TÊN ĐĂNG KÝ (mỗi khách một dòng trong ô) · G SL MCC
 *   H Đơn giá · I Thành tiền (=H×G) · J Flycam(SL) · K Flycam(tiền)
 *   L 360(SL) · M 360(tiền) · N Phụ thu khác · O TỔNG THU (=I+K+M+N)
 *   P ĐẶT CỌC · Q…W NGƯỜI NHẬN TIỀN · X Chiết khấu đại lý · Y Tiền xe
 *   Z Chi Flycam · AA Chi khác · AB Chi TM · AC Chi CK · AD phi công bay
 *   AE Hình thức t/t · AF Người thu TM
 *
 * AB, AC, AD là ô GỘP THEO NGÀY (một ô trải suốt các dòng của cùng một ngày) —
 * app KHÔNG BAO GIỜ ghi vào đó, ghi là vỡ bảng.
 *
 * Cột I và O là CÔNG THỨC của bảng. App chỉ đặt công thức lúc TẠO dòng mới,
 * còn khi sửa thì để nguyên — đè số cứng lên công thức là kế toán mất phép tự
 * cộng mà không ai biết.
 */

import { normalizeSpot } from "@/lib/baobay/spots";

/** Tên trường app dùng khi nói chuyện với Apps Script (không phải tên cột). */
export type SapaSheetRow = {
  /** `_id` của booking — Apps Script giữ ở cột "Khoá app". */
  key: string;
  month: string;
  daySeq: number | "";
  /** "YYYY-MM-DD" giờ Việt Nam — Apps Script tự đổi sang ô ngày của bảng. */
  flightDate: string;
  source: string;
  bookingCode: string;
  /** Mỗi khách một dòng, đúng cách bảng tính đang ghi. */
  guestNames: string;
  guestCount: number | "";
  unitPrice: number | "";
  flycam: number | "";
  flycamMoney: number | "";
  video360: number | "";
  video360Money: number | "";
  extraFee: number | "";
  deposit: number | "";
  commission: number | "";
  phone: string;
  pickupNote: string;
  expectedTime: string;
  statusText: string;
  /** Tổng đã thu bên app — để kế toán so với các cột "NGƯỜI NHẬN TIỀN". */
  paidText: string;
  /**
   * Các cột "NGƯỜI NHẬN TIỀN": khoá `dest:<mã quỹ>` → số tiền của quỹ đó.
   * Khoá động (mỗi điểm một danh sách quỹ) nên khai bằng chỉ mục; Apps Script
   * giữ bảng ánh xạ sang đúng tên cột trên bảng.
   */
  [dest: `dest:${string}`]: string | number;
};

/**
 * Dòng thô Apps Script gửi lên. Mọi ô đều có thể là số HOẶC chuỗi
 * ("2.190.000" khi ô định dạng chữ), nên chỗ nào cũng phải đi qua `money()`.
 */
export type SapaSheetInboundRow = {
  /** Số hàng thật trên tab — chỉ để báo kết quả về đúng dòng. */
  row: number;
  key?: string;
  daySeq?: number | string;
  flightDate?: string;
  source?: string;
  bookingCode?: string;
  guestNames?: string;
  guestCount?: number | string;
  unitPrice?: number | string;
  /** Ô "Thành tiền" (cột I) — nhiều dòng gõ thẳng vào đây mà bỏ trống đơn giá. */
  lineAmount?: number | string;
  flycam?: number | string;
  flycamMoney?: number | string;
  video360?: number | string;
  video360Money?: number | string;
  extraFee?: number | string;
  total?: number | string;
  deposit?: number | string;
  commission?: number | string;
  phone?: string;
  pickupNote?: string;
  expectedTime?: string;
  statusText?: string;
};

/**
 * TÊN TAB CỦA MỘT THÁNG.
 *
 * Bảng đặt tên KHÔNG nhất quán — ba tháng đầu là "T1-26", "T2-26", "T3-26";
 * từ tháng 4 là "T4-2026". App gửi kiểu MỚI ("T9-2026") và Apps Script dò lại
 * bằng biểu thức nới lỏng, nên đặt tên kiểu nào bên đó cũng tìm ra.
 */
export function sapaSheetName(flightDate: string): string {
  const [y, m] = flightDate.split("-");
  return `T${Number(m)}-${y}`;
}

/** "thg 9" — đúng chữ bảng tính đang điền ở cột A. */
export function sapaMonthLabel(flightDate: string): string {
  return `thg ${Number(flightDate.split("-")[1])}`;
}

/**
 * Đọc một ô TIỀN/SỐ về number.
 *
 * Ô của bảng có ba dạng: số thật (5480000), chuỗi Việt Nam ("5.480.000"), và
 * chuỗi kiểu Anh ("5,480,000"). Đọc sai kiểu là lệch một triệu lần, nên phân
 * biệt bằng HÌNH DẠNG cả chuỗi chứ không nhìn mỗi dấu cuối:
 *
 *  1. Chia nhóm đúng chuẩn ("5.480.000", "2,190,000" — 1–3 chữ số rồi từng
 *     nhóm 3) → mọi dấu là dấu NGHÌN, bỏ hết.
 *  2. Chỉ có MỘT dấu mà không thành nhóm ("2087962.963", "1,5") → dấu THẬP
 *     PHÂN. Đây là số Sheets tự sinh ở cột USD (=POS/1.08), không phải tiền
 *     đồng, nhưng đọc đúng vẫn hơn đọc thành hai tỉ.
 *  3. Còn lại → bỏ hết dấu.
 *
 * Tiền đồng luôn làm tròn về số nguyên: sổ không có xu.
 */
export function sheetMoney(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : 0;
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;
  const sign = cleaned.startsWith("-") ? -1 : 1;
  const digits = cleaned.replace(/-/g, "");
  const grouped = /^\d{1,3}([.,]\d{3})+$/.test(digits);
  const seps = (digits.match(/[.,]/g) ?? []).length;
  const normalized = grouped || seps !== 1 ? digits.replace(/[.,]/g, "") : digits.replace(/[.,]/, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n) * sign : 0;
}

/** Số đếm (khách, flycam…) — âm và số lẻ đều vô nghĩa ở đây. */
export function sheetCount(v: unknown): number {
  return Math.max(0, sheetMoney(v));
}

/**
 * Ô "Giờ đón" về "HH:MM".
 *
 * Sheets trả giờ theo ba kiểu tuỳ ô được định dạng thế nào: chuỗi "8:30",
 * chuỗi ISO của một Date mốc 1899 (ô kiểu giờ), và số thập phân 0–1 (phần của
 * một ngày). Không nhận kiểu nào cũng được thì ô giờ của nhân viên rơi mất.
 */
export function sheetTime(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const raw = String(v).trim();
  const iso = raw.match(/T(\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}:${iso[2]}`;
  const hm = raw.match(/^(\d{1,2})\s*[:hg.]\s*(\d{1,2})/i);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h < 24 && m < 60) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return "";
}

/**
 * Ô "Ngày bay" về "YYYY-MM-DD".
 *
 * Apps Script đã tự định dạng sẵn theo giờ Việt Nam trước khi gửi, nên đường
 * chính là nhận nguyên chuỗi ISO. Vẫn đỡ thêm hai kiểu người hay gõ tay
 * ("12/09", "12/09/2026") vì có lúc nhân viên gõ ngày vào ô định dạng chữ —
 * lúc đó Apps Script không đổi được và đẩy nguyên chữ sang.
 */
export function sheetDate(v: unknown, fallbackYear?: string): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    let y = dmy[3] ?? fallbackYear ?? String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${m}-${d}`;
  }
  return "";
}

/** Chữ trạng thái hiện trên bảng ⇄ trạng thái booking. */
export const SAPA_STATUS_TEXT: Record<string, string> = {
  open: "CHỜ BAY",
  done: "ĐÃ BAY",
  cancelled: "ĐÃ HUỶ",
  voided: "BỎ SỔ",
};

/**
 * Đọc ngược ô "Trạng thái".
 *
 * Trả `null` khi ô trống hoặc gõ chữ lạ — KHÔNG đoán thành "chờ bay": ô trống
 * là "nhân viên chưa nói gì", đoán bừa thì mỗi lần quét lại lật ngược trạng
 * thái mà điều phối vừa bấm trong app.
 */
export function sapaStatusFromText(v: unknown): "open" | "done" | "cancelled" | null {
  const t = String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!t) return null;
  if (t.includes("dabay") || t === "bay" || t.includes("xong")) return "done";
  if (t.includes("huy") || t.includes("cancel")) return "cancelled";
  if (t.includes("chobay") || t.includes("cho")) return "open";
  return null;
}

/** Tách ô "TÊN ĐĂNG KÝ" (mỗi khách một dòng) thành danh sách tên. */
export function sapaGuestNames(v: unknown): string[] {
  return String(v ?? "")
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isSapaSpot(spot: unknown): boolean {
  return normalizeSpot(spot) === "sapa";
}

/**
 * APP CÓ ĐƯỢC GHI VÀO BẢNG TÍNH SA PA KHÔNG — MẶC ĐỊNH LÀ KHÔNG.
 *
 * Bảng tính là sổ SỐNG của một nhân viên đang làm việc thật trên đó hằng ngày.
 * Chừng nào cách nhập booking trong app và thói quen của người đó chưa khớp
 * nhau thì mọi phép ghi tự động đều là ghi đè lên công việc của người khác —
 * và ghi đè trên Google Sheets thì người ta chỉ biết khi số đã sai.
 *
 * Nên chiều APP → BẢNG mặc định ĐÓNG. Bật bằng biến môi trường
 * `SAPA_SHEET_WRITE=1` khi hai bên đã chạy quen, và bật thì bật cả hai chỗ:
 * biến này (phía app) và `SAPA_CHI_DOC = false` trong Apps Script (phía bảng).
 * Hai khoá cho một cửa là có chủ ý — quên một cái vẫn không ai ghi bậy.
 *
 * Chiều BẢNG → APP không nằm dưới khoá này: đọc thì không làm hỏng gì của ai.
 */
export function sapaSheetWriteEnabled(): boolean {
  return /^(1|true|yes|on|bat)$/i.test(String(process.env.SAPA_SHEET_WRITE ?? "").trim());
}

/**
 * KHOÁ NHẬN DẠNG MỘT DÒNG BẢNG TÍNH, tính từ CHÍNH NỘI DUNG dòng đó.
 *
 * Vì sao cần: khi app chưa được ghi vào bảng, nó KHÔNG đặt được cột "Khoá app"
 * lên dòng. Không có mốc nào khác thì mỗi lượt "Lấy từ bảng" lại thấy dòng cũ
 * như dòng mới và đẻ thêm một booking trùng — lấy ba lần là sổ có ba khách y
 * hệt nhau.
 *
 * Ba nấc, lấy thứ nào BỀN NHẤT có trên dòng:
 *   1. số thứ tự khách trong ngày (cột B) — nhân viên gần như luôn điền;
 *   2. mã booking OTA (cột E) — bền, nhưng khách lẻ không có;
 *   3. tên khách đầu tiên — yếu nhất, chỉ dùng khi hai cái trên đều trống.
 *
 * Luôn kèm NGÀY BAY: số 3 của hôm nay và số 3 của hôm qua là hai người.
 */
export function sapaRowRef(input: { flightDate: string; daySeq?: number; bookingCode?: string; guestName?: string }): string {
  const day = String(input.flightDate ?? "").trim();
  if (!day) return "";
  if (input.daySeq && input.daySeq > 0) return `${day}#${input.daySeq}`;
  const code = String(input.bookingCode ?? "").trim().toUpperCase();
  if (code) return `${day}@${code}`;
  const name = String(input.guestName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return name ? `${day}~${name}` : "";
}
