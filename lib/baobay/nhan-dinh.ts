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

export function nhanMucNhanDinh(m: MucNhanDinh): string {
  return NHAN_MUC[m];
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
    return { muc: "hanChe", tomTat: "Chưa có dữ liệu giờ bay của ngày này.", diem: [], khuyenCao: [] };
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

  /* ===== 2. GIÓ TRÊN CAO ===== */
  {
    /**
     * Chọn hai mực NẰM TRÊN bãi. Bãi thấp (Đồi Bù 833m, Viên Nam ~1.000m) thì
     * 925hPa (~800m) còn ngang bãi, dùng 850 (~1.500m) và 700 (~3.000m). Khau
     * Phạ 1.200m cũng vậy. Bãi đồng bằng (Sơn Trà 600m) thì 925 mới có nghĩa.
     */
    const dung925 = alt < 500;
    const g1 = trungBinh(gio.map((g) => (dung925 ? g.gio925 : g.gio850)).filter(co));
    const g2 = trungBinh(gio.map((g) => (dung925 ? g.gio850 : g.gio700)).filter(co));
    const hMuc1 = trungBinh(gio.map((g) => (dung925 ? g.h925 : g.h850)).filter(co));
    const ten1 = dung925 ? "~800m" : "~1.500m";
    const ten2 = dung925 ? "~1.500m" : "~3.000m";
    if (g1 !== null || g2 !== null) {
      const cao1 = hMuc1 !== null ? Math.max(0, Math.round(hMuc1 - alt)) : null;
      const phan: string[] = [];
      if (g1 !== null) phan.push(`${ten1}${cao1 !== null ? ` (cách bãi ${cao1}m)` : ""}: ${g1.toFixed(1)} m/s`);
      if (g2 !== null) phan.push(`${ten2}: ${g2.toFixed(1)} m/s`);
      let tong: DiemNhanDinh["tong"] = "thongTin";
      let them_ = "";
      /**
       * Gió tầng thấp mạnh (mực ngay trên bãi > 8 m/s) là thứ NGUY HIỂM NHẤT
       * mà bảng mặt đất không hiện: ở bãi đo 3 m/s, lên 300m đã 10 m/s — dù bị
       * thổi lùi, thermal bị xé thành từng mảnh, xóc mà không lên được.
       */
      if (g1 !== null && g1 > 12) {
        tong = "xau";
        them_ = " — RẤT MẠNH ngay trên bãi: dù bị thổi lùi, không nên bay";
        khuyenCao.push("Gió tầng ngay trên bãi quá mạnh — kể cả gió mặt đất nhẹ cũng không cất cánh.");
      } else if (g1 !== null && g1 > 8) {
        tong = "chuY";
        them_ = " — mạnh ngay trên bãi: thermal bị xé, xóc; bay thấp, không lên cao";
        khuyenCao.push(`Không lên cao quá ${cao1 !== null ? cao1 : 300}m — gió trên đó ${g1.toFixed(0)} m/s.`);
      } else if (g2 !== null && g2 > 15) {
        tong = "chuY";
        them_ = " — gió cao mạnh: cắt gió, mây kéo nhanh, thời tiết đổi nhanh";
      } else if (g1 !== null && g1 > 5 && gioTb < 2) {
        /** Mặt đất lặng mà trên cao có gió: cất cánh khó đọc gió, lên khỏi tán cây là đổi khác. */
        tong = "chuY";
        them_ = " — CẮT GIÓ: dưới bãi lặng nhưng trên cao đã có gió, cất cánh khó đọc";
      } else if (g1 !== null && g1 <= 5) {
        tong = "tot";
        them_ = " — êm cả tầng";
      }
      them({
        icon: "🪁",
        ten: "Gió trên cao",
        noiDung: phan.join(" · ") + them_,
        ngan:
          tong === "xau"
            ? "gió trên bãi rất mạnh"
            : tong === "chuY"
              ? them_.includes("CẮT GIÓ")
                ? "cắt gió trên bãi"
                : `gió trên cao mạnh (${(g1 ?? g2 ?? 0).toFixed(0)} m/s)`
              : "tầng cao êm",
        tong,
      });
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
      noi = `GẮT từ ${gat[0]} — trần ~${tranMax}m${capeMax !== null ? `, CAPE ${Math.round(capeMax)}` : ""}: dù xóc, khách dễ say, bãi đáp nổi gió xoáy`;
      tong = "chuY";
      khuyenCao.push(`Thermal gắt từ ${gat[0]} — xếp khách yếu tim, trẻ em, người say xe vào các suất sáng sớm.`);
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
        noi = `BẤT ỔN (LI ${li.toFixed(1)}) — dễ mưa dông, xóc, nhiễu; dông ${dong}%`;
        tong = dong >= 40 ? "xau" : "chuY";
        khuyenCao.push(
          dong >= 40
            ? "Nguy cơ dông cao — không bay buổi chiều; sáng sớm nếu bay thì kết thúc trước 11h."
            : "Không khí bất ổn — kết thúc các chuyến trước 14h, theo dõi mây tích phía tây nam.",
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
      if (caoNap < 600) khuyenCao.push(`Nắp nghịch nhiệt thấp (~${caoNap}m) — trần bay bị chặn, tầm nhìn dưới nắp kém; chờ nắng phá nắp sau 10h.`);
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
      them({
        icon: "🌡",
        ten: "Áp suất",
        noiDung: noi,
        ngan: doi === null ? `áp ${ap.toFixed(0)}` : doi <= -5 ? "áp tụt mạnh — front tới" : doi <= -3 ? "áp giảm" : doi >= 3 ? "áp tăng, quang dần" : `áp ${ap.toFixed(0)} ổn`,
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

  /* ===== 10. KHUNG GIỜ ===== */
  if (ngay.khungDep) {
    khuyenCao.unshift(`Khung giờ đẹp nhất: ${ngay.khungDep}.`);
  }

  /* ===== KẾT LUẬN ===== */
  const muc = chotMuc(ngay.muc, xau, chuY);
  const tomTat = tomTatNgay(muc, diem, ngay);
  return { muc, tomTat, diem, khuyenCao: [...new Set(khuyenCao)] };
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
