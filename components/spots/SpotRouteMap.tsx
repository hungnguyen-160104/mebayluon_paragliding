"use client";

// components/spots/SpotRouteMap.tsx
// Khối "Bản đồ đường đi" (#route-map) trên trang điểm bay — hình phối cảnh 3D
// đường tới bãi cất/hạ cánh, đặt ngay dưới khối "Vị trí điểm bay trên Google
// Maps" (SpotPartnerLinks gắn khối này vào). Dữ liệu ở lib/spot-route-maps.ts;
// điểm bay chưa khai bản đồ thì khối tự ẩn.
//
// Ảnh dùng thẻ <img> thường + srcset Cloudinary (f_auto,q_auto,w_…) chứ không
// qua next/image: Cloudinary tự đổi định dạng và thu cỡ, khỏi tốn lượt tối ưu
// ảnh của Vercel cho một tệp vốn đã nằm trên CDN. width/height khai sẵn nên
// trình duyệt giữ chỗ trước khi ảnh về (không xô lệch bố cục); loading="lazy"
// vì khối nằm sâu dưới trang.
//
// Hình cao (dọc 3:4 → 4:7) nên bó bề ngang: một hình thì tối đa ~32rem, hai
// hình thì hai cột từ 768px. Chạm vào hình mở tệp đầy đủ ở thẻ mới — nhãn trên
// bản đồ nhỏ, khách cần phóng to mới đọc hết.

import Link from "@/components/locale-link";
import { motion } from "framer-motion";
import { ArrowRight, Maximize2, Route } from "lucide-react";

import { cloudinaryOptimize } from "@/lib/cloudinary-url";
import {
  getSpotRouteMaps,
  ROUTE_MAP_I18N,
  type RouteMapLang,
} from "@/lib/spot-route-maps";
import { SPOT_SECTION_HEADING } from "./section-heading";

/** Các bề rộng phát ra trong srcset (ảnh gốc 1600px). */
const WIDTHS = [480, 640, 960, 1280, 1600];

export default function SpotRouteMap({
  slug,
  lang,
  currentPath,
}: {
  slug?: string | null;
  lang: RouteMapLang;
  /** Trang đang hiển thị khối (vd "/ppg") — hình nào có link trỏ về chính trang này thì ẩn link. */
  currentPath?: string;
}) {
  const maps = getSpotRouteMaps(slug);
  if (maps.length === 0) return null;

  const L = ROUTE_MAP_I18N[lang] ?? ROUTE_MAP_I18N.vi;
  const two = maps.length > 1;

  return (
    <section id="route-map" className="relative z-10 pb-4 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        /* Cùng bề ngang và cùng kiểu thẻ với khối vị trí ngay phía trên (max-w-5xl). */
        className="container mx-auto max-w-5xl rounded-2xl border border-white/20 bg-black/25 px-4 py-7 text-center shadow-lg backdrop-blur-xl sm:px-6"
      >
        <h2 className={`${SPOT_SECTION_HEADING} flex items-center justify-center gap-2.5`}>
          <Route size={24} className="shrink-0 text-accent" aria-hidden />
          {L.heading}
        </h2>
        <p className="mt-2 text-sm text-slate-200">{L.lead}</p>

        <div
          className={
            two
              ? "mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-6"
              : "mx-auto mt-6 max-w-lg"
          }
        >
          {maps.map((map) => {
            const T = map.text[lang] ?? map.text.vi;
            const src = lang === "vi" && map.srcVi ? map.srcVi : map.src;
            return (
              <figure
                key={map.id}
                id={`route-map-${map.id}`}
                className="mx-auto flex w-full max-w-lg flex-col"
              >
                <h3 className="mb-3 font-serif text-lg font-bold text-white sm:text-xl">
                  {T.title}
                </h3>

                <a
                  href={cloudinaryOptimize(src, 1600)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${L.open}: ${T.title}`}
                  title={L.open}
                  className="group relative block overflow-hidden rounded-xl border border-white/20 bg-black/30 shadow-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinaryOptimize(src, 960)}
                    srcSet={WIDTHS.map((w) => `${cloudinaryOptimize(src, w)} ${w}w`).join(", ")}
                    sizes="(min-width: 768px) 30rem, calc(100vw - 4rem)"
                    width={map.width}
                    height={map.height}
                    alt={T.alt}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                  <span className="pointer-events-none absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md ring-1 ring-white/30 transition-transform group-hover:scale-110">
                    <Maximize2 size={16} aria-hidden />
                  </span>
                </a>

                <figcaption className="mt-3 text-left text-[13px] leading-relaxed text-slate-200 sm:text-sm">
                  {T.caption}{" "}
                  <span className="text-slate-300/90">{L.note}</span>
                </figcaption>

                {map.href !== currentPath && (
                <Link
                  href={map.href}
                  className="mt-3 inline-flex items-center gap-1.5 self-start text-left text-sm font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200"
                >
                  <span>{T.link}</span>
                  <ArrowRight size={15} className="shrink-0" aria-hidden />
                </Link>
                )}
              </figure>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
