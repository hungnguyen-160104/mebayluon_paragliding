import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpotDetailClient } from "./spot-detail-client";
import { SpotGoogleReview } from "@/components/reviews/SpotGoogleReview";
import { getSpotReview } from "@/lib/google-reviews";
import {
  buildMetadata,
  generateSpotSchema,
  generateProductSchema,
  generateBreadcrumbSchema,
} from "@/lib/metadata-builder";
import { canonicalSpotSlug } from "@/lib/spots-slugs";
import { spotSeoMeta } from "@/lib/spot-meta";
import { getSpotTranslation, type SpotLanguage } from "@/lib/i18n/spots";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import {
  SPOT_ARTICLES,
  SPOT_ARTICLES_HEADING,
  SPOT_ARTICLE_NAMES,
} from "@/lib/spot-articles";
import { ArrowRight, BookOpen, Star } from "lucide-react";

/* ========= Types ========= */
type SpotPackage = {
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
};

type SpotData = {
  name: string;
  title: string;
  altitude: string;
  description: string;
  landscape: string;
  /** Cụm mô tả cảnh quan dùng riêng cho meta description (nếu khác landscape hiển thị trên trang). */
  metaLandscape?: string;
  duration: string;
  landingPoint: string;
  basePrice: number;
  image: string; // Ảnh Hero
  galleryImages: string[]; // Ảnh Gallery
  storyImages?: string[]; // Ảnh riêng cho phần Stories
  packages: SpotPackage[];
  googleReviewUrl?: string; // Link đánh giá Google (nếu có)
};

// Lọc bỏ các gói quay/chụp (nếu bạn không muốn hiển thị)
const filterPackages = (packages: SpotPackage[]) =>
  packages.filter(
    (pkg) =>
      !pkg.name.includes("GoPro") &&
      !pkg.name.includes("Flycam") &&
      !pkg.name.includes("Chụp ảnh Pro") &&
      !pkg.name.includes("VIP Video")
  );

/* ============================================================
   1) ĐIỂM BAY GỐC (BASE)
   ============================================================ */
