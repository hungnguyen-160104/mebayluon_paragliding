// app/knowledge/page.tsx (Server Component)
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { getPosts } from "@/lib/posts-data";
import { KnowledgeTabs } from "./KnowledgeTabs";

type SearchParams = Record<string, string | string[] | undefined>;
type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

function toLang(v: string | undefined | null): Lang {
  const s = String(v ?? "vi").toLowerCase();
  const code = s.slice(0, 2) as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

// ✅ cookies() async -> phải await
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
  { pageTitle: string; empty: string; unknownDate: string; dateLocale: string }
> = {
  vi: {
    pageTitle: "KIẾN THỨC DÙ LƯỢN",
    empty: "Chưa có bài viết phù hợp.",
    unknownDate: "Không rõ ngày",
    dateLocale: "vi-VN",
  },
  en: {
    pageTitle: "PARAGLIDING KNOWLEDGE",
    empty: "No matching posts yet.",
    unknownDate: "Unknown date",
    dateLocale: "en-US",
  },
  fr: {
    pageTitle: "CONNAISSANCES EN PARAPENTE",
    empty: "Aucun article correspondant pour le moment.",
    unknownDate: "Date inconnue",
    dateLocale: "fr-FR",
  },
  ru: {
    pageTitle: "ЗНАНИЯ О ПАРАПЛАНЕРИЗМЕ",
    empty: "Подходящих статей пока нет.",
    unknownDate: "Дата неизвестна",
    dateLocale: "ru-RU",
  },
  zh: {
    pageTitle: "滑翔伞知识",
    empty: "暂时没有符合条件的文章。",
    unknownDate: "日期未知",
    dateLocale: "zh-CN",
  },
  hi: {
    pageTitle: "पैराग्लाइडिंग ज्ञान",
    empty: "फिलहाल कोई उपयुक्त लेख नहीं है।",
    unknownDate: "तारीख़ अज्ञात",
    dateLocale: "hi-IN",
  },
};

async function getData(sub?: string) {
  const data = await getPosts({
    category: "knowledge",
    isPublished: true,
    subCategory: sub && sub !== "all" ? sub : undefined,
    limit: 24,
    sort: "-publishedAt,-createdAt",
  });

  return Array.isArray(data?.items) ? data.items : [];
}

export default async function KnowledgeAllPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params?.sub)
    ? params?.sub?.[0]
    : (params?.sub as string | undefined);
  const sub = raw?.toString().toLowerCase() || "all";

  const [items, lang] = await Promise.all([getData(sub), getLangFromCookies()]);
  const t = I18N[lang] ?? I18N.vi;

  return (
    <div
      className="min-h-screen relative bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 z-0" />
      <main className="container mx-auto px-4 py-16 relative z-10 text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-8 text-center drop-shadow-lg">
          {t.pageTitle}
        </h1>

        <div className="mb-8">
          <KnowledgeTabs current={sub} />
        </div>

        {items.length === 0 ? (
          <p className="text-center text-white/80 py-16">{t.empty}</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p: any) => {
              const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
              const date = p.publishedAt || p.createdAt;
              return (
                <li key={p._id || p.slug} className="group">
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:bg-white/20 transition"
                  >
                    <div className="relative h-52 w-full">
                      <Image
                        src={cover}
                        alt={p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{p.title}</h3>
                      <div className="text-sm text-white/70">
                        {date
                          ? new Date(date).toLocaleDateString(t.dateLocale)
                          : t.unknownDate}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}