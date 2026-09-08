// lib/bot/images.ts
//
// GỬI ẢNH CHO KHÁCH.
//
// Vì sao phải có bảng tra này thay vì để mô hình tự viết link: mô hình sẽ
// bịa ra URL nghe rất hợp lý (mebayluon.com/homestay/phong-vip.jpg) mà
// không tồn tại. Khách nhận ảnh vỡ, tệ hơn là không gửi gì. Nên mô hình
// chỉ được phép gọi TÊN KHOÁ; code tra bảng, khoá lạ thì bỏ qua im lặng.
//
// Cách mô hình gọi: viết thẻ [ANH: <khoa>] ở CUỐI câu trả lời, mỗi ảnh một
// thẻ, tối đa 4 ảnh. Thẻ được gỡ khỏi chữ trước khi gửi khách.
//
// Ảnh phòng lấy thẳng từ lib/homestay-data.ts — một nguồn duy nhất, sửa
// giá hay đổi ảnh ở đó là bot cập nhật theo, không phải nhớ sửa hai chỗ.

import { roomTypes } from '@/lib/homestay-data';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mebayluon.com').replace(/\/+$/, '');

export type BotImage = { url: string; caption: string };

/** Ảnh khai tay: bảng giá, điểm bay, menu... Đường dẫn phải có thật trong /public. */
const MANUAL: Record<string, BotImage> = {
  menu_cafe: { url: '/homestay/menu-cafe.jpg', caption: 'Menu quán cafe tại bãi hạ cánh' },
  menu_do_an: { url: '/homestay/menu.png', caption: 'Menu đồ ăn' },
  toan_canh_homestay: { url: '/homestay/overview.jpeg', caption: 'Toàn cảnh homestay Khau Phạ' },
};

/** Ảnh phòng — dựng tự động từ roomTypes, khoá chính là id của phòng. */
function roomImages(): Record<string, BotImage> {
  const out: Record<string, BotImage> = {};
  for (const r of roomTypes) {
    if (!r.image) continue;
    const gia =
      r.priceType === 'per-guest'
        ? `${r.price.toLocaleString('vi-VN')}đ/khách`
        : `${r.price.toLocaleString('vi-VN')}đ/phòng`;
    out[r.id] = { url: r.image, caption: `${gia} — ${r.description}` };
  }
  return out;
}

let catalogCache: Record<string, BotImage> | null = null;

export function imageCatalog(): Record<string, BotImage> {
  if (!catalogCache) catalogCache = { ...roomImages(), ...MANUAL };
  return catalogCache;
}

/**
 * Danh sách khoá để nhét vào prompt. Giữ NGẮN — mỗi dòng một khoá kèm một
 * câu mô tả để mô hình biết khi nào dùng cái nào.
 */
export function imageMenuForPrompt(): string {
  const cat = imageCatalog();
  const dong = Object.entries(cat).map(([k, v]) => `- ${k}: ${v.caption}`);
  return (
    '===== ANH CO THE GUI KHACH =====\n' +
    'Khi khach hoi ve PHONG hoac MENU, gui kem anh bang cach viet the ' +
    '[ANH: <khoa>] o CUOI cau tra loi, moi anh mot the, TOI DA 4 anh.\n' +
    'CHI dung dung cac khoa duoi day. TUYET DOI KHONG tu viet duong dan ' +
    'anh, khong tu bia khoa moi — khoa la se bi bo qua va khach khong nhan ' +
    'duoc gi.\n' +
    'Khach hoi chung chung ("con phong khong", "cho xem phong") thi gui 2-3 ' +
    'anh dai dien du muc gia, dung gui het.\n' +
    dong.join('\n') +
    '\n===== HET DANH SACH ANH =====\n\n'
  );
}

/**
 * Tách thẻ [ANH: ...] khỏi câu trả lời.
 * Trả về chữ đã sạch thẻ + danh sách ảnh (URL tuyệt đối, đã lọc khoá lạ).
 */
export function extractImages(text: string): { text: string; images: BotImage[] } {
  const cat = imageCatalog();
  const images: BotImage[] = [];
  const seen = new Set<string>();

  const cleaned = text.replace(/\[\s*ANH\s*:\s*([a-zA-Z0-9_\-]+)\s*\]/gi, (_m, key: string) => {
    const hit = cat[key] || cat[key.toLowerCase()];
    if (hit && !seen.has(hit.url) && images.length < 4) {
      seen.add(hit.url);
      images.push({
        url: hit.url.startsWith('http') ? hit.url : SITE
