import { PageBackground } from "@/components/page-background";
// mbl-paragliding/app/store/[category]/page.tsx
import type { StoreCategory } from "@/types/frontend/post";
import { listProductsByCategory } from "@/lib/product-api";
import ProductCard from "@/app/store/components/ProductCard";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";
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

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const locale = await getUrlLocale();
  const lang = toStoreLang(locale);

  const title = categoryTitle(category, lang);
  const storeName = lang === "vi" ? "Cửa hàng Mebayluon" : "Mebayluon Store";

  return buildMetadata({
    title: `${title} | ${storeName}`,
    description: META_DESCRIPTION[lang](title),
    url: `/store/${category}`,
    type: "website",
    locale,
  });
}

export default async function StoreCategoryPage({ params }: Props) {
  const { category } = await params;
  const lang = toStoreLang(await getUrlLocale());
  const { items } = await listProductsByCategory({ category, limit: 30 });

  return (
    <main className="min-h-screen relative">
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
        </div>
      </section>
    </main>
  );
}
