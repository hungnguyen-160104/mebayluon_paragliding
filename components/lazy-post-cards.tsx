"use client";

// components/lazy-post-cards.tsx
/**
 * Nút "Xem thêm" dùng chung cho /blog và /knowledge — tải bài kiểu lazy
 * để trang nhẹ.
 *
 * Server chỉ render 25 bài đầu; mỗi lần bấm nút, component gọi
 * /api/post-cards (bản nhẹ, không có content) lấy thêm 15 bài rồi nối vào
 * lưới 4 cột (desktop) và danh sách ngang (mobile) — markup thẻ giữ đúng
 * như phần server render để nhìn liền mạch.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const LOAD_MORE_STEP = 15;

type CardPost = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string | null;
};

export function LazyPostCards({
  category,
  sub = "all",
  exclude = "",
  lang,
  initialCount,
  total,
  seeMoreLabel,
  loadingLabel,
  dateLocale,
  longDate = false,
  unknownDate,
  accent = "sky",
}: {
  /** "knowledge" hoặc "news" (blog). */
  category: "knowledge" | "news";
  /** Chuyên mục con của knowledge ("all" = tất cả). */
  sub?: string;
  /** Slug cần loại khỏi kết quả (bài ghim đã render sẵn trên trang). */
  exclude?: string;
  lang: string;
  /** Số bài (không tính bài ghim) server đã render sẵn. */
  initialCount: number;
  /** Tổng số bài (không tính bài ghim) của danh mục. */
  total: number;
  seeMoreLabel: string;
  loadingLabel: string;
  dateLocale: string;
  /** true → "29 tháng 7, 2026" (kiểu trang blog); false → "29/7/2026". */
  longDate?: boolean;
  unknownDate: string;
  /** Màu hover tiêu đề: knowledge = sky, blog = red. */
  accent?: "sky" | "red";
}) {
  const [extras, setExtras] = useState<CardPost[]>([]);
  const [loading, setLoading] = useState(false);

  const loaded = initialCount + extras.length;
  const hasMore = loaded < total;

  const hoverClass =
    accent === "red" ? "group-hover:text-red-300" : "group-hover:text-sky-300";

  const formatDate = (s: string | null) =>
    s
      ? new Date(s).toLocaleDateString(
          dateLocale,
          longDate
            ? { year: "numeric", month: "long", day: "numeric" }
            : undefined
        )
      : unknownDate;

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        sub,
        lang,
        skip: String(loaded),
        limit: String(LOAD_MORE_STEP),
      });
      if (exclude) params.set("exclude", exclude);
      const res = await fetch(`/api/post-cards?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setExtras((prev) => [...prev, ...data.items]);
      }
    } catch {
      // lỗi mạng — giữ nguyên danh sách, người dùng bấm lại
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {extras.length > 0 && (
        <>
          {/* Desktop: nối tiếp lưới 4 cột phía trên (cùng gap-5) */}
          <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-4">
            {extras.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-lg border border-white/15 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20">
                <div className="relative aspect-video overflow-hidden">
                  <Image src={p.cover} alt={p.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className={`mb-1 line-clamp-2 text-base md:text-lg font-semibold leading-snug ${hoverClass}`}>
                    {p.title}
                  </p>
                  {p.excerpt ? (
                    <p className="mb-1.5 line-clamp-2 text-xs text-white/70">{p.excerpt}</p>
                  ) : null}
                  <span className="text-xs text-white/55">{formatDate(p.date)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile: nối tiếp danh sách ngang phía trên (cùng gap-2) */}
          <ul className="mt-2 flex flex-col gap-2 lg:hidden">
            {extras.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group flex gap-3 rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md">
                    <Image src={p.cover} alt={p.title} fill className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center gap-1">
                    <p className={`line-clamp-2 text-base font-semibold leading-snug ${hoverClass}`}>
                      {p.title}
                    </p>
                    {p.excerpt ? (
                      <p className="line-clamp-2 text-xs text-white/70">{p.excerpt}</p>
                    ) : null}
                    <span className="text-xs text-white/55">{formatDate(p.date)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          /* Nền trắng mờ 10% chìm vào ảnh nền -> nền accent đặc, viền sáng,
             đổ bóng. Cùng kiểu với các nút hành động chính khác của site. */
          className="mx-auto mt-8 block w-full max-w-md rounded-full border border-white/30 bg-accent/40 py-3.5 text-base font-semibold text-white shadow-xl shadow-black/50 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-2xl disabled:translate-y-0 disabled:opacity-60"
        >
          {loading ? loadingLabel : `${seeMoreLabel} ↓`}
        </button>
      ) : null}
    </>
  );
}
