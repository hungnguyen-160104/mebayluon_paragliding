// app/store/[category]/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { getProductBySlug } from "@/services/product.service";
import { Post as PostModel } from "@/models/Post.model";

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

async function getRelatedPosts(limit = 4): Promise<PostLite[]> {
  const posts = await PostModel.find({ category: "store", isPublished: { $ne: false } })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .select("slug title titleVi excerpt excerptVi thumbnail coverImage category createdAt publishedAt")
    .lean();
  return posts.map((p: any) => ({
    ...p,
    id: p._id?.toString?.(),
    thumbnail: p.thumbnail ?? p.coverImage ?? null,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();
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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;
  const c = await cookies();
  const rawLang = c.get("language")?.value || c.get("lang")?.value || "vi";
  const isVietnamese = String(rawLang).toLowerCase().startsWith("vi");

  await connectDB();

  let product: any;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }
  if (!product) notFound();

  const relatedPosts = await getRelatedPosts(4);
  const currentTitle = pickTitle(product, isVietnamese);

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/images/mebayluon.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/30 z-0" />

      <div className="container mx-auto px-4 relative z-10 pt-28 pb-16">

        <div className="prose prose-invert text-white bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-6 md:p-10 max-w-none">

          <h1 className="not-prose text-3xl md:text-4xl font-bold mb-4 text-white">
            {currentTitle}
          </h1>

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

          <article
            className=""
            dangerouslySetInnerHTML={{ __html: String(pickContent(product, isVietnamese) || "") }}
          />
        </div>

        {relatedPosts.length > 0 && (
          <section className="relative z-10 py-12 md:py-16">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-white">
                {isVietnamese ? "Bài viết liên quan" : "Related Products"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedPosts.map((p) => {
                  const date = (p as any).publishedAt || (p as any).createdAt;
                  const itemTitle = pickTitle(p, isVietnamese);
                  const itemExcerpt = pickExcerpt(p, isVietnamese);

                  return (
                    <Link
                      key={p._id || p.id || p.slug}
                      href={`/store/${(p as any).storeCategory || "all"}/${p.slug}`}
                      className="group relative overflow-hidden rounded-2xl bg-white/15 backdrop-blur-md shadow-xl border border-white/20 transition"
                    >
                      <div className="relative h-44">
                        <Image
                          src={p.thumbnail || p.coverImage || "/post-fallback.jpg"}
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
                          {isVietnamese ? "Xem chi tiết →" : "View details →"}
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
    </main>
  );
}
