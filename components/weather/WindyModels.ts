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

/** Dựng địa chỉ nhúng Windy cho một toạ độ và một mô hình. */
export function windyEmbedUrl(lat: number, lon: number, product = "ecmwf"): string {
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    zoom: "10",
    level: "surface",
    overlay: "wind",
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
