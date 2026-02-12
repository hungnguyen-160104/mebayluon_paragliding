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

export default function RecentPosts() {
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/posts/recent?limit=3", {
          next: { revalidate: 120 },
        });
        const data: RecentPost[] = await res.json();
        if (!ignore) setPosts(Array.isArray(data) ? data : []);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading || posts.length === 0) return null;

  return (
    <section className="py-8">
      {/* tiêu đề căn giữa + chữ trắng */}
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold text-white drop-shadow mb-6">
          BÀI VIẾT MỚI NHẤT
        </h2>
      </div>

      {/* lưới + khối nội dung căn giữa trên trang */}
      <div className="container mx-auto max-w-6xl px-4">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const cover = p.thumbnail || "/images/mebayluon.jpg";
            return (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`} className="group" prefetch={false}>
                  <div className="rounded-2xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300 hover:shadow-xl">
                    {/* ảnh nhỏ lại một chút */}
                    <div className="relative h-44 md:h-48 w-full overflow-hidden">
                      <Image
                        src={cover}
                        alt={p.title}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    <div className="p-5">
                      {/* chữ trắng */}
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-white/90">
                        {p.title}
                      </h3>
                      <p className="text-sm text-white/80 line-clamp-3">{p.excerpt}</p>
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
