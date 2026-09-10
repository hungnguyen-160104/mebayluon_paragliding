// lib/baobay/chuyen-gia.ts

/**
 * CHUYÊN GIA KHÍ TƯỢNG BAY DÙ — chấm ĐIỂM ĐIỀU KIỆN BAY 0–100 từ dữ liệu mô hình.
 *
 * Khác gì với `chamGio` (xanh/vàng/đỏ) và `nhanDinhNgay` (câu chữ)?
 *  - `chamGio` là LUẬT CẤM: một thứ quá ngưỡng là đỏ. Nó trả lời "được phép
 *    bay không", không trả lời "bay có ĐẸP không".
 *  - `nhanDinhNgay` là câu chuyện cho người đọc.
 *  - Module này là CON SỐ: 9 yếu tố, mỗi yếu tố 0–100 theo đường cong riêng
 *    của bay đôi, nhân trọng số rồi cộng lại. Có số thì so được ngày này với
 *    ngày kia, mô hình này với mô hình kia, và — quan trọng nhất — đối chiếu
 *    được với sổ chấm thực tế của chủ để dần chỉnh trọng số.
 *
 * NGUYÊN TẮC CHẤM (tandem thương mại, không phải bay thể thao):
 *  - "Êm" điểm cao hơn "mạnh". Thermal gắt, gió 6 m/s, giật lớn là điểm THẤP dù
 *    phi công thể thao thích — khách ngồi trước không thích.
 *  - CÓ TRẦN: yếu tố nào chạm mức nguy hiểm (gió quá ngưỡng, ngược sườn, dông,
 *    mây trùm bãi) thì điểm cả giờ KHÔNG VƯỢT QUÁ 20 bất kể các yếu tố khác đẹp
 *    tới đâu. Trung bình có trọng số đơn thuần sẽ cho "gió 10 m/s nhưng nắng
 *    đẹp" ra 60 điểm — vô nghĩa và nguy hiểm.
 *  - MỖI ĐIỂM CÓ GHI CHÚ SỐ: người đọc kiểm được, và chỗ máy sai lộ ra ngay.
 *
 * Phần này TÍNH THUẦN, không mạng, không cơ sở dữ liệu — kiểm bằng phép thử.
 */

import { gioTaiDoCao } from "./nhan-dinh";
import {
  chiSoBay,
  GIO_BAY_DEN,
  GIO_BAY_TU,
  huongChu,
  lechGoc,
  tranMay,
  trongCung,
  xacSuatMuaThat,
  type GioThoiTiet,
  type LuatHuong,
  type NgayThoiTiet,
  type NguongBay,
} from "./thoi-tiet";

/* ================================================================== */
/* Kiểu                                                                */
/* ================================================================== */

export type XepLoai = "tot" | "kha" | "hanChe" | "khongBay";

export type ThanhPhan = {
  /** Mã ổn định để phép thử và giao diện tra: "gio", "giat", "huong"… */
  ma: string;
  ten: string;
  /** 0–100, càng cao càng đẹp cho bay đôi. */
  diem: number;
  /** Trọng số trong tổng — cộng lại bằng 100. */
  trongSo: number;
  /** Con số nó dựa vào, viết cho người đọc. */
  ghiChu: string;
  /** Yếu tố này chạm mức NGUY HIỂM — kéo trần cả giờ xuống 20. */
  nguyHiem: boolean;
};

export type DanhGiaGio = {
  gio: string;
  diem: number;
  xepLoai: XepLoai;
  thanhPhan: ThanhPhan[];
  /** Lý do đã kéo trần xuống (nếu có) — hiện thẳng cho người đọc. */
  nguyHiem: string[];
};

export type DanhGiaNgay = {
  ngay: string;
  /** Điểm ngày = trung bình của 3 giờ liên tiếp ĐẸP NHẤT — khách chỉ cần một khung đẹp. */
  diem: number;
  xepLoai: XepLoai;
  /** Khung 3 giờ đẹp nhất, "08:00–10:00". */
  khungTotNhat: string | null;
  /** Số giờ ≥ 55 điểm (bay được có chất lượng). */
  gioBayDuoc: number;
  /** Điểm trung bình cả khung bay 7–17h — để thấy ngày "đẹp một khúc" hay "đẹp cả ngày". */
  diemTrungBinh: number;
  /** 0–100: dữ liệu đủ không, dự báo xa không, áp suất có đang chuyển không. */
  doTinCay: number;
  lyDoTinCay: string[];
  gio: DanhGiaGio[];
};

