import type React from "react";
import type { Metadata } from "next";
import { Roboto, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import Script from "next/script";
import { cookies } from "next/headers";
import { LanguageProvider, type Language } from "@/contexts/language-context";
import { Navigation } from "@/components/navigation";
import { FloatingSocial } from "@/components/floating-social";
import { buildMetadata, generateOrganizationSchema, generateLocalBusinessSchema, generateFAQSchema } from "@/lib/metadata-builder";
import "./globals.css";

const SUPPORTED_LANGS: Language[] = ["vi", "en", "fr", "ru", "zh", "hi"];

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ["latin", "vietnamese"],
  variable: "--font-merriweather",
  display: "swap",
});

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://mebayluon.com"
).replace(/\/$/, "");

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Mebayluon Paragliding - Bay Dù Lượn Tự Do Tại Việt Nam",
    description: "Trải nghiệm bay dù lượn tự do trên khắp Việt Nam - Sapa, Đà Lạt, Nha Trang, Mộc Châu, Tam Đảo, Hà Giang. Hướng dẫn chuyên nghiệp, tour trọn gói, chuẩn bị kỹ lưỡng.",
    keywords: [
      "bay dù lượn",
      "paragliding vietnam",
      "dù lượn",
      "bay dù",
      "tour bay dù",
      "sapa paragliding",
      "đà lạt paragliding",
      "mebayluon",
      "du lich mao hiem vietnam",
    ],
    author: "Mebayluon Team",
    type: "website",
  }),

  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  applicationName: "Mebayluon",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mebayluon",
  },
  formatDetection: { telephone: false },

  // hreflang — tất cả 6 ngôn ngữ trỏ về cùng URL vì web dùng cookie để chọn ngôn ngữ
  alternates: {
    canonical: SITE_URL,
    languages: {
      "vi":        SITE_URL,
      "en":        SITE_URL,
      "fr":        SITE_URL,
      "ru":        SITE_URL,
      "zh":        SITE_URL,
      "hi":        SITE_URL,
      "x-default": SITE_URL,
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("language")?.value ?? "vi";
  const lang: Language = SUPPORTED_LANGS.includes(rawLang.slice(0, 2) as Language)
    ? (rawLang.slice(0, 2) as Language)
    : "vi";

  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang={lang}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOrganizationSchema()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateLocalBusinessSchema()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema([
          { question: "Bay dù lượn có nguy hiểm không?", answer: "Bay dù lượn an toàn khi được hướng dẫn bởi phi công có chứng chỉ quốc tế. Tất cả phi công Mebayluon đều có chứng chỉ IPPI và nhiều năm kinh nghiệm." },
          { question: "Bay dù lượn cần chuẩn bị gì?", answer: "Bạn chỉ cần mặc quần áo thoải mái, giày thể thao. Mebayluon cung cấp toàn bộ thiết bị bay, bảo hiểm và phi công chuyên nghiệp." },
          { question: "Giá bay dù lượn tại Mebayluon là bao nhiêu?", answer: "Giá bay dù lượn đôi tại Mebayluon từ 1.500.000 VNĐ đến 2.500.000 VNĐ tuỳ địa điểm. Liên hệ 0964073555 để biết giá chi tiết." },
          { question: "Độ tuổi nào có thể bay dù lượn?", answer: "Người từ 10 tuổi trở lên và dưới 70 tuổi, cân nặng từ 40kg đến 100kg có thể tham gia bay dù lượn đôi cùng phi công chuyên nghiệp." },
          { question: "Địa điểm bay dù lượn nổi tiếng tại Việt Nam?", answer: "Mebayluon tổ chức bay dù lượn tại Mù Cang Chải, Sapa, Đà Lạt, Tam Đảo, Mộc Châu và nhiều địa điểm khác trên toàn Việt Nam." },
        ])) }} />
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
            <Analytics />
            {/* <Footer /> */}
          </Suspense>
          {gaId && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `}
              </Script>
            </>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}