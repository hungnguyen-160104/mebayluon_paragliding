// lib/metadata-builder.ts
/**
 * Utility for building consistent metadata across pages
 * Includes OpenGraph, Twitter Cards, and structured data
 */

import type { Metadata } from "next";

import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_LOCALE,
  languageAlternates,
  canonicalUrlFor,
  localizedUrl,
  LOCALES,
  PLACE_MAP_URL,
  PLACE_GEO,
  type Locale,
} from "@/lib/site-config";
import { HOMESTAY_PARTNERS } from "@/lib/partner-links";
import {
  LEGAL_ENTITY,
  COMPANY_BRANCHES,
  branchMapUrl,
  type CompanyBranch,
} from "@/lib/legal-entity";
import { cloudinaryOgImage, isCloudinaryImage } from "@/lib/cloudinary-url";

/** Mã og:locale (Open Graph dùng gạch dưới: vi_VN, en_US…). */
const OG_LOCALE: Record<Locale, string> = {
  vi: "vi_VN",
  en: "en_US",
  fr: "fr_FR",
  ru: "ru_RU",
  zh: "zh_CN",
  hi: "hi_IN",
};

/** Mã ngôn ngữ BCP 47 cho `inLanguage` trong JSON-LD. */
export const SCHEMA_LANG: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en",
  fr: "fr",
  ru: "ru",
  zh: "zh-CN",
  hi: "hi",
};

/** Mạng xã hội chính thức — dùng chung cho Organization và LocalBusiness. */
const SOCIAL_PROFILES = [
  "https://www.facebook.com/mebayluon",
  "https://www.youtube.com/@mebayluon",
  "https://www.tiktok.com/@mebayluon_paragliding",
  "https://www.instagram.com/mebayluon.paragliding/",
];

const ORG_ID = `${SITE_URL}/#organization`;
const LOGO_URL = `${SITE_URL.replace(/\/$/, "")}/logo.png`;
/** Điện thoại chính, định dạng quốc tế. */
const MAIN_PHONE = "+84-964-073-555";

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  image?: string; // can be absolute or relative
  url?: string;   // can be absolute or relative
  author?: string;
  /** Link hồ sơ tác giả (thẻ meta author kèm url) — xem lib/authors.ts. */
  authorUrl?: string;

  // Dates for articles (optional)
  publishedDate?: Date;
  updatedDate?: Date;

  // Your internal page type (note: "product" is NOT supported by Next OpenGraph.type)
  type?: "article" | "product" | "website";

  /**
   * Ngôn ngữ theo URL (lấy từ getUrlLocale() trong lib/locale.ts).
   *
   * Khi truyền vào, canonical sẽ trỏ về đúng bản ngôn ngữ đang xem
   * (/ru/spots canonical về chính nó, không phải bản tiếng Việt) và
   * alternates.languages liệt kê đủ 6 bản hreflang — điều kiện để
   * Google index từng ngôn ngữ như một trang riêng.
   */
  locale?: Locale;

  /**
   * Những ngôn ngữ trang này THẬT SỰ có nội dung riêng.
   *
   * Bỏ trống = đủ 6 ngôn ngữ (đúng với các trang tĩnh, vì giao diện đã dịch
   * đủ). Trang bài viết / sản phẩm chỉ có tiếng Việt + tiếng Anh nên phải
   * truyền ["vi", "en"] — khi đó /fr/... sẽ canonical về bản tiếng Anh và
   * hreflang chỉ khai 2 ngôn ngữ, thay vì khai khống 6 bản như trước.
   *
   * Khi bạn dịch xong một bài sang tiếng Pháp, chỉ cần thêm "fr" vào danh
   * sách này là hreflang và sitemap tự có thêm bản tiếng Pháp cho bài đó.
   */
  availableLocales?: readonly Locale[];
}

