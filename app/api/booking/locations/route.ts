import { NextResponse } from "next/server";
import spots from "@/data/spots.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED_KEYS_ENV = (process.env.BOOKING_ACCEPTED_KEYS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function acceptedKeys(): string[] {
  return ACCEPTED_KEYS_ENV.length ? ACCEPTED_KEYS_ENV : Object.keys(spots as Record<string, string>);
}
const displayName = (k: string) => (spots as Record<string, string>)[k] || k;

export async function GET() {
  try {
    const keys = acceptedKeys();
    const items = keys.map(key => ({ key, name: displayName(key) }));
    return NextResponse.json(
      { ok: true, items },
      { status: 200, headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
