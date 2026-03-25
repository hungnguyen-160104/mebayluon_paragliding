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
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
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
  {
    pageTitle: string;
    empty: string;
    unknownDate: string;
    dateLocale: string;
    features: string[];
  }
> = {
  vi: {
    pageTitle: "KHÓA HỌC &\nKIẾN THỨC DÙ LƯỢN",
    empty: "Chưa có bài viết phù hợp.",
    unknownDate: "Không rõ ngày",
    dateLocale: "vi-VN",
    features: [
      "Bảo hiểm suốt khoá học",
      "Trang thiết bị đầy đủ",
      "Huấn luyện viên chuyên nghiệp",
      "Hỗ trợ học viên tối đa",
    ],
  },
  en: {
    pageTitle: "PARAGLIDING KNOWLEDGE",
    empty: "No matching posts yet.",
    unknownDate: "Unknown date",
    dateLocale: "en-US",
    features: [
      "Course Insurance",
      "Full Equipment",
      "Professional Instructors",
      "Maximum Student Support",
    ],
  },
  fr: {
    pageTitle: "CONNAISSANCES EN PARAPENTE",
    empty: "Aucun article correspondant pour le moment.",
    unknownDate: "Date inconnue",
    dateLocale: "fr-FR",
    features: [
      "Assurance de cours",
      "Équipement complet",
      "Instructeurs professionnels",
      "Soutien maximal aux étudiants",
    ],
  },
  ru: {
    pageTitle: "ЗНАНИЯ О ПАРАПЛАНЕРИЗМЕ",
    empty: "Подходящих статей пока нет.",
    unknownDate: "Дата неизвестна",
    dateLocale: "ru-RU",
    features: [
      "Страхование курса",
      "Полное оборудование",
      "Профессиональные инструкторы",
      "Максимальная поддержка студентов",
    ],
  },
  zh: {
    pageTitle: "滑翔伞知识",
    empty: "暂时没有符合条件的文章。",
    unknownDate: "日期未知",
    dateLocale: "zh-CN",
    features: [
      "课程保险",
      "设备齐全",
      "专业教练",
      "最大的学生支持",
    ],
  },
  hi: {
    pageTitle: "पैराग्लाइडिंग ज्ञान",
    empty: "फिलहाल कोई उपयुक्त लेख नहीं है।",
    unknownDate: "तारीख़ अज्ञात",
    dateLocale: "hi-IN",
    features: [
      "पाठ्यक्रम बीमा",
      "पूर्ण उपकरण",
      "पेशेवर प्रशिक्षक",
      "छात्रों को अधिकतम समर्थन",
    ],
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
    <div className="min-h-screen relative text-white">
      {/* 
        FIXED BACKGROUND IMAGE 
        Covering the entire page so resizing/scrolling keeps the image consistent.
      */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/knowledge.jpg"
          alt="Knowledge Background"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex flex-col justify-between overflow-hidden z-0">
        {/* TOP AREA: Title */}
        <div className="relative flex-1 flex items-center justify-end px-6 md:px-16 w-full">
          {/* 
            Modified:
            1. Removed 'container mx-auto' to allow full width alignment.
            2. Decreased font size: text-4xl / md:text-6xl / lg:text-7xl (was 5xl/7xl/8xl).
            3. Added 'mr-0' explicit right alignment.
           */}
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold drop-shadow-2xl text-right uppercase tracking-tighter leading-tight whitespace-pre-line opacity-0 animate-fade-in-right fill-mode-forwards max-w-[90vw] md:max-w-4xl"
            style={{ animation: "fadeInRight 1s ease-out forwards" }}
          >
            {t.pageTitle}
          </h1>
        </div>

        {/* BOTTOM AREA: 4 Images Strip */}
        <div className="relative w-full grid grid-cols-2 md:grid-cols-4 gap-0">
          {t.features.map((feature, index) => {
             // We swapped the 1st and 3rd features in the text array (Instructor <-> Insurance).
             // To keep images matching their content (1=Instructor, 3=Insurance), we map the indices accordingly:
             // Index 0 (Insurance text) -> use Image 3
             // Index 1 (Equipment text) -> use Image 2
             // Index 2 (Instructor text) -> use Image 1
             // Index 3 (Support text) -> use Image 4
            const imgIndex = [3, 2, 1, 4][index];
            return (
              <div
                key={index}
                className="relative aspect-[4/3] md:aspect-[16/10] group overflow-hidden border-r border-white/20 last:border-0"
              >
                <Image
                  src={`/knowledge/${imgIndex}.jpg`}
                  alt={feature}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110 ease-out"
                />
                {/* Overlay Text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-6 px-4 transition-colors duration-300">
                  <h3 className="text-[10px] md:text-xs lg:text-sm font-bold text-center text-white drop-shadow-md leading-tight uppercase tracking-wide whitespace-nowrap">
                    {feature}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- MAIN CONTENT (Detailed List) --- */}
      <main className="relative z-10 w-full min-h-screen py-20">
        {/* Added a subtle gradient/darkness to distinguish the content area from the hero, but kept it transparent enough to see the bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 pointer-events-none -z-10" />

        <div className="container mx-auto px-4">
          <div className="mb-12 flex justify-center">
            <KnowledgeTabs current={sub} />
          </div>

          {items.length === 0 ? (
            <p className="text-center text-white/80 py-16 text-xl">{t.empty}</p>
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p: any) => {
                const cover =
                  p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
                const date = p.publishedAt || p.createdAt;
                return (
                  <li key={p._id || p.slug} className="group">
                    <Link
                      href={`/blog/${p.slug}`}
                      className="flex flex-col h-full rounded-2xl overflow-hidden bg-white/10 border border-white/10 hover:border-white/30 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 backdrop-blur-sm"
                    >
                      <div className="relative h-60 w-full overflow-hidden">
                        <Image
                          src={cover}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-snug text-white group-hover:text-sky-300 transition-colors">
                          {p.title}
                        </h3>
                        <div className="mt-auto text-sm text-white/70 flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>
                            {date
                              ? new Date(date).toLocaleDateString(t.dateLocale)
                              : t.unknownDate}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
