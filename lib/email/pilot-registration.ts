// lib/email/pilot-registration.ts
/**
 * Hai thư sau khi phi công đăng ký bay: một gửi cho chính phi công (nếu họ
 * có khai email), một gửi về hộp thư ban tổ chức.
 *
 * Cả hai đều tiếng Việt. Phi công nước ngoài vẫn nhận bản tiếng Việt kèm một
 * dòng tiếng Anh ở đầu chỉ chỗ liên hệ — đội điều hành trao đổi trực tiếp
 * với họ qua điện thoại, thư này chủ yếu để lưu lại thông tin đã khai.
 */

import {
  KIND_LABEL,
  MOTOR_LABEL,
  PERIODS,
  SITE_FEE_LABEL,
  MUA_VANG_COMBO_ITEMS,
  PAYMENT_ACCOUNT,
  OPENING_BY_PERIOD,
  MUA_VANG_ZALO_GROUP,
  PILOT_DISCOUNT_TEXT,
  formatVnDate,
  formatVnd,
  type FeeLine,
  type FlyingKind,
  type MotorType,
  type PeriodKey,
  type SiteFeeMode,
} from "@/lib/pilot-event";

const C = {
  ink: "#111827",
  soft: "#6B7280",
  line: "#E5E7EB",
  gold: "#B45309",
  goldBg: "#FFFBEB",
  green: "#15803D",
  red: "#DC2626",
  grayBg: "#F9FAFB",
};

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type PilotEmailInput = {
  code: string;
  fullName: string;
  idNumber: string;
  nationality: string;
  phone: string;
  email?: string;
  address?: string;
  club?: string;
  specialRequest?: string;
  /** Cỡ áo sự kiện — chỉ có ở đợt Mùa Vàng. */
  shirtSize?: string;
  /** Nhận bay PPG kéo cờ khai mạc — điều kiện miễn phí combo. */
  openingFlagFlight?: boolean;
  flyingKind: FlyingKind;
  motorType?: MotorType;
  wingClass?: string;
  period: PeriodKey;
  dates: string[];
  siteFeeMode?: SiteFeeMode;
  companionCount?: number;
  /** Nội dung chuyển khoản đã sinh sẵn. */
  transferNote?: string;
  /**
   * Mã QR chuyển khoản có được đính kèm thư hay không.
   * Đính theo kiểu CID nên hiện được cả khi khách chưa cho tải ảnh từ ngoài.
   */
  hasQr?: boolean;
  feeLines: FeeLine[];
  feeTotal: number;
  createdAt?: string;
};

/** Giờ Việt Nam, để thư ghi đúng lúc phi công bấm gửi. */
function vnDateTime(raw?: string): string {
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) return String(raw ?? "");
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function equipmentText(b: PilotEmailInput): string {
  const parts: string[] = [];
  if (b.motorType) parts.push(MOTOR_LABEL[b.motorType]);
  if (b.wingClass) {
    parts.push(b.wingClass === "PPG" ? "Dù PPG" : `Dù EN ${b.wingClass}`);
  }
  return parts.join(" · ") || "Chưa khai báo";
}

function row(label: string, value: string): string {
  return `<tr>
    <td width="150" valign="top" style="padding:7px 0;font-size:14px;color:${C.soft};border-bottom:1px solid ${C.line};">${esc(label)}</td>
    <td valign="top" style="padding:7px 0;font-size:14px;font-weight:600;color:${C.ink};border-bottom:1px solid ${C.line};">${esc(value)}</td>
  </tr>`;
}

