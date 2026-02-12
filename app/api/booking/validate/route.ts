import { NextRequest, NextResponse } from "next/server";
import spots from "@/data/spots.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  location?: string;
  locationName?: string;
  dateISO?: string;
  contact?: { phone?: string; email?: string };
};

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  return ACCEPTED_KEYS_ENV.length ? ACCEPTED_KEYS_ENV : Object.keys(spots as Record<string, string>);
}
const nameOf = (k?: string, fallback?: string) =>
  (k && (spots as Record<string, string>)[k]) || fallback || (k || "—");

function pickPayload(obj: any): Payload {
  if (obj && typeof obj === "object" && obj.payload && typeof obj.payload === "object") {
    return obj.payload as Payload;
  }
  return (obj || {}) as Payload;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const p = pickPayload(body);
    const keys = acceptedKeys();

    // Validate location
    let key = (p.location || "").trim();
    if (!key || !keys.includes(key)) {
      const byName = (p.locationName || "").trim();
      const found = keys.find(k => nameOf(k) === byName);
      if (found) key = found;
    }

    const errors: Record<string, string> = {};
    if (!key || !keys.includes(key)) {
      errors.location = "Điểm bay không hợp lệ";
    }
    if (!p.dateISO?.trim()) {
      errors.date = "Ngày/giờ bay là bắt buộc";
    }
    if (!p.contact?.phone?.trim()) {
      errors.phone = "Số điện thoại là bắt buộc";
    }

    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors, acceptedKeys: keys }, { status: 400 });
    }
    return NextResponse.json({ ok: true, key, acceptedKeys: keys });
  } catch (err) {
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
