// app/api/baocao/handover/confirm/route.ts
import { NextResponse } from "next/server";

import { requireBaobay } from "@/middlewares/requireBaobay";
import { confirmHandover } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 giây — xác nhận xong còn ghi lại trạng thái sang Apps Script. */
export const maxDuration = 30;

/**
 * Người NHẬN tiền bấm xác nhận đã cầm, hoặc từ chối kèm lý do.
 *
 * POST { id, reject?: "lý do" }
 *
 * Mở cho mọi vai trò vì ai cũng có thể là người nhận (giám đốc, kế toán, điều
 * phối); máy chủ mới là chỗ kiểm khoản đó có đúng gửi cho mình hay không.
 * Từ chối thì tiền được cộng trả lại vào số người giao đang giữ.
 */
export async function POST(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const reject = String(body?.reject ?? "").trim();

  if (!id) return NextResponse.json({ message: "Thiếu mã khoản tiền" }, { status: 400 });

  const result = await confirmHandover(
    id,
    { username: auth.username, role: auth.role, viaAdmin: auth.viaAdmin },
    reject || undefined,
  );
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, handover: result.handover });
}
