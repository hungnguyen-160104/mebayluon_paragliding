// services/telegram.service.ts
type SendResult = { chat_id: string; ok: boolean; status?: number; error?: string };

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export async function sendTelegramToAll(text: string, html = true): Promise<SendResult[]> {
  if (!BOT_TOKEN || CHAT_IDS.length === 0) {
    return [{ chat_id: "n/a", ok: false, error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS" }];
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = (chat_id: string) => ({
    chat_id,
    text,
    parse_mode: html ? "HTML" : undefined,
    disable_web_page_preview: true,
  });

  const results: SendResult[] = [];
  for (const id of CHAT_IDS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(id)),
      });
      const ok = res.ok;
      if (!ok) {
        const msg = await res.text().catch(() => res.statusText);
        results.push({ chat_id: id, ok: false, status: res.status, error: msg });
      } else {
        results.push({ chat_id: id, ok: true });
      }
    } catch (e: any) {
      results.push({ chat_id: id, ok: false, error: e?.message || "network error" });
    }
  }
  return results;
}

/** Tạo message đẹp cho đơn đặt bay - FORMAT ĐẦY ĐỦ VỚI CHI TIẾT GIÁ VÀ DỊCH VỤ */
export function buildBookingMessage(payload: any): string {
  const esc = (s?: string) =>
    (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmtVND = (n?: number) =>
    typeof n === "number" ? n.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "—";

  const c = payload?.contact || {};
  const guests = Array.isArray(payload?.guests) ? payload.guests : [];
  const guestsCount =
    Number(payload?.guestsCount) > 0 ? Number(payload.guestsCount) : Math.max(1, guests.length);

  const guestLines =
    guests
      .map((g: any, i: number) => {
        const attrs: string[] = [];
        if (g?.dob) attrs.push(`DOB: ${esc(g.dob)}`);
        if (g?.gender) attrs.push(esc(g.gender));
        if (g?.idNumber) attrs.push(`ID: ${esc(g.idNumber)}`);
        if (typeof g?.weightKg === "number") attrs.push(`${g.weightKg}kg`);
        if (g?.nationality) attrs.push(esc(g.nationality));
        return `${i + 1}. ${esc(g?.fullName || "")} | ${attrs.join(" · ")}`;
      })
      .join("\n") || "—";

  const createdAt =
    payload?.createdAt ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const locationName = esc(payload?.locationName || payload?.location || "—");

  // Handle both old format (perPerson) and new format (basePerPerson)
  const basePerPerson = payload?.price?.basePerPerson || payload?.price?.perPerson;
  const baseTotal = basePerPerson ? basePerPerson * guestsCount : 0;

  const total = fmtVND(payload?.price?.total);

  // Build addon lines with actual pricing
  const addonLines: string[] = [];
  const priceAddons = payload?.price?.addonsUnitPrice || {};
  const addonTotal = payload?.price?.addonsTotal || {};

  if (payload?.addons?.pickup || (payload?.price?.addonsQty?.pickup ?? 0) > 0) {
    const qty = payload?.price?.addonsQty?.pickup || 1;
    const unit = priceAddons?.pickup || 100_000;
    const tot = addonTotal?.pickup || unit * qty;
    addonLines.push(`• Đưa đón: ${fmtVND(unit)} × ${qty} = ${fmtVND(tot)}`);
  }

  if (payload?.addons?.flycam || (payload?.price?.addonsQty?.flycam ?? 0) > 0) {
    const qty = payload?.price?.addonsQty?.flycam || 1;
    const unit = priceAddons?.flycam || 300_000;
    const tot = addonTotal?.flycam || unit * qty;
    addonLines.push(`• Flycam / Drone: ${fmtVND(unit)} × ${qty} = ${fmtVND(tot)}`);
  }

  if (payload?.addons?.camera360 || (payload?.price?.addonsQty?.camera360 ?? 0) > 0) {
    const qty = payload?.price?.addonsQty?.camera360 || 1;
    const unit = priceAddons?.camera360 || 500_000;
    const tot = addonTotal?.camera360 || unit * qty;
    addonLines.push(`• Camera 360°: ${fmtVND(unit)} × ${qty} = ${fmtVND(tot)}`);
  }

  const lines = [
    `🔔 ĐƠN ĐẶT BAY MỚI: ${payload?.bookingId || "—"}`,
    ``,
    `🆔 DỊCH VỤ & NGÀY GIỜ`,
    `${esc(payload?.serviceName || "Dù lượn")} | ${esc(payload?.dateISO || "—")} ${payload?.timeSlot ? `@ ${payload?.timeSlot}` : ""}`,
    ``,
    `📍 ĐỊA ĐIỂM & SỐ LƯỢNG`,
    `Điểm bay: ${locationName}`,
    `Số khách: ${guestsCount} người`,
    ``,
    `👤 THÔNG TIN LIÊN HỆ`,
    `Điện thoại: ${esc(c.phone || "—")}`,
    `Email: ${esc(c.email || "—")}`,
    c.pickupLocation ? `Địa điểm đón: ${esc(c.pickupLocation)}` : "",
    ``,
    `👥 THÔNG TIN KHÁCH HÀNG`,
    guestLines,
    ``,
    `💰 CHI TIẾT GIÁ`,
    `Giá bay cơ bản: ${fmtVND(basePerPerson)}/người × ${guestsCount} = ${fmtVND(baseTotal)}`,
    ...addonLines,
    payload?.price?.discountPerPerson ? `Giảm giá nhóm: -${fmtVND(payload.price.discountPerPerson)}/người × ${guestsCount} = -${fmtVND(payload.price.discountPerPerson * guestsCount)}` : "",
    ``,
    `📌 GHI CHÚ/YÊU CẦU ĐẶC BIỆT`,
    `${esc(c.specialRequest || "Không có")}`,
    ``,
    `═══════════════════════════════`,
    `TỔNG CỘNG: ${total}`,
    `═══════════════════════════════`,
  ].filter(Boolean);

  return lines.join("\n");
}

/** Dùng cho route /api/notify-telegram (nếu cần gọi trực tiếp) */
export async function postNotifyTelegram(payload: any) {
  const text = buildBookingMessage(payload);
  const results = await sendTelegramToAll(text, true);
  const failed = results.filter(r => !r.ok);
  return {
    ok: failed.length === 0,
    results,
  };
}
