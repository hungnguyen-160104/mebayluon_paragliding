"use client";

/**
 * KHUNG CAMERA BÃI CẤT trên trang /baobay (chủ 30/09/2026; tiết kiệm băng thông 01/10).
 *
 * Mặc định CHỈ tải 1 ảnh mới nhất. Bên dưới là thanh trượt thời gian 60 phút
 * (◀ ▶ + mốc giờ bằng chữ): kéo tới đâu, dừng tay ~0,3s mới tải ảnh đó, và chỉ
 * tải trước 1 ảnh kế tiếp. "Chạy timelapse" mở ô phóng to, tải TUẦN TỰ từng ảnh
 * (ảnh này hiện xong mới sang ảnh sau), dừng khi đóng ô.
 *
 * Ảnh tải thẳng từ link Imou (sống 7 ngày) — web không lưu ảnh nào. Link hỏng/
 * hết hạn → ẩn ảnh đó, hiện chữ nhỏ.
 *
 * Tự chứa: chỉ cần `<CameraGallery cam="vien-nam" />`. Chiều cao CỐ ĐỊNH ở mọi
 * trạng thái (khung ảnh 16:9 + hàng điều khiển cao cố định) để trang không nhảy.
 * Chưa lướt tới thì chưa gọi API; tự làm mới 60s khi khung trên màn hình + tab mở.
 *
 * Trạng thái:
 *  - chưa khai env Imou   → "Camera chưa kết nối"
 *  - ngoài 05:30–19:30    → "Camera nghỉ (chụp 05:30–19:30)" (vẫn cho xem ảnh cuối nếu có)
 *  - trong giờ mà ảnh mới nhất cũ hơn CAM_STALE_MINUTES (10 phút; ngoài 10–15h
 *    chụp 3 phút/ảnh) → "Camera tạm mất kết nối"
 */

import { useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { Scrubber, TX, agoText, useCamFeed, useInView, useNow, useTimeline, type Txt } from "@/components/baobay/camera-timeline";
import { useLanguage } from "@/contexts/language-context";
import { CAM_STALE_MINUTES, CAMERAS, vnHHMM, type CamId, type CamShot } from "@/lib/imou/cameras";

/** Một điểm trên thanh thời gian = một ảnh */
type Pt = { at: string; shot: CamShot };
const urlsOf = (p: Pt) => [p.shot.url];

export default function CameraGallery({ cam }: { cam: CamId }) {
  const { language } = useLanguage();
  const vi = language === "vi";
  const L = useCallback((t: Txt) => (vi ? t.vi : t.en), [vi]);
  const cfg = CAMERAS[cam];

  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef);
  const { feed, failed, fetchedAt } = useCamFeed(cam, visible);
  const now = useNow(fetchedAt);

  /** Ảnh theo thứ tự CŨ → MỚI cho thanh trượt/timelapse */
  const chron = useMemo<Pt[]>(
    () => (feed?.items ? [...feed.items].reverse().map((shot) => ({ at: shot.takenAt, shot })) : []),
    [feed],
  );
  const latest = feed?.latest ?? null;
  const tl = useTimeline(chron, urlsOf, visible);
  const {
    selIdx,
    curIdx,
    lastIdx,
    sliderIdx,
    viewingPast,
    goTo,
    zoomOpen,
    setZoomOpen,
    closeZoom,
    playing,
    setPlaying,
    startTimelapse,
  } = tl;

  const shown: CamShot | null = selIdx >= 0 ? chron[selIdx].shot : latest;
  const sliderShot = tl.sliderPoint?.shot ?? shown;
  const shownBroken = shown ? tl.broken.has(shown.url) : false;
  const onImgLoad = tl.onImgLoad;
  const onImgError = tl.onImgError;

  const status: "loading" | "notConfigured" | "resting" | "offline" | "live" = !feed
    ? failed
      ? "offline"
      : "loading"
    : !feed.configured
      ? "notConfigured"
      : !feed.activeHours.active
        ? "resting"
        : !latest || now - new Date(latest.takenAt).getTime() > CAM_STALE_MINUTES * 60_000
          ? "offline"
          : "live";

  const statusText =
    status === "notConfigured"
      ? L(TX.notConfigured)
      : status === "resting"
        ? L(TX.resting)
        : status === "offline"
          ? L(TX.offline)
          : "";
  const showImage = shown && status !== "notConfigured" && status !== "loading";

  const scrubber = (dark: boolean) => <Scrubber tl={tl} dark={dark} L={L} />;

  return (
    <div ref={rootRef} className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
      {/* Dòng tiêu đề: một hàng cố định */}
      <div className="flex h-10 items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-sm font-bold text-white">
          📷 {vi ? cfg.name.vi : cfg.name.en}
          {vi ? <span className="text-[0.82em] font-normal opacity-60"> / {cfg.name.en}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/70">
          {status === "live" && !viewingPast ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
          ) : null}
          {showImage && sliderShot ? `${vnHHMM(sliderShot.takenAt)} · ${agoText(sliderShot.takenAt, now, vi)}` : null}
        </span>
      </div>

      {/* Ảnh chính: khung 16:9 giữ chỗ sẵn — chỉ MỘT ảnh được tải */}
      <div className="relative aspect-video w-full bg-black/40">
        {showImage && !shownBroken ? (
          <button type="button" onClick={() => setZoomOpen(true)} className="absolute inset-0 block h-full w-full">
            <img
              key={shown.url}
              src={shown.url}
              alt={`${cfg.name.vi} ${vnHHMM(shown.takenAt)}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => onImgLoad(shown.url)}
              onError={() => onImgError(shown.url)}
              className={`h-full w-full object-cover ${status === "live" ? "" : "opacity-60 grayscale-[40%]"}`}
            />
          </button>
        ) : null}
        {showImage && shownBroken ? (
          <p className="absolute inset-x-0 bottom-2 px-3 text-center text-xs text-white/60">{L(TX.broken)}</p>
        ) : null}
        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
            <span className="animate-pulse">{L(TX.loading)}</span>
          </div>
        ) : null}
        {statusText ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <span className="rounded-lg bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white">
              {status === "offline" ? "⚠️ " : status === "resting" ? "🌙 " : "🔌 "}
              {statusText}
              {vi ? (
                <span className="block text-[0.82em] font-normal opacity-60">
                  {status === "notConfigured" ? TX.notConfigured.en : status === "resting" ? TX.resting.en : TX.offline.en}
                </span>
              ) : null}
              {latest && status !== "notConfigured" ? (
                <span className="mt-0.5 block text-xs font-normal text-white/70">
                  {L(TX.lastShot)}: {vnHHMM(latest.takenAt)} · {agoText(latest.takenAt, now, vi)}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>

      {/* Thanh trượt 60 phút + nút timelapse — cao cố định dù có ảnh hay không */}
      <div className="h-[84px] px-3 pb-2 pt-2">
        {chron.length > 1 ? (
          <>
            {scrubber(false)}
            <div className="mt-0.5 flex h-6 items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate text-white/45">
                {viewingPast ? (
                  <button type="button" onClick={() => goTo(lastIdx)} className="text-amber-200 underline underline-offset-2">
                    {vi ? "Về ảnh mới nhất" : "Back to latest"}
                  </button>
                ) : (
                  `${chron.length} ${vi ? "ảnh / 60 phút" : "photos / 60 min"}`
                )}
              </span>
              <button
                type="button"
                onClick={startTimelapse}
                className="h-6 shrink-0 rounded-md border border-amber-400/60 bg-amber-400/15 px-2 font-bold text-amber-200"
              >
                ▶ {L(TX.timelapse)}
              </button>
            </div>
          </>
        ) : (
          <p className="flex h-full items-center justify-center text-center text-xs text-white/45">
            {status === "loading" ? "" : status === "notConfigured" || status === "resting" ? L(TX.schedule) : L(TX.noShots)}
          </p>
        )}
      </div>

      {/* Ô phóng to + timelapse — đưa ra document.body: tổ tiên có transform
          (framer-motion) sẽ làm `fixed` bám theo khung thay vì cả màn hình */}
      {zoomOpen && shown && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal="true" onClick={closeZoom}>
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-white" onClick={(e) => e.stopPropagation()}>
                <span className="min-w-0 truncate text-sm">
                  <b>{vnHHMM((sliderShot ?? shown).takenAt)}</b> · {agoText((sliderShot ?? shown).takenAt, now, vi)}
                  {curIdx >= 0 && chron.length ? (
                    <span className="text-white/50">
                      {" "}
                      · {sliderIdx + 1}/{chron.length}
                    </span>
                  ) : null}
                </span>
                <button type="button" onClick={closeZoom} className="h-9 shrink-0 rounded-lg border border-white/25 px-3 text-sm">
                  ✕ {L(TX.close)}
                </button>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center p-1">
                {shownBroken ? (
                  <p className="text-xs text-white/60">{L(TX.broken)}</p>
                ) : (
                  <img
                    key={shown.url}
                    src={shown.url}
                    alt={vnHHMM(shown.takenAt)}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={() => onImgLoad(shown.url)}
                    onError={() => onImgError(shown.url)}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
              {chron.length > 1 ? (
                <div className="flex flex-col gap-2 px-3 pb-5 pt-2 text-white" onClick={(e) => e.stopPropagation()}>
                  {scrubber(true)}
                  <button
                    type="button"
                    aria-label={playing ? L(TX.pause) : L(TX.play)}
                    onClick={() => {
                      if (playing) setPlaying(false);
                      else startTimelapse();
                    }}
                    className="h-10 self-center rounded-lg border border-amber-400/60 bg-amber-400/15 px-4 text-sm font-bold text-amber-200"
                  >
                    {playing ? `⏸ ${L(TX.pause)}` : `▶ ${L(TX.timelapse)}`}
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