function infoRows(b: PilotEmailInput): string {
  const period = PERIODS[b.period];
  const dates = b.dates.length
    ? b.dates.map(formatVnDate).join(" · ")
    : "Chưa chọn";

  const rows = [
    row("Họ và tên", b.fullName),
    row("CCCD/Passport", b.idNumber),
    row("Quốc tịch", b.nationality),
    row("Điện thoại", b.phone),
    b.email ? row("Email", b.email) : "",
    b.address ? row("Địa chỉ", b.address) : "",
    b.club ? row("CLB / Hội", b.club) : "",
    row("Loại hình bay", KIND_LABEL[b.flyingKind]),
    row("Phương tiện", equipmentText(b)),
    row("Đợt bay", period?.name || b.period),
    row("Ngày bay", dates),
    b.siteFeeMode ? row("Phí điểm bay", SITE_FEE_LABEL[b.siteFeeMode]) : "",
    b.companionCount
      ? row("Người nhà đi kèm", `${b.companionCount} người (ăn ở cùng đoàn)`)
      : "",
    b.shirtSize ? row("Cỡ áo sự kiện", b.shirtSize) : "",
    b.openingFlagFlight
      ? row("Bay PPG kéo cờ khai mạc", "CÓ — được miễn phí sự kiện")
      : "",
    b.specialRequest ? row("Yêu cầu riêng", b.specialRequest) : "",
  ];

  return rows.filter(Boolean).join("");
}

