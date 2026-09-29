// lib/baobay/huong-bay-don.ts
/**
 * HƯỚNG GIÓ ĐẸP CHO PHI CÔNG BAY ĐƠN — xếp hạng theo lời chủ (29/09/2026).
 *
 * ĐỒI BÙ (cất 650 m):
 *  - RẤT ĐẸP: gió chính BẮC, BẮC ĐÔNG BẮC, BẮC TÂY BẮC — CỰC ĐẸP khi 3–4 m/s.
 *  - ĐẸP: ĐÔNG BẮC.
 *  - KHÁ ĐẸP: TÂY BẮC.
 *  - BAY ĐƯỢC: ĐÔNG ĐÔNG BẮC — hơi xiên vách nên khó cà vách, thermal không
 *    tập trung ở bãi cất mà chủ yếu ở khu gần bãi hạ.
 *
 * VIÊN NAM (cất 850 m):
 *  - RẤT ĐẸP: NAM · ĐẸP: NAM ĐÔNG NAM · KHÁ ĐẸP: NAM TÂY NAM.
 *  - BAY ĐƯỢC (không đẹp bằng): ĐÔNG, ĐÔNG NAM, TÂY NAM — với ĐÔNG / ĐÔNG NAM
 *    thermal không lên bãi cất mà bị đẩy ra bãi hạ.
 *
 * Hướng chủ không nhắc tới coi là NGOÀI HƯỚNG BÃI (không khuyến khích); phía
 * sau bãi ghi rõ GIÓ SAU. Sức gió lý tưởng 3–4 m/s (chủ nói cho Đồi Bù; Viên
 * Nam chưa có số riêng nên dùng cùng thang), gió chính trên 6 m/s là gió xiết.
 *
 * Bảng này CHỈ dùng cho thư phi công bay đơn; luật hướng của trang thời tiết
 * và app nội bộ vẫn ở lib/weather-spots.ts (luatHuong), rộng hơn.
 */

/** 1 rất đẹp · 2 đẹp · 3 khá đẹp · 4 bay được · 5 ngoài hướng · 6 gió sau. */
export type HangHuong = 1 | 2 | 3 | 4 | 5 | 6;

export const NHAN_HANG: Record<HangHuong, string> = {
  1: "rất đẹp",
  2: "đẹp",
  3: "khá đẹp",
  4: "bay được",
  5: "ngoài hướng bãi",
  6: "gió sau",
};

/** 16 hướng: 0 = B, 1 = BĐB, 2 = ĐB, 3 = ĐĐB, 4 = Đ … 15 = BTB. */
const idx16 = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;

type LuatBai = { hang: Partial<Record<number, HangHuong>>; ghiChu: Partial<Record<number, string>>; macDinh: HangHuong; gioSau: number[] };

const LUAT: Record<string, LuatBai> = {
  "doi-bu": {
    hang: { 0: 1, 1: 1, 15: 1, 2: 2, 14: 3, 3: 4 },
    ghiChu: { 3: "xiên vách, khó cà vách — thermal tập trung gần bãi hạ" },
    macDinh: 5,
    /** Đồi Bù quay về phía bắc: gió từ phía nam là gió sau. */
    gioSau: [6, 7, 8, 9, 10],
  },
  "vien-nam": {
    hang: { 8: 1, 7: 2, 9: 3, 4: 4, 5: 4, 6: 4, 10: 4 },
    ghiChu: {
      4: "thermal bị đẩy ra bãi hạ, không lên bãi cất",
      5: "thermal bị đẩy ra bãi hạ, không lên bãi cất",
      6: "thermal bị đẩy ra bãi hạ, không lên bãi cất",
    },
    macDinh: 5,
    /** Viên Nam quay về phía nam: gió từ phía bắc là gió sau. */
    gioSau: [14, 15, 0, 1, 2],
  },
};

export const coLuatBayDon = (slug: string) => slug in LUAT;

export function hangHuong(slug: string, deg: number): { hang: HangHuong; ghiChu?: string } {
  const l = LUAT[slug];
  if (!l) return { hang: 4 };
  const i = idx16(deg);
  if (l.gioSau.includes(i)) return { hang: 6 };
  return { hang: l.hang[i] ?? l.macDinh, ghiChu: l.ghiChu[i] };
}

/** Sức gió chính cho bay đơn: lý tưởng 3–4, dùng được 2–5, trên 6 là xiết. */
export function sucGio(v: number): { nhan: string; diem: number } {
  if (v < 1.5) return { nhan: "gió yếu", diem: 1 };
  if (v < 3) return { nhan: "hơi yếu", diem: 0.5 };
  if (v <= 4) return { nhan: "lý tưởng", diem: 0 };
  if (v <= 5) return { nhan: "hơi mạnh", diem: 0.5 };
  if (v <= 6) return { nhan: "mạnh", diem: 1.5 };
  return { nhan: "quá mạnh", diem: 9 };
}

const TEN16 = [
  "Bắc", "Bắc Đông Bắc", "Đông Bắc", "Đông Đông Bắc", "Đông", "Đông Đông Nam", "Đông Nam", "Nam Đông Nam",
  "Nam", "Nam Tây Nam", "Tây Nam", "Tây Tây Nam", "Tây", "Tây Tây Bắc", "Tây Bắc", "Bắc Tây Bắc",
];
/** Tên đủ 16 hướng — bảng xếp hạng chấm theo 16 hướng nên chữ cũng phải 16 hướng cho khớp. */
export const tenHuong16 = (deg: number) => TEN16[idx16(deg)];
