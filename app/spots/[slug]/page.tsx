import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import Link from "@/components/locale-link";
import { SpotDetailClient } from "./spot-detail-client";
import { SpotReviewBadges } from "@/components/reviews/SpotReviewBadges";
import { getSpotReview } from "@/lib/google-reviews";
import { getSpotTripadvisorUrl } from "@/lib/spot-partner-links";
import { getTripadvisorReview } from "@/lib/tripadvisor-reviews";
import {
  buildMetadata,
  generateSpotSchema,
  generateProductSchema,
  generateBreadcrumbSchema,
  generateBranchSchema,
} from "@/lib/metadata-builder";
import { notFound } from "next/navigation";
import { branchesForSpot } from "@/lib/legal-entity";
import { diemThoiTietTheoSlug } from "@/lib/weather-spots";
import { localizedUrl, type Locale } from "@/lib/site-config";
import { canonicalSpotSlug } from "@/lib/spots-slugs";
import { spotSeoMeta } from "@/lib/spot-meta";
import { getSpotTranslation, type SpotLanguage } from "@/lib/i18n/spots";
import { getRequestLang, getUrlLocale } from "@/lib/locale";
import {
  SPOT_ARTICLES,
  SPOT_ARTICLES_HEADING,
  SPOT_ARTICLE_NAMES,
  SPOT_HUB_GROUP_LABELS,
  SPOT_HUB_MORE_LABEL,
} from "@/lib/spot-articles";
import { getSpotHub } from "@/lib/spot-hub";
import { ArrowRight, BookOpen, Star } from "lucide-react";
import { SPOT_SECTION_HEADING } from "@/components/spots/section-heading";

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
    name: "Sapa (Lao Chải - Tả Van)",
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

📸 DỊCH VỤ TÙY CHỌN:
🚁 Quay Flycam/Drone và Quay camera 360°
🚐 Đón trả 2 chiều từ khách sạn

📌 THÔNG TIN THÊM:
🎥 Miễn phí ảnh/video bay dù từ GoPro
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

📸 DỊCH VỤ TÙY CHỌN:
🚁 Quay Flycam/Drone và Quay camera 360°
🚐 Đón trả 2 chiều từ khách sạn
🌅 Bay bình minh (06:00–07:00) / bay hoàng hôn (16:00–17:00) ngày nắng: +700.000đ/khách — dù lượn bay 9–15 phút, dù lượn gắn động cơ bay 20–25 phút
☁️ Bay săn mây cao khoảng 2.000m (chỉ dù lượn gắn động cơ, 20–25 phút): +700.000đ/khách
⏱️ Bay lâu 20–25 phút (tuỳ điều kiện): +700.000đ/khách, miễn phí khi đã chọn bình minh, hoàng hôn hoặc săn mây; dù lượn đa số chỉ bay lâu được vào khung giờ trưa
↩️ Không thực hiện được chuyến bay đặc biệt (bình minh không có nắng, mây che hoàng hôn, gió yếu không bay lâu được) thì hoàn phụ phí sau chuyến bay, chuyến bay trở thành chuyến bay cơ bản

📌 THÔNG TIN THÊM:
🎥 Miễn phí ảnh/video bay dù từ GoPro
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

📸 DỊCH VỤ TÙY CHỌN:
🚁 Quay Flycam/Drone và Quay camera 360°
🚐 Đón trả 2 chiều từ khách sạn