const BASE_SPOTS: Record<string, SpotData> = {
  "muong-hoa-sapa": {
    name: "Mường Hoa (Sa Pa)",
    title: "Bay Trên Thung Lũng Mường Hoa",
    altitude: "1.500 – 2.000 m",
    description:
      `Khám phá Sapa từ một góc nhìn mới với Trải nghiệm dù lượn trên Thung lũng Mường Hoa. Chuyến bay đôi ly kỳ nhưng an toàn này hoàn hảo cho những người mới bắt đầu và những người tìm kiếm phiêu lưu. Cất cánh từ bản Hàng Đá, một trong những điểm cất cánh dù lượn cao nhất ở Việt Nam và lướt qua những thửa ruộng bậc thang mang tính biểu tượng của Thung lũng Mường Hoa, những ngôi làng mờ sương và phong cảnh núi non ngoạn mục. Chuyến bay kết thúc tại Làng Lao Chải, nơi bạn có thể khám phá văn hóa và ẩm thực H'mong địa phương.

📦 GÓI DỊCH VỤ BAO GỒM:
✅ Xe đưa đón khứ hồi (thị trấn Sapa, Lao Chải, Tả Van) - theo tuỳ chọn trên booking
✅ Chứng nhận tham gia
✅ Nước uống
✅ Ảnh & video GoPro toàn bộ chuyến bay (do chúng tôi cung cấp)
✅ Bảo hiểm
✅ Phi công chuyên nghiệp & trang thiết bị an toàn

📸 DỊCH VỤ TÙY CHỌN: Quay Flycam/Drone và Quay camera 360°

📌 THÔNG TIN THÊM:
🕒 Thời gian bay trải nghiệm: 10–15 phút (tùy điều kiện thời tiết phi công có thể bay lâu hơn)
⏳ Tổng hành trình từ lúc đón đến lúc trả khách: khoảng 90 phút
🔄 Miễn phí đổi/hủy lịch do thời tiết
💳 Thanh toán tiền mặt hoặc thẻ tín dụng (tại điểm bay)

⏰ Mở cửa từ 7:00 sáng – 18:00 hàng ngày

Vui lòng đặt trước để chúng tôi sắp xếp tốt nhất cho trải nghiệm dù lượn của bạn!`,
    landscape: "Mây luồn – ruộng bậc thang – Fansipan",
    duration: "10 – 15 phút",
    landingPoint: "Thung lũng Mường Hoa",
    basePrice: 2190000,
    image: "/spots/sapa/hero.jpg",
    galleryImages: [
      "/spots/sapa/1.jpg",
      "/spots/sapa/2.jpg",
      "/spots/sapa/3.jpg",
      "/spots/sapa/4.jpg",
      "/spots/sapa/5.jpg",
      "/spots/sapa/6.jpg",
    ],
    storyImages: [
      "/spots/sapa/so1.jpg",
      "/spots/sapa/so2.jpg",
      "/spots/sapa/so3.jpeg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2190000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
    googleReviewUrl:
      "https://www.google.com/maps/place/Sapa+Paragliding+-+%C4%90i%E1%BB%83m+C%E1%BA%A5t+c%C3%A1nh+D%C3%B9+L%C6%B0%E1%BB%A3n+Sapa/@22.3219262,103.8766636,918m/data=!3m1!1e3!4m8!3m7!1s0x36cd476f881a83e9:0x34a10d4a5bf8d07c!8m2!3d22.3219262!4d103.8766636!9m1!1b1!16s%2Fg%2F11x2s56ydh!17m2!4m1!1e3!18m1!1e1?entry=ttu",
  },

  "son-tra": {
    name: "Sơn Trà",
    title: "Lướt Trên Bán Đảo Sơn Trà",
    altitude: "600 – 800 m",
    description:
      "Hướng vịnh Đà Nẵng với gió biển ổn định, nhìn toàn cảnh thành phố và bãi biển.",
    landscape: "Bán đảo – đại dương – vịnh Đà Nẵng",
    duration: "8 – 15 phút",
    landingPoint: "Khu ven biển Sơn Trà",
    basePrice: 2190000,
    image: "/spots/da-nang/hero.jpg",
    galleryImages: [
      "/spots/da-nang/1.jpg",
      "/spots/da-nang/2.jpg",
      "/spots/da-nang/3.jpg",
      "/spots/da-nang/4.webp",
      "/spots/da-nang/5.JPG",
      "/spots/da-nang/6.jpeg",
    ],
    storyImages: [
      "/spots/da-nang/so1.jpg",
      "/spots/da-nang/so2.jpg",
      "/spots/da-nang/so3.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2190000,
        description: "Trọn gói cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "khau-pha": {
    name: "Đèo Khau Phạ",
    title: "Bay Trên Tứ Đại Đỉnh Đèo",
    altitude: "1.268 – 2.000 m",
    description:
      `Trải nghiệm bay dù lượn tại đèo Khau Phạ – một trong tứ đại đỉnh đèo hùng vĩ bậc nhất Việt Nam.
Mùa nước đổ (tháng 4–5): ruộng bậc thang óng ánh như những tấm gương trời
Mùa lúa xanh (tháng 6–7): sắc xanh mướt trải dài, đầy sức sống
Mùa lúa chín – mùa vàng (tháng 8–9): ruộng bậc thang nhuộm vàng rực rỡ, đẹp mê hoặc

📦 GÓI DỊCH VỤ BAO GỒM:
✅ Xe lên xuống núi (theo tuỳ chọn booking)
✅ Chứng nhận tham gia
✅ Nước uống, quà lưu niệm
✅ Ảnh & video GoPro toàn bộ chuyến bay (do chúng tôi cung cấp)
✅ Bảo hiểm
✅ Phi công chuyên nghiệp & trang thiết bị an toàn
✅ Miễn phí lưu trú không bao gồm tháng cao điểm và ngày lễ

📸 DỊCH VỤ TÙY CHỌN: Quay Flycam/Drone và Quay camera 360°

📌 THÔNG TIN THÊM:
🕒 Thời gian bay trải nghiệm:
+ Dù lượn: 10–15 phút (tùy điều kiện thời tiết phi công có thể bay lâu hơn)
+ Dù lượn gắn động cơ: 10–20 phút
⏳ Tổng hành trình khoảng 40~60 phút
🔄 Miễn phí đổi/hủy lịch do thời tiết
💳 Thanh toán tiền mặt (tại điểm bay)

⏰ Mở cửa từ 7:00 sáng – 18:00 hàng ngày

Vui lòng đặt trước để chúng tôi sắp xếp tốt nhất cho trải nghiệm dù lượn của bạn!`,
    landscape: "Đèo cao – thung lũng – mùa vàng",
    metaLandscape: "Hùng vĩ – ruộng bậc thang – mùa vàng",
    duration: "10 – 20 phút",
    landingPoint: "Thung lũng dưới chân đèo",
    basePrice: 2190000,
    image: "/spots/khau-pha/hero.jpg",
    galleryImages: [
      "/spots/khau-pha/1.jpg",
      "/spots/khau-pha/2.jpg",
      "/spots/khau-pha/3.jpg",
      "/spots/khau-pha/4.jpg",
      "/spots/khau-pha/5.JPG",
      "/spots/khau-pha/6.jpg",
    ],
    storyImages: [
      "/spots/khau-pha/so1.jpg",
      "/spots/khau-pha/so2.jpg",
      "/spots/khau-pha/so3.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2190000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
    googleReviewUrl:
      "https://www.google.com/maps/place/%C4%90i%E1%BB%83m+Bay+D%C3%B9+L%C6%B0%E1%BB%A3n+Khau+Ph%E1%BA%A1/@21.7549587,104.2655369,922m/data=!3m1!1e3!4m8!3m7!1s0x3132d88af2212c0d:0x40d25338c1dac102!8m2!3d21.7549587!4d104.2655369!9m1!1b1!16s%2Fg%2F11fyzcp8gc!17m2!4m1!1e3!18m1!1e1?entry=ttu",
  },

  "tram-tau": {
    name: "Trạm Tấu",
    title: "Săn Mây Trên Đồi Núi Trùng Điệp",
    altitude: "1.000 – 1.500 m",
    description:
      `Nằm ở xã Phình Hồ, huyện Trạm Tấu, tỉnh Yên Bái, cách trung tâm thành phố Yên Bái 80 km - thích hợp cho 1 chuyến đi dài cần dần chân nghỉ ngơi và tận hưởng bay dù lượn.

📦 GÓI DỊCH VỤ BAO GỒM:
✅ Xe lên núi
✅ Chứng nhận tham gia
✅ Nước uống, quà lưu niệm
✅ Ảnh & video GoPro toàn bộ chuyến bay (do chúng tôi cung cấp)
✅ Bảo hiểm
✅ Phi công chuyên nghiệp & trang thiết bị an toàn

📸 DỊCH VỤ TÙY CHỌN: Quay Flycam/Drone và Quay camera 360°

📌 THÔNG TIN THÊM:
🕒 Thời gian bay trải nghiệm: 10–15 phút (tùy điều kiện thời tiết phi công có thể bay lâu hơn)
⏳ Tổng hành trình khoảng 60~90 phút
🔄 Miễn phí đổi/hủy lịch do thời tiết
💳 Thanh toán tiền mặt (tại điểm bay)

⏰ Mở cửa từ 7:00 sáng – 18:00 hàng ngày

Vui lòng đặt trước để chúng tôi sắp xếp tốt nhất cho trải nghiệm dù lượn của bạn!`,
    landscape: "Săn mây – núi rừng – thung lũng",
    duration: "10 – 15 phút",
    landingPoint: "Bãi hạ cánh Trạm Tấu",
    basePrice: 2590000,
    image: "/spots/tram-tau/hero.jpg",
    galleryImages: [
      "/spots/tram-tau/1.JPG",
      "/spots/tram-tau/2.jpg",
      "/spots/tram-tau/3.JPG",
      "/spots/tram-tau/4.jpeg",
      "/spots/tram-tau/5.jpg",
      "/spots/tram-tau/6.jpg",
    ],
    storyImages: [
      "/spots/tram-tau/so1.JPG",
      "/spots/tram-tau/so2.jpeg",
      "/spots/tram-tau/so3.jpeg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2590000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "ha-giang": {
    name: "Hà Giang",
    title: "Bay Trên Cao Nguyên Đá Hà Giang",
    altitude: "1.000 – 1.200 m",
    description: "Ngắm nhìn cao nguyên đá Đồng Văn hùng vĩ từ trên cao. Trải nghiệm bay đôi cùng phi công chuyên nghiệp tại Quản Bạ, Hà Giang.",
    landscape: "Cao nguyên đá – núi non hùng vĩ",
    duration: "10 – 15 phút",
    landingPoint: "Thung lũng Quản Bạ",
    basePrice: 2190000,
    image: "/spots/ha-giang/hero.jpeg",
    galleryImages: [
      "/spots/ha-giang/1.jpeg",
      "/spots/ha-giang/2.jpeg",
      "/spots/ha-giang/3.jpeg",
      "/spots/ha-giang/4.jpg",
      "/spots/ha-giang/5.jpg",
      "/spots/ha-giang/6.jpg",
    ],
    storyImages: [
      "/spots/ha-giang/so1.jpeg",
      "/spots/ha-giang/so2.png",
      "/spots/ha-giang/so3.JPG",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2190000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "vien-nam": {
    name: "Viên Nam",
    title: "Điểm Bay Gần Hà Nội",
    altitude: "400 – 700 m",
    description:
      `Rời xa phố thị chật chội, tìm về vùng ngoại ô xanh mướt cỏ cây và sự yên bình hiếm có. Điểm bay gần Hà Nội sở hữu độ cao lý tưởng cùng điều kiện thời tiết ổn định, là lựa chọn hấp dẫn, thu hút đông đảo phi công trong và ngoài nước đến khám phá và chinh phục bầu trời.

📦 GÓI DỊCH VỤ BAO GỒM:
✅ Xe lên núi, Xe di chuyển từ Hà Nội tới điểm bay (Hành khách cũng có thể tự di chuyển tới điểm bay theo tuỳ chọn trên booking)
✅ Chứng nhận tham gia
✅ Nước uống, quà lưu niệm
✅ Ảnh & video GoPro toàn bộ chuyến bay (do chúng tôi cung cấp)
✅ Bảo hiểm
✅ Phi công chuyên nghiệp & trang thiết bị an toàn

📸 DỊCH VỤ TÙY CHỌN: Quay Flycam/Drone và Quay camera 360°

📌 THÔNG TIN THÊM:
🕒 Thời gian bay trải nghiệm: 10–15 phút (tùy điều kiện thời tiết phi công có thể bay lâu hơn)
⏳ Tổng hành trình khoảng 3~5 tiếng từ khi đón tới lúc quay về trung tâm Hà Nội
🔄 Miễn phí đổi/hủy lịch do thời tiết
💳 Thanh toán tiền mặt (tại điểm bay)

⏰ Mở cửa từ 7:00 sáng – 18:00 hàng ngày

📅 LỊCH TRÌNH:
08:00 – 08:30 | Đón khách tại khách sạn hoặc điểm hẹn
08:30 – 09:30 | Di chuyển đến điểm bay (núi Đồi Bù hoặc Viên Nam)
09:30 – 10:00 | Di chuyển lên đỉnh núi bằng xe van - Nhận trang thiết bị an toàn & hướng dẫn bay
10:00 – 12:00 | Bay lượn trên bầu trời tuyệt đẹp trong 10–20 phút cùng phi công
14:00 – 15:00 | Xe đưa quý khách về khách sạn hoặc điểm tập trung ban đầu

Vui lòng đặt trước để chúng tôi sắp xếp tốt nhất cho trải nghiệm dù lượn của bạn!`,
    landscape: "Đồi núi – gần Hà Nội",
    duration: "10 – 15 phút",
    landingPoint: "Chân đồi Viên Nam",
    basePrice: 1790000,
    image: "/spots/ha-noi/hero.jpg",
    galleryImages: [
      "/spots/ha-noi/1.jpg",
      "/spots/ha-noi/2.jpeg",
      "/spots/ha-noi/3.jpg",
      "/spots/ha-noi/4.jpg",
      "/spots/ha-noi/5.jpg",
      "/spots/ha-noi/6.jpeg",
    ],
    storyImages: [
      "/spots/ha-noi/so1.jpeg",
      "/spots/ha-noi/so2.jpeg",
      "/spots/ha-noi/so3.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 1790000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "doi-bu": {
    name: "Đồi Bù",
    title: "Điểm Bay Phổ Biến Cuối Tuần",
    altitude: "650m | 850m – 1.000m",
    description:
      "Gần Hà Nội, dễ tiếp cận, phù hợp cho người mới trải nghiệm.",
    landscape: "Đồi núi – thuận tiện – dễ tiếp cận",
    duration: "7 – 12 phút",
    landingPoint: "Bãi hạ cánh Đồi Bù",
    basePrice: 1790000,
    image: "/spots/ha-noi/hero.jpg",
    galleryImages: [
      "/spots/ha-noi/1.jpg",
      "/spots/ha-noi/2.jpeg",
      "/spots/ha-noi/3.jpg",
      "/spots/ha-noi/4.jpg",
      "/spots/ha-noi/5.jpg",
      "/spots/ha-noi/6.jpeg",
    ],
    storyImages: [
      "/spots/ha-noi/so1.jpeg",
      "/spots/ha-noi/so2.jpeg",
      "/spots/ha-noi/so3.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 1790000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },
};

/* ============================================================
   2) ALIAS (đường dẫn phụ trỏ về dữ liệu có sẵn)
   ============================================================ */
const ALIAS_SPOTS: Record<string, SpotData> = {
  sapa: {
    ...BASE_SPOTS["muong-hoa-sapa"],
  },
  dalat: {
    name: "Đà Lạt",
    title: "Chạm vào bầu trời mộng mơ",
    altitude: "1.400 m",
    description:
      "Bay giữa thành phố ngàn hoa, đón gió se lạnh và ngắm cảnh lãng mạn. Tà Nung – rừng thông – sương mù – hoa dã quỳ tạo nên khung cảnh tuyệt đẹp.",
    landscape: "Thung lũng Tà Nung – rừng thông – sương mù",
    duration: "10–20 phút",
    landingPoint: "Đồi Robin / Langbiang",
    basePrice: 2290000,
    image: "/dalat-city-pine-forests-aerial-view-vietnam.jpg",
    galleryImages: [],
    packages: filterPackages([
      {
        name: "Gói cơ bản",
        price: 2290000,
        description: "Chỉ bay",
        features: [
          "10–20 phút",
          "Phi công chuyên nghiệp",
          "Bảo hiểm",
          "Brief an toàn",
        ],
      },
    ]),
  },
};

/* ============================================================
   3) GHÉP DỮ LIỆU
   ============================================================ */
const SPOTS: Record<string, SpotData> = Object.assign({}, BASE_SPOTS, ALIAS_SPOTS);

/* ====== Pre-render ====== */
export function generateStaticParams() {
  return Object.keys(SPOTS).map((slug) => ({ slug }));
}

/* ====== SEO ======
 * Trước đây trang điểm bay không có metadata: thiếu title/description riêng
 * và thiếu canonical — /spots/sapa trùng nội dung /spots/muong-hoa-sapa nên
 * bị Google coi là duplicate. Canonical của alias trỏ về slug chuẩn để Google
 * gộp tín hiệu về một URL duy nhất.
 */
/**
 * Meta description gọn ~160 ký tự cho trang spot.
 *
 * KHÔNG dùng nguyên spot.description: đoạn đó dài hàng nghìn ký tự,
 * chứa emoji và xuống dòng — Google sẽ tự cắt tùy tiện, snippet xấu
 * và mất từ khóa quan trọng ở phần đầu.
 */
function spotMetaDescription(spot: SpotData): string {
  const price = spot.basePrice.toLocaleString("vi-VN");
  return `Đặt tour trải nghiệm bay dù lượn tại ${spot.name} — ${spot.metaLandscape ?? spot.landscape}. Bay ${spot.duration}, giá từ ${price}đ. Phi công chuyên nghiệp, bảo hiểm & video GoPro miễn phí.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spot = SPOTS[slug];

  if (!spot) {
    const t = getSpotTranslation((await getUrlLocale()) as SpotLanguage);
    return {
      title: `${t.spotDetail.notFoundTitle} | Mebayluon`,
      // xem chú thích ở app/blog/[slug]/page.tsx
      robots: { index: false, follow: false },
    };
  }

  const canonicalSlug = canonicalSpotSlug(slug);
  const locale = await getUrlLocale();

  // Tiêu đề + mô tả dịch theo ngôn ngữ URL — trước đây dùng chung một bản
  // tiếng Việt cho cả 6 ngôn ngữ (42 URL trùng thẻ meta).
  const seo = spotSeoMeta(canonicalSlug, locale, spot.name, spot.basePrice);

  return buildMetadata({
    title: seo.title,
    description: seo.description,
    image: spot.image,
    url: `/spots/${canonicalSlug}`,
    type: "website",
    locale,
    keywords: [
      `bay dù lượn ${spot.name}`,
      `dù lượn ${spot.name}`,
      `paragliding ${spot.name}`,
      "bay dù lượn",
      "Mebayluon",
    ],
  });
}

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spot = SPOTS[slug];

  /**
   * Điểm bay không tồn tại.
   *
   * Đã thử notFound() nhưng trang này render động (đọc cookie ngôn ngữ) và
   * Next stream HTML ra trước khi biết kết quả, nên mã trạng thái vẫn kẹt ở
   * 200 — chỉ được trang trắng, mất luôn nút quay lại. Vì vậy giữ trang lỗi
   * tự vẽ (có nội dung dịch + lối thoát cho khách) và dựa vào thẻ noindex
   * trong generateMetadata để Google không đưa vào kết quả tìm kiếm.
   */
  if (!spot) {
    const t = getSpotTranslation((await getRequestLang()) as SpotLanguage);

    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">{t.spotDetail.notFoundTitle}</h1>
          <Button asChild>
            <Link href="/spots">{t.spotDetail.backToList}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Nhận diện 2 trang cần hiện badge nổi cố định
  const isSapa = slug === "muong-hoa-sapa" || slug === "sapa" || /sapa/.test(slug);
  const isKhauPha = slug === "khau-pha" || /khau-pha/.test(slug);

  // Bài viết CTA cho điểm bay này (nếu có) + tiêu đề theo ngôn ngữ URL
  const articleSet = SPOT_ARTICLES[canonicalSpotSlug(slug)];
  // Ngôn ngữ HIỂN THỊ: URL có prefix thì theo URL, không thì theo cookie
  // (nút chuyển ngôn ngữ trên menu chỉ đổi cookie, không đổi URL) — dùng
  // getUrlLocale ở đây sẽ làm mục "Đọc thêm..." kẹt tiếng Việt khi khách
  // đổi ngôn ngữ bằng nút chuyển. Canonical/hreflang vẫn theo getUrlLocale.
  const spotLocale = await getRequestLang();

  // Tiêu đề bài: bản Việt cho khách Việt, bản Anh cho mọi ngôn ngữ khác
  // (bài trong DB chỉ có 2 bản — khách fr/ru/zh/hi bấm vào sẽ đọc bản Anh)
  const articleTitle = (article: { title: { vi: string; en: string } }) =>
    spotLocale === "vi" ? article.title.vi : article.title.en;

  // Điểm sao + số đánh giá lấy trực tiếp từ Google (cache 6 tiếng); nếu chưa
  // khai GOOGLE_PLACES_API_KEY thì tự rơi về số dự phòng trong lib.
  const [sapaReview, khauPhaReview] = await Promise.all([
    isSapa ? getSpotReview("sapa") : Promise.resolve({ rating: 0, reviews: null, live: false }),
    isKhauPha ? getSpotReview("khau-pha") : Promise.resolve({ rating: 0, reviews: null, live: false }),
  ]);
  const heading =
    SPOT_ARTICLES_HEADING[spotLocale] ?? SPOT_ARTICLES_HEADING.vi;

  /* ===== JSON-LD: TouristAttraction + Product (giá tour) + Breadcrumb =====
   * Giúp Google hiển thị rich result (giá, breadcrumb) trên kết quả tìm kiếm.
   * Alias (vd /spots/sapa) dùng URL chuẩn để gộp tín hiệu về một trang.
   */
  const spotUrl = `/spots/${canonicalSpotSlug(slug)}`;

  const spotSchema = generateSpotSchema({
    name: spot.name,
    description: spot.landscape,
    image: spot.image,
    url: spotUrl,
  });

  const productSchema = generateProductSchema({
    name: `Tour trải nghiệm bay dù lượn tại ${spot.name}`,
    description: spotMetaDescription(spot),
    image: spot.image,
    price: spot.basePrice,
    currency: "VND",
    url: spotUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: "/" },
    { name: "Điểm bay", url: "/spots" },
    { name: spot.name, url: spotUrl },
  ]);

  const serializeJsonLd = (data: unknown) =>
    JSON.stringify(data).replace(/</g, "\\u003c");


  /**
   * Section "Đọc thêm về điểm bay" — truyền vào SpotDetailClient qua slot
   * để đặt TRƯỚC mục "Khám phá thêm các điểm bay khác".
   */
  const articlesSection = articleSet ? (
        <section className="relative z-10 py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 text-center text-white">
              <h2
                className="font-serif text-3xl font-bold md:text-4xl"
                style={{ textShadow: "2px 2px 8px rgba(0,0,0,.7)" }}
              >
                {heading.title.replace(
                  "{name}",
                  SPOT_ARTICLE_NAMES[canonicalSpotSlug(slug)]?.[spotLocale] ??
                    spot.name,
                )}
              </h2>
              <p
                className="mt-2 text-slate-200"
                style={{ textShadow: "1px 1px 6px rgba(0,0,0,.7)" }}
              >
                {heading.subtitle}
              </p>
            </div>

            {/* Bài nổi bật */}
            <Link
              href={`/blog/${articleSet.featured.slug}`}
              className="group mb-6 flex items-center gap-4 rounded-2xl border-2 border-accent/60 bg-black/30 p-5 text-white shadow-lg backdrop-blur-lg transition-all hover:border-accent hover:bg-black/40 hover:shadow-2xl sm:p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/90">
                <Star size={22} className="text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-snug sm:text-xl">
                  {articleTitle(articleSet.featured)}
                </span>
              </span>
              <ArrowRight
                size={22}
                className="shrink-0 text-accent transition-transform group-hover:translate-x-1"
              />
            </Link>

            {/* Các bài liên quan */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {articleSet.articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/20 bg-black/20 p-4 text-white backdrop-blur-lg transition-all hover:border-accent/70 hover:bg-black/35"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <BookOpen size={17} className="text-accent" />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug">
                    {articleTitle(article)}
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-white/50 transition-all group-hover:translate-x-1 group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
) : null;

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(spotSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <Navigation />
      <SpotDetailClient
        spot={spot as SpotData}
        spotSlug={canonicalSpotSlug(slug)}
        articlesSlot={articlesSection}
      />


      {/* ===== Badge Google Reviews (nổi cố định) chỉ cho Sapa & Khau Phạ ===== */}
      {isSapa && (
        <SpotGoogleReview
          spot="sapa"
          rating={sapaReview.rating}
          reviews={sapaReview.reviews}
          lang={spotLocale}
          variant="floating"
          position="br"
        />
      )}
      {isKhauPha && (
        <SpotGoogleReview
          spot="khau-pha"
          rating={khauPhaReview.rating}
          reviews={khauPhaReview.reviews}
          lang={spotLocale}
          variant="floating"
          position="br"
        />
      )}

      {/* KHÔNG RENDER FOOTER Ở ĐÂY */}
    </div>
  );
}