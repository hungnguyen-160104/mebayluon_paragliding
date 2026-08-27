// lib/partner-links.ts
/**
 * Các trang bán tour / đặt phòng của Mebayluon trên nền tảng đối tác.
 *
 * Một nguồn duy nhất cho hai chỗ dùng:
 *  - `sameAs` trong JSON-LD (ẩn, để Google nối các hồ sơ về cùng một doanh nghiệp)
 *  - khối "Xem chúng tôi trên" ở trang /homestay (chỉ HOMESTAY_PARTNERS)
 * Sửa link ở đây là cả hai nơi cùng đổi.
 *
 * Footer KHÔNG còn bày các link này — lý do ghi trong components/footer/Footer.tsx.
 *
 * THÊM LINK MỚI: chỉ cần thêm một dòng vào đúng mảng bên dưới. Nhớ dùng URL
 * sạch (bỏ tham số theo dõi kiểu ?visitor-id=...) và tránh khoá vùng trong
 * đường dẫn (klook.com/en-SG/... chỉ đúng cho khách Singapore).
 */

/**
 * Nền tảng đối tác — dùng để tô màu nút cho dễ nhận ra.
 * Thêm nền tảng mới thì nhớ khai thêm một dòng trong BRAND_BUTTON_CLASS.
 */
export type PartnerBrand =
  | "tripadvisor"
  | "klook"
  | "getyourguide"
  | "viator"
  | "kkday"
  | "seeksophie"
  | "booking"
  | "agoda"
  | "tripcom"
  | "google"
  | "facebook"
  | "sapa";

/**
 * Màu nút theo nhận diện của từng nền tảng. Trước đây mọi nút đối tác đều là
 * `bg-white/5` xám nhạt nên chìm hẳn vào nền footer; giờ mỗi nền tảng một màu
 * riêng để khách nhận ra logo quen thuộc ngay.
 */
export const BRAND_BUTTON_CLASS: Record<PartnerBrand, string> = {
  tripadvisor: "bg-[#34E0A1] text-[#00332B] hover:bg-[#57e8b4]",
  klook: "bg-[#FF5B00] text-white hover:bg-[#ff7a2e]",
  getyourguide: "bg-[#0F294D] text-white hover:bg-[#1c3f6e]",
  viator: "bg-[#0F766E] text-white hover:bg-[#159086]",
  kkday: "bg-[#F5A623] text-[#3A2600] hover:bg-[#f7b74c]",
  seeksophie: "bg-[#7C3AED] text-white hover:bg-[#9260f1]",
  booking: "bg-[#003580] text-white hover:bg-[#0a4ba6]",
  agoda: "bg-[#5C2D91] text-white hover:bg-[#7440b0]",
  tripcom: "bg-[#287DFA] text-white hover:bg-[#4d95fb]",
  google: "bg-white text-[#1A73E8] hover:bg-slate-100",
  facebook: "bg-[#1877F2] text-white hover:bg-[#3d90f5]",
  // Web Sapa Paragliding — công ty con, không phải OTA.
  sapa: "bg-[#0EA5E9] text-white hover:bg-[#38bdf8]",
};

export type PartnerLink = {
  /** Tên nền tảng, hiện trên nút ở footer. */
  name: string;
  url: string;
  /** Nhận diện nền tảng — quyết định màu nút. */
  brand: PartnerBrand;
};

/**
 * Hồ sơ của CÔNG TY DÙ LƯỢN. Chỉ đưa vào đây trang định danh chính doanh
 * nghiệp (hồ sơ nhà cung cấp), không đưa trang bán một tour lẻ — `sameAs`
 * dùng để nói "đây cũng là doanh nghiệp đó", một trang sản phẩm thì không.
 */
export const PARAGLIDING_PARTNERS: PartnerLink[] = [
  {
    name: "Tripadvisor (Hà Nội)",
    url: "https://www.tripadvisor.com/Attraction_Review-g293924-d27966587-Reviews-Mebayluon_Paragliding-Hanoi.html",
    brand: "tripadvisor",
  },
  {
    /**
     * CÙNG một hồ sơ (d27969404), chỉ đổi vùng: Yên Bái sáp nhập vào Lào Cai
     * nên Tripadvisor chuyển trang sang g737052. Giữ URL cũ thì Google phải đi
     * qua một lần chuyển hướng, mà `sameAs` nên trỏ thẳng đích đến.
     */
    name: "Tripadvisor (Lào Cai)",
    url: "https://www.tripadvisor.com/Attraction_Review-g737052-d27969404-Reviews-Mebayluon_Paragliding-Lao_Cai_Lao_Cai_Province.html",
    brand: "tripadvisor",
  },
  {
    // Trang nhà cung cấp trên Seek Sophie (không phải trang một tour lẻ).
    // Seek Sophie đã đổi /operators/ thành /hosts/; khai thẳng đích đến vì
    // `sameAs` nên trỏ URL cuối, đừng bắt Google đi qua một lần chuyển hướng.
    name: "Seek Sophie",
    url: "https://www.seeksophie.com/hosts/me-bay-luon-paragliding",
    brand: "seeksophie",
  },
];

