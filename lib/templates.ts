// lib/templates.ts

type Addons = { pickup?: boolean; flycam?: boolean; camera360?: boolean };
type Contact = { phone?: string; email?: string; pickupLocation?: string; specialRequest?: string };
type Guest = {
  fullName?: string;
  dob?: string;
  gender?: string;
  idNumber?: string;
  weightKg?: number;
  nationality?: string;
};
type AddonsPriceMap = { pickup?: number; flycam?: number; camera360?: number };
type AddonsQtyMap = { pickup?: number; flycam?: number; camera360?: number };
type ServiceMap = Record<
  string,
  {
    selected?: boolean;
    qty?: number;
    inputText?: string;
  }
>;
type SelectedServiceLine = {
  key?: string;
  label?: string;
  detail?: string;
  amountText?: string;
  lineTotal?: number;
};
type Price = {
  currency?: string;
  perPerson?: number;
  basePerPerson?: number;
  discountPerPerson?: number;
  addonsUnitPrice?: AddonsPriceMap;
  addonsQty?: AddonsQtyMap;
  addonsTotal?: AddonsPriceMap;
  servicesBreakdown?: SelectedServiceLine[];
  servicesTotal?: number;
  total?: number;
};

import {
  customerEmailHtml,
  customerEmailSubject,
} from "@/lib/email/customer-booking";
import { shortServiceLabel } from "@/lib/booking/service-label";

type AddonKeyLike = "pickup" | "flycam" | "camera360";

export type TelegramBookingPayload = {
  location?: string;
  locationName?: string;
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: Contact;
  guests?: Guest[];
  addons?: Addons;
  price?: Price;
  createdAt?: string;
  bookingId?: string;
  serviceName?: string;
  services?: ServiceMap;
  selectedServices?: SelectedServiceLine[];
};

