import { NextRequest, NextResponse } from "next/server";
import spots from "@/data/spots.json";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer.model";
import { Booking } from "@/models/Booking.model";
import { postNotifyGmail } from "@/services/gmail.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ============ Helpers chung ============ */
type AddonKey = "pickup" | "flycam" | "camera360";
type AddonsBool = Partial<Record<AddonKey, boolean>>;
type AddonsQty = Partial<Record<AddonKey, number>>;

type Contact = {
  phone?: string;
  email?: string;
  fullName?: string;
  pickupLocation?: string;
  specialRequest?: string;
};
type Guest = {
  fullName?: string;
  dob?: string;
  gender?: string;
  idNumber?: string;
  weightKg?: number;
  nationality?: string;
};

type Price = {
  currency?: "VND" | "USD" | string;

  // backward
  perPerson?: number;

  // NEW breakdown
  basePerPerson?: number;
  discountPerPerson?: number;
  addonsUnitPrice?: Partial<Record<AddonKey, number>>;
  addonsQty?: AddonsQty;
  addonsTotal?: Partial<Record<AddonKey, number>>;
  total?: number;
};

type Payload = {
  location?: string;        // key
  locationName?: string;    // tên hiển thị
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: Contact;
  guests?: Guest[];
  addons?: AddonsBool;      // backward
  addonsQty?: AddonsQty;    // NEW
  price?: Price;
  createdAt?: string;
};

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  return ACCEPTED_KEYS_ENV.length ? ACCEPTED_KEYS_ENV : Object.keys(spots as Record<string, string>);
}
const nameOf = (k?: string, fallback?: string) =>
  (k && (spots as Record<string, string>)[k]) || fallback || (k || "—");

const escapeHtml = (s?: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function fmtMoney(n?: number, currency?: string) {
  if (typeof n !== "number") return "—";
  const c = (currency || "VND").toUpperCase();
  if (c === "USD") {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

async function sendTelegramToAll(text: string, html = true) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const ids = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!token || ids.length === 0) {
    return [{ ok: false, error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS" }];
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const results = [];
  for (const chat_id of ids) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text, parse_mode: html ? "HTML" : undefined }),
      });
      const j = await r.json();
      results.push({ ok: !!j.ok, chat_id, raw: j });
    } catch (e: any) {
      results.push({ ok: false, chat_id, error: e?.message || String(e) });
    }
  }
  return results;
}

function pickPayload(obj: any): Payload {
  if (obj && typeof obj === "object" && obj.payload && typeof obj.payload === "object") {
    return obj.payload as Payload;
  }
  return (obj || {}) as Payload;
}

function normalizeAddonsQty(raw: Payload, guestsCount: number): AddonsQty {
  const qtyRaw = (raw.addonsQty || {}) as AddonsQty;
  const boolRaw = (raw.addons || {}) as AddonsBool;

  const out: AddonsQty = {};
  (["pickup", "flycam", "camera360"] as AddonKey[]).forEach((k) => {
    let q = qtyRaw?.[k];

    // fallback boolean -> assume full guestsCount
    if (q == null && boolRaw?.[k]) q = guestsCount;

    const qq = clampInt(q ?? 0, 0, guestsCount);
    if (qq > 0) out[k] = qq;
  });

  return out;
}

/** ============ Cloudflare Turnstile verification ============ */
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(
  token: string,
  remoteip?: string
): Promise<{ success: boolean; "error-codes"?: string[] }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set – skipping verification");
    return { success: true }; // Cho qua nếu chưa cấu hình (dev mode)
  }

  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);
  if (remoteip) formData.set("remoteip", remoteip);

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const result = await res.json();

  if (!result.success) {
    console.warn("[Turnstile] Verify failed:", JSON.stringify(result));
  }

  return result;
}