/**
 * Hồ sơ của HOMESTAY CLUBHOUSE — thực thể khác với công ty dù lượn, nên khai
 * riêng ở schema LodgingBusiness của trang /homestay chứ không trộn vào
 * LocalBusiness chung.
 */
export const HOMESTAY_PARTNERS: PartnerLink[] = [
  {
    name: "Booking.com",
    url: "https://www.booking.com/hotel/vn/clubhouse-mebayluon-paragliding.html",
    brand: "booking",
  },
  {
    name: "Agoda",
    url: "https://www.agoda.com/clubhouse-mebayluon-paragliding/hotel/mu-cang-chai-vn.html",
    brand: "agoda",
  },
  {
    // Trip.com đã đổi slug sang mebayluon-paragliding-clubhouse.
    name: "Trip.com",
    url: "https://www.trip.com/hotels/cao-pha-hotel-detail-116617838/mebayluon-paragliding-clubhouse/",
    brand: "tripcom",
  },
  {
    name: "Klook",
    url: "https://www.klook.com/hotels/detail/1326956-club-house-mebayluon-paragliding/",
    brand: "klook",
  },
  {
    name: "Facebook Clubhouse",
    url: "https://www.facebook.com/mebayluonclubhouse",
    brand: "facebook",
  },
];

// Từng có ALL_PARTNERS gộp hai danh sách trên cho footer. Footer nay chỉ bày
// đúng danh sách chọn lọc bên dưới nên đã bỏ — hai thực thể này khác nhau,
// gộp lại chỉ đúng cho một chỗ hiển thị.

/**
 * Dải "đặt qua nơi uy tín" ở footer — danh sách CHỌN TAY, cố ý ngắn.
 *
 * Khách nước ngoài lần đầu biết tới mình thường ngại đặt thẳng trên một web
 * Việt Nam họ chưa nghe tên, nên vẫn cần vài chỗ quen thuộc để họ yên tâm.
 * Nhưng mỗi nút ở footer là nút nằm trên MỌI trang, và mỗi lượt đặt qua đó
 * mất 20–30% hoa hồng — nên chỉ giữ đúng vài cái đắt giá nhất, không bày cả
 * chục nền tảng như trước.
 *
 * Vì sao đúng những cái này:
 *  - Tripadvisor: trang ĐÁNH GIÁ, không phải chỗ bán tour, nên giữ được uy
 *    tín mà không kéo mất đơn. Đây là thứ phải giữ.
 *  - Klook Hà Nội và Klook Mù Cang Chải: hai điểm bay chủ lực, và Klook là
 *    cái tên khách châu Á nhận ra ngay.
 *  - Sapa: dẫn sang web của công ty con, không mất hoa hồng cho ai cả.
 *
 * Mọi link OTA khác đã gỡ khỏi site — xem chú thích trong Footer.tsx.
 */
export const TRUST_LINKS: PartnerLink[] = [
  {
    name: "Tripadvisor · Hà Nội",
    url: "https://www.tripadvisor.com/Attraction_Review-g293924-d27966587-Reviews-Mebayluon_Paragliding-Hanoi.html",
    brand: "tripadvisor",
  },
  {
    name: "Tripadvisor · Lào Cai",
    url: "https://www.tripadvisor.com/Attraction_Review-g737052-d27969404-Reviews-Mebayluon_Paragliding-Lao_Cai_Lao_Cai_Province.html",
    brand: "tripadvisor",
  },
  {
    name: "Klook · Hà Nội",
    url: "https://www.klook.com/activity/65949-paragliding-experience-in-ha-noi-city/",
    brand: "klook",
  },
  {
    name: "Klook · Mù Cang Chải",
    url: "https://www.klook.com/activity/76583-paragliding-experience-north-viet-nam/",
    brand: "klook",
  },
  {
    name: "Bay dù lượn Sapa",
    url: "https://www.paraglidingsapa.com",
    brand: "sapa",
  },
];
