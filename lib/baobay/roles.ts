// lib/baobay/roles.ts
/**
 * Bốn nhóm nhân sự trong hệ thống báo bay (/baobay):
 *
 *  - pilot      : PHI CÔNG — số chuyến bay, mã vé đã bay, Camera360, chi tiêu
 *  - dispatcher : ĐIỀU PHỐI BAY — vé xuất/thu, tiền mặt, dịch vụ gia tăng, chi cho khách
 *  - cameraman  : CAMERA MAN — số chuyến bay flycam trong ngày
 *  - accountant : KẾ TOÁN TỔNG HỢP — chốt số tổng, duyệt lệch và chi tiêu
 *  - admin      : QUẢN TRỊ — bổ nhiệm, thêm bớt nhân sự, active/deactive, mật khẩu
 *
 * Mỗi người một tài khoản riêng (không dùng chung), vì bảng tổng hợp phải biết
 * dòng nào của ai để còn hỏi lại khi lệch số.
 *
 * Thứ tự trong mảng cũng là thứ tự hiện ở trang quản trị tài khoản.
 */

export const BAOBAY_ROLES = ["pilot", "dispatcher", "cameraman", "accountant", "admin"] as const;

export type BaobayRole = (typeof BAOBAY_ROLES)[number];

export const ROLE_LABEL: Record<BaobayRole, string> = {
  pilot: "Phi công",
  dispatcher: "Điều phối bay",
  cameraman: "Camera man",
  accountant: "Kế toán tổng hợp",
  admin: "Quản trị",
};

/**
 * Trang mặc định sau khi đăng nhập, theo vai trò.
 *
 * Kế toán vào thẳng "Chốt ngày" chứ không phải bảng tổng hợp: việc hằng ngày là
 * nhập số tổng và soát lệch, còn bảng tổng hợp là thứ xem theo kỳ.
 */
export const ROLE_HOME: Record<BaobayRole, string> = {
  pilot: "/baobay/phi-cong",
  dispatcher: "/baobay/dieu-phoi",
  cameraman: "/baobay/camera",
  accountant: "/baobay/chot-ngay",
  /** ADMIN quản lý nhân sự ngay trong khu báo bay — đăng nhập cùng cổng /baobay. */
  admin: "/baobay/admin",
};

export function isBaobayRole(value: unknown): value is BaobayRole {
  return typeof value === "string" && (BAOBAY_ROLES as readonly string[]).includes(value);
}

/**
 * Danh mục điểm bay chuyển sang lib/baobay/spots.ts (Hà Nội / Khau Phạ / Sa Pa).
 * Re-export để các nơi đang import từ đây không phải sửa đồng loạt.
 */
export { DEFAULT_SPOT } from "@/lib/baobay/spots";
