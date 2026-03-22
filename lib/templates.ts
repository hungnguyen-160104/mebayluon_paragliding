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
type Price = { currency?: string; perPerson?: number; total?: number };

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

// ===== ADMIN: giữ nguyên tiếng Việt =====
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
        if (typeof g.weightKg === "number") attrs.push(`Wt: ${g.weightKg}kg`);
        if (g.nationality) attrs.push(`QT: ${escapeHtml(g.nationality)}`);
        const details = attrs.length ? ` (${attrs.join(" · ")})` : "";
        return `${i + 1}. ${escapeHtml(g.fullName || "")}${details}`;
      })
      .join("\n") || "—";

  const addonLines: string[] = [];
  if (body.addons?.flycam) addonLines.push("• Flycam");
  if (body.addons?.camera360) addonLines.push("• Camera 360");
  if (body.addons?.pickup) addonLines.push("• Đón trả");

  const createdAt = body.createdAt || createdAtFallback();

  const locationKey = escapeHtml((body.location || "").trim());
  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");

  const perPerson = formatVND(body.price?.perPerson);
  const total = formatVND(body.price?.total);

  const extraTop: string[] = [];
  if (body.bookingId) extraTop.push(`🆔 <b>BookingId:</b> ${escapeHtml(body.bookingId)}`);
  if (body.serviceName) extraTop.push(`🧾 <b>Dịch vụ:</b> ${escapeHtml(body.serviceName)}`);

  const sections = [
    `🛒 <b>ĐƠN ĐẶT BAY MỚI</b>`,
    ...extraTop,
    `📍 <b>Điểm:</b> ${locationName}${locationKey ? ` (${locationKey})` : ""}`,
    `📅 <b>Thời gian:</b> ${escapeHtml(body.dateISO || "")} ${escapeHtml(body.timeSlot || "")}`,
    `👥 <b>Số khách:</b> ${guestsCount}`,
    ``,
    `<b>Liên hệ</b>`,
    `• 📞 ${escapeHtml(c.phone || "")} · ✉️ ${escapeHtml(c.email || "")}`,
    c.pickupLocation ? `• 🚗 Điểm đón: ${escapeHtml(c.pickupLocation)}` : "",
    c.specialRequest ? `• 📝 Y/c đặc biệt: ${escapeHtml(c.specialRequest)}` : "",
    ``,
    `<b>Chi phí</b>`,
    `• Giá/khách (sau giảm): ${perPerson}`,
    addonLines.length ? `• Phụ thu:\n${addonLines.map((l) => "   " + l).join("\n")}` : "",
    `• <b>Tổng tạm tính:</b> ${total}`,
    ``,
    `<b>Danh sách khách</b>`,
    guestLines,
    ``,
    `⏱️ ${escapeHtml(createdAt)}`,
  ].filter(Boolean);

  return sections.join("\n");
}

// ===== CUSTOMER: tiếng Anh =====
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
        if (typeof g.weightKg === "number") attrs.push(`Weight: ${g.weightKg}kg`);
        if (g.nationality) attrs.push(`Nationality: ${escapeHtml(g.nationality)}`);
        const details = attrs.length ? ` (${attrs.join(" · ")})` : "";
        return `${i + 1}. ${escapeHtml(g.fullName || "")}${details}`;
      })
      .join("\n") || "—";

  const addonLines: string[] = [];
  if (body.addons?.flycam) addonLines.push("• Flycam");
  if (body.addons?.camera360) addonLines.push("• 360 Camera");
  if (body.addons?.pickup) addonLines.push("• Pickup service");

  const createdAt = body.createdAt || createdAtFallback();

  const locationKey = escapeHtml((body.location || "").trim());
  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");

  const perPerson = formatVND(body.price?.perPerson);
  const total = formatVND(body.price?.total);

  const sections = [
    `🛒 <b>BOOKING CONFIRMATION</b>`,
    body.bookingId ? `🆔 <b>Booking ID:</b> ${escapeHtml(body.bookingId)}` : "",
    body.serviceName ? `🧾 <b>Service:</b> ${escapeHtml(body.serviceName)}` : "",
    `📍 <b>Location:</b> ${locationName}${locationKey ? ` (${locationKey})` : ""}`,
    `📅 <b>Date & Time:</b> ${escapeHtml(body.dateISO || "")} ${escapeHtml(body.timeSlot || "")}`,
    `👥 <b>Number of Guests:</b> ${guestsCount}`,
    ``,
    `<b>Contact Information</b>`,
    `• 📞 ${escapeHtml(c.phone || "")} · ✉️ ${escapeHtml(c.email || "")}`,
    c.pickupLocation ? `• 🚗 Pickup Location: ${escapeHtml(c.pickupLocation)}` : "",
    c.specialRequest ? `• 📝 Special Request: ${escapeHtml(c.specialRequest)}` : "",
    ``,
    `<b>Pricing</b>`,
    `• Price per guest: ${perPerson}`,
    addonLines.length ? `• Additional services:\n${addonLines.map((l) => "   " + l).join("\n")}` : "",
    `• <b>Estimated Total:</b> ${total}`,
    ``,
    `<b>Guest List</b>`,
    guestLines,
    ``,
    `⏱️ ${escapeHtml(createdAt)}`,
    ``,
    `Thank you for your booking.`,
    `We will contact you shortly to confirm your reservation.`,
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