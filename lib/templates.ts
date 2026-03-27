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
type Price = {
  currency?: string;
  perPerson?: number;
  basePerPerson?: number;
  discountPerPerson?: number;
  addonsUnitPrice?: Record<string, number>;
  addonsQty?: Record<string, number>;
  addonsTotal?: Record<string, number>;
  total?: number;
};

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

function createdAtFallback() {
  return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function telegramLikeHtmlWrapper(title: string, telegramHtmlText: string) {
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
        <div style="font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap">${telegramHtmlText}</div>
      </div>
      <div style="color:#888;font-size:12px;padding:10px 2px">Email giao dịch tự động</div>
    </div>
  </body>
</html>`;
}

// ===== ADMIN: giữ nguyên tiếng Việt - FORMAT ĐẦY ĐỦ =====
function buildTelegramSections(body: TelegramBookingPayload) {
  const c = body.contact || {};

  const guestsCount =
    Number.isFinite(body.guestsCount) && Number(body.guestsCount) > 0
      ? Number(body.guestsCount)
      : (body.guests?.length || 1);

  const guestLines =
    (body.guests || [])
      .map((g, i) => {
        const attrs: string[] = [];
        if (g.dob) attrs.push(`DOB: ${escapeHtml(g.dob)}`);
        if (g.gender) attrs.push(escapeHtml(g.gender));
        if (g.idNumber) attrs.push(`ID: ${escapeHtml(g.idNumber)}`);
        if (typeof g.weightKg === "number") attrs.push(`${g.weightKg}kg`);
        if (g.nationality) attrs.push(escapeHtml(g.nationality));
        return `${i + 1}. ${escapeHtml(g.fullName || "")} | ${attrs.join(" · ")}`;
      })
      .join("\n") || "—";

  const createdAt = body.createdAt || createdAtFallback();
  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");
  const basePerPerson = formatVND(body.price?.basePerPerson || body.price?.perPerson);
  const total = formatVND(body.price?.total);

  // Build addon details with pricing
  const addonLines: string[] = [];
  const priceAddons = (body.price?.addonsUnitPrice ?? {}) as Record<string, number>;
  const addonTotal = (body.price?.addonsTotal ?? {}) as Record<string, number>;

  if (body.addons?.pickup || (body.price?.addonsQty?.pickup ?? 0) > 0) {
    const qty = body.price?.addonsQty?.pickup || 1;
    const unit = priceAddons?.pickup || 100_000;
    const tot = addonTotal?.pickup || unit * qty;
    addonLines.push(`• Đưa đón: ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  if (body.addons?.flycam || (body.price?.addonsQty?.flycam ?? 0) > 0) {
    const qty = body.price?.addonsQty?.flycam || 1;
    const unit = priceAddons?.flycam || 300_000;
    const tot = addonTotal?.flycam || unit * qty;
    addonLines.push(`• Flycam (Drone): ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  if (body.addons?.camera360 || (body.price?.addonsQty?.camera360 ?? 0) > 0) {
    const qty = body.price?.addonsQty?.camera360 || 1;
    const unit = priceAddons?.camera360 || 500_000;
    const tot = addonTotal?.camera360 || unit * qty;
    addonLines.push(`• Camera 360: ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  const sections = [
    `🔔 ĐƠN ĐẶT BAY MỚI: ${body.bookingId || "—"}`,
    ``,
    `🆔 DỊCH VỤ & NGÀY GIỜ`,
    `${escapeHtml(body.serviceName || "Dù lượn")} | ${escapeHtml(body.dateISO || "—")} ${body.timeSlot ? `@ ${body.timeSlot}` : ""}`,
    ``,
    `📍 ĐỊA ĐIỂM & SỐ LƯỢNG`,
    `Điểm bay: ${locationName}`,
    `Số khách: ${guestsCount} người`,
    ``,
    `👤 THÔNG TIN LIÊN HỆ`,
    `Điện thoại: ${escapeHtml(c.phone || "—")}`,
    `Email: ${escapeHtml(c.email || "—")}`,
    c.pickupLocation ? `Địa điểm đón: ${escapeHtml(c.pickupLocation)}` : "",
    ``,
    `👥 THÔNG TIN KHÁCH HÀNG`,
    guestLines,
    ``,
    `💰 CHI TIẾT GIÁ`,
    `Giá bay cơ bản: ${basePerPerson}/người × ${guestsCount} = ${formatVND((body.price?.basePerPerson || body.price?.perPerson || 0) * guestsCount)}`,
    ...addonLines,
    body.price?.discountPerPerson ? `Giảm giá nhóm: -${formatVND(body.price.discountPerPerson)}/người × ${guestsCount} = -${formatVND(body.price.discountPerPerson * guestsCount)}` : "",
    ``,
    `📌 GHI CHÚ/YÊU CẦU ĐẶC BIỆT`,
    `${escapeHtml(c.specialRequest || "Không có")}`,
    ``,
    `═══════════════════`,
    `TỔNG CỘNG: ${total}`,
    `═══════════════════`,
  ].filter(Boolean);

  return sections.join("\n");
}

// ===== CUSTOMER: tiếng Anh - FORMAT ĐẦY ĐỦ VỚI CHI TIẾT DỰC VỤ =====
function buildCustomerSectionsEn(body: TelegramBookingPayload) {
  const c = body.contact || {};

  const guestsCount =
    Number.isFinite(body.guestsCount) && Number(body.guestsCount) > 0
      ? Number(body.guestsCount)
      : (body.guests?.length || 1);

  const guestLines =
    (body.guests || [])
      .map((g, i) => {
        const attrs: string[] = [];
        if (g.dob) attrs.push(`DOB: ${escapeHtml(g.dob)}`);
        if (g.gender) attrs.push(escapeHtml(g.gender));
        if (g.idNumber) attrs.push(`ID: ${escapeHtml(g.idNumber)}`);
        if (typeof g.weightKg === "number") attrs.push(`${g.weightKg}kg`);
        if (g.nationality) attrs.push(escapeHtml(g.nationality));
        return `${i + 1}. ${escapeHtml(g.fullName || "")} | ${attrs.join(" · ")}`;
      })
      .join("\n") || "—";

  const createdAt = body.createdAt || createdAtFallback();
  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");
  const basePerPerson = formatVND(body.price?.basePerPerson || body.price?.perPerson);
  const total = formatVND(body.price?.total);

  // Build addon details with pricing
  const addonLines: string[] = [];
  const priceAddons = (body.price?.addonsUnitPrice ?? {}) as Record<string, number>;
  const addonTotal = (body.price?.addonsTotal ?? {}) as Record<string, number>;

  if (body.addons?.pickup || (body.price?.addonsQty?.pickup ?? 0) > 0) {
    const qty = body.price?.addonsQty?.pickup || 1;
    const unit = priceAddons?.pickup || 100_000;
    const tot = addonTotal?.pickup || unit * qty;
    addonLines.push(`  • Pickup Service: ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  if (body.addons?.flycam || (body.price?.addonsQty?.flycam ?? 0) > 0) {
    const qty = body.price?.addonsQty?.flycam || 1;
    const unit = priceAddons?.flycam || 300_000;
    const tot = addonTotal?.flycam || unit * qty;
    addonLines.push(`  • Flycam (Drone): ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  if (body.addons?.camera360 || (body.price?.addonsQty?.camera360 ?? 0) > 0) {
    const qty = body.price?.addonsQty?.camera360 || 1;
    const unit = priceAddons?.camera360 || 500_000;
    const tot = addonTotal?.camera360 || unit * qty;
    addonLines.push(`  • 360° Camera: ${formatVND(unit)} × ${qty} = ${formatVND(tot)}`);
  }

  const sections = [
    `✈️ BOOKING CONFIRMATION`,
    ``,
    body.bookingId ? `Booking ID: ${escapeHtml(body.bookingId)}` : "",
    `Service: ${escapeHtml(body.serviceName || "Paragliding")}`,
    ``,
    `─────────────────────────────────`,
    `BOOKING DETAILS`,
    `─────────────────────────────────`,
    `Location: ${locationName}`,
    `Date: ${escapeHtml(body.dateISO || "—")}`,
    `Time: ${escapeHtml(body.timeSlot || "—")}`,
    `Number of Guests: ${guestsCount}`,
    ``,
    `─────────────────────────────────`,
    `CONTACT INFORMATION`,
    `─────────────────────────────────`,
    `Phone: ${escapeHtml(c.phone || "—")}`,
    `Email: ${escapeHtml(c.email || "—")}`,
    c.pickupLocation ? `Pickup Location: ${escapeHtml(c.pickupLocation)}` : "",
    c.specialRequest ? `Special Requests: ${escapeHtml(c.specialRequest)}` : "",
    ``,
    `─────────────────────────────────`,
    `PASSENGER LIST`,
    `─────────────────────────────────`,
    guestLines,
    ``,
    `─────────────────────────────────`,
    `PRICE BREAKDOWN`,
    `─────────────────────────────────`,
    `Flight: ${basePerPerson}/person × ${guestsCount} = ${formatVND((body.price?.basePerPerson || body.price?.perPerson || 0) * guestsCount)}`,
    ...addonLines,
    body.price?.discountPerPerson ? `Group Discount: -${formatVND(body.price.discountPerPerson)}/person × ${guestsCount} = -${formatVND(body.price.discountPerPerson * guestsCount)}` : "",
    ``,
    `TOTAL: ${total}`,
    ``,
    `─────────────────────────────────`,
    `WHAT'S INCLUDED`,
    `─────────────────────────────────`,
    `• Flight time: 8-15 minutes (weather dependent)`,
    `• GoPro photo & video`,
    `• Welcome drink (coffee/tea)`,
    `• Flight insurance`,
    `• Certificate of flight`,
    c.pickupLocation ? `• Pickup/Drop-off service` : "",
    ``,
    `─────────────────────────────────`,
    `NEXT STEPS`,
    `─────────────────────────────────`,
    `1. We will confirm via phone/WhatsApp within 24 hours`,
    `2. Arrive 15-20 minutes early for safety briefing`,
    `3. Bring ID/Passport and the booking confirmation`,
    `4. Free cancellation up to 48 hours before the flight`,
    ``,
    `CONTACT US:`,
    `📞 +84 964.073.555 | +84 970.2812`,
    `💬 WhatsApp | Zalo | Telegram`,
    `🌐 mebayluon.com`,
    ``,
    `Safe flights! 🪂`,
  ].filter(Boolean);

  return sections.join("\n");
}

export function formatCustomerEmailHtml(payload: TelegramBookingPayload) {
  const customerText = buildCustomerSectionsEn(payload);
  const subjectId = payload.bookingId || payload.locationName || payload.location || "Booking";
  return telegramLikeHtmlWrapper(`Booking Confirmation - ${subjectId}`, customerText);
}

export function formatAdminEmailHtml(payload: TelegramBookingPayload) {
  const adminText = buildTelegramSections(payload);
  const subjectId = payload.bookingId || payload.locationName || payload.location || "Booking";
  return telegramLikeHtmlWrapper(`Đơn đặt bay mới - ${subjectId}`, adminText);
}