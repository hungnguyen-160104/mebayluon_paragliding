// lib/baobay/nhan-dinh.ts

/**
 * NHẬN ĐỊNH NGÀY BAY — đọc cả ngày như một phi công dự báo, không phải từng ô.
 *
 * Bảng giờ nói "10h gió 3 m/s, mưa 0". Đúng, nhưng chưa trả lời câu người ta
 * thật sự hỏi trước khi lên đèo: hôm nay là NGÀY KIỂU GÌ. Ngày oi ổn định ít
 * thermal? Ngày bất ổn dễ dông chiều? Ngày gió trên cao mạnh xé thermal? Ngày
 * nghịch nhiệt giữ mù tới trưa? Mỗi kiểu ngày đòi một cách xếp lịch khác.
 *
 * Đây là phần TÍNH THUẦN: nhận dữ liệu giờ của một ngày (và ngày trước để xem
 * xu hướng áp suất), trả về câu chữ. Không chạm mạng, không chạm cơ sở dữ liệu,
 * nên kiểm được từng luật bằng phép thử với số bịa.
 *
 * NGUYÊN TẮC VIẾT CÂU: mỗi nhận định phải nói CON SỐ nó dựa vào. "Thermal mạnh"
 * suông thì người đọc không kiểm được; "thermal mạnh — trần 1.800m, CAPE 900"
 * thì phi công có kinh nghiệm tự đối chiếu được với cảm nhận của mình, và cái
 * sai của máy lộ ra ngay.
 */

import {
  chiSoBay,
  GIO_BAY_DEN,
  GIO_BAY_TU,
  huongChu,
  lechGoc,
  NHAN_SUC_GIO,
  sucGio,
  tranMay,
  trongCung,
  type GioThoiTiet,
  type LuatHuong,
  type MucDo,
  type NgayThoiTiet,
} from "./thoi-tiet";

export type MucNhanDinh = "tot" | "kha" | "hanChe" | "nghi";

export type DiemNhanDinh = {
  /** Biểu tượng đầu dòng. */
  icon: string;
  /** Tên ngắn của mục: "Gió trên cao", "Thermal", "Nghịch nhiệt"… */
  ten: string;
  /** Câu nhận định, có số. */
  noiDung: string;
  /** Câu RẤT NGẮN cho dòng tóm tắt — "gió Đ vừa, thuận sườn", "thermal tốt". */
  ngan: string;
  /** Tông của mục: tốt · cần chú ý · xấu · chỉ là thông tin. */
  tong: "tot" | "chuY" | "xau" | "thongTin";
};

export type NhanDinhNgay = {
  muc: MucNhanDinh;
  /**
   * KIỂU NGÀY bằng ngôn ngữ phi công — "Ngày bất ổn định: thermal gắt, nhiễu
   * động, mây tích phát triển", "Ngày ổn định oi bức: lift yếu, không khí đục".
   * Đây là câu người bay nói với nhau ở bãi, không phải câu của bản tin.
   */
  kieuNgay: string;
  /** Một câu tóm cả ngày, hiện to nhất. */
  tomTat: string;
  diem: DiemNhanDinh[];
  /** Việc nên làm: "bay trước 10h", "chờ mù tan", "kết thúc trước 14h"… */
  khuyenCao: string[];
};

const NHAN_MUC: Record<MucNhanDinh, string> = {
  tot: "NGÀY BAY TỐT",
  kha: "NGÀY BAY KHÁ",
  hanChe: "NGÀY BAY HẠN CHẾ",
  nghi: "NÊN NGHỈ BAY",
};

/** Mặt cười cho ngày tốt, mặt buồn cho ngày nghỉ — đứng trước nhãn mức. */
export const BIEU_TUONG_NHAN_DINH: Record<MucNhanDinh, string> = { tot: "😊", kha: "🙂", hanChe: "😐", nghi: "😞" };

export function nhanMucNhanDinh(m: MucNhanDinh): string {
  return `${BIEU_TUONG_NHAN_DINH[m]} ${NHAN_MUC[m]}`;
}

/* ------------------------------------------------------------------ */
/* Tiện ích số                                                         */
/* ------------------------------------------------------------------ */

const gioBay = (gio: GioThoiTiet[]) =>
  gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= GIO_BAY_TU && h <= GIO_BAY_DEN;
  });

const co = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function trungBinh(a: number[]): number | null {
  return a.length ? a.reduce((t, x) => t + x, 0) / a.length : null;
}

function lonNhat(a: number[]): number | null {
  return a.length ? Math.max(...a) : null;
}

