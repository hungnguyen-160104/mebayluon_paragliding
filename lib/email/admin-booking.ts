// lib/email/admin-booking.ts
/**
 * Email báo đơn mới cho đội bay Mebayluon.
 *
 * Dựng theo đúng bố cục email nội bộ của paraglidingsapa.com (bản Nuxt,
 * server/utils/emailer.ts → formatAdminEmailHtml): dải xanh + mã đặt chỗ chữ
 * monospace cỡ lớn, hai ô số liệu ngày giờ / số khách, ô ĐIỀU XE tô vàng khi
 * cần đón và tô xanh khi khách tự tới, các mục ngăn bằng tiêu đề in hoa gạch
 * chân, số lượng và cân nặng tô đỏ.
 *
 * Lý do bám theo bản Sapa: hai bên cùng một đội vận hành, email nội bộ đọc
 * trên điện thoại giữa lúc đang ở điểm bay — quen mắt một bố cục thì đọc
 * nhanh hơn, ít đọc sót.
 *
 * Luôn tiếng Việt, kể cả khi khách đặt bằng ngôn ngữ khác.
 */

const C = {
  ink: "#111827",
  soft: "#6B7280",
  line: "#E5E7EB",
  blue: "#0B6FC4",
  red: "#DC2626",
  amberBg: "#FFFBEB",
  amberLine: "#FDE68A",
  greenBg: "#F0FDF4",
  greenLine: "#BBF7D0",
  grayBg: "#F9FAFB",
};

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const vnd = (n?: number) =>
  typeof n === "number" ? `${Math.round(n).toLocaleString("vi-VN")} đ` : "—";

/** Tên điểm bay dạng ngắn — tên chuẩn trong data/spots.json quá dài. */
const SHORT_LOCATION: Record<string, string> = {
  khau_pha: "Đèo Khau Phạ",
  ha_noi: "Hà Nội",
  sapa: "Sapa",
  da_nang: "Đà Nẵng",
  tram_tau: "Phình Hồ",
  quan_ba: "Hà Giang",
};

const HOLIDAY_LABEL: Record<string, string> = {
  weekday: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ",
};

const LANG_LABEL: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  fr: "Tiếng Pháp",
  ru: "Tiếng Nga",
  zh: "Tiếng Trung",
  hi: "Tiếng Hindi",
};

/** "2026-09-15" -> "15/09/2026" */
function vnDate(raw?: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Thời điểm đặt, theo giờ Việt Nam. */
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

/** Gói bay chỉ có hai loại; nhãn đầy đủ quá dài cho email nội bộ. */
function shortPackage(packageKey?: string, fallback?: string): string {
  const key = String(packageKey || "");
  if (key.endsWith("_pkg_2")) return "Cuối tuần & Lễ";
  if (key.endsWith("_pkg_1")) return "Ngày thường";
  return String(fallback || "").trim();
}

/** Cắt phần giải thích trong ngoặc ở cuối tên dịch vụ. */
function shortLabel(raw?: unknown): string {
  const label = String(raw ?? "").trim();
  if (!label.endsWith(")")) return label;
  const open = label.lastIndexOf("(");
  if (open <= 0) return label;
  const kept = label.slice(0, open).trim();
  return kept.length >= 10 ? kept : label;
}

/** Biểu tượng gợi ý cho vài dịch vụ hay gặp, để mắt bắt nhanh. */
function serviceIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("flycam") || l.includes("drone")) return "🚁";
  if (l.includes("360")) return "📷";
  if (l.includes("cờ")) return "🚩";
  if (l.includes("xe") || l.includes("đón")) return "🚐";
  return "•";
}

