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
 * Phần "/[1.15]" là chiều cao dòng, BẮT BUỘC phải có. Cỡ chữ tuỳ chỉnh dạng
 * text-[...] chỉ đặt font-size chứ không kèm chiều cao dòng như text-3xl hay
 * text-4xl. Thiếu nó thì dòng thừa kế chiều cao 1.5 của trang, khung chữ cao
 * hơn con chữ khoảng 7px mỗi bên — nhìn ra thành khoảng hở dư giữa tiêu đề và
 * câu dẫn ngay dưới, và chỉ hở trên điện thoại vì từ 640px trở lên các mốc
 * sm:/md: đã tự mang chiều cao dòng riêng.
 *
 * Trang chi tiết điểm bay có thang riêng, nhỏ hơn một bậc — xem
 * components/spots/section-heading.ts.
 */
export const HOME_SECTION_HEADING =
  "text-hero-shadow font-serif text-[1.75rem]/[1.15] font-bold text-white sm:text-4xl md:text-5xl";
