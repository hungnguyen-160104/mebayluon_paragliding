import type React from "react";
import type { Metadata } from "next";
import { Roboto, Merriweather, Alfa_Slab_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import Script from "next/script";
import { headers } from "next/headers";

import {
  LanguageProvider,
  type Language,
} from "@/contexts/language-context";

import { getRequestLang, getUrlLocale } from "@/lib/locale";
import { UrlLocaleProvider } from "@/components/locale-link";

import { Navigation } from "@/components/navigation";
import { FloatingSocial } from "@/components/floating-social";
import { SiteFooterGate } from "@/components/footer/SiteFooter";
import Footer from "@/components/footer/Footer";

import { buildMetadata, generateOrganizationSchema } from "@/lib/metadata-builder";
import { getPostLocalesBySlug } from "@/lib/posts-data";

import { SITE_URL, GOOGLE_SITE_VERIFICATION } from "@/lib/site-config";

import "./globals.css";

/**
 * Font chính của website.
 *
 * Roboto (chữ thân bài) — 4 độ đậm đều đang dùng: 300 (đoạn văn bài viết
 * `font-light`), 400, 500 (`font-medium`), 700 (`font-bold`/`font-semibold`).
 * Google trả cùng MỘT tệp variable cho cả 4 độ đậm nên bỏ bớt cũng không nhẹ
 * hơn; chỉ Roboto được preload vì nó là chữ của màn hình đầu.
 *
 * Merriweather chỉ dùng cho H1 bài viết và trang sản phẩm (font-bold) → chỉ
 * khai 700 và KHÔNG preload (SEO 01/10/2026): trước đây 4 độ đậm Merriweather
 * bị preload trên MỌI trang, tranh băng thông với ảnh nền và CSS ở màn đầu,
 * kể cả những trang không có một chữ Merriweather nào.
 */
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto",
  display: "swap",
  preload: true,
});

const merriweather = Merriweather({
  weight: ["700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

/**
 * Alfa Slab One — chữ khối dày cho tiêu đề VÂN ĐÁ "Bay trên cao nguyên đá" ở
 * trang /spots/ha-giang, cùng phông với hagiangparamotor.com (chủ 07/10/2026).
 * Chỉ một trang dùng nên KHÔNG preload.
 */
const stoneFont = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-stone",
  display: "swap",
  preload: false,
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
  /** Ngôn ngữ THEO URL — link nội bộ gắn tiền tố theo cái này (components/locale-link). */
  const urlLocale = await getUrlLocale();

  const headerStore = await headers();

  /**
   * `<html lang>` = ngôn ngữ của NỘI DUNG (SEO 01/10/2026). Bài chưa dịch mở
   * bằng /fr|ru|zh|hi/blog/x hiện bản tiếng Anh (canonical → /en/blog/x) nên
   * khai lang="en" cho khớp, thay vì "zh-CN" trên một trang chữ Anh. Menu và
   * footer vẫn theo ngôn ngữ URL như cũ. Đường dẫn do middleware gắn
   * (x-mbl-path) — chỉ có trên URL có tiền tố ngôn ngữ.
   */
  let contentLang: string = lang;
  if (urlLocale !== "vi" && urlLocale !== "en") {
    const blogSlug = /^\/blog\/([^/?#]+)\/?$/.exec(headerStore.get("x-mbl-path") ?? "")?.[1];
    if (blogSlug) {
      const available = await getPostLocalesBySlug(decodeURIComponent(blogSlug));
      if (available && !available.includes(urlLocale)) {
        contentLang = available.includes("en") ? "en" : available[0];
      }
    }
  }

  /**
   * Website sử dụng tiếng Trung giản thể.
   */
  const htmlLang = contentLang === "zh" ? "zh-CN" : contentLang;

  /** Trang nhúng /embed/* (middleware gắn x-mbl-embed): không GA, không Vercel Analytics */
  const isEmbed = headerStore.get("x-mbl-embed") === "1";
  const gaId = isEmbed ? undefined : process.env.NEXT_PUBLIC_GA_ID?.trim();

  /**
   * Organization (pháp nhân + trụ sở + 4 chi nhánh) trên mọi trang. Từng có
   * thêm một LocalBusiness gắn cứng địa chỉ Tú Lệ ở đây — đã bỏ: mỗi trang
   * điểm bay tự khai LocalBusiness của chi nhánh mình.
   */
  const organizationSchema = generateOrganizationSchema(urlLocale);

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

      </head>

      <body
        className={`${roboto.className} ${merriweather.variable} ${stoneFont.variable}`}
        suppressHydrationWarning
      >
        <LanguageProvider initialLang={lang}>
          <UrlLocaleProvider initial={urlLocale}>
          {/*
            CHỈ bọc Suspense quanh menu và nút nổi, KHÔNG bọc {children}
            (SEO 01/10/2026): Suspense bọc trang làm HTML stream ra trước khi
            trang chạy xong, nên notFound()/permanentRedirect() trong trang chỉ
            còn cho HTTP 200 (soft 404, soft redirect). Bỏ ra ngoài thì
            /blog/khong-co trả 404 thật, /blog/<sản phẩm> trả 308 thật.
          */}
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>

          <main>{children}</main>

          {/* Footer chung cho MỌI trang công khai — tự ẩn ở khu nội bộ */}
          <SiteFooterGate>
            <Footer />
          </SiteFooterGate>

          <Suspense fallback={null}>
            <FloatingSocial />
          </Suspense>
          </UrlLocaleProvider>
        </LanguageProvider>

        {isEmbed ? null : <Analytics />}

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