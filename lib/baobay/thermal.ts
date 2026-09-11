/**
 * TIỀM NĂNG THERMAL CỦA MỘT NGÀY BAY DÙ LƯỢN — quy tắc chấm 0–100.
 *
 * Vì sao không lấy một chỉ số đơn lẻ (chủ hỏi 11/09: "thermal phụ thuộc LI
 * nhiều hơn chứ?"): thermal mình bay nằm ở 500–2.000 m đầu tiên, và nó sinh ra
 * từ HAI thứ cùng lúc — nắng đốt mặt đất tạo bọt khí nóng, và lớp khí phía trên
 * cho bọt ấy đi được bao xa. LI lại đo tới tận 500 hPa (~5.500 m): nó nói
 * bọt khí có bốc tiếp thành mây dông không, chứ không nói giữa trưa có nâng
 * để bay hay không. Số thật 12–13/09 ở Khau Phạ: LI +2,4 mà trần lớp xáo trộn
 * 1.000–1.200 m, nắng cả ngày — ngày thermal xanh đẹp; 15–16/09 LI +0,4 mà
 * trần 150–190 m vì mây dày — không có gì để bay. Chấm theo LI là sai cả hai.
 *
 * Nên quy tắc này gom SÁU yếu tố, mỗi yếu tố một đường cong riêng, rồi cộng có
 * trọng số — và có TRẦN CỨNG cho những thứ triệt tiêu thermal bất kể phần còn
 * lại đẹp tới đâu (không nắng, mưa, nghịch nhiệt thấp, gió xé):
 *
 *   BỐN YẾU TỐ CỘNG (có trọng số, tổng 100):
 *   1. NẮNG (20)          — bức xạ sóng ngắn và số phút nắng, trừ bớt khi mây dày:
 *                           KHÔNG NẮNG KHÔNG THERMAL, nhưng nắng thừa không làm
 *                           thermal mạnh thêm — nắng là cổng vào hơn là thước đo.
 *   2. TRẦN XÁO TRỘN (45) — độ cao lớp khí đang được đảo trộn: bọt lên tới đâu.
 *                           Đây là thước chính, nặng nhất.
 *   3. ĐỘ DỐC NHIỆT (20)  — lapse rate giữa hai mực ngay trên bãi: càng gần đoạn
 *                           nhiệt khô (≈1°C/100m) bọt càng lên khoẻ; ≤ 0 là nghịch nhiệt.
 *   4. ỔN ĐỊNH SÂU (15)   — LI và CAPE: trên cao có "kéo" thêm không, và có
 *                           kéo QUÁ thành dông không.
 *
 *   HAI YẾU TỐ CHỈ ĐƯỢC TRỪ (hệ số nhân 0–1, không cộng điểm):
 *   5. GIÓ TRÊN BÃI  — gió mực 500 m trên bãi xé thermal; lặng gió không phải là
 *                      "điểm cộng", chỉ là không bị trừ.
 *   6. ĐỘ KHÔ        — ẩm quá thì mây tích thấp, dễ thành mưa rào; khô thì để nguyên.
 *
 *   Bài học từ bản đầu (11/09): để gió lặng và LI cộng điểm thì ngày trần xáo
 *   trộn 185 m vẫn được "gánh" lên 61/100 "mạnh" — trong khi thực tế không có
 *   gì để bay. Yếu tố phụ chỉ được kéo xuống, không được kéo lên.
 *
 * Điểm NGÀY = trung bình của 3 giờ liên tiếp cao nhất trong khung bay — thermal
 * chỉ cần một khúc giữa trưa là đủ cho một ca bay; trung bình cả ngày thì sáng
 * sớm kéo tụt xuống trong khi trưa lên đẹp.
 *
 * Năm mức theo thang chủ: rất nhẹ · nhẹ · vừa · mạnh · rất mạnh. Đây là TIỀM
 * NĂNG, không phải "dễ chịu cho khách" — bay đôi thì "mạnh" đã là phải để ý,
 * "rất mạnh" kèm cảnh báo. Phần "êm hay xóc" bộ chấm điểm chuyên gia lo.
 *
 * Thuần tính, không mạng — kiểm bằng phép thử.
 */

