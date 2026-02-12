// services/booking.service.ts
import spots from "@/data/spots.json";
import { buildBookingMessage, sendTelegramToAll } from "./telegram.service";

export type BookingInput = {
  name?: string;
  phone?: string;
  date?: string | Date;
  location?: string;
  locationName?: string;
  people?: number;
  note?: string;
  email?: string;
  packageId?: string;
  // phần nâng cao
  guestsCount?: number;
  timeSlot?: string;
  contact?: {
    phone?: string; email?: string; pickupLocation?: string; specialRequest?: string;
  };
  guests?: any[];
  addons?: { pickup?: boolean; flycam?: boolean; camera360?: boolean };
  price?: { currency?: string; perPerson?: number; total?: number };
};

export type ValidateResult = { ok: true } | { ok: false; errors: Record<string, string> };

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

function acceptedKeys(): string[] {
  const keys = Object.keys(spots as Record<string, string>);
  return ACCEPTED_KEYS_ENV.length ? ACCEPTED_KEYS_ENV.filter(k => keys.includes(k)) : keys;
}
const displayName = (k: string) => (spots as Record<string, string>)[k] || k;

export async function getLocations() {
  const keys = acceptedKeys();
  return keys.map(k => ({ key: k, name: displayName(k) }));
}

export async function validateBooking(input: BookingInput): Promise<ValidateResult> {
  const errors: Record<string, string> = {};
  if (!input?.name?.trim()) errors.name = "Tên là bắt buộc";
  if (!input?.phone?.trim()) errors.phone = "Số điện thoại là bắt buộc";
  if (!input?.date) errors.date = "Ngày bay là bắt buộc";

  // điểm bay
  const keys = acceptedKeys();
  let key = (input?.location || "").trim();
  if (!key || !keys.includes(key)) {
    const byName = (input?.locationName || "").trim();
    const found = keys.find(k => displayName(k) === byName);
    if (found) key = found;
  }
  if (!key) errors.location = "Điểm bay là bắt buộc";

  // ngày không ở quá khứ
  if (input?.date) {
    const d = new Date(input.date);
    if (Number.isNaN(d.getTime())) errors.date = "Ngày không hợp lệ";
    else {
      const today = new Date(); today.setHours(0,0,0,0);
      if (d < today) errors.date = "Ngày bay không được ở quá khứ";
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

/** Tạo đơn + gửi Telegram (không lưu DB) */
export async function createBooking(input: BookingInput) {
  const v = await validateBooking(input);
  if (v.ok === false) {
    const err: any = new Error("Invalid booking");
    err.status = 400;
    err.details = v.errors;
    throw err;
  }

  const payload = {
    ...input,
    createdAt:
      input && (input as any).createdAt
        ? (input as any).createdAt
        : new Date().toISOString(),
  };

  const text = buildBookingMessage(payload);
  const results = await sendTelegramToAll(text, true);
  const failed = results.filter(r => !r.ok);

  return {
    ok: failed.length === 0,
    telegram: results,
  };
}
