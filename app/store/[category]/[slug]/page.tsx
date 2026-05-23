// app/store/[category]/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getProductBySlug } from "@/lib/product-api";

/** ===== Types ===== */
type PostLite = {
  _id?: string;
  id?: string;
  slug: string;
  title?: string;
  titleVi?: string;
  excerpt?: string;
  excerptVi?: string;
  coverImage?: string;
  thumbnail?: string;
  category?: string | string[];
  createdAt?: string;
  publishedAt?: string;
};

function pickTitle(post: any, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickContent(post: any, isVietnamese: boolean) {
  return isVietnamese
    ? post.contentVi || post.content || ""
    : post.content || post.contentVi || "";
}

function pickExcerpt(post: any, isVietnamese: boolean) {
  return isVietnamese
    ? post.excerptVi || post.excerpt || ""
    : post.excerpt || post.excerptVi || "";
}

/** ===== Láº¥y base URL Ä‘Ãºng á»Ÿ má»i mÃ´i trÆ°á»ng ===== */
async function getBase(): Promise<string> {
  const pub = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (pub) return pub.replace(/\/$/, "");
  const h = await headers(); // NOTE: dá»± Ã¡n cá»§a báº¡n cáº§n await
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:8080";
}

/** ===== Fetch related posts qua API (an toÃ n) ===== */
async function fetchRelatedPostsInStore(limit = 4): Promise<PostLite[]> {
  const base = await getBase();
  const url = `${base}/api/posts/related?category=store&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = (await res.json()) as any[];
  // Chuáº©n hoÃ¡ + trÃ¡nh trÃ¹ng slug
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
    title: p ? `${p.title} | Mebayluon Store` : "Sáº£n pháº©m | Mebayluon Store",
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

/** ===== PAGE: Chi tiáº¿t sáº£n pháº©m + {isVietnamese ? "Bài viết liên quan" : "Related Products"} ===== */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const c = await cookies();
  const rawLang = c.get("language")?.value || c.get("lang")?.value || "vi";
  const isVietnamese = String(rawLang).toLowerCase().startsWith("vi");
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Láº¥y láº¡i bÃ i viáº¿t liÃªn quan trong má»¥c "store" qua API (á»•n Ä‘á»‹nh)
  const relatedPosts = await fetchRelatedPostsInStore(4);
  const currentTitle = pickTitle(product, isVietnamese);

  return (
    // âš ï¸ [THAY Äá»”I 1]: ThÃªm ná»n vÃ  overlay
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/mebayluon.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* âš ï¸ [THAY Äá»”I 2]: ThÃªm container cÄƒn lá» vÃ  padding */}
      <div className="container mx-auto px-4 relative z-10 pt-28 pb-16">
        
        {/* âš ï¸ [THAY Äá»”I 3]: Bá»c ná»™i dung sáº£n pháº©m vÃ o "táº¥m kÃ­nh má»" */}
        <div className="prose prose-invert text-white bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-6 md:p-10 max-w-none">
          
          {/* ===== TiÃªu Ä‘á» sáº£n pháº©m ===== */}
          <h1 className="not-prose text-3xl md:text-4xl font-bold mb-4 text-white">
            {currentTitle}
          </h1>

          {/* ===== áº¢nh sáº£n pháº©m ===== */}
          {product.coverImage && (
            <div className="not-prose relative w-full h-64 md:h-96 mb-6">
              <Image
                src={product.coverImage}
                alt={currentTitle}
                fill
                priority
                className="object-cover rounded-lg"
              />
            </div>
          )}

          {/* ===== Ná»™i dung sáº£n pháº©m ===== */}
          <article
            className="" // Káº¿ thá»«a 'prose prose-invert' tá»« cha
            dangerouslySetInnerHTML={{ __html: String(pickContent(product, isVietnamese) || "") }}
          />
        </div>
        {/* Háº¿t táº¥m kÃ­nh má» cá»§a sáº£n pháº©m */}


        {/* ===== {isVietnamese ? "Bài viết liên quan" : "Related Products"} (glassmorphism) ===== */}
        {relatedPosts.length > 0 && (
          // âš ï¸ [THAY Äá»”I 4]: XÃ³a 'container' vÃ  'px-0' vÃ¬ Ä‘Ã£ cÃ³ container cha
          <section className="relative z-10 py-12 md:py-16">
            <div>
              {/* âš ï¸ [THAY Äá»”I 5]: Äá»•i mÃ u tiÃªu Ä‘á» sang tráº¯ng */}
              <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-white">
                {isVietnamese ? "Bài viết liên quan" : "Related Products"}
              </h2>

              {/* CÃ¡c card nÃ y Ä‘Ã£ cÃ³ sáºµn style glassmorphism */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedPosts.map((p) => {
                  const date = (p as any).date || p.publishedAt || p.createdAt;
                  const itemTitle = pickTitle(p, isVietnamese);
                  const itemExcerpt = pickExcerpt(p, isVietnamese);
                  
                  return (
                    <Link
                      key={p._id || p.id || p.slug}
                      href={`/blog/${p.slug}`}
                      className="group relative overflow-hidden rounded-2xl bg-white/15 backdrop-blur-md shadow-xl border border-white/20 transition"
                    >
                      <div className="relative h-44">
                        <Image
                          src={p.thumbnail || "/post-fallback.jpg"}
                          alt={itemTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                      </div>

                      <div className="p-5 text-white">
                        <h3 className="text-lg font-semibold line-clamp-2 mb-1">
                          {itemTitle}
                        </h3>

                        {date && (
                          <p className="text-xs text-white/80 mb-2">
                            {new Date(date).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                          </p>
                        )}

                        {itemExcerpt && (
                          <p className="text-sm text-white/90 line-clamp-2 mb-3">
                            {itemExcerpt}
                          </p>
                        )}

                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          {isVietnamese ? "Xem chi tiáº¿t â†’" : "Read more â†’"}
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
      {/* Háº¿t container cÄƒn lá» */}
    </main>
  );
}