/**
 * Thẻ xem trước khi chia sẻ link (Zalo, Messenger, Facebook, Telegram…).
 *
 * Mỗi trang có một tấm riêng: ảnh thật của trang làm nền, phủ tối dần từ dưới
 * lên, tên trang và thương hiệu in ngay trên ảnh. Nhờ vậy người nhận link biết
 * ngay là trang gì, không phải đoán qua tấm ảnh trần.
 *
 * Các tấm này là ảnh TĨNH dựng sẵn trong public/og/cards, không sinh lúc chạy.
 * Trước đây mỗi trang có một tệp opengraph-image.tsx sinh ảnh theo yêu cầu;
 * cách đó buộc phải gói ảnh nền vào hàm serverless, mà khai gói theo thư mục
 * thì Vercel kéo cả public/ (319 MB) vào một hàm và build hỏng vì vượt trần
 * 250 MB. Dựng sẵn thì hàm nhẹ tênh, ảnh lại được CDN phục vụ nhanh hơn.
 *
 * Dựng lại khi đổi ảnh nền hay câu chữ: xem scripts/build-og-cards.md.
 */
const OG_CARD_BY_SECTION: Record<string, string> = {
  "": "home",
  spots: "spots",
  store: "store",
  contact: "contact",
  homestay: "homestay",
  blog: "blog",
  pilots: "pilots",
  ppg: "ppg",
  booking: "booking",
  knowledge: "knowledge",
  muavang: "muavang",
  "pre-notice": "pre-notice",
  // Trang báo bay phi công bay đơn — thẻ riêng, trước đây mượn thẻ Mùa Vàng
  baobay: "baobay",
};

const DEFAULT_IMAGE = `${SITE_URL}/og/cards/home.jpg`;

/**
 * Chọn thẻ theo mục lớn của trang, ví dụ "/spots/khau-pha" -> thẻ "spots".
 * Đường dẫn ở đây đã bỏ tiền tố ngôn ngữ nên /fr/spots cũng ra cùng một thẻ.
 */
function ogCardFor(basePath: string): string {
  const section = basePath.split("/").filter(Boolean)[0] ?? "";
  const card = OG_CARD_BY_SECTION[section];
  return card ? `${SITE_URL}/og/cards/${card}.jpg` : DEFAULT_IMAGE;
}

/**
 * Safely resolve a possibly-relative URL against SITE_URL
 */
