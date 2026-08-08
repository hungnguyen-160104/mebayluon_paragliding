// lib/booking/spot-to-location.ts
/**
 * Ánh xạ slug trang điểm bay (/spots/<slug>) sang khoá điểm bay trong luồng
 * đặt bay, để nút "Đặt bay ngay tại <điểm>" mở /booking với điểm đã chọn sẵn.
 *
 * Điểm bay CHƯA mở đặt online (Phình Hồ/Trạm Tấu, Đà Lạt) cố ý không có
 * trong bảng — khi đó trang đặt bay để trống điểm bay, khách tự chọn, thay
 * vì chọn nhầm sang điểm khác.
 */

import type {
  LocationKey,
  FlightTypeKey,
} from "@/lib/booking/calculate-price";

export const SPOT_TO_BOOKING_LOCATION: Record<string, LocationKey> = {
  "khau-pha": "khau_pha",
  "muong-hoa-sapa": "sapa",
  sapa: "sapa",
  "son-tra": "da_nang",
  "doi-bu": "ha_noi",
  "vien-nam": "ha_noi",
  "ha-giang": "quan_ba",
  // tram-tau, dalat: chưa mở đặt online -> để khách tự chọn
};

/** Khoá điểm bay tương ứng, hoặc null nếu điểm bay chưa mở đặt online. */
export function bookingLocationForSpot(slug: string): LocationKey | null {
  return SPOT_TO_BOOKING_LOCATION[slug] ?? null;
}

/**
 * Link nút "Đặt bay ngay tại ...".
 * Có ánh xạ -> /booking?spot=<khoá>; không có -> /booking (chưa chọn điểm).
 */
export function bookingHrefForSpot(slug: string): string {
  const key = bookingLocationForSpot(slug);
  return key ? `/booking?spot=${key}` : "/booking";
}

/**
 * Link đặt bay chọn sẵn CẢ điểm bay lẫn loại hình bay — dùng cho nút "Đặt bay
 * ngay" ở trang /ppg, để khách khỏi phải tự chọn lại Khau Phạ rồi bấm tiếp
 * "dù lượn gắn động cơ".
 */
export function bookingHrefForFlightType(
  slug: string,
  flightType: FlightTypeKey,
): string {
  const key = bookingLocationForSpot(slug);
  return key
    ? `/booking?spot=${key}&type=${flightType}`
    : `/booking?type=${flightType}`;
}

/**
 * Chiều ngược lại: từ khoá điểm bay trong booking suy ra trang giới thiệu
 * điểm bay, để vé và email dẫn khách "xem thêm thông tin về điểm bay X".
 *
 * Hà Nội có hai bãi (Đồi Bù và Viên Nam) dùng chung một khoá booking; chọn
 * /spots/doi-bu vì đó là trang mô tả cả cụm.
 */
const BOOKING_LOCATION_TO_SPOT: Record<string, string> = {
  khau_pha: "khau-pha",
  sapa: "muong-hoa-sapa",
  da_nang: "son-tra",
  ha_noi: "doi-bu",
  quan_ba: "ha-giang",
  tram_tau: "tram-tau",
};

/**
 * Đường dẫn trang giới thiệu ứng với chuyến bay đã đặt.
 *
 * Bay dù máy ở Khau Phạ thì trỏ về /ppg — trang đó mới nói về dù lượn gắn
 * động cơ, còn /spots/khau-pha là trang dù lượn thường.
 * Không có ánh xạ thì trả null để nơi gọi tự ẩn link đi.
 */
export function spotPageForBooking(
  location?: string,
  flightTypeKey?: string,
): string | null {
  if (location === "khau_pha" && flightTypeKey === "paramotor") return "/ppg";

  const slug = BOOKING_LOCATION_TO_SPOT[String(location || "")];
  return slug ? `/spots/${slug}` : null;
}
