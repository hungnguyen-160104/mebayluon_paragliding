// lib/baobay/mo-hinh.ts

/**
 * CÁC MÔ HÌNH DỰ BÁO LẤY SỐ ĐƯỢC cho điểm bay ở Việt Nam (qua Open-Meteo).
 *
 * Chỉ liệt kê mô hình đã DÒ THẬT là trả về đủ gió, giật, mưa, CAPE, điểm sương,
 * mây thấp và gió mực 850 cho toạ độ Tây Bắc. ECMWF AIFS (bản AI) không trả
 * dữ liệu giờ; JMA thiếu giật và CAPE — bày ra thì bảng trống một nửa.
 *
 * Vì sao cho chọn và so sánh: mỗi mô hình đoán khác nhau ở địa hình núi, và
 * chỗ chúng KHÔNG đồng ý với nhau chính là chỗ dự báo còn mong manh. Ba mô hình
 * cùng nói gió êm → tin được; ba mô hình cãi nhau về buổi chiều → gọi lại
 * khách sát ngày thay vì chốt sớm. Đó là thông tin mà một con số duy nhất
 * không nói được.
 */
export type MoHinh = {
  /** Mã ngắn dùng trên URL và giao diện. */
  ma: string;
  /** Tên gọi ở Open-Meteo. */
  id: string;
  ten: string;
  /** Câu mô tả ngắn cho tooltip. */
  mo: string;
  /** Mô hình này có sẵn chỉ số nâng và trần lớp xáo trộn không (không thì mượn GFS). */
  coChiSoOnDinh: boolean;
};

export const MO_HINH: MoHinh[] = [
  { ma: "ecmwf", id: "ecmwf_ifs025", ten: "ECMWF", mo: "Châu Âu · lưới 25km · thường sát nhất ở núi", coChiSoOnDinh: false },
  { ma: "gfs", id: "gfs_seamless", ten: "GFS", mo: "Mỹ (NOAA) · 13km · cập nhật 4 lần/ngày · có đủ chỉ số ổn định", coChiSoOnDinh: true },
  { ma: "icon", id: "icon_seamless", ten: "ICON", mo: "Đức (DWD) · 13km", coChiSoOnDinh: false },
  { ma: "ukmo", id: "ukmo_seamless", ten: "UKMO", mo: "Anh (Met Office) · 10km", coChiSoOnDinh: false },
  { ma: "gem", id: "gem_seamless", ten: "GEM", mo: "Canada · 15km", coChiSoOnDinh: false },
];

export const MO_HINH_MAC_DINH = "ecmwf";

export function moHinhTheoMa(ma?: string | null): MoHinh {
  const m = MO_HINH.find((x) => x.ma === String(ma ?? "").trim().toLowerCase());
  return m ?? MO_HINH[0];
}

/** "ecmwf,gfs,icon" → tối đa 3 mô hình hợp lệ, bỏ trùng, luôn có ít nhất một. */
export function danhSachMoHinh(chuoi?: string | null, toiDa = 3): MoHinh[] {
  const ma = String(chuoi ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const ra: MoHinh[] = [];
  for (const m of ma) {
    const mh = MO_HINH.find((x) => x.ma === m);
    if (mh && !ra.some((x) => x.ma === mh.ma)) ra.push(mh);
    if (ra.length >= toiDa) break;
  }
  return ra.length ? ra : [MO_HINH[0]];
}
