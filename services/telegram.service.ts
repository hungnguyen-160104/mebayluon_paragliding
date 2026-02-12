// services/telegram.service.ts
type SendResult = { chat_id: string; ok: boolean; status?: number; error?: string };

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || "")
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

/** Tạo message đẹp cho đơn đặt bay (khớp payload bạn đang dùng) */
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
        if (typeof g?.weightKg === "number") attrs.push(`Wt: ${g.weightKg}kg`);
        if (g?.nationality) attrs.push(`QT: ${esc(g.nationality)}`);
        return `${i + 1}. ${esc(g?.fullName || "")}${attrs.length ? " (" + attrs.join(" · ") + ")" : ""}`;
      })
      .join("\n") || "—";

  const addons: string[] = [];
  if (payload?.addons?.flycam) addons.push("• Flycam");
  if (payload?.addons?.camera360) addons.push("• Camera 360");
  if (payload?.addons?.pickup) addons.push("• Đón trả");

  const createdAt =
    payload?.createdAt ||
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const lines = [
    `🛒 <b>ĐƠN ĐẶT BAY MỚI</b>`,
    `📍 <b>Điểm:</b> ${esc(payload?.locationName || payload?.location || "—")}`,
    `📅 <b>Thời gian:</b> ${esc(payload?.dateISO || "")} ${esc(payload?.timeSlot || "")}`,
    `👥 <b>Số khách:</b> ${guestsCount}`,
    ``,
    `<b>Liên hệ</b>`,
    `• 📞 ${esc(c.phone || "")} · ✉️ ${esc(c.email || "")}`,
    c.pickupLocation ? `• 🚗 Điểm đón: ${esc(c.pickupLocation)}` : "",
    c.specialRequest ? `• 📝 Y/c đặc biệt: ${esc(c.specialRequest)}` : "",
    ``,
    `<b>Chi phí</b>`,
    `• Giá/khách (sau giảm): ${fmtVND(payload?.price?.perPerson)}`,
    addons.length ? `• Phụ thu:\n${addons.map(l => "   " + l).join("\n")}` : "",
    `• <b>Tổng tạm tính:</b> ${fmtVND(payload?.price?.total)}`,
    ``,
    `<b>Danh sách khách</b>`,
    guestLines,
    ``,
    `⏱️ ${createdAt}`,
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
