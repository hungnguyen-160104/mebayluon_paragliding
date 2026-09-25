"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Thư viện ảnh + ảnh đơn trong bài viết, BẤM VÀO LÀ PHÓNG TO.
 *
 * Chủ (25/09/2026): ảnh trong lưới 3 cột quá nhỏ để khách "soi" — nhất là bài
 * so sánh GoPro / Camera 360 / Flycam. Thay vì phá bố cục lưới, giữ nguyên lưới
 * và mở ảnh gốc kín màn hình khi bấm: có nút qua ảnh kế, phím ← → Esc, bấm ra
 * ngoài để đóng. Ảnh trong hộp phóng to là ảnh gốc, không cắt theo tỉ lệ khung.
 *
 * Hộp ảnh PHẢI gắn thẳng vào <body> (portal): thẻ bài viết có backdrop-blur, mà
 * backdrop-filter biến phần tử cha thành "containing block" của position:fixed
 * — hộp ảnh khi đó chỉ phủ đúng thẻ bài viết dài cả trang, ảnh nằm ở giữa thẻ
 * (ngoài màn hình) còn thân trang bị khoá cuộn, khách chỉ thấy một màn đen
 * (chủ báo 25/09/2026).
 */

export type PostGalleryImage = { url: string; caption?: string };

type LightboxProps = {
  images: PostGalleryImage[];
  index: number;
  onClose: () => void;
  onMove: (next: number) => void;
};

function Lightbox({ images, index, onClose, onMove }: LightboxProps) {
  const total = images.length;
  const img = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && total > 1) onMove((index + 1) % total);
      else if (e.key === "ArrowLeft" && total > 1) onMove((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    // Khoá cuộn trang phía sau khi hộp ảnh đang mở
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, total, onClose, onMove]);

  if (!img || typeof document === "undefined") return null;

  const btn =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={img.caption || "Ảnh phóng to"}
      className="not-prose fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            className={`${btn} left-2 sm:left-4`}
            onClick={(e) => {
              e.stopPropagation();
              onMove((index - 1 + total) % total);
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Ảnh kế"
            className={`${btn} right-2 sm:right-4`}
            onClick={(e) => {
              e.stopPropagation();
              onMove((index + 1) % total);
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      ) : null}

      <figure
        className="flex max-h-full max-w-full flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.caption || ""}
          className="max-h-[86vh] max-w-full rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="text-center text-sm text-white/85">
          {img.caption ? <span className="font-semibold">{img.caption}</span> : null}
          {total > 1 ? (
            <span className="ml-2 text-white/60">
              {index + 1}/{total}
            </span>
          ) : null}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}

export function PostGallery({
  images,
  colClass,
  ratioClass,
  alt,
}: {
  images: PostGalleryImage[];
  colClass: string;
  ratioClass: string;
  alt: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <div className={`not-prose grid gap-2 md:gap-3 ${colClass}`}>
        {images.map((img, i) => (
          <figure key={`${img.url}-${i}`} className="overflow-hidden rounded-lg">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Phóng to ảnh ${i + 1}`}
              className="block w-full cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption || `${alt} - ${i + 1}`}
                loading="lazy"
                className={`w-full ${ratioClass} transition-transform duration-300 hover:scale-105`}
              />
            </button>
            {img.caption ? (
              <figcaption className="mt-1 text-center text-xs italic text-white/70">
                {img.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      {open !== null ? (
        <Lightbox images={images} index={open} onClose={close} onMove={setOpen} />
      ) : null}
    </>
  );
}

/** Ảnh đơn trong bài: bấm là phóng to, không có nút qua ảnh kế. */
export function PostImage({
  url,
  alt,
  caption,
  className,
}: {
  url: string;
  alt: string;
  caption?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Phóng to ảnh"
        className="block w-full cursor-zoom-in focus:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} loading="lazy" className={className} />
      </button>
      {open ? (
        <Lightbox images={[{ url, caption }]} index={0} onClose={close} onMove={() => {}} />
      ) : null}
    </>
  );
}
