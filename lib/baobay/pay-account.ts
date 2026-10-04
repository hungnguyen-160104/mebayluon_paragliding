// lib/baobay/pay-account.ts
/**
 * TÀI KHOẢN NHẬN TIỀN BAY CỦA TỪNG BOOKING — "TK cá nhân" hay "TK công ty".
 *
 * Chủ 04/10/2026: ở Khau Phạ khoảng 30% khách chuyển khoản vào TÀI KHOẢN CÔNG
 * TY (MB 168858888 — CN Tây Bắc - CTCP DL và TT Viên Nam) để kế toán xuất hoá
 * đơn VAT cuối ngày. Máy tự chọn, nhân viên chỉ việc đưa mã QR — mã tự mang
 * đúng tài khoản. Booking chuyển vào TK công ty mang nhãn ĐỎ "TKCT".
 *
 * Luật (đúng lời chủ):
 *  - Cọc vào TK Đặng Thị Thuỷ thì phần còn lại cũng vào TK Thuỷ.
 *  - Cọc vào TK công ty thì phần còn lại cũng vào TK công ty.
 *  - ƯU TIÊN booking trả MỘT LẦN chuyển khoản cho TK công ty — hoá đơn sạch.
 *  - Chỉ chọn ngẫu nhiên khoảng 30%.
 *
 * Tệp THUẦN (không "use client", không đụng DB) — máy chủ lẫn trình duyệt
 * cùng đọc. MỌI CON SỐ CHỈNH ĐƯỢC NẰM Ở `COMPANY_ACCOUNT_RULES` bên dưới.
 */

export type PayAccountKind = "personal" | "company";

/**
 * Vì sao booking mang tài khoản đó — để sau còn hỏi lại:
 *  auto    máy bốc thăm (rổ 30%)
 *  deposit đi theo khoản ĐÃ TRẢ (cọc/chuyển khoản đã về tài khoản nào)
 *  qr      đã đưa mã QR của tài khoản cá nhân trước khi máy kịp chọn (form chưa lưu)
 *  manual  nhân viên/kế toán đổi tay (có ghi người + lý do)
 */
export type PayAccountSource = "auto" | "deposit" | "qr" | "manual";

/* ================================================================== */
/* CẤU HÌNH — chủ muốn đổi tỉ lệ / điểm / mốc thì sửa ở đây            */
/* ================================================================== */

export const COMPANY_ACCOUNT_RULES = {
  /** Điểm bay áp dụng. Hà Nội giữ TK cá nhân; Sa Pa đang ẩn khỏi app. */
  spots: ["khau-pha"] as readonly string[],
  /** Tỉ lệ booking chuyển vào TK công ty, tính theo TỪNG NGÀY BAY. */
  targetShare: 0.3,
  /**
   * CHỈ booking LẬP TỪ MỐC NÀY trở đi mới được máy chọn — booking cũ giữ TK cá
   * nhân, không viết lại lịch sử (mã QR cũ đã gửi khách là TK cá nhân).
   * Giờ Việt Nam. Chủ quyết lại mốc thì sửa ở đây.
   */
  startAt: "2026-10-04T11:30:00+07:00",
  /**
   * TRỌNG SỐ ưu tiên (nhân vào xác suất bốc thăm):
   *  - chưa cọc gì → khách sẽ trả MỘT LẦN chuyển khoản → ưu tiên cao;
   *  - đã cọc TIỀN MẶT → phần chuyển khoản chỉ là phần còn lại → ưu tiên thấp.
   * Booking đã cọc CHUYỂN KHOẢN thì không bốc — đi theo tài khoản của cọc.
   */
  weightOneTransfer: 1.5,
  weightCashDeposit: 0.4,
  /**
   * Biên xác suất: không bao giờ chắc chắn 0% hay 100% — nhân viên không đoán
   * trước được "booking thứ mấy sẽ vào TK công ty" để lách.
   */
  minChance: 0.05,
  maxChance: 0.95,
  /** Độ "kéo" về đúng tỉ lệ khi ngày đó đang lệch (0 = bốc thăm thuần). */
  catchUp: 0.5,
  /**
   * Khách OTA (Klook, Viator…) trả tiền bay cho đại lý, không chuyển khoản cho
   * ta phần chính — loại khỏi rổ 30%. Nhận ra bằng mã OTA, tiền đại lý thu hộ
   * hoặc tên nguồn khớp mẫu này.
   */
  otaSource: /klook|viator|get\s*your\s*guide|\bgyg\b|kkday|traveloka|agoda|booking\.com|tripadvisor|expedia|trip\.com|airbnb|headout|civitatis|bluehome/i,
} as const;

/** Mã ngắn trên đường link /thanh-toan (`t=ct`) — không đưa chữ "company" ra ngoài. */
export const PAY_ACCOUNT_URL_CODE = "ct";

