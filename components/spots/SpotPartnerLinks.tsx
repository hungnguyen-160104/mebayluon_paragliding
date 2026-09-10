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
        /* Cùng bề ngang với thẻ giới thiệu, thẻ thời tiết và thẻ đặt bay ở trên
           (max-w-5xl) — bốn thẻ xếp chồng phải thẳng mép (chủ 10/09). Rộng thêm
           cũng vừa đủ để ba nút bản đồ nằm một hàng thay vì gãy xuống dòng. */
        className="container mx-auto max-w-5xl rounded-2xl border border-white/20 bg-black/25 px-6 py-7 text-center shadow-lg backdrop-blur-xl"
      >
        {group.maps.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <MapPin size={16} className="text-accent" />
              {L.mapsTitle}
            </h3>

            {/* BA NÚT BẢN ĐỒ MỘT HÀNG từ 1024px (chủ 10/09): ba cái là một bộ —
                bãi cất, bãi cất động cơ, bãi hạ — đứng chung hàng thì đọc ra
                ngay là ba chỗ khác nhau, chứ rơi xuống dòng trông như hai nhóm
                rời. Điện thoại vẫn xuống dòng, ép một hàng thì chữ bé không đọc nổi. */}
            <ul className="flex flex-wrap justify-center gap-2 lg:flex-nowrap">
              {group.maps.map((link) => (
                <li key={link.url + link.kind} className="lg:shrink-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    /* KHÔNG bẻ dòng CHỈ TỪ 1024px: nhãn dài nhất ("Bãi cất cánh dù
                       lượn gắn động cơ – Clubhouse Mebayluon") rộng 412px, ép một
                       dòng trên máy 390px là tràn cả trang ra 11px và trôi ngang
                       (chủ báo 10/09). Điện thoại cứ để nó xuống dòng. */
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold shadow-md ring-1 ring-black/10 transition-all hover:-translate-y-0.5 hover:shadow-lg lg:whitespace-nowrap lg:px-2.5 lg:text-[13px] ${BRAND_BUTTON_CLASS[link.brand]}`}
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
            <h3 className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <GraduationCap size={16} className="text-accent" />
              {L.coursesTitle}
            </h3>

            <ul className="flex flex-wrap justify-center gap-2">
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
            <h3 className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
              <ExternalLink size={16} className="text-accent" />
              {L.partnersTitle}
            </h3>

            <ul className="flex flex-wrap justify-center gap-2">
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