/** Hướng trội bằng trung bình VÉC-TƠ — trung bình số học của 350° và 10° ra 180°, sai hẳn. */
function huongTroi(gio: GioThoiTiet[]): number | null {
  const co_ = gio.filter((g) => co(g.huong) && g.gio10m > 0.3);
  if (!co_.length) return null;
  let x = 0;
  let y = 0;
  for (const g of co_) {
    const r = (g.huong * Math.PI) / 180;
    x += Math.sin(r) * g.gio10m;
    y += Math.cos(r) * g.gio10m;
  }
  const d = (Math.atan2(x, y) * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

const gioCua = (g: GioThoiTiet) => g.gio.slice(11, 16);

/**
 * GIÓ Ở MỘT ĐỘ CAO TÍNH TỪ BÃI (m), nội suy giữa các mực mô hình.
 *
 * Phi công không nghĩ bằng "850hPa", họ nghĩ bằng "lên 500m thì gió thế nào".
 * Nên đổi: lấy các mốc (độ cao thật, gió) mà mô hình có — mặt đất, 925, 850,
 * 700 hPa — rồi nội suy tuyến tính tới đúng độ cao hỏi. Mốc nằm DƯỚI bãi (925
 * hPa ~800m khi bãi ở 1.200m) thì bỏ: nó là gió trong lòng núi.
 */
export function gioTaiDoCao(g: GioThoiTiet, mTrenBai: number, alt: number): number | null {
  const moc: Array<{ h: number; v: number }> = [{ h: alt, v: g.gio10m }];
  if (co(g.h925) && co(g.gio925) && g.h925 > alt + 50) moc.push({ h: g.h925, v: g.gio925 });
  if (co(g.h850) && co(g.gio850) && g.h850 > alt + 50) moc.push({ h: g.h850, v: g.gio850 });
  /** 700 hPa không có độ cao riêng — ~3.000m là đủ đúng cho mục đích này. */
  if (co(g.gio700)) moc.push({ h: 3000, v: g.gio700 });
  moc.sort((a, b) => a.h - b.h);
  const muc = alt + mTrenBai;
  if (muc >= moc[moc.length - 1].h) return moc[moc.length - 1].v;
  for (let i = 1; i < moc.length; i++) {
    if (muc <= moc[i].h) {
      const a = moc[i - 1];
      const b = moc[i];
      return a.v + ((b.v - a.v) * (muc - a.h)) / (b.h - a.h);
    }
  }
  return moc[0].v;
}

/**
 * GIỜ ÁP SUẤT BẮT ĐẦU SỤT trong ngày — dấu hiệu dông/rãnh sớm nhất.
 *
 * Xu hướng NGÀY-so-với-NGÀY nói "hệ thống lớn đang tới"; còn xu hướng
 * GIỜ-trong-ngày nói "chiều nay có ổ dông" — hai chuyện khác nhau, cần cả hai.
 *
 * BẪY THUỶ TRIỀU KHÍ QUYỂN: ở nhiệt đới, áp suất TỰ tụt 2–3 hPa từ ~10h tới
 * ~16h mỗi ngày rồi lên lại — nhịp thường ngày, không phải dông. Bản đầu bắt
 * ngưỡng −1,5 hPa/3h nên ngày nào cũng "sụt từ 12:00", kể cả ngày đẹp trời —
 * cảnh báo giả đúng kiểu làm người ta thôi đọc.
 *
 * Nên chỉ gọi là sụt khi tụt NHANH HƠN NHỊP THƯỜNG NGÀY: so với đúng ba giờ
 * ấy của HÔM TRƯỚC, phải tụt thêm ≥ 1,2 hPa và bản thân ≥ 2,5 hPa/3h. Không
 * có hôm trước (ngày đầu dãy) thì đòi hẳn 3 hPa/3h — gấp rưỡi thuỷ triều.
 */
function gioApSut(gioCaNgay: GioThoiTiet[], gioHomTruoc?: GioThoiTiet[] | null): { luc: string; toc: number } | null {
  const ds = gioCaNgay.filter((g) => co(g.apSuat));
  const truoc = new Map<string, number>();
  for (const g of gioHomTruoc ?? []) if (co(g.apSuat)) truoc.set(g.gio.slice(11, 13), g.apSuat as number);
  for (let i = 3; i < ds.length; i++) {
    const h = Number(ds[i].gio.slice(11, 13));
    if (h < 9 || h > 20) continue;
    const doi = (ds[i].apSuat as number) - (ds[i - 3].apSuat as number);
    const hh = ds[i].gio.slice(11, 13);
    const hh3 = ds[i - 3].gio.slice(11, 13);
    const doiTruoc = truoc.has(hh) && truoc.has(hh3) ? (truoc.get(hh) as number) - (truoc.get(hh3) as number) : null;
    const sut = doiTruoc === null ? doi <= -3 : doi <= -2.5 && doi - doiTruoc <= -1.2;
    if (sut) return { luc: gioCua(ds[i]), toc: doi };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Phân tích                                                           */
/* ------------------------------------------------------------------ */

export function nhanDinhNgay(
  ngay: NgayThoiTiet,
  opts: {
    /** Ngày liền trước, để xem áp suất đang tăng hay giảm. */
    ngayTruoc?: NgayThoiTiet | null;
    /** Độ cao bãi cất cánh (m trên mực biển) — để nói "gió trên bãi 300m" thay vì "mực 850hPa". */
    altBai?: number;
    luatHuong?: LuatHuong;
  } = {},
): NhanDinhNgay {
  const gio = gioBay(ngay.gio);
  const diem: DiemNhanDinh[] = [];
  const khuyenCao: string[] = [];
  /** Đếm mấy thứ "xấu" và "chú ý" để chốt mức cuối. */
  let xau = 0;
  let chuY = 0;
  const them = (d: DiemNhanDinh) => {
    diem.push(d);
    if (d.tong === "xau") xau++;
    if (d.tong === "chuY") chuY++;
  };

  if (!gio.length) {
    return { muc: "hanChe", kieuNgay: "", tomTat: "Chưa có dữ liệu giờ bay của ngày này.", diem: [], khuyenCao: [] };
  }

  const alt = opts.altBai ?? 0;

  /* ===== 1. GIÓ MẶT ĐẤT ===== */
  const gioTb = trungBinh(gio.map((g) => g.gio10m)) ?? 0;
  const gioMax = lonNhat(gio.map((g) => g.gio10m)) ?? 0;
  const huong = huongTroi(gio);
  const sang = gio.filter((g) => Number(g.gio.slice(11, 13)) <= 11);
  const chieu = gio.filter((g) => Number(g.gio.slice(11, 13)) >= 13);
  const hSang = huongTroi(sang);
  const hChieu = huongTroi(chieu);
  const doiHuong = hSang !== null && hChieu !== null && Math.abs(lechGoc(hSang, hChieu)) >= 60;
  {
    const suc = NHAN_SUC_GIO[sucGio(gioTb)];
    let noi = `trung bình ${gioTb.toFixed(1)} m/s (${suc}), mạnh nhất ${gioMax.toFixed(1)}`;
    let tong: DiemNhanDinh["tong"] = "thongTin";
    if (huong !== null) {
      noi += `, hướng trội ${huongChu(huong)}`;
      if (opts.luatHuong?.xau && trongCung(huong, opts.luatHuong.xau)) {
        noi += " — NGƯỢC SƯỜN";
        tong = "xau";
      } else if (opts.luatHuong?.tot && trongCung(huong, opts.luatHuong.tot)) {
        noi += " — thuận sườn";
        tong = "tot";
      }
    }
    if (doiHuong && hSang !== null && hChieu !== null) {
      noi += `. Gió ĐỔI HƯỚNG trong ngày: sáng ${huongChu(hSang)}, chiều ${huongChu(hChieu)}`;
      if (tong !== "xau") tong = "chuY";
      khuyenCao.push("Gió đổi hướng giữa ngày — xem lại luật hướng của bãi cho buổi chiều trước khi hẹn khách.");
    }
    if (gioMax > 8) tong = "xau";
    else if (gioMax > 6 && tong !== "xau") tong = "chuY";
    them({
      icon: "🌬",
      ten: "Gió mặt đất",
      noiDung: noi,
      ngan: `gió ${huong !== null ? huongChu(huong) + " " : ""}${suc}${tong === "xau" && huong !== null && opts.luatHuong?.xau && trongCung(huong, opts.luatHuong.xau) ? " ngược sườn" : tong === "tot" ? " thuận sườn" : ""}${doiHuong ? ", đổi hướng giữa ngày" : ""}`,
      tong,
    });
  }

  /* ===== 2. GIÓ TRÊN CAO — nói bằng mực cao tính từ bãi ===== */
  let gioCaoManh = false;
  let catGio = false;
  {
    const tb = (m: number) => trungBinh(gio.map((g) => gioTaiDoCao(g, m, alt)).filter(co));
    const v300 = tb(300);
    const v500 = tb(500);
    const v1000 = tb(1000);
    if (v500 !== null) {
      /** Giờ đầu tiên gió mực 500m vượt 8 m/s — để nói "từ mấy giờ". */
      const tuGio = gio.find((g) => (gioTaiDoCao(g, 500, alt) ?? 0) > 8);
      const soLieu = `mực 300/500/1000m: ${v300?.toFixed(0) ?? "–"}/${v500.toFixed(0)}/${v1000?.toFixed(0) ?? "–"} m/s`;
      let noi: string;
      let ngan: string;
      let tong: DiemNhanDinh["tong"];
      if (v500 > 12) {
        noi = `GIÓ MỰC 500m RẤT MẠNH (${v500.toFixed(0)} m/s) — cất cánh là bị thổi lùi (backing) khỏi sườn, không bay. ${soLieu}`;
        ngan = `gió mực 500m rất mạnh (${v500.toFixed(0)} m/s)`;
        tong = "xau";
        gioCaoManh = true;
        khuyenCao.push(`Gió mực 500m rất mạnh (${v500.toFixed(0)} m/s)${tuGio ? ` từ ${gioCua(tuGio)}` : ""} — không cất cánh dù gió mặt đất nhẹ.`);
      } else if (v500 > 8) {
        noi = `Gió mực 500m mạnh (${v500.toFixed(0)} m/s)${tuGio ? ` từ ${gioCua(tuGio)}` : ""} — thermal bị xé, nhiễu động khi leo; bay bám sườn dưới 300m. ${soLieu}`;
        ngan = `gió mực 500m mạnh (${v500.toFixed(0)} m/s)`;
        tong = "chuY";
        gioCaoManh = true;
        khuyenCao.push(`Gió mực 500m mạnh${tuGio ? ` từ ${gioCua(tuGio)}` : ""} — không leo quá 300m, giữ tốc độ, tránh bay xa sườn.`);
      } else if (v1000 !== null && v1000 > 12) {
        noi = `Gió mực 1000m mạnh (${v1000.toFixed(0)} m/s) — có lớp cắt gió phía trên, leo vào là nhiễu động; giữ dưới 500m. ${soLieu}`;
        ngan = `gió mực 1000m mạnh (${v1000.toFixed(0)} m/s)`;
        tong = "chuY";
        khuyenCao.push(`Không leo quá 500m — gió mực 1000m ${v1000.toFixed(0)} m/s, vào lớp cắt gió là xóc mạnh.`);
      } else if (v300 !== null && v300 - gioTb > 4) {
        noi = `CẮT GIÓ (wind shear): mặt đất ${gioTb.toFixed(1)} m/s nhưng mực 300m đã ${v300.toFixed(0)} m/s — đọc gió ở bãi không tin được, nhiễu động ngay khi rời sườn. ${soLieu}`;
        ngan = "cắt gió ngay trên bãi";
        tong = "chuY";
        catGio = true;
        khuyenCao.push(`Cắt gió trên bãi (mặt đất ${gioTb.toFixed(1)}, mực 300m ${v300.toFixed(0)} m/s) — thả cờ gió cao, cất cánh dứt khoát, giữ tốc độ ngay khi rời sườn.`);
      } else if (v500 <= 5) {
        noi = `Gió các mực êm — ${soLieu}: không cắt gió, leo thoải mái`;
        ngan = "gió mực cao êm";
        tong = "tot";
      } else {
        noi = `Gió mực cao vừa phải — ${soLieu}`;
        ngan = `gió mực 500m ${v500.toFixed(0)} m/s`;
        tong = "thongTin";
      }
      them({ icon: "🪁", ten: "Gió trên cao", noiDung: noi, ngan, tong });
    }
  }

  /* ===== 3. NẮNG ===== */
  const gioNang = gio.reduce((t, g) => t + (co(g.giayNang) ? g.giayNang / 3600 : 0), 0);
  const coSoNang = gio.some((g) => co(g.giayNang));
  {
    if (coSoNang) {
      const tong: DiemNhanDinh["tong"] = gioNang >= 6 ? "tot" : gioNang >= 3 ? "thongTin" : "chuY";
      const may = trungBinh(gio.map((g) => g.may)) ?? 0;
      them({
        icon: gioNang >= 6 ? "☀️" : gioNang >= 3 ? "⛅" : "☁️",
        ten: "Nắng",
        noiDung: `${gioNang.toFixed(1)}/${gio.length} giờ có nắng, mây trung bình ${Math.round(may)}%${
          gioNang < 3 ? " — ngày âm u, ít nắng đốt đất nên thermal yếu" : may >= 85 && gioNang >= 6 ? " — nắng xuyên mây mỏng" : ""
        }`,
        ngan: gioNang >= 6 ? `nắng ${gioNang.toFixed(0)}/${gio.length}h` : gioNang >= 3 ? `nắng nửa ngày` : "âm u",
        tong,
      });
    }
  }

  /* ===== 4. THERMAL ===== */
  {
    const cs = gio.map((g) => ({ g, c: chiSoBay(g) }));
    const tranMax = lonNhat(cs.map((x) => x.c.tran).filter(co));
    const capeMax = lonNhat(gio.map((g) => g.cape).filter(co));
    const gioTotThermal = cs
      .filter((x) => (x.c.thermal === "vua" || x.c.thermal === "manh") && (x.g.buXa ?? 0) > 300)
      .map((x) => gioCua(x.g));
    const gat = cs.filter((x) => x.c.thermal === "gat").map((x) => gioCua(x.g));
    const manhNhat = cs.reduce((a, b) => ((b.c.tran ?? 0) > (a.c.tran ?? 0) ? b : a), cs[0]);
    let noi: string;
    let tong: DiemNhanDinh["tong"];
    if (tranMax === null && capeMax === null) {
      noi = "mô hình chưa cấp trần lớp xáo trộn";
      tong = "thongTin";
    } else if ((tranMax ?? 0) < 400 && (capeMax ?? 0) < 150) {
      noi = `yếu — trần chỉ ~${tranMax ?? 0}m${capeMax !== null ? `, CAPE ${Math.round(capeMax)}` : ""}: chuyến ngắn, ít nâng, bay lướt là chính`;
      tong = "chuY";
    } else if (gat.length) {
      noi = `GẮT từ ${gat[0]} — trần ~${tranMax}m${capeMax !== null ? `, CAPE ${Math.round(capeMax)}` : ""}: lift mạnh nhưng nhiễu động, dù dễ collapse mép, bãi đáp có gió xoáy (rotor nhiệt)`;
      tong = "chuY";
      khuyenCao.push(`Thermal gắt từ ${gat[0]} — bay đôi chở khách nên xong trước ${gat[0]}; sau đó chỉ phi công cứng, chủ động bay tốc độ và né vùng thermal lõi.`);
    } else if ((tranMax ?? 0) >= 800) {
      noi = `tốt — trần ~${tranMax}m${capeMax !== null ? `, CAPE ${Math.round(capeMax)}` : ""}, mạnh nhất quanh ${gioCua(manhNhat.g)}${
        gioTotThermal.length ? `; khung nâng tốt ${gioTotThermal[0]}–${gioTotThermal[gioTotThermal.length - 1]}` : ""
      }`;
      tong = "tot";
    } else {
      noi = `vừa — trần ~${tranMax}m${capeMax !== null ? `, CAPE ${Math.round(capeMax)}` : ""}: đủ kéo dài chuyến, không xóc`;
      tong = "tot";
    }
    them({
      icon: "🔥",
      ten: "Thermal",
      noiDung: noi,
      ngan: `thermal ${noi.split(/ — |: /)[0].toLowerCase().replace("gắt từ", "gắt từ")}`,
      tong,
    });
  }

  /* ===== 5. ĐỘ ỔN ĐỊNH — và kiểu ngày ===== */
  {
    const li = trungBinh(gio.map((g) => g.chiSoNang).filter(co));
    const am = trungBinh(gio.map((g) => g.am).filter(co));
    const nhiet = lonNhat(gio.map((g) => g.nhietDo));
    const dong = lonNhat(gio.map((g) => chiSoBay(g).xacSuatDong)) ?? 0;
    if (li !== null) {
      let noi: string;
      let tong: DiemNhanDinh["tong"];
      if (li >= 4) {
        const oi = (am ?? 0) >= 75 && (nhiet ?? 0) >= 30 && gioTb < 2.5;
        noi = `RẤT ỔN ĐỊNH (LI ${li.toFixed(1)}) — không khí nén chặt, ít thermal, trời êm${
          oi ? `; ẩm ${Math.round(am ?? 0)}%, nóng ${Math.round(nhiet ?? 0)}°C, gió lặng → ngày OI BỨC, mù khô, tầm nhìn đục` : ""
        }`;
        tong = oi ? "chuY" : "thongTin";
        if (oi) khuyenCao.push("Ngày oi ổn định: chuyến ngắn, ít nâng — hẹn khách sáng sớm cho mát, đừng hứa bay lâu.");
      } else if (li >= 1) {
        noi = `ổn định (LI ${li.toFixed(1)}) — bay êm, thermal vừa phải, khó có mưa dông`;
        tong = "tot";
      } else if (li >= -2) {
        noi = `hơi bất ổn (LI ${li.toFixed(1)}) — thermal tốt, có thể có mây tích buổi chiều${dong >= 20 ? `, dông ${dong}%` : ""}`;
        tong = dong >= 20 ? "chuY" : "tot";
      } else {
        noi = `BẤT ỔN ĐỊNH (LI ${li.toFixed(1)}) — thermal gắt và nhiễu động, mây tích phát triển nhanh (nguy cơ OD — overdevelopment), dông ${dong}%`;
        tong = dong >= 40 ? "xau" : "chuY";
        khuyenCao.push(
          dong >= 40
            ? `Nguy cơ dông ${dong}% — không bay buổi chiều; sáng nếu bay thì hạ cánh trước 11:00. Coi chừng gust front: gió đảo chiều và vọt mạnh 10–20 phút TRƯỚC khi mưa tới.`
            : "Ngày bất ổn định — hạ cánh chuyến cuối trước 14:00; thấy mây tích vươn cao, đáy tối là dừng ngay, không chờ mưa.",
        );
      }
      them({
        icon: "⚖️",
        ten: "Ổn định",
        noiDung: noi,
        ngan: li >= 4 ? (noi.includes("OI BỨC") ? "oi bức, ổn định" : "rất ổn định, ít thermal") : li >= 1 ? "ổn định, bay êm" : li >= -2 ? "hơi bất ổn" : "bất ổn, dễ dông",
        tong,
      });
    }
  }

  /* ===== 6. NGHỊCH NHIỆT ===== */
  {
    /**
     * Không khí bình thường lạnh dần khi lên cao, chừng 6,5°C mỗi 1.000m. Chỗ
     * nào nhiệt độ KHÔNG giảm hoặc còn TĂNG theo độ cao là một cái nắp: thermal
     * bốc tới đó thì dừng, mù và khói tích lại phía dưới. Tìm nắp bằng cách so
     * nhiệt độ hai mực kề nhau; báo độ cao nắp tính từ BÃI để phi công hình dung.
     */
    const t925 = trungBinh(gio.map((g) => g.t925).filter(co));
    const t850 = trungBinh(gio.map((g) => g.t850).filter(co));
    const t700 = trungBinh(gio.map((g) => g.t700).filter(co));
    const h925 = trungBinh(gio.map((g) => g.h925).filter(co)) ?? 800;
    const h850 = trungBinh(gio.map((g) => g.h850).filter(co)) ?? 1500;
    const h700 = 3000;
    const lop: Array<{ tu: number; den: number; lapse: number }> = [];
    if (t925 !== null && t850 !== null && h850 > h925) lop.push({ tu: h925, den: h850, lapse: ((t850 - t925) / (h850 - h925)) * 1000 });
    if (t850 !== null && t700 !== null) lop.push({ tu: h850, den: h700, lapse: ((t700 - t850) / (h700 - h850)) * 1000 });
    /** Lapse rate > -2°C/km là lớp ổn định mạnh; > 0 là nghịch nhiệt thật sự. */
    const nap = lop.find((l) => l.lapse > -2 && l.den > alt);
    if (nap) {
      const caoNap = Math.max(0, Math.round(nap.tu - alt));
      const laNghich = nap.lapse > 0;
      them({
        icon: "🧢",
        ten: laNghich ? "Nghịch nhiệt" : "Lớp chặn",
        noiDung: `${laNghich ? "NGHỊCH NHIỆT" : "lớp ổn định"} ở khoảng ${caoNap}–${Math.round(nap.den - alt)}m trên bãi (nhiệt độ ${
          laNghich ? "tăng" : "gần như không giảm"
        } theo độ cao, ${nap.lapse.toFixed(1)}°C/km): thermal bị chặn ở đó, mù và khói tích phía dưới`,
        ngan: `${laNghich ? "nghịch nhiệt" : "lớp chặn"} ~${caoNap}m`,
        tong: caoNap < 600 ? "chuY" : "thongTin",
      });
      if (caoNap < 600) khuyenCao.push(`Nắp nghịch nhiệt thấp (~${caoNap}m trên bãi) — thermal đụng nắp là tắt, không leo quá ${caoNap}m; mù và khói tích dưới nắp, chờ nắng phá nắp sau 10:00.`);
    } else if (lop.length) {
      them({ icon: "🧢", ten: "Nghịch nhiệt", noiDung: "không có lớp chặn trong 3.000m — thermal lên tự do", ngan: "không nghịch nhiệt", tong: "tot" });
    }
  }

  /* ===== 7. ÁP SUẤT & FRONT ===== */
  {
    const ap = trungBinh(gio.map((g) => g.apSuat).filter(co));
    const apTruoc = opts.ngayTruoc ? trungBinh(gioBay(opts.ngayTruoc.gio).map((g) => g.apSuat).filter(co)) : null;
    if (ap !== null) {
      const doi = apTruoc !== null ? ap - apTruoc : null;
      const mayNhieu = (trungBinh(gio.map((g) => g.may)) ?? 0) >= 70;
      let noi = `${ap.toFixed(0)} hPa (quy về mực biển)`;
      let tong: DiemNhanDinh["tong"] = "thongTin";
      if (doi !== null) {
        noi += `, ${doi >= 0 ? "tăng" : "giảm"} ${Math.abs(doi).toFixed(1)} hPa so với hôm trước`;
        /**
         * Áp suất TỤT NHANH là dấu hiệu sớm nhất của thời tiết chuyển xấu — front
         * hay rãnh thấp đang tới. Mây, mưa, gió đổi hướng thường tới SAU vài
         * giờ tới một ngày, nên đây là thứ giúp báo trước chứ không phải xác nhận.
         */
        if (doi <= -5) {
          noi += " — TỤT MẠNH: front/rãnh thấp đang tới, thời tiết chuyển xấu, gió đổi hướng và mạnh lên";
          tong = "xau";
          khuyenCao.push("Áp suất tụt mạnh — thời tiết đang chuyển; ưu tiên bay sớm, sẵn sàng huỷ buổi chiều.");
        } else if (doi <= -3) {
          noi += " — giảm: hệ thống xấu đang tiến tới, mây tăng, có thể mưa";
          tong = "chuY";
        } else if (doi >= 3) {
          noi += " — tăng: áp cao lấn, trời ổn định và quang dần";
          tong = "tot";
        }
      }
      if (ap < 1006 && mayNhieu) {
        noi += "; áp thấp kèm nhiều mây — ngày âm u, thermal yếu";
        if (tong === "thongTin") tong = "chuY";
      }
      /**
       * SỤT TRONG NGÀY — "áp suất sụt từ 15:00" là câu phi công cần hơn cả số
       * trung bình: nó chỉ đúng giờ phải hạ cánh xong.
       */
      const sut = gioApSut(ngay.gio, opts.ngayTruoc?.gio ?? null);
      if (sut) {
        noi += `. ÁP SUẤT SỤT TỪ ${sut.luc} (${sut.toc.toFixed(1)} hPa/3h) — ổ dông hoặc rãnh đang tới`;
        if (tong !== "xau") tong = "chuY";
        const gioHa = Math.max(GIO_BAY_TU, Number(sut.luc.slice(0, 2)) - 1);
        khuyenCao.push(`Áp suất sụt từ ${sut.luc} — có thể có dông; hạ cánh xong trước ${String(gioHa).padStart(2, "0")}:00, sau đó không cất cánh.`);
      }
      them({
        icon: "🌡",
        ten: "Áp suất",
        noiDung: noi,
        ngan: sut
          ? `áp sụt từ ${sut.luc}`
          : doi === null
            ? `áp ${ap.toFixed(0)}`
            : doi <= -5
              ? "áp tụt mạnh — front tới"
              : doi <= -3
                ? "áp giảm"
                : doi >= 3
                  ? "áp tăng, quang dần"
                  : `áp ${ap.toFixed(0)} ổn`,
        tong,
      });

      /* Front: áp giảm + gió đổi hướng + mưa tăng so hôm trước → nói hẳn ra. */
      const muaTruoc = opts.ngayTruoc?.muaTong ?? 0;
      if (doi !== null && doi <= -3 && doiHuong && ngay.muaTong > muaTruoc + 1) {
        them({
          icon: "⛈",
          ten: "Front",
          noiDung: "dấu hiệu FRONT đi qua: áp giảm, gió đổi hướng, mưa tăng — gió giật bất ngờ khi front tới, sau front trời quang và gió mạnh lên",
          ngan: "FRONT đi qua",
          tong: "xau",
        });
      }
    }
  }

  /* ===== 8. MÙ ===== */
  {
    const mu = gio.filter((g) => {
      const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
      return cm !== null && cm < 300 && (g.mayThap ?? 0) >= 70;
    });
    if (mu.length) {
      const cuoi = mu[mu.length - 1];
      const tan = gio.find((g) => Number(g.gio.slice(11, 13)) > Number(cuoi.gio.slice(11, 13)));
      them({
        icon: "🌫",
        ten: "Mù",
        noiDung: `mây/mù trùm bãi ${gioCua(mu[0])}–${gioCua(cuoi)}${tan ? `, tan dần từ ${gioCua(tan)}` : " — cả ngày"}`,
        ngan: tan ? `mù tới ${gioCua(tan)}` : "mù cả ngày",
        tong: tan ? "chuY" : "xau",
      });
      if (tan) khuyenCao.push(`Chờ mù tan — hẹn khách từ ${gioCua(tan)}.`);
    }
  }

  /* ===== 9. MƯA · DÔNG ===== */
  {
    const mua = gio.filter((g) => g.mua > 0.5);
    const dongMax = lonNhat(gio.map((g) => chiSoBay(g).xacSuatDong)) ?? 0;
    if (mua.length) {
      them({
        icon: "🌧",
        ten: "Mưa",
        noiDung: `mưa ${gioCua(mua[0])}–${gioCua(mua[mua.length - 1])}, tổng ${ngay.muaTong.toFixed(1)}mm${
          ngay.xacSuatMuaMax >= 0 ? `, khả năng ${ngay.xacSuatMuaMax}%` : ""
        }`,
        ngan: `mưa ${gioCua(mua[0])}–${gioCua(mua[mua.length - 1])}`,
        tong: mua.length >= 4 ? "xau" : "chuY",
      });
    }
    if (dongMax >= 20 && !diem.some((d) => d.ten === "Ổn định" && d.noiDung.includes("dông"))) {
      them({ icon: "⚡", ten: "Dông", noiDung: `nguy cơ dông tới ${dongMax}% trong ngày`, ngan: `dông ${dongMax}%`, tong: dongMax >= 40 ? "xau" : "chuY" });
    }
  }

  /* ===== 9b. NHIỄU ĐỘNG — gộp các nguồn xóc lại một câu ===== */
  {
    const nguon: string[] = [];
    const gioGat = gio.filter((g) => chiSoBay(g).thermal === "gat").map(gioCua);
    if (gioGat.length) nguon.push(`thermal gắt ${gioGat[0]}–${gioGat[gioGat.length - 1]}`);
    const giatManh = gio.filter((g) => g.giat >= 14).map(gioCua);
    if (giatManh.length) nguon.push(`giật ≥14 m/s ${giatManh[0]}–${giatManh[giatManh.length - 1]}`);
    if (gioCaoManh) nguon.push("cắt gió với tầng cao");
    else if (catGio) nguon.push("cắt gió ngay trên bãi");
    const liTb = trungBinh(gio.map((g) => g.chiSoNang).filter(co));
    if (liTb !== null && liTb <= -2) nguon.push("không khí bất ổn định");
    if (nguon.length) {
      const nang = nguon.length >= 2 || gioCaoManh;
      them({
        icon: "🌀",
        ten: "Nhiễu động",
        noiDung: `${nang ? "NHIỄU ĐỘNG MẠNH" : "nhiễu động vừa"}: ${nguon.join(" + ")} — giữ tốc độ, tay lái chủ động, không bay sát địa hình, sẵn sàng xử lý collapse`,
        ngan: nang ? "nhiễu động mạnh" : "nhiễu động vừa",
        tong: nang ? "chuY" : "thongTin",
      });
    }
  }

  /* ===== 10. KHUNG GIỜ ===== */
  if (ngay.khungDep) {
    khuyenCao.unshift(`Khung giờ đẹp nhất: ${ngay.khungDep}.`);
  }

  /* ===== KẾT LUẬN ===== */
  const muc = chotMuc(ngay.muc, xau, chuY);
  const kieuNgay = kieuNgayBay(diem, gio);
  const tomTat = tomTatNgay(muc, diem, ngay);
  /**
   * Khuyến cáo XẤU NHẤT LÊN ĐẦU: câu bắt đầu bằng "Gió mực…", "Nguy cơ dông",
   * "Áp suất sụt" là câu quyết định có bay hay không, phải đọc trước "khung giờ
   * đẹp" — không thì người ta thấy giờ đẹp rồi thôi không đọc nữa.
   */
  const uuTien = (c: string) => (/^(Gió mực 500m rất|Nguy cơ dông|Áp suất sụt|Gió tầng)/.test(c) ? 0 : /^(Gió mực|Không leo|Cắt gió|Ngày bất ổn|Thermal gắt|Nắp)/.test(c) ? 1 : /^Khung giờ/.test(c) ? 3 : 2);
  const kc = [...new Set(khuyenCao)].sort((a, b) => uuTien(a) - uuTien(b));
  return { muc, kieuNgay, tomTat, diem, khuyenCao: kc };
}

/**
 * KIỂU NGÀY — câu phi công nói với nhau ở bãi. Chọn theo thứ nổi trội nhất,
 * từ nguy hiểm tới bình thường.
 */
function kieuNgayBay(diem: DiemNhanDinh[], gio: GioThoiTiet[]): string {
  const tim = (ten: string) => diem.find((d) => d.ten === ten);
  const onDinh = tim("Ổn định");
  const gioCao = tim("Gió trên cao");
  const thermal = tim("Thermal");
  const nghich = tim("Nghịch nhiệt") ?? tim("Lớp chặn");
  const apSuat = tim("Áp suất");
  const li = trungBinh(gio.map((g) => g.chiSoNang).filter(co));

  if (apSuat?.noiDung.includes("FRONT") || tim("Front")) return "Ngày FRONT đi qua: gió đổi hướng và mạnh lên đột ngột, giật bất thường — kiểu ngày dễ bị bất ngờ nhất";
  if (gioCao?.tong === "xau") return "Ngày GIÓ MỰC CAO RẤT MẠNH: mặt đất có thể lặng nhưng lên 500m là bị thổi lùi — không bay";
  /** Mưa cả ngày hay mù cả ngày quyết định hơn mọi chỉ số thermal — xét trước. */
  const mua = tim("Mưa");
  if (mua?.tong === "xau") return `Ngày MƯA: ${mua.ngan} — bay được chăng chỉ ở khe giữa hai đợt, hẹn khách theo giờ tạnh`;
  if (tim("Mù")?.tong === "xau") return "Ngày MÙ CẢ NGÀY: bãi chìm trong mây, không thấy bãi đáp — không bay";
  if (li !== null && li <= -2) return "Ngày BẤT ỔN ĐỊNH: thermal gắt, nhiễu động mạnh, mây tích phát triển nhanh — nguy cơ OD/dông chiều, chỉ bay sáng";
  if (gioCao?.tong === "chuY" && gioCao.noiDung.includes("mực 500m")) return "Ngày GIÓ MỰC CAO MẠNH: thermal bị xé, leo là nhiễu động — bay bám sườn thấp, chuyến ngắn";
  if (onDinh?.noiDung.includes("OI BỨC")) return "Ngày ỔN ĐỊNH OI BỨC: lift yếu, không khí đục, mù khô — bay lướt, chuyến ngắn, khách dễ mệt vì nóng";
  if (nghich?.tong === "chuY") return "Ngày NGHỊCH NHIỆT THẤP: trần bay bị chặn, mù tích dưới nắp — sáng đục, trưa mới mở";
  if (thermal?.noiDung.startsWith("GẮT")) return "Ngày THERMAL GẮT: lift mạnh nhưng nhiễu động, bãi đáp có rotor nhiệt — bay đôi xong sớm";
  if (thermal?.noiDung.startsWith("yếu")) return "Ngày ÍT THERMAL: bay lướt là chính, chuyến ngắn, lift kém — hợp khách sợ độ cao";
  if (mua) return `Ngày CÓ MƯA GIỮA CHỪNG (${mua.ngan}): bay quanh đợt mưa, để mắt tới mây đen phía gió tới`;
  if (li !== null && li >= 1 && thermal?.tong === "tot") return "Ngày ỔN ĐỊNH, THERMAL ÊM: lift đều, ít xóc — kiểu ngày đẹp nhất cho bay đôi chở khách";
  if (li !== null && li > -2 && li < 1 && thermal?.tong === "tot") return "Ngày HƠI BẤT ỔN, THERMAL TỐT: lift khoẻ, mây tích đẹp buổi chiều — bay đôi ổn, chiều để ý mây phát triển";
  return "Ngày bình thường: không có yếu tố nổi bật, đọc bảng giờ để chọn khung";
}

/**
 * CHỐT MỨC: bắt đầu từ màu của ngày (đã tính từng giờ), rồi hạ theo số mục xấu.
 * Không tự nâng lên: bảng giờ nói đỏ thì không câu chữ nào biến thành tốt được.
 */
function chotMuc(mucNgay: MucDo, xau: number, chuY: number): MucNhanDinh {
  if (mucNgay === "do") return "nghi";
  if (mucNgay === "vang") return xau >= 1 ? "nghi" : "hanChe";
  if (xau >= 2) return "nghi";
  if (xau === 1) return "hanChe";
  if (chuY >= 2) return "kha";
  return "tot";
}

function tomTatNgay(muc: MucNhanDinh, diem: DiemNhanDinh[], ngay: NgayThoiTiet): string {
  const dau = NHAN_MUC[muc];
  /** Nhặt 2–3 mục nổi nhất: xấu trước, chú ý sau, rồi tốt. */
  /** Xấu trước, chú ý sau, rồi tốt — người đọc thấy cái đáng lo trước. */
  const noi = [...diem.filter((d) => d.tong === "xau"), ...diem.filter((d) => d.tong === "chuY"), ...diem.filter((d) => d.tong === "tot")]
    .slice(0, 4)
    .map((d) => d.ngan);
  const dep = ngay.khungDep ? ` Giờ đẹp ${ngay.khungDep}.` : "";
  return `${dau} — ${noi.join(" · ")}.${dep}`;
}
