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