function resolveUrl(input?: string): string {
  if (!input) return SITE_URL;
  try {
    // If input is absolute, new URL(input) works
    // If input is relative, new URL(input, SITE_URL) works
    return new URL(input, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

function resolveImage(input?: string): string {
  if (!input) return DEFAULT_IMAGE;
  try {
    return new URL(input, SITE_URL).toString();
  } catch {
    return DEFAULT_IMAGE;
  }
}

/**
 * Build metadata object with OpenGraph and Twitter Cards
 * NOTE:
 * - Next.js OpenGraph "type" DOES NOT accept "product".
 * - We map "product" -> "website" for OpenGraph, and use JSON-LD for Product schema instead.
 */
export function buildMetadata(seo: SEOMetadata): Metadata {
  const locale = seo.locale ?? DEFAULT_LOCALE;

  // Đường dẫn gốc (không prefix ngôn ngữ) của trang, ví dụ "/spots/khau-pha"
  const basePath = (() => {
    try {
      return new URL(resolveUrl(seo.url)).pathname || "/";
    } catch {
      return "/";
    }
  })();

  const available = seo.availableLocales;
  const canonicalUrl = canonicalUrlFor(basePath, locale, available);

  /**
   * BẢN NGÔN NGỮ CHƯA DỊCH THÌ KHÔNG CHO INDEX.
   *
   * Bài chỉ có tiếng Việt + tiếng Anh nhưng /zh/blog/x vẫn mở được và trả về
   * NỘI DUNG TIẾNG ANH, kèm `html lang="zh-CN"` và `index, follow`. Canonical
   * có trỏ về bản tiếng Anh, nhưng canonical chỉ là GỢI Ý — Google vẫn index
   * URL /zh/ rồi đem nó ra trả cho truy vấn tiếng Anh ("paragliding vietnam"
   * ra URL /zh/). Người tìm bằng tiếng Anh bấm vào một địa chỉ /zh/ thì tưởng
   * vào nhầm trang tiếng Trung.
   *
   * `follow` vẫn bật: trang không hiện trong kết quả tìm kiếm nhưng link bên
   * trong nó vẫn dẫn Google đi tiếp, không chặn dòng chảy sang bản đúng.
   *
   * Trang KHÔNG khai `availableLocales` (trang tĩnh, đã dịch đủ) thì
   * `available` rỗng — mọi thứ index như thường.
   */
  /**
   * CẬP NHẬT 01/10/2026 (chủ chọn "chỉ canonical"): Google khuyên KHÔNG ghép
   * noindex với canonical trỏ sang URL khác — hai tín hiệu đá nhau. Nay bản
   * chưa dịch được index như thường và chỉ dựa vào canonical (→ /en/…) để gộp
   * tín hiệu; `<html lang>` của trang đó cũng theo ngôn ngữ nội dung thật
   * (xem app/layout.tsx). Giữ biến để chỗ đọc bên dưới không phải sửa.
   */
  const indexable = true;

  /** Ngôn ngữ của NỘI DUNG đang hiển thị (bản chưa dịch → ngôn ngữ canonical). */
  const contentLocale: Locale =
    !available || available.length === 0 || available.includes(locale)
      ? locale
      : available.includes("en")
        ? "en"
        : available.includes(DEFAULT_LOCALE)
          ? DEFAULT_LOCALE
          : available[0];
  const ogAlternateLocales = (available && available.length ? available : LOCALES)
    .filter((l) => l !== contentLocale)
    .map((l) => OG_LOCALE[l]);

  /**
   * Trang tự truyền ảnh (bài viết, sản phẩm, hồ sơ phi công) thì dùng ảnh đó
   * vì nó sát nội dung hơn; còn lại lấy thẻ dựng sẵn của mục.
   */
  /**
   * Ảnh bìa trên Cloudinary → bản cắt đúng 1200×630, JPEG q80 (SEO 01/10/2026):
   * 51 bài từng dùng ảnh gốc 1–4 MB làm og:image, Zalo/WhatsApp hay không
   * hiện được thẻ xem trước. Ảnh nằm trong /public thì để nguyên.
   */
  const imageUrl = seo.image
    ? isCloudinaryImage(seo.image)
      ? cloudinaryOgImage(seo.image)
      : resolveImage(seo.image)
    : ogCardFor(basePath);
  const imageIsSized = !seo.image || isCloudinaryImage(seo.image);
  const imageMime = /\.png(\?|$)/i.test(imageUrl)
    ? "image/png"
    : /\.webp(\?|$)/i.test(imageUrl)
      ? "image/webp"
      : "image/jpeg";

  // Map internal type -> Next OpenGraph supported type
  const ogType: "article" | "website" =
    seo.type === "article" ? "article" : "website";

  const base: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: seo.title,
    description: seo.description,

    // Next Metadata supports string[] here (recommended)
    keywords: seo.keywords,

    authors: seo.author
      ? [{ name: seo.author, ...(seo.authorUrl ? { url: seo.authorUrl } : {}) }]
      : undefined,

    alternates: {
      canonical: canonicalUrl,
      languages: languageAlternates(basePath, available),
    },

    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: ogType,
      locale: OG_LOCALE[contentLocale],
      alternateLocale: ogAlternateLocales,

      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                // Chỉ khai kích thước khi chắc chắn (thẻ dựng sẵn / bản cắt
                // Cloudinary 1200×630); ảnh /public khác cỡ thì để trống.
                ...(imageIsSized ? { width: 1200, height: 630 } : {}),
                alt: seo.title,
                type: imageMime,
              },
            ],
          }
        : {}),

      // Only attach article times if it's an article page
      ...(ogType === "article" && seo.publishedDate
        ? { publishedTime: seo.publishedDate.toISOString() }
        : {}),
      ...(ogType === "article" && seo.updatedDate
        ? { modifiedTime: seo.updatedDate.toISOString() }
        : {}),
    },

    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
      creator: "@mebayluon",
    },

    robots: {
      index: indexable,
      follow: true,
      // Khai cả ở thẻ robots chung, không riêng googleBot: web nhiều ảnh đẹp
      // nên cần ảnh xem trước cỡ lớn và snippet không giới hạn độ dài.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      googleBot: {
        index: indexable,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };

  return base;
}

