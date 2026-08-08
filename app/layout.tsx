import type React from "react";
import type { Metadata } from "next";
import { Roboto, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import Script from "next/script";

import {
  LanguageProvider,
  type Language,
} from "@/contexts/language-context";

import { getRequestLang } from "@/lib/locale";

import { Navigation } from "@/components/navigation";
import { FloatingSocial } from "@/components/floating-social";

import {
  buildMetadata,
  generateOrganizationSchema,
  generateLocalBusinessSchema,
} from "@/lib/metadata-builder";

import { SITE_URL, GOOGLE_SITE_VERIFICATION } from "@/lib/site-config";

import "./globals.css";

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
   * TUYỆT ĐỐI KHÔNG khai báo alternates.canonical ở layout: mọi trang
   * con không tự khai canonical sẽ thừa hưởng nó và tự trỏ về trang chủ
   * (đã từng khiến /booking, /homestay bị Google bỏ qua). Canonical của
   * trang chủ nằm trong app/page.tsx; mỗi trang tự khai của mình.
   * Dòng dưới ghi đè alternates mà buildMetadata() sinh ra trong spread.
   */
  alternates: {},

  /**
   * Xác minh quyền sở hữu với Google Search Console.
   *
   * Chỉ render thẻ meta khi biến môi trường có giá trị, tránh xuất ra
   * thẻ rỗng làm Google báo xác minh thất bại. Phương thức dự phòng là
   * file public/googlea7228a1dc33df7a0.html.
   */
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),

  robots: {
    index: true,
    follow: true,

    // Xem chú thích ở lib/metadata-builder.ts
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * URL có prefix ngôn ngữ (/en, /ru...) thì URL thắng; không có thì
   * theo cookie như cũ. Logic nằm trong lib/locale.ts.
   */
  const lang = (await getRequestLang()) as Language;

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