// app/knowledge/page.tsx (Server Component)
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/lib/posts-data";
import { KnowledgeTabs } from "./KnowledgeTabs";
import { LazyPostCards } from "@/components/lazy-post-cards";
import { buildMetadata } from "@/lib/metadata-builder";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { Footer } from "@/components/footer";

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
  // URL có prefix ngôn ngữ (/en/knowledge) thì URL thắng cookie
  return toLang(await getRequestLang());
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

function pickTitle(post: any, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

// Bỏ từ khóa export để tránh lỗi Next.js Page constraint (TS2344)
function pickExcerpt(post: any, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return normalizeInlineText(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return normalizeInlineText(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
}

const I18N: Record<
  Lang,
  {
    pageTitle: string;
    empty: string;
    unknownDate: string;
    dateLocale: string;
    seeMore: string;
    loading: string;
    features: string[];
  }
> = {
  vi: {
    pageTitle: "KHÓA HỌC &\nKIẾN THỨC DÙ LƯỢN",
    empty: "Chưa có bài viết phù hợp.",
    unknownDate: "Không rõ ngày",
    dateLocale: "vi-VN",
    seeMore: "Xem thêm",
    loading: "Đang tải…",
    features: [
      "Huấn luyện viên chuyên nghiệp",
      "Trang thiết bị đầy đủ",
      "Bảo hiểm suốt khoá học",
      "Hỗ trợ học viên tối đa",
    ],
  },
  en: {
    pageTitle: "PARAGLIDING KNOWLEDGE",
    empty: "No matching posts yet.",
    unknownDate: "Unknown date",
    dateLocale: "en-US",
    seeMore: "See more",
    loading: "Loading…",
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
    seeMore: "Voir plus",
    loading: "Chargement…",
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
    seeMore: "Показать ещё",
    loading: "Загрузка…",
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
    seeMore: "查看更多",
    loading: "加载中…",
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
    seeMore: "और देखें",
    loading: "लोड हो रहा है…",
    features: [
      "पाठ्यक्रम बीमा",
      "पूर्ण उपकरण",
      "पेशेवर प्रशिक्षक",
      "छात्रों को अधिकतम समर्थन",
    ],
  },
};

const META: Record<Lang, { title: string; description: string }> = {
  vi: {
    title: "Khóa Học & Kiến Thức Dù Lượn | Mebayluon",
    description: "Tìm hiểu kiến thức dù lượn từ cơ bản đến nâng cao — kỹ thuật bay, an toàn, thời tiết, trang thiết bị. Học từ các huấn luyện viên chuyên nghiệp tại Mebayluon.",
  },
  en: {
    title: "Paragliding Courses & Knowledge | Mebayluon",
    description: "Learn paragliding from beginner to advanced — flying techniques, safety, weather, gear. Guided by professional instructors at Mebayluon Vietnam.",
  },
  fr: {
    title: "Cours & Connaissances Parapente | Mebayluon",
    description: "Apprenez le parapente du niveau débutant à avancé — techniques de vol, sécurité, météo, équipement. Encadré par des instructeurs professionnels chez Mebayluon.",
  },
  ru: {
    title: "Курсы и знания парапланеризма | Mebayluon",
    description: "Изучайте парапланеризм от начального до продвинутого уровня — техника полёта, безопасность, погода, снаряжение. Профессиональные инструкторы Mebayluon Вьетнам.",
  },
  zh: {
    title: "滑翔伞课程与知识 | Mebayluon",
    description: "从初级到高级学习滑翔伞——飞行技巧、安全、天气、装备。由Mebayluon越南专业教练指导。",
  },
  hi: {
    title: "पैराग्लाइडिंग पाठ्यक्रम और ज्ञान | Mebayluon",
    description: "पैराग्लाइडिंग सीखें शुरुआत से उन्नत स्तर तक — उड़ान तकनीक, सुरक्षा, मौसम, उपकरण। Mebayluon वियतनाम के पेशेवर प्रशिक्षकों के साथ।",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  // Title/description dịch theo ngôn ngữ của URL; canonical + hreflang
  // do buildMetadata tự sinh theo locale
  const locale = await getUrlLocale();
  const m = META[toLang(locale)];

  return buildMetadata({
    title: m.title,
    description: m.description,
    url: "/knowledge",
    type: "website",
    locale,
  });
}

/** Số bài server render sẵn — phần còn lại tải lazy qua nút "Xem thêm". */
const INITIAL_COUNT = 25;

async function getData(sub?: string) {
  const subCategory = sub && sub !== "all" ? sub : undefined;

  // Bài admin tick "Ghim" đứng đầu (tối đa 6, thứ tự theo lúc tick);
  // phần còn lại theo ngày đăng, loại bài ghim để không hiện 2 lần.
  const pinnedData = await getPosts({
    forList: true,
    category: "knowledge",
    isPublished: true,
    subCategory,
    fixed: true,
    limit: 6,
    sort: "featuredAt",
  });
  const pinned = Array.isArray(pinnedData?.items) ? pinnedData.items : [];
  const pinnedSlugs = pinned.map((post) => post.slug);

  const data = await getPosts({
    forList: true,
    category: "knowledge",
    isPublished: true,
    subCategory,
    excludeSlug: pinnedSlugs.length ? pinnedSlugs : undefined,
    limit: Math.max(1, INITIAL_COUNT - pinned.length),
    sort: "-publishedAt,-createdAt",
  });

  return {
    items: [...pinned, ...(Array.isArray(data?.items) ? data.items : [])],
    // total KHÔNG tính bài ghim — nút "Xem thêm" đếm skip theo số này
    total: Number(data?.total ?? 0),
    pinnedSlugs,
  };
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

  const [{ items, total, pinnedSlugs }, lang] = await Promise.all([
    getData(sub),
    getLangFromCookies(),
  ]);
  const t = I18N[lang] ?? I18N.vi;

  return (
    <div className="min-h-screen relative text-white">
      {/* FIXED BACKGROUND IMAGE */}
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
          <h1
            className="w-fit rounded-2xl bg-black/50 px-6 py-3 text-3xl md:text-5xl lg:text-6xl font-extrabold text-white shadow-lg text-right leading-tight whitespace-pre-line opacity-0 animate-fade-in-right fill-mode-forwards max-w-[90vw] md:max-w-4xl"
            style={{ animation: "fadeInRight 1s ease-out forwards" }}
          >
            {t.pageTitle}
          </h1>
        </div>

        {/* BOTTOM AREA: 4 Images Strip */}
        <div className="relative w-full grid grid-cols-2 md:grid-cols-4 gap-0">
          {t.features.map((feature, index) => {
            const imgIndex = [3, 2, 1, 4][index];
            return (
              <div
                key={index}
                className="relative aspect-4/3 md:aspect-16/10 group overflow-hidden border-r border-white/20 last:border-0"
              >
                <Image
                  src={`/knowledge/${imgIndex}.jpg`}
                  alt={feature}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110 ease-out"
                />
                {/* Overlay Text */}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent flex items-end justify-center pb-6 px-4 transition-colors duration-300">
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
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/60 pointer-events-none -z-10" />

        <div className="container mx-auto px-4">
          <div className="mb-12 flex justify-center">
            <KnowledgeTabs current={sub} />
          </div>

          {items.length === 0 ? (
            <p className="text-center text-white/80 py-16 text-xl">{t.empty}</p>
          ) : (() => {
            const isVi = lang === "vi";
            const featured   = items[0];
            const mobileTail = items.slice(1);

            const featuredCover = featured.thumbnail || featured.coverImage || "/images/mebayluon.jpg";
            const featuredDate  = featured.publishedAt || featured.createdAt;

            return (
              <>
                {/* ── DESKTOP (lg+): Layout kiểu Vietnamnet ── */}
                <div className="hidden lg:block">

                  {/* Hàng đầu: Featured lớn (2/3) + Danh sách bên (1/3) */}
                  <div className="grid grid-cols-[2fr_1fr] gap-6 mb-8">

                    {/* Featured: ảnh lớn, text overlay. Ô này là grid item nên bị kéo
                        cao bằng cột 4 bài bên phải; cho ảnh flex-1 để nó phủ kín thẻ
                        thay vì chừa khoảng trống dưới chữ. */}
                    <Link href={`/blog/${featured.slug}`} className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 hover:shadow-2xl">
                      <div className="relative min-h-90 w-full flex-1 overflow-hidden">
                        <Image src={featuredCover} alt={`${pickTitle(featured, isVi)} - Kiến thức dù lượn Mebayluon`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h2 className="mb-2 line-clamp-2 text-2xl font-bold leading-tight text-white group-hover:text-sky-300">
                            {pickTitle(featured, isVi)}
                          </h2>
                          <p className="mb-2 text-sm text-white/60">
                            {featuredDate ? new Date(featuredDate).toLocaleDateString(t.dateLocale) : t.unknownDate}
                          </p>
                          <p className="line-clamp-2 text-sm text-white/80">
                            {pickExcerpt(featured, isVi)}
                          </p>
                        </div>
                      </div>
                    </Link>

                    {/* Sidebar phải: 4 bài nhỏ dạng ngang */}
                    <div className="flex flex-col gap-3">
                      {items.slice(1, 5).map((p: any) => {
                        const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
                        const date  = p.publishedAt || p.createdAt;
                        return (
                          <Link key={p._id || p.slug} href={`/blog/${p.slug}`} className="group flex gap-3 rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative h-19 w-28 shrink-0 overflow-hidden rounded-md">
                              <Image src={cover} alt={pickTitle(p, isVi)} fill className="object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-col justify-center gap-1">
                              <p className="line-clamp-2 text-base md:text-lg font-semibold leading-snug group-hover:text-sky-300">
                                {pickTitle(p, isVi)}
                              </p>
                              <p className="line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(p, isVi)}
                              </p>
                              <span className="text-xs text-white/55">
                                {date ? new Date(date).toLocaleDateString(t.dateLocale) : t.unknownDate}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid 4 cột: tất cả bài còn lại */}
                  {items.length > 5 && (
                    <div className="grid grid-cols-4 gap-5">
                      {items.slice(5).map((p: any) => {
                        const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
                        const date  = p.publishedAt || p.createdAt;
                        return (
                          <Link key={p._id || p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-lg border border-white/15 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative aspect-video overflow-hidden">
                              <Image src={cover} alt={pickTitle(p, isVi)} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                            </div>
                            <div className="p-3">
                              <p className="mb-1 line-clamp-2 text-base md:text-lg font-semibold leading-snug group-hover:text-sky-300">
                                {pickTitle(p, isVi)}
                              </p>
                              <p className="mb-1.5 line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(p, isVi)}
                              </p>
                              <span className="text-sm text-white/55">
                                {date ? new Date(date).toLocaleDateString(t.dateLocale) : t.unknownDate}
                              </span>
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
                      <Image src={featuredCover} alt={pickTitle(featured, isVi)} fill className="object-cover transition-transform duration-300 group-hover:scale-105" priority />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-60" />
                    </div>
                    <div className="p-4">
                      <h3 className="mb-1.5 line-clamp-3 text-xl font-bold leading-snug group-hover:text-sky-300">
                        {pickTitle(featured, isVi)}
                      </h3>
                      <p className="mb-1.5 line-clamp-2 text-sm text-white/75">
                        {pickExcerpt(featured, isVi)}
                      </p>
                      <p className="text-xs text-white/60">
                        {featuredDate ? new Date(featuredDate).toLocaleDateString(t.dateLocale) : t.unknownDate}
                      </p>
                    </div>
                  </Link>

                  {/* Remaining: horizontal list */}
                  <ul className="flex flex-col gap-2">
                    {mobileTail.map((p: any) => {
                      const cover = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
                      const date  = p.publishedAt || p.createdAt;
                      return (
                        <li key={p._id || p.slug}>
                          <Link href={`/blog/${p.slug}`} className="group flex gap-3 rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-all hover:bg-white/20">
                            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md">
                              <Image src={cover} alt={pickTitle(p, isVi)} fill className="object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-col justify-center gap-1">
                              <p className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-sky-300">
                                {pickTitle(p, isVi)}
                              </p>
                              <p className="line-clamp-2 text-xs text-white/70">
                                {pickExcerpt(p, isVi)}
                              </p>
                              <span className="text-xs text-white/55">
                                {date ? new Date(date).toLocaleDateString(t.dateLocale) : t.unknownDate}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* "Xem thêm": tải lazy 15 bài/lần qua /api/post-cards */}
                <LazyPostCards
                  category="knowledge"
                  sub={sub}
                  lang={lang}
                  exclude={pinnedSlugs.join(",")}
                  initialCount={items.length - pinnedSlugs.length}
                  total={total}
                  seeMoreLabel={t.seeMore}
                  loadingLabel={t.loading}
                  dateLocale={t.dateLocale}
                  unknownDate={t.unknownDate}
                  accent="sky"
                />
              </>
            );
          })()}
        </div>

      {/* Footer — trước đây trang này không có, khách đọc xong là cụt đường
          đi tiếp và Google mất luôn liên kết nội bộ từ đây. */}
      <div className="relative z-10 pb-6">
        <div className="container mx-auto">
          <Footer />
        </div>
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