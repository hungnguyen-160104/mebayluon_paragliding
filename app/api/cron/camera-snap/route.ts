// app/api/cron/camera-snap/route.ts
import { NextResponse } from "next/server";

import { CAMERAS, inCamActiveHours, isCamId, vnHHMM, type CamId } from "@/lib/imou/cameras";
import { ImouError, downloadSnap, imouConfigured, snapWithAutoBind } from "@/lib/imou/client";
import { ensureSnapIndex, pruneSnaps, storeSnap } from "@/lib/imou/snaps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Chụp (≤15s) + chờ ảnh (≤~20s) + Cloudinary (≤20s) — vẫn dưới 60s */
export const maxDuration = 60;

/**
 * CHỤP ẢNH CAMERA BÃI CAO VIÊN NAM — 1 ảnh/phút, 08:00–18:00 giờ VN (chủ 30/09/2026).
 *
 * Ai gọi: Cloudflare Worker (scripts/cloudflare-camera-cron/) mỗi phút, kèm
 * `Authorization: Bearer <CRON_SECRET>`; gọi tay/scheduler ngoài thì `?key=`.
 * KHÔNG khai trong vercel.json — gói Hobby không cho cron mỗi phút, deploy sẽ lỗi.
 *
 * Luồng: ngoài giờ → skip. Trong giờ: setDeviceSnapEnhanced (tự bindDevice
 * một lần nếu Imou báo chưa gắn) → chờ URL ảnh tải được → Cloudinary (thu về
 * 1280px JPEG q70 + thumbnail) → ghi danh mục MongoDB → xoá ảnh cũ hơn 90 phút.
 *
 * `?cam=vien-nam` (mặc định) chọn camera; `?force=1` (chỉ khi có key) chụp cả ngoài giờ để thử.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return NextResponse.json({ message: "Chưa khai CRON_SECRET" }, { status: 503 });
  const key = url.searchParams.get("key") ?? "";
  const ok = req.headers.get("authorization") === `Bearer ${secret}` || key === secret;
  if (!ok) return NextResponse.json({ message: "Không có quyền" }, { status: 401 });

  const camParam = url.searchParams.get("cam") || "vien-nam";
  if (!isCamId(camParam)) return NextResponse.json({ message: "Không có camera này" }, { status: 404 });
  const cam: CamId = camParam;
  const cfg = CAMERAS[cam];

  const now = new Date();
  const force = url.searchParams.get("force") === "1";
  if (!force && !inCamActiveHours(now)) {
    return NextResponse.json({ ok: true, skip: "ngoài giờ chụp 08:00–18:00", vn: vnHHMM(now) });
  }

  const sn = (process.env[cfg.snEnv] || "").trim();
  if (!imouConfigured() || !sn) {
    return NextResponse.json({ ok: false, skip: "camera chưa cấu hình" }, { status: 503 });
  }

  const t0 = Date.now();
  try {
    const { url: snapUrl, bound } = await snapWithAutoBind(sn, cfg.channelId, (process.env[cfg.codeEnv] || "").trim());
    const jpeg = await downloadSnap(snapUrl);
    const shot = await storeSnap(cam, jpeg, now);
    await ensureSnapIndex();
    // Dọn ảnh cũ không được làm hỏng lượt chụp
    const pruned = await pruneSnaps(cam).catch((e) => {
      console.warn("[camera-snap] dọn ảnh cũ lỗi:", e instanceof Error ? e.message : e);
      return 0;
    });
    return NextResponse.json({
      ok: true,
      cam,
      vn: vnHHMM(now),
      bound,
      bytes: jpeg.length,
      url: shot.url,
      pruned,
      ms: Date.now() - t0,
    });
  } catch (err) {
    const code = err instanceof ImouError ? err.code : "ERR";
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/cron/camera-snap error:", msg);
    // DV1007 = camera mất mạng (4G yếu) — báo 200 để lịch không đánh dấu lỗi liên tục
    const status = code === "DV1007" ? 200 : 502;
    return NextResponse.json({ ok: false, cam, code, message: msg, ms: Date.now() - t0 }, { status });
  }
}
