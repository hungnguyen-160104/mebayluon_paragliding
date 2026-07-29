// app/knowledge/[sub]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import KnowledgeTabs, { KnowledgeSub } from "@/components/knowledge/KnowledgeTabs";

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

// Map slug → giá trị subCategory đang lưu trong DB
const SUB_MAP: Record<KnowledgeSub, string> = {
  basic: "Dù lượn căn bản",
  advanced: "Dù lượn nâng cao",
  thermal: "Bay thermal",
  xc: "Bay XC",
  weather: "Khí tượng bay",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sub: string }>;
}) {
  const { sub } = await params;
  const label = SUB_MAP[sub as KnowledgeSub];

  if (!label) {
    return {
      title: "Không tìm thấy chuyên mục | Mebayluon",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${label} — Kiến Thức Dù Lượn | Mebayluon`,
    description: `Tổng hợp bài viết về ${label.toLowerCase()}: kỹ thuật, an toàn và kinh nghiệm thực tế từ các huấn luyện viên dù lượn chuyên nghiệp của Mebayluon.`,
    alternates: { canonical: `https://mebayluon.com/knowledge/${sub}` },
  };
}

async function getLangFromCookies(): Promise<string> {
  const c = await cookies();
  const v =
    c.get("language")?.value ||
    c.get("lang")?.value ||
    c.get("NEXT_LOCALE")?.value ||
    c.get("locale")?.value ||
    c.get("i18nextLng")?.value ||
    "vi";
  const code = String(v).toLowerCase().slice(0, 2);
  return ["vi", "en", "fr", "ru", "zh", "hi"].includes(code) ? code : "vi";
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

async function getData(sub: KnowledgeSub): Promise<Item[]> {
  const subLabel = SUB_MAP[sub];
  const url =
    `/api/posts?isPublished=true&category=knowledge&subCategory=${encodeURIComponent(
      subLabel
    )}&sort=-publishedAt,-createdAt&limit=24`;

  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export default async function KnowledgeSubPage({
  params,
}: {
  params: Promise<{ sub: string }>;
}) {
  const { sub } = await params;
  const key = sub as KnowledgeSub;
  if (!(key in SUB_MAP)) notFound();

  const [items, lang] = await Promise.all([
    getData(key),
    getLangFromCookies(),
  ]);
  const isVietnamese = lang === "vi";

  return (
    <div className="container mx-auto px-4 py-10 text-white">
      <h1 className="mb-6 text-4xl font-extrabold">
        Kiến thức: <span className="text-accent">{SUB_MAP[key]}</span>
      </h1>

      <KnowledgeTabs active={key} />

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
                  <p className="mt-2 text-xs text-white/60">{date ? new Date(date).toLocaleDateString("vi-VN") : ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
        {!items.length && (
          <p className="text-white/70">Chưa có bài viết nào trong mục này.</p>
        )}
      </div>
    </div>
  );
}
