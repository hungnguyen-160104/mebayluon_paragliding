// app/api/notify-telegram/route.ts
import { NextResponse } from "next/server";
import { postNotifyTelegram } from "@/services/telegram.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
    }

    const { payload } = body;
    if (!payload) {
      return NextResponse.json({ ok: false, message: "Missing payload" }, { status: 400 });
    }

    const result = await postNotifyTelegram(payload);
    return NextResponse.json(
      { ok: result.ok, telegram: result.results },
      { status: result.ok ? 200 : 500 }
    );
  } catch (err: any) {
    console.error("POST /api/notify-telegram error:", err);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
