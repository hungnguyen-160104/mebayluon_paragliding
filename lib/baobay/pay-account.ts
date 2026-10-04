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
 *  - Chọn ngẫu nhiên sao cho TK công ty nhận khoảng 30% DOANH THU chuyển khoản
 *    (chủ sửa 04/10: "không phải 30% số booking mà 30% doanh thu").
 *
 * Tệp THUẦN (không "use client", không đụng DB) — máy chủ lẫn trình duyệt
 * cùng đọc. MỌI CON SỐ CHỈNH ĐƯỢC NẰM Ở `COMPANY_ACCOUNT_RULES` bên dưới.
 */

export type PayAccountKind = "personal" | "company";

/**
 * Vì sao booking mang tài khoản đó — để sau còn hỏi lại:
 *  auto    máy bốc thăm (rổ 30%)
 *  deposit đi theo khoản ĐÃ TRẢ (cọc/chuyển khoản đã về tài khoản nào)
 *  qr      (CŨ, bỏ từ 04/10 vòng 3) đã đưa QR TK cá nhân trước khi máy chọn —
 *          nay bấm QR trên form chưa lưu là máy chọn luôn (pickProvisional)
 *  manual  nhân viên/kế toán đổi tay (có ghi người + lý do)
 */
export type PayAccountSource = "auto" | "deposit" | "qr" | "manual";

/* ================================================================== */
/* CẤU HÌNH — chủ muốn đổi tỉ lệ / điểm / mốc thì sửa ở đây            */
/* ================================================================== */

export const COMPANY_ACCOUNT_RULES = {
  /** Điểm bay áp dụng. Hà Nội giữ TK cá nhân; Sa Pa đang ẩn khỏi app. */
  spots: ["khau-pha"] as readonly string[],
  /**
   * Phần DOANH THU CHUYỂN KHOẢN vào TK công ty, tính theo TỪNG NGÀY BAY (chủ
   * 04/10: 30% doanh thu, không phải 30% số booking). "Doanh thu chuyển khoản"
   * của một booking = tổng tiền − phần trả đại lý/OTA − phần đã trả tiền mặt
   * (xem transferValueOf).
   */
  targetRevenueShare: 0.3,
  /**
   * DẢI CHẤP NHẬN của phần doanh thu trong ngày. Gán một đoàn lớn mà đẩy ngày
   * vượt `high` thì hạ xác suất (tránh một đoàn 6 khách làm ngày lên 60%); để
   * TK cá nhân mà ngày tụt dưới `low` thì máy đã tự kéo lên qua phần thiếu hụt.
   */
  band: { low: 0.25, high: 0.35 },
  /**
   * "Số liệu mồi" của mỗi ngày: coi như ngày đã có sẵn ngần này doanh thu, đúng
   * 30% ở TK công ty. Không có mồi thì booking ĐẦU TIÊN của ngày nào cũng làm
   * ngày đó thành 0% hoặc 100% — máy sẽ hoảng mà chặn mọi đoàn đầu ngày.
   */
  priorRevenue: 8_000_000,
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
  /**
   * Độ "kéo" về đúng tỉ lệ khi ngày đó đang lệch (0 = bốc thăm thuần, 1 = gán
   * đúng phần thiếu). Phần thiếu tính bằng TIỀN, chia cho tiền của booking này.
   */
  catchUp: 0.8,
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
 * DOANH THU CHUYỂN KHOẢN của một booking — phần khách sẽ trả cho ta bằng CK:
 * tổng tiền − phần khách đã trả đại lý/OTA − phần đã trả TIỀN MẶT (cọc gõ tay
 * TM + mọi lệnh thu TM). Cọc CHUYỂN KHOẢN vẫn tính (nó là doanh thu CK của
 * tài khoản booking đó). Booking chưa trả gì → cả tổng tiền (trả một lần CK).
 */
export function transferValueOf(b: {
  totalAmount?: number | null;
  agencyPaidAmount?: number | null;
  deposit?: number | null;
  depositMethod?: string | null;
  refundedTotal?: number | null;
  collectedLog?: Array<{ method?: string; amount?: number }> | null;
}): number {
  const log = b.collectedLog ?? [];
  const viaLog = log.reduce((t, c) => t + (Number(c?.amount) || 0), 0);
  const cashLog = log.filter((c) => c?.method === "cash").reduce((t, c) => t + (Number(c?.amount) || 0), 0);
  // Cọc gõ tay (không qua lệnh thu) = số ròng − đã thu qua lệnh + đã hoàn
  const typedDeposit = Math.max(0, (Number(b.deposit) || 0) - viaLog + (Number(b.refundedTotal) || 0));
  const cash = cashLog + (b.depositMethod === "cash" ? typedDeposit : 0);
  return Math.max(0, (Number(b.totalAmount) || 0) - (Number(b.agencyPaidAmount) || 0) - cash);
}

/**
 * XÁC SUẤT chọn TK công ty cho booking kế tiếp của một ngày bay — theo TIỀN.
 *
 * `decidedValue`/`companyValue`: doanh thu CK của các booking (không tính OTA)
 * cùng NGÀY BAY đã chốt tài khoản từ mốc áp dụng, và phần trong đó ở TK công
 * ty. `amount`: doanh thu CK của booking đang bốc.
 *
 *  1. Phần THIẾU (bằng tiền) để ngày đạt 30% sau booking này, chia cho tiền
 *     của booking → "booking này lấp được bao nhiêu phần". Kéo xác suất về đó.
 *  2. Nhân trọng số ưu tiên (trả một lần CK cao, đã cọc TM thấp).
 *  3. CHỐNG VỌT: gán TK công ty mà ngày vượt dải trên (35%) → hạ xác suất theo
 *     đúng tỉ lệ phần vượt; đoàn càng to so với ngày càng khó vào TK công ty.
 *  4. Kẹp trong [minChance, maxChance] — không bao giờ chắc chắn để lách.
 */
export function companyChance(input: { decidedValue: number; companyValue: number; amount: number; weight: number }): number {
  const R = COMPANY_ACCOUNT_RULES;
  const T = R.targetRevenueShare;
  const a = Math.max(1, input.amount);
  const V = Math.max(0, input.decidedValue) + R.priorRevenue;
  const C = Math.max(0, input.companyValue) + R.priorRevenue * T;
  const need = T * (V + a) - C;
  let p = (T + R.catchUp * (need / a - T)) * input.weight;
  const ifCompany = (C + a) / (V + a);
  const ifPersonal = C / (V + a);
  if (ifCompany > R.band.high) {
    p *= Math.max(0, Math.min(1, (R.band.high - ifPersonal) / (ifCompany - ifPersonal)));
  }
  return Math.min(R.maxChance, Math.max(R.minChance, p));
}

/** Nhãn đọc được cho người dùng. */
export const PAY_ACCOUNT_LABEL: Record<PayAccountKind, string> = {
  personal: "TK cá nhân (BIDV Đặng Thị Thuỷ)",
  company: "TK công ty (MB 168858888)",
};

export const PAY_ACCOUNT_SOURCE_LABEL: Record<PayAccountSource, string> = {
  auto: "máy chọn",
  deposit: "theo khoản đã trả",
  qr: "đã đưa QR TK cá nhân (luật cũ)",
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
