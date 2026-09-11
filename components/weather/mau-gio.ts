/**
 * MÀU GIÓ / GIẬT CHUYỂN DẦN (gradient) — xanh → vàng → đỏ → đỏ thẫm.
 *
 * Luật chủ 10/09: gió nhẹ thì xanh; gust trên 10 m/s ngả vàng, trên 14 đỏ dần,
 * càng mạnh càng thẫm. Trước đây tô theo NĂM BẬC rời (xanh nhạt / xanh / vàng /
 * cam / đỏ): 5,9 và 6,1 m/s nhảy hẳn hai màu dù khác nhau 0,2 — mắt bị đánh
 * lừa rằng có một ngưỡng thật ở đó. Chuyển dần thì 6,1 chỉ đậm hơn 5,9 một
 * chút, đúng với bản chất số liệu.
 *
 * Hai thang khác nhau vì hai đại lượng khác nhau:
 *  - GIÓ TRUNG BÌNH theo thang chủ: < 4 bình thường (tốt) · 4–6 hơi mạnh ·
 *    6–8 mạnh · > 8 rất mạnh. Vàng bắt đầu ở 4, đỏ ở 8.
 *  - GIẬT không quyết định bay (gió 4 giật 12 là thường), nên vàng muộn hơn:
 *    10 ngả vàng, 14 đỏ dần, 16 (mốc cảnh báo) đỏ, 18+ đỏ thẫm.
 *
 * Dùng chung cho meteogram, bảng giờ nội bộ và bảng giờ trang khách — một
 * thang màu, nhìn ở đâu cũng hiểu như nhau.
 */

type Moc = Array<[number, string]>;

/**
 * Gió trung bình 10m (m/s) — NEO ĐÚNG BỐN BẬC CỦA CHỦ (chốt lại 11/09):
 * dưới 4 xanh · 4–6 vàng · 6–8 cam · trên 8 đỏ.
 *
 * Vẫn chuyển dần giữa các mốc (5,9 và 6,1 chỉ khác nhau một chút, không nhảy
 * hẳn màu), nhưng ĐÚNG tại 4 phải đã là vàng và đúng tại 6 phải đã là cam —
 * trước đây 4,5 m/s còn ra xanh ngả vàng nên nhìn tưởng vẫn "gió tốt".
 */
const MOC_GIO: Moc = [
  [0, "#d1fae5"],
  [2, "#86efac"],
  [3.6, "#4ade80"],
  [4, "#fde047"],
  [5, "#facc15"],
  [6, "#fb923c"],
  [7, "#f97316"],
  [8, "#ef4444"],
  [10, "#b91c1c"],
  [13, "#7f1d1d"],
];

/** Gió giật (m/s). */
const MOC_GIAT: Moc = [
  [0, "#d1fae5"],
  [6, "#86efac"],
  [8, "#4ade80"],
  [10, "#fde047"],
  [12, "#fbbf24"],
  [14, "#f87171"],
  [16, "#ef4444"],
  [18, "#b91c1c"],
  [22, "#7f1d1d"],
];

function hexSangRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbSangHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}

/** Nội suy tuyến tính giữa hai mốc màu kề nhau. */
function troiMau(v: number, moc: Moc): string {
  if (!Number.isFinite(v) || v <= moc[0][0]) return moc[0][1];
  for (let i = 1; i < moc.length; i++) {
    if (v <= moc[i][0]) {
      const [x0, c0] = moc[i - 1];
      const [x1, c1] = moc[i];
      const f = (v - x0) / (x1 - x0);
      const a = hexSangRgb(c0);
      const b = hexSangRgb(c1);
      return rgbSangHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    }
  }
  return moc[moc.length - 1][1];
}

/** Màu nền ô gió trung bình. */
export function mauGio(v: number): string {
  return troiMau(v, MOC_GIO);
}

/** Màu nền ô gió giật. */
export function mauGiat(v: number): string {
  return troiMau(v, MOC_GIAT);
}

/** Chữ đen trên nền sáng, trắng trên nền tối — để số luôn đọc được. */
export function chuTrenNen(hex: string): string {
  const [r, g, b] = hexSangRgb(hex);
  const sang = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return sang > 0.6 ? "#0f172a" : "#ffffff";
}

/** Cặp style sẵn cho ô bảng: nền + màu chữ. */
export function styleGio(v: number): { background: string; color: string } {
  const bg = mauGio(v);
  return { background: bg, color: chuTrenNen(bg) };
}

export function styleGiat(v: number): { background: string; color: string } {
  const bg = mauGiat(v);
  return { background: bg, color: chuTrenNen(bg) };
}