export const NHAN_XEP_LOAI: Record<XepLoai, string> = {
  tot: "😊 TỐT",
  kha: "🙂 KHÁ",
  hanChe: "😐 HẠN CHẾ",
  khongBay: "😞 KHÔNG BAY",
};

export function xepLoaiTheoDiem(diem: number): XepLoai {
  if (diem >= 75) return "tot";
  if (diem >= 55) return "kha";
  if (diem >= 35) return "hanChe";
  return "khongBay";
}

/* ================================================================== */
/* Tiện ích                                                            */
/* ================================================================== */

const co = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const kep = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/**
 * NỘI SUY TUYẾN TÍNH theo bảng mốc [x, điểm]. Đường cong viết thành bảng để
 * người không lập trình cũng đọc được: "gió 4 m/s là 100, 6 là 60, 8 là 0".
 */
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

/* ================================================================== */
/* Chấm một giờ                                                        */
/* ================================================================== */

export function danhGiaGio(
  g: GioThoiTiet,
  nguong: NguongBay,
  opts: { luatHuong?: LuatHuong; altBai?: number } = {},
): DanhGiaGio {
  const tp: ThanhPhan[] = [];
  const nguyHiem: string[] = [];
  const them = (t: Omit<ThanhPhan, "nguyHiem"> & { nguyHiem?: boolean }) => {
    tp.push({ ...t, diem: Math.round(kep(t.diem)), nguyHiem: Boolean(t.nguyHiem) });
    if (t.nguyHiem) nguyHiem.push(`${t.ten}: ${t.ghiChu}`);
  };
  const luat = opts.luatHuong;
  const alt = opts.altBai ?? 0;

  /* ---- 1. Gió mặt đất (25) ----
   * Bay đôi đẹp nhất ở 1,5–4 m/s: đủ dựng dù, chưa lôi người. Dưới 1,5 cất
   * cánh phải chạy dài (trừ điểm), trên 4 bắt đầu khó với khách. Thuận sườn thì
   * nới: 4–6 m/s vào sườn là ngày thermal đẹp (luật chủ). */
  const huongTot = Boolean(luat?.tot && trongCung(g.huong, luat.tot));
  const cong = huongTot
    ? ([[0, 65], [1.5, 100], [4, 100], [6, 85], [nguong.gioDo, 30], [nguong.gioDo + 1, 0]] as Array<[number, number]>)
    : ([[0, 65], [1.5, 100], [nguong.gioXanh, 100], [6, 55], [nguong.gioDo, 25], [nguong.gioDo + 1, 0]] as Array<[number, number]>);
  them({
    ma: "gio",
    ten: "Gió mặt đất",
    trongSo: 25,
    diem: duongCong(g.gio10m, cong),
    ghiChu: `${g.gio10m.toFixed(1)} m/s${huongTot ? " (thuận sườn, nới ngưỡng)" : ""}`,
    nguyHiem: g.gio10m > nguong.gioDo,
  });

  /* ---- 2. Gió giật (10) ----
   * Theo thang chủ: dưới 14 gần như không trừ; 14–18 trừ mạnh; trên 18 là cấm.
   * Thêm HỆ SỐ GIẬT (giật/gió nền): nền 2 mà giật 9 là từng đợt ập tới — xóc
   * hơn nền 6 giật 9 dù con số giật bằng nhau. */
  let diemGiat = duongCong(g.giat, [[0, 100], [6, 100], [10, 92], [14, 75], [18, 30], [nguong.giatDo + 0.1, 0]]);
  const heSo = g.gio10m >= 1.5 ? g.giat / g.gio10m : 0;
  if (heSo > 3 && g.giat >= 8) diemGiat -= 15;
  them({
    ma: "giat",
    ten: "Gió giật",
    trongSo: 10,
    diem: diemGiat,
    ghiChu: `${g.giat.toFixed(1)} m/s${heSo > 3 && g.giat >= 8 ? ` — hệ số giật ${heSo.toFixed(1)}×, từng đợt` : ""}`,
    nguyHiem: g.giat > nguong.giatDo,
  });

  /* ---- 3. Hướng gió (15) ----
   * Ở núi, hướng quyết định ngang tốc độ. Ngược sườn hay xiết là 0 — không có
   * "một phần". Chưa khai luật thì 80: không biết, nên không dám cho 100. */
  {
    const manh = g.gio10m > 6;
    const xiet = Boolean(luat?.xiet?.length && manh && luat.xiet.some((h) => Math.abs(lechGoc(g.huong, h)) <= 22.5));
    const xau = Boolean(luat?.xau && trongCung(g.huong, luat.xau));
    let diem = 80;
    let ghi = `${huongChu(g.huong)} — chưa khai luật hướng`;
    if (xau) {
      diem = 0;
      ghi = `${huongChu(g.huong)} — NGƯỢC SƯỜN`;
    } else if (xiet) {
      diem = 0;
      ghi = `${huongChu(g.huong)} mạnh — GIÓ XIẾT luồn khe`;
    } else if (huongTot) {
      diem = 100;
      ghi = `${huongChu(g.huong)} — thuận sườn`;
    } else if (luat?.tot) {
      diem = 55;
      ghi = `${huongChu(g.huong)} — chéo sườn`;
    }
    them({ ma: "huong", ten: "Hướng gió", trongSo: 15, diem, ghiChu: ghi, nguyHiem: xau || xiet });
  }

  /* ---- 4. Gió trên cao (15) ----
   * Thứ bảng mặt đất không hiện. Mực 500m trên bãi: ≤5 êm, 8 bắt đầu xé
   * thermal, 12 là bị thổi lùi. Cắt gió (mặt đất lặng, 300m đã có gió) trừ thêm. */
  {
    const v500 = gioTaiDoCao(g, 500, alt);
    const v300 = gioTaiDoCao(g, 300, alt);
    if (v500 !== null) {
      let diem = duongCong(v500, [[0, 100], [5, 100], [8, 65], [12, 15], [14, 0]]);
      let ghi = `mực 500m ${v500.toFixed(1)} m/s`;
      if (v300 !== null && v300 - g.gio10m > 4) {
        diem -= 20;
        ghi += ` — đứt gió (300m: ${v300.toFixed(1)}, đất: ${g.gio10m.toFixed(1)})`;
      }
      them({ ma: "gioCao", ten: "Gió trên cao", trongSo: 15, diem, ghiChu: ghi, nguyHiem: v500 > 12 });
    } else {
      them({ ma: "gioCao", ten: "Gió trên cao", trongSo: 15, diem: 75, ghiChu: "mô hình không cấp — cho điểm trung tính" });
    }
  }

  /* ---- 5. Thermal & ổn định (10) ----
   * Cho bay đôi: trần 500–1500m với LI ≥ 0 là đẹp nhất (lift đều, không xóc).
   * Trần thấp là chuyến ngắn (trừ ít), trần quá cao + bất ổn là gắt (trừ nhiều). */
  {
    const cs = chiSoBay(g);
    const li = g.chiSoNang;
    let diem: number;
    let ghi: string;
    if (cs.tran === null) {
      diem = 75;
      ghi = "không có trần lớp xáo trộn";
    } else {
      diem = duongCong(cs.tran, [[0, 60], [300, 70], [500, 100], [1500, 100], [2200, 65], [3000, 40]]);
      ghi = `trần ~${cs.tran}m`;
    }
    if (co(li)) {
      if (li <= -4) {
        diem -= 35;
        ghi += `, LI ${li.toFixed(1)} rất bất ổn`;
      } else if (li <= -2) {
        diem -= 20;
        ghi += `, LI ${li.toFixed(1)} bất ổn`;
      } else if (li >= 6) {
        diem -= 10;
        ghi += `, LI ${li.toFixed(1)} rất ổn định (ít lift)`;
      } else ghi += `, LI ${li.toFixed(1)}`;
    }
    if ((g.buXa ?? 0) < 50) ghi += " — chưa có nắng";
    them({ ma: "thermal", ten: "Thermal / ổn định", trongSo: 10, diem, ghiChu: ghi });
  }

  /* ---- 6. Trần mây & mù (10) ---- */
  {
    const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
    const mayThap = g.mayThap ?? 0;
    const suongMu = (g.am ?? 0) >= 98 && mayThap >= 70 && cm !== null && cm < 150;
    let diem = 100;
    let ghi = "trời quang tầng thấp";
    let nguy = false;
    if (cm !== null) {
      diem = mayThap >= 70 ? duongCong(cm, [[0, 0], [150, 0], [300, 45], [500, 75], [800, 100]]) : duongCong(cm, [[0, 60], [300, 80], [600, 100]]);
      ghi = `trần mây ~${cm}m trên bãi, mây thấp ${Math.round(mayThap)}%`;
      nguy = mayThap >= 70 && cm < nguong.tranMayDo;
    }
    if (suongMu) {
      diem = 0;
      ghi = `sương mù (ẩm ${Math.round(g.am ?? 0)}%)`;
      nguy = true;
    }
    them({ ma: "tranMay", ten: "Trần mây / mù", trongSo: 10, diem, ghiChu: ghi, nguyHiem: nguy });
  }

  /* ---- 7. Mưa & dông (15) ---- */
  {
    const cs = chiSoBay(g);
    const pMua = xacSuatMuaThat(g.xacSuatMua, g.mua);
    let diem = 100;
    const ghi: string[] = [];
    let nguy = false;
    if (g.mua > nguong.muaDo) {
      diem = 0;
      nguy = true;
      ghi.push(`mưa ${g.mua.toFixed(1)} mm`);
    } else if (g.mua > 0.1) {
      diem = 70;
      ghi.push("mưa lác đác");
    } else if (pMua >= 75) {
      diem = 60;
      ghi.push(`khả năng mưa ${pMua}%`);
    }
    if (cs.xacSuatDong >= 40) {
      diem = 0;
      nguy = true;
      ghi.push(`dông ${cs.xacSuatDong}%`);
    } else if (cs.xacSuatDong >= 20) {
      diem = Math.min(diem, 50);
      ghi.push(`dông ${cs.xacSuatDong}%`);
    }
    them({ ma: "mua", ten: "Mưa / dông", trongSo: 15, diem, ghiChu: ghi.join(", ") || "không mưa, không dông", nguyHiem: nguy });
  }

  /* ---- Tổng: trung bình có trọng số, rồi ÁP TRẦN nếu có yếu tố nguy hiểm ---- */
  const tongTS = tp.reduce((t, x) => t + x.trongSo, 0);
  let diem = tp.reduce((t, x) => t + x.diem * x.trongSo, 0) / tongTS;
  if (nguyHiem.length) diem = Math.min(diem, 20);
  diem = Math.round(kep(diem));
  return { gio: g.gio, diem, xepLoai: xepLoaiTheoDiem(diem), thanhPhan: tp, nguyHiem };
}

