// lib/booking/queue-display.ts
/**
 * KHI NÀO CHO KHÁCH THẤY SỐ THỨ TỰ BAY?
 *
 * Số thứ tự tồn tại ở MỌI điểm bay (sổ điều hành vẫn cấp), nhưng chỉ đáng
 * đem ra nói với khách khi điểm đó đông đến mức phải xếp lượt như lấy số ở
 * ngân hàng. Theo chủ chốt (8/2026): chỉ KHAU PHẠ, và chỉ trong hai khung
 * đông khách LẶP LẠI HÀNG NĂM:
 *   - dịp lễ 30/4 – 1/5
 *   - mùa vàng: 1/8 – hết tháng 10 (31/10)
 * Ngoài khung đó (và ở mọi điểm khác) khách không thấy số — tránh gieo cảm
 * giác "phải xếp hàng" vào ngày vắng.
 *
 * So theo "MM-DD" của NGÀY BAY (không phải ngày đặt): khách dời lịch ra
 * ngoài khung là số tự ẩn theo.
 */
export function shouldShowQueueNo(location: string, flightDateISO: string): boolean {
  // Web đặt tên "khau_pha", sổ điều hành đặt "khau-pha" — quy về một mối
  if (String(location ?? "").replace(/_/g, "-") !== "khau-pha") return false;
  const md = String(flightDateISO ?? "").slice(5, 10); // "MM-DD"
  if (md.length !== 5) return false;
  if (md === "04-30" || md === "05-01") return true;
  return md >= "08-01" && md <= "10-31";
}