const escapeHtml = (s?: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatVND = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";



/** Vài tên dịch vụ dài, rút cho gọn dòng. */
const SHORT_SERVICE_VI: Array<[RegExp, string]> = [
  [/cờ đỏ/i, "Dù cờ đỏ"],
  [/giảm combo ảnh/i, "Giảm combo ảnh"],
];

function shortServiceName(label: string): string {
  const value = String(label || "").trim();
  for (const [pattern, short] of SHORT_SERVICE_VI) {
    if (pattern.test(value)) return short;
  }
  return value;
}

function resolveServicePriceBreakdownLines(body: TelegramBookingPayload): string[] {
  const fromBreakdown = Array.isArray(body.price?.servicesBreakdown)
    ? body.price?.servicesBreakdown || []
    : [];

  if (fromBreakdown.length > 0) {
    return fromBreakdown
      .map((row) => {
        const label = shortServiceName(
          shortServiceLabel(row?.label || row?.key || ""),
        );
        if (!label) return "";

        const detail = String(row?.detail || "").trim();
        const amountText =
          typeof row?.lineTotal === "number"
            ? formatVND(row.lineTotal)
            : String(row?.amountText || "").trim();

        return detail
          ? `• ${escapeHtml(label)}: ${escapeHtml(detail)} = ${escapeHtml(amountText || "—")}`
          : `• ${escapeHtml(label)}: ${escapeHtml(amountText || "—")}`;
      })
      .filter(Boolean);
  }

  const fromSelected = Array.isArray(body.selectedServices) ? body.selectedServices : [];
  return fromSelected
    .map((row) => {
      const label = shortServiceName(String(row?.label || row?.key || ""));
      if (!label) return "";
      const detail = String(row?.detail || "").trim();
      const amountText = String(row?.amountText || "").trim();
      if (!amountText) return "";

      return detail
        ? `• ${escapeHtml(label)}: ${escapeHtml(detail)} = ${escapeHtml(amountText)}`
        : `• ${escapeHtml(label)}: ${escapeHtml(amountText)}`;
    })
    .filter(Boolean);
}

function telegramLikeHtmlWrapper(title: string, telegramHtmlText: string) {
  // Replace newlines with <br/> to ensure proper formatting in all email clients
  const htmlContent = telegramHtmlText.replace(/\n/g, '<br/>');
  
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:720px;margin:0 auto;padding:18px">
      <div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:18px">
        <div style="font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap">${htmlContent}</div>
      </div>
      <div style="color:#888;font-size:12px;padding:10px 2px">Email giao dịch tự động</div>
    </div>
  </body>
</html>`;
}

// ===== ADMIN: luôn tiếng Việt, đủ mọi chi tiết của vé, trình bày tối giản =====

/**
 * Tên điểm bay dạng ngắn cho email nội bộ. Tên chuẩn trong data/spots.json
 * dài dòng ("Yên Bái (Đèo Khau Phạ – Mù Cang Chải)") — người trong nhà chỉ
 * cần biết đó là điểm nào.
 */
const SHORT_LOCATION_VI: Record<string, string> = {
  khau_pha: "Đèo Khau Phạ",
  ha_noi: "Hà Nội",
  sapa: "Sapa",
  da_nang: "Đà Nẵng",
  tram_tau: "Phình Hồ",
  quan_ba: "Hà Giang",
};

/** Gói bay chỉ có hai loại; nhãn đầy đủ quá dài cho email nội bộ. */
function shortPackageLabel(packageKey?: string, fallback?: string): string {
  const key = String(packageKey || "");
  if (key.endsWith("_pkg_2")) return "Cuối tuần & Lễ";
  if (key.endsWith("_pkg_1")) return "Ngày thường";
  return String(fallback || "").trim();
}


const HOLIDAY_LABEL_VI: Record<string, string> = {
  weekday: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ",
};

const LANG_LABEL_VI: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  fr: "Tiếng Pháp",
  ru: "Tiếng Nga",
  zh: "Tiếng Trung",
  hi: "Tiếng Hindi",
};

/** "2026-09-15" -> "15/09/2026" */
function toVnDate(raw?: string): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Thời điểm đặt, theo giờ Việt Nam. */
function toVnDateTime(raw?: string): string {
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

/**
 * Nội dung email báo đơn mới cho đội bay.
 *
 * Khác email khách ở ba điểm: luôn tiếng Việt dù khách đặt bằng ngôn ngữ nào,
 * có đủ mọi trường của vé (kể cả loại ngày, ngôn ngữ khách dùng, giờ đặt), và
 * trình bày dạng text thuần cho dễ đọc nhanh trên điện thoại — người trong
 * nhà không cần email đẹp, cần đọc được trong 5 giây.
 */
function buildTelegramSections(body: TelegramBookingPayload) {
  const c = body.contact || {};
  const b = body as any;

  const guestsCount =
    Number.isFinite(body.guestsCount) && Number(body.guestsCount) > 0
      ? Number(body.guestsCount)
      : body.guests?.length || 1;

  const guestLines =
    (body.guests || [])
      .map((g, i) => {
        const attrs = [
          g.dob,
          g.gender,
          typeof g.weightKg === "number" ? `${g.weightKg} kg` : "",
          g.nationality,
          g.idNumber,
        ]
          .filter(Boolean)
          .map((x) => escapeHtml(String(x)));
        return `${i + 1}. ${escapeHtml(g.fullName || "—")}${attrs.length ? ` | ${attrs.join(" · ")}` : ""}`;
      })
      .join("\n") || "—";

  const locationName = escapeHtml(
    SHORT_LOCATION_VI[String(body.location || "")] ||
      (body.locationName || "").trim() ||
      body.location ||
      "—",
  );
  const basePerPerson = Number(
    body.price?.basePerPerson || body.price?.perPerson || 0,
  );
  const servicePriceBreakdownLines = resolveServicePriceBreakdownLines(body);

  const priceAddons = body.price?.addonsUnitPrice || {};
  const addonTotal = body.price?.addonsTotal || {};
  const ADDONS: Array<[AddonKeyLike, string]> = [
    ["pickup", "Đưa đón"],
    ["flycam", "Flycam"],
    ["camera360", "Camera 360"],
  ];

  /**
   * Flycam và camera 360 có thể là DỊCH VỤ của điểm bay (khau_pha_flycam...)
   * hoặc là ADDON dùng chung, tuỳ cấu hình từng điểm. Trước đây mục "Dịch vụ
   * đã chọn" chỉ đọc nhánh dịch vụ còn mục "Chi tiết giá" đọc cả hai, nên hai
   * mục nói khác nhau. Nay gộp chung một danh sách, có kèm số lượng.
   */
  const addonPriceLines: string[] = [];
  const addonServiceLines: string[] = [];

  for (const [key, name] of ADDONS) {
    const qty = Number(body.price?.addonsQty?.[key] || 0);
    if (qty <= 0) continue;

    addonServiceLines.push(`• ${name} ×${qty}`);

    const unit = Number((priceAddons as any)?.[key] || 0);
    const tot = Number((addonTotal as any)?.[key] || unit * qty);
    if (tot) {
      addonPriceLines.push(`• ${name}: ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
    }
  }

  /**
   * Dòng dịch vụ dạng "• Tên ×2" — bỏ dấu "|" ngăn cách của bản dùng chung
   * và rút gọn vài tên dài.
   */
  const ownServiceLines = (
    Array.isArray(body.selectedServices) ? body.selectedServices : []
  )
    .map((row: any) => {
      // Cắt phần giải thích trong ngoặc rồi mới rút gọn tên — mục "Chi tiết
      // giá" đã cắt sẵn, hai mục phải nói giống nhau.
      const label = shortServiceName(
        shortServiceLabel(row?.label || row?.key || ""),
      );
      if (!label) return "";
      const qty = Number(row?.qty || 0);
      const detail = String(row?.detail || "").trim();
      const suffix = qty > 1 ? ` ×${qty}` : detail.startsWith("×") ? ` ${detail}` : "";
      return `• ${escapeHtml(label)}${escapeHtml(suffix)}`;
    })
    .filter(Boolean);

  const selectedServiceLines = [...ownServiceLines, ...addonServiceLines];

  /**
   * Dòng đưa đón luôn hiện, kể cả khi khách không đặt — người trực điện thoại
   * cần biết ngay là phải sắp xe hay khách tự tới.
   */
  const pickupLine = c.pickupLocation
    ? `Đưa đón: ${escapeHtml(c.pickupLocation)}`
    : `Đưa đón: Không, ${body.location === "ha_noi" ? "khách tự tới điểm bay Đồi Bù | Viên Nam" : "khách tự tới điểm bay"}`;

  /**
   * Dựng theo KHỐI thay vì một mảng dòng phẳng.
   *
   * Bản cũ chèn chuỗi rỗng làm dòng trống ngăn cách rồi lại `.filter(Boolean)`
   * ở cuối — chính bộ lọc đó xoá luôn các dòng trống, nên khoảng cách giữa
   * các mục hoàn toàn tuỳ thuộc việc dòng nào rỗng dòng nào không, chỗ thì
   * dính liền chỗ thì hở. Nay mỗi khối tự lọc dòng rỗng bên trong, rồi các
   * khối nối với nhau bằng đúng một dòng trống.
   */
  const blocks: string[][] = [
    [
      `🔔 ĐƠN ĐẶT BAY MỚI — ${escapeHtml(body.bookingId || "—")}`,
      `Đặt lúc ${toVnDateTime(body.createdAt)} · Khách đặt bằng ${LANG_LABEL_VI[String(b.lang || "vi")] || "Tiếng Việt"}`,
    ],
    [
      `── CHUYẾN BAY ──`,
      `Điểm bay: ${locationName}`,
      `Ngày & giờ: ${toVnDate(body.dateISO)}${body.timeSlot ? ` · ${escapeHtml(body.timeSlot)}` : ""}${b.holidayType ? ` (${HOLIDAY_LABEL_VI[String(b.holidayType)] || b.holidayType})` : ""}`,
      b.flightTypeLabel ? `Loại bay: ${escapeHtml(String(b.flightTypeLabel))}` : "",
      (() => {
        const pkg = shortPackageLabel(b.packageKey, b.packageLabel);
        return pkg ? `Gói bay: ${escapeHtml(pkg)}` : "";
      })(),
      `Số khách: ${guestsCount}`,
    ],
    [
      `── LIÊN HỆ ──`,
      `Tên: ${escapeHtml(b.contactName || b.name || (c as any).contactName || (c as any).fullName || body.guests?.[0]?.fullName || "—")}`,
      `Điện thoại: ${escapeHtml(c.phone || "—")}`,
      `Email: ${escapeHtml(c.email || "—")}`,
      pickupLine,
    ],
    [`── KHÁCH BAY ──`, guestLines],
    [
      `── DỊCH VỤ ĐÃ CHỌN ──`,
      ...(selectedServiceLines.length ? selectedServiceLines : ["Không có"]),
    ],
    [
      `── CHI TIẾT GIÁ ──`,
      `• Giá bay cơ bản: ${formatVND(basePerPerson)} × ${guestsCount} = ${formatVND(basePerPerson * guestsCount)}`,
      // Khoản thu trước, khoản giảm sau — dòng giảm nằm lẫn giữa các dịch vụ
      // thì nhìn như đang giảm cho thứ chưa liệt kê.
      ...servicePriceBreakdownLines.filter((line) => !line.includes(": -")),
      ...addonPriceLines,
      ...servicePriceBreakdownLines.filter((line) => line.includes(": -")),
      body.price?.discountPerPerson
        ? `• Giảm giá nhóm: -${formatVND(body.price.discountPerPerson)} × ${guestsCount} = -${formatVND(body.price.discountPerPerson * guestsCount)}`
        : "",
      `TỔNG CỘNG: ${formatVND(body.price?.total)}`,
    ],
    [
      `── YÊU CẦU ĐẶC BIỆT ──`,
      escapeHtml(c.specialRequest || "Không có"),
    ],
  ];

  return blocks
    .map((lines) => lines.map((line) => line.trim()).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}



/**
 * Email cho khách: chuyển sang lib/email/customer-booking.ts — bản mới dịch
 * theo ngôn ngữ khách đặt, lấy danh sách "đã bao gồm" từ đúng điểm bay và có
 * thêm điểm hẹn / yêu cầu đặc biệt.
 */
export function formatCustomerEmailHtml(payload: TelegramBookingPayload) {
  return customerEmailHtml(payload as any);
}

export function formatCustomerEmailSubject(payload: TelegramBookingPayload) {
  return customerEmailSubject(payload as any);
}

export function formatAdminEmailHtml(payload: TelegramBookingPayload) {
  const adminText = buildTelegramSections(payload);
  const subjectId = payload.bookingId || payload.locationName || payload.location || "Booking";
  return telegramLikeHtmlWrapper(`Đơn đặt bay mới - ${subjectId}`, adminText);
}