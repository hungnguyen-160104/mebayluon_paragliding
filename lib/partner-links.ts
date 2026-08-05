// lib/partner-links.ts
/**
 * Các trang bán tour / đặt phòng của Mebayluon trên nền tảng đối tác.
 *
 * Một nguồn duy nhất cho cả hai chỗ dùng:
 *  - `sameAs` trong JSON-LD (ẩn, để Google nối các hồ sơ về cùng một doanh nghiệp)
 *  - khối "Đặt qua đối tác" hiển thị ở footer
 * Sửa link ở đây là cả hai nơi cùng đổi.
 *
 * THÊM LINK MỚI: chỉ cần thêm một dòng vào đúng mảng bên dưới. Nhớ dùng URL
 * sạch (bỏ tham số theo dõi kiểu ?visitor-id=...) và tránh khoá vùng trong
 * đường dẫn (klook.com/en-SG/... chỉ đúng cho khách Singapore).
 */

export type PartnerLink = {
  /** Tên nền tảng, hiện trên nút ở footer. */
  name: string;
  url: string;
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
  },
  {
    name: "Tripadvisor (Yên Bái)",
    url: "https://www.tripadvisor.com/Attraction_Review-g800616-d27969404-Reviews-Mebayluon_Paragliding-Yen_Bai_Yen_Bai_Province.html",
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
  },
  {
    name: "Klook",
    url: "https://www.klook.com/hotels/detail/1326956-club-house-mebayluon-paragliding/",
  },
  {
    name: "Facebook Clubhouse",
    url: "https://www.facebook.com/MBL.Clubhouse/",
  },
];

/** Gộp cho những chỗ cần hiện tất cả (footer). */
export const ALL_PARTNERS: PartnerLink[] = [
  ...PARAGLIDING_PARTNERS,
  ...HOMESTAY_PARTNERS,
];
