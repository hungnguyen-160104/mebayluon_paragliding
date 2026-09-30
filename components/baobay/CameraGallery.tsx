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
 *  - ngoài 08:00–18:00    → "Camera nghỉ (chụp 08:00–18:00)" (vẫn cho xem ảnh cuối nếu có)
 *  - trong giờ mà ảnh mới nhất cũ hơn CAM_STALE_MINUTES (10 phút; ngoài 10–15h
 *    chụp 3 phút/ảnh) → "Camera tạm mất kết nối"
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/contexts/language-context";
import { CAM_ACTIVE, CAM_STALE_MINUTES, CAMERAS, vnHHMM, type CamFeed, type CamId, type CamShot } from "@/lib/imou/cameras";

const REFRESH_MS = 60_000;
/** Kéo thanh trượt: dừng tay chừng này mới tải ảnh */
const SCRUB_DEBOUNCE_MS = 300;
/** Timelapse: nghỉ chừng này SAU KHI ảnh hiện xong mới sang ảnh kế */
const PLAY_MS = 700;

type Txt = { vi: string; en: string };
const TX = {
  notConfigured: { vi: "Camera chưa kết nối", en: "Camera not connected yet" },
  resting: { vi: `Camera nghỉ (chụp ${CAM_ACTIVE.label})`, en: `Camera resting (shoots ${CAM_ACTIVE.label})` },
  offline: { vi: "Camera tạm mất kết nối", en: "Camera temporarily offline" },
  loading: { vi: "Đang tải ảnh…", en: "Loading…" },
  schedule: {
    vi: `Chụp ${CAM_ACTIVE.label}: mỗi phút lúc 10–15h, 3 phút/ảnh giờ khác`,
    en: `Shoots ${CAM_ACTIVE.label}: every minute 10–15h, every 3 min otherwise`,
  },
  noShots: { vi: "Chưa có ảnh trong 60 phút qua", en: "No photos in the last 60 minutes" },
  lastShot: { vi: "Ảnh cuối", en: "Last photo" },
  justNow: { vi: "vừa xong", en: "just now" },
  broken: { vi: "Ảnh này không tải được (link đã hết hạn)", en: "Photo unavailable (link expired)" },
  close: { vi: "Đóng", en: "Close" },
  older: { vi: "Ảnh trước", en: "Older" },
  newer: { vi: "Ảnh sau", en: "Newer" },
  timelapse: { vi: "Chạy timelapse", en: "Play timelapse" },
  play: { vi: "Chạy", en: "Play" },
  pause: { vi: "Dừng", en: "Pause" },
  slider: { vi: "Chọn giờ ảnh (60 phút gần nhất)", en: "Pick photo time (last 60 min)" },
} satisfies Record<string, Txt>;

