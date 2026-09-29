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
import { dayMay, duongBotKhi, lopNghichNhiet, tranBotKhi, type MucSkewT, type ThamKhong } from "./skew-t";
import { huongDayDuVi, type GioThoiTiet, type NgayThoiTiet } from "./thoi-tiet";
import { NHAN_MUC_THERMAL, type TiemNangThermal } from "./thermal";

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
    } else if (ra.dayMayCao <= altCat + 300) {
      ra.canhBao.push(`Đáy mây thấp ~${cv(ra.dayMayCao)} — chỉ cao hơn bãi cất ${cv(ra.dayMayCao - altCat)}: không lên cao được, dễ bị hút vào mây khi có thermal; canh mây trước khi cất.`);
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
    ra.nhanXet.push("Tầng ~1.500 m gần bão hoà (nhiệt độ sát điểm sương) — mây tích hình thành quanh độ cao này.");
  }
  return ra;
}

/* ================================================================== */
/* BẢNG CHO PHI CÔNG BAY ĐƠN (chủ 29/09/2026)                          */
/* ================================================================== */
/**
 * Thư gửi anh Toản là thư cho PHI CÔNG BAY ĐƠN, không phải thư vận hành bay
 * đôi. Chủ liệt kê đúng thứ họ cần, theo thứ tự: hướng gió · thermal (nhẹ /
 * vừa / mạnh) · hệ số nhiễu · mây phủ · trần mây và đỉnh mây · đứt gió ở tầng
 * nào · gió xiết ở tầng nào · mưa · dông · giờ đẹp nhất — rồi Skew-T và phân
 * tích. Mỗi mục một dòng, kèm mức (tốt / chú ý / xấu) để tô màu.
 */

export type MucDong = "tot" | "chuY" | "xau";
export type DongPhiCong = { nhan: string; giaTri: string; muc: MucDong };

export type PhanTichPhiCong = {
  dong: DongPhiCong[];
  skewT: PhanTichSkewT | null;
};

const gioCua = (s: string) => Number(s.slice(11, 13));
const trongGioBay = (s: string) => gioCua(s) >= GIO_PHAN_TICH[0] && gioCua(s) <= GIO_PHAN_TICH[1];
const v1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("vi-VN");
const m50 = (n: number) => `${(Math.round(n / 50) * 50).toLocaleString("vi-VN")} m`;

/** Vectơ gió (u, v) từ tốc độ và hướng gió TỚI TỪ. */
function uv(v: number, d: number): [number, number] {
  const r = (d * Math.PI) / 180;
  return [-v * Math.sin(r), -v * Math.cos(r)];
}

/**
 * Chia giờ bay thành các quãng cùng hướng (8 hướng) để nói "8–11h ĐÔNG BẮC
 * 1–2 m/s · 12–16h ĐÔNG 2–3 m/s" — phi công cần biết gió XOAY lúc nào.
 */
function huongTheoQuang(gio: GioThoiTiet[]): string {
  const ds = gio.filter((g) => trongGioBay(g.gio));
  const quang: Array<{ tu: number; den: number; ten: string; min: number; max: number }> = [];
  for (const g of ds) {
    const ten = g.gio10m < 0.8 ? "lặng" : huongDayDuVi(g.huong).toUpperCase();
    const h = gioCua(g.gio);
    const q = quang[quang.length - 1];
    if (q && q.ten === ten) {
      q.den = h;
      q.min = Math.min(q.min, g.gio10m);
      q.max = Math.max(q.max, g.gio10m);
    } else quang.push({ tu: h, den: h, ten, min: g.gio10m, max: g.gio10m });
  }
  /** Quãng lẻ 1 giờ kẹp giữa hai quãng cùng hướng là nhiễu — gộp cho gọn. */
  return quang
    .map((q) => `${q.tu === q.den ? `${q.tu}h` : `${q.tu}–${q.den}h`} ${q.ten}${q.ten === "lặng" ? "" : ` ${khoang(q.min, q.max)} m/s`}`)
    .join(" · ");
}

/**
 * ĐỨT GIÓ và GIÓ XIẾT theo tầng, đọc từ thám không từng giờ trong khung bay,
 * chỉ xét từ bãi cất lên 4.000 m.
 *  - Đứt gió: độ chênh vectơ gió giữa hai mực liền nhau chia độ dày (m/s mỗi
 *    km). ≥ 5 là nhiễu động đáng kể, ≥ 8 là mạnh.
 *  - GIÓ XIẾT (định nghĩa của chủ 29/09/2026): GIÓ CHÍNH (gió trung bình của
 *    mô hình ở mực áp suất — KHÔNG phải gió giật) ở tầng quanh bãi cất, từ bãi
 *    lên ~1.000 m trên bãi, MẠNH HƠN 6 m/s. Vì: 6 m/s đã vượt ngưỡng tiến của
 *    dù, lại cộng hưởng với địa hình núi (hiệu ứng venturi) nên thực tế có khi
 *    trên 10 m/s — dù không tiến được. Gió giật không tính là gió xiết.
 */
