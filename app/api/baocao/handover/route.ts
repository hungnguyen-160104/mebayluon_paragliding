// app/api/baocao/handover/route.ts
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

/**
 * Cả "admin" cũng phải vào được: thẻ "Lập lệnh chuyển tiền" ở /baocao/admin
 * đọc danh sách người nhận từ chính GET này — thiếu admin là ô chọn nhân sự
 * trống trơn (lỗi đã xảy ra thật). Quản trị cũng giao/nhận tiền như mọi người.
 */
/**
 * Vai được LẬP LỆNH TIỀN (nộp tiền cho quản lý, xin ứng tiền).
 *
 * "cafe" thêm vào 06/09: người trực quầy cầm tiền mặt bán hàng cả ngày, đúng
 * như điều phối cầm tiền vé — thiếu vai này thì khung nộp tiền trên trang báo
 * cáo quầy hiện ra nhưng bấm vào là bị chặn 403.
 */
const STAFF_ROLES = ["pilot", "dispatcher", "counter", "cameraman", "cafe", "accountant", "admin"] as const;

/**
 * Nhân sự đưa tiền cho quản lý/giám đốc.
 *
 * GET  -> tiền đang giữ · lệnh mình đã gửi (giao tiền + ứng tiền) · lệnh gửi
 *         CHO MÌNH · danh sách người nhận tiền và người duyệt ứng tiền
 * POST -> gửi một lệnh: đưa tiền (kind "handover") hoặc xin ứng tiền
 *         (kind "advance"), tự chọn người xử lý
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
    const [balance, handovers, incoming, recipients, approvers] = await Promise.all([
      getCashOnHand(auth, spot),
      listMyHandovers(auth, spot),
      listIncomingHandovers(auth, spot),
      listHandoverRecipients(auth, spot, "handover"),
      listHandoverRecipients(auth, spot, "advance"),
    ]);
    return NextResponse.json({ spot, balance, handovers, incoming, recipients, approvers });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("GET /api/baocao/handover error:", err);
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
    console.error("POST /api/baocao/handover error:", err);
    return NextResponse.json({ message: "Không ghi được khoản tiền" }, { status: 500 });
  }
}
