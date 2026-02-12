// /app/blog/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/lib/posts-data";

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default async function BlogPage() {
  // Gọi trực tiếp database thay vì fetch qua HTTP
  const [fixedData, latestData] = await Promise.all([
    getPosts({
      category: "news",
      isPublished: true,
      fixed: true,
      limit: 6,
      sort: "-publishedAt,-createdAt",
    }),
    getPosts({
      category: "news",
      isPublished: true,
      page: 1,
      limit: 12,
      sort: "-publishedAt,-createdAt",
    }),
  ]);

  const fixedItems = fixedData?.items ?? [];
  const latestItems = latestData?.items ?? [];

  const formatDate = (s?: string) =>
    s
      ? new Date(s).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Không rõ ngày đăng";

  return (
    <div
      className="min-h-screen relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 z-0" />
      <main className="container mx-auto px-4 py-16 relative z-10 text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-10 text-center drop-shadow-lg font-serif">
          Tin tức & Blog
        </h1>

        {/* ===== Khối 1: Bài viết cố định theo điểm bay ===== */}
        {fixedItems.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Bài viết về các điểm bay cập nhật mới nhất
            </h2>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {fixedItems.map((p: any) => {
                const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
                const date = p.publishedAt || p.createdAt;
                return (
                  <li key={p._id || p.slug}>
                    <Link href={`/blog/${p.slug}`} className="group">
                      <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <div className="relative h-52 w-full overflow-hidden">
                          <Image
                            src={cover}
                            alt={p.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                            {p.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-white/70 mb-2">
                            <span>{formatDate(date)}</span>
                            <span>{p.views || 0} lượt xem</span>
                          </div>
                          <p className="text-white/85 text-sm line-clamp-3">
                            {p.excerpt || stripHtml(p.content || "").slice(0, 120) + "…"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ===== Khối 2: Các bài mới khác ===== */}
        <section>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Các bài viết mới nhất</h2>
          {latestItems.length ? (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latestItems.map((p: any) => {
                const cover = p.coverImage || p.thumbnail || "/images/mebayluon.jpg";
                const date = p.publishedAt || p.createdAt;
                return (
                  <li key={p._id || p.slug}>
                    <Link href={`/blog/${p.slug}`} className="group">
                      <div className="bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        <div className="relative h-48 w-full overflow-hidden">
                          <Image
                            src={cover}
                            alt={p.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-accent transition-colors">
                            {p.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-white/70 mb-3">
                            <span>{formatDate(date)}</span>
                            <span>{p.views || 0} lượt xem</span>
                          </div>
                          <p className="text-white/80 text-sm line-clamp-3">
                            {stripHtml(p.content || "").slice(0, 120)}…
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-white/70 mb-8">
                Chưa có bài viết nào được xuất bản
              </p>
              <Link
                href="/admin/posts/new"
                className="inline-block bg-accent text-white px-6 py-3 rounded-lg hover:bg-accent/80 transition-colors"
              >
                Tạo bài viết đầu tiên
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
