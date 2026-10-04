"use client";

/**
 * KHUNG CAMERA NHÚNG (iframe) cho web đối tác — /embed/camera/[cam] (30/09/2026).
 *
 * Bản nhẹ của components/baobay/CameraGallery.tsx: không ô phóng to/timelapse,
 * không phụ thuộc LanguageProvider (ngôn ngữ + giao diện lấy từ query ?lang=&theme=).
 *  - ảnh mới nhất 16:9 (object-cover, tải ngay), giờ chụp + "x phút trước"
 *  - thanh trượt 60 phút gần nhất (dừng tay ~0,3s mới tải ảnh đó)
 *  - tự làm mới 60s khi tab đang mở
 *  - trạng thái: chưa kết nối / nghỉ ngoài giờ / mất kết nối
 *  - dòng nguồn cố định cuối khung (link về /baobay kèm UTM)
 *  - gửi chiều cao nội dung lên web cha: {type:"mbl-camera-height", cam, height}
 *    để script tuỳ chọn của đối tác tự co giãn iframe.
 *
 * API gọi CÙNG ORIGIN (iframe chạy trên domain mebayluon) nên không cần CORS.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CAM_ACTIVE, CAM_STALE_MINUTES, CAMERAS, vnHHMM, vnHHMMSS, type CamFeed, type CamId, type CamShot } from "@/lib/imou/cameras";

export type EmbedLang = "vi" | "en";
export type EmbedTheme = "dark" | "light";

const REFRESH_MS = 20_000;
const SCRUB_DEBOUNCE_MS = 300;
export const EMBED_SOURCE_URL =
  "https://www.mebayluon.com/baobay?utm_source=embed&utm_medium=iframe&utm_campaign=camera";
export const EMBED_HEIGHT_MESSAGE = "mbl-camera-height";

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
  older: { vi: "Ảnh trước", en: "Older" },
  newer: { vi: "Ảnh sau", en: "Newer" },
  slider: { vi: "Chọn giờ ảnh (60 phút gần nhất)", en: "Pick photo time (last 60 min)" },
  latest: { vi: "Về ảnh mới nhất", en: "Back to latest" },
  count: { vi: "ảnh / 60 phút", en: "photos / 60 min" },
} as const;

function agoText(takenAt: string, now: number, lang: EmbedLang): string {
  const vi = lang === "vi";
  const min = Math.max(0, Math.floor((now - new Date(takenAt).getTime()) / 60_000));
  if (min < 1) return TX.justNow[lang];
  if (min < 60) return vi ? `${min} phút trước` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h} h ago`;
  return vi ? `${Math.floor(h / 24)} ngày trước` : `${Math.floor(h / 24)} d ago`;
}

const THEMES = {
  dark: {
    root: "bg-[#0b1220] text-white border-white/15",
    muted: "text-white/60",
    faint: "text-white/45",
    btn: "border-white/25 text-white",
    frame: "bg-black/50",
    link: "text-amber-300",
    footer: "border-white/10 bg-white/[0.04]",
  },
  light: {
    root: "bg-white text-slate-900 border-slate-200",
    muted: "text-slate-600",
    faint: "text-slate-500",
    btn: "border-slate-300 text-slate-800",
    frame: "bg-slate-200",
    link: "text-sky-700",
    footer: "border-slate-200 bg-slate-50",
  },
} as const;

export default function CameraEmbed({ cam, lang, theme }: { cam: CamId; lang: EmbedLang; theme: EmbedTheme }) {
  const cfg = CAMERAS[cam];
  const T = THEMES[theme];
  const rootRef = useRef<HTMLDivElement>(null);

  const [feed, setFeed] = useState<CamFeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selAt, setSelAt] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());

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

  // Tải ngay, rồi làm mới mỗi 60s khi tab đang mở (và ngay khi tab mở lại)
  useEffect(() => {
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
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Báo chiều cao nội dung cho web cha (script tuỳ chọn ở trang /embed dùng để co giãn iframe)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.parent === window) return;
    let last = 0;
    const send = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ type: EMBED_HEIGHT_MESSAGE, cam, height }, "*");
    };
    send();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cam]);

  const chron = useMemo<CamShot[]>(() => (feed?.items ? [...feed.items].reverse() : []), [feed]);
  const latest = feed?.latest ?? null;
  const lastIdx = chron.length - 1;
  const selIdx = selAt ? chron.findIndex((s) => s.takenAt === selAt) : -1;
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

  const goTo = useCallback(
    (i: number) => {
      if (!chron.length) return;
      const j = Math.max(0, Math.min(lastIdx, i));
      setDragIdx(null);
      setSelAt(j === lastIdx ? null : chron[j].takenAt);
    },
    [chron, lastIdx],
  );

  useEffect(() => {
    if (dragIdx === null) return;
    const id = window.setTimeout(() => goTo(dragIdx), SCRUB_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [dragIdx, goTo]);

  const onImgError = (url: string) =>
    setBroken((b) => {
      if (b.has(url)) return b;
      const n = new Set(b);
      n.add(url);
      return n;
    });

  const statusText =
    status === "notConfigured" ? TX.notConfigured[lang] : status === "resting" ? TX.resting[lang] : status === "offline" ? TX.offline[lang] : "";
  const showImage = shown && status !== "notConfigured" && status !== "loading";
  const viewingPast = selIdx >= 0 && selIdx < lastIdx;

  const marks = useMemo(() => {
    if (chron.length < 2) return [];
    const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (chron.length - 1)));
    return [...new Set(idx)].map((i) => ({ i, label: vnHHMM(chron[i].takenAt) }));
  }, [chron]);

  /** Ảnh mới nhất tải ngay (eager, ưu tiên cao); ảnh cũ chọn bằng thanh trượt thì lazy */
  const eager = selIdx < 0;

  return (
    <div ref={rootRef} className={`w-full overflow-hidden rounded-xl border ${T.root}`}>
      {/* Tiêu đề + giờ chụp */}
      <div className="flex h-9 items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-sm font-bold">📷 {cfg.name[lang]}</span>
        <span className={`flex shrink-0 items-center gap-1.5 text-xs ${T.muted}`}>
          {status === "live" && !viewingPast ? <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden /> : null}
          {showImage && sliderShot ? `${vnHHMMSS(sliderShot.takenAt)} · ${agoText(sliderShot.takenAt, now, lang)}` : null}
        </span>
      </div>

      {/* Ảnh 16:9 — khung giữ chỗ sẵn */}
      <div className={`relative aspect-video w-full ${T.frame}`}>
        {showImage && !shownBroken ? (
          <img
            key={shown.url}
            src={shown.url}
            alt={`${cfg.name[lang]} ${vnHHMM(shown.takenAt)}`}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => onImgError(shown.url)}
            className={`absolute inset-0 h-full w-full object-cover ${status === "live" ? "" : "opacity-60 grayscale-[40%]"}`}
          />
        ) : null}
        {showImage && shownBroken ? (
          <p className="absolute inset-x-0 bottom-2 px-3 text-center text-xs text-white/70">{TX.broken[lang]}</p>
        ) : null}
        {status === "loading" ? (
          <div className={`absolute inset-0 flex items-center justify-center text-sm ${T.faint}`}>
            <span className="animate-pulse">{TX.loading[lang]}</span>
          </div>
        ) : null}
        {statusText ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <span className="rounded-lg bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white">
              {status === "offline" ? "⚠️ " : status === "resting" ? "🌙 " : "🔌 "}
              {statusText}
              {latest && status !== "notConfigured" ? (
                <span className="mt-0.5 block text-xs font-normal text-white/70">
                  {TX.lastShot[lang]}: {vnHHMM(latest.takenAt)} · {agoText(latest.takenAt, now, lang)}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
      </div>

      {/* Thanh trượt 60 phút — cao cố định */}
      <div className="h-[62px] px-3 pt-2">
        {chron.length > 1 ? (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={TX.older[lang]}
                disabled={curIdx <= 0}
                onClick={() => goTo(curIdx - 1)}
                className={`h-8 w-8 shrink-0 rounded-lg border text-xs disabled:opacity-30 ${T.btn}`}
              >
                ◀
              </button>
              <div className="min-w-0 flex-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, lastIdx)}
                  value={Math.max(0, sliderIdx)}
                  onChange={(e) => setDragIdx(Number(e.target.value))}
                  className="block w-full accent-amber-400"
                  aria-label={TX.slider[lang]}
                  aria-valuetext={sliderShot ? vnHHMM(sliderShot.takenAt) : undefined}
                />
                <div className={`relative h-4 text-[10px] leading-4 ${T.faint}`}>
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
                aria-label={TX.newer[lang]}
                disabled={curIdx >= lastIdx}
                onClick={() => goTo(curIdx + 1)}
                className={`h-8 w-8 shrink-0 rounded-lg border text-xs disabled:opacity-30 ${T.btn}`}
              >
                ▶
              </button>
            </div>
            <div className={`truncate text-center text-[11px] leading-4 ${T.faint}`}>
              {viewingPast ? (
                <button type="button" onClick={() => goTo(lastIdx)} className={`underline underline-offset-2 ${T.link}`}>
                  {TX.latest[lang]}
                </button>
              ) : (
                `${chron.length} ${TX.count[lang]}`
              )}
            </div>
          </>
        ) : (
          <p className={`flex h-full items-center justify-center pb-2 text-center text-xs ${T.faint}`}>
            {status === "loading" ? "" : status === "notConfigured" || status === "resting" ? TX.schedule[lang] : TX.noShots[lang]}
          </p>
        )}
      </div>

      {/* Dòng nguồn cố định — xin đối tác giữ nguyên */}
      <div className={`border-t px-3 py-1.5 text-center text-xs ${T.footer}`}>
        <a href={EMBED_SOURCE_URL} target="_blank" rel="noopener" className={`font-semibold hover:underline ${T.link}`}>
          📷 {cfg.credit[lang]}
        </a>
      </div>
    </div>
  );
}
