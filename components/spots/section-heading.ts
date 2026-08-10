// components/spots/section-heading.ts
/**
 * Kiểu chữ dùng chung cho tiêu đề các mục trên trang chi tiết điểm bay.
 *
 * Năm mục nằm nối nhau — "Dù lượn <địa danh>", "Video toàn cảnh điểm bay",
 * "Khoảnh khắc tại đây", "Câu chuyện trải nghiệm", "Đọc thêm về Dù lượn
 * <địa danh>" — trước đây mỗi mục một kiểu: chỗ text-4xl cố định, chỗ
 * text-3xl md:text-4xl, chỗ có đổ bóng chỗ không, chỗ đổ bóng bằng style
 * nội tuyến. Cuộn dọc trang thấy chữ to nhỏ nhấp nhô, không ra một cấp.
 *
 * Gom về một hằng số để sửa một chỗ là cả năm mục cùng đổi.
 *
 * Cỡ chọn theo số đo thật (chỉ số phông Georgia Bold, màn 375px còn 343px
 * dùng được): ở 24px thì tiêu đề dài nhất — "Dù lượn Đồi Bù | Viên Nam" —
 * rộng 339px, vừa khít một dòng.
 *
 * LƯU Ý về cấp thẻ: "Dù lượn <địa danh>" vẫn phải là <h1> vì đó là tiêu đề
 * SEO duy nhất của trang, bốn mục còn lại là <h2>. Chỉ thống nhất phần NHÌN,
 * không hạ h1 xuống h2 — làm thế là mất tiêu đề chính trong mắt Google.
 */
export const SPOT_SECTION_HEADING =
  "text-hero-shadow font-serif text-2xl font-bold text-white sm:text-3xl md:text-4xl";

/**
 * Ba bậc chữ thân bài, dùng kèm SPOT_SECTION_HEADING để cả trang có một thang
 * cỡ chữ thay vì mỗi khối một con số.
 *
 * Trước đây cùng là "câu dẫn dưới tiêu đề" mà chỗ text-xl md:text-2xl, chỗ
 * text-[15px] sm:text-base md:text-lg — cuộn trang thấy chữ to nhỏ so le.
 *
 * KHÔNG áp cho khối "thông tin nhanh điểm bay" (độ cao, thời gian bay, danh
 * sách dịch vụ đi kèm): khối đó cố ý dùng chữ nhỏ hơn và viết hoa toàn bộ để
 * đọc lướt như bảng thông số, không phải chữ thân bài.
 */

/** Câu dẫn ngay dưới một tiêu đề mục. */
export const SPOT_LEAD = "text-base sm:text-lg md:text-xl";

/** Chữ thân bài thường. */
export const SPOT_BODY = "text-sm md:text-base";

/** Tiêu đề thẻ nhỏ nằm trong một mục — bậc dưới SPOT_SECTION_HEADING. */
export const SPOT_CARD_HEADING = "font-serif text-lg font-bold sm:text-xl";
