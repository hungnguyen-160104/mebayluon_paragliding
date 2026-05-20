"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type RecentPost = {
  id: string;
  slug: string;
  title: string;
  date: string;
  thumbnail: string | null;
  excerpt: string;
};

type RecentPostsProps = {
  title?: string;
};

export default function RecentPosts({
  title = "BÀI VIẾT MỚI NHẤT",
}: RecentPostsProps) {
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchRecentPosts() {
      try {
        setLoading(true);

        const res = await fetch("/api/posts/recent?limit=3");

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

  if (loading || posts.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="mb-6 text-center text-3xl font-extrabold text-white drop-shadow md:text-4xl">
          {title}
        </h2>
      </div>

      <div className="container mx-auto max-w-6xl px-4">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const cover = post.thumbnail || "/images/mebayluon.jpg";

            return (
              <li key={post.id || post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group"
                  prefetch={false}
                >
                  <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:shadow-xl">
                    <div className="relative h-44 w-full overflow-hidden md:h-48">
                      <Image
                        src={cover}
                        alt={post.title}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    <div className="p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg font-bold text-white group-hover:text-white/90 md:text-xl">
                        {post.title}
                      </h3>

                      <p className="line-clamp-3 text-sm text-white/80">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}