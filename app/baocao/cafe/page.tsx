// app/baocao/cafe/page.tsx
import { redirect } from "next/navigation";

/**
 * ĐỊA CHỈ CŨ CỦA MÁY BÁN — nay trang bán nằm ở /cafe (luật chủ 06/09).
 *
 * Giữ lại đúng một dòng chuyển hướng chứ không xoá hẳn: máy Sunmi ngoài bãi
 * đã lưu địa chỉ này vào màn hình chính, xoá là hai quầy mở ra thấy 404 giữa
 * ca. Khi nào cả hai máy đã đổi biểu tượng thì bỏ tệp này.
 */
export default function LegacyCafeRedirect() {
  redirect("/cafe");
}
