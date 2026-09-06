// lib/internal-paths.ts
/**
 * ĐƯỜNG DẪN KHU NỘI BỘ — nơi KHÔNG bày giao diện dành cho khách.
 *
 * Thanh menu khách (`fixed top-0`, cao 80px) và cụm nút Zalo/chatbot (nổi góc
 * dưới phải) đều render ở app/layout.tsx cho MỌI route. Trang nội bộ nào quên
 * mặt trong danh sách này là bị chúng đè lên: menu che chữ đầu trang, nút nổi
 * che đúng nút bấm quan trọng nhất ở góc dưới.
 *
 * Gom vào một chỗ vì đã dính đúng lỗi đó: máy bán quầy cafe dọn từ
 * /baocao/cafe sang /cafe (06/09) là rơi ngay ra ngoài luật, trong khi hai
 * component kiểm tra riêng rẽ nên sửa một chỗ vẫn sót chỗ kia.
 */
export const INTERNAL_PATH_PREFIXES = ["/baocao", "/cafe"] as const;

export function isInternalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return INTERNAL_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
