// lib/metadata-builder.ts
/**
 * Utility for building consistent metadata across pages
 * Includes OpenGraph, Twitter Cards, and structured data
 */

import type { Metadata } from "next";

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
}

const SITE_NAME = "Mebayluon Paragliding";
// Nên dùng SITE_URL riêng cho frontend, không phải API base url
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://mebayluon.com";

const DEFAULT_IMAGE = `${SITE_URL.replace(/\/$/, "")}/og-image.jpg`;

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
  // Chỉ tạo canonical khi page truyền url thật.
  // Nếu tự suy ra SITE_URL làm canonical, mọi page dùng chung sẽ bị Google
  // coi là bản sao của trang chủ và loại khỏi index.
  const canonicalUrl = seo.url ? resolveUrl(seo.url) : undefined;

  // Chỉ khai openGraph.images khi page truyền ảnh thật.
  // Nếu bỏ trống, Next.js tự dùng app/opengraph-image.tsx (ảnh OG động).
  // Trước đây default là /og-image.jpg — file KHÔNG tồn tại → share FB/Zalo mất ảnh.
  const imageUrl = seo.image ? resolveImage(seo.image) : undefined;

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

    ...(canonicalUrl
      ? {
          alternates: {
            canonical: canonicalUrl,
          },
        }
      : {}),

    openGraph: {
      title: seo.title,
      description: seo.description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
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
      "https://facebook.com/mebayluon",
      "https://www.youtube.com/@mebayluon",
      "https://www.tiktok.com/@mebayluon",
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
    image: `${SITE_URL.replace(/\/$/, "")}/logo.png`,
    url: SITE_URL,
    telephone: "+84-964-073-555",
    email: "mebayluon@gmail.com",
    description: "Công ty bay dù lượn chuyên nghiệp tại Việt Nam. Trải nghiệm bay dù lượn tự do trên khắp Việt Nam.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Mù Cang Chải",
      addressLocality: "Yên Bái",
      addressCountry: "VN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 21.8167,
      longitude: 104.1167,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "06:00",
      closes: "19:00",
    },
    priceRange: "$$",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Bank Transfer",
    sameAs: [
      "https://facebook.com/mebayluon",
      "https://www.youtube.com/@mebayluon",
    ],
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