/** ============ POST /api/booking/create ============ */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
    }

    // ─── Turnstile verification (anti-bot) ───
    const turnstileToken = body?.turnstileToken;
    console.log("[BookingCreate] Turnstile token received:", turnstileToken ? `${turnstileToken.substring(0, 20)}... (len=${turnstileToken.length})` : "MISSING");

    if (!turnstileToken || typeof turnstileToken !== "string") {
      return NextResponse.json(
        { ok: false, error: "TURNSTILE_FAILED", message: "Thiếu xác thực Turnstile. Vui lòng thử lại." },
        { status: 403 }
      );
    }

    const remoteip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const turnstileResult = await verifyTurnstile(turnstileToken, remoteip);
    if (!turnstileResult.success) {
      console.warn("[BookingCreate] Turnstile verify failed:", turnstileResult["error-codes"]);
      return NextResponse.json(
        {
          ok: false,
          error: "TURNSTILE_FAILED",
          message: "Xác thực Turnstile thất bại. Vui lòng thử lại.",
          errorCodes: turnstileResult["error-codes"],
        },
        { status: 403 }
      );
    }
    // ─── End Turnstile ───

    const raw = pickPayload(body);
    const keys = acceptedKeys();

    // Resolve location key
    let key = (raw.location || "").trim();
    if (!key || !keys.includes(key)) {
      const byName = (raw.locationName || "").trim();
      const found = keys.find((k) => nameOf(k) === byName);
      if (found) key = found;
    }
    if (!key || !keys.includes(key)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid location",
          received: String(raw.location || raw.locationName || ""),
          acceptedKeys: keys,
        },
        { status: 400 }
      );
    }

    // Chuẩn hoá payload
    const guestsCount =
      Number.isFinite(raw.guestsCount) && Number(raw.guestsCount) > 0
        ? Number(raw.guestsCount)
        : raw.guests?.length || 1;

    const createdAt =
      raw.createdAt || new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    // normalize addonsQty + derive boolean
    const addonsQty = normalizeAddonsQty(raw, guestsCount);
    const addons: AddonsBool = { ...(raw.addons || {}) };
    (Object.keys(addonsQty) as AddonKey[]).forEach((k) => {
      addons[k] = (addonsQty[k] ?? 0) > 0;
    });

    const normalized: Payload = {
      ...raw,
      location: key,
      locationName: nameOf(key, raw.locationName),
      guestsCount,
      createdAt,
      addonsQty,
      addons,
    };

    // Build guest lines
    const guestLines =
      (normalized.guests || [])
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

    const currency = (normalized.price?.currency || "VND").toUpperCase();

    const addonLabel: Record<AddonKey, string> = {
      flycam: "Flycam",
      camera360: "Camera 360",
      pickup: "Đón trả",
    };

    const addonLines: string[] = [];
    (["flycam", "camera360", "pickup"] as AddonKey[]).forEach((k) => {
      const qty = normalized.addonsQty?.[k] ?? 0;
      if (!qty) return;

      const unit = normalized.price?.addonsUnitPrice?.[k];
      const total =
        normalized.price?.addonsTotal?.[k] ??
        (typeof unit === "number" ? unit * qty : undefined);

      if (typeof total === "number" && typeof unit === "number") {
        addonLines.push(
          `• ${addonLabel[k]} ×${qty}: ${fmtMoney(total, currency)} (${fmtMoney(unit, currency)}/khách)`
        );
      } else if (typeof total === "number") {
        addonLines.push(`• ${addonLabel[k]} ×${qty}: ${fmtMoney(total, currency)}`);
      } else {
        addonLines.push(`• ${addonLabel[k]} ×${qty}`);
      }
    });

    const c = normalized.contact || {};
    const primaryGuestName =
      (normalized.guests || []).find((g) => g.fullName && g.fullName.trim())?.fullName?.trim() ||
      c.fullName?.trim();

    // ============ Lưu Customer và Booking vào MongoDB ============
    try {
      // Kết nối DB
      await connectDB();

      // Validate phone (bắt buộc)
      if (!c.phone || !c.phone.trim()) {
        return NextResponse.json(
          { ok: false, error: "VALIDATION_ERROR", message: "Số điện thoại là bắt buộc" },
          { status: 400 }
        );
      }

      // Normalize phone (trim + lowercase)
      const normalizedPhone = c.phone.trim().toLowerCase();

      // Upsert Customer
      const customerUpdate: Record<string, any> = {
        lastBookingAt: new Date(),
      };
      if (c.email) {
        customerUpdate.email = c.email.trim().toLowerCase();
      }
      if (primaryGuestName) {
        customerUpdate.fullName = primaryGuestName;
      }

      const customer = await Customer.findOneAndUpdate(
        { phone: normalizedPhone },
        {
          $set: customerUpdate,
          $setOnInsert: {
            phone: normalizedPhone,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (!customer?._id) {
        return NextResponse.json(
          { ok: false, error: "CUSTOMER_SAVE_FAILED", message: "Không thể lưu thông tin khách hàng" },
          { status: 500 }
        );
      }

      // Tạo Booking mới
      const booking = await Booking.create({
        customerId: customer._id,
        location: normalized.location,
        locationName: normalized.locationName,
        dateISO: normalized.dateISO,
        timeSlot: normalized.timeSlot,
        guestsCount: normalized.guestsCount,
        contact: {
          phone: normalizedPhone,
          email: c.email ? c.email.trim().toLowerCase() : undefined,
          fullName: primaryGuestName,
          pickupLocation: c.pickupLocation,
          specialRequest: c.specialRequest,
        },
        guests: normalized.guests || [],
        addons: normalized.addons,
        addonsQty: normalized.addonsQty,
        price: normalized.price,
        status: "pending",
      });

      if (!booking?._id) {
        return NextResponse.json(
          { ok: false, error: "BOOKING_SAVE_FAILED", message: "Không thể lưu đơn đặt bay" },
          { status: 500 }
        );
      }

      // Sau khi lưu DB thành công, gửi Telegram
    const basePerPerson = normalized.price?.basePerPerson;
    const discountPerPerson = normalized.price?.discountPerPerson;
    const total = normalized.price?.total;

    const text = [
      `🛒 <b>ĐƠN ĐẶT BAY MỚI</b>`,
      `📍 <b>Điểm:</b> ${escapeHtml(normalized.locationName || "")} (${escapeHtml(key)})`,
      `📅 <b>Thời gian:</b> ${escapeHtml(normalized.dateISO || "")} ${escapeHtml(normalized.timeSlot || "")}`,
      `👥 <b>Số khách:</b> ${normalized.guestsCount}`,
      ``,
      `<b>Liên hệ</b>`,
      `• 📞 ${escapeHtml(c.phone || "")} · ✉️ ${escapeHtml(c.email || "")}`,
      c.pickupLocation ? `• 🚗 Điểm đón: ${escapeHtml(c.pickupLocation)}` : "",
      c.specialRequest ? `• 📝 Y/c đặc biệt: ${escapeHtml(c.specialRequest)}` : "",
      ``,
      `<b>Chi phí</b>`,
      typeof basePerPerson === "number" ? `• Giá cơ bản/khách: ${fmtMoney(basePerPerson, currency)}` : "",
      typeof discountPerPerson === "number" && discountPerPerson > 0
        ? `• Giảm theo nhóm: -${fmtMoney(discountPerPerson, currency)}/khách`
        : "",
      addonLines.length ? `• Dịch vụ thêm:\n${addonLines.map((l) => "   " + l).join("\n")}` : "",
      `• <b>Tổng tạm tính:</b> ${fmtMoney(total, currency)}`,
      ``,
      `<b>Danh sách khách</b>`,
      guestLines,
      ``,
      `⏱️ ${escapeHtml(createdAt)}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Gửi Telegram (không fail booking nếu Telegram lỗi, chỉ log warning)
    const results = await sendTelegramToAll(text, true);
    const failed = results.filter((r) => r.ok === false);
    if (failed.length) {
      console.warn("[BookingCreate] Telegram failed:", failed);
    }

    try {
  await postNotifyGmail({
    ...normalized,
    bookingId: booking._id.toString(),
    serviceName: normalized.locationName,
  });
} catch (e: any) {
  console.warn("[BookingCreate] Gmail failed:", e?.message);
}

    return NextResponse.json(
      {
        ok: true,
        message: "Đã gửi yêu cầu đặt bay. Chúng tôi sẽ liên hệ sớm!",
        bookingId: booking._id.toString(),
        customerId: customer._id.toString(),
        telegram: results.map((r) => ({ chat_id: (r as any).chat_id, ok: (r as any).ok })),
        booking: {
          _id: booking._id.toString(),
          customerId: customer._id.toString(),
          location: booking.location,
          locationName: booking.locationName,
          dateISO: booking.dateISO,
          timeSlot: booking.timeSlot,
          guestsCount: booking.guestsCount,
          status: booking.status,
          createdAt: booking.createdAt,
        },
      },
      { status: 201 }
    );
    } catch (dbErr: any) {
      // Lỗi lưu DB - không crash, trả 500
      console.error("[BookingCreate] DB Error:", dbErr?.message);
      return NextResponse.json(
        { ok: false, error: "DB_SAVE_FAILED", message: "Lỗi lưu dữ liệu. Vui lòng thử lại." },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
