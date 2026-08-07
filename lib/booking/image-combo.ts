// lib/booking/image-combo.ts
/**
 * Giảm giá COMBO ẢNH: khách chọn cả quay flycam LẪN camera 360° thì bớt
 * 100.000đ (mua lẻ 400k + 400k = 800k, combo còn 700k).
 *
 * Để ở một file riêng vì con số này xuất hiện ở nhiều nơi: bước chọn dịch vụ,
 * bước xác nhận, vé điện tử, email/Telegram và trang giới thiệu dù máy. Sửa
 * mức giảm thì chỉ sửa ở đây.
 *
 * Giảm theo TỪNG KHÁCH có đủ cả hai dịch vụ: đoàn 2 khách cùng chọn flycam +
 * 360 thì bớt 200.000đ. Vì thế lấy min() số lượng của hai dịch vụ.
 */

export const IMAGE_COMBO_DISCOUNT_VND = 100_000;
/** Quy đổi tương đương cho khách xem giá USD. */
export const IMAGE_COMBO_DISCOUNT_USD = 4;

/** Khớp key dịch vụ của mọi điểm bay, ví dụ "khau_pha_flycam". */
const isFlycamKey = (key: string) => /flycam/i.test(key);
const isCamera360Key = (key: string) => /camera_?360|360_?camera|camera360/i.test(key);

export type ComboServiceState = { key: string; selected: boolean; qty: number };

/**
 * Số suất combo = số khách có ĐỦ cả flycam và camera 360°.
 * Trả 0 khi khách chỉ chọn một trong hai.
 */
export function imageComboCount(services: ComboServiceState[]): number {
  let flycam = 0;
  let camera360 = 0;

  for (const s of services) {
    if (!s.selected) continue;
    const qty = Math.max(0, Number(s.qty) || 0);
    if (isFlycamKey(s.key)) flycam += qty;
    else if (isCamera360Key(s.key)) camera360 += qty;
  }

  return Math.min(flycam, camera360);
}

/** Số tiền được giảm (VND), luôn ≥ 0. */
export const imageComboDiscountVND = (services: ComboServiceState[]) =>
  imageComboCount(services) * IMAGE_COMBO_DISCOUNT_VND;

/** Số tiền được giảm (USD), luôn ≥ 0. */
export const imageComboDiscountUSD = (services: ComboServiceState[]) =>
  imageComboCount(services) * IMAGE_COMBO_DISCOUNT_USD;

/** Nhãn dòng giảm giá, hiện ở bảng giá và trên vé. */
export const IMAGE_COMBO_LABEL: Record<string, string> = {
  vi: "Giảm combo ảnh (flycam + camera 360°)",
  en: "Photo combo discount (drone + 360° camera)",
  fr: "Remise pack images (drone + caméra 360°)",
  ru: "Скидка на фотопакет (дрон + камера 360°)",
  zh: "影像套餐优惠（航拍 + 360° 相机）",
  hi: "फ़ोटो कॉम्बो छूट (ड्रोन + 360° कैमरा)",
};

export const imageComboLabel = (lang: unknown) =>
  IMAGE_COMBO_LABEL[String(lang ?? "vi").slice(0, 2).toLowerCase()] ??
  IMAGE_COMBO_LABEL.vi;
