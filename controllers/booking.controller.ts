// controllers/booking.controller.ts
// ✅ Bản thuần Next.js: không dùng express
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import spots from "../data/spots.json"; // cần resolveJsonModule: true

export type BookingPayload = {
  location?: string;
  locationName?: string;
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: {
    phone?: string;
    email?: string;
    pickupLocation?: string;
    specialRequest?: string;
  };
  guests?: Array<{
    fullName?: string;
    dob?: string;
    gender?: string;
    idNumber?: string;
    weightKg?: number;
    nationality?: string;
  }>;
  addons?: {
    pickup?: boolean;
    flycam?: boolean;
    camera360?: boolean;
  };
  price?: { currency?: string; perPerson?: number; total?: number };
  createdAt?: string;
};

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  return ACCEPTED_KEYS_ENV.length
    ? ACCEPTED_KEYS_ENV
    : Object.keys(spots as Record<string, string>);
}

const displayName = (k: string) =>
  (spots as Record<string, string>)[k] || k;

function resolveLocation(
  body: BookingPayload,
  keys: string[]
): string | undefined {
  let key = (body.location || "").trim();

  if (!key || !keys.includes(key)) {
    const byName = (body.locationName || "").trim();
    const found = keys.find((k) => displayName(k) === byName);
    if (found) key = found;
  }
  return key || undefined;
}

/**
 * GET locations → trả về { ok, items: [{key, name}] }
 */
export async function getLocations(_req: NextRequest) {
  const keys = acceptedKeys();
  const items = keys.map((key) => ({ key, name: displayName(key) }));
  return NextResponse.json({ ok: true, items });
}

/**
 * POST validateBooking → body: BookingPayload
 * Trả về { ok: true, valid, key?, acceptedKeys }
 */
export async function validateBooking(req: NextRequest) {
  const keys = acceptedKeys();
  const body = ((await req.json().catch(() => ({}))) || {}) as BookingPayload;

  const key = resolveLocation(body, keys);
  const valid = !!key && keys.includes(key);

  return NextResponse.json({
    ok: true,
    valid,
    key: valid ? key : undefined,
    acceptedKeys: keys,
  });
}

/**
 * POST createBooking → body: BookingPayload
 * Trả về 400 nếu location không hợp lệ, ngược lại trả normalized booking.
 */
export async function createBooking(req: NextRequest) {
  const keys = acceptedKeys();
  const body = ((await req.json().catch(() => ({}))) || {}) as BookingPayload;

  const key = resolveLocation(body, keys);
  if (!key || !keys.includes(key)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid location",
        received: String(body.location || body.locationName || ""),
        acceptedKeys: keys,
      },
      { status: 400 }
    );
  }

  const normalized = {
    ...body,
    location: key,
    locationName: displayName(key),
    guestsCount:
      Number.isFinite(body.guestsCount) && Number(body.guestsCount) > 0
        ? Number(body.guestsCount)
        : body.guests?.length || 1,
    createdAt: body.createdAt || new Date().toISOString(),
  };

  // (Tuỳ chọn) lưu DB ở đây…
  return NextResponse.json({ ok: true, booking: normalized });
}
