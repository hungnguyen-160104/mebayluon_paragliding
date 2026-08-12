// lib/baobay/cookie.ts
/**
 * Tên cookie phiên báo bay, tách riêng thành một file chỉ có hằng số.
 *
 * middleware.ts chạy trong Edge runtime nên KHÔNG import được
 * lib/baobay/token.ts (file đó kéo theo jsonwebtoken, thư viện Node). Đặt hằng
 * số ở đây để cả hai bên dùng chung một chuỗi, khỏi gõ tay hai chỗ rồi lệch.
 */
export const BAOBAY_COOKIE = "mbl_baobay";
