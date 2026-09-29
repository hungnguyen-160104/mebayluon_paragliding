// lib/baobay/phan-tich-cao.ts
/**
 * PHÂN TÍCH GIÓ TRÊN CAO + ĐỌC SKEW-T cho thư dự báo 20h (chủ 29/09/2026:
 * "cho tôi ảnh biểu đồ gió và skew-T kèm phân tích. Phân tích gió trên cao và
 * cảnh báo thêm").
 *
 * Thuần tính, không mạng — nơi gọi truyền số liệu giờ (NgayThoiTiet.gio) và
 * một lát thám không (ThamKhong) vào.
 *
 * Mực áp suất đổi ra độ cao cho người đọc: 925 hPa ≈ 800 m, 850 hPa ≈ 1.500 m,
 * 700 hPa ≈ 3.000 m (mô hình cấp độ cao thật thì dùng số thật).
 */
import { dayMay, duongBotKhi, lopNghichNhiet, tranBotKhi, type MucSkewT } from "./skew-t";
import { huongDayDuVi, type GioThoiTiet } from "./thoi-tiet";

/** Khung giờ bay dùng để phân tích (giờ Việt Nam, tính cả hai đầu). */
export const GIO_PHAN_TICH: [number, number] = [8, 16];

export type TangGio = {
  /** Nhãn hiển thị: "Mặt đất (10 m)", "~800 m (925 hPa)"... */
  nhan: string;
  /** Độ cao đại diện (m trên mực biển), null với mặt đất. */
  cao: number | null;
  min: number;
  max: number;
  /** Hướng trội (độ, hướng GIÓ THỔI TỚI TỪ) — null khi lặng. */
  huong: number | null;
};

export type PhanTichGioCao = {
  tang: TangGio[];
  /** Câu nhận xét (đã viết thành lời), theo thứ tự đọc. */
  nhanXet: string[];
  /** Cảnh báo — hiện đỏ trong thư. */
  canhBao: string[];
};

const trongKhung = (g: GioThoiTiet) => {
  const h = Number(g.gio.slice(11, 13));
  return h >= GIO_PHAN_TICH[0] && h <= GIO_PHAN_TICH[1];
};