/**
 * Generate JSON-LD structured data for articles
 */
export function generateArticleSchema(data: {
  title: string;
  description: string;
  image: string;
  publishedDate: Date;
  updatedDate: Date;
  author: string;
  /**
   * Tác giả có hồ sơ (lib/authors.ts): khai Person kèm url/jobTitle và @id
   * trùng Person ở trang /pilots/<slug>. Không có → tên thương hiệu ("Admin",
   * "Mebayluon"…) khai thành Organization; tên khác giữ Person chỉ có tên.
   */
  authorUrl?: string;
  authorJobTitle?: string;
  authorId?: string;
  authorIsBrand?: boolean;
  /** URL tuyệt đối của bản ngôn ngữ đang xem (hoặc canonical của nó). */
  url: string;
  /** Ngôn ngữ của nội dung bài đang hiển thị. */
  inLanguage?: Locale;
}) {
  const url = resolveUrl(data.url);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: data.description,
    image: [resolveImage(data.image)],
    datePublished: data.publishedDate.toISOString(),
    dateModified: data.updatedDate.toISOString(),
    author: data.authorIsBrand
      ? { "@type": "Organization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL }
      : {
          "@type": "Person",
          ...(data.authorId ? { "@id": data.authorId } : {}),
          name: data.author,
          ...(data.authorUrl ? { url: resolveUrl(data.authorUrl) } : {}),
          ...(data.authorJobTitle ? { jobTitle: data.authorJobTitle } : {}),
        },
    publisher: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(data.inLanguage ? { inLanguage: SCHEMA_LANG[data.inLanguage] } : {}),
  };
}

/**
 * Generate JSON-LD structured data for products
 */
export function generateProductSchema(data: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  rating?: number;
  ratingCount?: number;
  url: string;
}) {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: data.name,
    description: data.description,
    image: [resolveImage(data.image)],
    offers: {
      "@type": "Offer",
      url: resolveUrl(data.url),
      priceCurrency: data.currency,
      price: String(data.price),
      availability: "https://schema.org/InStock",
    },
    ...(typeof data.rating === "number" && data.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: data.rating,
            reviewCount: data.ratingCount ?? 0,
          },
        }
      : {}),
  };
}

/** PostalAddress của một địa điểm (trụ sở / chi nhánh) — lib/legal-entity.ts. */
function branchPostalAddress(b: CompanyBranch) {
  return {
    "@type": "PostalAddress",
    streetAddress: b.streetAddress,
    addressLocality: b.addressLocality,
    addressRegion: b.addressRegion,
    addressCountry: "VN",
  };
}

const ORG_DESCRIPTION: Record<Locale, string> = {
  vi: "Trải nghiệm bay dù lượn tự do trên khắp Việt Nam",
  en: "Tandem paragliding flights across Vietnam",
  fr: "Vols en parapente biplace partout au Vietnam",
  ru: "Тандемные полёты на параплане по всему Вьетнаму",
  zh: "越南各地双人滑翔伞飞行体验",
  hi: "पूरे वियतनाम में टैंडम पैराग्लाइडिंग उड़ानें",
};

const BRANCH_LABEL: Record<Locale, { hq: string; branch: string }> = {
  vi: { hq: "Trụ sở chính", branch: "Chi nhánh" },
  en: { hq: "Head office", branch: "Branch" },
  fr: { hq: "Siège social", branch: "Agence" },
  ru: { hq: "Головной офис", branch: "Филиал" },
  zh: { hq: "总部", branch: "分公司" },
  hi: { hq: "मुख्य कार्यालय", branch: "शाखा" },
};

