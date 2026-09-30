"use client";

/**
 * KHUNG CAMERA BÃI CẤT trên trang /baobay (chủ 30/09/2026).
 *
 * Ảnh mới nhất + giờ chụp ("x phút trước"), dải thumbnail 60 phút gần nhất cuộn
 * ngang; bấm ảnh là phóng to, trong đó có ◀ ▶, thanh trượt và nút ▶ chạy như
 * timelapse. Tự làm mới mỗi 60s (chỉ khi khung đang trên màn hình và tab đang mở).
 *
 * Tự chứa: chỉ cần `<CameraGallery cam="vien-nam" />`. Chiều cao CỐ ĐỊNH ở mọi
 * trạng thái (đang tải / chưa kết nối / nghỉ / có ảnh) để trang không nhảy khi
 * dữ liệu về. Chưa lướt tới thì chưa gọi API, ảnh thumbnail loading="lazy".
 *
 * Trạng thái:
 *  - chưa khai env Imou   → "Camera chưa kết nối"
 *  - ngoài 08:00–18:00    → "Camera nghỉ (chụp 08:00–18:00)" (vẫn cho xem ảnh cuối nếu có)
 *  - trong giờ mà ảnh mới nhất cũ hơn 10 phút → "Camera tạm mất kết nối"
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLanguage } from "@/contexts/language-context";
import { CAM_ACTIVE, CAM_STALE_MINUTES, CAMERAS, vnHHMM, type CamFeed, type CamId, type CamShot } from "@/lib/imou/cameras";

const REFRESH_MS = 60_000;
/** Tốc độ chạy timelapse trong ô phóng to */
const PLAY_MS = 450;

