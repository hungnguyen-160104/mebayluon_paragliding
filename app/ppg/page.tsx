// app/ppg/page.tsx
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import PpgClient from "./PpgClient";
import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";
import { getPpgCopy } from "@/lib/i18n/ppg";
import { SpotReviewBadges } from "@/components/reviews/SpotReviewBadges";
import { PPG_TRIPADVISOR_REVIEW_URL } from "@/lib/spot-partner-links";
import { getTripadvisorReview } from "@/lib/tripadvisor-reviews";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const copy = getPpgCopy(locale);

  return buildMetadata({
    title: copy.metaTitle,
    description: copy.metaDescription,
    keywords: [
      "dù lượn gắn động cơ",
      "paramotor Việt Nam",
      "PPG Khau Phạ",
      "bay săn mây Mù Cang Chải",
      "powered paragliding Vietnam",
    ],
    url: "/ppg",
    type: "website",
    locale,
  });
}

export default async function PpgPage() {
  const [locale, taReview] = await Promise.all([getUrlLocale(), getTripadvisorReview("ppg")]);
  return (
    <div className="min-h-screen">
      <Navigation />
      <PpgClient />

      {/* Bong bóng Tripadvisor nổi (chủ 12/09): trỏ thẳng trang VIẾT ĐÁNH GIÁ
          của dịch vụ paramotor — không dùng link tour Khau Phạ chung. Điểm sao
          tự lấy khi có TRIPADVISOR_API_KEY, chưa có thì bong bóng chỉ hiện chữ. */}
      <SpotReviewBadges
        tripadvisorUrl={PPG_TRIPADVISOR_REVIEW_URL}
        tripadvisorRating={taReview.rating}
        lang={locale}
      />
    </div>
  );
}