function tangDutGioXiet(tk: ThamKhong[], altCat: number) {
  let dut: { tu: number; den: number; tri: number; gio: number } | null = null;
  let xiet: { cao: number; v: number; ten: string; gio: number; soGio: number } | null = null;
  /** Gió chính mạnh nhất trong tầng bãi cất (kể cả khi chưa tới 6 m/s) — để nói "mạnh nhất X m/s". */
  let manhNhat: { cao: number; v: number; ten: string; gio: number } | null = null;
  const gioXiet = new Set<number>();
  const dutCacTang = new Map<string, { tu: number; den: number; tri: number; gio: number }>();
  for (const h of tk) {
    if (!trongGioBay(h.gio)) continue;
    const m = h.muc
      .filter((x) => x.gio !== null && x.huong !== null && x.cao >= altCat - 100 && x.cao <= 4000)
      .sort((a, b) => a.cao - b.cao);
    for (let i = 1; i < m.length; i++) {
      const a = m[i - 1];
      const b = m[i];
      const dz = (b.cao - a.cao) / 1000;
      if (dz <= 0.05) continue;
      const [ua, va] = uv(a.gio as number, a.huong as number);
      const [ub, vb] = uv(b.gio as number, b.huong as number);
      const tri = Math.hypot(ub - ua, vb - va) / dz;
      const k = `${a.ap}-${b.ap}`;
      const cu = dutCacTang.get(k);
      if (!cu || tri > cu.tri) dutCacTang.set(k, { tu: a.cao, den: b.cao, tri, gio: gioCua(h.gio) });
      if (!dut || tri > dut.tri) dut = { tu: a.cao, den: b.cao, tri, gio: gioCua(h.gio) };
    }
    for (const x of m) {
      if (x.cao > altCat + 1000) continue;
      const v = x.gio as number;
      const moc = { cao: x.cao, v, ten: huongDayDuVi(x.huong as number).toUpperCase(), gio: gioCua(h.gio) };
      if (!manhNhat || v > manhNhat.v) manhNhat = moc;
      if (v > 6) {
        gioXiet.add(gioCua(h.gio));
        if (!xiet || v > xiet.v) xiet = { ...moc, soGio: 0 };
      }
    }
  }
  const cacTangDut = [...dutCacTang.values()].filter((x) => x.tri >= 5).sort((a, b) => b.tri - a.tri);
  if (xiet) xiet.soGio = gioXiet.size;
  const cacGioXiet = [...gioXiet].sort((a, b) => a - b);
  return { dut, cacTangDut, xiet, manhNhat, cacGioXiet };
}

/** Đỉnh mây: từ đáy mây đi lên, lớp còn gần bão hoà (T − Td ≤ 3°C) liền mạch. */
function dinhMay(muc: MucSkewT[], dayMayCao: number | null): number | null {
  if (dayMayCao === null) return null;
  const m = muc.filter((x) => Number.isFinite(x.suong)).sort((a, b) => a.cao - b.cao);
  let dinh: number | null = null;
  for (const x of m) {
    if (x.cao < dayMayCao - 200) continue;
    if (x.nhiet - x.suong <= 3) dinh = x.cao;
    else if (dinh !== null) break;
  }
  return dinh;
}

