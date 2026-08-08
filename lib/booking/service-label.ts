// lib/booking/service-label.ts
/**
 * Rút gọn tên dịch vụ cho những nơi khách ĐÃ CHỌN XONG (bước xác nhận, vé
 * bay, email).
 *
 * Nhiều tên dịch vụ có phần trong ngoặc để giải thích lúc khách đang cân nhắc,
 * ví dụ "Đón trả 2 chiều từ khách sạn (trung tâm Sapa, Tả Van, Lao Chải)".
 * Phần đó cần ở bước 1, nhưng khi đã chốt thì thừa — nhất là khi ngay sau nó
 * đã ghi địa chỉ thật của khách, thành ra một dòng vừa dài vừa lặp.
 *
 * Chỉ cắt phần ngoặc Ở CUỐI và chỉ khi phần còn lại vẫn đủ nghĩa, để không
 * biến "Flycam (drone camera)" thành một chữ cụt lủn.
 */

/** Độ dài tối thiểu của phần còn lại sau khi cắt. */
const MIN_KEPT_LENGTH = 10;

export function shortServiceLabel(raw: unknown): string {
  const label = String(raw ?? "").trim();
  if (!label.endsWith(")")) return label;

  const open = label.lastIndexOf("(");
  if (open <= 0) return label;

  const kept = label.slice(0, open).trim();
  return kept.length >= MIN_KEPT_LENGTH ? kept : label;
}