export type AdminBookingInput = {
  bookingId?: string;
  lang?: string;
  location?: string;
  locationName?: string;
  flightTypeLabel?: string;
  packageKey?: string;
  packageLabel?: string;
  holidayType?: string;
  dateISO?: string;
  timeSlot?: string;
  guestsCount?: number;
  createdAt?: string;
  name?: string;
  contactName?: string;
  contact?: {
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };
  guests?: Array<{
    fullName?: string;
    dob?: string;
    gender?: string;
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;
  selectedServices?: Array<{ key?: string; label?: string; qty?: number }>;
  price?: {
    basePerPerson?: number;
    perPerson?: number;
    discountPerPerson?: number;
    addonsQty?: Record<string, number>;
    addonsUnitPrice?: Record<string, number>;
    addonsTotal?: Record<string, number>;
    servicesBreakdown?: Array<{
      key?: string;
      label?: string;
      detail?: string;
      lineTotal?: number;
    }>;
    total?: number;
  };
};

export function adminEmailSubject(b: AdminBookingInput): string {
  const who = b.contactName || b.name || b.guests?.[0]?.fullName || "—";
  return `NEW BOOKING - ${b.bookingId || "—"} - ${who}`;
}

export function adminEmailHtml(b: AdminBookingInput): string {
  const pax =
    Number(b.guestsCount) > 0 ? Number(b.guestsCount) : b.guests?.length || 1;
  const c = b.contact || {};
  const locationName =
    SHORT_LOCATION[String(b.location || "")] || b.locationName || "—";

  const section = (text: string) =>
    `<tr><td style="padding:18px 0 6px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${C.blue};border-bottom:2px solid ${C.line};padding-bottom:5px;">${esc(text)}</div>
    </td></tr>`;

  const statCell = (label: string, value: string, accent = C.ink) =>
    `<td width="50%" valign="top" style="padding:0 6px;">
      <div style="background:${C.grayBg};border-radius:8px;padding:12px 14px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.soft};">${esc(label)}</div>
        <div style="margin-top:3px;font-size:18px;font-weight:800;color:${accent};">${value}</div>
      </div>
    </td>`;

  /* ---------- điều xe: việc PHẢI làm nên tô nổi ---------- */
  const pickupBox = c.pickupLocation
    ? `<div style="background:${C.amberBg};border:1px solid ${C.amberLine};border-radius:8px;padding:12px 14px;">
         <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#92400E;">🚐 Cần đón <span style="color:${C.red};font-size:13px;">x${pax}</span></div>
         <div style="margin-top:3px;font-size:15px;font-weight:700;color:${C.ink};">${esc(c.pickupLocation)}</div>
       </div>`
    : `<div style="background:${C.greenBg};border:1px solid ${C.greenLine};border-radius:8px;padding:12px 14px;">
         <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#166534;">🚐 Đón</div>
         <div style="margin-top:3px;font-size:15px;font-weight:700;color:${C.ink};">Không — khách tự tới ${esc(
           b.location === "ha_noi" ? "điểm bay Đồi Bù | Viên Nam" : "điểm bay",
         )}</div>
       </div>`;

  /* ---------- dịch vụ thêm ---------- */
  const extras: string[] = [];

  for (const row of b.selectedServices || []) {
    const label = shortLabel(row?.label || row?.key);
    if (!label) continue;
    // Bỏ dịch vụ đón — đã có ô riêng phía trên, nhắc lại chỉ tốn chỗ.
    if (/đón|xe trung chuyển|shuttle|pickup/i.test(label)) continue;
    const qty = Number(row?.qty || 0);
    const tag = qty > 1 ? ` <b style="color:${C.red};">x${qty}</b>` : "";
    extras.push(`${serviceIcon(label)} ${esc(label)}${tag}`);
  }

  const ADDONS: Array<[string, string, string]> = [
    ["flycam", "🚁", "Quay flycam"],
    ["camera360", "📷", "Camera 360°"],
  ];
  for (const [key, icon, name] of ADDONS) {
    const qty = Number(b.price?.addonsQty?.[key] || 0);
    if (qty > 0) {
      extras.push(`${icon} ${name} <b style="color:${C.red};">x${qty}</b>`);
    }
  }

  const extrasHtml = extras.length
    ? `<div style="background:${C.grayBg};border-radius:8px;padding:10px 14px;font-size:15px;color:${C.ink};line-height:1.9;">${extras.join("<br/>")}</div>`
    : `<div style="font-size:14px;color:${C.soft};">Không có</div>`;

  /* ---------- khách bay: cân nặng tô đỏ vì phi công cần nhất ---------- */
  const passengersHtml = b.guests?.length
    ? b.guests
        .map((p, i) => {
          const meta = [p.dob, p.gender, p.nationality, p.idNumber]
            .filter(Boolean)
            .map((x) => esc(x))
            .join(" · ");
          return `<tr>
            <td width="20" valign="top" style="padding:6px 0;font-size:14px;font-weight:800;color:${C.blue};">${i + 1}.</td>
            <td style="padding:6px 0;font-size:14px;color:${C.ink};border-bottom:1px solid ${C.line};">
              <b>${esc(p.fullName || "—")}</b>
              ${meta ? `<span style="color:${C.soft};"> · ${meta}</span>` : ""}
              ${typeof p.weightKg === "number" ? ` · <b style="color:${C.red};">${p.weightKg}kg</b>` : ""}
            </td>
          </tr>`;
        })
        .join("")
    : `<tr><td style="font-size:14px;color:${C.soft};">Không có danh sách khách bay</td></tr>`;

  /* ---------- chi tiết giá ---------- */
  type Line = { label: string; detail: string; amount: number; discount?: boolean };
  const lines: Line[] = [];

  const base = Number(b.price?.basePerPerson ?? b.price?.perPerson ?? 0);
  if (base > 0) {
    lines.push({
      label: "<b>Giá gói bay</b>",
      detail: `${vnd(base)} × ${pax} khách`,
      amount: base * pax,
    });
  }

  const discountLines: Line[] = [];
  for (const row of b.price?.servicesBreakdown || []) {
    const amount = Number(row?.lineTotal || 0);
    if (!amount) continue;
    const line: Line = {
      label: shortLabel(row?.label || row?.key),
      detail: String(row?.detail || ""),
      amount,
      discount: amount < 0,
    };
    if (amount < 0) discountLines.push(line);
    else lines.push(line);
  }

  for (const [key, , name] of ADDONS) {
    const qty = Number(b.price?.addonsQty?.[key] || 0);
    if (qty <= 0) continue;
    const unit = Number(b.price?.addonsUnitPrice?.[key] || 0);
    const total = Number(b.price?.addonsTotal?.[key] || unit * qty);
    if (!total) continue;
    lines.push({
      label: `${name} <b style="color:${C.red};">x${qty}</b>`,
      detail: `${vnd(unit)} × ${qty}`,
      amount: total,
    });
  }

  lines.push(...discountLines);

  const perPax = Number(b.price?.discountPerPerson || 0);
  if (perPax > 0) {
    lines.push({
      label: "<b>Giảm giá nhóm</b>",
      detail: `${vnd(perPax)} × ${pax} khách`,
      amount: -perPax * pax,
      discount: true,
    });
  }

  const priceRows = lines
    .map(
      (l) => `<tr>
        <td style="padding:5px 0;font-size:14px;color:${l.discount ? "#16A34A" : C.ink};border-bottom:1px solid ${C.line};">
          ${l.label}
          ${l.detail ? `<br/><span style="font-size:12px;color:${C.soft};">${esc(l.detail)}</span>` : ""}
        </td>
        <td style="padding:5px 0;font-size:14px;font-weight:700;text-align:right;white-space:nowrap;color:${l.discount ? "#16A34A" : C.ink};border-bottom:1px solid ${C.line};">${vnd(l.amount)}</td>
      </tr>`,
    )
    .join("");

  /* ---------- HTML ---------- */
  const flightLine = [
    b.flightTypeLabel,
    shortPackage(b.packageKey, b.packageLabel),
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:16px 10px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;">

  <tr><td style="background:${C.blue};padding:16px 20px;color:#ffffff;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;opacity:.85;">ĐƠN ĐẶT CHỖ MỚI</div>
    <div style="margin-top:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;font-weight:800;letter-spacing:1px;">${esc(b.bookingId || "—")}</div>
    <div style="margin-top:4px;font-size:13px;opacity:.9;">${esc(locationName)}${flightLine ? ` — ${esc(flightLine)}` : ""}</div>
  </td></tr>

  <tr><td style="padding:16px 14px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          ${statCell(
            "Ngày giờ bay",
            `${esc(vnDate(b.dateISO))}${b.timeSlot ? ` · ${esc(b.timeSlot)}` : ""}${
              b.holidayType && b.holidayType !== "weekday"
                ? ` <span style="font-size:12px;">(${esc(HOLIDAY_LABEL[String(b.holidayType)] || b.holidayType)})</span>`
                : ""
            }`,
            C.red,
          )}
          ${statCell("Số khách", `${pax} người`)}
        </tr></table>
      </td></tr>

      <tr><td style="padding:12px 6px 0;">${pickupBox}</td></tr>

      ${section("Liên hệ")}
      <tr><td style="padding:0 6px;font-size:15px;color:${C.ink};line-height:1.7;">
        <b>${esc(b.contactName || b.name || b.guests?.[0]?.fullName || "—")}</b>
        <span style="color:${C.soft};"> - </span>
        <a href="tel:${esc(String(c.phone || "").replace(/\s+/g, ""))}" style="color:${C.blue};text-decoration:none;font-weight:700;">${esc(c.phone || "—")}</a>
        <span style="color:${C.soft};"> - </span>
        <a href="mailto:${esc(c.email || "")}" style="color:${C.blue};text-decoration:none;">${esc(c.email || "—")}</a>
        <div style="margin-top:4px;font-size:12px;color:${C.soft};">Đặt lúc ${esc(vnDateTime(b.createdAt))} · Khách đặt bằng ${esc(LANG_LABEL[String(b.lang || "vi")] || "Tiếng Việt")}</div>
      </td></tr>

      ${section("Dịch vụ thêm")}
      <tr><td style="padding:0 6px;">${extrasHtml}</td></tr>

      ${section(`Danh sách khách bay (${pax})`)}
      <tr><td style="padding:0 6px;">
        <table width="100%" cellpadding="0" cellspacing="0">${passengersHtml}</table>
      </td></tr>

      ${section("Chi tiết giá")}
      <tr><td style="padding:0 6px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${priceRows}
          <tr>
            <td style="padding:8px 0 0;font-size:15px;font-weight:800;color:${C.ink};border-top:2px solid ${C.line};">TỔNG THU</td>
            <td style="padding:8px 0 0;font-size:20px;font-weight:800;text-align:right;color:${C.red};border-top:2px solid ${C.line};">${vnd(b.price?.total)}</td>
          </tr>
        </table>
      </td></tr>

      ${
        c.specialRequest
          ? `${section("⚠️ Yêu cầu đặc biệt")}
             <tr><td style="padding:0 6px;">
               <div style="background:${C.amberBg};border-left:4px solid ${C.red};border-radius:0 8px 8px 0;padding:12px 14px;font-size:15px;font-weight:600;color:${C.ink};line-height:1.6;">${esc(c.specialRequest)}</div>
             </td></tr>`
          : `${section("Yêu cầu đặc biệt")}
             <tr><td style="padding:0 6px;font-size:14px;color:${C.soft};">Không có</td></tr>`
      }

    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
