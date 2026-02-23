// app/api/notify-gmail/route.ts
import { NextResponse } from "next/server";
import { postNotifyGmail } from "@/services/gmail.service";

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

    const result = await postNotifyGmail(payload);

    // Theo mục tiêu: mail lỗi không fail booking
    // - Nếu payload hợp lệ thì trả 200 ok:true (errors nằm trong gmail.results)
    // - Nếu payload invalid thì trả 400
    return NextResponse.json(
      { ok: result.ok, gmail: result.results },
      { status: result.ok ? 200 : 400 }
    );
  } catch (err: any) {
    console.error("POST /api/notify-gmail error:", err);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}