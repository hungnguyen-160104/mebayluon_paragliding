// lib/baobay/khoa-thoi-tiet.ts
/**
 * KHOÁ ĐIỂM cho hệ thời tiết — dùng chung cho dự báo, sổ kinh nghiệm, nhận
 * định chuyên gia và cấu hình ⚙.
 *
 * Trước đây mọi chỗ gọi `normalizeSpot(slug)`: slug lạ ("vien-nam",
 * "son-tra", "ha-giang"…) bị quy về ĐIỂM MẶC ĐỊNH (Khau Phạ), nên nhận định
 * chuyên gia "nghỉ bay do mưa" của Khau Phạ bị DÁN LÊN MỌI ĐIỂM trên trang
 * khách (chủ báo 17/09). Nay:
 *  - mã sổ nội bộ ("khau-pha", "ha-noi", "sapa") → chính nó;
 *  - slug trang khách có sổ nội bộ ("doi-bu" → "ha-noi", "muong-hoa-sapa" →
 *    "sapa") → sổ ấy;
 *  - slug chỉ có trên trang khách ("vien-nam", "son-tra"…) → chính slug ấy,
 *    có sổ kinh nghiệm và ⚙ riêng, chuyên gia chấm được trong app.
 */
import { isSpotId, SPOTS, type SpotId } from "./spots";
import { DIEM_TRANG_THOI_TIET, diemThoiTietTheoSlug, type DiemThoiTiet } from "../weather-spots";

export type KhoaThoiTiet = {
  /** Khoá lưu sổ / cache / ⚙. */
  key: string;
  /** Sổ nội bộ tương ứng, null nếu điểm chỉ có trên trang khách. */
  noiBo: SpotId | null;
  /** Bản khai trên trang khách (toạ độ, cao độ, luật hướng) nếu có. */
  diem: DiemThoiTiet | null;
};

export function khoaThoiTiet(raw: unknown): KhoaThoiTiet | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (isSpotId(s)) return { key: s, noiBo: s, diem: DIEM_TRANG_THOI_TIET.find((d) => d.spotNoiBo === s) ?? null };
  const d = diemThoiTietTheoSlug(s);
  if (!d) return null;
  if (d.spotNoiBo) return { key: d.spotNoiBo, noiBo: d.spotNoiBo, diem: d };
  return { key: d.slug, noiBo: null, diem: d };
}

/** Điểm CHỈ CÓ trên trang khách (không sổ nội bộ) — app liệt kê thêm để chuyên gia chấm (chủ 17/09). */
export const DIEM_CHI_CONG_KHAI: DiemThoiTiet[] = DIEM_TRANG_THOI_TIET.filter((d) => !d.spotNoiBo);

/** Tên NGẮN cho app (chủ 17/09: "mấy cái tên này rút gọn thôi") — tên đầy đủ vẫn ở thẻ trang khách. */
const TEN_GON: Record<string, string> = {
  "vien-nam": "Viên Nam",
  "son-tra": "Sơn Trà",
  "ha-giang": "Quản Bạ",
  "tram-tau": "Phình Hồ",
  "dai-tue": "Đại Huệ",
  "doi-bu": "Đồi Bù",
  "muong-hoa-sapa": "Sa Pa",
};

/** Tên hiện của một khoá: điểm nội bộ theo SPOTS, điểm công khai theo tên ngắn. */
export function tenDiemThoiTiet(key: string): string {
  const noiBo = SPOTS.find((s) => s.id === key);
  if (noiBo) return noiBo.name;
  return TEN_GON[key] ?? diemThoiTietTheoSlug(key)?.ten ?? key;
}
