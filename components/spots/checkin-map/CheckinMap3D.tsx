"use client";
// components/spots/checkin-map/CheckinMap3D.tsx
/**
 * Khung bản đồ check-in 3D (chủ duyệt bản 11, 10/10/2026).
 *
 * Trang chỉ tải MỘT ảnh sơ đồ tĩnh (nen-1600.webp, lazy). Khi khối tới gần màn hình
 * (600px) mới tải engine.ts (khối JS riêng) + dữ liệu /checkin-map/data-<vi|en>.json,
 * gắn shadow root và dựng bản đồ; MapLibre GL tải từ CDN bên trong engine. Shadow
 * root che ảnh tĩnh của React (ảnh không được "slot") nên không có bước nhảy hình.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ganTienTo, useUrlLocale } from "@/components/locale-link";
import { CK_ANCHORS, ckUi } from "@/lib/checkin-map/embed";

/** Cỡ khung = cỡ #stage trong engine.css — giữ chỗ đúng bằng bản đồ để trang không xô. */
const STAGE_STYLE: React.CSSProperties = {
  width: "min(100%, calc((100vh - 150px) * 2400 / 2831))",
  aspectRatio: "2400 / 2831",
  margin: "0 auto",
};

export default function CheckinMap3D({
  lang,
  pageLang,
  articles,
  alt,
  focus,
  withDetails = false,
  currentSlug,
}: {
  /** Ngôn ngữ dữ liệu thẻ điểm: vi, hoặc en cho mọi ngôn ngữ khác. */
  lang: "vi" | "en";
  /** Ngôn ngữ trang (6 ngôn ngữ) — chữ giao diện của bản đồ (CK_UI). */
  pageLang?: string;
  /** Mã điểm → slug bài ĐÃ ĐĂNG (máy chủ kiểm DB). */
  articles: Partial<Record<string, string>>;
  alt: string;
  /** Mở sẵn ở điểm này (khối bản đồ trong bài viết của điểm). */
  focus?: string;
  /** Có danh sách điểm (#ck-stop-<mã>) dưới bản đồ → hiện nút "Chi tiết ↓" (trang /spots/khau-pha). */
  withDetails?: boolean;
  /** Bài đang đọc: bỏ link "Đọc bài" trỏ về chính nó. */
  currentSlug?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const urlLocale = useUrlLocale();
  const articlesKey = JSON.stringify(articles);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let destroy: (() => void) | null = null;
    let cancelled = false;
    const links: Record<string, string> = {};
    for (const [id, slug] of Object.entries(JSON.parse(articlesKey) as Record<string, string>)) {
      if (slug !== currentSlug) links[id] = ganTienTo(`/blog/${slug}`, urlLocale) + (CK_ANCHORS[id] ? `#${CK_ANCHORS[id]}` : "");
    }
    const ui = ckUi(pageLang ?? lang);

    const start = async () => {
      const [{ mountCheckinMap }, data] = await Promise.all([
        import("./engine"),
        fetch(`/checkin-map/data-${lang}.json`).then((r) => {
          if (!r.ok) throw new Error(`data-${lang}.json ${r.status}`);
          return r.json();
        }),
      ]);
      if (cancelled) return;
      const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
      destroy = mountCheckinMap(root, data, {
        links,
        focus,
        ui: { alt, home: ui.home, hint: ui.hint, close: ui.close, read: ui.read, details: ui.details, stops: ui.stops, dem: ui.dem },
        onNavigate: (href) => router.push(href),
        onDetails: withDetails
          ? (id) => {
              const item = document.getElementById(`ck-stop-${id}`);
              if (!item) return;
              if (item instanceof HTMLDetailsElement) item.open = true;
              item.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          : undefined,
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start().catch((err) => console.warn("[check-in map] không tải được — giữ sơ đồ tĩnh", err));
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);

    // Nút "Xem trên bản đồ" trong danh sách điểm (máy chủ render): cuộn lên bản đồ rồi bay tới điểm.
    const onListClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest?.("[data-ck-tap]");
      if (!btn) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const api = (el as unknown as { __ck?: { tap: (id: string) => void } }).__ck;
      const id = btn.getAttribute("data-ck-tap");
      if (api && id) window.setTimeout(() => api.tap(id), 450);
    };
    document.addEventListener("click", onListClick);

    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("click", onListClick);
      destroy?.();
    };
  }, [lang, pageLang, articlesKey, urlLocale, router, focus, withDetails, currentSlug, alt]);

  return (
    <div ref={host} className="overflow-hidden rounded-xl" style={STAGE_STYLE}>
      {/* Khung đầu (và là bản cho trình duyệt không chạy JS): sơ đồ tĩnh. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/checkin-map/nen-1600.webp"
        alt={alt}
        width={1600}
        height={1887}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover"
      />
    </div>
  );
}