function feeTable(b: PilotEmailInput): string {
  const lines = b.feeLines
    .map(
      (l) => `<tr>
        <td style="padding:7px 0;font-size:14px;color:${C.ink};border-bottom:1px solid ${C.line};">${esc(l.label)}</td>
        <td style="padding:7px 0;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;color:${l.free ? C.green : C.ink};border-bottom:1px solid ${C.line};">${l.free ? esc(l.freeLabel || "Miễn phí") : formatVnd(l.amount)}</td>
      </tr>`,
    )
    .join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    ${lines}
    <tr>
      <td style="padding:11px 0 0;font-size:15px;font-weight:800;color:${C.ink};">TỔNG CỘNG</td>
      <td style="padding:11px 0 0;font-size:20px;font-weight:800;text-align:right;white-space:nowrap;color:${b.feeTotal > 0 ? C.red : C.green};">${b.feeTotal > 0 ? formatVnd(b.feeTotal) : "Miễn phí"}</td>
    </tr>
  </table>`;
}

/** Giờ khai mạc của đợt đang đăng ký; đợt ngày thường thì không có. */
function openingBox(b: PilotEmailInput): string {
  const text = OPENING_BY_PERIOD[b.period];
  if (!text || b.period === "mua_vang") return ""; // Mùa Vàng đã nằm trong comboBox

  return `<tr><td style="padding-top:16px;">
    <div style="background:${C.goldBg};border:1px solid #FDE68A;border-radius:10px;padding:13px 15px;font-size:15px;font-weight:800;color:${C.gold};">
      🎬 ${esc(text)}
    </div>
  </td></tr>`;
}

/** Danh sách combo — chỉ hiện với đợt Mùa Vàng, để phi công biết được bao gì. */
function comboBox(b: PilotEmailInput): string {
  if (b.period !== "mua_vang") return "";

  const items = MUA_VANG_COMBO_ITEMS.map(
    (t) =>
      `<div style="font-size:14px;color:${C.ink};line-height:1.8;"><span style="color:${C.green};font-weight:700;">✓</span> ${esc(t)}</div>`,
  ).join("");

  return `<tr><td style="padding-top:16px;">
    <div style="background:${C.goldBg};border:1px solid #FDE68A;border-radius:10px;padding:13px 15px;">
      <div style="font-size:15px;font-weight:800;color:${C.gold};margin-bottom:10px;">🎬 ${esc(OPENING_BY_PERIOD.mua_vang)}</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.gold};margin-bottom:6px;">Combo Festival Bay trên mùa vàng 2026 bao gồm</div>
      ${items}
    </div>
  </td></tr>`;
}

/**
 * Lời nhắc vào nhóm Zalo — chỉ với đợt Mùa Vàng.
 *
 * Đặt ngay dưới bảng chi phí và tô nổi: đây là việc phi công PHẢI làm sau khi
 * đăng ký, nếu bỏ qua thì không nhận được tin đổi giờ bay trong ba ngày sự kiện.
 */
function zaloBox(b: PilotEmailInput): string {
  if (b.period !== "mua_vang") return "";

  return `<tr><td style="padding-top:18px;">
    <div style="background:#EFF6FF;border:1px solid #93C5FD;border-radius:10px;padding:14px 16px;">
      <div style="font-size:15px;font-weight:800;color:#1D4ED8;">Vui lòng tham gia nhóm Zalo của sự kiện</div>
      <div style="margin-top:5px;font-size:14px;color:#1E3A8A;line-height:1.6;">
        Ba ngày sự kiện lịch bay thay đổi theo gió, ban tổ chức báo tin trong nhóm.
      </div>
      <a href="${esc(MUA_VANG_ZALO_GROUP)}" style="display:inline-block;margin-top:10px;background:#0068FF;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px;">Vào nhóm Zalo sự kiện</a>
    </div>
  </td></tr>`;
}

/**
 * Khối chuyển khoản: mã QR, số tài khoản và nội dung đã điền sẵn.
 *
 * Chỉ hiện khi thật sự phải đóng tiền. Có thêm câu nhắc cho người đã chuyển
 * rồi bỏ qua — thư này gửi ngay lúc đăng ký, nhiều phi công quét QR trên
 * trang xong mới mở mail, đọc lại thấy đòi tiền lần nữa sẽ tưởng bị tính hai lần.
 */
function paymentBox(b: PilotEmailInput): string {
  if (b.feeTotal <= 0) return "";

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:4px 0;font-size:14px;color:${C.soft};">${esc(label)}</td>
      <td style="padding:4px 0;font-size:14px;font-weight:700;text-align:right;color:${C.ink};">${esc(value)}</td>
    </tr>`;

  const qr = b.hasQr
    ? `<div style="text-align:center;margin:12px 0 10px;">
         <img src="cid:pilot-qr" alt="Mã QR chuyển khoản" width="200" height="200" style="display:inline-block;width:200px;height:200px;border:6px solid #ffffff;border-radius:12px;background:#ffffff;"/>
         <div style="margin-top:6px;font-size:13px;color:${C.soft};">Quét bằng app ngân hàng — số tiền và nội dung đã điền sẵn</div>
       </div>`
    : "";

  return `<tr><td style="padding-top:18px;">
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.gold};">Chuyển khoản phí đăng ký</div>
      <div style="margin-top:4px;font-size:24px;font-weight:800;color:${C.red};">${formatVnd(b.feeTotal)}</div>

      ${qr}

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;border-top:1px solid #FDE68A;padding-top:6px;">
        ${row("Ngân hàng", PAYMENT_ACCOUNT.bankName)}
        ${row("Số tài khoản", PAYMENT_ACCOUNT.accountDisplay)}
        ${row("Chủ tài khoản", "Đặng Văn Mỹ")}
        ${b.transferNote ? row("Nội dung", b.transferNote) : ""}
      </table>

      <div style="margin-top:12px;font-size:14px;line-height:1.6;color:#92400E;">
        Nếu bạn đã thanh toán, vui lòng bỏ qua mục này.
        <div style="margin-top:4px;font-weight:700;">Nếu chưa, vui lòng thanh toán sớm để ban tổ chức chốt danh sách.</div>
        <div style="margin-top:6px;font-weight:700;color:#047857;">Yên tâm — nếu huỷ lịch bay, bạn sẽ được hoàn tiền.</div>
      </div>
    </div>
  </td></tr>`;
}

export function pilotEmailSubject(b: PilotEmailInput): string {
  return `Xác nhận đăng ký bay Mùa Vàng 2026 - Mã: ${b.code}`;
}

