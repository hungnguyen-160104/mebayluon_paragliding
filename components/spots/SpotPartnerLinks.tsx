"use client";

// components/spots/SpotPartnerLinks.tsx
// Khối "Xem thêm thông tin điểm bay tại…" — vị trí Google Maps của bãi cất/hạ
// cánh và các trang bán tour trên OTA của riêng điểm bay đang xem.
// Dữ liệu ở lib/spot-partner-links.ts, màu nút ở lib/partner-links.ts.

import Link from "next/link";
import { MapPin, ExternalLink, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

import { BRAND_BUTTON_CLASS } from "@/lib/partner-links";
import { getSpotLinks, SPOT_LINK_I18N } from "@/lib/spot-partner-links";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export default function SpotPartnerLinks({
  slug,
  lang,
}: {
  slug?: string | null;
  lang: Lang;
}) {
  const group = getSpotLinks(slug);
  const courses = group?.courses ?? [];

  if (
    !group ||
    (group.maps.length === 0 &&
      group.partners.length === 0 &&
      courses.length === 0)
  ) {
    return null;
  }

  const L = SPOT_LINK_I18N[lang] ?? SPOT_LINK_I18N.vi;

  return (
    <section className="relative z-10 pb-4 pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="container mx-auto max-w-4xl rounded-2xl border border-white/20 bg-black/25 px-6 py-7 shadow-lg backdrop-blur-xl"
      >
        {group.maps.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <MapPin size={16} className="text-accent" />
              {L.mapsTitle}
            </h3>

            <ul className="flex flex-wrap gap-2">
              {group.maps.map((link) => (
                <li key={link.url + link.kind}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:shadow-lg ${BRAND_BUTTON_CLASS[link.brand]}`}
                  >
                    <MapPin size={15} />
                    <span>
                      {L[link.kind]}
                      {link.platform === "Google Maps" ? "" : ` – ${link.platform}`}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Điểm bay này cũng là trường dạy dù — dẫn thẳng sang bài khoá học. */}
        {courses.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <GraduationCap size={16} className="text-accent" />
              {L.coursesTitle}
            </h3>

            <ul className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <li key={course.href}>
                  <Link
                    href={course.href}
                    className="inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-lg"
                  >
                    {L[course.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {group.partners.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <ExternalLink size={16} className="text-accent" />
              {L.partnersTitle}
            </h3>

            <ul className="flex flex-wrap gap-2">
              {group.partners.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    /* Trang bán tour trên OTA là quan hệ thương mại có ăn chia,
                       Google yêu cầu đánh dấu "sponsored". Riêng trang đánh giá
                       (Tripadvisor) là hồ sơ của chính mình nên để thường. */
                    rel={
                      link.kind === "reviews"
                        ? "noopener noreferrer"
                        : "noopener noreferrer sponsored"
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:shadow-lg ${BRAND_BUTTON_CLASS[link.brand]}`}
                  >
                    <span>{link.platform}</span>
                    <span className="opacity-75">· {L[link.kind]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </section>
  );
}
