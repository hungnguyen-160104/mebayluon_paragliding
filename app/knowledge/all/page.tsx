// app/knowledge/all/page.tsx
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { getPosts } from "@/lib/posts-data";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

function toLang(v: string | null | undefined): Lang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2) as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

async function getLangFromCookies(): Promise<Lang> {
  const c = await cookies();
  const v =
    c.get("language")?.value ||
    c.get("lang")?.value ||
    c.get("NEXT_LOCALE")?.value ||
    c.get("locale")?.value ||
    c.get("i18nextLng")?.value ||
    null;
  return toLang(v);
}

const I18N: Record<
  Lang,
  { title: string; empty: string; views: string; unknownDate: string; dateLocale: string }
> = {
  vi: {
    title: "Kiến thức dù lượn",
    empty: "Chưa có bài viết nào.",
    views: "lượt xem",
    unknownDate: "Không rõ ngày",
    dateLocale: "vi-VN",
  },
  en: {
    title: "Paragliding knowledge",
    empty: "No posts yet.",
    views: "views",
    unknownDate: "Unknown date",
    dateLocale: "en-US",
  },
  fr: {
    title: "Connaissances en parapente",
    empty: "Aucun article pour le moment.",
    views: "vues",
    unknownDate: "Date inconnue",
    dateLocale: "fr-FR",
  },
  ru: {
    title: "Знания о парапланеризме",
    empty: "Пока нет статей.",
    views: "просмотров",
    unknownDate: "Дата неизвестна",
    dateLocale: "ru-RU",
  },
  zh: {
    title: "滑翔伞知识",
    empty: "暂时没有文章。",
    views: "次浏览",
    unknownDate: "日期未知",
    dateLocale: "zh-CN",
  },
  hi: {
    title: "पैराग्लाइडिंग ज्ञान",
    empty: "अभी कोई लेख नहीं है।",
    views: "views",
    unknownDate: "तारीख़ अज्ञात",
    dateLocale: "hi-IN",
  },
};

function stripHtml(input: unknown): string {
  return String(input ?? "").replace(/<[^>]*>/g, "");
}

function fmtDate(dateStr: string | undefined, locale: string, fallback: string) {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

async function fetchPosts() {
  const data = await getPosts({
    category: "knowledge",
    isPublished: true,
    sort: "-publishedAt,-createdAt",
    limit: 100,
  });
  return { items: data?.items || [] };
}

export default async function KnowledgeAllPage() {
  const [lang, data] = await Promise.all([getLangFromCookies(), fetchPosts()]);
  const t = I18N[lang] ?? I18N.vi;

  return (
    <div
      className="min-h-screen relative bg-cover bg-center"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <main className="relative z-10 container mx-auto px-4 py-14 text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold text-center drop-shadow mb-8">
          {t.title}
        </h1>

        <KnowledgeTabs current="all" />

        {data.items?.length ? (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
            {data.items.map((p: any) => {
              const cover = p.coverImage || p.thumbnail || "/images/mebayluon.jpg";
              const dateStr = p.publishedAt || p.createdAt;
              const excerpt = stripHtml(p.content).slice(0, 120);

              return (
                <li key={p._id || p.slug} className="group">
                  <Link href={`/blog/${p.slug}`}>
                    <div className="bg-white/12 border border-white/25 rounded-lg overflow-hidden backdrop-blur-md hover:bg-white/20 transition hover:scale-[1.01]">
                      <div className="relative h-48 w-full">
                        <Image src={cover} alt={p.title} fill className="object-cover" />
                      </div>

                      <div className="p-5">
                        <h3 className="text-xl font-bold mb-2 line-clamp-2">{p.title}</h3>

                        <div className="text-sm text-white/75 flex items-center gap-4 mb-2">
                          <span>{fmtDate(dateStr, t.dateLocale, t.unknownDate)}</span>
                          <span>
                            {p.views ?? 0} {t.views}
                          </span>
                        </div>

                        <p className="text-white/85 text-sm line-clamp-3">{excerpt}…</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-white/80 mt-10">{t.empty}</p>
        )}
      </main>
    </div>
  );
}