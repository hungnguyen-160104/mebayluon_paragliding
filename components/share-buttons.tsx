"use client";

// components/share-buttons.tsx
/**
 * Hàng nút chia sẻ dùng chung cho trang bài viết / điểm bay / sản phẩm.
 *
 * Link chia sẻ lấy từ URL đang xem lúc bấm (window.location) nên tự đúng cho
 * mọi bản ngôn ngữ (/en/blog/... , /fr/spots/...) mà không cần truyền props.
 * Trên điện thoại có hỗ trợ Web Share API sẽ hiện thêm nút "Chia sẻ" gọi
 * bảng chia sẻ của hệ điều hành (Messenger, Zalo, Telegram... tuỳ máy).
 */

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

const I18N: Record<
  Lang,
  {
    share: string;
    shareArticle: string;
    shareSpot: string;
    shareProduct: string;
    copyLink: string;
    copied: string;
    nativeShare: string;
  }
> = {
  vi: {
    share: "Chia sẻ",
    shareArticle: "Chia sẻ bài viết",
    shareSpot: "Chia sẻ điểm bay",
    shareProduct: "Chia sẻ sản phẩm",
    copyLink: "Sao chép liên kết",
    copied: "Đã sao chép!",
    nativeShare: "Chia sẻ",
  },
  en: {
    share: "Share",
    shareArticle: "Share this post",
    shareSpot: "Share this flying site",
    shareProduct: "Share this product",
    copyLink: "Copy link",
    copied: "Copied!",
    nativeShare: "Share",
  },
  fr: {
    share: "Partager",
    shareArticle: "Partager cet article",
    shareSpot: "Partager ce site de vol",
    shareProduct: "Partager ce produit",
    copyLink: "Copier le lien",
    copied: "Copié !",
    nativeShare: "Partager",
  },
  ru: {
    share: "Поделиться",
    shareArticle: "Поделиться статьёй",
    shareSpot: "Поделиться местом полётов",
    shareProduct: "Поделиться товаром",
    copyLink: "Скопировать ссылку",
    copied: "Скопировано!",
    nativeShare: "Поделиться",
  },
  zh: {
    share: "分享",
    shareArticle: "分享这篇文章",
    shareSpot: "分享此飞行点",
    shareProduct: "分享此产品",
    copyLink: "复制链接",
    copied: "已复制！",
    nativeShare: "分享",
  },
  hi: {
    share: "साझा करें",
    shareArticle: "यह लेख साझा करें",
    shareSpot: "यह उड़ान स्थल साझा करें",
    shareProduct: "यह उत्पाद साझा करें",
    copyLink: "लिंक कॉपी करें",
    copied: "कॉपी हो गया!",
    nativeShare: "साझा करें",
  },
};

function safeLang(v: unknown): Lang {
  const l = String(v ?? "vi").slice(0, 2).toLowerCase() as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l) ? l : "vi";
}

/** URL đang xem, bỏ query/hash để link chia sẻ luôn sạch. */
function currentUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

function openPopup(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=640,height=640");
}

/** Nút tròn nhỏ, nền màu thương hiệu để nổi bật trên nền ảnh tối. */
const btnBase =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md ring-1 ring-white/25 transition-all hover:scale-110 hover:shadow-lg";

export function ShareButtons({
  lang,
  variant = "generic",
  title,
  className = "",
}: {
  lang: string;
  /** Đổi nhãn cho hợp ngữ cảnh trang. */
  variant?: "generic" | "article" | "spot" | "product";
  /** Tiêu đề kèm khi chia sẻ (X, Web Share API). */
  title?: string;
  className?: string;
}) {
  const t = I18N[safeLang(lang)];
  const [copied, setCopied] = useState(false);

  // Chỉ biết máy có Web Share API sau khi lên trình duyệt. Dùng
  // useSyncExternalStore để server render ra "không có" còn client tự
  // cập nhật — không lệch HTML lúc hydrate.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && !!navigator.share,
    () => false
  );

  const label =
    variant === "article"
      ? t.shareArticle
      : variant === "spot"
        ? t.shareSpot
        : variant === "product"
          ? t.shareProduct
          : t.share;

  const shareFacebook = () =>
    openPopup(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl())}`
    );

  const shareZalo = () =>
    openPopup(
      `https://sp.zalo.me/plugins/share?u=${encodeURIComponent(currentUrl())}`
    );

  const shareX = () =>
    openPopup(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl())}` +
        (title ? `&text=${encodeURIComponent(title)}` : "")
    );

  const copyLink = async () => {
    const url = currentUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Trình duyệt cũ / không cấp quyền clipboard — dùng cách thủ công
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: title || document.title, url: currentUrl() });
    } catch {
      // người dùng huỷ bảng chia sẻ — không cần báo lỗi
    }
  };

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-md ${className}`}
    >
      <span className="text-xs font-semibold text-white/75">{label}:</span>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={shareFacebook} className={`${btnBase} bg-[#1877F2] hover:bg-[#0F62D6]`} aria-label="Facebook" title="Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.93 8.44-9.94Z" />
          </svg>
        </button>

        <button type="button" onClick={shareZalo} className={`${btnBase} bg-[#0068FF] hover:bg-[#0055D4]`} aria-label="Zalo" title="Zalo">
          <span className="relative h-5 w-5 overflow-hidden rounded-full">
            <Image src="/social_icons/zalo.png" alt="" fill className="object-cover" sizes="20px" />
          </span>
        </button>

        <button type="button" onClick={shareX} className={`${btnBase} bg-black hover:bg-neutral-800`} aria-label="X (Twitter)" title="X (Twitter)">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={copyLink}
          className={`${btnBase} ${copied ? "bg-emerald-500 hover:bg-emerald-600" : "bg-sky-500 hover:bg-sky-600"}`}
          aria-label={copied ? t.copied : t.copyLink}
          title={copied ? t.copied : t.copyLink}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <path d="M8 12h8" />
            </svg>
          )}
        </button>

        {canNativeShare ? (
          <button type="button" onClick={nativeShare} className={`${btnBase} bg-violet-500 hover:bg-violet-600`} aria-label={t.nativeShare} title={t.nativeShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </button>
        ) : null}
      </div>

      {copied ? (
        <span className="text-[11px] font-medium text-emerald-300">{t.copied}</span>
      ) : null}
    </div>
  );
}
