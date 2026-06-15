export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Tin Tức & Blog Dù Lượn Việt Nam | Mebayluon",
  description: "Tin tức mới nhất về dù lượn, kinh nghiệm bay, hướng dẫn kỹ thuật và câu chuyện từ cộng đồng dù lượn Việt Nam của Mebayluon.",
  keywords: ["blog dù lượn", "tin tức paragliding", "kinh nghiệm bay dù lượn", "mebayluon blog"],
  openGraph: {
    title: "Tin Tức & Blog Dù Lượn | Mebayluon",
    description: "Tin tức, kinh nghiệm và câu chuyện từ cộng đồng dù lượn Việt Nam.",
    url: "https://mebayluon.com/blog",
    images: [{ url: "/tin-tuc-2.jpg", width: 1200, height: 630, alt: "Blog dù lượn Mebayluon" }],
  },
  alternates: { canonical: "https://mebayluon.com/blog" },
};
import Link from "next/link";
import { cookies } from "next/headers";
import { getPosts } from "@/lib/posts-data";
import type { Post, SupportedLocale } from "@/types/frontend/post";

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
  }
> = {
  vi: {
    pageTitle: "Tin tức & Blog",
    latestTitle: "Tất cả bài viết",
    unknownDate: "Không rõ ngày đăng",
    views: (n) => `${n} lượt xem`,
    emptyTitle: "Chưa có bài viết nào được xuất bản",
    createFirstPost: "Tạo bài viết đầu tiên",
  },
  en: {
    pageTitle: "News & Blog",
    latestTitle: "All posts",
    unknownDate: "Date unknown",
    views: (n) => `${n} views`,
    emptyTitle: "No published posts yet",
    createFirstPost: "Create the first post",
  },
  fr: {
    pageTitle: "Actualités & Blog",
    latestTitle: "Tous les articles",
    unknownDate: "Date inconnue",
    views: (n) => `${n} vues`,
    emptyTitle: "Aucun article publié",
    createFirstPost: "Créer le premier article",
  },
  ru: {
    pageTitle: "Новости и блог",
    latestTitle: "Все статьи",
    unknownDate: "Дата неизвестна",
    views: (n) => `${n} просмотров`,
    emptyTitle: "Пока нет опубликованных статей",
    createFirstPost: "Создать первую статью",
  },
  zh: {
    pageTitle: "资讯与博客",
    latestTitle: "全部文章",
    unknownDate: "日期未知",
    views: (n) => `${n} 次浏览`,
    emptyTitle: "暂无已发布文章",
    createFirstPost: "创建第一篇文章",
  },
  hi: {
    pageTitle: "समाचार और ब्लॉग",
    latestTitle: "सभी पोस्ट",
    unknownDate: "तारीख अज्ञात",
    views: (n) => `${n} व्यूज़`,
    emptyTitle: "अभी तक कोई पोस्ट प्रकाशित नहीं हुई है",
    createFirstPost: "पहली पोस्ट बनाएं",
  },
};

export default async function BlogPage() {
  const cookieStore = await cookies();

  const raw =
    cookieStore.get("language")?.value ??
    cookieStore.get("Language")?.value ??
    cookieStore.get("lang")?.value;

  const lang = getSafeLang(raw);
  const isVietnamese = lang === "vi";
  const ui = UI[lang];
  const locale = LOCALE_BY_LANG[lang];

  const latestData = await getPosts({
    category: "news",
    type: "blog",
    isPublished: true,
    page: 1,
    limit: 0,
    sort: "-publishedAt,-createdAt",
  });

  const latestItems = latestData.items;

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
      <div className="fixed inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/tin-tuc-2.jpg')" }} />
      <div className="fixed inset-0 -z-10 bg-black/40" />

      <main className="container relative z-10 mx-auto px-4 pt-28 pb-16 text-white">
        <h1 className="mx-auto w-fit rounded-2xl bg-black/50 px-6 py-3 mb-10 mt-8 text-5xl font-extrabold text-white shadow-lg md:text-6xl">
          {ui.pageTitle}
        </h1>

        <section>
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">{ui.latestTitle}</h2>

          {latestItems.length ? (() => {
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

                    {/* Featured: ảnh lớn, text overlay */}
                    <Link href={`/blog/${featured.slug}`} className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-2xl">
                      <div className="relative h-90 overflow-hidden">
                        <Image src={featuredCover} alt={pickTitle(featured, isVietnamese)} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
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
                              <p className="line-clamp-3 text-base md:text-lg font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
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
                              <p className="mb-1.5 line-clamp-2 text-base md:text-lg font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
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
                      <h3 className="mb-2 line-clamp-3 text-xl font-bold leading-snug group-hover:text-red-300">
                        {pickTitle(featured, isVietnamese)}
                      </h3>
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
                            <div className="flex flex-col justify-center gap-1">
                              <p className="line-clamp-3 text-base md:text-lg font-semibold leading-snug group-hover:text-red-300">
                                {pickTitle(post, isVietnamese)}
                              </p>
                              <span className="text-xs text-white/55">{formatDate(date)}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            );
          })() : (
            <div className="py-16 text-center">
              <p className="mb-8 text-xl text-white/70">{ui.emptyTitle}</p>
              <Link
                href="/admin/posts"
                className="inline-block rounded-lg bg-red-500 px-6 py-3 text-white transition-colors hover:bg-red-600"
              >
                {ui.createFirstPost}
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}