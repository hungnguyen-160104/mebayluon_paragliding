"use client";

/**
 * PHẦN DÙNG CHUNG của khung camera (03/10/2026): CameraGallery (một camera) và
 * DualCameraGallery (hai mắt Khau Phạ, một thanh thời gian chung) cùng dùng.
 *
 *  - useInView     : chưa lướt tới thì chưa gọi API
 *  - useCamFeed    : tải /api/camera/<cam> khi hiện ra, làm mới 60s khi tab mở
 *  - useTimeline   : thanh trượt 60 phút + ◀ ▶ + timelapse tuần tự + phím tắt +
 *                    tải trước ĐÚNG một điểm kế tiếp; một "điểm" có thể mang 1
 *                    ảnh (một camera) hoặc 2 ảnh (hai mắt) — urlsOf() cho biết
 *  - Scrubber      : ◀ [thanh trượt + mốc giờ] ▶
 *  - TX / agoText  : chữ (vi/en như trước)
 */

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { CAM_ACTIVE, vnHHMM, type CamFeed, type CamId } from "@/lib/imou/cameras";

export const REFRESH_MS = 20_000;
/** Kéo thanh trượt: dừng tay chừng này mới tải ảnh */
const SCRUB_DEBOUNCE_MS = 300;
/** Timelapse: nghỉ chừng này SAU KHI ảnh hiện xong mới sang ảnh kế */
const PLAY_MS = 350; // 3 ảnh/phút giờ cao điểm (chủ 04/10) → nhiều khung gấp 3, chạy nhanh hơn cho đỡ lâu

export type Txt = { vi: string; en: string };
export const TX = {
  notConfigured: { vi: "Camera chưa kết nối", en: "Camera not connected yet" },
  resting: {
    vi: `Camera nghỉ (chụp ${CAM_ACTIVE.label})`,
    en: `Camera resting (shoots ${CAM_ACTIVE.label})`,
  },
  offline: { vi: "Camera tạm mất kết nối", en: "Camera temporarily offline" },
  loading: { vi: "Đang tải ảnh…", en: "Loading…" },
  schedule: {
    vi: `Chụp ${CAM_ACTIVE.label}: 3 ảnh/phút lúc 10–15h, 1 ảnh/phút giờ khác`,
    en: `Shoots ${CAM_ACTIVE.label}: 3 photos/min 10–15h, 1 photo/min otherwise`,
  },
  noShots: {
    vi: "Chưa có ảnh trong 60 phút qua",
    en: "No photos in the last 60 minutes",
  },
  noShotHere: { vi: "Không có ảnh lúc này", en: "No photo at this time" },
  lastShot: { vi: "Ảnh cuối", en: "Last photo" },
  justNow: { vi: "vừa xong", en: "just now" },
  broken: {
    vi: "Ảnh này không tải được (link đã hết hạn)",
    en: "Photo unavailable (link expired)",
  },
  close: { vi: "Đóng", en: "Close" },
  older: { vi: "Ảnh trước", en: "Older" },
  newer: { vi: "Ảnh sau", en: "Newer" },
  timelapse: { vi: "Chạy timelapse", en: "Play timelapse" },
  play: { vi: "Chạy", en: "Play" },
  pause: { vi: "Dừng", en: "Pause" },
  slider: {
    vi: "Chọn giờ ảnh (60 phút gần nhất)",
    en: "Pick photo time (last 60 min)",
  },
} satisfies Record<string, Txt>;

