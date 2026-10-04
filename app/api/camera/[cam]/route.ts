// app/api/camera/[cam]/route.ts
import { NextResponse } from "next/server";

import { CAM_ACTIVE, inCamActiveHours, isCamId, type CamFeed } from "@/lib/imou/cameras";
import { imouConfigured } from "@/lib/imou/client";
import { camSerial } from "@/lib/imou/defaults.server";
import { listSnaps } from "@/lib/imou/snaps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ẢNH CAMERA BÃI CẤT cho trang /baobay: ảnh mới nhất + ảnh 60 phút gần nhất
 * (MỚI → CŨ), mỗi ảnh chỉ { url, takenAt } — `url` là link ảnh của Imou, web
 * không giữ bản sao (chủ 01/10/2026). Công khai, chỉ đọc danh mục MongoDB.
 * Cache CDN 30 giây: trang tự làm mới mỗi 60s, bao nhiêu người xem cũng chỉ
 * chạm cơ sở dữ liệu vài lần mỗi phút.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ cam: string }> }) {
  const { cam } = await params;
  if (!isCamId(cam)) return NextResponse.json({ message: "Không có camera này" }, { status: 404 });

  const now = new Date();
  const base: CamFeed = {
    configured: imouConfigured() && Boolean(camSerial(cam)),
    activeHours: {
      from: CAM_ACTIVE.label.slice(0, 5),
      to: CAM_ACTIVE.label.slice(-5),
      tz: "Asia/Ho_Chi_Minh",
      active: inCamActiveHours(now),
    },
    now: now.toISOString(),
    latest: null,
    items: [],
  };
  const headers = { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" };
  if (!base.configured) return NextResponse.json(base, { headers });

  try {
    const { latest, items } = await listSnaps(cam);
    return NextResponse.json({ ...base, latest, items } satisfies CamFeed, { headers });
  } catch (err) {
    console.error("GET /api/camera/[cam] error:", err instanceof Error ? err.message : err);
    // Lỗi đọc danh mục: trả khung rỗng (trang hiện "mất kết nối"), không cache lâu
    return NextResponse.json(base, { headers: { "Cache-Control": "public, s-maxage=5" } });
  }
}