/* ================================================================== */
/* Chấm một ngày                                                       */
/* ================================================================== */

export function danhGiaNgay(
  ngay: NgayThoiTiet,
  nguong: NguongBay,
  opts: {
    luatHuong?: LuatHuong;
    altBai?: number;
    /** Ngày thứ mấy trong dãy dự báo (0 = hôm nay) — càng xa càng kém tin. */
    thuTu?: number;
    /** Ngày liền trước — để xem áp suất có đang tụt (dự báo kém tin hơn). */
    ngayTruoc?: NgayThoiTiet | null;
  } = {},
): DanhGiaNgay {
  const trongKhung = ngay.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= GIO_BAY_TU && h <= GIO_BAY_DEN;
  });
  const gio = trongKhung.map((g) => danhGiaGio(g, nguong, opts));

  /** Khung 3 giờ liên tiếp đẹp nhất — khách chỉ cần một khung, không cần cả ngày. */
  let tot = { tu: -1, diem: -1 };
  for (let i = 0; i + 2 < gio.length; i++) {
    const tb = (gio[i].diem + gio[i + 1].diem + gio[i + 2].diem) / 3;
    if (tb > tot.diem) tot = { tu: i, diem: tb };
  }
  /** Ít hơn 3 giờ dữ liệu thì lấy trung bình những gì có. */
  if (tot.tu < 0 && gio.length) tot = { tu: 0, diem: gio.reduce((t, x) => t + x.diem, 0) / gio.length };

  const diemTrungBinh = gio.length ? Math.round(gio.reduce((t, x) => t + x.diem, 0) / gio.length) : 0;
  const gioBayDuoc = gio.filter((x) => x.diem >= 55).length;
  /**
   * ĐIỂM NGÀY = trung bình của (khung 3 giờ đẹp nhất, trung bình cả ngày), rồi
   * ÁP TRẦN theo số giờ bay được.
   *
   * Lấy riêng khung đẹp nhất thì ngày "sáng đẹp, mưa từ trưa" ra 90 điểm TỐT —
   * đúng là có bay được, nhưng đứng cạnh câu nhận định "HẠN CHẾ, mưa 07–16h"
   * thì hai thứ trên cùng một màn hình cãi nhau, và con số 90 khiến người xếp
   * lịch nhận quá nhiều khách. Lấy riêng trung bình thì ngày "sáng rất đẹp,
   * chiều gió" bị kéo xuống 50 dù buổi sáng đủ cho cả ca bay.
   *
   * Trộn hai cái là hợp lý nhất cho bay đôi: một khung đẹp là bay được, nhưng
   * ngày CHỈ CÓ một khung không thể gọi là ngày tốt. Trần theo số giờ nói đúng
   * điều ấy: ≤ 3 giờ bay được thì cao nhất là KHÁ (69), ≤ 5 giờ thì cao nhất 84.
   */
  let diem = tot.diem < 0 ? 0 : (tot.diem + diemTrungBinh) / 2;
  if (gioBayDuoc <= 3) diem = Math.min(diem, 69);
  else if (gioBayDuoc <= 5) diem = Math.min(diem, 84);
  diem = Math.round(kep(diem));
  const khungTotNhat =
    tot.tu >= 0 && gio.length >= 3
      ? `${gio[tot.tu].gio.slice(11, 16)}–${gio[Math.min(tot.tu + 2, gio.length - 1)].gio.slice(11, 16)}`
      : null;

  /* ---- Độ tin cậy ---- */
  const lyDo: string[] = [];
  let tinCay = 100;
  const thuTu = opts.thuTu ?? 0;
  const truXa = duongCong(thuTu, [[0, 0], [1, 5], [3, 15], [5, 30], [6, 40]]);
  if (truXa > 0) {
    tinCay -= truXa;
    lyDo.push(`dự báo trước ${thuTu} ngày (−${Math.round(truXa)})`);
  }
  /** Thiếu dữ liệu tầng cao / ổn định thì hai yếu tố đang chấm bằng số trung tính. */
  const thieu: string[] = [];
  if (!trongKhung.some((g) => co(g.gio850) || co(g.gio925))) thieu.push("gió tầng cao");
  if (!trongKhung.some((g) => co(g.chiSoNang))) thieu.push("chỉ số ổn định");
  if (!trongKhung.some((g) => co(g.diemSuong))) thieu.push("điểm sương");
  if (thieu.length) {
    tinCay -= 10 * thieu.length;
    lyDo.push(`thiếu ${thieu.join(", ")} (−${10 * thieu.length})`);
  }
  /** Áp suất đang tụt so hôm trước: hệ thống đang chuyển, mô hình hay đoán sai giờ. */
  const ap = trongKhung.map((g) => g.apSuat).filter(co);
  const apTruoc = (opts.ngayTruoc?.gio ?? []).map((g) => g.apSuat).filter(co);
  if (ap.length && apTruoc.length) {
    const doi = ap.reduce((t, x) => t + x, 0) / ap.length - apTruoc.reduce((t, x) => t + x, 0) / apTruoc.length;
    if (doi <= -3) {
      tinCay -= 15;
      lyDo.push(`áp suất tụt ${doi.toFixed(1)} hPa — thời tiết đang chuyển (−15)`);
    }
  }
  /** Giờ trong khung mà mô hình cho điểm cách nhau quá xa (đẹp xen xấu) là ngày khó đoán. */
  if (gio.length >= 4) {
    const max = Math.max(...gio.map((x) => x.diem));
    const min = Math.min(...gio.map((x) => x.diem));
    if (max - min >= 60) {
      tinCay -= 10;
      lyDo.push("trong ngày đẹp xen xấu, khó đoán giờ (−10)");
    }
  }
  tinCay = Math.round(kep(tinCay));
  if (!lyDo.length) lyDo.push("đủ dữ liệu, dự báo gần, thời tiết ổn định");

  return {
    ngay: ngay.ngay,
    diem,
    xepLoai: xepLoaiTheoDiem(diem),
    khungTotNhat,
    gioBayDuoc,
    diemTrungBinh,
    doTinCay: tinCay,
    lyDoTinCay: lyDo,
    gio,
  };
}

/** Tóm tắt một dòng cho giao diện: "72/100 KHÁ · đẹp nhất 08:00–10:00 · tin cậy 85%". */
export function tomTatDanhGia(d: DanhGiaNgay): string {
  return `${d.diem}/100 ${NHAN_XEP_LOAI[d.xepLoai]}${d.khungTotNhat ? ` · đẹp nhất ${d.khungTotNhat}` : ""} · ${d.gioBayDuoc} giờ bay được · tin cậy ${d.doTinCay}%`;
}
