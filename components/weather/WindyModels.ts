// components/weather/WindyModels.ts

/**
 * CÁC MÔ HÌNH XEM ĐƯỢC TRÊN BẢN ĐỒ WINDY.
 *
 * Bản đồ nhúng nhận tham số `product=`; đổi giá trị là đổi mô hình đang vẽ.
 * Chỉ liệt kê những mô hình PHỦ VIỆT NAM — Windy còn AROME (Pháp), ICON-EU
 * (châu Âu), NAM/HRRR (Bắc Mỹ), bày ra đây thì bấm vào chỉ thấy bản đồ trắng.
 *
 * Vì sao cho chọn: mỗi mô hình đoán khác nhau ở địa hình núi, và chỗ chúng
 * KHÔNG đồng ý với nhau chính là chỗ dự báo còn mong manh. Xem hai ba mô hình
 * cho cùng một ngày là cách nhanh nhất biết nên tin đến đâu — thứ mà một con
 * số duy nhất không nói được.
 */
export type WindyModel = { id: string; ten: string; mo: string };

export const WINDY_MODELS: WindyModel[] = [
  { id: "ecmwf", ten: "ECMWF", mo: "Châu Âu · 9km · thường sát nhất ở núi" },
  { id: "gfs", ten: "GFS", mo: "Mỹ · 13km · cập nhật 4 lần/ngày" },
  { id: "icon", ten: "ICON", mo: "Đức · 13km" },
  { id: "ecmwfAifs", ten: "ECMWF AI", mo: "Bản AI của ECMWF" },
  { id: "gfsWave", ten: "Sóng", mo: "Sóng biển — dùng cho Sơn Trà" },
];

/**
 * CÁC LỚP XEM ĐƯỢC trên bản đồ Windy (`overlay=`).
 *
 * "Soi mây / soi mù" là thứ dân bay hay dùng nhất sau gió: nhìn hình là biết
 * sáng mai núi có bị mây trùm không, mà con số "mây thấp 80%" không nói được
 * mây ấy nằm ở độ cao nào so với bãi.
 *
 *  - `clouds` vẽ mây tổng: thấy khối mây đang ở đâu, đi hướng nào.
 *  - `lclouds` vẽ MÂY THẤP — đúng thứ trùm sườn núi và bịt bãi cất cánh.
 *  - `cloudbase` vẽ TRẦN MÂY theo mét: soi thẳng "mây đáy 800m" trên bản đồ,
 *    so với độ cao bãi là biết bãi nằm trên hay trong mây.
 *  - `visibility` vẽ tầm nhìn — sương mù dày thì vùng đó tối lại.
 */
export type LopWindy = { ma: string; ten: string; mo: string };

/**
 * MÃ LỚP LÀ MÃ CỦA WINDY, đã DÒ THẬT trên embed2.html từng cái một (đọc
 * `W.store.get("overlay")` sau khi nạp): lớp nào Windy không nhận thì nó âm
 * thầm rơi về "wind" — bấm mà không thấy gì đổi. Bản đầu ghi `cloudbase` (tên
 * đoán theo tài liệu web) nên nút Trần mây chẳng làm gì; mã đúng là `cbase`.
 * Thêm lớp mới thì phải dò lại như vậy, đừng đoán tên.
 */
export const LOP_WINDY: LopWindy[] = [
  { ma: "wind", ten: "Gió", mo: "Gió bề mặt — lớp mặc định" },
  { ma: "gust", ten: "Gió giật", mo: "Gió giật bề mặt" },
  { ma: "clouds", ten: "Mây", mo: "Mây tổng — khối mây đang ở đâu, đi hướng nào" },
  { ma: "lclouds", ten: "Mây thấp", mo: "Mây tầng thấp (FEW/SCT/BKN/OVC) — thứ trùm sườn núi và bịt bãi cất cánh" },
  { ma: "cbase", ten: "Trần mây", mo: "Độ cao đáy mây (m) — so với độ cao bãi là biết bãi trong hay dưới mây" },
  { ma: "fog", ten: "Sương mù", mo: "Vùng có sương mù / mù đóng băng — nhìn là biết sáng mai bãi có mù không" },
  { ma: "visibility", ten: "Tầm nhìn", mo: "Tầm nhìn ngang (km) — vùng tối là mù dày" },
  { ma: "rain", ten: "Mưa", mo: "Mưa và dông" },
  { ma: "rh", ten: "Độ ẩm", mo: "Độ ẩm tương đối — ẩm cao ở núi là dấu hiệu mù" },
];

export const LOP_MAC_DINH = "wind";

/** Dựng địa chỉ nhúng Windy cho một toạ độ, một mô hình và một lớp. */
export function windyEmbedUrl(lat: number, lon: number, product = "ecmwf", overlay = LOP_MAC_DINH): string {
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    zoom: "10",
    level: "surface",
    overlay,
    product,
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "true",
    metricWind: "m/s",
    metricTemp: "°C",
    radarRange: "-1",
  });
  return `https://embed.windy.com/embed2.html?${q}`;
}
