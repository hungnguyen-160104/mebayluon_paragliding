// components/posts/FixedSix.server.tsx
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

type PostLite = {
  _id: string;
  slug: string;
  title?: string;
  titleVi?: string;
  coverImage?: string;
  thumbnail?: string;
  excerpt?: string;
  excerptVi?: string;
  publishedAt?: string;
  createdAt?: string;
};

function pickTitle(post: PostLite, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

export default async function FixedSixServer() {
  const c = await cookies();
  const rawLang = c.get("language")?.value || c.get("lang")?.value || "vi";
  const isVietnamese = String(rawLang).toLowerCase().startsWith("vi");

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
  const url = `${base}/api/posts?isPublished=true&category=news&fixed=true&limit=6&sort=-publishedAt,-createdAt`;

  // SSR fetch có cache/ISR -> không loop
  const res = await fetch(url, {
    next: { revalidate: 300 }, // cache 5 phút
    cache: "force-cache",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { items: PostLite[] };
  const posts = data?.items || [];
  if (!posts.length) return null;

  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => {
        const img = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
        const date = p.publishedAt || p.createdAt;
        const currentTitle = pickTitle(p, isVietnamese);
        
        return (
          <Link
            key={p._id}
            href={`/blog/${p.slug}`}
            className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:bg-white/15 transition"
          >
            <div className="relative h-40">
              <Image src={img} alt={currentTitle} fill className="object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            </div>
            <div className="p-4 text-white">
              <h3 className="font-semibold line-clamp-2">{currentTitle}</h3>
              {date && (
                <p className="text-xs text-white/70 mt-1">
                  {new Date(date).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </section>
  );
}
