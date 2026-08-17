// lib/baobay/roles.ts
/**
 * Bốn nhóm nhân sự trong hệ thống báo bay (/baocao):
 *
 *  - pilot      : PHI CÔNG — số chuyến bay, mã vé đã bay, Camera360, chi tiêu
 *  - dispatcher : ĐIỀU PHỐI BAY — vé xuất/thu, tiền mặt, dịch vụ gia tăng, chi cho khách
 *  - counter    : QUẦY VÉ — y như điều phối, chỉ KHÔNG lập lệnh thu tiền
 *  - cameraman  : CAMERA MAN — số chuyến bay flycam trong ngày
 *  - accountant : KẾ TOÁN TỔNG HỢP — chốt số tổng, duyệt lệch và chi tiêu
 *  - admin      : QUẢN TRỊ — bổ nhiệm, thêm bớt nhân sự, active/deactive, mật khẩu
 *
 * Mỗi người một tài khoản riêng (không dùng chung), vì bảng tổng hợp phải biết
 * dòng nào của ai để còn hỏi lại khi lệch số.
 *
 * Thứ tự trong mảng cũng là thứ tự hiện ở trang quản trị tài khoản.
 */

export const BAOBAY_ROLES = ["pilot", "dispatcher", "counter", "cameraman", "accountant", "admin"] as const;

export type BaobayRole = (typeof BAOBAY_ROLES)[number];

export const ROLE_LABEL: Record<BaobayRole, string> = {
  pilot: "Phi công",
  dispatcher: "Điều phối bay",
  counter: "Quầy vé",
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
/**
 * Các trang một vai trò làm việc — dùng cho thanh điều hướng của người KIÊM
 * NHIỆM (một tài khoản mang nhiều vai thì thấy đủ lối vào của từng vai).
 */
export function roleTabs(role: string): Array<{ href: string; label: string }> {
  switch (role) {
    case "pilot":
      return [{ href: "/baocao/phi-cong", label: "Phi công" }];
    case "cameraman":
      return [{ href: "/baocao/camera", label: "Camera man" }];
    case "dispatcher":
    case "counter":
      return [{ href: "/baocao/dieu-phoi", label: "Điều phối / Quầy vé" }];
    case "accountant":
      /**
       * Thẻ đầu mang chữ "KẾ TOÁN" hẳn ra: người kiêm nhiệm nhìn thanh thẻ toàn
       * tên công việc (Chốt ngày, Tổng hợp…) thì tưởng mình chưa được gán vai
       * kế toán — đã hỏi đúng câu đó hai lần.
       */
      return [
        { href: "/baocao/chot-ngay", label: "Kế toán · Chốt ngày" },
        { href: "/baocao/phat-nop-muon", label: "Phạt nộp muộn" },
        { href: "/baocao/tong-hop", label: "Tổng hợp" },
        { href: "/baocao/bao-cao-thang", label: "Báo cáo tháng" },
      ];
    case "admin":
      return [{ href: "/baocao/admin", label: "Quản trị nhân sự" }];
    default:
      return [];
  }
}

/** Bỏ thẻ trùng đường dẫn (điều phối và quầy vé chung một trang). */
export function uniqueTabs(tabs: Array<{ href: string; label: string }>) {
  const seen = new Set<string>();
  return tabs.filter((t) => (seen.has(t.href) ? false : (seen.add(t.href), true)));
}

export const ROLE_HOME: Record<BaobayRole, string> = {
  pilot: "/baocao/phi-cong",
  dispatcher: "/baocao/dieu-phoi",
  /** Quầy vé dùng CHUNG trang điều phối — chỉ ẩn thẻ lệnh thu tiền. */
  counter: "/baocao/dieu-phoi",
  cameraman: "/baocao/camera",
  accountant: "/baocao/chot-ngay",
  /** ADMIN quản lý nhân sự ngay trong khu báo bay — đăng nhập cùng cổng /baocao. */
  admin: "/baocao/admin",
};

/**
 * Điều phối và quầy vé nhập cùng một mẫu báo cáo (DispatcherDailyReport) nên
 * mọi phép kiểm quyền, gom số, xuất bảng kê đều phải coi hai vai này như một.
 * Dùng hàm này thay cho `role === "dispatcher"` rải rác khắp nơi.
 */
export const DISPATCHER_LIKE_ROLES = ["dispatcher", "counter"] as const;

export function isDispatcherLike(role: unknown): boolean {
  return role === "dispatcher" || role === "counter";
}

export function isBaobayRole(value: unknown): value is BaobayRole {
  return typeof value === "string" && (BAOBAY_ROLES as readonly string[]).includes(value);
}

/**
 * Danh mục điểm bay chuyển sang lib/baobay/spots.ts (Hà Nội / Khau Phạ / Sa Pa).
 * Re-export để các nơi đang import từ đây không phải sửa đồng loạt.
 */
export { DEFAULT_SPOT } from "@/lib/baobay/spots";
