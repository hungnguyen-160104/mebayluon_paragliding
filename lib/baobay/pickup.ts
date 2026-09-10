// lib/baobay/pickup.ts

/**
 * ĐIỂM ĐÓN VIẾT GỌN — một nơi quyết định, mọi chỗ dùng chung.
 *
 * Khách đặt qua Klook (và trên web) chọn "đến thẳng điểm bay" thì ô điểm đón
 * nhận nguyên cái tên dài của bãi, có khi còn bị nhà cung cấp cắt cụt giữa
 * chừng:
 *
 *   "Điểm bay dù lượn Mebayluon Paragliding (CTCP Du lịch &"
 *
 * Trên sổ và trên vé thì câu đó vô nghĩa — ai cũng biết bãi ở đâu, mà nó ngốn
 * cả một cột, in ra vé thì tràn dòng. Điều người trực và khách cần biết chỉ là:
 * khách này KHÔNG cần xe đón. Nên rút về "Tự đến điểm bay".
 *
 * Chỉ rút khi chắc chắn đó là TÊN BÃI (có "điểm bay" kèm tên công ty/thương
 * hiệu). Một khách sạn tên "Điểm Bay Homestay" thì giữ nguyên — đoán sai ở đây
 * là xe không tới đón khách, lỗi nặng hơn nhiều so với một ô chữ dài.
 *
 * "Clubhouse Mebayluon Paragliding" cũng giữ nguyên: đó là chỗ đón THẬT, xe
 * phải tới đó.
 */

const TEN_BAI = /(điểm bay|diem bay)/i;
const TEN_HANG = /(mebayluon|paragliding|ctcp|cổ phần|co phan|du lịch|du lich)/i;

/** Nhãn dùng cho khách tự tới bãi — dài hơn "Tự đến" một chữ cho khỏi cụt nghĩa trên vé. */
export const TU_DEN = "Tự đến điểm bay";

export function shortPickup(text: unknown): string {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  if (TEN_BAI.test(raw) && TEN_HANG.test(raw)) return TU_DEN;
  /** Bỏ phần trong ngoặc (tên pháp nhân, ghi chú dài) — giữ tên chỗ đón. */
  const noParen = raw.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return noParen || raw;
}

/** Chỗ đón này có phải là "khách tự tới bãi" không — để khỏi in thêm chữ "Đón:". */
export function laTuDen(text: unknown): boolean {
  return shortPickup(text) === TU_DEN;
}
