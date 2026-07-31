import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import StoreHomeClient from "./components/StoreHomeClient";
import type { Post } from "@/types/frontend/post";
import type { StoreLang } from "@/lib/store-texts";
import { buildMetadata } from "@/lib/metadata-builder";
import { pageMeta } from "@/lib/page-meta";
import { getRequestLang, getUrlLocale } from "@/lib/locale";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const meta = pageMeta("store", locale);

  return buildMetadata({
    title: meta.title,
    description: meta.description,
    keywords: ["cửa hàng dù lượn", "thiết bị paragliding", "sách dù lượn", "khóa học dù lượn", "mua dù lượn"],
    image: "/cua-hang.jpg",
    url: "/store",
    type: "website",
    locale,
  });
}

function toStoreLang(v: string | undefined): StoreLang {
  const code = String(v ?? "vi").toLowerCase().slice(0, 2);
  const supported: StoreLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];
  return supported.includes(code as StoreLang) ? (code as StoreLang) : "vi";
}

async function fetchAllProducts(): Promise<Post[]> {
  await connectDB();
  // Sản phẩm admin tick "Ghim" đứng đầu (thứ tự theo lúc tick),
  // còn lại theo ngày tạo mới nhất
  const docs = await PostModel.find({ type: "product", isPublished: true })
    .sort({ fixed: -1, featuredAt: 1, createdAt: -1 })
    .limit(100)
    .lean();
  return JSON.parse(JSON.stringify(docs)) as Post[];
}

export default async function StoreHomePage() {
  const lang = toStoreLang(await getRequestLang());

  const allProducts = await fetchAllProducts();

  return <StoreHomeClient allProducts={allProducts} lang={lang} />;
}
