import { NextRequest, NextResponse } from "next/server";
import spots from "@/data/spots.json";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer.model";
import { Booking } from "@/models/Booking.model";
import { postNotifyGmail } from "@/services/gmail.service";
import { buildBookingMessage } from "@/services/telegram.service";

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
  servicesBreakdown?: Array<{
    key?: string;
    label?: string;
    detail?: string;
    lineTotal?: number;
  }>;
  servicesTotal?: number;
  total?: number;
};

type ServiceSelection = {
  selected?: boolean;
  qty?: number;
  inputText?: string;
};

type SelectedServiceLine = {
  key?: string;
  label?: string;
  inputText?: string;
  fixedMapUrl?: string;
};

type Payload = {
  location?: string; // key
  locationName?: string; // tên hiển thị
  packageKey?: string;
  flightTypeKey?: string;
  packageLabel?: string;
  flightTypeLabel?: string;
  holidayType?: string;
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: Contact;
  guests?: Guest[];
  services?: Record<string, ServiceSelection>;
  selectedServices?: SelectedServiceLine[];
  addons?: AddonsBool; // backward
  addonsQty?: AddonsQty; // NEW
  price?: Price;
  createdAt?: string;
};

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  const keys = Object.keys(spots as Record<string, string>);
  return ACCEPTED_KEYS_ENV.length
    ? ACCEPTED_KEYS_ENV.filter((k) => keys.includes(k))
    : keys;
}

const nameOf = (k?: string, fallback?: string) =>
  (k && (spots as Record<string, string>)[k]) || fallback || (k || "—");

/** ============ Booking code helpers ============ */
const BOOKING_CODE_PREFIX: Record<string, string> = {
  "HÀ NỘI": "HN",
  "ĐÈO KHAU PHẠ": "DKP",
  "SAPA": "SAPA",
  "HÀ GIANG": "HG",
  "ĐÀ NẴNG": "DN",
};

function toBookingDatePart(dateISO?: string): string {
  if (!dateISO) return "";

  // YYYY-MM-DD -> DDMM
  const m = String(dateISO).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, , mm, dd] = m;
    return `${dd}${mm}`;
  }

  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return "";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}`;
}

function toPhoneDigits(phone?: string): string {
  return String(phone || "").replace(/\D/g, "");
}

function buildBookingCode(input: {
  locationName?: string;
  dateISO?: string;
  phone?: string;
}) {
  const locationName = String(input.locationName || "").trim().toUpperCase();
  const prefix = BOOKING_CODE_PREFIX[locationName] || "BOOK";
  const datePart = toBookingDatePart(input.dateISO);
  const phonePart = toPhoneDigits(input.phone);

  return `${prefix}${datePart}${phonePart}`;
}

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
  const ids = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: html ? "HTML" : undefined,
        }),
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
    return { success: true };
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
    console.log(
      "[BookingCreate] Turnstile token received:",
      turnstileToken
        ? `${turnstileToken.substring(0, 20)}... (len=${turnstileToken.length})`
        : "MISSING"
    );

    if (!turnstileToken || typeof turnstileToken !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "TURNSTILE_FAILED",
          message: "Thiếu xác thực Turnstile. Vui lòng thử lại.",
        },
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
      await connectDB();

      // Validate phone (bắt buộc)
      if (!c.phone || !c.phone.trim()) {
        return NextResponse.json(
          {
            ok: false,
            error: "VALIDATION_ERROR",
            message: "Số điện thoại là bắt buộc",
          },
          { status: 400 }
        );
      }

      // Normalize phone
      const normalizedPhone = c.phone.trim().toLowerCase();

      // Tạo booking code theo format: prefix + DDMM + phone
      const bookingCode = buildBookingCode({
        locationName: normalized.locationName,
        dateISO: normalized.dateISO,
        phone: normalizedPhone,
      });

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
          {
            ok: false,
            error: "CUSTOMER_SAVE_FAILED",
            message: "Không thể lưu thông tin khách hàng",
          },
          { status: 500 }
        );
      }

      // Tạo Booking mới
      const booking = await Booking.create({
        customerId: customer._id,
        location: normalized.location,
        locationName: normalized.locationName,
        packageKey: normalized.packageKey,
        flightTypeKey: normalized.flightTypeKey,
        packageLabel: normalized.packageLabel,
        flightTypeLabel: normalized.flightTypeLabel,
        holidayType: normalized.holidayType,
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
        services: normalized.services || {},
        selectedServices: normalized.selectedServices || [],
        addons: normalized.addons,
        addonsQty: normalized.addonsQty,
        price: normalized.price,
        status: "pending",
      });

      if (!booking?._id) {
        return NextResponse.json(
          {
            ok: false,
            error: "BOOKING_SAVE_FAILED",
            message: "Không thể lưu đơn đặt bay",
          },
          { status: 500 }
        );
      }

      const bookingObjectId = booking._id.toString();

      // Payload dùng cho Telegram/Gmail
      const notifyPayload = {
        ...normalized,
        bookingId: bookingCode,
        bookingObjectId,
        serviceName: normalized.locationName,
      };

      // Sau khi lưu DB thành công, gửi Telegram
      const text = buildBookingMessage(notifyPayload);

      // Gửi Telegram (không fail booking nếu Telegram lỗi, chỉ log warning)
      const results = await sendTelegramToAll(text, true);
      const failed = results.filter((r) => r.ok === false);
      if (failed.length) {
        console.warn("[BookingCreate] Telegram failed:", failed);
      }

      try {
        await postNotifyGmail(notifyPayload);
      } catch (e: any) {
        console.warn("[BookingCreate] Gmail failed:", e?.message);
      }

      return NextResponse.json(
        {
          ok: true,
          message: "Đã gửi yêu cầu đặt bay. Chúng tôi sẽ liên hệ sớm!",
          bookingId: bookingCode,
          bookingObjectId,
          customerId: customer._id.toString(),
          telegram: results.map((r) => ({
            chat_id: (r as any).chat_id,
            ok: (r as any).ok,
          })),
          booking: {
            bookingCode,
            _id: bookingObjectId,
            customerId: customer._id.toString(),
            location: booking.location,
            locationName: booking.locationName,
            packageKey: booking.packageKey,
            flightTypeKey: booking.flightTypeKey,
            packageLabel: booking.packageLabel,
            flightTypeLabel: booking.flightTypeLabel,
            holidayType: booking.holidayType,
            dateISO: booking.dateISO,
            timeSlot: booking.timeSlot,
            guestsCount: booking.guestsCount,
            contact: booking.contact,
            guests: booking.guests,
            services: booking.services,
            selectedServices: booking.selectedServices,
            addons: booking.addons,
            addonsQty: booking.addonsQty,
            price: booking.price,
            status: booking.status,
            createdAt: booking.createdAt,
          },
        },
        { status: 201 }
      );
    } catch (dbErr: any) {
      console.error("[BookingCreate] DB Error:", dbErr?.message);
      return NextResponse.json(
        {
          ok: false,
          error: "DB_SAVE_FAILED",
          message: "Lỗi lưu dữ liệu. Vui lòng thử lại.",
        },
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