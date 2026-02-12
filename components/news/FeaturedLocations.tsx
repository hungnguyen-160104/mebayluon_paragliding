// components/news/FeaturedLocations.tsx
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

type FixedPost = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string | null;
  thumbnail?: string | null;
  fixedKey?: string | null;
  date?: string;
};

async function getBase(): Promise<string> {
  const pub = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (pub) return pub.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:8080";
}

export default async function FeaturedLocations() {
  const base = await getBase();
  const res = await fetch(`${base}/api/posts/featured-locations`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const posts = (await res.json()) as FixedPost[];
  if (!posts.length) return null;

  return (
    <section className="relative z-10 py-10 md:py-14">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
          Điểm bay nổi bật (Tin tức cố định)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link
              key={p.id || p.slug}
              href={`/blog/${p.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-white/15 backdrop-blur-md shadow-xl border border-white/20 transition"
            >
              <div className="relative h-48">
                <Image
                  src={p.thumbnail || p.coverImage || "/images/mebayluon.jpg"}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </div>
              <div className="p-5 text-white">
                <h3 className="text-lg font-semibold line-clamp-2 mb-1">
                  {p.title}
                </h3>
                {p.date && (
                  <p className="text-xs text-white/80">
                    {new Date(p.date).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {p.excerpt && (
                  <p className="text-sm text-white/90 line-clamp-2 mt-2">{p.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
