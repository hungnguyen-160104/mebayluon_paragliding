// backend-mbl/src/controllers/telegram.controller.ts
import { Request, Response } from "express";
import spots from "../data/spots.json";
import { sendTelegramToAll } from "../services/telegram.service";

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
type Payload = {
  location?: string;           // key
  locationName?: string;       // hiển thị
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: Contact;
  guests?: Guest[];
  addons?: Addons;
  price?: Price;               // frontend có thể gửi sẵn
  createdAt?: string;
};

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  return ACCEPTED_KEYS_ENV.length ? ACCEPTED_KEYS_ENV : Object.keys(spots);
}
const displayNameFor = (k?: string, fallback?: string) =>
  (k && (spots as Record<string, string>)[k]) || fallback || (k || "—");

const formatVND = (n?: number) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
    : "—";

const escapeHtml = (s?: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function postNotifyTelegram(req: Request, res: Response) {
  try {
    // Hỗ trợ body là { payload } hoặc payload phẳng
    const raw = (req.body && typeof req.body === "object" ? req.body : {}) as any;
    const body: Payload =
      raw && raw.payload && typeof raw.payload === "object" ? raw.payload : raw;

    // Xác định location
    const keys = acceptedKeys();
    let key = (body.location || "").trim();
    if (!key || !keys.includes(key)) {
      const byName = (body.locationName || "").trim();
      const found = keys.find((k) => displayNameFor(k) === byName);
      if (found) key = found;
    }
    if (!key || !keys.includes(key)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid location",
        received: String(body.location || body.locationName || ""),
        acceptedKeys: keys,
      });
    }

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

    const createdAt =
      body.createdAt ||
      new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    const locationName = displayNameFor(key, body.locationName);
    const perPerson = formatVND(body.price?.perPerson);
    const total = formatVND(body.price?.total);

    const sections = [
      `🛒 <b>ĐƠN ĐẶT BAY MỚI</b>`,
      `📍 <b>Điểm:</b> ${escapeHtml(locationName)} (${escapeHtml(key)})`,
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
      `⏱️ ${createdAt}`,
    ].filter(Boolean);

    const text = sections.join("\n");
    const results = await sendTelegramToAll(text, true);
    const failed = results.filter((r) => r.ok === false);

    if (failed.length) {
      return res.status(502).json({ ok: false, error: "Some Telegram messages failed", details: results });
    }
    return res.json({
      ok: true,
      telegram: results.map((r) => ({ chat_id: r.chat_id })),
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Unexpected error" });
  }
}