📌 THÔNG TIN THÊM:
🎥 Miễn phí ảnh/video bay dù từ GoPro
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
    name: "Quản Bạ - Hà Giang",
    title: "Bay Trên Cao Nguyên Đá - Cổng Trời Hà Giang",
    altitude: "950 – 2.000 m",
    description:
      `Bay dù lượn tại QUẢN BẠ – cửa ngõ Cao nguyên đá Đồng Văn. Cất cánh ở độ cao 950 m, lượn trên toàn cảnh thung lũng Quản Bạ, ngắm Núi Đôi Quản Bạ, Cổng Trời, thung lũng Lùng Tám và dòng sông Miện uốn quanh chân núi.

🎉 KHAI TRƯƠNG 15/10/2026 — Mebayluon vận hành

📦 GÓI DỊCH VỤ BAO GỒM:
✅ Đón trả 2 chiều trong khu vực Quản Bạ (Nậm Đăm, xã Quản Bạ – thị trấn Tam Sơn cũ, Lùng Tám, Cán Tỉ)
✅ Chứng nhận tham gia
✅ Nước uống, quà lưu niệm
✅ Ảnh & video GoPro toàn bộ chuyến bay (do chúng tôi cung cấp)
✅ Bảo hiểm
✅ Phi công chuyên nghiệp & trang thiết bị an toàn

🪂 DÙ LƯỢN (PG) — từ 2.290.000 đ/khách
+ Bay đôi cùng phi công, 9–15 phút tuỳ điều kiện gió
+ Gói săn hoàng hôn: 2.990.000 đ/khách, bay 9–15 phút tuỳ điều kiện gió
+ Cất cánh sườn núi ở 950 m, hạ cánh tại thung lũng Quản Bạ

🚁 DÙ LƯỢN CÓ ĐỘNG CƠ (PPG) — từ 2.490.000 đ/khách
+ Gói cơ bản: bay 15 phút
+ Gói nâng cao: 22–25 phút, bay săn mây — bình minh / hoàng hôn — 3.390.000 đ/khách
+ Cất cánh ngay tại thung lũng, leo cao hàng ngàn mét ngắm toàn cảnh

📸 DỊCH VỤ TÙY CHỌN:
🚁 Quay Flycam/Drone và Quay camera 360°

🚌 TỪ HÀ NỘI ĐI QUẢN BẠ
+ Hà Nội – TP Hà Giang khoảng 300 km. Xe giường nằm chạy đêm mất chừng 6–7 tiếng, sáng sớm tới nơi là kịp lên Quản Bạ bay buổi sáng.
+ Tự lái ô tô hoặc xe máy: theo QL2 lên TP Hà Giang, rồi thêm khoảng 45 km theo QL4C là tới Quản Bạ.
+ Từ TP Hà Giang: xe của đội bay 500.000 đ/xe 4 chỗ/chiều. Đã ở trong khu vực Quản Bạ thì đội bay đón trả miễn phí.

🗓️ LỊCH TRÌNH GỢI Ý
+ Đi nhanh 1 ngày từ TP Hà Giang: sáng lên Quản Bạ bay, ăn trưa ở Tam Sơn, chiều về thành phố.
+ Hà Giang Loop 3 ngày 2 đêm: ngày 1 bay ở Quản Bạ rồi đi tiếp Yên Minh – Đồng Văn; ngày 2 Mã Pí Lèng, sông Nho Quế, Mèo Vạc; ngày 3 vòng về TP Hà Giang.
+ Mẹo: nên bay ngay buổi đầu tới Quản Bạ, nếu gió chưa đẹp vẫn còn buổi dự phòng.

🌸 MÙA ĐẸP & DỊP LỄ
+ Tháng 10–11: hoa tam giác mạch, trời khô và trong — mùa đông khách nhất.
+ Tháng 12–3: trời lạnh, sáng sớm hay có biển mây, hợp gói paramotor săn mây; tháng 1–3 hoa đào, hoa mận nở khắp cao nguyên.
+ Cuối tuần tháng 10–11 và các dịp Tết Dương lịch, 30/4 – 1/5, 2/9 rất đông: nên đặt trước vài ngày để giữ giờ bay đẹp.

📌 THÔNG TIN THÊM:
🔄 Miễn phí đổi/hủy lịch do thời tiết
💳 Thanh toán tiền mặt (tại điểm bay) hoặc chuyển khoản
🌤️ Chuyến bay đặc biệt (săn mây, bình minh, hoàng hôn, bay lâu) nếu điều kiện không cho phép sẽ chuyển thành chuyến bay PG/PPG cơ bản

⏰ Mở cửa 6:30 – 18:30 hàng ngày

📱 ĐẶT NHANH: đặt online ngay trên trang này hoặc nhắn Zalo / gọi 0964 073 555 — không cần đặt cọc, thanh toán khi tới điểm bay.`,
    landscape: "Cao Nguyên Đá – Núi Đôi Quản Bạ – Cổng Trời – sông Miện",
    duration: "9 – 25 phút",
    landingPoint: "Thung lũng Quản Bạ (cũng là bãi cất PPG)",
    basePrice: 2290000,
    // Ảnh nền riêng của Quản Bạ do chủ chọn 25/09/2026: dù lượn trên thung lũng sông (ảnh điện thoại 912×1620, dọc).
    image: "/spots/ha-giang/quan-ba-nen.jpg",
    galleryImages: [
      // Ảnh bay thật của Mebayluon tại Quản Bạ (GoPro, thư mục Drive "Bay Quản Bạ - Hà Giang", 25/09/2026)
      "/spots/ha-giang/quan-ba-hero.jpg",
      "/spots/ha-giang/quan-ba-ppg-co-do.jpg",
      "/spots/ha-giang/quan-ba-thung-lung.jpg",
      "/spots/ha-giang/quan-ba-ppg-tren-song.jpg",
      "/spots/ha-giang/quan-ba-thung-lung-doc.jpg",
      "/spots/ha-giang/quan-ba-ppg-nang.jpg",
    ],
    storyImages: [
      "/spots/ha-giang/quan-ba-canh-du.jpg",
      "/spots/ha-giang/quan-ba-thung-lung-doc.jpg",
      "/spots/ha-giang/quan-ba-ppg-tren-song.jpg",
    ],
    packages: filterPackages([
      {
        name: "Dù lượn (PG)",
        price: 2290000,
        description: "Bay đôi 9–15 phút, cất cánh 950 m",
        features: [
          "Đón trả 2 chiều trong khu vực Quản Bạ",
          "Phi công kinh nghiệm & trang bị an toàn",
          "Ảnh & video GoPro toàn chuyến bay",
          "Bảo hiểm · chứng nhận tham gia",
        ],
      },
      {
        name: "Dù lượn (PG) — săn hoàng hôn",
        price: 2990000,
        description: "Bay đôi 9–15 phút tuỳ gió, khung giờ hoàng hôn",
        features: [
          "Đón trả 2 chiều trong khu vực Quản Bạ",
          "Không đủ điều kiện bay hoàng hôn thì chuyển thành bay PG cơ bản",
          "Ảnh & video GoPro toàn chuyến bay",
          "Bảo hiểm · chứng nhận tham gia",
        ],
      },
      {
        name: "Dù lượn có động cơ (PPG) — cơ bản",
        price: 2490000,
        description: "Bay 15 phút, cất cánh từ thung lũng",
        features: [
          "Đón trả 2 chiều trong khu vực Quản Bạ",
          "Leo cao ngắm toàn cảnh thung lũng Quản Bạ",
          "Ảnh & video GoPro toàn chuyến bay",
          "Bảo hiểm · chứng nhận tham gia",
        ],
      },
      {
        name: "PPG bay lâu — săn mây / bình minh / hoàng hôn",
        price: 3390000,
        description: "Bay 22–25 phút (gói cơ bản + 900.000 đ)",
        features: [
          "Bay 22–25 phút, săn mây",
          "Khung giờ bình minh hoặc hoàng hôn",
          "Đón trả 2 chiều trong khu vực Quản Bạ",
          "Ảnh & video GoPro toàn chuyến bay",
        ],
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

📸 DỊCH VỤ TÙY CHỌN:
🚁 Quay Flycam/Drone và Quay camera 360°
🚐 Đón trả 2 chiều từ khách sạn
🌅 Bay săn hoàng hôn

📌 THÔNG TIN THÊM:
🎥 Miễn phí ảnh/video bay dù từ GoPro
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
};

/* ============================================================
   3) GHÉP DỮ LIỆU
   ============================================================ */
const SPOTS: Record<string, SpotData> = Object.assign({}, BASE_SPOTS, ALIAS_SPOTS);

/**
 * Chữ trong JSON-LD theo ngôn ngữ URL (SEO 01/10/2026): trước đây /en/spots/…
 * khai TouristAttraction/Product/Breadcrumb bằng tiếng Việt ("Trang chủ",
 * "Tour trải nghiệm bay dù lượn tại …") và URL bản tiếng Việt.
 */
const SPOT_JSONLD_TEXT: Record<Locale, { home: string; spots: string; tour: (n: string) => string }> = {
  vi: { home: "Trang chủ", spots: "Điểm bay", tour: (n) => `Tour trải nghiệm bay dù lượn tại ${n}` },
  en: { home: "Home", spots: "Flying sites", tour: (n) => `Tandem paragliding tour at ${n}` },
  fr: { home: "Accueil", spots: "Sites de vol", tour: (n) => `Baptême de parapente biplace – ${n}` },
  ru: { home: "Главная", spots: "Места полётов", tour: (n) => `Тандемный полёт на параплане – ${n}` },
  zh: { home: "首页", spots: "飞行点", tour: (n) => `${n}双人滑翔伞体验` },
  hi: { home: "होम", spots: "उड़ान स्थल", tour: (n) => `${n} में टैंडम पैराग्लाइडिंग टूर` },
};

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
    // 404 THẬT (01/10/2026): layout không còn bọc trang trong <Suspense> nên
    // notFound() trả HTTP 404 trước khi HTML stream ra (app/not-found.tsx).
    notFound();
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
  const [sapaReview, khauPhaReview, taReview] = await Promise.all([
    isSapa ? getSpotReview("sapa") : Promise.resolve({ rating: 0, reviews: null, live: false }),
    isKhauPha ? getSpotReview("khau-pha") : Promise.resolve({ rating: 0, reviews: null, live: false }),
    // Điểm Tripadvisor: lấy sống khi có TRIPADVISOR_API_KEY, không thì số gõ tay
    getTripadvisorReview(canonicalSpotSlug(slug)),
  ]);
  const heading =
    SPOT_ARTICLES_HEADING[spotLocale] ?? SPOT_ARTICLES_HEADING.vi;

  // Mục "Cẩm nang & bài viết": gom từ DB theo trường `spots` (lib/spot-hub.ts).
  // Không có bài / DB lỗi thì rơi về danh sách tĩnh SPOT_ARTICLES như trước.
  const hub = await getSpotHub(canonicalSpotSlug(slug), spotLocale);
  const groupLabels = SPOT_HUB_GROUP_LABELS[spotLocale] ?? SPOT_HUB_GROUP_LABELS.vi;
  const moreLabel = SPOT_HUB_MORE_LABEL[spotLocale] ?? SPOT_HUB_MORE_LABEL.vi;
  /** Mỗi nhóm hiện sẵn bấy nhiêu bài; phần còn lại nằm trong <details> (link vẫn có trong HTML). */
  const HUB_VISIBLE = 4;

  /* ===== JSON-LD: TouristAttraction + Product (giá tour) + Breadcrumb =====
   * Giúp Google hiển thị rich result (giá, breadcrumb) trên kết quả tìm kiếm.
   * Alias (vd /spots/sapa) dùng URL chuẩn để gộp tín hiệu về một trang.
   */
  const canonicalSlug = canonicalSpotSlug(slug);
  /** JSON-LD theo ngôn ngữ URL (canonical/hreflang cũng theo URL). */
  const urlLocale = await getUrlLocale();
  const spotUrl = localizedUrl(`/spots/${canonicalSlug}`, urlLocale);
  const ldText = SPOT_JSONLD_TEXT[urlLocale];
  const localName = SPOT_ARTICLE_NAMES[canonicalSlug]?.[urlLocale] ?? spot.name;
  const seoMeta = spotSeoMeta(canonicalSlug, urlLocale, spot.name, spot.basePrice);
  const geo = diemThoiTietTheoSlug(canonicalSlug);

  const spotSchema = generateSpotSchema({
    name: localName,
    description: urlLocale === "vi" ? spot.landscape : seoMeta.description,
    image: spot.image,
    url: spotUrl,
    latitude: geo?.lat,
    longitude: geo?.lon,
    inLanguage: urlLocale,
  });

  const productSchema = generateProductSchema({
    name: ldText.tour(localName),
    description: urlLocale === "vi" ? spotMetaDescription(spot) : seoMeta.description,
    image: spot.image,
    price: spot.basePrice,
    currency: "VND",
    url: spotUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: ldText.home, url: localizedUrl("/", urlLocale) },
    { name: ldText.spots, url: localizedUrl("/spots", urlLocale) },
    { name: localName, url: spotUrl },
  ]);

  /**
   * LocalBusiness của chi nhánh phục vụ điểm bay này (lib/legal-entity.ts):
   * Đồi Bù = trụ sở + chi nhánh Phú Thọ (Viên Nam), Khau Phạ = chi nhánh Tây
   * Bắc (Clubhouse Tú Lệ), Sa Pa, Quản Bạ. Sơn Trà / Trạm Tấu không có chi
   * nhánh nên không khai.
   */
  const branchSchemas = branchesForSpot(canonicalSlug).map((b) =>
    generateBranchSchema(b, { locale: urlLocale, image: spot.image }),
  );

  const serializeJsonLd = (data: unknown) =>
    JSON.stringify(data).replace(/</g, "\\u003c");


  /** Thẻ một bài trong mục "Cẩm nang & bài viết". */
  const hubCard = (item: { slug: string; href: string; title: string }) => (
    <Link
      key={item.slug}
      href={item.href}
      className="group flex items-center gap-3 rounded-xl border border-white/20 bg-black/20 p-4 text-white backdrop-blur-lg transition-all hover:border-accent/70 hover:bg-black/35"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
        <BookOpen size={17} className="text-accent" />
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug [overflow-wrap:anywhere]">
        {item.title}
      </span>
      <ArrowRight
        size={18}
        className="shrink-0 text-white/50 transition-all group-hover:translate-x-1 group-hover:text-accent"
      />
    </Link>
  );

  /**
   * Section "Đọc thêm về điểm bay" — truyền vào SpotDetailClient qua slot
   * để đặt TRƯỚC mục "Khám phá thêm các điểm bay khác".
   */
  const articlesSection = hub || articleSet ? (
        <section className="relative z-10 py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 text-center text-white">
              <h2 className={SPOT_SECTION_HEADING}>
                {/* "\n" trong tiêu đề là chỗ ngắt dòng dành cho điện thoại —
                    xem chú thích ở SPOT_ARTICLES_HEADING. Từ 640px trở lên hai
                    mảnh nối lại thành một dòng như cũ. */}
                {heading.title
                  .replace(
                    "{name}",
                    SPOT_ARTICLE_NAMES[canonicalSpotSlug(slug)]?.[spotLocale] ??
                      spot.name,
                  )
                  .split("\n")
                  .map((part, i) => (
                    <span key={i} className="block sm:inline">
                      {i > 0 ? <span className="hidden sm:inline"> </span> : null}
                      {part}
                    </span>
                  ))}
              </h2>
              <p
                className="mt-2 text-slate-200"
                style={{ textShadow: "1px 1px 6px rgba(0,0,0,.7)" }}
              >
                {heading.subtitle}
              </p>
            </div>

            {hub ? (
              <>
                {hub.featured && (
                  <Link
                    href={hub.featured.href}
                    className="group mb-8 flex items-center gap-4 rounded-2xl border-2 border-accent/60 bg-black/30 p-5 text-white shadow-lg backdrop-blur-lg transition-all hover:border-accent hover:bg-black/40 hover:shadow-2xl sm:p-6"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/90">
                      <Star size={22} className="text-white" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold leading-snug sm:text-xl">
                        {hub.featured.title}
                      </span>
                    </span>
                    <ArrowRight
                      size={22}
                      className="shrink-0 text-accent transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                )}

                <div className="space-y-8">
                  {hub.groups.map((group) => (
                    <div key={group.key}>
                      <h3
                        className="mb-3 text-lg font-bold text-white sm:text-xl"
                        style={{ textShadow: "1px 1px 6px rgba(0,0,0,.7)" }}
                      >
                        {groupLabels[group.key]}
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        {group.items.slice(0, HUB_VISIBLE).map(hubCard)}
                      </div>
                      {group.items.length > HUB_VISIBLE && (
                        <details className="group/more mt-3">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/25 bg-black/25 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-black/40 group-open/more:hidden [&::-webkit-details-marker]:hidden">
                            {moreLabel(group.items.length - HUB_VISIBLE)}
                          </summary>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            {group.items.slice(HUB_VISIBLE).map(hubCard)}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : articleSet ? (
              <>
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
              </>
            ) : null}
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
      {branchSchemas.map((schema) => (
        <script
          key={String(schema["@id"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />
      ))}
      <Navigation />
      <SpotDetailClient
        spot={spot as SpotData}
        spotSlug={canonicalSpotSlug(slug)}
        articlesSlot={articlesSection}
      />


      {/* ===== Bong bóng đánh giá nổi: Google (Sapa & Khau Phạ) + Tripadvisor
           (điểm bay nào có hồ sơ thì hiện, không có thì tự ẩn) ===== */}
      <SpotReviewBadges
        googleSpot={isSapa ? "sapa" : isKhauPha ? "khau-pha" : null}
        rating={isSapa ? sapaReview.rating : khauPhaReview.rating}
        tripadvisorUrl={getSpotTripadvisorUrl(canonicalSpotSlug(slug))}
        tripadvisorRating={taReview.rating}
        lang={spotLocale}
      />

      {/* KHÔNG RENDER FOOTER Ở ĐÂY */}
    </div>
  );
}