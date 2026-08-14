// app/api/baocao/ota/log/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { listOtaEmails, resolveOtaEmail } from "@/services/baobay-ota.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["dispatcher", "counter", "accountant", "admin"] as const;

/** GET ?spot= — thư OTA gần đây (để theo dõi và soát thư máy chưa hiểu). */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  return NextResponse.json({ emails: await listOtaEmails(spot) });
}

/** PATCH { id } — đánh dấu thư đã soát xong, bỏ khỏi khay. */
export async function PATCH(req: Request) {
  const auth = requireBaobay(req, { roles: [...ROLES], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id thư" }, { status: 400 });

  await resolveOtaEmail(id);
  return NextResponse.json({ ok: true });
}
