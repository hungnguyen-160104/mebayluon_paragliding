// mbl-paragliding/app/store/components/ProductCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types/frontend/post";
import { useLanguage } from "@/contexts/language-context";

export default function ProductCard({ product }: { product: Post }) {
  const { language } = useLanguage();
  const isVi = String(language || "vi").toLowerCase().startsWith("vi");
  // Náº¿u cÃ³ storeCategory thÃ¬ Ä‘i theo /store/[category]/[slug], náº¿u khÃ´ng fallback /store/[slug]
  const detailHref = product.storeCategory
    ? `/store/${product.storeCategory}/${product.slug}`
    : `/store/${product.slug}`;

  const imageUrl = product.coverImage || "/placeholder.jpg";
  const isPixabay = imageUrl?.includes("pixabay.com");

  return (
    <Card className="overflow-hidden bg-white/20 backdrop-blur-md border-white/30 hover:shadow-2xl transition-all">
      {/* áº¢nh cover */}
      <div className="relative h-56">
        {isPixabay ? (
          // Sá»­ dá»¥ng regular img tag cho Pixabay (khÃ´ng optimize)
          <img
            src={imageUrl}
            alt={isVi ? (product.titleVi || product.title) : product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          // Sá»­ dá»¥ng Next.js Image cho Cloudinary & internal images
          <Image
            src={imageUrl}
            alt={isVi ? (product.titleVi || product.title) : product.title}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-white line-clamp-2">{isVi ? (product.titleVi || product.title) : product.title}</CardTitle>
      </CardHeader>

      <CardContent className="pt-0 text-slate-200">
        {typeof product.price === "number" && (
          <p className="text-lg font-semibold">
            {isVi ? "Giá" : "Price"}{" "}
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(product.price)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {/* {isVi ? "Xem chi tiết" : "Details"} */}
          <Link href={detailHref} className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              {isVi ? "Xem chi tiết" : "Details"}
            </Button>
          </Link>

          {/* NÃºt {isVi ? "Liên hệ" : "Contact"} â†’ scroll Ä‘áº¿n #contact á»Ÿ Trang chá»§ */}
          <Link href="/#contact" className="w-full sm:w-auto">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
              {isVi ? "Liên hệ" : "Contact"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}