type Txt = { vi: string; en: string };
const TX = {
  notConfigured: { vi: "Camera chưa kết nối", en: "Camera not connected yet" },
  resting: { vi: `Camera nghỉ (chụp ${CAM_ACTIVE.label})`, en: `Camera resting (shoots ${CAM_ACTIVE.label})` },
  offline: { vi: "Camera tạm mất kết nối", en: "Camera temporarily offline" },
  loading: { vi: "Đang tải ảnh…", en: "Loading…" },
  schedule: { vi: `Ảnh cập nhật mỗi phút, ${CAM_ACTIVE.label}`, en: `One photo per minute, ${CAM_ACTIVE.label}` },
  noShots: { vi: "Chưa có ảnh trong 60 phút qua", en: "No photos in the last 60 minutes" },
  lastShot: { vi: "Ảnh cuối", en: "Last photo" },
  justNow: { vi: "vừa xong", en: "just now" },
  last60: { vi: "60 phút gần nhất — bấm ảnh để xem như timelapse", en: "Last 60 minutes — tap to play as timelapse" },
  close: { vi: "Đóng", en: "Close" },
  older: { vi: "Ảnh trước", en: "Older" },
  newer: { vi: "Ảnh sau", en: "Newer" },
  play: { vi: "Chạy", en: "Play" },
  pause: { vi: "Dừng", en: "Pause" },
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
  /** Chỉ số trong mảng CŨ → MỚI đang mở phóng to; null = đóng */
  const [zoom, setZoom] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

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

  // Timelapse: chạy tới ảnh mới nhất thì dừng
  useEffect(() => {
    if (!playing || zoom === null) return;
    if (zoom >= chron.length - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setZoom((z) => (z === null ? z : Math.min(chron.length - 1, z + 1))), PLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, zoom, chron.length]);

  // Phím tắt trong ô phóng to
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoom(null);
        setPlaying(false);
      } else if (e.key === "ArrowLeft") {
        setPlaying(false);
        setZoom((z) => (z === null ? z : Math.max(0, z - 1)));
      } else if (e.key === "ArrowRight") {
        setPlaying(false);
        setZoom((z) => (z === null ? z : Math.min(chron.length - 1, z + 1)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, chron.length]);

  /** Mở phóng to theo ảnh; ảnh mới nhất ngoài khung 60 phút thì mở riêng nó */
  const openShot = (shot: CamShot) => {
    const i = chron.findIndex((s) => s.url === shot.url);
    setPlaying(false);
    setZoom(i >= 0 ? i : -1);
  };
  const zoomShot: CamShot | null = zoom === null ? null : zoom === -1 ? latest : (chron[zoom] ?? null);

  const statusText =
    status === "notConfigured" ? L(TX.notConfigured) : status === "resting" ? L(TX.resting) : status === "offline" ? L(TX.offline) : "";
  const showImage = latest && status !== "notConfigured" && status !== "loading";

  return (
    <div ref={rootRef} className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-white/[0.06]">
      {/* Dòng tiêu đề: một hàng cố định */}
      <div className="flex h-10 items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-sm font-bold text-white">
          📷 {vi ? cfg.name.vi : cfg.name.en}
          {vi ? <span className="text-[0.82em] font-normal opacity-60"> / {cfg.name.en}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/70">
          {status === "live" ? <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden /> : null}
          {latest && showImage ? `${vnHHMM(latest.takenAt)} · ${agoText(latest.takenAt, now, vi)}` : null}
        </span>
      </div>

      {/* Ảnh chính: khung 16:9 giữ chỗ sẵn */}
      <div className="relative aspect-video w-full bg-black/40">
        {showImage ? (
          <button type="button" onClick={() => openShot(latest)} className="absolute inset-0 block h-full w-full">
            <img
              src={latest.url}
              alt={`${cfg.name.vi} ${vnHHMM(latest.takenAt)}`}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${status === "live" ? "" : "opacity-60 grayscale-[40%]"}`}
            />
          </button>
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

      {/* Dải thumbnail 60 phút (MỚI bên trái) — cao cố định dù có ảnh hay không */}
      <div className="h-[68px] px-2 py-2">
        {feed?.items.length ? (
          <div className="flex h-full gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
            {feed.items.map((s) => (
              <button
                key={s.url}
                type="button"
                onClick={() => openShot(s)}
                className="relative h-full shrink-0 overflow-hidden rounded-md border border-white/15"
                style={{ aspectRatio: "16 / 9" }}
                title={vnHHMM(s.takenAt)}
              >
                <img src={s.thumb} alt={vnHHMM(s.takenAt)} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 right-0 rounded-tl bg-black/65 px-1 text-[10px] leading-tight text-white">
                  {vnHHMM(s.takenAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="flex h-full items-center justify-center text-center text-xs text-white/45">
            {status === "loading" ? "" : status === "notConfigured" ? L(TX.schedule) : L(TX.noShots)}
          </p>
        )}
      </div>
      {/* Dòng gợi ý luôn giữ chỗ (h-5) để khung không nhảy khi có ảnh */}
      <p className="-mt-1 h-5 truncate px-3 text-[11px] text-white/45">{feed?.items.length ? L(TX.last60) : ""}</p>

      {/* Ô phóng to + timelapse — đưa ra document.body: tổ tiên có transform
          (framer-motion) sẽ làm `fixed` bám theo khung thay vì cả màn hình */}
      {zoomShot && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setZoom(null);
            setPlaying(false);
          }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="min-w-0 truncate text-sm">
              <b>{vnHHMM(zoomShot.takenAt)}</b> · {agoText(zoomShot.takenAt, now, vi)}
              {zoom !== null && zoom >= 0 && chron.length ? (
                <span className="text-white/50">
                  {" "}
                  · {zoom + 1}/{chron.length}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => {
                setZoom(null);
                setPlaying(false);
              }}
              className="h-9 shrink-0 rounded-lg border border-white/25 px-3 text-sm"
            >
              ✕ {L(TX.close)}
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-1">
            <img src={zoomShot.url} alt={vnHHMM(zoomShot.takenAt)} className="max-h-full max-w-full object-contain" />
          </div>
          {zoom !== null && zoom >= 0 && chron.length > 1 ? (
            <div className="flex items-center gap-2 px-3 pb-5 pt-2 text-white" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={L(TX.older)}
                disabled={zoom <= 0}
                onClick={() => {
                  setPlaying(false);
                  setZoom(Math.max(0, zoom - 1));
                }}
                className="h-10 w-10 shrink-0 rounded-lg border border-white/25 text-lg disabled:opacity-30"
              >
                ◀
              </button>
              <button
                type="button"
                aria-label={playing ? L(TX.pause) : L(TX.play)}
                onClick={() => {
                  // Đang ở ảnh cuối mà bấm chạy thì quay về ảnh cũ nhất
                  if (!playing && zoom >= chron.length - 1) setZoom(0);
                  setPlaying((p) => !p);
                }}
                className="h-10 shrink-0 rounded-lg border border-amber-400/60 bg-amber-400/15 px-3 text-sm font-bold text-amber-200"
              >
                {playing ? `⏸ ${L(TX.pause)}` : `▶ ${L(TX.play)}`}
              </button>
              <input
                type="range"
                min={0}
                max={chron.length - 1}
                value={zoom}
                onChange={(e) => {
                  setPlaying(false);
                  setZoom(Number(e.target.value));
                }}
                className="min-w-0 flex-1 accent-amber-400"
                aria-label="timelapse"
              />
              <button
                type="button"
                aria-label={L(TX.newer)}
                disabled={zoom >= chron.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setZoom(Math.min(chron.length - 1, zoom + 1));
                }}
                className="h-10 w-10 shrink-0 rounded-lg border border-white/25 text-lg disabled:opacity-30"
              >
                ▶
              </button>
            </div>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