import { gioTaiDoCao } from "./nhan-dinh";
import { GIO_BAY_DEN, GIO_BAY_TU, MUA_BAY, type GioThoiTiet, type SucThermal } from "./thoi-tiet";

export type YeuToThermal = {
  ma: "nang" | "tran" | "lapse" | "onDinh" | "gioCao" | "kho" | "giat";
  ten: string;
  /** 0–100 của riêng yếu tố này. */
  diem: number;
  trongSo: number;
  /** Con số nó dựa vào, viết cho người đọc. */
  ghiChu: string;
};

export type ThermalGio = {
  gio: string;
  diem: number;
  yeuTo: YeuToThermal[];
  /** Lý do bị áp trần (không nắng, mưa, nghịch nhiệt, gió xé) — rỗng nếu không. */
  tran: string[];
};

export type TiemNangThermal = {
  /** 0–100 — trung bình 3 giờ cao nhất trong khung bay. */
  diem: number;
  muc: SucThermal;
  /** Khung 3 giờ đó, "11:00–13:00". */
  khung: string | null;
  /** Số giờ trong khung bay có điểm ≥ 40 — tức là dùng được để bay thermal. */
  gioDung: number;
  /** Ba bốn câu ngắn nói vì sao ra mức này. */
  lyDo: string[];
  /** Những thứ phải cẩn thận: quá phát triển, thermal xanh, gió xé… */
  canhBao: string[];
  gio: ThermalGio[];
};

export const NHAN_MUC_THERMAL: Record<SucThermal, string> = {
  khong: "rất nhẹ",
  nhe: "nhẹ",
  vua: "vừa",
  manh: "mạnh",
  gat: "rất mạnh",
};

/**
 * Thang mức — hiệu chỉnh trên số thật 10 ngày của ba điểm (11/09): ngày nắng,
 * trần 1.000–1.200 m, LI +2 (kiểu ngày bay đôi đẹp nhất) rơi vào "vừa"; trần
 * 1.700–1.900 m với LI âm rơi vào "mạnh"; "rất mạnh" chỉ còn cho ngày trần trên
 * 2.000 m, dốc nhiệt gần đoạn nhiệt và bất ổn sâu — thứ vài tuần mới gặp một lần.
 */
export function mucTheoDiem(diem: number): SucThermal {
  if (diem < 25) return "khong";
  if (diem < 45) return "nhe";
  if (diem < 65) return "vua";
  if (diem < 82) return "manh";
  return "gat";
}

