import type React from "react";
import type { Metadata } from "next";
import { Roboto, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import Script from "next/script";
import { cookies } from "next/headers";

import {
  LanguageProvider,
  type Language,
} from "@/contexts/language-context";

import { Navigation } from "@/components/navigation";
import { FloatingSocial } from "@/components/floating-social";

import {
  buildMetadata,
  generateOrganizationSchema,
  generateLocalBusinessSchema,
} from "@/lib/metadata-builder";

import "./globals.css";

const SUPPORTED_LANGS: Language[] = [
  "vi",
  "en",
  "fr",
  "ru",
  "zh",
  "hi",
];

/**
 * Font chính của website.
 *
 * Phần này đã bị thiếu trong đoạn code trước,
 * khiến roboto và merriweather không được định nghĩa.
 */
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap",
});

/**
 * Tên miền chính của website.
 *
 * Không sử dụng NEXT_PUBLIC_API_BASE_URL làm canonical
 * vì URL API có thể khác URL website.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://mebayluon.com"
).replace(/\/$/, "");

/**
 * Chuẩn hóa mã ngôn ngữ từ cookie.
 *
 * Ví dụ:
 * - vi-VN -> vi
 * - en-US -> en
 * - zh-CN -> zh
 */
function normalizeLanguage(value?: string): Language {
  const languageCode = (value ?? "vi")
    .trim()
    .toLowerCase()
    .slice(0, 2) as Language;

  return SUPPORTED_LANGS.includes(languageCode)
    ? languageCode
    : "vi";
}

/**
 * Chuyển JSON-LD thành chuỗi an toàn để nhúng vào HTML.
 */
function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Mebayluon | Đặt Tour Bay Dù Lượn Tại Việt Nam",

    description:
      "Đặt bay dù lượn cùng Mebayluon tại Hà Nội, Sapa, Mù Cang Chải và nhiều điểm bay tại Việt Nam. Phi công chuyên nghiệp, bảo hiểm và GoPro miễn phí.",

    keywords: [
      "bay dù lượn",
      "đặt tour bay dù lượn",
      "tour bay dù lượn",
      "bay dù lượn Việt Nam",
      "bay dù lượn Hà Nội",
      "bay dù lượn Sapa",
      "bay dù lượn Mù Cang Chải",
      "dù lượn Khau Phạ",
      "paragliding Vietnam",
      "Mebayluon",
    ],

    author: "Mebayluon",
    type: "website",
  }),

  metadataBase: new URL(SITE_URL),

  applicationName: "Mebayluon",

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mebayluon",
  },

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  /**
   * KHÔNG khai báo canonical ở layout gốc!
   * Metadata ở layout được kế thừa xuống mọi page — nếu đặt canonical = SITE_URL
   * tại đây, mọi trang con không tự khai alternates sẽ bị Google coi là
   * bản sao của trang chủ và loại khỏi index.
   * Canonical được khai riêng tại từng page/generateMetadata.
   */

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const languageCookie = cookieStore.get("language")?.value;
  const lang = normalizeLanguage(languageCookie);

  /**
   * Website sử dụng tiếng Trung giản thể.
   */
  const htmlLang = lang === "zh" ? "zh-CN" : lang;

  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

  const organizationSchema = generateOrganizationSchema();
  const localBusinessSchema = generateLocalBusinessSchema();

  return (
    <html lang={htmlLang}>
      <head>
        <script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationSchema),
          }}
        />

        <script
          id="local-business-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(localBusinessSchema),
          }}
        />
      </head>

      <body
        className={`${roboto.className} ${merriweather.variable}`}
        suppressHydrationWarning
      >
        <LanguageProvider initialLang={lang}>
          <Suspense fallback={null}>
            <Navigation />

            <main>{children}</main>

            <FloatingSocial />
          </Suspense>
        </LanguageProvider>

        <Analytics />

        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />

            <Script
              id="google-analytics"
              strategy="afterInteractive"
            >
              {`
                window.dataLayer = window.dataLayer || [];

                function gtag() {
                  window.dataLayer.push(arguments);
                }

                gtag("js", new Date());

                gtag("config", "${gaId}", {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}