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
import { SpotTagline } from "@/components/spots/SpotTagline";
import { getSpotsPageCopy } from "@/lib/i18n/spots-page";
import { generateFAQSchema } from "@/lib/metadata-builder";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export default function SpotsListClient() {
  const { t, language } = useLanguage() as any;

  // Nội dung bổ sung cho trang: giới thiệu, hướng dẫn chọn điểm bay và FAQ.
  // Trước đây trang chỉ có tiêu đề + 6 thẻ, khoảng 310 từ — quá mỏng.
  const copy = getSpotsPageCopy(language);

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
            <h1 className="text-hero-shadow font-serif text-4xl font-bold text-white md:text-5xl">
              {title}
            </h1>
            <p className="text-hero-shadow-soft mx-auto mt-4 max-w-3xl text-lg font-medium text-white/95">
              {subtitle}
            </p>

            <div className="mx-auto mt-8 max-w-3xl space-y-4 text-left">
              {copy.intro.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-hero-shadow-soft text-[15px] leading-relaxed text-white/95 sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SPOTS_LIST.map((spot) => {
              const loc = spot.i18nKey ? locations[spot.i18nKey] ?? {} : {};
              const summary = text(loc.summary);
              const tagline = text(loc.tagline);

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

                      {tagline ? (
                        <div className="mb-2">
                          <SpotTagline text={tagline} />
                        </div>
                      ) : null}

                      {/* Một đoạn mô tả duy nhất (t.spots.locations.*.summary,
                          đã dịch 6 ngôn ngữ). Trước đây chỗ này có 3 dòng
                          area/highlight/description nhưng chúng lặp lại tên
                          điểm bay ở trên và lặp lẫn nhau. */}
                      {summary ? (
                        <p className="text-sm text-slate-100">{summary}</p>
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

          {/* Hướng dẫn chọn điểm bay */}
          <section className="mt-20">
            <h2 className="text-hero-shadow text-center font-serif text-3xl font-bold text-white md:text-4xl">
              {copy.chooseTitle}
            </h2>
            <p className="text-hero-shadow-soft mx-auto mt-3 max-w-2xl text-center font-medium text-white/95">
              {copy.chooseSubtitle}
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {copy.chooseCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/20 bg-slate-800/50 p-6 backdrop-blur-xl"
                >
                  <h3 className="font-serif text-xl font-bold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-100">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Câu hỏi thường gặp — cũng dựng thành JSON-LD FAQPage bên dưới để
              Google có thể hiện dạng câu hỏi mở rộng trên kết quả tìm kiếm. */}
          <section className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-hero-shadow text-center font-serif text-3xl font-bold text-white md:text-4xl">
              {copy.faqTitle}
            </h2>

            <div className="mt-8 space-y-3">
              {copy.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border border-white/20 bg-slate-800/70 shadow-lg backdrop-blur-xl"
                >
                  {/* Câu hỏi: chữ trắng, đậm, cỡ lớn hơn phần trả lời.
                      Câu trả lời: tách bằng đường kẻ ngang và một vạch màu
                      accent bên trái, để mắt phân biệt ngay hỏi với đáp. */}
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-base font-bold text-white marker:content-none sm:text-lg">
                    {faq.q}
                    <span className="shrink-0 text-2xl leading-none text-accent transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-white/10 px-5 pb-5 pt-4">
                    <p className="border-l-2 border-accent/70 pl-4 text-[15px] leading-relaxed text-slate-100">
                      {faq.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateFAQSchema(
              copy.faqs.map((f) => ({ question: f.q, answer: f.a })),
            ),
          ).replace(/</g, "\\u003c"),
        }}
      />

      <div className="relative z-10 pb-6">
        <div className="container mx-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
