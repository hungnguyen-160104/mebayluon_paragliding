import { PageBackground } from "@/components/page-background";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";

import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getRequestLang, getUrlLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("blog", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: ["blog dù lượn", "tin tức paragliding", "kinh nghiệm bay dù lượn", "mebayluon blog"],
    url: "/blog",
    type: "website",
    locale,
  });
}
import Link from "next/link";
import { getPosts } from "@/lib/posts-data";
import { LazyPostCards } from "@/components/lazy-post-cards";
import type { Post, SupportedLocale } from "@/types/frontend/post";
import { Footer } from "@/components/footer";
import BlogTabs from "@/components/blog/BlogTabs";
import {
  BLOG_CATEGORIES,
  categoryOfPost,
  isBlogCategory,
  type BlogCategory,
} from "@/lib/blog-categories";

type Lang = SupportedLocale;

function getSafeLang(v: unknown): Lang {
  const l = String(v ?? "vi") as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l) ? l : "vi";
}

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInlineText(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function pickTitle(post: Post, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: Post, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return normalizeInlineText(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return normalizeInlineText(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
}

const LOCALE_BY_LANG: Record<Lang, string> = {
  vi: "vi-VN",
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
  hi: "hi-IN",
};

const UI: Record<
  Lang,
  {
    pageTitle: string;
    latestTitle: string;
    unknownDate: string;
    views: (n: number) => string;
    emptyTitle: string;
    createFirstPost: string;
    seeMore: string;
    loading: string;
    allPostsTitle: string;
  }
> = {
  vi: {
    pageTitle: "Tin tức & Blog",
    latestTitle: "Tất cả bài viết",
    unknownDate: "Không rõ ngày đăng",
    views: (n) => `${n} lượt xem`,
    emptyTitle: "Chưa có bài viết nào được xuất bản",
    createFirstPost: "Tạo bài viết đầu tiên",
    seeMore: "Xem thêm",
    allPostsTitle: "Danh mục toàn bộ bài viết",
    loading: "Đang tải…",
  },
  en: {
    pageTitle: "News & Blog",
    latestTitle: "All posts",
    unknownDate: "Date unknown",
    views: (n) => `${n} views`,
    emptyTitle: "No published posts yet",
    createFirstPost: "Create the first post",
    seeMore: "See more",
    allPostsTitle: "All articles",
    loading: "Loading…",
  },
  fr: {
    pageTitle: "Actualités & Blog",
    latestTitle: "Tous les articles",
    unknownDate: "Date inconnue",
    views: (n) => `${n} vues`,
    emptyTitle: "Aucun article publié",
    createFirstPost: "Créer le premier article",
    seeMore: "Voir plus",
    allPostsTitle: "Tous les articles",
    loading: "Chargement…",
  },
  ru: {
    pageTitle: "Новости и блог",
    latestTitle: "Все статьи",
    unknownDate: "Дата неизвестна",
    views: (n) => `${n} просмотров`,
    emptyTitle: "Пока нет опубликованных статей",
    createFirstPost: "Создать первую статью",
    seeMore: "Показать ещё",
    allPostsTitle: "Все статьи",
    loading: "Загрузка…",
  },
  zh: {
    pageTitle: "资讯与博客",
    latestTitle: "全部文章",
    unknownDate: "日期未知",
    views: (n) => `${n} 次浏览`,
    emptyTitle: "暂无已发布文章",
    createFirstPost: "创建第一篇文章",
    seeMore: "查看更多",
    allPostsTitle: "全部文章",
    loading: "加载中…",
  },
  hi: {
    pageTitle: "समाचार और ब्लॉग",
    latestTitle: "सभी पोस्ट",
    unknownDate: "तारीख अज्ञात",
    views: (n) => `${n} व्यूज़`,
    emptyTitle: "अभी तक कोई पोस्ट प्रकाशित नहीं हुई है",
    createFirstPost: "पहली पोस्ट बनाएं",
    seeMore: "और देखें",
    allPostsTitle: "सभी लेख",
    loading: "लोड हो रहा है…",
  },
};

// Server chỉ render 25 bài đầu cho nhẹ — phần còn lại tải lazy qua nút
// "Xem thêm" (LazyPostCards, +15 bài/lần).
const INITIAL_COUNT = 25;

/**
 * Bài ghim đầu trang do admin tick trong trang quản trị (nút ghim ở danh
 * sách bài viết — tối đa 6 bài, xem /api/posts/[id]/feature). Thứ tự hiển
 * thị theo thời điểm tick: tick trước đứng trước. Các bài không ghim xếp
 * sau, theo ngày đăng mới nhất.
 */
async function loadLatestPosts() {
  const pinnedData = await getPosts({
    forList: true,
    category: "news",
    type: "blog",
    isPublished: true,
    fixed: true,
    limit: 6,
    sort: "featuredAt",
  });
  const pinnedPosts = pinnedData.items;
  const pinnedSlugs = pinnedPosts.map((post) => post.slug);

  const latestData = await getPosts({
    forList: true,
    category: "news",
    type: "blog",
    isPublished: true,
    excludeSlug: pinnedSlugs.length ? pinnedSlugs : undefined,
    limit: Math.max(1, INITIAL_COUNT - pinnedPosts.length),
    sort: "-publishedAt,-createdAt",
  });

  // Số bài + tổng số KHÔNG tính bài ghim — để nút "Xem thêm" đếm đúng skip
  const lazyInitialCount = latestData.items.length;
  const lazyTotal = Number(latestData.total ?? 0);

  const latestItems = [...pinnedPosts, ...latestData.items];

  return { latestItems, lazyInitialCount, lazyTotal, pinnedSlugs };
}

/**
 * Toàn bộ bài blog (hiện ~53 bài) — dùng để đếm số bài mỗi chuyên mục và để
 * render khi khách chọn một chuyên mục. Lấy hết một lần thay vì phân trang vì
 * số lượng còn nhỏ; nếu sau này vượt vài trăm bài thì chuyển sang lọc ở tầng
 * truy vấn.
 */
async function loadAllBlogPosts() {
  const data = await getPosts({
    forList: true,
    category: "news",
    type: "blog",
    isPublished: true,
    limit: 500,
    sort: "-publishedAt,-createdAt",
  });

  return data.items;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = getSafeLang(await getRequestLang());
  const isVietnamese = lang === "vi";
  const ui = UI[lang];
  const locale = LOCALE_BY_LANG[lang];

  const rawCat = (await searchParams)?.cat;
  const activeCat: BlogCategory | "all" = isBlogCategory(rawCat)
    ? (rawCat as BlogCategory)
    : "all";

  const { latestItems, lazyInitialCount, lazyTotal, pinnedSlugs } =
    await loadLatestPosts();

  // Đếm bài từng chuyên mục để hiện số trên thanh lọc.
  const allPosts = await loadAllBlogPosts();
  const counts: Record<string, number> = { all: allPosts.length };
  for (const key of BLOG_CATEGORIES) counts[key] = 0;
  for (const post of allPosts) counts[categoryOfPost(post)] += 1;

  const filteredPosts =
    activeCat === "all"
      ? []
      : allPosts.filter((post) => categoryOfPost(post) === activeCat);

  const formatDate = (s?: string | null) =>
    s
      ? new Date(s).toLocaleDateString(locale, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : ui.unknownDate;

  return (
    <div className="relative min-h-screen">
      <PageBackground
        src="/tin-tuc-2.jpg"
        alt="Bay dù lượn trên đèo Khau Phạ, Mù Cang Chải"
      />
      <div className="fixed inset-0 -z-10 bg-black/40" />

      <main className="container relative z-10 mx-auto px-4 pb-4 pt-28 text-white">
        <h1 className="mx-auto w-fit rounded-2xl bg-black/50 px-6 py-3 mb-10 mt-8 text-5xl font-extrabold text-white shadow-lg md:text-6xl">
          {ui.pageTitle}
        </h1>

        {/* Thanh lọc chuyên mục — cùng kiểu với thanh tab của /knowledge */}
        <div className="mb-10">
          <BlogTabs current={activeCat} counts={counts} />
        </div>

        {/* Bỏ tiêu đề "Tất cả bài viết": thanh lọc ngay trên đã có mục
            "Tất cả", để thêm dòng này là lặp ý. */}
        <section>

          {activeCat !== "all" ? (
            filteredPosts.length ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => {
                  const cover =
                    post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
                  const date = post.publishedAt || post.createdAt;

                  return (
                    <li key={post._id || post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
                      >
                        <div className="relative aspect-16/10 w-full overflow-hidden">
                          <Image
                            src={cover}
                            alt={pickTitle(post, isVietnamese)}
                            fill
                            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>

                        <div className="flex grow flex-col gap-1.5 p-4">
                          <p className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-red-300">
                            {pickTitle(post, isVietnamese)}
                          </p>
                          <p className="line-clamp-3 grow text-xs text-white/75">
                            {pickExcerpt(post, isVietnamese)}
                          </p>
                          <span className="text-xs text-white/55">
                            {formatDate(date)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-16 text-center text-xl text-white/70">
                {ui.emptyTitle}
              </p>
            )
          ) : latestItems.length ? (() => {
            const featured   = latestItems[0];
            const mobileTail = latestItems.slice(1);

            const featuredCover = featured.coverImage || featured.thumbnail || "/images/mebayluon.jpg";
            const featuredDate  = featured.publishedAt || featured.createdAt;

            return (
              <>
                {/* ── DESKTOP (lg+): Layout kiểu Vietnamnet ── */}
                <div className="hidden lg:block">

                  {/* Hàng đầu: Featured lớn (2/3) + Danh sách bên (1/3) */}
                  <div className="grid grid-cols-[2fr_1fr] gap-6 mb-8">

                    {/* Featured: ảnh trên, khối chữ nằm DƯỚI ảnh (không đè lên ảnh).
                        Ô này là grid item nên bị kéo cao bằng cột 4 bài bên phải;
                        cho ảnh flex-1 để nó ăn hết phần dôi ra thay vì chừa khoảng
                        trống dưới chữ — ảnh cũng đỡ bị cắt cụt. */}
                    <Link href={`/blog/${featured.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-2xl">
                      <div className="relative min-h-96 flex-1 overflow-hidden">
                        <Image src={featuredCover} alt={pickTitle(featured, isVietnamese)} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
                      </div>
                      <div className="shrink-0 p-5">
                        <h2 className="mb-2 line-clamp-2 text-2xl font-bold leading-tight text-white group-hover:text-red-300">
                          {pickTitle(featured, isVietnamese)}
                        </h2>
                        <div className="mb-2 flex items-center gap-4 text-sm text-white/60">
                          <span>{formatDate(featuredDate)}</span>
                          <span>{ui.views(Number(featured.views || 0))}</span>
                        </div>
                        <p className="line-clamp-2 text-sm text-white/80">
                          {pickExcerpt(featured, isVietnamese)}
                        </p>
                      </div>
                    </Link>

                    {/* Sidebar phải: 4 bài nhỏ dạng ngang */}
                    <div className="flex flex-col gap-3">
                      {latestItems.slice(1, 5).map((post) => {
                        const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
                        const date  = post.publishedAt || post.createdAt;
                        return (
                          <Link key={post._id || post.slug} href={`/blog/${post.slug}`} className="group flex gap-3 rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative h-19 w-28 shrink-0 overflow-hidden rounded-md">
                              <Image src={cover} alt={pickTitle(post, isVietnamese)} fill className="object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-col justify-center gap-1">
                              <p className="line-clamp-2 text-base md:text-lg font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
                              </p>
                              <p className="line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(post, isVietnamese)}
                              </p>
                              <span className="text-xs text-white/55">{formatDate(date)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid 4 cột: tất cả bài còn lại */}
                  {latestItems.length > 5 && (
                    <div className="grid grid-cols-4 gap-5">
                      {latestItems.slice(5).map((post) => {
                        const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
                        const date  = post.publishedAt || post.createdAt;
                        return (
                          <Link key={post._id || post.slug} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-lg border border-white/15 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative aspect-video overflow-hidden">
                              <Image src={cover} alt={pickTitle(post, isVietnamese)} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                            <div className="p-3">
                              <p className="mb-1 line-clamp-2 text-base md:text-lg font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
                              </p>
                              <p className="mb-1.5 line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(post, isVietnamese)}
                              </p>
                              <span className="text-xs text-white/55">{formatDate(date)}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── MOBILE / TABLET (< lg) ── */}
                <div className="flex flex-col gap-4 lg:hidden">

                  {/* Featured: large card */}
                  <Link href={`/blog/${featured.slug}`} className="group overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20">
                    <div className="relative h-52 w-full overflow-hidden sm:h-64">
                      <Image src={featuredCover} alt={pickTitle(featured, isVietnamese)} fill className="object-cover transition-transform duration-300 group-hover:scale-105" priority />
                    </div>
                    <div className="p-4">
                      <h3 className="mb-1.5 line-clamp-3 text-xl font-bold leading-snug group-hover:text-red-300">
                        {pickTitle(featured, isVietnamese)}
                      </h3>
                      <p className="mb-1.5 line-clamp-2 text-sm text-white/75">
                        {pickExcerpt(featured, isVietnamese)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <span>{formatDate(featuredDate)}</span>
                        <span>{ui.views(Number(featured.views || 0))}</span>
                      </div>
                    </div>
                  </Link>

                  {/* Remaining: horizontal list items */}
                  <ul className="flex flex-col gap-2">
                    {mobileTail.map((post) => {
                      const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
                      const date  = post.publishedAt || post.createdAt;
                      return (
                        <li key={post._id || post.slug}>
                          <Link href={`/blog/${post.slug}`} className="group flex gap-3 rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md">
                              <Image src={cover} alt={pickTitle(post, isVietnamese)} fill className="object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-col justify-center gap-1">
                              <p className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
                              </p>
                              <p className="line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(post, isVietnamese)}
                              </p>
                              <span className="text-xs text-white/55">{formatDate(date)}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* "Xem thêm": tải lazy 15 bài/lần qua /api/post-cards */}
                <LazyPostCards
                  category="news"
                  lang={lang}
                  exclude={pinnedSlugs.join(",")}
                  initialCount={lazyInitialCount}
                  total={lazyTotal}
                  seeMoreLabel={ui.seeMore}
                  loadingLabel={ui.loading}
                  dateLocale={locale}
                  longDate
                  unknownDate={ui.unknownDate}
                  accent="red"
                />
              </>
            );
          })() : (
            <div className="py-16 text-center">
              <p className="mb-8 text-xl text-white/70">{ui.emptyTitle}</p>
              <Link
                href="/admin/posts"
                className="cta-btn rounded-lg bg-red-600 px-6 py-3 text-lg font-semibold text-orange-50 transition-colors hover:bg-red-700"
              >
                {ui.createFirstPost}
              </Link>
            </div>
          )}
        </section>

        {/**
         * DANH MỤC TOÀN BỘ BÀI VIẾT — render THẲNG trong HTML máy chủ.
         *
         * Phần lưới phía trên chỉ đưa ~10 bài đầu vào HTML, phần còn lại nằm
         * sau nút "Xem thêm" phía trình duyệt — Google không thấy liên kết tới
         * ~40 bài cũ nên xếp chúng vào "đã phát hiện – chưa lập chỉ mục".
         * Khối này bảo đảm MỌI bài đều có một liên kết nội bộ từ trang chuyên
         * mục, người đọc thì có mục lục tra nhanh theo tên bài.
         */}
        <section className="mx-auto mt-14 max-w-5xl border-t border-white/10 pt-8">
          <h2 className="mb-4 text-lg font-bold text-white/80">{ui.allPostsTitle}</h2>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block truncate text-sm text-white/60 transition-colors hover:text-white"
                >
                  {(locale === "vi" ? post.titleVi || post.title : post.title || post.titleVi) || post.slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </main>

      {/* Footer nằm NGOÀI <main>: để bên trong thì nó bị bọc thêm một lớp
          container (hẹp lại) và ăn luôn khoảng đệm đáy của main, tạo ra một
          mảng trống lớn phía dưới. mt-8 tách footer khỏi nút "Xem thêm". */}
      <div className="relative z-10 mt-8 pb-4">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}