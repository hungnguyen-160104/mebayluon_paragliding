"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type RecentPost = {
  id: string;
  slug: string;
  title?: string;
  titleVi?: string;
  date: string;
  thumbnail: string | null;
  excerpt?: string;
  excerptVi?: string;
};

type RecentPostsProps = {
  title?: string;
};

/** Số bài lấy về — xếp hàng ngang, cuộn bằng hai nút mũi tên. */
const POST_LIMIT = 6;

function pickTitle(post: RecentPost, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: RecentPost, isVietnamese: boolean) {
  return isVietnamese
    ? post.excerptVi || post.excerpt || ""
    : post.excerpt || post.excerptVi || "";
}

export default function RecentPosts({
  title,
}: RecentPostsProps) {
  const { language } = useLanguage();
  const isVietnamese = language === "vi";
  const displayTitle = title || (isVietnamese ? "BÀI VIẾT MỚI NHẤT" : "LATEST POSTS");

  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const trackRef = useRef<HTMLUListElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchRecentPosts() {
      try {
        setLoading(true);

        const res = await fetch(`/api/posts/recent?limit=${POST_LIMIT}`);

        if (!res.ok) {
          throw new Error("Failed to load recent posts");
        }

        const data = await res.json();

        if (!ignore) {
          setPosts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("[RecentPosts]", error);

        if (!ignore) {
          setPosts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchRecentPosts();

    return () => {
      ignore = true;
    };
  }, []);

  /** Ẩn/hiện mũi tên theo vị trí cuộn hiện tại. */
  const syncArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const max = track.scrollWidth - track.clientWidth;

    setCanScrollLeft(track.scrollLeft > 8);
    setCanScrollRight(track.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    if (posts.length === 0) return;

    syncArrows();

    window.addEventListener("resize", syncArrows);
    return () => window.removeEventListener("resize", syncArrows);
  }, [posts, syncArrows]);

  /** Cuộn đúng một thẻ mỗi lần bấm, dựa trên bề rộng thật của thẻ đầu tiên. */
  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const card = track.querySelector("li");
    const step = card ? card.clientWidth + 24 : track.clientWidth;

    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (loading || posts.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="text-hero-shadow mb-6 text-center text-3xl font-extrabold text-white md:text-4xl">
          {displayTitle}
        </h2>
      </div>

      <div className="container relative mx-auto max-w-6xl px-4">
        {/* Hàng ngang cuộn được: 1 thẻ trên mobile, 2 trên tablet, 3 trên
            desktop — 6 bài nên luôn còn thẻ để kéo tiếp. */}
        <ul
          ref={trackRef}
          onScroll={syncArrows}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {posts.map((post) => {
            const cover = post.thumbnail || "/images/mebayluon.jpg";
            const currentTitle = pickTitle(post, isVietnamese);
            const currentExcerpt = pickExcerpt(post, isVietnamese);

            return (
              <li
                key={post.id || post.slug}
                className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full"
                  prefetch={false}
                >
                  <div className="h-full overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:shadow-xl">
                    <div className="relative h-44 w-full overflow-hidden md:h-48">
                      <Image
                        src={cover}
                        alt={currentTitle}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 85vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    <div className="p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg font-bold text-white group-hover:text-white/90 md:text-xl">
                        {currentTitle}
                      </h3>

                      <p className="line-clamp-3 text-sm text-white/80">
                        {currentExcerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollLeft}
          aria-label={isVietnamese ? "Bài trước" : "Previous posts"}
          className="absolute left-0 top-[5.5rem] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0 md:-left-2"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollRight}
          aria-label={isVietnamese ? "Bài tiếp theo" : "Next posts"}
          className="absolute right-0 top-[5.5rem] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white shadow-lg backdrop-blur-md transition-opacity hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0 md:-right-2"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </section>
  );
}
