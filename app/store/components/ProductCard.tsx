"use client";
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/frontend/post";
import { useLanguage } from "@/contexts/language-context";

export default function ProductCard({ product }: { product: Post }) {
  const { language } = useLanguage();
  const isVi = String(language || "vi").toLowerCase().startsWith("vi");

  const detailHref = product.storeCategory
    ? `/store/${product.storeCategory}/${product.slug}`
    : `/store/${product.slug}`;

  const imageUrl = product.coverImage || "/placeholder.jpg";
  const isPixabay = imageUrl?.includes("pixabay.com");
  const title = isVi ? product.titleVi || product.title : product.title;

  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-white/15 backdrop-blur-md transition-all hover:bg-white/25 hover:shadow-xl">
      {/* ảnh */}
      <div className="relative h-36 w-full">
        {isPixabay ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
        ) : (
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
      </div>

      {/* nội dung */}
      <div className="p-3">
        <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-white">
          {title}
        </p>

        {typeof product.price === "number" && (
          <p className="mb-3 text-xs font-medium text-slate-200">
            {isVi ? "Giá: " : "Price: "}
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(product.price)}
          </p>
        )}

        <div className="flex gap-2">
          <Link href={detailHref} className="flex-1">
            <button className="w-full rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/35">
              {isVi ? "Chi tiết" : "Details"}
            </button>
          </Link>
          <Link href="/#contact" className="flex-1">
            <button className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700">
              {isVi ? "Liên hệ" : "Contact"}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
