import Link from "@/components/locale-link";
import { cache } from "react";
import { notFound } from "next/navigation";

import { PageBackground } from "@/components/page-background";
// mbl-paragliding/app/store/[category]/page.tsx
import type { Post, StoreCategory } from "@/types/frontend/post";
import { connectDB } from "@/lib/mongodb";
import { listProducts } from "@/services/product.service";
import ProductCard from "@/app/store/components/ProductCard";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";
import { localizedUrl } from "@/lib/site-config";
import {
  STORE_CATEGORY_CONFIG,
  EMPTY_CATEGORY_TEXT,
  type StoreLang,
} from "@/lib/store-texts";

type Props = {
  params: Promise<{ category: StoreCategory }>;
};

function toStoreLang(v: unknown): StoreLang {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase();
  const supported: StoreLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];
  return supported.includes(code as StoreLang) ? (code as StoreLang) : "vi";
}

/**
 * Tên danh mục lấy từ lib/store-texts.ts (đã dịch sẵn đủ 6 thứ tiếng).
 * Trước đây trang này khai một bảng tên tiếng Việt riêng nên khách nước
 * ngoài vẫn thấy "Sách dù lượn", "Khóa học dù lượn"...
 */
function categoryTitle(category: string, lang: StoreLang): string {
  const found = STORE_CATEGORY_CONFIG.find((c) => c.key === category);
  return found?.title[lang] ?? found?.title.vi ?? "";
}

/** Mô tả danh mục hiện trên kết quả tìm kiếm, dịch theo ngôn ngữ. */
const META_DESCRIPTION: Record<StoreLang, (title: string) => string> = {
  vi: (t) =>
    `${t} dù lượn chính hãng tại cửa hàng Mebayluon — tư vấn bởi phi công chuyên nghiệp, giao hàng toàn quốc.`,
  en: (t) =>
    `Genuine paragliding gear — ${t} at the Mebayluon store. Advice from professional pilots, nationwide delivery.`,
  fr: (t) =>
    `${t} de parapente d’origine à la boutique Mebayluon — conseils de pilotes professionnels, livraison dans tout le pays.`,
  ru: (t) =>
    `${t} для парапланеризма в магазине Mebayluon — консультации профессиональных пилотов, доставка по всей стране.`,
  zh: (t) => `Mebayluon 商店的正品滑翔伞${t}——专业飞行员提供选购建议，全国配送。`,
  hi: (t) =>
    `Mebayluon स्टोर पर असली पैराग्लाइडिंग ${t} — पेशेवर पायलटों की सलाह, पूरे देश में डिलीवरी।`,
};

/** Danh mục có trong cấu hình (lib/store-texts.ts)? Khác → 404 thật. */
function isKnownCategory(category: string): boolean {
  return STORE_CATEGORY_CONFIG.some((c) => c.key === category);
}

/**
 * Sản phẩm ĐÃ ĐĂNG của danh mục — dùng chung cho metadata và thân trang trong
 * một request (cache của React). "all" = mọi danh mục.
 */
const loadCategoryProducts = cache(async (category: string) => {
  await connectDB();
  const { items } = await listProducts({
    published: "true",
    limit: 30,
    sort: "-fixed,featuredAt,-createdAt",
    ...(category && category !== "all" ? { storeCategory: category } : {}),
  });
  return JSON.parse(JSON.stringify(items)) as Post[];
});

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isKnownCategory(category)) {
    return { title: "Mebayluon Store", robots: { index: false, follow: false } };
  }
  const locale = await getUrlLocale();
  const products = await loadCategoryProducts(category);
  const lang = toStoreLang(locale);

  const title = categoryTitle(category, lang);
  const storeName = lang === "vi" ? "Cửa hàng Mebayluon" : "Mebayluon Store";

  const meta = buildMetadata({
    title: `${title} | ${storeName}`,
    description: META_DESCRIPTION[lang](title),
    image: "/cua-hang.jpg",
    url: `/store/${category}`,
    type: "website",
    locale,
  });

  /**
   * Danh mục CHƯA CÓ sản phẩm (thiết bị bay, phụ kiện…) chỉ còn dòng "Không có
   * sản phẩm nào" — nội dung mỏng, soft 404. Không cho index (và app/sitemap.ts
   * cũng bỏ ra) cho tới khi có hàng; tự mở lại khi đăng sản phẩm đầu tiên.
   */
  if (products.length === 0) return { ...meta, robots: { index: false, follow: true } };
  return meta;
}

/** Nhãn "Danh mục khác" cho dải link cuối trang. */
const OTHER_CATEGORIES_LABEL: Record<StoreLang, string> = {
  vi: "Danh mục khác",
  en: "Other categories",
  fr: "Autres catégories",
  ru: "Другие категории",
  zh: "其他分类",
  hi: "अन्य श्रेणियाँ",
};

export default async function StoreCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isKnownCategory(category)) notFound();
  const urlLocale = await getUrlLocale();
  const lang = toStoreLang(urlLocale);
  /**
   * Đọc thẳng DB (29/09/2026). Trước đây gọi HTTP sang /api/products qua địa chỉ
   * Vercel — bị chặn/lỗi thì cả trang danh mục vỡ thành trang lỗi (mã vẫn 200,
   * không H1, không sản phẩm), Google thấy trang trống.
   */
  const items = await loadCategoryProducts(category);

  // ItemList giúp Google hiểu đây là trang danh mục sản phẩm, giống cách
  // trang /spots khai danh sách điểm bay.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categoryTitle(category, lang),
    itemListElement: items.map((p, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: lang === "vi" ? p.titleVi || p.title : p.title || p.titleVi,
      url: localizedUrl(`/store/${p.storeCategory ?? category}/${p.slug}`, urlLocale),
    })),
  };

  const otherCategories = STORE_CATEGORY_CONFIG.filter(
    (c) => c.key !== "all" && c.key !== category,
  );

  return (
    <main className="min-h-screen relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c"),
        }}
      />
      <PageBackground src="/hinh-nen.jpg" className="absolute inset-0" />
      <div className="absolute inset-0 bg-black/20" />
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            {categoryTitle(category, lang)}
          </h1>

          {items.length === 0 ? (
            <p className="text-center text-slate-100">
              {EMPTY_CATEGORY_TEXT[lang]}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {/* Link chéo sang các danh mục còn lại: trước đây trang danh mục là
              nhánh cụt, chỉ vào được từ trang /store. */}
          <nav className="mt-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">
              {OTHER_CATEGORIES_LABEL[lang]}
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {otherCategories.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/store/${c.key}`}
                    className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                  >
                    {c.title[lang] ?? c.title.vi}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </main>
  );
}
