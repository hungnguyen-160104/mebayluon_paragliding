import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Post as PostModel } from "@/models/Post.model";
import StoreHomeClient from "./components/StoreHomeClient";
import type { Post } from "@/types/frontend/post";
import type { StoreLang } from "@/lib/store-texts";
import { absoluteUrl } from "@/lib/site-config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cửa Hàng Dù Lượn - Thiết Bị & Sách Bay | Mebayluon",
  description: "Mua sắm thiết bị dù lượn, sách kỹ thuật bay, phụ kiện và đăng ký khóa học dù lượn chuyên nghiệp tại cửa hàng Mebayluon.",
  keywords: ["cửa hàng dù lượn", "thiết bị paragliding", "sách dù lượn", "khóa học dù lượn", "mua dù lượn"],
  openGraph: {
    title: "Cửa Hàng Dù Lượn | Mebayluon",
    description: "Thiết bị dù lượn, sách kỹ thuật, phụ kiện và khóa học chuyên nghiệp.",
    url: absoluteUrl("/store"),
    images: [{ url: "/cua-hang.jpg", width: 1200, height: 630, alt: "Cửa hàng dù lượn Mebayluon" }],
  },
  alternates: { canonical: absoluteUrl("/store") },
};

function toStoreLang(v: string | undefined): StoreLang {
  const code = String(v ?? "vi").toLowerCase().slice(0, 2);
  const supported: StoreLang[] = ["vi", "en", "fr", "ru", "zh", "hi"];
  return supported.includes(code as StoreLang) ? (code as StoreLang) : "vi";
}

async function fetchAllProducts(): Promise<Post[]> {
  await connectDB();
  const docs = await PostModel.find({ type: "product", isPublished: true })
    .sort("-createdAt")
    .limit(100)
    .lean();
  return JSON.parse(JSON.stringify(docs)) as Post[];
}

export default async function StoreHomePage() {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("language")?.value ?? cookieStore.get("lang")?.value;
  const lang = toStoreLang(rawLang);

  const allProducts = await fetchAllProducts();

  return <StoreHomeClient allProducts={allProducts} lang={lang} />;
}
