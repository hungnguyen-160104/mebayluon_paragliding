// app/api/cron/camera-snap/route.ts
import { NextResponse } from "next/server";

import { CAM_IDS, CAM_PEAK_SHOTS_PER_MIN, CAMERAS, inCamActiveHours, inCamPeak, isCamId, shouldSnapNow, vnHHMM, type CamId } from "@/lib/imou/cameras";
import { ImouError, checkDeviceBind, deviceOnline, imouConfigured, snapWithAutoBind, waitSnapReady } from "@/lib/imou/client";
import { camBindCode, camChannel, camSerial } from "@/lib/imou/defaults.server";
import { cleanupLegacySnaps, ensureSnapIndex, pruneSnaps, saveSnap } from "@/lib/imou/snaps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Một lượt chụp: chụp (≤15s) + chờ link ảnh dùng được (≤~20s) + ghi MongoDB ≤ 55s.
 * Giờ cao điểm có 3 lượt bắt đầu ở giây 0, 20, 40 (chủ 04/10: 3 ảnh/phút) →
 * lượt cuối xong chậm nhất ≈ 40 + 55 = 95s, nên cho 120s.
 */
export const maxDuration = 120;

/**
 * CHỤP ẢNH CAMERA (Viên Nam bãi cất + bãi hạ; Khau Phạ từ 03/10/2026) — 05:30–19:30 giờ VN (chủ 01/10; trước 08:00–18:00) (chủ 30/09/2026): 3 ảnh/phút (chủ 04/10)
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
 * NHIỀU CAMERA (03/10/2026, thêm bãi cất Khau Phạ): không có `?cam` thì chụp
 * MỌI camera trong CAMERAS song song (Promise.allSettled) — camera này hỏng/mất
 * 4G không chặn camera kia, mỗi máy có hạn giờ riêng dưới maxDuration. Trả kết
 * quả theo từng camera trong `results`.
 *
 * `?cam=<id>` chỉ chụp một camera (trả như cũ); `?force=1` (chỉ khi có key) chụp
 * cả ngoài giờ để thử; `?info=1` (chỉ khi có key) KHÔNG chụp, chỉ hỏi Imou trạng
 * thái gắn + danh sách kênh của từng camera (deviceOnline) — để biết máy hai ống
 * kính dùng kênh "0" hay "1".
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

  const camParam = url.searchParams.get("cam");
  if (camParam && !isCamId(camParam)) return NextResponse.json({ message: "Không có camera này" }, { status: 404 });
  const cams: CamId[] = camParam ? [camParam as CamId] : CAM_IDS;

  // Chỉ hỏi thông tin thiết bị (kênh), không chụp — chỉ chủ gọi tay
  if (goiTay && url.searchParams.get("info") === "1") {
    if (!imouConfigured()) return NextResponse.json({ ok: false, skip: "chưa khai IMOU_APP_ID / IMOU_APP_SECRET" }, { status: 503 });
    const results = await Promise.all(cams.map((cam) => withBudget(deviceInfo(cam), cam)));
    return NextResponse.json({ ok: true, results });
  }

  const now = new Date();
  const force = goiTay && url.searchParams.get("force") === "1";
  if (!force && !inCamActiveHours(now)) {
    return NextResponse.json({ ok: true, skip: "ngoài giờ chụp 05:30–19:30", vn: vnHHMM(now) });
  }
  /** Ngoài 10:00–15:00 chỉ chụp 3 phút/lần — xem shouldSnapNow (chủ 01/10). */
  if (!force && !shouldSnapNow(now)) {
    return NextResponse.json({ ok: true, skip: "ngoài giờ cao điểm: 3 phút/lần", vn: vnHHMM(now) });
  }

  // Một camera (?cam=): giữ nguyên dạng trả lời + mã HTTP như trước
  if (camParam) {
    const r = await withBudget(snapOne(cams[0], now), cams[0]);
    return NextResponse.json(r, { status: r.status });
  }

  /**
   * 3 ẢNH/PHÚT giờ cao điểm (chủ 04/10, mọi camera — bãi cất và bãi hạ): lịch
   * Vercel nhỏ nhất là mỗi phút, nên trong một lượt gọi chụp thêm ở giây 20 và 40.
   * Mỗi lượt chụp là một vòng riêng — vòng này chậm/hỏng không chặn vòng sau.
   */
  const rounds = force || !inCamPeak(now) ? 1 : CAM_PEAK_SHOTS_PER_MIN;
  const gapMs = 60_000 / CAM_PEAK_SHOTS_PER_MIN;
  const roundResults = await Promise.all(
    Array.from({ length: rounds }, async (_, k) => {
      if (k) await new Promise((r) => setTimeout(r, k * gapMs));
      const at = k ? new Date() : now;
      const settled = await Promise.allSettled(cams.map((cam) => withBudget(snapOne(cam, at), cam)));
      return settled.map((s, i) =>
        s.status === "fulfilled"
          ? s.value
          : { ok: false, cam: cams[i], code: "ERR", message: String(s.reason), status: 502 },
      );
    }),
  );
  const results = roundResults.flat();
  // Lịch chỉ báo lỗi khi KHÔNG camera nào chụp được vì lỗi thật — camera chưa
  // cấu hình / mất 4G (DV1007) không làm đỏ lịch mỗi phút
  const anyOk = results.some((r) => r.ok);
  const hardFail = results.some((r) => !r.ok && r.status >= 500 && r.status !== 503);
  const status = anyOk || !hardFail ? 200 : 502;
  return NextResponse.json({ ok: anyOk, vn: vnHHMM(now), results }, { status });
}

