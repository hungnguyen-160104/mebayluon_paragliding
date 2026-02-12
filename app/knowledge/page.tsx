import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/lib/posts-data";
import { KnowledgeTabs } from "./KnowledgeTabs";

type SearchParams = Record<string, string | string[] | undefined>;

async function getData(sub?: string) {
  // Gọi trực tiếp database thay vì fetch qua HTTP
  const data = await getPosts({
    category: "knowledge",
    isPublished: true,
    subCategory: sub && sub !== "all" ? sub : undefined,
    limit: 24,
    sort: "-publishedAt,-createdAt",
  });

  return Array.isArray(data?.items) ? data.items : [];
}

export default async function KnowledgeAllPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params?.sub)
    ? params?.sub?.[0]
    : (params?.sub as string | undefined);
  const sub = raw?.toString().toLowerCase() || "all";

  const items = await getData(sub);

  return (
    <div
      className="min-h-screen relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 z-0" />
      <main className="container mx-auto px-4 py-16 relative z-10 text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-8 text-center drop-shadow-lg">
          KIẾN THỨC DÙ LƯỢN
        </h1>

        <div className="mb-8">
          <KnowledgeTabs current={sub} />
        </div>

        {items.length === 0 ? (
          <p className="text-center text-white/80 py-16">Chưa có bài viết phù hợp.</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p: any) => {
              const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
              const date = p.publishedAt || p.createdAt;
              return (
                <li key={p._id || p.slug} className="group">
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:bg-white/20 transition"
                  >
                    <div className="relative h-52 w-full">
                      <Image
                        src={cover}
                        alt={p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{p.title}</h3>
                      <div className="text-sm text-white/70">
                        {date ? new Date(date).toLocaleDateString("vi-VN") : "Không rõ ngày"}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
