// app/spots/[slug]/page.tsx
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpotDetailClient } from "./spot-detail-client";
import { SpotGoogleReview } from "@/components/reviews/SpotGoogleReview";

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
  duration: string;
  landingPoint: string;
  basePrice: number;
  image: string;           // Ảnh Hero
  galleryImages: string[]; // Mảng ảnh Gallery
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
      "Bay trên thung lũng Mường Hoa huyền ảo, ngắm ruộng bậc thang và dãy Hoàng Liên trong biển mây.",
    landscape: "Mây luồn – ruộng bậc thang – Fansipan",
    duration: "10 – 20 phút",
    landingPoint: "Thung lũng Mường Hoa",
    basePrice: 2190000,
    image: "/spots/muong-hoa-sapa/hero.jpg",
    galleryImages: [
      "/spots/muong-hoa-sapa/gallery-1.jpg",
      "/spots/muong-hoa-sapa/gallery-2.jpg",
      "/spots/muong-hoa-sapa/gallery-3.jpg",
      "/spots/muong-hoa-sapa/gallery-4.jpg",
      "/spots/muong-hoa-sapa/gallery-5.jpg",
      "/spots/muong-hoa-sapa/gallery-6.jpg",
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
    altitude: "300 – 700 m",
    description:
      "Hướng vịnh Đà Nẵng với gió biển ổn định, nhìn toàn cảnh thành phố và bãi biển.",
    landscape: "Bán đảo – đại dương – vịnh Đà Nẵng",
    duration: "8 – 15 phút",
    landingPoint: "Khu ven biển Sơn Trà",
    basePrice: 1790000,
    image: "/spots/son-tra/hero.jpg",
    galleryImages: [
      "/spots/son-tra/gallery-1.jpg",
      "/spots/son-tra/gallery-2.jpg",
      "/spots/son-tra/gallery-3.jpg",
      "/spots/son-tra/gallery-4.jpg",
      "/spots/son-tra/gallery-5.jpg",
      "/spots/son-tra/gallery-6.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 1790000,
        description: "Trọn gói cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "khau-pha": {
    name: "Đèo Khau Phạ",
    title: "Bay Trên Tứ Đại Đỉnh Đèo",
    altitude: "1.200 – 1.500 m",
    description:
      "Một trong những cung đèo đẹp nhất Việt Nam, đặc biệt rực rỡ mùa lúa chín.",
    landscape: "Đèo cao – thung lũng – mùa vàng",
    duration: "10 – 20 phút",
    landingPoint: "Thung lũng dưới chân đèo",
    basePrice: 2190000,
    image: "/spots/khau-pha/hero.jpg",
    galleryImages: [
      "/spots/khau-pha/gallery-1.jpg",
      "/spots/khau-pha/gallery-2.jpg",
      "/spots/khau-pha/gallery-3.jpg",
      "/spots/khau-pha/gallery-4.jpg",
      "/spots/khau-pha/gallery-5.jpg",
      "/spots/khau-pha/gallery-6.jpg",
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
      "Không khí trong lành, cảnh quan núi non hùng vĩ, rất hợp săn mây.",
    landscape: "Săn mây – núi rừng – thung lũng",
    duration: "8 – 15 phút",
    landingPoint: "Bãi hạ cánh Trạm Tấu",
    basePrice: 2000000,
    image: "/spots/tram-tau/hero.jpg",
    galleryImages: [
      "/spots/tram-tau/gallery-1.jpg",
      "/spots/tram-tau/gallery-2.jpg",
      "/spots/tram-tau/gallery-3.jpg",
      "/spots/tram-tau/gallery-4.jpg",
      "/spots/tram-tau/gallery-5.jpg",
      "/spots/tram-tau/gallery-6.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 2000000,
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
      "Phù hợp luyện tập, di chuyển thuận tiện từ trung tâm Hà Nội.",
    landscape: "Đồi núi – gần Hà Nội",
    duration: "7 – 12 phút",
    landingPoint: "Chân đồi Viên Nam",
    basePrice: 1690000,
    image: "/spots/vien-nam/hero.jpg",
    galleryImages: [
      "/spots/vien-nam/gallery-1.jpg",
      "/spots/vien-nam/gallery-2.jpg",
      "/spots/vien-nam/gallery-3.jpg",
      "/spots/vien-nam/gallery-4.jpg",
      "/spots/vien-nam/gallery-5.jpg",
      "/spots/vien-nam/gallery-6.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 1690000,
        description: "Trải nghiệm cơ bản",
        features: ["Phi công kinh nghiệm", "Ảnh chụp nhanh"],
      },
    ]),
  },

  "doi-bu": {
    name: "Đồi Bù",
    title: "Điểm Bay Phổ Biến Cuối Tuần",
    altitude: "300 – 600 m",
    description:
      "Gần Hà Nội, dễ tiếp cận, phù hợp cho người mới trải nghiệm.",
    landscape: "Đồi núi – thuận tiện – dễ tiếp cận",
    duration: "7 – 12 phút",
    landingPoint: "Bãi hạ cánh Đồi Bù",
    basePrice: 1690000,
    image: "/spots/doi-bu/hero.jpg",
    galleryImages: [
      "/spots/doi-bu/gallery-1.jpg",
      "/spots/doi-bu/gallery-2.jpg",
      "/spots/doi-bu/gallery-3.jpg",
      "/spots/doi-bu/gallery-4.jpg",
      "/spots/doi-bu/gallery-5.jpg",
      "/spots/doi-bu/gallery-6.jpg",
    ],
    packages: filterPackages([
      {
        name: "Tiêu chuẩn",
        price: 1690000,
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
    image: "/sapa-fansipan-mountains-clouds-aerial-view-vietnam.jpg",
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
    galleryImages: ["/spots/dalat/gallery-1.jpg", "/spots/dalat/gallery-2.jpg"],
    packages: filterPackages([
      {
        name: "Gói cơ bản",
        price: 2290000,
        description: "Chỉ bay",
        features: ["10–20 phút", "Phi công chuyên nghiệp", "Bảo hiểm", "Brief an toàn"],
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

export default function SpotDetailPage({ params }: { params: { slug: string } }) {
  const spot = SPOTS[params.slug];

  if (!spot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy điểm bay</h1>
          <Button asChild>
            <Link href="/#flying-spots">Quay về danh sách điểm bay</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Nhận diện 2 trang cần hiện badge nổi cố định
  const isSapa = params.slug === "muong-hoa-sapa" || params.slug === "sapa" || /sapa/.test(params.slug);
  const isKhauPha = params.slug === "khau-pha" || /khau-pha/.test(params.slug);

  return (
    <div className="min-h-screen">
      <Navigation />
      <SpotDetailClient spot={spot as SpotData} />

      {/* ===== Badge Google Reviews (nổi cố định) chỉ cho Sapa & Khau Phạ ===== */}
      {isSapa && <SpotGoogleReview spot="sapa" variant="floating" position="br" />}
      {isKhauPha && <SpotGoogleReview spot="khau-pha" variant="floating" position="br" />}

      {/* KHÔNG RENDER FOOTER Ở ĐÂY */}
    </div>
  );
}
