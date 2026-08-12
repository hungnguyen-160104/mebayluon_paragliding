// app/api/baocao/review/route.ts
import { NextResponse } from "next/server";

import { isDateKey } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  createReviewRequest,
  listReviewRequests,
  resolveReviewRequest,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS = new Set(["flycam", "video360", "redFlag", "flagFlight", "general"]);

/**
 * Lệnh "yêu cầu soát lại" — kế toán thấy hai nguồn lệch nhau thì gửi lệnh cho
 * đúng các vai trò liên quan kiểm tra lại.
 *
 * GET   ?date=          -> nhân sự: lệnh CÒN TREO nhắm vào vai trò mình;
 *                          kế toán/quản trị: mọi lệnh của ngày (cả đã xử lý)
 * POST  {date, topic, note}   -> kế toán tạo/cập nhật lệnh (một lệnh mỗi chủ đề mỗi ngày)
 * PATCH {id}                  -> kế toán đánh dấu đã xử lý
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const date = new URL(req.url).searchParams.get("date") || "";
  if (!isDateKey(date)) {
    return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  }

  const isOverseer = auth.viaAdmin || auth.role === "accountant" || auth.role === "admin";
  const reviews = await listReviewRequests(spot, date, isOverseer ? undefined : auth.role);
  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const date = String(body?.date ?? "");
  const topic = String(body?.topic ?? "general");
  const note = String(body?.note ?? "");

  if (!isDateKey(date)) return NextResponse.json({ message: "Ngày không hợp lệ" }, { status: 400 });
  if (!TOPICS.has(topic)) return NextResponse.json({ message: "Chủ đề không hợp lệ" }, { status: 400 });

  try {
    const review = await createReviewRequest(auth, spot, date, topic as never, note);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/review error:", err);
    return NextResponse.json({ message: "Không gửi được yêu cầu" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu mã lệnh" }, { status: 400 });

  const result = await resolveReviewRequest(auth, id);
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
