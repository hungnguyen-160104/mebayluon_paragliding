// app/store/[category]/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getProductBySlug } from "@/lib/product-api";

/** ===== Types ===== */
type Product = {
  slug: string;
  title: string;
  content?: string;
  coverImage?: string;
  createdAt?: string;
};

type PostLite = {
  _id?: string;
  id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  thumbnail?: string;
  category?: string | string[];
  createdAt?: string;
  publishedAt?: string;
};

/** ===== Lấy base URL đúng ở mọi môi trường ===== */
async function getBase(): Promise<string> {
  const pub = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (pub) return pub.replace(/\/$/, "");
  const h = await headers(); // NOTE: dự án của bạn cần await
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:8080";
}

/** ===== Fetch related posts qua API (an toàn) ===== */
async function fetchRelatedPostsInStore(limit = 4): Promise<PostLite[]> {
  const base = await getBase();
  const url = `${base}/api/posts/related?category=store&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = (await res.json()) as any[];
  // Chuẩn hoá + tránh trùng slug
  const seen = new Set<string>();
  const list: PostLite[] = [];
  for (const p of data) {
    const slug = String(p.slug);
    if (seen.has(slug)) continue;
    seen.add(slug);
    list.push({
      ...p,
      thumbnail: p.thumbnail || p.coverImage || "/post-fallback.jpg",
    });
  }
  return list;
}

/** ===== SEO ===== */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProductBySlug(slug).catch(() => null);
  return {
    title: p ? `${p.title} | Mebayluon Store` : "Sản phẩm | Mebayluon Store",
    description: p
      ? String(p.content || "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .slice(0, 150)
      : "",
    openGraph: p
      ? {
          title: `${p.title} | Mebayluon Store`,
          description: String(p.content || "").replace(/<[^>]+>/g, "").slice(0, 150),
          images: p.coverImage ? [{ url: p.coverImage }] : undefined,
        }
      : undefined,
  };
}

/** ===== PAGE: Chi tiết sản phẩm + Bài viết liên quan trong Cửa hàng ===== */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Lấy lại bài viết liên quan trong mục "store" qua API (ổn định)
  const relatedPosts = await fetchRelatedPostsInStore(4);

  return (
    // ⚠️ [THAY ĐỔI 1]: Thêm nền và overlay
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/mebayluon.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* ⚠️ [THAY ĐỔI 2]: Thêm container căn lề và padding */}
      <div className="container mx-auto px-4 relative z-10 pt-28 pb-16">
        
        {/* ⚠️ [THAY ĐỔI 3]: Bọc nội dung sản phẩm vào "tấm kính mờ" */}
        <div className="prose prose-invert text-white bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-6 md:p-10 max-w-none">
          
          {/* ===== Tiêu đề sản phẩm ===== */}
          <h1 className="not-prose text-3xl md:text-4xl font-bold mb-4 text-white">
            {product.title}
          </h1>

          {/* ===== Ảnh sản phẩm ===== */}
          {product.coverImage && (
            <div className="not-prose relative w-full h-64 md:h-96 mb-6">
              <Image
                src={product.coverImage}
                alt={product.title}
                fill
                priority
                className="object-cover rounded-lg"
              />
            </div>
          )}

          {/* ===== Nội dung sản phẩm ===== */}
          <article
            className="" // Kế thừa 'prose prose-invert' từ cha
            dangerouslySetInnerHTML={{ __html: String(product.content || "") }}
          />
        </div>
        {/* Hết tấm kính mờ của sản phẩm */}


        {/* ===== Bài viết liên quan trong Cửa hàng (glassmorphism) ===== */}
        {relatedPosts.length > 0 && (
          // ⚠️ [THAY ĐỔI 4]: Xóa 'container' và 'px-0' vì đã có container cha
          <section className="relative z-10 py-12 md:py-16">
            <div>
              {/* ⚠️ [THAY ĐỔI 5]: Đổi màu tiêu đề sang trắng */}
              <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-white">
                Bài viết liên quan trong Cửa hàng
              </h2>

              {/* Các card này đã có sẵn style glassmorphism */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedPosts.map((p) => {
                  const date = (p as any).date || p.publishedAt || p.createdAt;
                  return (
                    <Link
                      key={p._id || p.id || p.slug}
                      href={`/blog/${p.slug}`}
                      className="group relative overflow-hidden rounded-2xl bg-white/15 backdrop-blur-md shadow-xl border border-white/20 transition"
                    >
                      <div className="relative h-44">
                        <Image
                          src={p.thumbnail || "/post-fallback.jpg"}
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

                        {date && (
                          <p className="text-xs text-white/80 mb-2">
                            {new Date(date).toLocaleDateString("vi-VN")}
                          </p>
                        )}

                        {p.excerpt && (
                          <p className="text-sm text-white/90 line-clamp-2 mb-3">
                            {p.excerpt}
                          </p>
                        )}

                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          Xem chi tiết →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
      {/* Hết container căn lề */}
    </main>
  );
}