export function agoText(takenAt: string, now: number, vi: boolean): string {
  const min = Math.max(0, Math.floor((now - new Date(takenAt).getTime()) / 60_000));
  if (min < 1) return vi ? TX.justNow.vi : TX.justNow.en;
  if (min < 60) return vi ? `${min} phút trước` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h} h ago`;
  return vi ? `${Math.floor(h / 24)} ngày trước` : `${Math.floor(h / 24)} d ago`;
}

/** Khung đã (gần) lướt tới màn hình chưa */
export function useInView(ref: RefObject<HTMLElement | null>): boolean {
  // Trình duyệt không có IntersectionObserver → coi như luôn thấy
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

/** Feed của một camera: tải khi `visible`, làm mới mỗi 60s khi tab đang mở. */
export function useCamFeed(cam: CamId, visible: boolean): { feed: CamFeed | null; failed: boolean; fetchedAt: number } {
  const [feed, setFeed] = useState<CamFeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/camera/${cam}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setFeed((await res.json()) as CamFeed);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setFetchedAt(Date.now());
  }, [cam]);

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

  return { feed, failed, fetchedAt };
}

/** "Bây giờ" tự nhích 30s một lần — cho dòng "x phút trước"; `bump` = lúc vừa tải feed */
export function useNow(bump: number): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(tick, bump);
}

/** Một điểm trên thanh thời gian: `at` = giờ chụp (ISO) làm khoá */
export type TimelinePoint = { at: string };

/**
 * Thanh thời gian dùng chung. `chron` xếp CŨ → MỚI. `urlsOf(p)` = các link ảnh
 * của điểm p (1 ảnh hoặc 2 ảnh) — điểm "sẵn sàng" khi mọi ảnh đã hiện xong hoặc
 * đã lỗi; timelapse chỉ sang điểm sau khi điểm hiện tại sẵn sàng.
 */
export function useTimeline<P extends TimelinePoint>(chron: P[], urlsOf: (p: P) => string[], visible: boolean) {
  /** Giờ của điểm đang xem; null = luôn theo điểm mới nhất */
  const [selAt, setSelAt] = useState<string | null>(null);
  /** Vị trí thanh trượt lúc đang kéo (chưa tải ảnh); null = khớp điểm đang xem */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  /** Ý muốn chạy; thật sự chạy khi còn ô phóng to, khung còn trên màn hình và chưa tới cuối */
  const [playWanted, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  /** Hướng đi gần nhất (-1 về cũ, +1 về mới) — để tải trước đúng 1 điểm kế tiếp */
  const dirRef = useRef<1 | -1>(-1);

  const lastIdx = chron.length - 1;
  const selIdx = selAt ? chron.findIndex((p) => p.at === selAt) : -1;
  const curIdx = selIdx >= 0 ? selIdx : lastIdx;
  const sliderIdx = dragIdx ?? curIdx;
  const viewingPast = selIdx >= 0 && selIdx < lastIdx;
  const current: P | undefined = chron[curIdx];
  // Tới ảnh cuối / ra khỏi màn hình / tab ẩn → coi như dừng
  const playing = playWanted && zoomOpen && visible && curIdx < lastIdx;

  const isDone = useCallback((u: string) => loaded.has(u) || broken.has(u), [loaded, broken]);
  const currentReady = current ? urlsOf(current).every(isDone) : false;

  const goTo = useCallback(
    (i: number) => {
      if (!chron.length) return;
      const j = Math.max(0, Math.min(lastIdx, i));
      setDragIdx(null);
      setSelAt(j === lastIdx ? null : chron[j].at);
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
  const drag = useCallback(
    (v: number) => {
      dirRef.current = v < curIdx ? -1 : 1;
      setPlaying(false);
      setDragIdx(v);
    },
    [curIdx],
  );

  // Kéo thanh trượt: dừng tay SCRUB_DEBOUNCE_MS mới tải ảnh ở vị trí đó
  useEffect(() => {
    if (dragIdx === null) return;
    const id = window.setTimeout(() => goTo(dragIdx), SCRUB_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [dragIdx, goTo]);

  // Điểm đang xem hiện xong → tải trước ĐÚNG 1 điểm kế tiếp theo hướng đang đi
  useEffect(() => {
    if (!currentReady || curIdx < 0) return;
    const next = chron[curIdx + dirRef.current];
    if (!next) return;
    for (const u of urlsOf(next)) {
      if (broken.has(u) || loaded.has(u)) continue;
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.src = u;
    }
  }, [currentReady, curIdx, chron, urlsOf, broken, loaded]);

  // Timelapse tuần tự: điểm hiện xong (hoặc lỗi) mới nghỉ PLAY_MS rồi sang điểm sau
  useEffect(() => {
    if (!playing || !current || !currentReady) return;
    const id = window.setTimeout(() => {
      goTo(curIdx + 1);
      if (curIdx + 1 >= lastIdx) setPlaying(false);
    }, PLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, current, currentReady, curIdx, lastIdx, goTo]);

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

  const startTimelapse = useCallback(() => {
    dirRef.current = 1;
    if (curIdx >= lastIdx) goTo(0);
    setZoomOpen(true);
    setPlaying(true);
  }, [curIdx, lastIdx, goTo]);

  const onImgLoad = useCallback(
    (u: string) =>
      setLoaded((s) => {
        if (s.has(u)) return s;
        const n = new Set(s);
        n.add(u);
        return n;
      }),
    [],
  );
  const onImgError = useCallback(
    (u: string) =>
      setBroken((b) => {
        if (b.has(u)) return b;
        const n = new Set(b);
        n.add(u);
        return n;
      }),
    [],
  );

  /** Mốc giờ bằng chữ dưới thanh trượt: 5 mốc chia đều (theo chỉ số điểm) */
  const marks = useMemo(() => {
    if (chron.length < 2) return [];
    const idx = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (chron.length - 1)));
    return [...new Set(idx)].map((i) => ({ i, label: vnHHMM(chron[i].at) }));
  }, [chron]);

  return {
    selIdx,
    curIdx,
    lastIdx,
    sliderIdx,
    viewingPast,
    current,
    sliderPoint: chron[sliderIdx] as P | undefined,
    goTo,
    step,
    drag,
    zoomOpen,
    setZoomOpen,
    closeZoom,
    playing,
    setPlaying,
    startTimelapse,
    broken,
    onImgLoad,
    onImgError,
    marks,
  };
}

export type Timeline = ReturnType<typeof useTimeline>;

/** ◀ [thanh trượt + mốc giờ] ▶ — dùng chung cho khung và ô phóng to */
export function Scrubber({ tl, dark, L }: { tl: Timeline; dark: boolean; L: (t: Txt) => string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={L(TX.older)}
        disabled={tl.curIdx <= 0}
        onClick={() => tl.step(-1)}
        className={`${dark ? "h-10 w-10" : "h-8 w-8"} shrink-0 rounded-lg border border-white/25 text-white disabled:opacity-30`}
      >
        ◀
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, tl.lastIdx)}
          value={Math.max(0, tl.sliderIdx)}
          onChange={(e) => tl.drag(Number(e.target.value))}
          className="block w-full accent-amber-400"
          aria-label={L(TX.slider)}
          aria-valuetext={tl.sliderPoint ? vnHHMM(tl.sliderPoint.at) : undefined}
        />
        <div className="relative h-4 text-[10px] leading-4 text-white/50">
          {tl.marks.map((m) => (
            <span
              key={m.i}
              className="absolute top-0 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(m.i / Math.max(1, tl.lastIdx)) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={L(TX.newer)}
        disabled={tl.curIdx >= tl.lastIdx}
        onClick={() => tl.step(1)}
        className={`${dark ? "h-10 w-10" : "h-8 w-8"} shrink-0 rounded-lg border border-white/25 text-white disabled:opacity-30`}
      >
        ▶
      </button>
    </div>
  );
}
