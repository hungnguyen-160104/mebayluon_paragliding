// lib/revalidate-content.ts
/**
 * Làm mới các trang tổng hợp khi bài viết / sản phẩm đổi (SEO 01/10/2026).
 *
 * app/sitemap.ts lưu đệm 1 giờ (`revalidate = 3600`). Gỡ đăng hay gộp bài thì
 * sitemap vẫn liệt kê URL cũ (đã 301) tới cả tiếng đồng hồ — đã xảy ra với 9
 * bài gộp ngày 01/10. Gọi hàm này sau mỗi lần tạo / sửa / đăng / gỡ / xoá để
 * sitemap dựng lại ngay ở lượt truy cập kế; mốc 1 giờ vẫn giữ làm lưới an toàn.
 *
 * Gọi ngoài vòng request của Next (script tsx chạy tay) thì revalidate ném lỗi
 * — nuốt đi, không được làm hỏng thao tác ghi DB vừa thành công.
 */
import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateContent(): void {
  try {
    revalidatePath("/sitemap.xml");
    // Bảng slug sản phẩm → URL cửa hàng (lib/product-links.ts)
    revalidateTag("posts");
  } catch {
    // ngoài Next (script) — bỏ qua
  }
}
