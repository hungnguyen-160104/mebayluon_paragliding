// app/api/baobay/handover/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { firstZodMessage, handoverSchema } from "@/lib/baobay/validation";
import { requireBaobay } from "@/middlewares/requireBaobay";
import {
  BaobayError,
  createHandover,
  getCashOnHand,
  listHandoverRecipients,
  listIncomingHandovers,
  listMyHandovers,
} from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 30 giây — ghi xong còn đẩy sang Apps Script, xem lib/baobay/sheet.ts. */
export const maxDuration = 30;

const STAFF_ROLES = ["pilot", "dispatcher", "cameraman", "accountant"] as const;

/**
 * Nhân sự đưa tiền cho quản lý/giám đốc.
 *
 * GET  -> tiền đang giữ · các lần mình đã đưa · tiền người khác giao CHO MÌNH ·
 *         danh sách người có thể nhận tiền ở điểm bay đó
 * POST -> khai một lần đưa tiền, tự chọn người nhận (người đó xác nhận sau)
 *
 * Không chặn theo ngày đã chốt: đưa tiền không phải sửa số liệu của ngày, và
 * tiền của hôm trước hay đưa muộn vài hôm là chuyện thường.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: [...STAFF_ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  try {
    const [balance, handovers, incoming, recipients] = await Promise.all([
      getCashOnHand(auth, spot),
      listMyHandovers(auth, spot),
      listIncomingHandovers(auth, spot),
      listHandoverRecipients(auth, spot),
    ]);
    return NextResponse.json({ spot, balance, handovers, incoming, recipients });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("GET /api/baobay/handover error:", err);
    return NextResponse.json({ message: "Không tải được tiền đang giữ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireBaobay(req, { roles: [...STAFF_ROLES] });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));
  const parsed = handoverSchema.safeParse({ ...body, spot });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  try {
    const handover = await createHandover(auth, parsed.data);
    // Trả luôn số dư mới để màn hình trừ tiền ngay, khỏi gọi thêm một vòng
    const balance = await getCashOnHand(auth, spot);
    return NextResponse.json({ handover, balance });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("POST /api/baobay/handover error:", err);
    return NextResponse.json({ message: "Không ghi được khoản tiền" }, { status: 500 });
  }
}
