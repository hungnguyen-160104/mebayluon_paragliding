"use client";
import { PageBackground } from "@/components/page-background";

// app/spots/SpotsListClient.tsx
// Danh sách toàn bộ điểm bay — dùng lại phong cách thẻ của mục
// "Điểm bay nổi bật" trên trang chủ, nhưng liệt kê đủ 8 điểm.

import Image from "next/image";
import Link from "next/link";
import { MapPin, Mountain, Clock } from "lucide-react";

import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer/Footer";
import { SPOTS_LIST } from "@/lib/spots-registry";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export default function SpotsListClient() {
  const { t } = useLanguage() as any;

  const locations = (t?.spots?.locations ?? {}) as Record<string, any>;
  const title = text(t?.spots?.title, "CÁC ĐIỂM BAY");
  const subtitle = text(
    t?.spots?.subtitle,
    "Khám phá vẻ đẹp Việt Nam từ trên cao tại những điểm bay dù lượn đẹp nhất",
  );
  const viewDetails = text(t?.spots?.viewDetails, "Xem chi tiết");

  return (
    <div className="relative text-foreground">
      {/* Nền cố định giống trang chủ */}
      <PageBackground src="/hinh-nen.jpg" />
      <div className="fixed inset-0 -z-10 bg-black/25" />

      <section className="relative z-10 pb-16 pt-32 md:pt-36">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1
              className="font-serif text-4xl font-bold text-white md:text-5xl"
              style={{ textShadow: "2px 2px 8px rgba(0,0,0,.7)" }}
            >
              {title}
            </h1>
            <p
              className="mx-auto mt-4 max-w-3xl text-lg text-slate-200"
              style={{ textShadow: "1px 1px 6px rgba(0,0,0,.7)" }}
            >
              {subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SPOTS_LIST.map((spot) => {
              const loc = spot.i18nKey ? locations[spot.i18nKey] ?? {} : {};
              const description = text(loc.description);
              const highlight = text(loc.highlight);
              const area = text(loc.area);

              return (
                <Link
                  key={spot.slug}
                  href={`/spots/${spot.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-500 hover:shadow-2xl"
                >
                  <div className="relative h-72 overflow-hidden">
                    {/* Trước đây đặt bằng CSS background-image nên trình duyệt
                        tải nguyên ảnh gốc — 8 thẻ cộng lại 4,34 MB. */}
                    <Image
                      src={spot.image}
                      alt={`${spot.name} — ${spot.province}`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                      <MapPin size={16} className="text-accent" />
                      <span className="text-sm font-semibold text-foreground">
                        {spot.province}
                      </span>
                    </div>

                    <div className="absolute right-4 top-4 rounded-2xl bg-accent/90 px-3 py-2 text-right text-white backdrop-blur-sm">
                      <div className="text-sm font-bold">
                        {formatCurrency(spot.priceVND)}
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h2 className="mb-2 font-serif text-2xl font-bold">
                        {spot.name}
                      </h2>

                      <div className="mb-2 flex items-center gap-4 text-sm text-slate-200">
                        <span className="flex items-center gap-1">
                          <Mountain size={15} /> {spot.altitude}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={15} /> {spot.duration}
                        </span>
                      </div>

                      {/* Trước chỉ hiện MỘT trong hai câu và cắt cụt còn 1 dòng,
                          nên cả trang /spots chỉ có ~330 từ kể cả menu và chân
                          trang — quá mỏng để Google coi là trang đáng lập chỉ
                          mục. Cả ba câu dưới đây đều đã dịch sẵn 6 ngôn ngữ
                          trong t.spots.locations, chỉ là chưa được dùng. */}
                      {area ? (
                        <p className="mb-1 text-xs text-slate-300">{area}</p>
                      ) : null}

                      {highlight ? (
                        <p className="text-sm font-medium text-slate-100">
                          {highlight}
                        </p>
                      ) : null}

                      {description && description !== highlight ? (
                        <p className="mt-1 text-sm text-slate-200">
                          {description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    <Button className="w-full bg-accent text-white hover:bg-accent/90">
                      {viewDetails}
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="relative z-10 pb-6">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
