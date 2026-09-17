// lib/baobay/ten-khach.ts
/**
 * CHUẨN HOÁ TÊN KHÁCH KHI NHẬP (chủ 17/09): tên gõ kiểu gì cũng quy về MỘT
 * chuẩn — mỗi từ viết hoa chữ đầu, còn lại viết thường, một khoảng trắng giữa
 * các từ:
 *   "ECOHOME PHILLIPpe Lucien"       → "Ecohome Phillippe Lucien"
 *   "nhật minh"                      → "Nhật Minh"
 *   "Phùng phương Hoa"               → "Phùng Phương Hoa"
 *   "HÀNG KHẢI Phùng Phương Hoa"     → "Hàng Khải Phùng Phương Hoa"
 * Giữ dấu tiếng Việt (toLowerCase/toUpperCase của JS hiểu Unicode). Từ ghép
 * bằng gạch nối hay dấu nháy viết hoa từng phần: "jean-pierre o'brien" →
 * "Jean-Pierre O'Brien". Thuần tính, dùng chung máy chủ và form.
 */
export function chuanTenKhach(raw: unknown): string {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s
    .split(" ")
    .map((tu) => tu.split(/([-'’])/).map((p) => (p === "-" || p === "'" || p === "’" ? p : hoaDau(p))).join(""))
    .join(" ");
}

function hoaDau(tu: string): string {
  if (!tu) return tu;
  const [dau, ...con] = Array.from(tu.toLowerCase());
  return dau.toUpperCase() + con.join("");
}
