// lib/baobay/roles.ts
/**
 * Bốn nhóm nhân sự trong hệ thống báo bay (/baocao):
 *
 *  - pilot      : PHI CÔNG — số chuyến bay, mã vé đã bay, Camera360, chi tiêu
 *  - dispatcher : ĐIỀU PHỐI BAY — vé xuất/thu, tiền mặt, dịch vụ gia tăng, chi cho khách
 *  - counter    : QUẦY VÉ — y như điều phối, chỉ KHÔNG lập lệnh thu tiền
 *  - cameraman  : CAMERA MAN — số chuyến bay flycam trong ngày
 *  - accountant : KẾ TOÁN TỔNG HỢP — chốt số tổng, duyệt lệch và chi tiêu
 *  - homestay   : QUẢN HOMESTAY — sổ phòng, nhập đặt phòng (thường là vai KIÊM NHIỆM)
 *  - admin      : QUẢN TRỊ — bổ nhiệm, thêm bớt nhân sự, active/deactive, mật khẩu
 *
 * Mỗi người một tài khoản riêng (không dùng chung), vì bảng tổng hợp phải biết
 * dòng nào của ai để còn hỏi lại khi lệch số.
 *
 * Thứ tự trong mảng cũng là thứ tự hiện ở trang quản trị tài khoản.
 */

/**
 * "tax" — KẾ TOÁN THUẾ, cố ý TÁCH KHỎI "accountant".
 *
 * Kế toán tổng hợp lo số vận hành hằng ngày; kế toán thuế chọn lọc booking để
 * xuất hoá đơn VAT — không phải khách nào cũng xuất, và bảng xuất mang CCCD /
 * hộ chiếu / mã số thuế của khách. Gộp chung một vai là mọi kế toán vận hành
 * đều đọc được chỗ giấy tờ đó, nên tách vai: trang /baocao/thue chỉ mở cho
 * "tax" (và quản trị).
 */
export const BAOBAY_ROLES = ["pilot", "dispatcher", "counter", "cameraman", "accountant", "tax", "cafe", "homestay", "admin"] as const;

export type BaobayRole = (typeof BAOBAY_ROLES)[number];

export const ROLE_LABEL: Record<BaobayRole, string> = {
  pilot: "Phi công",
  dispatcher: "Điều phối bay",
  counter: "Quầy vé",
  cameraman: "Camera man",
  accountant: "Kế toán tổng hợp",
  tax: "Kế toán thuế",
  cafe: "Quầy cafe",
  homestay: "Quản homestay",
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
      /**
       * Homestay KHÔNG còn là thẻ đương nhiên của kế toán. Trước đây role
       * accountant tự có homestay, nên muốn RÚT quyền homestay của một kế
       * toán (yêu cầu thật: Hà Vân) là không có cách nào ngoài đổi cả vai.
       * Nay ai làm sổ phòng thì gán thêm vai kiêm nhiệm "homestay" — thẻ và
       * quyền đi theo vai đó, thêm bớt từng người được.
       */
      return [
        { href: "/baocao/ke-toan", label: "Kế toán" },
        { href: "/baocao/chot-ngay", label: "Chốt ngày" },
        { href: "/baocao/phat-nop-muon", label: "Phạt nộp muộn" },
        { href: "/baocao/tong-hop", label: "Tổng hợp" },
        { href: "/baocao/bao-cao-thang", label: "Báo cáo tháng" },
      ];
    case "tax":
      return [{ href: "/baocao/thue", label: "Kế toán thuế" }];
    case "cafe":
      return [
        { href: "/baocao/cafe", label: "Bán hàng" },
        { href: "/baocao/cafe/bao-cao", label: "Báo cáo quầy" },
      ];
    case "homestay":
      return [{ href: "/baocao/homestay", label: "Homestay" }];
    case "admin":
      return [{ href: "/baocao/admin", label: "Quản trị nhân sự" }];
    default:
      return [];
  }
}

/**
 * Người này có MANG vai đó không — tính cả vai kiêm nhiệm.
 *
 * Dùng thay cho `session.role === "accountant"`: quản trị kiêm kế toán (judy,
 * dangvm) có role chính là "admin", nên phép so bằng vai chính đẩy họ sang
 * nhánh dữ liệu của vai khác — trang Chốt ngày nhận sai hình dạng dữ liệu và
 * không hiện gì. Đã xảy ra thật.
 */
export function wearsRole(
  session: { role?: string; extraRoles?: readonly string[] | null },
  role: BaobayRole,
): boolean {
  return session.role === role || (session.extraRoles ?? []).includes(role);
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
  accountant: "/baocao/ke-toan",
  tax: "/baocao/thue",
  cafe: "/baocao/cafe",
  homestay: "/baocao/homestay",
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
