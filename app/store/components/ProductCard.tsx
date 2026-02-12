// mbl-paragliding/app/store/components/ProductCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types/frontend/post";

export default function ProductCard({ product }: { product: Post }) {
  // Nếu có storeCategory thì đi theo /store/[category]/[slug], nếu không fallback /store/[slug]
  const detailHref = product.storeCategory
    ? `/store/${product.storeCategory}/${product.slug}`
    : `/store/${product.slug}`;

  const imageUrl = product.coverImage || "/placeholder.jpg";
  const isPixabay = imageUrl?.includes("pixabay.com");

  return (
    <Card className="overflow-hidden bg-white/20 backdrop-blur-md border-white/30 hover:shadow-2xl transition-all">
      {/* Ảnh cover */}
      <div className="relative h-56">
        {isPixabay ? (
          // Sử dụng regular img tag cho Pixabay (không optimize)
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          // Sử dụng Next.js Image cho Cloudinary & internal images
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-white line-clamp-2">{product.title}</CardTitle>
      </CardHeader>

      <CardContent className="pt-0 text-slate-200">
        {typeof product.price === "number" && (
          <p className="text-lg font-semibold">
            Giá{" "}
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(product.price)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {/* Xem chi tiết */}
          <Link href={detailHref} className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              Xem chi tiết
            </Button>
          </Link>

          {/* Nút Liên hệ → scroll đến #contact ở Trang chủ */}
          <Link href="/#contact" className="w-full sm:w-auto">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
              Liên hệ
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
