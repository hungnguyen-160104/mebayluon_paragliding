"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type PostLite = {
  _id: string;
  slug: string;
  title: string;
  coverImage?: string;
  thumbnail?: string;
  excerpt?: string;
  publishedAt?: string;
  createdAt?: string;
};

export default function FixedSixClient() {
  const [posts, setPosts] = useState<PostLite[] | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          "/api/posts?isPublished=true&category=news&fixed=true&limit=6&sort=-publishedAt,-createdAt",
          { signal: ac.signal, cache: "no-store" } // ONE-OFF
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPosts(data.items || []);
      } catch {
        // ignore
      }
    })();

    // cleanup -> không rò rỉ/loop
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []); // <-- BẮT BUỘC LÀ [] !!!

  if (!posts?.length) return null;

  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => {
        const img = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
        const date = p.publishedAt || p.createdAt;
        return (
          <Link
            key={p._id}
            href={`/blog/${p.slug}`}
            className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:bg-white/15 transition"
          >
            <div className="relative h-40">
              <Image src={img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
            <div className="p-4 text-white">
              <h3 className="font-semibold line-clamp-2">{p.title}</h3>
              {date && (
                <p className="text-xs text-white/70 mt-1">
                  {new Date(date).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