const co = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const kep = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/** Nội suy tuyến tính theo bảng mốc — đường cong viết thành bảng để người không lập trình đọc được. */
function duongCong(x: number, moc: Array<[number, number]>): number {
  if (x <= moc[0][0]) return moc[0][1];
  for (let i = 1; i < moc.length; i++) {
    if (x <= moc[i][0]) {
      const [x0, y0] = moc[i - 1];
      const [x1, y1] = moc[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return moc[moc.length - 1][1];
}

/**
 * ĐỘ DỐC NHIỆT (°C/100 m) giữa HAI MỰC THẤP NHẤT NẰM TRÊN BÃI.
 *
 * Ở Khau Phạ bãi cao 1.268 m nên mực 925 hPa (~750 m) nằm DƯỚI bãi — lấy nó
 * là đo lớp khí trong thung lũng, không phải lớp mình bay. Vì thế chọn theo độ
 * cao thật, không chọn theo tên mực. 700 hPa không có độ cao riêng, lấy ~3.000 m.
 */
export function doDocNhiet(g: GioThoiTiet, alt: number): { lapse: number; tu: number; den: number } | null {
  const muc: Array<{ h: number; t: number }> = [];
  if (co(g.h925) && co(g.t925) && g.h925 > alt + 50) muc.push({ h: g.h925, t: g.t925 });
  if (co(g.h850) && co(g.t850) && g.h850 > alt + 50) muc.push({ h: g.h850, t: g.t850 });
  if (co(g.t700)) muc.push({ h: 3000, t: g.t700 });
  muc.sort((a, b) => a.h - b.h);
  if (muc.length < 2) return null;
  const [a, b] = muc;
  if (b.h - a.h < 100) return null;
  return { lapse: ((a.t - b.t) / (b.h - a.h)) * 100, tu: a.h, den: b.h };
}

/** Chấm MỘT GIỜ. */
export function thermalGio(g: GioThoiTiet, alt = 0): ThermalGio {
  const yeuTo: YeuToThermal[] = [];
  const tran: string[] = [];
  const them = (y: Omit<YeuToThermal, "diem"> & { diem: number }) => yeuTo.push({ ...y, diem: Math.round(kep(y.diem)) });

  /* ---- 1. Nắng (30) — cổng vào ---- */
  const buXa = g.buXa ?? 0;
  const phutNang = (g.giayNang ?? 0) / 60;
  /** Lấy vế cao hơn của hai thước: bức xạ nói CƯỜNG ĐỘ, số phút nói THỜI LƯỢNG. */
  /**
   * Hai thước: bức xạ nói CƯỜNG ĐỘ, số phút nói THỜI LƯỢNG — lấy vế cao hơn,
   * nhưng số phút phải có bức xạ đi kèm (mô hình hay báo "60 phút nắng" dưới
   * 98% mây, đó là nắng lọt qua chứ không phải nắng đốt đất). Mây dày trên 60%
   * trừ thêm: mặt đất không nhận đủ nhiệt để bốc.
   */
  const may = g.may ?? 0;
  const truMay = 1 - 0.5 * Math.max(0, Math.min(1, (may - 60) / 40));
  const dNang =
    Math.max(
      duongCong(buXa, [[0, 0], [100, 15], [300, 45], [500, 75], [700, 100]]),
      duongCong(phutNang, [[0, 0], [10, 20], [30, 55], [50, 85], [60, 100]]) * Math.min(1, buXa / 500),
    ) * truMay;
  them({ ma: "nang", ten: "Nắng", trongSo: 20, diem: dNang, ghiChu: `${Math.round(buXa)} W/m² · ${Math.round(phutNang)} phút nắng · mây ${Math.round(may)}%` });
  if (buXa < 100 && phutNang < 10) tran.push("không có nắng");

  /* ---- 2. Trần lớp xáo trộn (30) ---- */
  const tranXT = co(g.tranThermal) ? Math.round(g.tranThermal) : null;
  if (tranXT !== null) {
    them({
      ma: "tran",
      ten: "Trần xáo trộn",
      trongSo: 45,
      diem: duongCong(tranXT, [[0, 0], [300, 10], [600, 25], [1000, 40], [1500, 65], [2000, 85], [2500, 100]]),
      ghiChu: `~${tranXT} m`,
    });
    /** Dưới 300 m là không có lớp xáo trộn nào đáng kể — bọt tách khỏi đất là tắt. */
    if (tranXT < 300) tran.push(`trần xáo trộn chỉ ~${tranXT} m`);
  } else {
    /** Không có trần thì mượn CAPE làm thước tạm — nói rõ là đoán. */
    const cape = g.cape ?? 0;
    them({ ma: "tran", ten: "Trần xáo trộn", trongSo: 45, diem: duongCong(cape, [[0, 20], [200, 40], [800, 65], [1500, 90]]), ghiChu: `không có số trần — đoán từ CAPE ${Math.round(cape)}` });
  }

  /* ---- 3. Độ dốc nhiệt tầng thấp (15) ---- */
  const dd = doDocNhiet(g, alt);
  if (dd) {
    them({
      ma: "lapse",
      ten: "Độ dốc nhiệt",
      trongSo: 20,
      diem: duongCong(dd.lapse, [[-0.3, 0], [0, 0], [0.3, 15], [0.5, 30], [0.65, 50], [0.8, 75], [0.95, 100]]),
      ghiChu: `${dd.lapse.toFixed(2).replace(".", ",")} °C/100 m, tầng ${Math.round(dd.tu)}–${Math.round(dd.den)} m`,
    });
    /** Nghịch nhiệt NGAY TRÊN BÃI (mực dưới còn trong 1.000 m trên bãi) là cái nắp: bọt lên tới đó là dừng. */
    if (dd.lapse <= 0 && dd.tu - alt < 1000) tran.push(`nghịch nhiệt ~${Math.round(dd.tu - alt)} m trên bãi`);
  } else {
    them({ ma: "lapse", ten: "Độ dốc nhiệt", trongSo: 20, diem: 45, ghiChu: "thiếu số tầng thấp — cho điểm trung tính" });
  }

  /* ---- 4. Ổn định sâu: LI + CAPE (10) ---- */
  const li = g.chiSoNang;
  const cape = g.cape ?? 0;
  if (co(li)) {
    them({
      ma: "onDinh",
      ten: "Ổn định (LI)",
      trongSo: 15,
      /** Ổn định vừa phải vẫn có thermal (nắp giữ cho nó gọn); bất ổn sâu thì KÉO thêm nhưng dễ quá phát triển. */
      diem: duongCong(li, [[-8, 70], [-4, 100], [-1, 90], [2, 70], [6, 45], [10, 25]]),
      ghiChu: `LI ${li > 0 ? "+" : ""}${li.toFixed(1).replace(".", ",")}${cape ? ` · CAPE ${Math.round(cape)}` : ""}`,
    });
  } else {
    them({ ma: "onDinh", ten: "Ổn định (LI)", trongSo: 15, diem: 60, ghiChu: "không có LI" });
  }

  /* ---- 5. Gió mực 500 m trên bãi — HỆ SỐ NHÂN, chỉ trừ ---- */
  const v500 = gioTaiDoCao(g, 500, alt);
  let heSoGio = 1;
  if (v500 !== null) {
    heSoGio = duongCong(v500, [[0, 1], [4, 1], [6, 0.85], [8, 0.6], [10, 0.35], [12, 0]]);
    them({ ma: "gioCao", ten: "Gió mực 500m", trongSo: 0, diem: heSoGio * 100, ghiChu: `${v500.toFixed(1)} m/s → hệ số ×${heSoGio.toFixed(2)}` });
    if (v500 >= 12) tran.push(`gió mực 500m ${v500.toFixed(0)} m/s xé thermal`);
  } else {
    them({ ma: "gioCao", ten: "Gió mực 500m", trongSo: 0, diem: 100, ghiChu: "không có gió tầng cao — không trừ" });
  }

  /* ---- 6. Độ khô — HỆ SỐ NHÂN, chỉ trừ khi ẩm ---- */
  let heSoKho = 1;
  if (co(g.diemSuong)) {
    const chenh = g.nhietDo - g.diemSuong;
    heSoKho = duongCong(chenh, [[0, 0.8], [2, 0.9], [4, 1], [20, 1]]);
    them({ ma: "kho", ten: "Độ khô", trongSo: 0, diem: heSoKho * 100, ghiChu: `chênh điểm sương ${chenh.toFixed(1)} °C → hệ số ×${heSoKho.toFixed(2)}` });
  } else {
    them({ ma: "kho", ten: "Độ khô", trongSo: 0, diem: 100, ghiChu: "không có điểm sương — không trừ" });
  }

  /**
   * GUST LÀ DẤU HIỆU THERMAL ĐANG LÀM VIỆC (luật chủ 11/09).
   *
   * "Gust vọt lên 10 m/s trên nền gió 3–4 là dấu hiệu thermal mạnh, vì gust
   * chủ yếu do hoạt động thermal cộng hưởng với gió chính." Đúng về vật lý:
   * bọt khí bốc lên kéo không khí tầng trên xuống thế chỗ, mà tầng trên gió
   * mạnh hơn — nên mặt đất thấy từng nhịp giật. Mô hình cho sẵn gió nền và
   * gió giật, chênh giữa hai số ấy là thước gián tiếp của đối lưu.
   *
   * CỘNG THƯỞNG CÓ TRẦN, không phải một yếu tố có trọng số: đây là dấu hiệu
   * xác nhận, không phải nguyên nhân — ban đêm hay ngày mưa cũng có giật mà
   * không có thermal nào, nên chỉ cộng khi ĐANG CÓ NẮNG, và cộng tối đa 8
   * điểm để nó không tự mình đẩy một ngày lên hạng.
   */
  const chenhGiat = g.giat - g.gio10m;
  let thuongGiat = 0;
  if (buXa >= 300 && chenhGiat >= 3) {
    thuongGiat = duongCong(chenhGiat, [[3, 0], [5, 4], [7, 7], [9, 8]]);
    them({
      ma: "giat",
      ten: "Nhịp giật",
      trongSo: 0,
      diem: (thuongGiat / 8) * 100,
      ghiChu: `giật ${g.giat.toFixed(1)} trên nền ${g.gio10m.toFixed(1)} m/s → +${thuongGiat.toFixed(0)} điểm`,
    });
  }

  /* ---- Mưa: triệt tiêu ---- */
  if (g.mua >= MUA_BAY) tran.push(`mưa ${g.mua.toFixed(1)} mm`);

  /* ---- Tổng có trọng số × hệ số, rồi ÁP TRẦN ---- */
  const cong = yeuTo.filter((y) => y.trongSo > 0);
  const tongTS = cong.reduce((t, y) => t + y.trongSo, 0);
  let diem = (cong.reduce((t, y) => t + y.diem * y.trongSo, 0) / tongTS) * heSoGio * heSoKho + thuongGiat;
  if (tran.some((x) => x.startsWith("không có nắng") || x.startsWith("mưa"))) diem = Math.min(diem, 12);
  else if (tran.some((x) => x.startsWith("trần xáo trộn chỉ"))) diem = Math.min(diem, 20);
  else if (tran.some((x) => x.startsWith("nghịch nhiệt"))) diem = Math.min(diem, 35);
  else if (tran.some((x) => x.startsWith("gió mực"))) diem = Math.min(diem, 25);

  return { gio: g.gio, diem: Math.round(kep(diem)), yeuTo, tran };
}

/** Chấm CẢ NGÀY. */
export function tiemNangThermal(
  gioCuaNgay: GioThoiTiet[],
  opts: { altBai?: number; gioBay?: [number, number] } = {},
): TiemNangThermal {
  const alt = opts.altBai ?? 0;
  const khung = opts.gioBay ?? [GIO_BAY_TU, GIO_BAY_DEN];
  const gio = gioCuaNgay
    .filter((g) => {
      const h = Number(g.gio.slice(11, 13));
      return h >= khung[0] && h <= khung[1];
    })
    .map((g) => thermalGio(g, alt));

  if (!gio.length) {
    return { diem: 0, muc: "khong", khung: null, gioDung: 0, lyDo: ["Chưa có số của khung giờ bay."], canhBao: [], gio: [] };
  }

  /** Khung 3 giờ liên tiếp cao nhất — ít hơn 3 giờ thì lấy hết. */
  let tot = { tu: 0, diem: -1 };
  for (let i = 0; i + 2 < gio.length; i++) {
    const tb = (gio[i].diem + gio[i + 1].diem + gio[i + 2].diem) / 3;
    if (tb > tot.diem) tot = { tu: i, diem: tb };
  }
  if (tot.diem < 0) tot = { tu: 0, diem: gio.reduce((t, x) => t + x.diem, 0) / gio.length };
  const diem = Math.round(kep(tot.diem));
  const cuoi = Math.min(tot.tu + 2, gio.length - 1);
  const khungTot = gio.length >= 3 ? `${gio[tot.tu].gio.slice(11, 16)}–${gio[cuoi].gio.slice(11, 16)}` : null;
  const gioDung = gio.filter((x) => x.diem >= 40).length;
  const muc = mucTheoDiem(diem);

  /* ---- Lý do: lấy yếu tố ở GIỜ ĐỈNH của khung tốt nhất ---- */
  const dinh = gio.slice(tot.tu, cuoi + 1).reduce((a, b) => (b.diem > a.diem ? b : a), gio[tot.tu]);
  const yt = (ma: YeuToThermal["ma"]) => dinh.yeuTo.find((y) => y.ma === ma);
  const lyDo: string[] = [];
  const nang = yt("nang");
  const tran = yt("tran");
  const lapse = yt("lapse");
  const on = yt("onDinh");
  if (nang) lyDo.push(nang.diem >= 70 ? `Nắng tốt lúc đỉnh (${nang.ghiChu}).` : nang.diem >= 35 ? `Nắng vừa (${nang.ghiChu}).` : `Thiếu nắng (${nang.ghiChu}) — không có gì đốt mặt đất.`);
  if (tran) {
    /** Mô hình có lúc không cấp trần lớp xáo trộn — nói thẳng là đang đoán, đừng ghép vào câu như thể có số. */
    const thieuTran = tran.ghiChu.startsWith("không có số trần");
    lyDo.push(
      thieuTran
        ? `Mô hình không cấp trần lớp xáo trộn — chấm tạm theo CAPE (${tran.ghiChu.replace("không có số trần — đoán từ CAPE ", "")}).`
        : tran.diem >= 70
          ? `Lớp xáo trộn sâu, trần ${tran.ghiChu} — bọt khí lên được cao.`
          : tran.diem >= 40
            ? `Trần xáo trộn ${tran.ghiChu} — đủ cho chuyến bay vừa phải.`
            : `Trần xáo trộn thấp (${tran.ghiChu}) — bọt khí lên tới đó là tắt.`,
    );
  }
  if (lapse) lyDo.push(lapse.diem >= 70 ? `Tầng thấp dốc nhiệt tốt (${lapse.ghiChu}) — bọt lên khoẻ.` : lapse.diem >= 40 ? `Độ dốc nhiệt trung bình (${lapse.ghiChu}).` : `Tầng thấp ổn định (${lapse.ghiChu}) — bọt khí lên yếu.`);
  /** LI kể bằng lời: chủ hỏi riêng về LI (11/09) nên phải nói rõ nó đứng ở đâu trong kết luận. */
  if (on) {
    const li = gioCuaNgay.find((g) => g.gio === dinh.gio)?.chiSoNang;
    lyDo.push(
      !co(li)
        ? `Trên cao: ${on.ghiChu}.`
        : li <= -4
          ? `Trên cao bất ổn sâu (${on.ghiChu}) — kéo thermal lên mạnh nhưng dễ thành dông.`
          : li <= -1
            ? `Trên cao bất ổn (${on.ghiChu}) — thermal được kéo thêm, mây tích đánh dấu.`
            : li <= 2
              ? `Trên cao hơi ổn định (${on.ghiChu}) — thermal gọn, ít quá phát triển.`
              : li <= 6
                ? `Trên cao ổn định (${on.ghiChu}) — thermal chỉ lên tới trần xáo trộn rồi dừng.`
                : `Trên cao rất ổn định (${on.ghiChu}) — nắp chặt, thermal yếu và ngắn.`,
    );
  }
  /** Nhịp giật: dấu hiệu nhìn thấy được của thermal, nói ra để phi công đối chiếu với bảng giờ. */
  const giat = dinh.yeuTo.find((y) => y.ma === "giat");
  if (giat) lyDo.push(`Nhịp giật mạnh hơn gió nền (${giat.ghiChu.split(" →")[0]}) — thermal đang làm việc.`);
  if (dinh.tran.length) lyDo.push(`Bị chặn bởi: ${dinh.tran.join(", ")}.`);

  /* ---- Cảnh báo ---- */
  const canhBao: string[] = [];
  const liDinh = gioCuaNgay.find((g) => g.gio === dinh.gio)?.chiSoNang;
  const capeMax = Math.max(0, ...gioCuaNgay.map((g) => g.cape ?? 0));
  if ((co(liDinh) && liDinh <= -4) || capeMax >= 1500) {
    canhBao.push("Bất ổn sâu — thermal dễ QUÁ PHÁT TRIỂN thành mây tích dày rồi dông chiều; bay sáng, hạ cánh trước khi mây đen dựng.");
  }
  const gDinh = gioCuaNgay.find((g) => g.gio === dinh.gio);
  if (gDinh && (gDinh.may ?? 0) < 25 && co(gDinh.diemSuong) && gDinh.nhietDo - gDinh.diemSuong >= 8 && diem >= 40) {
    canhBao.push("Thermal XANH (không mây tích đánh dấu) — khó nhìn nguồn, bám sườn nắng và điểm mốc địa hình.");
  }
  if (muc === "gat") canhBao.push("Rất mạnh: bay đôi chở khách sẽ xóc, khách dễ say — cân nhắc ca sớm hoặc muộn hơn giờ đỉnh.");
  const gioXe = gio.filter((x) => x.tran.some((t) => t.startsWith("gió mực")));
  if (gioXe.length) canhBao.push(`Gió mực 500m xé thermal ${gioXe[0].gio.slice(11, 16)}–${gioXe[gioXe.length - 1].gio.slice(11, 16)}.`);

  return { diem, muc, khung: khungTot, gioDung, lyDo, canhBao, gio };
}