/** Tên hiển thị của địa điểm: "Mebayluon Paragliding – <điểm bay>". */
export function branchDisplayName(b: CompanyBranch, locale: Locale = DEFAULT_LOCALE): string {
  return `${SITE_NAME} – ${b.site[locale] ?? b.site.en}`;
}

/**
 * Organization toàn site (SEO 01/10/2026, chủ chốt phương án chi nhánh).
 *
 * Pháp nhân: CTCP Du lịch và Thể thao Viên Nam — tên, MST, trụ sở lấy từ
 * lib/legal-entity.ts (cùng nguồn với khối pháp nhân ở footer, nên NAP khớp).
 * Năm địa điểm (trụ sở + 4 chi nhánh) khai trong `department`; mỗi trang điểm
 * bay khai lại LocalBusiness đầy đủ của chi nhánh mình (generateBranchSchema)
 * và trỏ `parentOrganization` về đúng @id ở đây.
 *
 * Trước đây layout còn khai thêm một TouristInformationCenter gắn cứng địa chỉ
 * Tú Lệ trên MỌI trang — thành ra trang Hà Nội, Sa Pa cũng nói doanh nghiệp ở
 * Tú Lệ, lệch với footer (Xuân Mai) và /contact (Sa Pa). Đã bỏ.
 */
export function generateOrganizationSchema(locale: Locale = DEFAULT_LOCALE) {
  const hq = COMPANY_BRANCHES.find((b) => b.headquarters);
  const label = BRANCH_LABEL[locale] ?? BRANCH_LABEL.vi;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    alternateName: "Mebayluon",
    legalName: LEGAL_ENTITY.legalName,
    taxID: LEGAL_ENTITY.taxCode,
    url: SITE_URL,
    logo: LOGO_URL,
    image: DEFAULT_IMAGE,
    description: ORG_DESCRIPTION[locale] ?? ORG_DESCRIPTION.vi,
    telephone: MAIN_PHONE,
    email: LEGAL_ENTITY.email,
    ...(hq ? { address: branchPostalAddress(hq) } : {}),
    founder: { "@type": "Person", name: LEGAL_ENTITY.legalRepresentative.name },
    sameAs: SOCIAL_PROFILES,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: MAIN_PHONE,
      email: LEGAL_ENTITY.email,
      availableLanguage: ["Vietnamese", "English"],
    },
    department: COMPANY_BRANCHES.map((b) => ({
      "@type": ["LocalBusiness", "SportsActivityLocation"],
      "@id": `${localizedUrl(`/spots/${b.spot}`, DEFAULT_LOCALE)}#${b.id}`,
      name: branchDisplayName(b, locale),
      description: `${b.headquarters ? label.hq : label.branch} – ${b.site[locale] ?? b.site.en}`,
      url: localizedUrl(`/spots/${b.spot}`, locale),
      telephone: MAIN_PHONE,
      address: branchPostalAddress(b),
      geo: { "@type": "GeoCoordinates", latitude: b.geo.lat, longitude: b.geo.lng },
      hasMap: branchMapUrl(b),
    })),
  };
}

/**
 * LocalBusiness + SportsActivityLocation của MỘT chi nhánh — khai ở trang điểm
 * bay chi nhánh đó phục vụ (app/spots/[slug]/page.tsx). `@id` trùng với mục
 * trong `department` của Organization để Google nối hai nơi là một thực thể.
 */
export function generateBranchSchema(
  b: CompanyBranch,
  opts: { locale: Locale; image?: string; description?: string },
) {
  const label = BRANCH_LABEL[opts.locale] ?? BRANCH_LABEL.vi;
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SportsActivityLocation"],
    "@id": `${localizedUrl(`/spots/${b.spot}`, DEFAULT_LOCALE)}#${b.id}`,
    name: branchDisplayName(b, opts.locale),
    description:
      opts.description ?? `${b.headquarters ? label.hq : label.branch} – ${b.site[opts.locale] ?? b.site.en}`,
    url: localizedUrl(`/spots/${b.spot}`, opts.locale),
    image: resolveImage(opts.image),
    logo: LOGO_URL,
    telephone: MAIN_PHONE,
    email: LEGAL_ENTITY.email,
    address: branchPostalAddress(b),
    geo: { "@type": "GeoCoordinates", latitude: b.geo.lat, longitude: b.geo.lng },
    hasMap: branchMapUrl(b),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "06:00",
      closes: "19:00",
    },
    priceRange: "$$",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Bank Transfer",
    parentOrganization: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      legalName: LEGAL_ENTITY.legalName,
      taxID: LEGAL_ENTITY.taxCode,
      url: SITE_URL,
    },
    sameAs: SOCIAL_PROFILES,
  };
}