export function phanTichPhiCong(n: NgayThoiTiet, tk: ThamKhong[] | null, altCat: number): PhanTichPhiCong {
  const dong: DongPhiCong[] = [];
  const ds = n.gio.filter((g) => trongGioBay(g.gio));
  const g12 = tk?.find((g) => g.gio.endsWith("T12:00")) ?? null;
  const skewT = g12 ? phanTichSkewT(g12.muc, g12.gio, altCat, n.xacSuatDongMax) : null;
  const tang = tk ? tangDutGioXiet(tk, altCat) : null;

  /* 1. Hướng gió */
  dong.push({ nhan: "Hướng gió", giaTri: huongTheoQuang(n.gio) || "—", muc: "tot" });

  /* 2. Thermal */
  const th = n.thermal as TiemNangThermal | undefined;
  const tran = skewT?.tranThermal ?? null;
  if (th) {
    const muc: MucDong = th.muc === "gat" ? "xau" : th.muc === "manh" ? "chuY" : "tot";
    dong.push({
      nhan: "Thermal",
      giaTri:
        `${NHAN_MUC_THERMAL[th.muc].toUpperCase()} (${th.diem}/100)` +
        (th.khung ? `, mạnh nhất ${th.khung}` : "") +
        (tran !== null && tran > altCat + 200 ? `, trần ~${m50(tran)}` : ""),
      muc,
    });
  }

  /* 3. Hệ số nhiễu (0–10): giật chênh + đứt gió + thermal gắt */
  const giatChenh = ds.length ? Math.max(...ds.map((g) => (g.giat ?? 0) - g.gio10m)) : 0;
  const dutMax = tang?.dut?.tri ?? 0;
  const thDiem = th ? (th.muc === "gat" ? 3 : th.muc === "manh" ? 2 : th.muc === "vua" ? 1 : 0) : 0;
  const diemNhieu = Math.min(10, Math.round(Math.min(4, giatChenh * 0.7) + Math.min(4, dutMax * 0.45) + thDiem));
  const lyDo: string[] = [`giật chênh gió nền ${v1(giatChenh)} m/s`];
  if (tang?.dut) lyDo.push(`đứt gió mạnh nhất ${v1(dutMax)} m/s/km`);
  if (thDiem >= 2) lyDo.push(`thermal ${NHAN_MUC_THERMAL[th!.muc]}`);
  dong.push({
    nhan: "Hệ số nhiễu",
    giaTri: `${diemNhieu}/10 — ${diemNhieu >= 7 ? "CAO" : diemNhieu >= 4 ? "VỪA" : "THẤP"} (${lyDo.join(", ")})`,
    muc: diemNhieu >= 7 ? "xau" : diemNhieu >= 4 ? "chuY" : "tot",
  });

  /* 4. Mây phủ */
  if (ds.length) {
    const tb = (k: "may" | "mayThap" | "mayGiua" | "mayCao") => {
      const v = ds.map((g) => g[k]).filter((x): x is number => typeof x === "number");
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    /** Mây tổng không thể ít hơn mây một tầng — số tổng của mô hình đã qua xử lý (bỏ mây ti), nên lấy số lớn nhất cho khỏi vô lý. */
    const tong = Math.max(tb("may") ?? 0, tb("mayThap") ?? 0, tb("mayGiua") ?? 0, tb("mayCao") ?? 0);
    const phan = [["thấp", tb("mayThap")], ["giữa", tb("mayGiua")], ["cao", tb("mayCao")]]
      .filter(([, v]) => v !== null)
      .map(([t, v]) => `${t} ${v}%`)
      .join(", ");
    const chiMayCao = (tb("mayThap") ?? 0) < 20 && (tb("mayGiua") ?? 0) < 20 && (tb("mayCao") ?? 0) >= 40;
    dong.push({
      nhan: "Mây phủ",
      giaTri: `${tong}%${phan ? ` (${phan})` : ""}${chiMayCao ? " — chủ yếu mây ti tầng cao, vẫn có nắng" : ""}`,
      muc: (tb("mayThap") ?? 0) >= 70 ? "xau" : tong >= 85 ? "chuY" : "tot",
    });
  }

  /* 5. Trần mây, đỉnh mây */
  if (skewT?.dayMayCao != null) {
    const dinh = g12 ? dinhMay(g12.muc, skewT.dayMayCao) : null;
    const tren = skewT.dayMayCao - altCat;
    dong.push({
      nhan: "Trần mây · đỉnh mây",
      giaTri: `đáy ~${m50(skewT.dayMayCao)} (cao hơn bãi ${m50(Math.max(0, tren))})` + (dinh !== null && dinh > skewT.dayMayCao ? ` · đỉnh ~${m50(dinh)}` : " · mây mỏng/không thành lớp") + " — lúc 12h",
      muc: tren <= 300 ? "xau" : tren <= 700 ? "chuY" : "tot",
    });
  }

  /* 6. Đứt gió, nhiễu động theo tầng */
  if (tang) {
    dong.push({
      nhan: "Đứt gió / nhiễu động",
      giaTri: tang.cacTangDut.length
        ? tang.cacTangDut
            .slice(0, 2)
            .map((x) => `${m50(x.tu)}–${m50(x.den)}: ${v1(x.tri)} m/s mỗi km (${x.gio}h)`)
            .join(" · ")
        : "không có tầng đứt gió đáng kể (dưới 5 m/s mỗi km)",
      muc: tang.cacTangDut.some((x) => x.tri >= 8) ? "xau" : tang.cacTangDut.length ? "chuY" : "tot",
    });
    /* 7. Gió xiết */
    const x = tang.xiet;
    const quangGio = (ds: number[]) => {
      const q: string[] = [];
      for (let i = 0; i < ds.length; i++) {
        let j = i;
        while (j + 1 < ds.length && ds[j + 1] === ds[j] + 1) j++;
        q.push(i === j ? `${ds[i]}h` : `${ds[i]}–${ds[j]}h`);
        i = j;
      }
      return q.join(", ");
    };
    dong.push({
      nhan: "Gió xiết",
      giaTri: x
        ? `CÓ — gió chính ~${m50(x.cao)} ${x.ten} ${v1(x.v)} m/s (mạnh nhất lúc ${x.gio}h; trên 6 m/s trong ${quangGio(tang.cacGioXiet)}). ` +
          `Qua núi có venturi, thực tế có thể trên 10 m/s — dù không tiến được.`
        : `không — gió chính tầng bãi cất (tới ~${m50(altCat + 1000)}) đều ≤ 6 m/s` +
          (tang.manhNhat ? `, mạnh nhất ${tang.manhNhat.ten} ${v1(tang.manhNhat.v)} m/s ở ~${m50(tang.manhNhat.cao)} lúc ${tang.manhNhat.gio}h` : ""),
      muc: x ? "xau" : tang.manhNhat && tang.manhNhat.v > 5 ? "chuY" : "tot",
    });
  }

  /* 8. Mưa */
  dong.push({
    nhan: "Mưa",
    giaTri:
      n.gioMua > 0
        ? `${n.gioMua} giờ${n.khungMua ? ` (${n.khungMua})` : ""}, ${v1(n.muaTongThat)} mm`
        : n.gioMuaBay > 0
          ? `mưa bay${n.khungMuaBay ? ` ${n.khungMuaBay}` : ""}`
          : "không mưa",
    muc: n.gioMua >= 2 ? "xau" : n.gioMua > 0 || n.gioMuaBay > 0 ? "chuY" : "tot",
  });

  /* 9. Dông */
  const cape = ds.length ? Math.max(...ds.map((g) => g.cape ?? 0)) : 0;
  const li = ds.map((g) => g.chiSoNang).filter((x): x is number => typeof x === "number");
  dong.push({
    nhan: "Dông",
    giaTri: `${n.xacSuatDongMax}%` + (cape > 0 ? ` · CAPE ${Math.round(cape).toLocaleString("vi-VN")} J/kg` : "") + (li.length ? ` · LI ${v1(Math.min(...li))}` : ""),
    muc: n.xacSuatDongMax >= 60 ? "xau" : n.xacSuatDongMax >= 30 ? "chuY" : "tot",
  });

  /* Phân tích Skew-T: bỏ câu đáy mây (đã có trong bảng), thêm độ bất ổn và độ dày mây. */
  if (skewT) {
    skewT.nhanXet = skewT.nhanXet.filter((x) => !x.startsWith("Đáy mây"));
    const liMin = li.length ? Math.min(...li) : null;
    if (cape >= 1500 || (liMin !== null && liMin <= -4)) {
      skewT.nhanXet.unshift(
        `Khí quyển RẤT BẤT ỔN (CAPE ${Math.round(cape).toLocaleString("vi-VN")} J/kg${liMin !== null ? `, LI ${v1(liMin)}` : ""}): thermal lên nhanh và gắt, mây tích có thể dựng thành mây dông sau trưa — bay sáng, canh đỉnh mây, hạ cánh sớm.`,
      );
    } else if (cape >= 500 || (liMin !== null && liMin <= -1)) {
      skewT.nhanXet.unshift(`Khí quyển bất ổn vừa (CAPE ${Math.round(cape).toLocaleString("vi-VN")} J/kg): thermal tốt, mây tích phát triển vừa phải.`);
    } else {
      skewT.nhanXet.unshift("Khí quyển khá ổn định: thermal yếu đến vừa, ít nguy cơ mây phát triển thành dông.");
    }
    const dinh = g12 && skewT.dayMayCao !== null ? dinhMay(g12.muc, skewT.dayMayCao) : null;
    if (dinh !== null && skewT.dayMayCao !== null && dinh - skewT.dayMayCao >= 1500) {
      skewT.nhanXet.push(`Lớp ẩm dày ${m50(dinh - skewT.dayMayCao)} trên đáy mây — mây tích phát triển cao, dễ thành mây đối lưu.`);
    }
    if (!skewT.nhanXet.some((x) => x.startsWith("Lớp nghịch nhiệt"))) {
      skewT.nhanXet.push("Không có lớp nghịch nhiệt chặn thermal dưới 3.500 m.");
    }
  }

  /* 10. Giờ đẹp nhất */
  dong.push({ nhan: "Giờ đẹp nhất", giaTri: n.khungDep ?? "không có khung nào đủ tốt", muc: n.khungDep ? "tot" : "xau" });

  return { dong, skewT };
}