/* ================================================================== */
/* HÀM THUẦN                                                           */
/* ================================================================== */

export function payAccountSpotEnabled(spot: unknown): boolean {
  return COMPANY_ACCOUNT_RULES.spots.includes(String(spot ?? ""));
}

/** Tài khoản THẬT SỰ dùng cho booking: chỉ "company" khi đã chốt; còn lại là TK cá nhân như cũ. */
export function payAccountOf(b: { payAccount?: string | null } | null | undefined): PayAccountKind {
  return b?.payAccount === "company" ? "company" : "personal";
}

/** Booking mang nhãn TKCT? */
export function isCompanyPay(b: { payAccount?: string | null } | null | undefined): boolean {
  return payAccountOf(b) === "company";
}

/** Booking OTA trả trước — không vào rổ bốc thăm. */
export function isOtaPrepaid(b: {
  otaRef?: string | null;
  otaName?: string | null;
  agencyPaidAmount?: number | null;
  source?: string | null;
}): boolean {
  if (String(b.otaRef ?? "").trim() || String(b.otaName ?? "").trim()) return true;
  if ((Number(b.agencyPaidAmount) || 0) > 0) return true;
  return COMPANY_ACCOUNT_RULES.otaSource.test(String(b.source ?? ""));
}

/** Booking lập sau mốc áp dụng? Không rõ ngày lập thì coi như MỚI (đang lập). */
export function createdAfterStart(createdAt: unknown): boolean {
  if (!createdAt) return true;
  const t = new Date(createdAt as string).getTime();
  if (!Number.isFinite(t)) return true;
  return t >= new Date(COMPANY_ACCOUNT_RULES.startAt).getTime();
}

/**
 * XÁC SUẤT chọn TK công ty cho booking kế tiếp của một ngày bay.
 *
 * `decided`/`company`: số booking (không tính OTA) của NGÀY BAY đó đã chốt tài
 * khoản từ mốc áp dụng, và bao nhiêu trong số đó là TK công ty. Ngày đang
 * THIẾU so với 30% thì xác suất nhích lên, THỪA thì hạ xuống — tỉ lệ cả ngày
 * bám quanh 30% mà từng lần vẫn là bốc thăm thật.
 */
export function companyChance(input: { decided: number; company: number; weight: number }): number {
  const R = COMPANY_ACCOUNT_RULES;
  const deficit = R.targetShare * Math.max(0, input.decided) - Math.max(0, input.company);
  const raw = (R.targetShare + R.catchUp * deficit) * input.weight;
  return Math.min(R.maxChance, Math.max(R.minChance, raw));
}

/** Nhãn đọc được cho người dùng. */
export const PAY_ACCOUNT_LABEL: Record<PayAccountKind, string> = {
  personal: "TK cá nhân (BIDV Đặng Thị Thuỷ)",
  company: "TK công ty (MB 168858888)",
};

export const PAY_ACCOUNT_SOURCE_LABEL: Record<PayAccountSource, string> = {
  auto: "máy chọn",
  deposit: "theo khoản đã trả",
  qr: "đã đưa QR TK cá nhân",
  manual: "đổi tay",
};

/**
 * Dòng sao kê dán vào là của TÀI KHOẢN NÀO — đọc từ chính chuỗi SMS/sao kê.
 *
 *  BIDV: "TK 887xxx9685 tai BIDV +2,590,000VND …" → cá nhân
 *  MB:   "TK 16xxx888 GD: +2,590,000VND …" / "MB: TK 168858888 …" → công ty
 *
 * Chỉ tin dấu hiệu RÕ (đuôi số tài khoản đứng sau chữ TK, hoặc nguyên số);
 * khách gõ số TK vào nội dung thì nằm sau "ND:" — cắt phần ND đi trước khi dò
 * để khỏi nhận nhầm. Không đọc ra thì trả "" — để kế toán chọn tay khi dán.
 */
export function detectStatementAccount(raw: string): PayAccountKind | "" {
  const s = String(raw ?? "");
  const head = s.split(/\b(?:ND|Noi dung|N[ộo]i dung|ref|Description)\s*[:.]/i)[0] ?? s;
  const acct = /\bTK\s*[:.]?\s*([0-9xX*.]{4,20})/i.exec(head)?.[1] ?? "";
  const digits = acct.replace(/[^0-9]/g, "");
  if (acct) {
    if (/9685$/.test(digits) || /^8875639685$/.test(digits)) return "personal";
    if (/8888$/.test(digits) || /^0?168858888$/.test(digits)) return "company";
  }
  if (/\b8875639685\b/.test(head)) return "personal";
  if (/\b0?168858888\b/.test(head)) return "company";
  if (/\btai BIDV\b/i.test(head)) return "personal";
  if (/^\s*(?:MB|MBBank|MB Bank)\b/i.test(head)) return "company";
  return "";
}
