// app/store/[category]/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { getProductBySlug } from "@/services/product.service";
import { Post as PostModel } from "@/models/Post.model";
import { buildMetadata, generateProductSchema } from "@/lib/metadata-builder";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { ShareButtons } from "@/components/share-buttons";

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
  storeCategory?: string;
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

function hasHtmlTag(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

async function getRelatedProducts(excludeSlug: string, limit = 6): Promise<PostLite[]> {
  const posts = await PostModel.find({
    type: "product",
    isPublished: { $ne: false },
    slug: { $ne: excludeSlug },
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .select("slug title titleVi excerpt excerptVi thumbnail coverImage storeCategory createdAt publishedAt")
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
  const { category, slug } = await params;
  await connectDB();
  const p = await getProductBySlug(slug).catch(() => null);
  const title = p ? `${p.titleVi || p.title} | Mebayluon Store` : "Sản phẩm | Mebayluon Store";
  const description = p
    ? String(p.contentVi || p.content || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 150)
    : "";

  return buildMetadata({
    title,
    description,
    image: p?.coverImage || undefined,
    url: `/store/${p?.storeCategory || category}/${slug}`,
    type: "website",
    locale: await getUrlLocale(),
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug, category } = await params;
  const lang = await getRequestLang();
  const isVietnamese = lang === "vi";

  await connectDB();

  let product: any;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(slug, 6);
  const currentTitle = pickTitle(product, isVietnamese);
  const content = pickContent(product, isVietnamese);
  const excerpt = pickExcerpt(product, isVietnamese);
  const publishedDate = product.publishedAt || product.createdAt;

  const productSchema = generateProductSchema({
    name: currentTitle,
    description: excerpt || String(content || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 200),
    image: product.coverImage || "",
    price: typeof product.price === "number" ? product.price : 0,
    currency: "VND",
    url: `/store/${category}/${slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
    <div className="relative min-h-screen">
      {/* Fixed background — iOS Safari does not support background-attachment:fixed on non-body elements */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/mebayluon.jpg')" }}
      />
      <div className="fixed inset-0 -z-10 bg-black/55" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28">

        {/* 2-column layout: article (left) + sidebar (right) */}
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 xl:grid-cols-[1fr_320px]">

          {/* LEFT: product detail */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-white shadow-xl backdrop-blur-lg sm:p-7">

            {/* back button */}
            <div className="mb-5 flex items-center justify-between gap-4">
              <Link
                href={`/store/${category}`}
                className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                ← {isVietnamese ? "Quay lại" : "Back"}
              </Link>
              {product.storeCategory && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                  {product.storeCategory}
                </span>
              )}
            </div>

            {/* title */}
            <h1
              className="mb-3 text-center text-4xl font-bold leading-tight text-white sm:text-5xl"
              style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
            >
              {currentTitle}
            </h1>

            {/* date */}
            {publishedDate && (
              <div className="mb-3 text-center text-xs text-white/60">
                {new Date(publishedDate).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}

            {/* thanh chia sẻ — cùng vị trí như trang bài viết */}
            <div className="mb-5 flex justify-center">
              <ShareButtons lang={lang} variant="product" title={currentTitle} />
            </div>

            {/* excerpt */}
            {excerpt && (
              <p className="mb-5 border-l-2 border-white/30 pl-4 text-base font-light leading-relaxed text-white/80">
                {excerpt}
              </p>
            )}

            {/* price */}
            {typeof product.price === "number" && (
              <p className="mb-5 text-lg font-semibold text-yellow-300">
                {isVietnamese ? "Giá: " : "Price: "}
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price)}
              </p>
            )}

            {/* cover image */}
            {product.coverImage && (
              <div className="mb-6 overflow-hidden rounded-xl bg-white/5">
                <Image
                  src={product.coverImage}
                  alt={currentTitle}
                  width={1200}
                  height={675}
                  priority
                  className="h-auto w-full rounded-xl"
                  style={{ objectFit: "contain", display: "block" }}
                />
              </div>
            )}

            {/* content */}
            {/* Cùng chuẩn định dạng với bài blog (app/blog/[slug]) —
                cả cỡ tiêu đề trong bài lẫn font body */}
            <article
              className="prose prose-invert max-w-none prose-sm md:prose-base
                prose-p:leading-[1.85] prose-p:text-white/90 prose-p:font-light
                prose-headings:text-white prose-headings:font-semibold
                prose-h2:text-xl prose-h2:font-bold
                prose-h3:text-lg prose-h3:font-semibold
                prose-h4:text-base prose-h4:font-semibold
                prose-strong:text-white prose-a:text-sky-300
                prose-img:rounded-lg prose-img:mx-auto
                prose-blockquote:border-sky-400 prose-blockquote:text-white/75"
            >
              {content ? (
                hasHtmlTag(content) ? (
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                  <div className="whitespace-pre-line">{content}</div>
                )
              ) : (
                <p className="text-white/60">
                  {isVietnamese ? "Sản phẩm chưa có mô tả." : "No description available."}
                </p>
              )}
            </article>

            {/* contact CTA */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#contact"
                className="cta-btn rounded-full bg-red-600 px-6 py-3 text-lg font-semibold text-orange-50 transition hover:bg-red-700"
              >
                {isVietnamese ? "Liên hệ đặt mua" : "Contact to order"}
              </Link>
              <Link
                href="/store"
                className="cta-btn rounded-full border border-white/20 bg-white/10 px-6 py-3 text-lg font-semibold text-white transition hover:bg-white/20"
              >
                {isVietnamese ? "Xem thêm sản phẩm" : "More products"}
              </Link>
            </div>

            {/* related products — mobile only */}
            {relatedProducts.length > 0 && (
              <section className="mt-10 lg:hidden">
                <h2 className="mb-4 text-xl font-bold text-white">
                  {isVietnamese ? "Sản phẩm liên quan" : "Related Products"}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedProducts.slice(0, 4).map((p) => {
                    const itemTitle = pickTitle(p, isVietnamese);
                    const itemCover = p.thumbnail || p.coverImage || "/post-fallback.jpg";
                    const itemHref = `/store/${p.storeCategory || category}/${p.slug}`;
                    return (
                      <Link
                        key={p._id || p.id || p.slug}
                        href={itemHref}
                        className="group flex gap-3 rounded-xl border border-white/15 bg-white/10 p-3 transition-all hover:bg-white/20"
                      >
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                          <Image src={itemCover} alt={itemTitle} fill className="object-cover" />
                        </div>
                        <p className="line-clamp-3 text-sm font-semibold leading-snug text-white group-hover:text-sky-300">
                          {itemTitle}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: sidebar — desktop only */}
          {relatedProducts.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-white/10 bg-black/60 p-5 text-white shadow-xl backdrop-blur-lg">
                <h2 className="mb-4 border-b border-white/15 pb-3 text-sm font-bold uppercase tracking-widest text-white/70">
                  {isVietnamese ? "Sản phẩm liên quan" : "Related Products"}
                </h2>
                <div className="flex flex-col gap-4">
                  {relatedProducts.map((p) => {
                    const itemTitle = pickTitle(p, isVietnamese);
                    const itemCover = p.thumbnail || p.coverImage || "/post-fallback.jpg";
                    const itemDate = p.publishedAt || p.createdAt;
                    const itemHref = `/store/${p.storeCategory || category}/${p.slug}`;
                    return (
                      <Link
                        key={p._id || p.id || p.slug}
                        href={itemHref}
                        className="group flex gap-3"
                      >
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={itemCover}
                            alt={itemTitle}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col justify-center gap-1">
                          <p className="line-clamp-3 text-sm font-semibold leading-snug text-white group-hover:text-sky-300">
                            {itemTitle}
                          </p>
                          {itemDate && (
                            <span className="text-xs text-white/45">
                              {new Date(itemDate).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
