// app/knowledge/[sub]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import KnowledgeTabs, { KnowledgeSub } from "@/components/knowledge/KnowledgeTabs";

type Item = {
  _id: string;
  slug: string;
  title: string;
  thumbnail?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  excerpt?: string;
};

// Map slug → giá trị subCategory đang lưu trong DB
const SUB_MAP: Record<KnowledgeSub, string> = {
  basic: "Dù lượn căn bản",
  advanced: "Dù lượn nâng cao",
  thermal: "Bay thermal",
  xc: "Bay XC",
  weather: "Khí tượng bay",
};

async function getData(sub: KnowledgeSub): Promise<Item[]> {
  const subLabel = SUB_MAP[sub];
  const url =
    `/api/posts?isPublished=true&category=knowledge&subCategory=${encodeURIComponent(
      subLabel
    )}&sort=-publishedAt,-createdAt&limit=24`;

  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export default async function KnowledgeSubPage({
  params,
}: {
  params: { sub: string };
}) {
  const key = params.sub as KnowledgeSub;
  if (!(key in SUB_MAP)) notFound();

  const items = await getData(key);

  return (
    <div className="container mx-auto px-4 py-10 text-white">
      <h1 className="mb-6 text-4xl font-extrabold">
        Kiến thức: <span className="text-accent">{SUB_MAP[key]}</span>
      </h1>

      <KnowledgeTabs active={key} />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const img = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
          const date = p.publishedAt || p.createdAt;
          return (
            <Link key={p._id} href={`/blog/${p.slug}`} className="group">
              <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur">
                <div className="relative h-48 w-full">
                  <Image src={img} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-white/70">{p.excerpt}</p>
                  <p className="mt-2 text-xs text-white/60">{date ? new Date(date).toLocaleDateString("vi-VN") : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {!items.length && (
          <p className="text-white/70">Chưa có bài viết nào trong mục này.</p>
        )}
      </div>
    </div>
  );
}
