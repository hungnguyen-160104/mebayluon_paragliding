// components/posts/RelatedPosts.tsx
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

/** Kiểu rút gọn để render */
type PostLite = {
  id?: string;
  _id?: string;
  slug: string;
  title?: string;
  titleVi?: string;
  excerpt?: string;
  excerptVi?: string;
  thumbnail?: string | null;
  coverImage?: string | null;
  createdAt?: string;
  publishedAt?: string;
  type?: "blog" | "product";
  storeCategory?: string;
  price?: number | null;
};

async function getBase(): Promise<string> {
  const internal =
    (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (internal) return internal.replace(/\/$/, "");

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // ignore header access issues (e.g. during build)
  }

  const port = process.env.PORT || "8080";
  return `http://localhost:${port}`;
}

async function fetchRelatedById(idOrSlug: string, limit = 4): Promise<PostLite[]> {
  const base = await getBase();
  const url = `${base}/api/posts/${encodeURIComponent(idOrSlug)}/related?limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

async function fetchRelatedByCategory(
  category: string,
  limit = 4,
  excludeSlug?: string | string[],
  excludeId?: string | string[],
): Promise<PostLite[]> {
  const base = await getBase();
  const params = new URLSearchParams({ category, limit: String(limit) });

  if (excludeSlug) {
    (Array.isArray(excludeSlug) ? excludeSlug : [excludeSlug]).forEach((s) =>
      params.append("excludeSlug", s),
    );
  }
  if (excludeId) {
    (Array.isArray(excludeId) ? excludeId : [excludeId]).forEach((s) =>
      params.append("excludeId", s),
    );
  }

  const url = `${base}/api/posts/related?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data: PostLite[] = await res.json();

  const seen = new Set<string>();
  return data.filter((p) => {
    const key = p.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatPrice(v?: number | null) {
  if (v === undefined || v === null) return null;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v} đ`;
  }
}

function pickTitle(post: PostLite, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: PostLite, isVietnamese: boolean) {
  return isVietnamese
    ? post.excerptVi || post.excerpt || ""
    : post.excerpt || post.excerptVi || "";
}

export default async function RelatedPosts({
  title = "Bài viết liên quan",
  idOrSlug,
  category,
  limit = 4,
  excludeSlug,
  excludeId,
  hrefBuilder = (slug: string) => `/blog/${slug}`,
}: {
  title?: string;
  idOrSlug?: string;
  category?: string;
  limit?: number;
  excludeSlug?: string | string[];
  excludeId?: string | string[];
  hrefBuilder?: (slug: string) => string;
}) {
  const { cookies } = await import("next/headers");
  const c = await cookies();
  const rawLang =
    c.get("language")?.value || c.get("lang")?.value || "vi";
  const lang = String(rawLang).toLowerCase();
  const isVietnamese = lang.startsWith("vi");

  const posts =
    idOrSlug
      ? await fetchRelatedById(idOrSlug, limit)
      : category
      ? await fetchRelatedByCategory(category, limit, excludeSlug, excludeId)
      : [];

  if (!posts?.length) return null;

  return (
    <section>
      <div>
        <h3 className="text-3xl md:text-4xl font-bold mb-8 text-white">{title}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((p, idx) => {
            const key = p.id || p._id || `${p.slug}-${idx}`;
            const date = p.publishedAt || p.createdAt;
            const img = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
            const currentTitle = pickTitle(p, isVietnamese) || "Bài viết";
            const currentExcerpt = pickExcerpt(p, isVietnamese);
            const priceText = formatPrice(p.price);

            return (
              <Link
                key={key}
                href={hrefBuilder(p.slug)}
                className="group rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-lg hover:shadow-xl transition overflow-hidden"
              >
                <div className="relative h-44">
                  <Image
                    src={img}
                    alt={currentTitle}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
                </div>

                <div className="p-5">
                  <h4 className="text-lg font-semibold text-white line-clamp-2 mb-1">
                    {currentTitle}
                  </h4>

                  {/* ✅ Nếu có giá thì ưu tiên hiện ở đây */}
                  {priceText ? (
                    <p className="text-base font-bold text-emerald-300 mb-1">
                      {priceText}
                    </p>
                  ) : null}

                  {date && (
                    <p className="text-xs text-gray-300 mb-2">
                      {new Date(date).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                    </p>
                  )}

                  {currentExcerpt && (
                    <p className="text-sm text-gray-200 line-clamp-2 mb-3">{currentExcerpt}</p>
                  )}

                  <span className="inline-flex items-center gap-1 text-sm font-medium text-white">
                    {isVietnamese ? "Xem chi tiết →" : "Read more →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
