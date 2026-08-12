// app/api/admin/baocao/settings/route.ts
import { NextResponse } from "next/server";

import { resolveSpot } from "@/lib/baobay/request-spot";
import { SPOTS } from "@/lib/baobay/spots";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getSpotSetting, isFullAdmin, updateSpotSetting } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cấu hình RIÊNG cho từng điểm bay: giờ chốt báo cáo và bảng Google Sheets.
 *
 * GET  (không tham số) -> cấu hình của MỌI điểm admin được chỉ định
 * GET  ?spot=…         -> cấu hình một điểm
 * PUT  ?spot=…         -> đổi giờ chốt / đường dẫn webhook / mã bảo vệ
 *
 * Đổi giờ có hiệu lực NGAY: máy chủ đọc giá trị mới nhất mỗi lần phi công bấm
 * chốt, không cache. Mã bảo vệ không bao giờ trả nguyên văn về trình duyệt.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const asked = new URL(req.url).searchParams.get("spot");

  // Không nêu điểm nào thì trả cả danh sách — trang quản trị hiện mỗi điểm một thẻ.
  const spotIds = asked
    ? [asked]
    : auth.viaAdmin
      ? SPOTS.map((s) => s.id)
      : auth.spots;

  const canEdit = isFullAdmin(auth);

  const settings = await Promise.all(
    spotIds.map(async (id) => {
      const s = await getSpotSetting(id);
      return {
        spot: s.spot,
        submitDeadline: s.submitDeadline,
        sheetWebhookUrl: s.sheetWebhookUrl,
        /** Chỉ báo ĐÃ ĐẶT hay chưa — không trả mã bảo vệ ra ngoài. */
        hasSheetSecret: Boolean(s.sheetSecret),
      };
    }),
  );

  /** `canEdit` để trang quản trị ẩn nút Lưu với cấp 2, máy chủ vẫn chặn lần nữa. */
  return NextResponse.json({ settings, canEdit });
}

export async function PUT(req: Request) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const body = await req.json().catch(() => ({}));

  if (!isFullAdmin(auth)) {
    return NextResponse.json(
      { message: "Quản trị cấp 2 không được đổi cấu hình điểm bay" },
      { status: 403 },
    );
  }

  const result = await updateSpotSetting(
    spot,
    {
      submitDeadline: body?.submitDeadline !== undefined ? String(body.submitDeadline) : undefined,
      sheetWebhookUrl: body?.sheetWebhookUrl !== undefined ? String(body.sheetWebhookUrl) : undefined,
      sheetSecret: body?.sheetSecret !== undefined ? String(body.sheetSecret) : undefined,
    },
    auth.username,
    auth,
  );

  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  const saved = await getSpotSetting(spot);
  return NextResponse.json({
    spot: saved.spot,
    submitDeadline: saved.submitDeadline,
    sheetWebhookUrl: saved.sheetWebhookUrl,
    hasSheetSecret: Boolean(saved.sheetSecret),
  });
}
