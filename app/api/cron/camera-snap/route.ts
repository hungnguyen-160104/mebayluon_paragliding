// app/api/cron/camera-snap/route.ts
import { NextResponse } from "next/server";

import { CAMERAS, inCamActiveHours, isCamId, shouldSnapNow, vnHHMM, type CamId } from "@/lib/imou/cameras";
import { ImouError, imouConfigured, snapWithAutoBind, waitSnapReady } from "@/lib/imou/client";
import { cleanupLegacySnaps, ensureSnapIndex, pruneSnaps, saveSnap } from "@/lib/imou/snaps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Chụp (≤15s) + chờ link ảnh dùng được (≤~20s) + ghi MongoDB — dưới 60s */
export const maxDuration = 60;

/**
 * CHỤP ẢNH CAMERA BÃI CAO VIÊN NAM — 05:30–19:30 giờ VN (chủ 01/10; trước 08:00–18:00) (chủ 30/09/2026): 1 ảnh/phút
 * 10:00–15:00, 3 phút/ảnh 08–10h và 15–18h (chủ 01/10).
 *
 * Ai gọi: Vercel cron trong vercel.json ("* 0-12,22-23 * * *" = mỗi phút 05–19h59 VN, route tự bỏ phút ngoài 05:30–19:30; gói
 * Pro), kèm `Authorization: Bearer <CRON_SECRET>` — đây là lịch DUY NHẤT (Cloudflare
 * Worker trong scripts/ không deploy). Gọi tay thì `?key=`.
 *
 * Luồng: ngoài giờ → skip. Trong giờ: setDeviceSnapEnhanced (tự bindDevice
 * một lần nếu Imou báo chưa gắn) → chờ link ảnh Imou mở được (chỉ đọc 1 KB đầu)
 * → ghi { cam, url, takenAt } vào MongoDB → xoá bản ghi cũ hơn 90 phút.
 *
 * KHÔNG LƯU ẢNH (chủ 01/10/2026): không tải ảnh về, không đẩy Cloudinary — link
 * Imou sống 7 ngày, trình duyệt tải thẳng từ Imou nên web không đầy dung lượng
 * và không tốn băng thông ảnh. Còn bản ghi kiểu cũ (ảnh Cloudinary) thì dọn một lần.
 *
 * `?cam=vien-nam` (mặc định) chọn camera; `?force=1` (chỉ khi có key) chụp cả ngoài giờ để thử.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  /**
   * Cùng cách với /api/cron/thoi-tiet-mail: dự án chưa khai CRON_SECRET thì nhận
   * lời gọi của Vercel Cron qua header `x-vercel-cron-schedule`; có CRON_SECRET
   * thì bắt buộc Bearer (hoặc `?key=` khi gọi tay). Trước đây thiếu CRON_SECRET
   * là trả 503 nên lịch chạy mỗi phút mà không chụp ảnh nào.
   */
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const key = url.searchParams.get("key") ?? "";
  const goiTay = !!secret && key === secret;
  const laCron = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : req.headers.get("x-vercel-cron-schedule") !== null;
  if (!laCron && !goiTay) return NextResponse.json({ message: "Không có quyền" }, { status: 401 });

  const camParam = url.searchParams.get("cam") || "vien-nam";
  if (!isCamId(camParam)) return NextResponse.json({ message: "Không có camera này" }, { status: 404 });
  const cam: CamId = camParam;
  const cfg = CAMERAS[cam];

  const now = new Date();
  const force = goiTay && url.searchParams.get("force") === "1";
  if (!force && !inCamActiveHours(now)) {
    return NextResponse.json({ ok: true, skip: "ngoài giờ chụp 05:30–19:30", vn: vnHHMM(now) });
  }
  /** Ngoài 10:00–15:00 chỉ chụp 3 phút/lần — xem shouldSnapNow (chủ 01/10). */
  if (!force && !shouldSnapNow(now)) {
    return NextResponse.json({ ok: true, skip: "ngoài giờ cao điểm: 3 phút/lần", vn: vnHHMM(now) });
  }

  const sn = (process.env[cfg.snEnv] || "").trim();
  if (!imouConfigured() || !sn) {
    return NextResponse.json({ ok: false, skip: "camera chưa cấu hình" }, { status: 503 });
  }

  const t0 = Date.now();
  try {
    const { url: snapUrl, bound } = await snapWithAutoBind(sn, cfg.channelId, (process.env[cfg.codeEnv] || "").trim());
    const ready = await waitSnapReady(snapUrl);
    const shot = await saveSnap(cam, snapUrl, now);
    await ensureSnapIndex();
    // Dọn bản ghi cũ không được làm hỏng lượt chụp
    const pruned = await pruneSnaps(cam).catch((e) => {
      console.warn("[camera-snap] dọn bản ghi cũ lỗi:", e instanceof Error ? e.message : e);
      return 0;
    });
    const legacyCleaned = await cleanupLegacySnaps(cam).catch((e) => {
      console.warn("[camera-snap] dọn ảnh Cloudinary kiểu cũ lỗi:", e instanceof Error ? e.message : e);
      return 0;
    });
    return NextResponse.json({
      ok: true,
      cam,
      vn: vnHHMM(now),
      bound,
      tries: ready.attempts,
      url: shot.url,
      pruned,
      ...(legacyCleaned ? { legacyCleaned } : {}),
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