/**
 * Homestay Clubhouse Mebayluon — khai riêng ở trang /homestay.
 *
 * Đây là thực thể KHÁC với công ty dù lượn: khác loại hình, khác hồ sơ trên
 * các nền tảng đặt phòng. Trộn chung vào LocalBusiness ở trên thì Google dễ
 * hiểu nhầm hai doanh nghiệp là một.
 */
export function generateLodgingSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Clubhouse Mebayluon Paragliding",
    url: `${SITE_URL.replace(/\/$/, "")}/homestay`,
    image: DEFAULT_IMAGE,
    telephone: "+84-964-073-555",
    email: "mebayluon@gmail.com",
    description:
      "Homestay bên suối nằm ngay trong bãi hạ cánh dù lượn ở thung lũng Tú Lệ — phòng nghỉ, bể bơi, sân cỏ và chỗ cắm trại, xem dù lượn hạ cánh ngay trước cửa.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Thôn Lìm Thái, Xã Tú Lệ",
      addressLocality: "Lào Cai",
      addressCountry: "VN",
    },
    /**
     * Toạ độ lấy từ chính địa điểm Clubhouse trên Google Maps. Bản trước dùng
     * 21.8167 / 104.1167 chép từ LocalBusiness của công ty dù lượn — lệch
     * khoảng 15 km so với vị trí thật.
     */
    geo: {
      "@type": "GeoCoordinates",
      latitude: PLACE_GEO.lat,
      longitude: PLACE_GEO.lng,
    },
    hasMap: PLACE_MAP_URL,
    priceRange: "$$",
    currenciesAccepted: "VND",
    sameAs: [PLACE_MAP_URL, ...HOMESTAY_PARTNERS.map((p) => p.url)],
  };
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: resolveUrl(item.url),
    })),
  };
}

/**
 * Generate Person schema for pilot profiles
 */
export function generatePilotSchema(data: {
  name: string;
  nickname: string;
  role: string;
  bio: string;
  image: string;
  url: string;
  experience?: string;
  certificates?: string[];
  /** @id cố định (không tiền tố ngôn ngữ) để bài viết trỏ author về đây. */
  id?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    ...(data.id ? { "@id": data.id } : {}),
    name: data.name,
    alternateName: data.nickname,
    jobTitle: data.role,
    description: data.bio,
    image: resolveImage(data.image),
    url: resolveUrl(data.url),
    worksFor: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      url: SITE_URL,
    },
    hasCredential: data.certificates?.map((cert) => ({
      "@type": "EducationalOccupationalCredential",
      name: cert,
    })),
  };
}

/**
 * Generate TouristAttraction schema for flying spots
 */
export function generateSpotSchema(data: {
  name: string;
  description: string;
  image: string;
  url: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  inLanguage?: Locale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    ...(data.inLanguage ? { inLanguage: SCHEMA_LANG[data.inLanguage] } : {}),
    name: data.name,
    description: data.description,
    image: resolveImage(data.image),
    url: resolveUrl(data.url),
    touristType: "Adventure sports, Paragliding",
    ...(data.latitude && data.longitude ? {
      geo: {
        "@type": "GeoCoordinates",
        latitude: data.latitude,
        longitude: data.longitude,
      },
    } : {}),
    ...(data.address ? {
      address: {
        "@type": "PostalAddress",
        addressLocality: data.address,
        addressCountry: "VN",
      },
    } : {}),
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
