"use client";

// app/blog/[slug]/RelatedPosts.tsx
/**
 * Danh sách bài viết liên quan có nút "Xem thêm".
 *
 * Hiện 8 bài đầu; mỗi lần bấm "Xem thêm" mở thêm 10 bài (8 → 18 → 28...).
 * Server truyền sẵn TOÀN BỘ danh sách + nhãn đã dịch — component chỉ lo
 * việc cắt hiển thị, nên không cần gọi API khi bấm.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const INITIAL_COUNT = 8;
const LOAD_MORE_STEP = 10;

export type RelatedPostItem = {
  slug: string;
  title: string;
  cover: string;
  dateLabel?: string;
};

function SeeMoreButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full rounded-xl border border-white/25 bg-white/10 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white/20"
    >
      {label} ↓
    </button>
  );
}

/** Bản lưới 2 cột — hiện trên mobile. */
export function RelatedPostsGrid({
  posts,
  seeMoreLabel,
}: {
  posts: RelatedPostItem[];
  seeMoreLabel: string;
}) {
  const [count, setCount] = useState(INITIAL_COUNT);
  const visible = posts.slice(0, count);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((item) => (
          <Link
            key={item.slug}
            href={`/blog/${item.slug}`}
            className="group flex gap-3 rounded-xl border border-white/15 bg-white/10 p-3 transition-all hover:bg-white/20"
          >
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
              <Image src={item.cover} alt={item.title} fill className="object-cover" />
            </div>
            <p className="line-clamp-3 text-sm font-semibold leading-snug text-white group-hover:text-sky-300">
              {item.title}
            </p>
          </Link>
        ))}
      </div>

      {count < posts.length ? (
        <SeeMoreButton
          label={seeMoreLabel}
          onClick={() => setCount((c) => c + LOAD_MORE_STEP)}
        />
      ) : null}
    </>
  );
}

/** Bản cột dọc — sidebar desktop. */
export function RelatedPostsSidebar({
  posts,
  seeMoreLabel,
}: {
  posts: RelatedPostItem[];
  seeMoreLabel: string;
}) {
  const [count, setCount] = useState(INITIAL_COUNT);
  const visible = posts.slice(0, count);

  return (
    <>
      <div className="flex flex-col gap-4">
        {visible.map((item) => (
          <Link key={item.slug} href={`/blog/${item.slug}`} className="group flex gap-3">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={item.cover}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-1">
              <p className="line-clamp-3 text-sm font-semibold leading-snug text-white group-hover:text-sky-300">
                {item.title}
              </p>
              {item.dateLabel ? (
                <span className="text-xs text-white/45">{item.dateLabel}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {count < posts.length ? (
        <SeeMoreButton
          label={seeMoreLabel}
          onClick={() => setCount((c) => c + LOAD_MORE_STEP)}
        />
      ) : null}
    </>
  );
}