function agoText(takenAt: string, now: number, vi: boolean): string {
  const min = Math.max(0, Math.floor((now - new Date(takenAt).getTime()) / 60_000));
  if (min < 1) return vi ? TX.justNow.vi : TX.justNow.en;
  if (min < 60) return vi ? `${min} phút trước` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h} h ago`;
  return vi ? `${Math.floor(h / 24)} ngày trước` : `${Math.floor(h / 24)} d ago`;
}

export default function CameraGallery({ cam }: { cam: CamId }) {
  const { language } = useLanguage();
  const vi = language === "vi";
  const L = useCallback((t: Txt) => (vi ? t.vi : t.en), [vi]);
  const cfg = CAMERAS[cam];

  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [feed, setFeed] = useState<CamFeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  /** Giờ chụp của ảnh đang xem; null = luôn theo ảnh mới nhất */
  const [selAt, setSelAt] = useState<string | null>(null);
  /** Vị trí thanh trượt lúc đang kéo (chưa tải ảnh); null = khớp ảnh đang xem */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  /** Link ảnh đã hiện xong / đã lỗi */
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  /** Hướng đi gần nhất (-1 về cũ, +1 về mới) — để tải trước đúng 1 ảnh kế tiếp */
  const dirRef = useRef<1 | -1>(-1);

  // Chưa lướt tới thì chưa tải gì
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/camera/${cam}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setFeed((await res.json()) as CamFeed);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setNow(Date.now());
  }, [cam]);

  // Tải lần đầu khi hiện ra, rồi làm mới mỗi 60s khi còn trên màn hình và tab đang mở
  useEffect(() => {
    if (!visible) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [visible, load]);

  // "x phút trước" tự nhích
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  /** Ảnh theo thứ tự CŨ → MỚI cho thanh trượt/timelapse */
  const chron = useMemo<CamShot[]>(() => (feed?.items ? [...feed.items].reverse() : []), [feed]);
  const latest = feed?.latest ?? null;
  const lastIdx = chron.length - 1;

  const selIdx = selAt ? chron.findIndex((s) => s.takenAt === selAt) : -1;
  /** Chỉ số ảnh đang xem trong chron (-1 nếu không có dải 60 phút) */
  const curIdx = selIdx >= 0 ? selIdx : lastIdx;
  const shown: CamShot | null = selIdx >= 0 ? chron[selIdx] : latest;
  const sliderIdx = dragIdx ?? curIdx;
  const sliderShot = chron[sliderIdx] ?? shown;
  const shownBroken = shown ? broken.has(shown.url) : false;

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

  /** Chuyển tới ảnh thứ i (CŨ → MỚI); ảnh mới nhất = theo dõi trực tiếp */
  const goTo = useCallback(
    (i: number) => {
      if (!chron.length) return;
      const j = Math.max(0, Math.min(lastIdx, i));
      setDragIdx(null);
      setSelAt(j === lastIdx ? null : chron[j].takenAt);
    },
    [chron, lastIdx],
  );
  const step = useCallback(
    (d: 1 | -1) => {
      dirRef.current = d;
      setPlaying(false);
      goTo(curIdx + d);
    },
    [curIdx, goTo],
  );

  // Kéo thanh trượt: dừng tay SCRUB_DEBOUNCE_MS mới tải ảnh ở vị trí đó
  useEffect(() => {
    if (dragIdx === null) return;
    const id = window.setTimeout(() => goTo(dragIdx), SCRUB_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [dragIdx, goTo]);

  // Ảnh đang xem hiện xong → tải trước ĐÚNG 1 ảnh kế tiếp theo hướng đang đi
  useEffect(() => {
    if (!shown || loadedUrl !== shown.url || curIdx < 0) return;
    const next = chron[curIdx + dirRef.current];
    if (!next || broken.has(next.url)) return;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    img.src = next.url;
  }, [loadedUrl, shown, curIdx, chron, broken]);

  // Timelapse tuần tự: ảnh hiện xong (hoặc lỗi) mới nghỉ PLAY_MS rồi sang ảnh sau
  useEffect(() => {
    if (!playing || !zoomOpen || !shown) return;
    if (curIdx >= lastIdx) {
      setPlaying(false);
      return;
    }
    if (loadedUrl !== shown.url && !broken.has(shown.url)) return;
    const id = window.setTimeout(() => goTo(curIdx + 1), PLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, zoomOpen, shown, loadedUrl, broken, curIdx, lastIdx, goTo]);

  // Khung ra khỏi màn hình / tab ẩn → dừng timelapse
  useEffect(() => {
    if (!visible) setPlaying(false);
  }, [visible]);

  const closeZoom = useCallback(() => {
    setZoomOpen(false);
    setPlaying(false);
  }, []);

  // Phím tắt trong ô phóng to
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, closeZoom, step]);

  const startTimelapse = () => {
    dirRef.current = 1;
    if (curIdx >= lastIdx) goTo(0);
    setZoomOpen(true);
    setPlaying(true);
  };

  const onImgLoad = (url: string) => setLoadedUrl(url);
  const onImgError = (url: string) =>
    setBroken((b) => {
      if (b.has(url)) return b;
      const n = new Set(b);
      n.add(url);
      return n;
    });

  const statusText =
    status === "notConfigured" ? L(TX.notConfigured) : status === "resting" ? L(TX.resting) : status === "offline" ? L(TX.offline) : "";
  const showImage = shown && status !== "notConfigured" && status !== "loading";
  const viewingPast = selIdx >= 0 && selIdx < lastIdx;

  /** Mốc giờ bằng chữ dưới thanh trượt: 5 mốc chia đều (theo chỉ số ảnh) */
  const marks = useMemo(() => {
    if (chron.length < 2) return [];
    const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (chron.length - 1)));
    return [...new Set(idx)].map((i) => ({ i, label: vnHHMM(chron[i].takenAt) }));
  }, [chron]);

  /** ◀ [thanh trượt] ▶ — dùng chung cho khung và ô phóng to */
  const scrubber = (dark: boolean) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={L(TX.older)}
        disabled={curIdx <= 0}
        onClick={() => step(-1)}
        className={`${dark ? "h-10 w-10" : "h-8 w-8"} shrink-0 rounded-lg border border-white/25 text-white disabled:opacity-30`}
      >
        ◀
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, lastIdx)}
          value={Math.max(0, sliderIdx)}
          onChange={(e) => {
            const v = Number(e.target.value);
            dirRef.current = v < curIdx ? -1 : 1;
            setPlaying(false);
            setDragIdx(v);
          }}
          className="block w-full accent-amber-400"
          aria-label={L(TX.slider)}
          aria-valuetext={sliderShot ? vnHHMM(sliderShot.takenAt) : undefined}
        />
        <div className="relative h-4 text-[10px] leading-4 text-white/50">
          {marks.map((m) => (
            <span
              key={m.i}
              className="absolute top-0 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(m.i / Math.max(1, lastIdx)) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={L(TX.newer)}
        disabled={curIdx >= lastIdx}
        onClick={() => step(1)}
        className={`${dark ? "h-10 w-10" : "h-8 w-8"} shrink-0 rounded-lg border border-white/25 text-white disabled:opacity-30`}
      >
        ▶
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
      {/* Dòng tiêu đề: một hàng cố định */}
      <div className="flex h-10 items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-sm font-bold text-white">
          📷 {vi ? cfg.name.vi : cfg.name.en}
          {vi ? <span className="text-[0.82em] font-normal opacity-60"> / {cfg.name.en}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/70">
          {status === "live" && !viewingPast ? <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden /> : null}
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
