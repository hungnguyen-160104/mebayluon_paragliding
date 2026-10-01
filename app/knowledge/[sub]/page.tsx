// app/knowledge/[sub]/page.tsx
import { getPosts, getKnowledgeSubCounts } from "@/lib/posts-data";
import Image from "next/image";
import Link from "@/components/locale-link";
import { notFound } from "next/navigation";
import KnowledgeTabs from "@/components/knowledge/KnowledgeTabs";
import { knowledgeTopicByUrl, type KnowledgeDbKey } from "@/lib/knowledge";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { buildMetadata } from "@/lib/metadata-builder";

type Item = {
  _id: string;
  slug: string;
  title: string;
  titleVi?: string;
  thumbnail?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  excerpt?: string;
  excerptVi?: string;
  content?: string;
  contentVi?: string;
};

type PageLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/** Chữ giao diện của trang. */
const UI: Record<PageLang, { heading: string; empty: string; notFound: string; dateLocale: string; metaDesc: (label: string) => string }> = {
  vi: { heading: "Kiến thức", empty: "Chưa có bài viết nào trong mục này.", notFound: "Không tìm thấy chuyên mục", dateLocale: "vi-VN",
        metaDesc: (l) => `Tổng hợp bài viết về ${l.toLowerCase()}: kỹ thuật, an toàn và kinh nghiệm thực tế từ các huấn luyện viên dù lượn chuyên nghiệp của Mebayluon.` },
  en: { heading: "Knowledge", empty: "No posts in this category yet.", notFound: "Category not found", dateLocale: "en-US",
        metaDesc: (l) => `Articles on ${l.toLowerCase()}: techniques, safety and real-world experience from Mebayluon's professional paragliding instructors.` },
  fr: { heading: "Connaissances", empty: "Aucun article dans cette catégorie pour le moment.", notFound: "Catégorie introuvable", dateLocale: "fr-FR",
        metaDesc: (l) => `Articles sur ${l.toLowerCase()} : techniques, sécurité et expérience de terrain des instructeurs de parapente Mebayluon.` },
  ru: { heading: "Знания", empty: "В этой категории пока нет статей.", notFound: "Категория не найдена", dateLocale: "ru-RU",
        metaDesc: (l) => `Статьи по теме «${l}»: техника, безопасность и практический опыт профессиональных инструкторов Mebayluon.` },
  zh: { heading: "知识", empty: "该分类暂时没有文章。", notFound: "未找到该分类", dateLocale: "zh-CN",
        metaDesc: (l) => `关于${l}的文章：技巧、安全与 Mebayluon 专业滑翔伞教练的实战经验。` },
  hi: { heading: "ज्ञान", empty: "इस श्रेणी में अभी कोई लेख नहीं है।", notFound: "श्रेणी नहीं मिली", dateLocale: "hi-IN",
        metaDesc: (l) => `${l} पर लेख: तकनीक, सुरक्षा और Mebayluon के पेशेवर प्रशिक्षकों का व्यावहारिक अनुभव।` },
};

function toPageLang(v: unknown): PageLang {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as PageLang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code) ? code : "vi";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sub: string }>;
}) {
  const { sub } = await params;
  const lang = toPageLang(await getRequestLang());
  const t = UI[lang];
  const topic = knowledgeTopicByUrl(sub);

  if (!topic) {
    return {
      title: `${t.notFound} | Mebayluon`,
      robots: { index: false, follow: false },
    };
  }

  const label = topic.label[lang];
  // Mục con chưa có bài: vẫn mở được nhưng không cho index (trang rỗng = mỏng)
  const counts = await getKnowledgeSubCounts();
  const empty = counts !== null && !counts[topic.db];

  // Canonical + hreflang dựng theo ngôn ngữ đang xem; trước đây cắm cứng URL
  // tiếng Việt nên các bản ngôn ngữ khác bị coi là trang trùng lặp.
  const meta = buildMetadata({
    title: `${label} — ${t.heading} | Mebayluon`,
    description: t.metaDesc(label),
    image: "/knowledge.jpg",
    url: `/knowledge/${sub}`,
    author: "Mebayluon",
    type: "website",
    locale: await getUrlLocale(),
  });
  return empty ? { ...meta, robots: { index: false, follow: true } } : meta;
}

async function getLangFromCookies(): Promise<string> {
  // URL có prefix ngôn ngữ thì URL thắng cookie
  return getRequestLang();
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

function pickTitle(post: Item, isVietnamese: boolean) {
  return isVietnamese
    ? post.titleVi || post.title || ""
    : post.title || post.titleVi || "";
}

function pickExcerpt(post: Item, isVietnamese: boolean) {
  if (isVietnamese) {
    if (post.excerptVi?.trim()) return normalizeInlineText(post.excerptVi);
    const text = stripHtml(post.contentVi || post.content || "");
    return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
  }

  if (post.excerpt?.trim()) return normalizeInlineText(post.excerpt);
  const text = stripHtml(post.content || post.contentVi || "");
  return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
}

/**
 * Đọc thẳng DB như /knowledge/all (29/09/2026). Trước đây fetch("/api/posts…")
 * bằng đường dẫn tương đối — phía máy chủ không phân giải được, trang ném
 * "Failed to parse URL" và Google nhận trang lỗi (mã 200, không H1, không bài).
 */
async function getData(subDb: KnowledgeDbKey): Promise<Item[]> {
  const data = await getPosts({
    forList: true,
    category: "knowledge",
    subCategory: subDb,
    isPublished: true,
    sort: "-publishedAt,-createdAt",
    limit: 24,
  });
  return (data?.items || []) as unknown as Item[];
}

export default async function KnowledgeSubPage({
  params,
}: {
  params: Promise<{ sub: string }>;
}) {
  const { sub } = await params;
  const topic = knowledgeTopicByUrl(sub);
  if (!topic) notFound();
  const key = topic.url;

  const [items, lang, counts] = await Promise.all([
    getData(topic.db),
    getLangFromCookies(),
    getKnowledgeSubCounts(),
  ]);
  const isVietnamese = lang === "vi";
  const pageLang = toPageLang(lang);
  const t = UI[pageLang];

  return (
    <div className="container mx-auto px-4 py-10 text-white">
      <h1 className="mb-6 text-4xl font-extrabold">
        {t.heading}: <span className="text-accent">{topic.label[pageLang]}</span>
      </h1>

      <KnowledgeTabs
        active={key}
        available={counts ? Object.keys(counts) : null}
      />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const img = p.thumbnail || p.coverImage || "/images/mebayluon.jpg";
          const date = p.publishedAt || p.createdAt;
          return (
            <Link key={p._id} href={`/blog/${p.slug}`} className="group">
              <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur">
                <div className="relative h-48 w-full">
                  <Image src={img} alt={pickTitle(p, isVietnamese)} fill className="object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-lg font-semibold">{pickTitle(p, isVietnamese)}</h3>
                  <p className="mt-2 line-clamp-2 text-white/70">{pickExcerpt(p, isVietnamese)}</p>
                  <p className="mt-2 text-xs text-white/60">{date ? new Date(date).toLocaleDateString(t.dateLocale) : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {!items.length && (
          <p className="text-white/70">{t.empty}</p>
        )}
      </div>
    </div>
  );
}
