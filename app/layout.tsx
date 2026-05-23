import type React from "react";
import type { Metadata } from "next";
import { Roboto, Merriweather } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { LanguageProvider, type Language } from "@/contexts/language-context";
import { Navigation } from "@/components/navigation";
import { FloatingSocial } from "@/components/floating-social";
import { buildMetadata, generateOrganizationSchema } from "@/lib/metadata-builder";
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
  applicationName: "Mebayluon",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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

  return (
    <html lang={lang}>
      <head>
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
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
            <Analytics />
            {/* <Footer /> */}
          </Suspense>
        </LanguageProvider>
      </body>
    </html>
  );
}