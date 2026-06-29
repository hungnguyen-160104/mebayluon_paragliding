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

function splitInputEntries(raw?: string) {
  return String(raw || "")
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSelectedServiceLines(body: TelegramBookingPayload, lang: "vi" | "en"): string[] {
  const fromSelected = Array.isArray(body.selectedServices) ? body.selectedServices : [];
  if (fromSelected.length > 0) {
    return fromSelected
      .map((row) => {
        const label = String(row?.label || row?.key || "").trim();
        if (!label) return "";
        const detail = String(row?.detail || "").trim();
        const amountText = String(row?.amountText || "").trim();
        const parts = [escapeHtml(label)];
        if (detail) parts.push(escapeHtml(detail));
        if (amountText) parts.push(escapeHtml(amountText));
        return `• ${parts.join(" | ")}`;
      })
      .filter(Boolean);
  }

  const fromBreakdown = Array.isArray(body.price?.servicesBreakdown)
    ? body.price?.servicesBreakdown || []
    : [];

  if (fromBreakdown.length > 0) {
    return fromBreakdown
      .map((row) => {
        const label = String(row?.label || row?.key || "").trim();
        if (!label) return "";
        const detail = String(row?.detail || "").trim();
        const lineTotal =
          typeof row?.lineTotal === "number"
            ? formatVND(row.lineTotal)
            : String(row?.amountText || "").trim();
        const parts = [escapeHtml(label)];
        if (detail) parts.push(escapeHtml(detail));
        if (lineTotal) parts.push(escapeHtml(lineTotal));
        return `• ${parts.join(" | ")}`;
      })
      .filter(Boolean);
  }

  const services = body.services || {};
  const lines = Object.entries(services)
    .filter(([, value]) => !!value?.selected)
    .map(([key, value]) => {
      const qty = Number(value?.qty || 0);
      const inputs = splitInputEntries(value?.inputText);
      const parts: string[] = [escapeHtml(key)];

      if (qty > 0) {
        parts.push(lang === "vi" ? `SL ${qty}` : `Qty ${qty}`);
      }
      if (inputs.length > 0) {
        parts.push(escapeHtml(inputs.join(" | ")));
      }

      return `• ${parts.join(" | ")}`;
    })
    .filter(Boolean);

  return lines;
}

function resolveServicePriceBreakdownLines(body: TelegramBookingPayload): string[] {
  const fromBreakdown = Array.isArray(body.price?.servicesBreakdown)
    ? body.price?.servicesBreakdown || []
    : [];

  if (fromBreakdown.length > 0) {
    return fromBreakdown
      .map((row) => {
        const label = String(row?.label || row?.key || "").trim();
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
      const label = String(row?.label || row?.key || "").trim();
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

  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");
  const basePerPerson = formatVND(body.price?.basePerPerson || body.price?.perPerson);
  const total = formatVND(body.price?.total);
  const selectedServiceLines = resolveSelectedServiceLines(body, "vi");
  const servicePriceBreakdownLines = resolveServicePriceBreakdownLines(body);

  // Build addon details with pricing
  const addonLines: string[] = [];
  const priceAddons = body.price?.addonsUnitPrice || {};
  const addonTotal = body.price?.addonsTotal || {};

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
    `🧩 DỊCH VỤ ĐÃ CHỌN`,
    ...(selectedServiceLines.length > 0 ? selectedServiceLines : ["• Không có"]),
    ``,
    `💰 CHI TIẾT GIÁ`,
    `Giá bay cơ bản: ${basePerPerson}/người × ${guestsCount} = ${formatVND((body.price?.basePerPerson || body.price?.perPerson || 0) * guestsCount)}`,
    ...servicePriceBreakdownLines,
    ...addonLines,
    body.price?.discountPerPerson ? `Giảm giá nhóm: -${formatVND(body.price.discountPerPerson)}/người × ${guestsCount} = -${formatVND(body.price.discountPerPerson * guestsCount)}` : "",
    ``,
    `📌 GHI CHÚ/YÊU CẦU ĐẶC BIỆT`,
    `${escapeHtml(c.specialRequest || "Không có")}`,
    ``,
    `TỔNG CỘNG: ${total}`,
  ].filter(Boolean);

  return sections.join("\n");
}

function customerEmailHtmlWrapper(title: string, body: TelegramBookingPayload) {
  const c = body.contact || {};
  const guestsCount = Number.isFinite(body.guestsCount) && Number(body.guestsCount) > 0 ? Number(body.guestsCount) : (body.guests?.length || 1);
  const locationName = escapeHtml((body.locationName || "").trim() || body.location || "—");
  const basePerPerson = formatVND(body.price?.basePerPerson || body.price?.perPerson);
  const total = formatVND(body.price?.total);
  const servicePriceBreakdownLines = resolveServicePriceBreakdownLines(body);

  // Build addon details
  const addonLines: string[] = [];
  const priceAddons = body.price?.addonsUnitPrice || {};
  const addonTotal = body.price?.addonsTotal || {};
  if (body.addons?.pickup || (body.price?.addonsQty?.pickup ?? 0) > 0) {
    const qty = body.price?.addonsQty?.pickup || 1;
    const unit = priceAddons?.pickup || 100_000;
    const tot = addonTotal?.pickup || unit * qty;
    addonLines.push(`<li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555; display: flex; justify-content: space-between;"><span>Pickup Service: ${formatVND(unit)} &times; ${qty}</span> <span style="font-weight: 600; color: #111;">${formatVND(tot)}</span></li>`);
  }
  if (body.addons?.flycam || (body.price?.addonsQty?.flycam ?? 0) > 0) {
    const qty = body.price?.addonsQty?.flycam || 1;
    const unit = priceAddons?.flycam || 300_000;
    const tot = addonTotal?.flycam || unit * qty;
    addonLines.push(`<li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555; display: flex; justify-content: space-between;"><span>Flycam (Drone): ${formatVND(unit)} &times; ${qty}</span> <span style="font-weight: 600; color: #111;">${formatVND(tot)}</span></li>`);
  }
  if (body.addons?.camera360 || (body.price?.addonsQty?.camera360 ?? 0) > 0) {
    const qty = body.price?.addonsQty?.camera360 || 1;
    const unit = priceAddons?.camera360 || 500_000;
    const tot = addonTotal?.camera360 || unit * qty;
    addonLines.push(`<li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555; display: flex; justify-content: space-between;"><span>360&deg; Camera: ${formatVND(unit)} &times; ${qty}</span> <span style="font-weight: 600; color: #111;">${formatVND(tot)}</span></li>`);
  }

  const guestLines = (body.guests || []).map((g, i) => {
    const attrs: string[] = [];
    if (g.dob) attrs.push(`DOB: ${escapeHtml(g.dob)}`);
    if (g.gender) attrs.push(escapeHtml(g.gender));
    if (g.idNumber) attrs.push(`ID: ${escapeHtml(g.idNumber)}`);
    if (typeof g.weightKg === "number") attrs.push(`${g.weightKg}kg`);
    if (g.nationality) attrs.push(escapeHtml(g.nationality));
    return `<li style="margin-bottom: 4px; color: #555;"><strong>${i + 1}. ${escapeHtml(g.fullName || "")}</strong> ${attrs.length ? " | " + attrs.join(" &middot; ") : ""}</li>`;
  }).join("");

  const breakdownLinesHtml = servicePriceBreakdownLines.map(line => `<li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555;">${line.replace('• ', '')}</li>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    <!-- Header -->
    <div style="background-color: #0ea5e9; padding: 30px 40px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Booking Confirmation</h1>
      <p style="margin: 10px 0 0; color: #e0f2fe; font-size: 15px;">${body.bookingId ? `ID: ${escapeHtml(body.bookingId)}` : ""}</p>
    </div>

    <div style="padding: 40px;">
      <!-- Intro -->
      <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
        Dear <strong>${escapeHtml((body.guests || [])[0]?.fullName || "Customer")}</strong>,<br/>
        Thank you for choosing Mebayluon Paragliding! Your booking is confirmed.
      </p>

      <!-- Booking Summary -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 15px; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Booking Details</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 40%;">Service</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 500; text-align: right;">${escapeHtml(body.serviceName || "Paragliding")}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Location</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 500; text-align: right;">${locationName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Date &amp; Time</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 500; text-align: right;">${escapeHtml(body.dateISO || "—")} ${body.timeSlot ? `@ ${body.timeSlot}` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Guests</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 500; text-align: right;">${guestsCount}</td>
          </tr>
        </table>
      </div>

      <!-- Passengers -->
      <h3 style="font-size: 18px; color: #0f172a; margin: 0 0 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Passenger List</h3>
      <ul style="list-style: none; padding: 0; margin: 0 0 30px; font-size: 14px; line-height: 1.6;">
        ${guestLines || "<li style='color: #64748b;'>No details provided.</li>"}
      </ul>

      <!-- Pricing Breakdown -->
      <h3 style="font-size: 18px; color: #0f172a; margin: 0 0 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Price Breakdown</h3>
      <ul style="list-style: none; padding: 0; margin: 0 0 20px; font-size: 15px;">
        <li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #555; display: flex; justify-content: space-between;">
          <span>Flight: ${basePerPerson}/person &times; ${guestsCount}</span>
          <span style="font-weight: 600; color: #111;">${formatVND((body.price?.basePerPerson || body.price?.perPerson || 0) * guestsCount)}</span>
        </li>
        ${breakdownLinesHtml}
        ${addonLines.join('')}
        ${body.price?.discountPerPerson ? `<li style="padding: 8px 0; border-bottom: 1px solid #eee; color: #10b981; display: flex; justify-content: space-between;">
          <span>Group Discount: -${formatVND(body.price.discountPerPerson)}/person &times; ${guestsCount}</span>
          <span style="font-weight: 600;">-${formatVND(body.price.discountPerPerson * guestsCount)}</span>
        </li>` : ""}
      </ul>
      
      <!-- Total -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <span style="font-size: 16px; font-weight: 600; color: #166534;">TOTAL</span>
        <span style="font-size: 22px; font-weight: 700; color: #15803d;">${total}</span>
      </div>

      <!-- What's Included -->
      <h3 style="font-size: 18px; color: #0f172a; margin: 0 0 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">What's Included</h3>
      <ul style="padding-left: 20px; margin: 0 0 30px; font-size: 14px; color: #475569; line-height: 1.6;">
        <li style="margin-bottom: 6px;">Flight time: 8-15 minutes (weather dependent)</li>
        <li style="margin-bottom: 6px;">GoPro photo &amp; video</li>
        <li style="margin-bottom: 6px;">Welcome drink (coffee/tea)</li>
        <li style="margin-bottom: 6px;">Flight insurance</li>
        <li style="margin-bottom: 6px;">Certificate of flight</li>
        ${c.pickupLocation ? `<li style="margin-bottom: 6px;">Pickup/Drop-off service (${escapeHtml(c.pickupLocation)})</li>` : ""}
      </ul>

      <!-- Next Steps -->
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; font-size: 14px; color: #92400e; margin-bottom: 30px;">
        <strong style="display: block; margin-bottom: 8px;">Important Next Steps:</strong>
        <ol style="padding-left: 20px; margin: 0; line-height: 1.5;">
          <li>We will confirm via phone/WhatsApp within 24 hours.</li>
          <li>Arrive 15-20 minutes early for safety briefing.</li>
          <li>Bring ID/Passport and the booking confirmation.</li>
        </ol>
      </div>

      <!-- Contact Info -->
      <div style="text-align: center; font-size: 14px; color: #64748b; line-height: 1.6;">
        If you have any questions, feel free to contact us:<br/>
        <strong>📞 +84 964.073.555 | +84 979.702.812</strong><br/>
        <span style="display: inline-block; margin-top: 5px;">💬 WhatsApp | Zalo | Telegram</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      &copy; ${new Date().getFullYear()} Mebayluon Paragliding. All rights reserved.<br/>
      <a href="https://mebayluon.com" style="color: #0ea5e9; text-decoration: none;">mebayluon.com</a>
    </div>
  </div>
</body>
</html>`;
}

export function formatCustomerEmailHtml(payload: TelegramBookingPayload) {
  const subjectId = payload.bookingId || payload.locationName || payload.location || "Booking";
  return customerEmailHtmlWrapper(`Booking Confirmation - ${subjectId}`, payload);
}

export function formatAdminEmailHtml(payload: TelegramBookingPayload) {
  const adminText = buildTelegramSections(payload);
  const subjectId = payload.bookingId || payload.locationName || payload.location || "Booking";
  return telegramLikeHtmlWrapper(`Đơn đặt bay mới - ${subjectId}`, adminText);
}