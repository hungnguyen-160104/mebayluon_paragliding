export const dynamic = "force-dynamic";

import Image from "next/image";
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

function pickTitle(post: Post, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: Post, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return post.excerptVi.trim();
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return post.excerpt.trim();
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
    limit: 24,
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
    <div
      className="relative min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/tin-tuc-2.jpg')" }}
    >
      <div className="absolute inset-0 z-0 bg-black/40" />

      <main className="container relative z-10 mx-auto px-4 py-16 text-white">
        <h1 className="mb-10 text-center text-5xl font-extrabold drop-shadow-lg md:text-6xl">
          {ui.pageTitle}
        </h1>

        <section>
          <h2 className="mb-6 text-3xl font-bold md:text-4xl">{ui.latestTitle}</h2>

          {latestItems.length ? (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latestItems.map((post) => {
                const cover = post.coverImage || post.thumbnail || "/images/mebayluon.jpg";
                const date = post.publishedAt || post.createdAt;
                const views = Number(post.views || 0);

                return (
                  <li key={post._id || post.slug}>
                    <Link href={`/blog/${post.slug}`} className="group">
                      <div className="overflow-hidden rounded-lg border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-xl">
                        <div className="relative h-48 w-full overflow-hidden">
                          <Image
                            src={cover}
                            alt={pickTitle(post, isVietnamese)}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>

                        <div className="p-6">
                          <h3 className="mb-3 line-clamp-2 text-xl font-bold transition-colors group-hover:text-red-300">
                            {pickTitle(post, isVietnamese)}
                          </h3>

                          <div className="mb-3 flex items-center gap-4 text-sm text-white/70">
                            <span>{formatDate(date)}</span>
                            <span>{ui.views(views)}</span>
                          </div>

                          <p className="line-clamp-3 text-sm text-white/80">
                            {pickExcerpt(post, isVietnamese)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
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