type SnapResult = { ok: boolean; cam: CamId; status: number; [k: string]: unknown };

/** Mỗi camera tối đa 55 giây — dưới maxDuration 60, để kịp trả kết quả các máy khác. */
const CAM_BUDGET_MS = 55_000;

function withBudget<T extends { ok: boolean }>(p: Promise<T>, cam: CamId): Promise<T | SnapResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<SnapResult>((resolve) => {
    timer = setTimeout(
      () => resolve({ ok: false, cam, code: "TIMEOUT", message: `Quá ${CAM_BUDGET_MS / 1000}s`, status: 504 }),
      CAM_BUDGET_MS,
    );
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Khoá theo serial: lệnh chụp của các kênh cùng một máy xếp hàng nối đuôi nhau
 * (chỉ bước setDeviceSnapEnhanced/bindDevice — bước chờ link ảnh vẫn song song).
 * Sống trong một lượt gọi route; lượt sau là lambda/tiến trình mới cũng không sao.
 */
const deviceQueue = new Map<string, Promise<unknown>>();
function perDevice<T>(sn: string, fn: () => Promise<T>): Promise<T> {
  const prev = deviceQueue.get(sn) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  deviceQueue.set(sn, tail);
  void tail.then(() => {
    if (deviceQueue.get(sn) === tail) deviceQueue.delete(sn);
  });
  return run;
}

/** Chụp một camera → ghi link vào MongoDB → dọn bản ghi cũ. Không bao giờ ném lỗi. */
async function snapOne(cam: CamId, now: Date): Promise<SnapResult> {
  const cfg = CAMERAS[cam];
  const sn = camSerial(cam);
  if (!imouConfigured() || !sn) {
    return {
      ok: false,
      cam,
      skip: !imouConfigured() ? "camera chưa cấu hình (thiếu IMOU_APP_ID / IMOU_APP_SECRET)" : `camera chưa cấu hình (thiếu ${cfg.snEnv})`,
      status: 503,
    };
  }

  const t0 = Date.now();
  try {
    // Hai kênh của CÙNG một máy (Khau Phạ mắt 1 + mắt 2) gọi chụp LẦN LƯỢT —
    // máy 4G nhận hai lệnh chụp cùng lúc dễ trả lỗi bận; máy khác vẫn song song
    const { url: snapUrl, bound } = await perDevice(sn, () => snapWithAutoBind(sn, camChannel(cam), camBindCode(cam)));
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
    return {
      ok: true,
      cam,
      vn: vnHHMM(now),
      bound,
      tries: ready.attempts,
      url: shot.url,
      pruned,
      ...(legacyCleaned ? { legacyCleaned } : {}),
      ms: Date.now() - t0,
      status: 200,
    };
  } catch (err) {
    const code = err instanceof ImouError ? err.code : "ERR";
    let msg = err instanceof Error ? err.message : String(err);
    // Chưa gắn vào tài khoản dev mà chưa có mã an toàn → nói rõ phải khai biến nào
    if (code === "NOCODE") msg = `Camera chưa gắn vào tài khoản dev Imou — cần khai ${cfg.codeEnv} trên Vercel`;
    console.error(`GET /api/cron/camera-snap [${cam}] error:`, msg);
    // DV1007 = camera mất mạng (4G yếu) — báo 200 để lịch không đánh dấu lỗi liên tục
    const status = code === "DV1007" ? 200 : code === "NOCODE" ? 503 : 502;
    return { ok: false, cam, code, message: msg, ms: Date.now() - t0, status };
  }
}

/** Trạng thái gắn + danh sách kênh của một camera (deviceOnline). Không ném lỗi. */
async function deviceInfo(cam: CamId): Promise<SnapResult> {
  const sn = camSerial(cam);
  if (!sn) return { ok: false, cam, skip: `thiếu ${CAMERAS[cam].snEnv}`, status: 503 };
  const out: SnapResult = { ok: true, cam, deviceId: sn, channelInUse: camChannel(cam), status: 200 };
  try {
    out.bind = await checkDeviceBind(sn);
  } catch (e) {
    out.ok = false;
    out.bindError = e instanceof Error ? e.message : String(e);
  }
  try {
    const d = await deviceOnline(sn);
    out.onLine = d.onLine;
    out.channels = d.channels ?? [];
  } catch (e) {
    out.ok = false;
    out.channelsError = e instanceof Error ? e.message : String(e);
  }
  return out;
}
