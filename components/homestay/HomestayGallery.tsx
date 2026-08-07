"use client";

// components/homestay/HomestayGallery.tsx
// Bộ sưu tập ảnh Clubhouse: lọc theo nhóm, bấm ảnh mở xem lớn.
//
// 48 ảnh nếu đổ hết ra một lưới thì trang dài lê thê và tải nặng, nên mặc định
// chỉ hiện 12 ảnh, bấm "Xem thêm" mới tải tiếp. Ảnh dùng next/image nên trình
// duyệt chỉ tải đúng khổ nó cần.

import Image from "next/image";
import { useMemo, useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import {
  HOMESTAY_GALLERY,
  HOMESTAY_GALLERY_GROUPS,
  HOMESTAY_GALLERY_I18N,
  type HomestayPhotoGroup,
} from "@/lib/homestay-gallery";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const PAGE_SIZE = 12;

const safeLang = (v: unknown): Lang => {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
};

export default function HomestayGallery({
  lang: rawLang,
  seeMoreLabel,
}: {
  lang?: unknown;
  seeMoreLabel?: string;
}) {
  const lang = safeLang(rawLang);
  const t = HOMESTAY_GALLERY_I18N[lang];

  const [group, setGroup] = useState<HomestayPhotoGroup | "all">("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const photos = useMemo(
    () =>
      group === "all"
        ? HOMESTAY_GALLERY
        : HOMESTAY_GALLERY.filter((p) => p.group === group),
    [group],
  );

  const visible = photos.slice(0, shown);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) =>
        i === null ? null : (i + delta + photos.length) % photos.length,
      ),
    [photos.length],
  );

  // Điều khiển bằng bàn phím khi đang mở ảnh lớn.
  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };

    window.addEventListener("keydown", onKey);
    // Khoá cuộn nền để không cuộn trang phía sau lớp phủ.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex, close, step]);

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <section className="border-b border-white/10 bg-transparent py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-hero-shadow text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {t.title}
        </h2>
        <p className="text-hero-shadow-soft mx-auto mt-3 max-w-2xl text-center font-medium text-white">
          {t.subtitle}
        </p>

        {/* Thanh lọc theo nhóm */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {(["all", ...HOMESTAY_GALLERY_GROUPS] as const).map((key) => {
            const active = group === key;
            const count =
              key === "all"
                ? HOMESTAY_GALLERY.length
                : HOMESTAY_GALLERY.filter((p) => p.group === key).length;

            if (count === 0) return null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setGroup(key as HomestayPhotoGroup | "all");
                  setShown(PAGE_SIZE);
                }}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "border-white/50 bg-white text-slate-900 shadow-lg"
                    : "border-white/25 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {t[key as keyof typeof t] as string}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Lưới ảnh */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((photo, index) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative aspect-4/3 overflow-hidden rounded-xl border border-white/15 bg-white/5 text-left"
            >
              <Image
                src={photo.src}
                alt={photo.caption}
                fill
                sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
                <span className="line-clamp-2 text-[12px] font-medium leading-snug text-white">
                  {photo.caption}
                </span>
              </span>
            </button>
          ))}
        </div>

        {shown < photos.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
            >
              {seeMoreLabel ?? "Xem thêm"} ({photos.length - shown})
            </button>
          </div>
        )}
      </div>

      {/* Xem ảnh lớn */}
      {current && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/92 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
          >
            <X size={22} />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous"
                className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 md:left-6"
              >
                <ChevronLeft size={26} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next"
                className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 md:right-6"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          <figure
            className="relative max-h-full w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto aspect-4/3 max-h-[78vh] w-full">
              <Image
                src={current.src}
                alt={current.caption}
                fill
                sizes="(min-width:1024px) 1024px, 100vw"
                className="object-contain"
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-white/90">
              {current.caption}
              <span className="ml-2 text-white/50">
                {(openIndex ?? 0) + 1}/{photos.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
