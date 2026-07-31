"use client";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/frontend/post";
import { useLanguage } from "@/contexts/language-context";
import { getProductUi } from "@/lib/store-texts";

export default function ProductCard({ product }: { product: Post }) {
  const { language } = useLanguage();
  const isVi = String(language || "vi").toLowerCase().startsWith("vi");
  const t = getProductUi(language);

  const detailHref = product.storeCategory
    ? `/store/${product.storeCategory}/${product.slug}`
    : `/store/${product.slug}`;

  const imageUrl = product.coverImage || "/placeholder.jpg";
  const isPixabay = imageUrl?.includes("pixabay.com");
  const title = isVi ? product.titleVi || product.title : product.title;

  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-white/15 backdrop-blur-md transition-all hover:bg-white/25 hover:shadow-xl">
      {/* ảnh — cao 188px, object-contain để ảnh co vừa khung, không bị cắt
          mất phần thân sản phẩm; nền tối lấp hai bên khi ảnh không cùng tỉ lệ */}
      <div className="relative h-47 w-full bg-black/25 p-2">
        {isPixabay ? (
          <Image src={imageUrl} alt={title} fill className="object-contain" unoptimized />
        ) : (
          <Image src={imageUrl} alt={title} fill className="object-contain" />
        )}
      </div>

      {/* nội dung */}
      <div className="p-3">
        <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
          {title}
        </p>

        {typeof product.price === "number" && (
          <p className="mb-3 text-xs font-medium text-slate-200">
            {t.price}
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price)}
          </p>
        )}

        <div className="flex gap-2">
          <Link href={detailHref} className="flex-1">
            <button className="cta-btn w-full rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/35">
              {t.details}
            </button>
          </Link>
          <Link href="/#contact" className="flex-1">
            <button className="cta-btn w-full rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-orange-50 transition hover:bg-red-700">
              {t.contact}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
