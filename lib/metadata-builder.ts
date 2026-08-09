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
  PLACE_MAP_URL,
  PLACE_GEO,
  type Locale,
} from "@/lib/site-config";
import { PARAGLIDING_PARTNERS, HOMESTAY_PARTNERS } from "@/lib/partner-links";

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  image?: string; // can be absolute or relative
  url?: string;   // can be absolute or relative
  author?: string;

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
   * Trang tự truyền ảnh (bài viết, sản phẩm, hồ sơ phi công) thì dùng ảnh đó
   * vì nó sát nội dung hơn; còn lại lấy thẻ dựng sẵn của mục.
   */
  const imageUrl = seo.image ? resolveImage(seo.image) : ogCardFor(basePath);

  // Map internal type -> Next OpenGraph supported type
  const ogType: "article" | "website" =
    seo.type === "article" ? "article" : "website";

  const base: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: seo.title,
    description: seo.description,

    // Next Metadata supports string[] here (recommended)
    keywords: seo.keywords,

    authors: seo.author ? [{ name: seo.author }] : undefined,

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

      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: seo.title,
                // "type" here is OK (image mime type)
                type: "image/png",
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
      index: true,
      follow: true,
      // Khai cả ở thẻ robots chung, không riêng googleBot: web nhiều ảnh đẹp
      // nên cần ảnh xem trước cỡ lớn và snippet không giới hạn độ dài.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      googleBot: {
        index: true,
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
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: data.description,
    image: [resolveImage(data.image)],
    datePublished: data.publishedDate.toISOString(),
    dateModified: data.updatedDate.toISOString(),
    author: {
      "@type": "Person",
      name: data.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL.replace(/\/$/, "")}/logo.png`,
      },
    },
    url: resolveUrl(data.url),
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

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL.replace(/\/$/, "")}/logo.png`,
    description: "Trải nghiệm bay dù lượn tự do trên khắp Việt Nam",
    sameAs: [
      "https://www.facebook.com/mebayluon",
      "https://www.youtube.com/@mebayluon",
      "https://www.tiktok.com/@mebayluon_paragliding",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "+84-964-073-555",
      email: "mebayluon@gmail.com",
      availableLanguage: ["Vietnamese", "English"],
    },
  };
}

/**
 * Generate LocalBusiness schema for Mebayluon
 */
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TouristInformationCenter",
    name: "Mebayluon Paragliding",
    image: DEFAULT_IMAGE,
    url: SITE_URL,
    telephone: "+84-964-073-555",
    email: "mebayluon@gmail.com",
    description: "Công ty bay dù lượn chuyên nghiệp tại Việt Nam. Trải nghiệm bay dù lượn tự do trên khắp Việt Nam.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Thôn Lìm Thái, Xã Tú Lệ",
      addressLocality: "Lào Cai",
      addressCountry: "VN",
    },
    // Trụ sở công ty đặt cùng chỗ với Clubhouse nên dùng chung toạ độ.
    geo: {
      "@type": "GeoCoordinates",
      latitude: PLACE_GEO.lat,
      longitude: PLACE_GEO.lng,
    },
    hasMap: PLACE_MAP_URL,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "06:00",
      closes: "19:00",
    },
    priceRange: "$$",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Bank Transfer",

    /**
     * address ở trên là trụ sở (Tú Lệ), nhưng Mebayluon tổ chức bay ở nhiều
     * tỉnh. Không khai areaServed thì Google chỉ hiểu doanh nghiệp phục vụ
     * quanh Tú Lệ, nên các tìm kiếm kiểu "bay dù lượn Hà Nội" hay "dù lượn
     * Sa Pa" khó nối được về đây. Liệt kê đúng những nơi đang có điểm bay
     * (xem SPOT_SLUGS trong lib/spots-slugs.ts) — thêm điểm bay mới thì nhớ
     * bổ sung vào đây.
     */
    areaServed: [
      { "@type": "Place", name: "Hà Nội" },
      { "@type": "Place", name: "Sa Pa" },
      { "@type": "Place", name: "Mù Cang Chải" },
      { "@type": "Place", name: "Trạm Tấu" },
      { "@type": "Place", name: "Tú Lệ" },
      { "@type": "Place", name: "Hà Giang" },
      { "@type": "Place", name: "Đà Nẵng" },
      { "@type": "Place", name: "Đà Lạt" },
    ],

    sameAs: [
      "https://www.facebook.com/mebayluon",
      "https://www.youtube.com/@mebayluon",
      "https://www.tiktok.com/@mebayluon_paragliding",
      ...PARAGLIDING_PARTNERS.map((p) => p.url),
    ],
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
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.name,
    alternateName: data.nickname,
    jobTitle: data.role,
    description: data.bio,
    image: resolveImage(data.image),
    url: resolveUrl(data.url),
    worksFor: {
      "@type": "Organization",
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
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
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