/** Hướng trội có trọng số theo tốc độ (trung bình vectơ). */
function huongTroi(ds: Array<{ v: number; d: number }>): number | null {
  let x = 0;
  let y = 0;
  for (const { v, d } of ds) {
    if (!(v > 0.3) || !Number.isFinite(d)) continue;
    const r = (d * Math.PI) / 180;
    x += Math.sin(r) * v;
    y += Math.cos(r) * v;
  }
  if (Math.hypot(x, y) < 0.01) return null;
  const d = (Math.atan2(x, y) * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

/** Góc lệch nhỏ nhất giữa hai hướng (0–180°). */
export function lechHuong(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

const lamTron = (n: number) => Math.round(n * 10) / 10;
const soVN = (n: number) => lamTron(n).toLocaleString("vi-VN");
const khoang = (a: number, b: number) => (Math.round(a) === Math.round(b) ? `${soVN(b)}` : `${soVN(a)}–${soVN(b)}`);
const caoVN = (m: number) => `${(Math.round(m / 50) * 50).toLocaleString("vi-VN")} m`;

/**
 * GIÓ THEO TẦNG trong khung giờ bay: mặt đất, 925, 850, 700 hPa — tốc độ nhỏ
 * nhất/lớn nhất và hướng trội, rồi rút ra nhận xét và cảnh báo.
 *
 * `altCat`: độ cao bãi cất (m) — để biết tầng nào là tầng mình bay.
 */
export function phanTichGioCao(gio: GioThoiTiet[], altCat: number): PhanTichGioCao {
  const ds = gio.filter(trongKhung);
  const tang: TangGio[] = [];
  const nhanXet: string[] = [];
  const canhBao: string[] = [];
  if (!ds.length) return { tang, nhanXet, canhBao };

  const tb = (k: keyof GioThoiTiet) => {
    const v = ds.map((g) => g[k]).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  const mkTang = (nhan: string, cao: number | null, vK: keyof GioThoiTiet, dK: keyof GioThoiTiet): TangGio | null => {
    const cap = ds
      .map((g) => ({ v: g[vK] as number | undefined, d: g[dK] as number | undefined }))
      .filter((x): x is { v: number; d: number } => typeof x.v === "number" && Number.isFinite(x.v) && typeof x.d === "number");
    if (!cap.length) return null;
    return {
      nhan,
      cao,
      min: Math.min(...cap.map((x) => x.v)),
      max: Math.max(...cap.map((x) => x.v)),
      huong: huongTroi(cap),
    };
  };

  const c925 = tb("h925") ?? 800;
  const c850 = tb("h850") ?? 1500;
  const matDat = mkTang("Mặt đất (10 m)", null, "gio10m", "huong");
  const t925 = mkTang(`~${caoVN(c925)} (925 hPa)`, c925, "gio925", "huong925");
  const t850 = mkTang(`~${caoVN(c850)} (850 hPa)`, c850, "gio850", "huong850");
  const t700 = mkTang("~3.000 m (700 hPa)", 3000, "gio700", "huong700");
  for (const t of [matDat, t925, t850, t700]) if (t) tang.push(t);

  const giatMax = Math.max(...ds.map((g) => g.giat ?? 0));
  const tenHuong = (t: TangGio | null) => (t?.huong == null ? "lặng/đổi hướng" : huongDayDuVi(t.huong).toUpperCase());

  for (const t of tang) {
    nhanXet.push(`${t.nhan}: gió ${tenHuong(t)} ${khoang(t.min, t.max)} m/s`);
  }

  /** Tầng nằm ngay trên bãi cất — tầng khách bay thật. */
  const tangBay = [t925, t850].find((t) => t && t.cao !== null && t.cao >= altCat + 150) ?? t925 ?? t850;

  if (matDat && giatMax - matDat.max >= 5) {
    canhBao.push(`Gió giật mạnh: giật tới ${soVN(giatMax)} m/s trong khi gió nền ${soVN(matDat.max)} m/s — không khí rối, cẩn thận lúc cất và hạ cánh.`);
  }

  if (tangBay && tangBay.max >= 8) {
    canhBao.push(
      `Gió tầng ${tangBay.nhan.replace(/ \(.*\)/, "")} mạnh ${soVN(tangBay.max)} m/s: lên cao dễ bị gió thổi trôi ra sau bãi, khó bay ngược gió về bãi hạ — giữ độ cao thấp, không bay xa.`,
    );
  } else if (tangBay && tangBay.max >= 6) {
    nhanXet.push(`Gió ${tangBay.nhan.replace(/ \(.*\)/, "")} khá (${soVN(tangBay.max)} m/s) — bay được nhưng chú ý độ trôi khi lên cao.`);
  }

  /** Gió mặt đất dưới 2,5 m/s thì hướng đổi không đáng kể — chỉ xét khi cả hai tầng đều có gió thật. */
  if (matDat && tangBay && matDat.huong != null && tangBay.huong != null && tangBay.max >= 4 && matDat.max >= 2.5) {
    const lech = lechHuong(matDat.huong, tangBay.huong);
    if (lech >= 90) {
      canhBao.push(
        `Đứt gió (wind shear): mặt đất gió ${tenHuong(matDat)}, lên ${tangBay.nhan.replace(/ \(.*\)/, "")} đổi sang ${tenHuong(tangBay)} (lệch ${Math.round(lech)}°) — rối khí ở lớp giao nhau, dù dễ bị sập mép khi xuyên qua.`,
      );
    } else if (lech >= 45) {
      nhanXet.push(`Hướng gió xoay ${Math.round(lech)}° từ mặt đất lên ${tangBay.nhan.replace(/ \(.*\)/, "")} — gió trên cao không trùng gió trên bãi.`);
    }
  }

  if (matDat && tangBay && tangBay.max - matDat.max >= 5) {
    canhBao.push(`Gió tăng nhanh theo độ cao: mặt đất ${soVN(matDat.max)} m/s nhưng ${tangBay.nhan.replace(/ \(.*\)/, "")} ${soVN(tangBay.max)} m/s — đo gió ở bãi sẽ thấy nhẹ hơn thực tế trên không.`);
  }

  if (t700 && t700.max >= 12) {
    canhBao.push(`Gió ~3.000 m rất mạnh (${soVN(t700.max)} m/s): không bay cao/bay đường dài; thermal bị cắt ngang, mây phát triển lệch.`);
  }

  if (!canhBao.length && tangBay && tangBay.max < 6 && (!matDat || giatMax < matDat.max + 4)) {
    nhanXet.push("Gió trên cao ổn định, không có dấu hiệu đứt gió — thuận lợi cho bay đôi.");
  }

  return { tang, nhanXet, canhBao };
}

export type PhanTichSkewT = {
  /** Giờ của lát thám không, "12:00". */
  gio: string;
  dayMayCao: number | null;
  tranThermal: number | null;
  nghichNhiet: Array<{ tu: number; den: number }>;
  nhanXet: string[];
  canhBao: string[];
};

/**
 * ĐỌC SKEW-T một giờ (thường 12h): đáy mây, trần thermal, lớp nghịch nhiệt
 * dưới 3.500 m, độ ẩm tầng giữa, độ bất ổn — viết thành lời.
 */
export function phanTichSkewT(muc: MucSkewT[], gio: string, altCat: number, xacSuatDong = 0): PhanTichSkewT {
  const ra: PhanTichSkewT = { gio: gio.slice(11, 16), dayMayCao: null, tranThermal: null, nghichNhiet: [], nhanXet: [], canhBao: [] };
  const m = muc.filter((x) => Number.isFinite(x.nhiet) && Number.isFinite(x.suong)).sort((a, b) => a.cao - b.cao);
  if (m.length < 3) return ra;

  /** Mực SÁT bãi cất nhất (trên hoặc dưới) — bọt khí xuất phát từ tầng khách thật sự cất cánh. */
  const batDau = m.reduce((a, b) => (Math.abs(b.cao - altCat) < Math.abs(a.cao - altCat) ? b : a), m[0]);
  const bot = duongBotKhi({ ap: batDau.ap, cao: batDau.cao, nhiet: batDau.nhiet, suong: batDau.suong }, m.map((x) => ({ ap: x.ap, cao: x.cao })));
  ra.dayMayCao = batDau.cao + dayMay(batDau.nhiet, batDau.suong);
  ra.tranThermal = tranBotKhi(bot, m.map((x) => ({ cao: x.cao, nhiet: x.nhiet })));
  ra.nghichNhiet = lopNghichNhiet(m)
    .filter((l) => l.tu < 3500 && l.den > altCat)
    .map((l) => ({ tu: l.tu, den: l.den }));

  const cv = (n: number) => `${(Math.round(n / 50) * 50).toLocaleString("vi-VN")} m`;
  if (ra.dayMayCao !== null) {
    if (ra.dayMayCao <= altCat + 100) {
      ra.canhBao.push(`Đáy mây ~${cv(ra.dayMayCao)} — ngang hoặc thấp hơn bãi cất ${cv(altCat)}: bãi dễ bị mây phủ, không thấy bãi hạ.`);
    } else {
      ra.nhanXet.push(`Đáy mây ~${cv(ra.dayMayCao)} (cao hơn bãi cất ${cv(ra.dayMayCao - altCat)}).`);
    }
  }
  if (ra.tranThermal !== null) {
    const tren = ra.tranThermal - altCat;
    ra.nhanXet.push(
      tren < 300
        ? `Trần thermal ~${cv(ra.tranThermal)} — gần như không có thermal trên bãi, bay lượn xuống là chính.`
        : `Trần thermal ~${cv(ra.tranThermal)} (cao hơn bãi ${cv(tren)})${tren > 1500 ? " — thermal mạnh buổi trưa" : ""}.`,
    );
  }
  const nghichThap = ra.nghichNhiet.find((l) => l.tu <= altCat + 800);
  if (nghichThap) {
    ra.nhanXet.push(`Lớp nghịch nhiệt ${cv(nghichThap.tu)}–${cv(nghichThap.den)}: nắp chặn thermal, không khí dưới lớp này có thể mù/ô nhiễm.`);
  }

  /** Độ giảm nhiệt 925→700 hPa (°C/km): > 7 là bất ổn, dễ đối lưu mạnh. */
  const a = m.find((x) => x.ap === 925);
  const b = m.find((x) => x.ap === 700);
  if (a && b && b.cao > a.cao) {
    const giam = ((a.nhiet - b.nhiet) / (b.cao - a.cao)) * 1000;
    if (giam >= 7 && xacSuatDong >= 30) {
      ra.canhBao.push(`Khí quyển bất ổn (giảm ${giam.toFixed(1).replace(".", ",")}°C/km) kèm khả năng dông ${xacSuatDong}% — mây tích phát triển nhanh buổi chiều, hạ cánh trước khi mây đen kéo tới.`);
    }
  }
  /** Tầng giữa ẩm (850 hPa: nhiệt − điểm sương ≤ 2°C) → mây dày. */
  const t850 = m.find((x) => x.ap === 850);
  if (t850 && t850.nhiet - t850.suong <= 2) {
    ra.nhanXet.push("Tầng ~1.500 m rất ẩm — trời nhiều mây, nắng yếu.");
  }
  return ra;
}
