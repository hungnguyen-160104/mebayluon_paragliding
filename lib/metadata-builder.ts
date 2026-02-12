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
  const canonicalUrl = resolveUrl(seo.url);
  const imageUrl = resolveImage(seo.image);

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
    },

    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: ogType,

      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: seo.title,
          // "type" here is OK (image mime type)
          type: "image/jpeg",
        },
      ],

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
      images: [imageUrl],
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
    sameAs: ["https://facebook.com/mebayluon", "https://instagram.com/mebayluon"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      telephone: "+84-xxx-xxx-xxx",
      email: "info@mebayluon.com",
    },
  };
}