export function pilotEmailHtml(b: PilotEmailInput): string {
  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:${C.grayBg};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.grayBg};padding:20px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

  <tr><td style="background:linear-gradient(135deg,#B45309,#D97706);padding:22px 24px;color:#ffffff;">
    <div style="font-size:11px;letter-spacing:2px;font-weight:700;opacity:.9;">MEBAYLUON PARAGLIDING</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;line-height:1.35;">Mùa Vàng 2026 — Khau Phạ · Tú Lệ · Mù Cang Chải</div>
    <div style="margin-top:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;font-weight:800;letter-spacing:1px;">${esc(b.code)}</div>
  </td></tr>

  <tr><td style="padding:20px 24px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

      <tr><td style="padding-bottom:10px;font-size:15px;color:${C.ink};line-height:1.6;">
        Chào <b>${esc(b.fullName)}</b>, ban tổ chức đã nhận được đăng ký bay của bạn.
        Chúng tôi sẽ liên hệ qua số <b>${esc(b.phone)}</b> để xác nhận lịch và điều kiện thời tiết.
      </td></tr>

      <tr><td style="padding-top:8px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.gold};border-bottom:2px solid ${C.line};padding-bottom:5px;">Thông tin đăng ký</div>
      </td></tr>
      <tr><td style="padding-top:4px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${infoRows(b)}</table>
      </td></tr>

      ${openingBox(b)}
      ${comboBox(b)}

      <tr><td style="padding-top:18px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.gold};border-bottom:2px solid ${C.line};padding-bottom:5px;">Chi phí</div>
      </td></tr>
      <tr><td style="padding-top:4px;">${feeTable(b)}</td></tr>

      ${zaloBox(b)}

      ${paymentBox(b)}

      <tr><td style="padding-top:18px;">
        <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:12px 15px;font-size:14px;font-weight:600;color:#065F46;line-height:1.6;">
          🎁 ${esc(PILOT_DISCOUNT_TEXT)}
        </div>
        <div style="margin-top:10px;background:#EAF4FE;border:1px solid #B9DDFB;border-radius:10px;padding:12px 15px;font-size:14px;color:#0B4F86;line-height:1.6;">
          Mang theo giấy tờ tuỳ thân và bằng/chứng nhận bay khi tới điểm bay.
          Mọi thay đổi lịch bay, vui lòng báo trước để ban tổ chức sắp xếp.
        </div>
      </td></tr>

      <tr><td style="padding-top:18px;font-size:14px;color:${C.ink};line-height:1.7;">
        Liên hệ ban tổ chức: <b>0964 073 555</b> (Mr. Mỹ) ·
        <a href="mailto:mebayluon@gmail.com" style="color:${C.gold};font-weight:700;">mebayluon@gmail.com</a>
      </td></tr>

      <tr><td style="padding-top:16px;border-top:1px solid ${C.line};font-size:12px;color:${C.soft};line-height:1.6;">
        Đăng ký lúc ${esc(vnDateTime(b.createdAt))} (giờ Việt Nam).<br/>
        Mebayluon Paragliding · <a href="https://www.mebayluon.com" style="color:${C.soft};">www.mebayluon.com</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function pilotAdminEmailSubject(b: PilotEmailInput): string {
  return `PHI CÔNG ĐĂNG KÝ - ${b.code} - ${b.fullName}`;
}

/** Bản cho ban tổ chức: tối giản, đủ mọi trường, đọc nhanh trên điện thoại. */
export function pilotAdminEmailHtml(b: PilotEmailInput): string {
  const period = PERIODS[b.period];

  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:${C.grayBg};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.grayBg};padding:18px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

  <tr><td style="background:#B45309;padding:16px 20px;color:#ffffff;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.9;">Phi công đăng ký bay</div>
    <div style="margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:21px;font-weight:800;">${esc(b.code)}</div>
    <div style="margin-top:5px;font-size:14px;">${esc(period?.name || b.period)} · ${esc(KIND_LABEL[b.flyingKind])}</div>
  </td></tr>

  <tr><td style="padding:16px 20px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${infoRows(b)}</table>

    <div style="margin-top:16px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.gold};border-bottom:2px solid ${C.line};padding-bottom:5px;">Chi phí</div>
    <div style="margin-top:6px;">${feeTable(b)}</div>

    <div style="margin-top:16px;padding-top:12px;border-top:1px solid ${C.line};font-size:12px;color:${C.soft};">
      Đăng ký lúc ${esc(vnDateTime(b.createdAt))} (giờ Việt Nam)${b.email ? "" : " · Phi công KHÔNG khai email, phải gọi điện xác nhận"}
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
