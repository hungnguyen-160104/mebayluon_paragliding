// app/api/baocao/collect/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { collectSchema, firstZodMessage } from "@/lib/baobay/validation";
import { wearsRole } from "@/lib/baobay/roles";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, createCollect, editCollect, listCollects, removeCollect, resolveCollect } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LỆNH THU TIỀN — kế toán/điều phối chốt lịch với khách rồi:
 *  - Tiền mặt: chỉ định NGƯỜI THU; người đó bấm "Đã thu tiền" / "Từ chối".
 *  - Chuyển khoản: tích TK CÔNG TY + mã CK — ghi nhận xong ngay.
 *
 * GET          -> { assigned (chờ mình thu), created (mình đã lập) }
 * POST         -> lập lệnh
 * PATCH {id, collected, reason?} -> người thu xác nhận / từ chối
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  return NextResponse.json(await listCollects(auth, spot));
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: ["dispatcher", "accountant", "admin"] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = collectSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const collect = await createCollect(auth, parsed.data);
    return NextResponse.json({ collect }, { status: 201 });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baocao/collect error:", err);
    return NextResponse.json({ message: "Không lập được lệnh thu" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireBaobay(req);
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ message: "Thiếu id lệnh thu" }, { status: 400 });

  try {
    // KẾ TOÁN XOÁ khoản thu ghi TRÙNG/nhầm — xoá mềm, tiền booking trả về như chưa thu
    if (body?.action === "remove") {
      if (!(wearsRole(auth, "accountant") || wearsRole(auth, "admin") || (auth as { viaAdmin?: boolean }).viaAdmin)) {
        return NextResponse.json({ message: "Chỉ kế toán/quản trị mới xoá được khoản thu" }, { status: 403 });
      }
      const collect = await removeCollect(auth, spot, id, String(body?.reason ?? ""));
      return NextResponse.json({ collect });
    }
    // KẾ TOÁN SỬA khoản thu (chia bill nhầm, đổi người thu, sai mã CK)
    if (body?.action === "edit") {
      if (!(wearsRole(auth, "accountant") || wearsRole(auth, "admin") || (auth as { viaAdmin?: boolean }).viaAdmin)) {
        return NextResponse.json({ message: "Chỉ kế toán/quản trị mới sửa được khoản thu" }, { status: 403 });
      }
      const collect = await editCollect(auth, spot, id, {
        amount: body?.amount == null ? undefined : Number(body.amount),
        method: body?.method === "cash" || body?.method === "transfer" ? body.method : undefined,
        transferCode: body?.transferCode == null ? undefined : String(body.transferCode),
        collectorUsername: body?.collectorUsername == null ? undefined : String(body.collectorUsername),
      });
      return NextResponse.json({ collect });
    }
    const collect = await resolveCollect(auth, spot, id, body?.collected !== false, String(body?.reason ?? ""));
    return NextResponse.json({ collect });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("PATCH /api/baocao/collect error:", err);
    return NextResponse.json({ message: "Không xử lý được lệnh thu" }, { status: 500 });
  }
}
