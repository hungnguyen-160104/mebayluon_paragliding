"use client";

/**
 * KHUNG CAMERA HAI MẮT (Khau Phạ, chủ 03/10/2026: "mắt 1 và mắt 2 dùng CHUNG một
 * nút chạy thời gian vì chúng đồng bộ"). Hai ảnh xếp trên – dưới (mắt 1 trên,
 * mắt 2 dưới), MỘT thanh thời gian / ◀ ▶ / nút timelapse / dòng "x phút trước".
 *
 * Ghép cặp: hai mắt cùng lịch chụp (cron chụp lần lượt hai kênh cùng máy, cách
 * nhau vài giây) → mỗi điểm trên thanh lấy ảnh GẦN NHẤT của từng mắt trong ±2
 * phút. Mắt nào không có ảnh quanh giờ đó thì ô đó hiện "Không có ảnh lúc này".
 *
 * Nhẹ ở 390px: ban đầu chỉ tải cặp mới nhất (2 ảnh); kéo thanh dừng tay mới tải,
 * tải trước đúng MỘT cặp kế tiếp; timelapse tuần tự (cặp này hiện xong mới sang
 * cặp sau). Phần thanh thời gian dùng chung với CameraGallery (camera-timeline).
 *
 * Mắt 2 chưa có ảnh nào (máy chỉ báo một kênh — hideWhenEmpty) → khung chỉ còn
 * mắt 1, như CameraGallery một camera.
 */

import { useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { Scrubber, TX, agoText, useCamFeed, useInView, useNow, useTimeline, type Txt } from "@/components/baobay/camera-timeline";
import { useLanguage } from "@/contexts/language-context";
import { CAM_STALE_MINUTES, CAMERAS, vnHHMMSS, type CamId, type CamShot } from "@/lib/imou/cameras";

/** Ghép ảnh hai mắt lệch nhau tối đa chừng này */
const PAIR_WINDOW_MS = 2 * 60_000;

/** Nhãn ngắn của từng mắt (vi/en như phần còn lại của khung) */
export const LENS_LABEL: Partial<Record<CamId, Txt>> = {
  "khau-pha": { vi: "Mắt 1 – toàn cảnh", en: "Lens 1 – wide view" },
  "khau-pha-2": {
    vi: "Mắt 2 – khu chuẩn bị & lối lên bãi",
    en: "Lens 2 – prep area & launch steps",
  },
};

type Pair = { at: string; a: CamShot | null; b: CamShot | null };

const t = (s: CamShot) => new Date(s.takenAt).getTime();

/** Ảnh gần `at` nhất trong ±2 phút (list bất kỳ thứ tự) */
function nearest(list: CamShot[], at: number): CamShot | null {
  let best: CamShot | null = null;
  let bestD = PAIR_WINDOW_MS + 1;
  for (const s of list) {
    const d = Math.abs(t(s) - at);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return bestD <= PAIR_WINDOW_MS ? best : null;
}

/**
 * Dải điểm CŨ → MỚI: mỗi ảnh mắt 1 là một điểm; ảnh mắt 2 không có ảnh mắt 1
 * nào trong ±2 phút thì thành điểm riêng. Mỗi điểm lấy ảnh gần nhất của cả hai.
 */
function buildPairs(aItems: CamShot[], bItems: CamShot[]): Pair[] {
  const times = aItems.map(t);
  for (const s of bItems) if (!nearest(aItems, t(s))) times.push(t(s));
  times.sort((x, y) => x - y);
  return times.map((ms) => {
    const a = nearest(aItems, ms);
    const b = nearest(bItems, ms);
    return { at: (a ?? b)!.takenAt, a, b };
  });
}

const urlsOf = (p: Pair) => [p.a?.url, p.b?.url].filter((u): u is string => Boolean(u));

export default function DualCameraGallery({ a: camA, b: camB }: { a: CamId; b: CamId }) {
  const { language } = useLanguage();
  const vi = language === "vi";
  const L = useCallback((x: Txt) => (vi ? x.vi : x.en), [vi]);
  const cfg = CAMERAS[camA];

  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useInView(rootRef);
  const A = useCamFeed(camA, visible);
  const B = useCamFeed(camB, visible);
  const now = useNow(Math.max(A.fetchedAt, B.fetchedAt));

  /** Mắt 2 chưa từng có ảnh (đã tải feed mà latest rỗng) → chỉ hiện mắt 1 */
  const hasB = Boolean(B.feed?.latest);

  const chron = useMemo<Pair[]>(() => buildPairs(A.feed?.items ?? [], hasB ? (B.feed?.items ?? []) : []), [A.feed, B.feed, hasB]);
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

  /** Cặp đang xem: theo thanh, hoặc (dải 60 phút rỗng) ảnh cuối của từng mắt */
  const latestA = A.feed?.latest ?? null;
  const latestB = hasB ? (B.feed?.latest ?? null) : null;
  const latestPair: Pair | null =
    chron[lastIdx] ?? (latestA || latestB ? { at: (latestA ?? latestB)!.takenAt, a: latestA, b: latestB } : null);
  const shown: Pair | null = selIdx >= 0 ? chron[selIdx] : latestPair;
  const sliderPair = tl.sliderPoint ?? shown;
  /** Ảnh mới nhất của cả hai mắt — để tính "mất kết nối" */
  const newest = [latestA, latestB].filter((x): x is CamShot => Boolean(x)).sort((x, y) => t(y) - t(x))[0] ?? null;

  const feed = A.feed;
  const status: "loading" | "notConfigured" | "resting" | "offline" | "live" = !feed
    ? A.failed
      ? "offline"
      : "loading"
    : !feed.configured
      ? "notConfigured"
      : !feed.activeHours.active
        ? "resting"
        : !newest || now - t(newest) > CAM_STALE_MINUTES * 60_000
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
  const showImage = Boolean(shown) && status !== "notConfigured" && status !== "loading";
  const lenses: { cam: CamId; pick: (p: Pair) => CamShot | null }[] = [
    { cam: camA, pick: (p) => p.a },
    ...(hasB ? [{ cam: camB, pick: (p: Pair) => p.b }] : []),
  ];

  /** Một ô ảnh của một mắt (khung 16:9 cố định) */
  const slot = (lens: (typeof lenses)[number], zoom: boolean, withStatus: boolean) => {
    const shot = shown ? lens.pick(shown) : null;
    const bad = shot ? tl.broken.has(shot.url) : false;
    const lbl = LENS_LABEL[lens.cam];
    return (
      <div
        key={lens.cam}
        className={zoom ? "relative flex min-h-0 flex-1 items-center justify-center" : "relative aspect-video w-full bg-black/40"}
      >
        {showImage && shot && !bad ? (
          zoom ? (
            <img
              key={shot.url}
              src={shot.url}
              alt={`${CAMERAS[lens.cam].name.vi} ${vnHHMMSS(shot.takenAt)}`}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => tl.onImgLoad(shot.url)}
              onError={() => tl.onImgError(shot.url)}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <button type="button" onClick={() => setZoomOpen(true)} className="absolute inset-0 block h-full w-full">
              <img
                key={shot.url}
                src={shot.url}
                alt={`${CAMERAS[lens.cam].name.vi} ${vnHHMMSS(shot.takenAt)}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => tl.onImgLoad(shot.url)}
                onError={() => tl.onImgError(shot.url)}
                className={`h-full w-full object-cover ${status === "live" ? "" : "opacity-60 grayscale-[40%]"}`}
              />
            </button>
          )
        ) : null}
        {showImage && shot && bad ? (
          <p className="absolute inset-x-0 bottom-2 px-3 text-center text-xs text-white/60">{L(TX.broken)}</p>
        ) : null}
        {showImage && !shot ? (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <span className="rounded-md bg-black/50 px-2 py-1 text-xs text-white/70">{L(TX.noShotHere)}</span>
          </div>
        ) : null}
        {/* Nhãn mắt — góc trên trái, không chặn bấm */}
        {lbl && lenses.length > 1 ? (
          <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white/90">
            {L(lbl)}
          </span>
        ) : null}
        {withStatus && status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
            <span className="animate-pulse">{L(TX.loading)}</span>
          </div>
        ) : null}
        {withStatus && statusText ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <span className="rounded-lg bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white">
              {status === "offline" ? "⚠️ " : status === "resting" ? "🌙 " : "🔌 "}
              {statusText}
              {vi ? (
                <span className="block text-[0.82em] font-normal opacity-60">
                  {status === "notConfigured" ? TX.notConfigured.en : status === "resting" ? TX.resting.en : TX.offline.en}
                </span>
              ) : null}
              {newest && status !== "notConfigured" ? (
                <span className="mt-0.5 block text-xs font-normal text-white/70">
                  {L(TX.lastShot)}: {vnHHMMSS(newest.takenAt)} · {agoText(newest.takenAt, now, vi)}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={rootRef} className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
      {/* Dòng tiêu đề + MỘT dòng giờ / "x phút trước" cho cả hai mắt */}
      <div className="flex h-10 items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-sm font-bold text-white">
          📷 {vi ? cfg.name.vi : cfg.name.en}
          {vi ? <span className="text-[0.82em] font-normal opacity-60"> / {cfg.name.en}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/70">
          {status === "live" && !viewingPast ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
          ) : null}
          {showImage && sliderPair ? `${vnHHMMSS(sliderPair.at)} · ${agoText(sliderPair.at, now, vi)}` : null}
        </span>
      </div>

      {/* Hai ô ảnh trên – dưới; trạng thái (nghỉ / mất kết nối) phủ lên ô mắt 1 */}
      <div className="flex flex-col gap-0.5">{lenses.map((lens, i) => slot(lens, false, i === 0))}</div>

      {/* MỘT thanh trượt 60 phút + MỘT nút timelapse cho cả hai mắt */}
      <div className="h-[84px] px-3 pb-2 pt-2">
        {chron.length > 1 ? (
          <>
            <Scrubber tl={tl} dark={false} L={L} />
            <div className="mt-0.5 flex h-6 items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate text-white/45">
                {viewingPast ? (
                  <button type="button" onClick={() => goTo(lastIdx)} className="text-amber-200 underline underline-offset-2">
                    {vi ? "Về ảnh mới nhất" : "Back to latest"}
                  </button>
                ) : (
                  `${chron.length} ${vi ? "cặp ảnh / 60 phút" : "photo pairs / 60 min"}`
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

      {/* Ô phóng to: hai mắt xếp trên – dưới, chung thanh thời gian + nút chạy */}
      {zoomOpen && shown && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal="true" onClick={closeZoom}>
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-white" onClick={(e) => e.stopPropagation()}>
                <span className="min-w-0 truncate text-sm">
                  <b>{vnHHMMSS((sliderPair ?? shown).at)}</b> · {agoText((sliderPair ?? shown).at, now, vi)}
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
              <div className="flex min-h-0 flex-1 flex-col gap-1 p-1">{lenses.map((lens) => slot(lens, true, false))}</div>
              {chron.length > 1 ? (
                <div className="flex flex-col gap-2 px-3 pb-5 pt-2 text-white" onClick={(e) => e.stopPropagation()}>
                  <Scrubber tl={tl} dark L={L} />
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
