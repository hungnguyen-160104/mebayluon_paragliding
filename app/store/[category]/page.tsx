// mbl-paragliding/app/store/[category]/page.tsx
import type { StoreCategory } from "@/types/frontend/post";
import { listProductsByCategory } from "@/lib/product-api";
import ProductCard from "@/app/store/components/ProductCard";

const TITLE_MAP: Record<StoreCategory, string> = {
  "thiet-bi-bay": "Thiết bị bay",
  "phu-kien": "Phụ kiện",
  "sach-du-luon": "Sách dù lượn",
  "khoa-hoc-du-luon": "Khóa học dù lượn",
};

export async function generateMetadata({
  params,
}: {
  params: { category: StoreCategory };
}) {
  const title = TITLE_MAP[params.category] || "Danh mục";
  return { title: `${title} | Cửa hàng Mebayluon` };
}

export default async function StoreCategoryPage({
  params,
}: {
  params: { category: StoreCategory };
}) {
  const category = params.category;
  const { items } = await listProductsByCategory({ category, limit: 30 });

  return (
    <main
      className="min-h-screen relative bg-cover bg-center"
      style={{ backgroundImage: "url(/hinh-nen.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
            {TITLE_MAP[category] ?? "Danh mục"}
          </h1>

          {items.length === 0 ? (
            <p className="text-center text-slate-100">
              Chưa có sản phẩm trong danh mục này.
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
