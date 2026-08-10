// components/section-heading.ts
/**
 * Kiểu chữ dùng chung cho tiêu đề các mục trên TRANG CHỦ.
 *
 * Trước đây mỗi mục một kiểu: "Chuẩn bị trước khi bay" font-serif 28/36/48px,
 * "LIÊN HỆ VỚI CHÚNG TÔI" viết hoa toàn bộ 24/30/36px, "BÀI VIẾT MỚI NHẤT"
 * viết hoa toàn bộ font-sans extrabold 30/36px. Cuộn trang thấy ba kiểu chữ
 * khác nhau cho cùng một cấp tiêu đề.
 *
 * Cỡ 28px trên điện thoại chọn theo số đo (chỉ số phông Georgia Bold, màn
 * 375px còn 343px dùng được): tiêu đề dài nhất là "Chuẩn bị trước khi bay"
 * rộng 333px, vừa một dòng.
 *
 * Trang chi tiết điểm bay có thang riêng, nhỏ hơn một bậc — xem
 * components/spots/section-heading.ts.
 */
export const HOME_SECTION_HEADING =
  "text-hero-shadow font-serif text-[1.75rem] font-bold text-white sm:text-4xl md:text-5xl";
