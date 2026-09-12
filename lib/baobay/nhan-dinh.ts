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
  GIAT_CANH_BAO,
  MUA_BAY,
  MUA_DANG_KE,
  NHAN_SUC_GIO,
  sucGio,
  suNangMua,
  tranMay,
  khungCua,
  gioTrenBai,
  GIO_TREN_CAO_CAM,
  GIO_TREN_CAO_SPEEDBAR,
  trongCung,
  type GioThoiTiet,
  type LuatHuong,
  type MucDo,
  type NgayThoiTiet, huongTroiNgay } from "./thoi-tiet";

export type MucNhanDinh = "tot" | "kha" | "hanChe" | "nghi";

export type DiemNhanDinh = {
  /** Biểu tượng đầu dòng. */
  icon: string;
  /** Tên ngắn của mục: "Gió trên cao", "Thermal", "Nghịch nhiệt"… */
  ten: string;
  /** Câu nhận định, có số. */
  noiDung: string;
  /** Câu RẤT NGẮN cho dòng tóm tắt — "gió Đ vừa, gió chính bãi", "thermal tốt". */
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

const gioBay = (gio: GioThoiTiet[], khung: [number, number] = [GIO_BAY_TU, GIO_BAY_DEN]) =>
  gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= khung[0] && h <= khung[1];
  });

const co = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function trungBinh(a: number[]): number | null {
  return a.length ? a.reduce((t, x) => t + x, 0) / a.length : null;
}

function lonNhat(a: number[]): number | null {
  return a.length ? Math.max(...a) : null;
}

/** Hướng trội bằng trung bình VÉC-TƠ — dùng chung `huongTroiNgay` với thẻ khách và thẻ nội bộ. */
const huongTroi = (gio: GioThoiTiet[]): number | null => huongTroiNgay(gio);

const gioCua = (g: GioThoiTiet) => g.gio.slice(11, 16);

/**
 * MƯA THEO KHUNG GIỜ: các đoạn mưa thật, đoạn to nhất, và những KHE KHÔ dài từ
 * hai tiếng trở lên (một tiếng lẻ chưa đủ để cất rồi hạ cho an toàn).
 * Dùng cho mục Mưa và cho kiểu ngày — cùng một cách đếm, hai chỗ không lệch.
 */
export function kheKhoVaMua(gio: GioThoiTiet[]): { doanMua: string; toNhat: string | null; kheKho: string | null; soGioKho: number } {
  const mua = gio.filter((g) => g.mua >= MUA_DANG_KE);
  const kho = gio.filter((g) => g.mua < MUA_DANG_KE);
  /** Khe khô: chỉ giữ đoạn liền nhau từ 2 giờ trở lên. */
  const doanKho: GioThoiTiet[][] = [];
  for (const g of kho) {
    const cuoi = doanKho[doanKho.length - 1];
    const h = Number(g.gio.slice(11, 13));
    if (cuoi && Number(cuoi[cuoi.length - 1].gio.slice(11, 13)) + 1 === h) cuoi.push(g);
    else doanKho.push([g]);
  }
  const khoDu = doanKho.filter((d) => d.length >= 2);
  /** Giờ to nhất: các giờ mưa ≥ 70% giờ nặng nhất, gom thành đoạn. */
  const max = mua.length ? Math.max(...mua.map((g) => g.mua)) : 0;
  const nang = mua.filter((g) => g.mua >= Math.max(MUA_DANG_KE, max * 0.7));
  return {
    doanMua: mua.length ? (khungCua(mua) ?? "") : "",
    toNhat: nang.length && mua.length > nang.length ? `${khungCua(nang)} (~${max.toFixed(1)} mm/h)` : null,
    kheKho: khoDu.length ? khoDu.map((d) => khungCua(d)).join(", ") : null,
    soGioKho: khoDu.reduce((t, d) => t + d.length, 0),
  };
}

/**
 * GIÓ Ở MỘT ĐỘ CAO TÍNH TỪ BÃI (m), nội suy giữa các mực mô hình.
 *
 * Phi công không nghĩ bằng "850hPa", họ nghĩ bằng "lên 500m thì gió thế nào".
 * Nên đổi: lấy các mốc (độ cao thật, gió) mà mô hình có — mặt đất, 925, 850,
 * 700 hPa — rồi nội suy tuyến tính tới đúng độ cao hỏi. Mốc nằm DƯỚI bãi (925
 * hPa ~800m khi bãi ở 1.200m) thì bỏ: nó là gió trong lòng núi.
 */
export function gioTaiDoCao(g: GioThoiTiet, mTrenBai: number, alt: number): number | null {
  /** Cùng một phép nội suy với `chamGio` — xem `gioTrenBai` ở thoi-tiet.ts. */
  return gioTrenBai(g, mTrenBai, alt);
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
    /** Khung giờ bay của điểm — mặc định 7–17. */
    gioBay?: [number, number];
    /**
     * Tiềm năng thermal đã chấm sẵn (lib/baobay/thermal.ts) — service tính
     * TRƯỚC rồi truyền vào để mục "Thermal" ở đây kể lại đúng con số ấy, thay
     * vì tự suy từ trần/CAPE và ra một kết luận khác (chủ 11/09 thấy thẻ nói
     * "thermal yếu" ở trên và "38/100 nhẹ" ở dưới). Kiểu để lỏng tránh vòng
     * import: `thermal.ts` đang dùng `gioTaiDoCao` của file này.
     */
    thermal?: { diem: number; muc: string; khung: string | null; gioDung: number; lyDo: string[] };
  } = {},
): NhanDinhNgay {
  const khung = opts.gioBay ?? [GIO_BAY_TU, GIO_BAY_DEN];
  const gio = gioBay(ngay.gio, khung);
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
        /** Nói thẳng "gió chính bãi": chủ 11/09 — gió Bắc ở Đồi Bù là gió ĐẸP, đọc mà không thấy chữ ấy thì tưởng bình thường. */
        noi += " — GIÓ CHÍNH BÃI";
        tong = "tot";
      }
    }
    if (doiHuong && hSang !== null && hChieu !== null) {
      noi += `. Gió ĐỔI HƯỚNG trong ngày: sáng ${huongChu(hSang)}, chiều ${huongChu(hChieu)}`;
      if (tong !== "xau") tong = "chuY";
      khuyenCao.push("Gió đổi hướng giữa ngày — xem lại luật hướng của bãi cho buổi chiều.");
    }
    /**
     * BÃI CẤM HƯỚNG (chủ 11/09, nói về Viên Nam): có bãi mà hướng núi khiến cả
     * một góc trời là không bay được — Viên Nam không bay gió Bắc, Đông Bắc,
     * Tây Bắc. Nói "hướng trội ngược sườn" thôi thì chưa đủ: người trực cần
     * biết NGƯỢC CẢ NGÀY hay chỉ vài tiếng, vì trong ngày gió xoay thì vẫn
     * "lọt khe" bay được — và đúng mấy tiếng ấy là thứ phải xếp ca.
     */
    if (opts.luatHuong?.xau) {
      const cung = opts.luatHuong.xau;
      const xet = gio.filter((g) => co(g.huong) && g.gio10m > 0.5);
      const nguoc = xet.filter((g) => trongCung(g.huong, cung));
      const thuan = xet.filter((g) => !trongCung(g.huong, cung));
      if (nguoc.length) {
        /** Tên các hướng bị cấm, lấy từ chính những giờ đang ngược — cụ thể hơn là đọc cung. */
        const tenHuong = [...new Set(nguoc.map((g) => huongChu(g.huong)))].join(", ");
        if (!thuan.length) {
          tong = "xau";
          khuyenCao.push(`Ngược sườn CẢ NGÀY (gió ${tenHuong}) — bãi này không bay được hướng ấy.`);
        } else if (nguoc.length >= thuan.length) {
          if (tong !== "xau") tong = "chuY";
          khuyenCao.push(
            `Ngược sườn phần lớn ngày (gió ${tenHuong}); lọt khe ${khungCua(thuan)} khi gió xoay ${[...new Set(thuan.map((g) => huongChu(g.huong)))].join("/")} — chỉ bay trong khung ấy.`,
          );
        } else {
          if (tong === "thongTin") tong = "chuY";
          khuyenCao.push(`Ngược sườn ${khungCua(nguoc)} (gió ${tenHuong}) — tránh cất cánh đúng khung ấy.`);
        }
      }
    }

    if (gioMax > 8) tong = "xau";
    else if (gioMax > 6 && tong !== "xau") tong = "chuY";
    them({
      icon: "🌬",
      ten: "Gió mặt đất",
      noiDung: noi,
      ngan: `gió ${huong !== null ? huongChu(huong) + " " : ""}${suc}${tong === "xau" && huong !== null && opts.luatHuong?.xau && trongCung(huong, opts.luatHuong.xau) ? " ngược sườn" : ""}${doiHuong ? ", đổi hướng giữa ngày" : ""}`,
      tong,
    });
  }

  /* ===== 2. GIÓ TRÊN CAO — THEO KHUNG GIỜ, không lấy trung bình cả ngày =====
   *
   * Chủ hỏi 12/09: "gió xiết trên cao là khung giờ nào hay mọi khung giờ?".
   * Bản cũ lấy TRUNG BÌNH cả ngày rồi nói một câu cho cả ngày — mà gió trên
   * cao có nhịp riêng: ngày gió Bắc ở Đồi Bù nó rất mạnh từ sáng tới trưa rồi
   * dịu, chiều bay được. Nói "gió mực 500m mạnh" chung chung là đuổi khách khỏi
   * cả buổi chiều đẹp. Nên xét TỪNG GIỜ trong khung bay, gom thành các đoạn
   * "mạnh" và "dịu", rồi kể ra đoạn nào bay được.
   *
   * ĐỘ CAO GHI CẢ HAI CÁCH: "+500m trên bãi (≈1.150m)". Bãi Đồi Bù đã ở 650m,
   * ghi "mực 500m" trần trụi thì chủ đọc thành 500m so với mực biển — tức
   * DƯỚI bãi — hiểu ngược. Luật chủ 12/09 cho bãi cao: gió ở tầng ấy mạnh
   * nghĩa là gió NGAY TẠI BÃI CẤT đã mạnh hơn nhiều so với dưới bãi hạ — cất
   * cánh dễ bị thổi lùi. Ngưỡng của chủ: ≥10 m/s phải LẮP SPEEDBAR, >12 m/s
   * khuyến cáo không bay.
   */
  let gioCaoManh = false;
  let catGio = false;
  /** Khung bay được SAU KHI gió trên cao dịu ("13–17h") — để mục KHUNG GIỜ không khuyên ngược với mục này. */
  let khungSauGioDiu: string | null = null;
  /** Gió trên cao xiết SUỐT khung bay, không có khúc dịu — đừng khuyên "khung giờ đẹp" nữa. */
  let xietCaNgay = false;
  {
    /** Từng giờ trong khung bay: gió ở +500m và +1.000m trên bãi. */
    const theoGio = gio
      .map((g) => ({ g, v500: gioTaiDoCao(g, 500, alt), v1000: gioTaiDoCao(g, 1000, alt) }))
      .filter((x): x is { g: GioThoiTiet; v500: number; v1000: number | null } => co(x.v500));
    const tb = (m: number) => trungBinh(gio.map((g) => gioTaiDoCao(g, m, alt)).filter(co));
    const v300 = tb(300);
    const v500 = tb(500);
    const v1000 = tb(1000);

    if (v500 !== null && theoGio.length) {
      /** Mốc của chủ: >8 thermal bị xé · >10 phải speedbar · >12 khuyên nghỉ. */
      /**
       * Phân loại theo GIÓ +500M — đó là tầng quyết định cất cánh có bị thổi
       * lùi không, và cũng là tầng `chamGio` tô màu từng giờ; dùng cùng một
       * thước thì câu chữ và màu ô không đá nhau. Gió +1.000m nói riêng ở
       * dưới: nó quyết định "leo cao được không", không quyết định cất cánh.
       */
      /** Từ 8 m/s là phải speedbar (chủ 12/09) — không còn dải "khá mạnh" riêng ở giữa. */
      const xiet = theoGio.filter((x) => x.v500 >= GIO_TREN_CAO_SPEEDBAR);
      const ratManh = theoGio.filter((x) => x.v500 > GIO_TREN_CAO_CAM);
      const diu = theoGio.filter((x) => x.v500 < GIO_TREN_CAO_SPEEDBAR);
      const caoHon = theoGio.filter((x) => (x.v1000 ?? 0) > GIO_TREN_CAO_CAM);
      const dinh = theoGio.reduce((a, b) => (b.v500 > a.v500 ? b : a), theoGio[0]);
      const caoTuyetDoi = (m: number) => `+${m}m trên bãi (≈${Math.round((alt + m) / 50) * 50}m)`;
      const soLieu = `TB +300/+500/+1000m trên bãi: ${v300?.toFixed(0) ?? "–"}/${v500.toFixed(0)}/${v1000?.toFixed(0) ?? "–"} m/s`;
      /** Đoạn dịu SAU đỉnh — đó là khúc bay được của một ngày gió trên cao mạnh. */
      const diuSau = diu.filter((x) => x.g.gio > dinh.g.gio).map((x) => x.g);
      const khungXiet = xiet.length ? khungCua(xiet.map((x) => x.g)) : "";
      const khungDiuSau = diuSau.length >= 2 ? khungCua(diuSau) : "";
      const gioDiu = diuSau.length ? Math.max(...diuSau.map((g) => gioTaiDoCao(g, 500, alt) ?? 0)) : null;

      let noi: string;
      let ngan: string;
      let tong: DiemNhanDinh["tong"];
      if (xiet.length) {
        gioCaoManh = true;
        khungSauGioDiu = khungDiuSau || null;
        const caNgay = xiet.length >= theoGio.length - 1;
        xietCaNgay = caNgay && !khungDiuSau;
        const dauVe =
          `Gió ${caoTuyetDoi(500)} MẠNH ${caNgay ? "CẢ NGÀY" : khungXiet}` +
          ` — tới ${dinh.v500.toFixed(0)} m/s lúc ${gioCua(dinh.g)}` +
          (ratManh.length ? `, trên 12 m/s ${khungCua(ratManh.map((x) => x.g))}` : "") +
          ". Bãi cất ở cao nên gió NGAY TẠI BÃI CẤT mạnh hơn nhiều so với dưới bãi hạ, cất cánh dễ bị thổi lùi";
        const duoiVe = khungDiuSau
          ? `. Dịu từ ${khungDiuSau.slice(0, 2)}h (còn ~${gioDiu?.toFixed(0)} m/s) → bay được ${khungDiuSau}`
          : caNgay
            ? ". Không có khúc nào dịu trong khung bay"
            : "";
        noi = `${dauVe}${duoiVe}.` + (caoHon.length ? ` Lên +1.000m còn mạnh hơn (${Math.max(...caoHon.map((x) => x.v1000 ?? 0)).toFixed(0)} m/s ${khungCua(caoHon.map((x) => x.g))}) — không leo cao.` : "") + ` ${soLieu}`;
        ngan = `gió trên cao mạnh ${caNgay ? "cả ngày" : khungXiet}`;
        /** Xấu = trên 12 m/s chiếm ít nhất nửa khung bay mà không có khúc dịu; vài giờ sáng sớm thì chỉ là chú ý. */
        tong = ratManh.length >= theoGio.length / 2 && !khungDiuSau ? "xau" : "chuY";
        khuyenCao.push(
          `Cẩn thận bị THỔI LÙI ${caNgay ? "cả ngày" : khungXiet}: gió trên bãi 500m ${dinh.v500.toFixed(0)} m/s` +
            (v1000 !== null ? `, 1.000m ${Math.max(...xiet.map((x) => x.v1000 ?? 0)).toFixed(0)} m/s` : "") +
            ` — ` +
            (ratManh.length
              ? `KHUYẾN CÁO KHÔNG BAY ${khungCua(ratManh.map((x) => x.g))} (trên 12 m/s)` +
                (() => {
                  /** Khúc 10–12 m/s còn lại = giờ xiết KHÔNG nằm trong giờ trên 12 — trước đây in nhầm cả dải. */
                  const conLai = xiet.filter((x) => !ratManh.includes(x)).map((x) => x.g);
                  return conLai.length ? `; ${khungCua(conLai)} (8–12 m/s) phải LẮP SPEEDBAR, bám sườn thấp` : "";
                })()
              : "từ 8 m/s đã phải LẮP SPEEDBAR; bám sườn thấp, không leo ra xa sườn, sẵn sàng hạ sớm") +
            (khungDiuSau ? `. Từ ${khungDiuSau.slice(0, 2)}h gió dịu, bay được ${khungDiuSau}.` : "."),
        );
      } else if (v300 !== null && v300 - gioTb > 4) {
        noi = `GIÓ ĐỨT (wind shear): mặt đất ${gioTb.toFixed(1)} m/s nhưng +300m trên bãi đã ${v300.toFixed(0)} m/s — đọc gió ở bãi không tin được, nhiễu động ngay khi rời sườn. ${soLieu}`;
        ngan = "gió đứt ngay trên bãi";
        tong = "chuY";
        catGio = true;
        khuyenCao.push(`Cắt gió trên bãi (mặt đất ${gioTb.toFixed(1)}, +300m ${v300.toFixed(0)} m/s) — thả cờ gió cao, cất cánh dứt khoát, giữ tốc độ ngay khi rời sườn.`);
      } else if (v500 <= 5) {
        noi = `Gió các mực êm cả khung bay — ${soLieu}: không gió đứt, leo thoải mái`;
        ngan = "gió trên cao êm";
        tong = "tot";
      } else {
        noi = `Gió trên cao vừa phải cả khung bay — ${soLieu}`;
        ngan = `gió trên bãi 500m ~${v500.toFixed(0)} m/s`;
        tong = "thongTin";
      }
      them({ icon: "🪁", ten: "Gió trên cao", noiDung: noi, ngan, tong });
    }
  }

  /* ===== 2b. CÀ VÁCH (ridge soaring) — luật chủ 11/09 =====
   *
   * Bộ chấm cũ chỉ biết THERMAL, nên ngày thermal yếu là ra "chuyến ngắn, lift
   * kém" — trong khi ở Đồi Bù gió BẮC 3–5 m/s thổi thẳng vách là bay được cả
   * tiếng mà chẳng cần bọt nhiệt nào. Đó là hai nguồn nâng khác nhau: thermal
   * là bọt khí nóng bốc lên, cà vách là gió bị vách núi hắt lên. Ngày nào gió
   * gió chính bãi đủ mạnh thì phải nói ra, nếu không người trực đọc "ít thermal"
   * rồi bỏ mất một ngày bay đẹp.
   *
   * Thang của chủ: trên 3 m/s cà vách được, 4–5 m/s cà vách CỰC TỐT. Có thêm
   * nắng thì thermal cộng hưởng với gió vách, bay cả tiếng.
   */
  if (opts.luatHuong?.tot) {
    const cung = opts.luatHuong.tot;
    /** Giờ MƯA không tính: vách vẫn dựng gió nhưng chẳng ai bay dưới mưa (chủ 11/09 nhắc thứ Hai). */
    /** Giờ gió +500m trên 12 m/s đã "khuyến cáo không bay" thì không tính là giờ cà vách được — hai câu không được đá nhau. */
    const hop = gio.filter(
      (g) => co(g.huong) && trongCung(g.huong, cung) && g.gio10m >= 3 && g.mua < MUA_BAY && (gioTrenBai(g, 500, alt) ?? 0) <= GIO_TREN_CAO_CAM,
    );
    const cucTot = hop.filter((g) => g.gio10m >= 4 && g.gio10m <= 6);
    if (hop.length >= 2) {
      /** Nắng trong chính những giờ ấy: có nắng thì thermal cộng vào gió vách. */
      const nang = hop.filter((g) => (g.buXa ?? 0) >= 300).length;
      const manhNhat = hop.reduce((a, b) => (b.gio10m > a.gio10m ? b : a), hop[0]);
      const noi =
        `gió chính bãi ${hop[0].gio10m.toFixed(1)}–${manhNhat.gio10m.toFixed(1)} m/s ${khungCua(hop)}` +
        (cucTot.length >= 2 ? ` — CÀ VÁCH CỰC TỐT (4–5 m/s ${khungCua(cucTot)})` : " — cà vách tốt") +
        (nang >= 2 ? ", có nắng nên thermal cộng thêm: bay được cả tiếng" : "") +
        (gioCaoManh ? ". Nhưng gió trên cao đang mạnh — bám vách thấp, đừng leo ra xa" : "");
      them({
        icon: "🪃",
        ten: "Cà vách",
        noiDung: noi,
        ngan: cucTot.length >= 2 ? "cà vách cực tốt" : "cà vách tốt",
        tong: gioCaoManh ? "chuY" : "tot",
      });
      /** Khung cà vách mà gió +500m đã ở mức 10–12 thì nhắc speedbar ngay trong câu này, khỏi phải ghép hai câu. */
      const canSpeedbar = hop.filter((g) => (gioTrenBai(g, 500, alt) ?? 0) >= GIO_TREN_CAO_SPEEDBAR);
      khuyenCao.push(
        `Cà vách ${khungCua(hop)} — gió chính bãi ${hop[0].gio10m.toFixed(1)}–${manhNhat.gio10m.toFixed(1)} m/s, bay bám vách được lâu dù thermal nhẹ` +
          (canSpeedbar.length ? `; ${khungCua(canSpeedbar)} gió trên cao 8–12 m/s — LẮP SPEEDBAR, bám thấp` : "") +
          ".",
      );
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
        noiDung: `${Math.round(gioNang)} giờ nắng, tỉ lệ mây phủ ${Math.round(may)}%${
          gioNang < 3 ? " — ngày âm u, ít nắng đốt đất nên thermal yếu" : may >= 85 && gioNang >= 6 ? " — nắng xuyên mây mỏng" : ""
        }`,
        ngan: gioNang >= 6 ? `${Math.round(gioNang)} giờ nắng` : gioNang >= 3 ? "nắng nửa ngày" : "âm u",
        tong,
      });
    }
  }

  /* ===== 4. THERMAL ===== */
  {
    const cs = gio.map((g) => ({ g, c: chiSoBay(g) }));
    const tranMax = lonNhat(cs.map((x) => x.c.tran).filter(co));
    const capeMax = lonNhat(gio.map((g) => g.cape).filter(co));
    /**
     * KHUNG THERMAL TỐT NHẤT = đỉnh 4 giờ liên tiếp có trần cao nhất, KHÔNG
     * phải cả dải giờ "có thermal". Cả dải thì ra "09:00–16:00" — dài bằng
     * cả ngày bay, chẳng chọn được gì. Một ngày thermal thật sự tốt chỉ 4–5
     * tiếng quanh trưa; nói đúng khúc ấy mới có ích cho người xếp ca.
     */
    const coTran = cs.filter((x) => x.c.tran !== null && (x.g.buXa ?? 0) > 300);
    let dinh = { tu: -1, tb: -1 };
    const DAI = Math.min(4, coTran.length);
    for (let i = 0; i + DAI - 1 < coTran.length; i++) {
      const tb = coTran.slice(i, i + DAI).reduce((t, x) => t + (x.c.tran ?? 0), 0) / DAI;
      if (tb > dinh.tb) dinh = { tu: i, tb };
    }
    const gioTotThermal = dinh.tu >= 0 && DAI > 0 ? [gioCua(coTran[dinh.tu].g), gioCua(coTran[dinh.tu + DAI - 1].g)] : [];
    const gat = cs.filter((x) => x.c.thermal === "gat").map((x) => gioCua(x.g));
    const manhNhat = cs.reduce((a, b) => ((b.c.tran ?? 0) > (a.c.tran ?? 0) ? b : a), cs[0]);
    /**
     * SỐ LIỆU VIẾT RA CHỈ KHI CÓ. Trước đây câu nào cũng ghép "trần ~${tranMax}m"
     * nên ngày mô hình cấp CAPE mà không cấp trần lớp xáo trộn thì in ra
     * "trần ~nullm" (chủ báo 11/09). Nay thiếu số nào thì bỏ hẳn mẩu ấy.
     */
    const soTran = tranMax !== null ? `trần ~${tranMax}m` : null;
    const soCape = capeMax !== null ? `CAPE ${Math.round(capeMax)}` : null;
    const soLieu = [soTran, soCape].filter(Boolean).join(", ");
    const soLieuYeu = [tranMax !== null ? `trần chỉ ~${tranMax}m` : null, soCape].filter(Boolean).join(", ");

    let noi: string;
    let tong: DiemNhanDinh["tong"];
    /**
     * CÓ QUY TẮC THERMAL THÌ KỂ LẠI NÓ, đừng chấm lần hai bằng thước khác.
     * Quy tắc sáu yếu tố đã cân cả nắng, trần xáo trộn, độ dốc nhiệt, LI, gió
     * mực 500m và nhịp giật; mục này chỉ đổi nó ra câu chữ của bãi.
     */
    const tn = opts.thermal;
    if (tn) {
      /**
       * Đổi KHOÁ sang chữ người đọc: `muc` là khoá máy ("khong", "vua"), in
       * thẳng ra thì thẻ hiện "thermal khong 7/100". Không import bảng nhãn từ
       * `thermal.ts` vì file ấy đang import `gioTaiDoCao` của file này — sẽ
       * thành vòng import.
       */
      const NHAN: Record<string, string> = { khong: "rất nhẹ", nhe: "nhẹ", vua: "vừa", manh: "mạnh", gat: "rất mạnh" };
      const nhan = NHAN[tn.muc] ?? tn.muc;
      const khung = tn.khung && tn.diem >= 25 ? `, mạnh nhất ${tn.khung}` : "";
      const so = `${nhan} ${tn.diem}/100${khung}`;
      if (tn.diem < 25) {
        noi = `${so} — ít nâng, chủ yếu bay ebon (và cà vách nếu có gió chính bãi)`;
        tong = "chuY";
      } else if (tn.diem < 45) {
        noi = `${so} — có nâng nhưng nhẹ, chuyến vừa phải; ${gioTotThermal.length ? `khá nhất ${gioTotThermal[0]}–${gioTotThermal[1]}` : "canh giữa trưa"}`;
        tong = "thongTin";
      } else if (gat.length) {
        noi = `${so} — GẮT từ ${gat[0]}: lift mạnh nhưng nhiễu động, dù dễ collapse mép, bãi đáp có gió xoáy (rotor nhiệt)`;
        tong = "chuY";
        khuyenCao.push(`Thermal gắt từ ${gat[0]} — nên bay xong trước ${gat[0]}; sau đó chỉ phi công vững tay, chủ động bay tốc độ và né vùng thermal lõi.`);
      } else {
        noi = `${so} — ${tn.diem >= 65 ? "lift mạnh, lên cao được" : "đủ kéo dài chuyến, không xóc"}${soLieu ? ` (${soLieu})` : ""}`;
        tong = "tot";
      }
      them({
        icon: "🔥",
        ten: "Thermal",
        noiDung: noi,
        ngan: `thermal ${nhan}`,
        tong,
      });
    } else if (tranMax === null && capeMax === null) {
      noi = "mô hình chưa cấp trần lớp xáo trộn";
      tong = "thongTin";
    } else if ((tranMax ?? 0) < 400 && (capeMax ?? 0) < 150) {
      noi = `yếu — ${soLieuYeu}: ít nâng, chủ yếu bay ebon (và cà vách nếu có gió chính bãi)`;
      tong = "chuY";
    } else if (gat.length) {
      noi = `GẮT từ ${gat[0]} — ${soLieu}: lift mạnh nhưng nhiễu động, dù dễ collapse mép, bãi đáp có gió xoáy (rotor nhiệt)`;
      tong = "chuY";
      khuyenCao.push(`Thermal gắt từ ${gat[0]} — nên bay xong trước ${gat[0]}; sau đó chỉ phi công vững tay, chủ động bay tốc độ và né vùng thermal lõi.`);
    } else if ((tranMax ?? 0) >= 800) {
      noi = `tốt — ${soLieu}, mạnh nhất quanh ${gioCua(manhNhat.g)}${
        gioTotThermal.length ? `; khung giờ thermal tốt nhất ${gioTotThermal[0]}–${gioTotThermal[1]}` : ""
      }`;
      tong = "tot";
    } else {
      noi = `vừa — ${soLieu}: đủ kéo dài chuyến, không xóc`;
      tong = "tot";
    }

    /** Nhánh cũ (không có quy tắc thermal truyền vào) mới phải tự viết mục. */
    if (!tn) {
      them({
        icon: "🔥",
        ten: "Thermal",
        noiDung: noi,
        ngan: `thermal ${noi.split(/ — |: /)[0].toLowerCase()}`,
        tong,
      });
    }
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
        if (oi) khuyenCao.push("Ngày oi ổn định: chuyến ngắn, ít nâng — bay sáng sớm cho mát, đừng trông vào chuyến dài.");
      } else if (li >= 1) {
        noi = `ổn định (LI ${li.toFixed(1)}) — bay êm, thermal vừa phải, khó có mưa dông`;
        tong = "tot";
      } else if (li >= -2) {
        noi = `hơi bất ổn (LI ${li.toFixed(1)}) — thermal tốt, có thể có mây tích buổi chiều${dong >= 20 ? `, dông ${dong}%` : ""}`;
        tong = dong >= 20 ? "chuY" : "tot";
      } else {
        noi = `BẤT ỔN ĐỊNH (LI ${li.toFixed(1)}) — thermal gắt và nhiễu động, mây tích phát triển nhanh (nguy cơ OD — overdevelopment), dông ${dong}%`;
        /** Dông là CẢNH BÁO, không phải lệnh cấm (luật chủ 11/09) — xem ghi chú ở `chamGio`. */
        tong = "chuY";
        khuyenCao.push(
          dong >= 40
            ? `Nguy cơ dông ${dong}% — bay sáng, hạ cánh xong trước trưa và canh trời: gust front làm gió đảo chiều, vọt mạnh 10–20 phút TRƯỚC khi mưa tới. Không phải nghỉ cả ngày, nhưng thấy mây tích dựng cao, đáy tối là dừng.`
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
    const apTruoc = opts.ngayTruoc ? trungBinh(gioBay(opts.ngayTruoc.gio, khung).map((g) => g.apSuat).filter(co)) : null;
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
        noi += `. ÁP SUẤT SỤT TỪ ${sut.luc} (${sut.toc.toFixed(1)} hPa/3h) — dông hoặc rãnh áp thấp xuất hiện`;
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
      /**
       * "Bay được từ 15:00" chỉ khi giờ ấy thật sự bay được. Ngày 14/09 Đồi Bù
       * mù tan lúc 15h nhưng 15h vẫn đỏ vì mưa và gió xiết — câu này đứng cạnh
       * "khuyến cáo không bay cả ngày" thì tự cãi mình (chủ 12/09).
       */
      if (tan) {
        /** `ngay.gio` mang cả màu chấm giờ (`muc`); `gio` ở đây là bản đã lọc theo khung nên tra lại theo giờ. */
        const mauGio = new Map(ngay.gio.map((g) => [g.gio, g.muc] as const));
        const sauTan = gio.filter((g) => g.gio >= tan.gio && mauGio.get(g.gio) !== "do");
        khuyenCao.push(
          sauTan.length
            ? `Chờ mù tan — bay được từ ${gioCua(sauTan[0])}.`
            : `Mù tan từ ${gioCua(tan)} nhưng sau đó vẫn không bay được vì lý do khác (xem mưa / gió).`,
        );
      }
    }
  }

  /* ===== 9. MƯA · MƯA BAY · DÔNG ===== */
  {
    /**
     * Ba mức mưa (luật chủ 10/09): từ 0,8 mm/giờ là MƯA THẬT — đếm tiếng;
     * 0,4–0,8 là MƯA BAY — nói cho biết, không tính là mưa; từ 0,3 trở xuống coi như
     * không mưa. Ví dụ của chủ: 10h mưa 1,0, 11h–13h mưa 0,6 → "mưa lúc 10:00,
     * sau đó mưa bay tới 13:00" chứ không phải "mưa 4 tiếng".
     */
    const mua = gio.filter((g) => g.mua >= MUA_DANG_KE);
    const muaBay = gio.filter((g) => g.mua >= MUA_BAY && g.mua < MUA_DANG_KE);
    const dongMax = lonNhat(gio.map((g) => chiSoBay(g).xacSuatDong)) ?? 0;
    const khung = (m: typeof gio) => (m.length === 1 ? `lúc ${gioCua(m[0])}` : `${gioCua(m[0])}–${gioCua(m[m.length - 1])}`);
    if (mua.length) {
      /**
       * Nói SỐ TIẾNG mưa, không nói phần trăm: "khả năng mưa 93%" bị đọc thành
       * "mưa gần cả ngày". Và nói theo KHUNG (chủ 12/09): "mưa to ~4h" thì to
       * nhất từ mấy giờ tới mấy giờ, và KHE KHÔ nào bay được — ai xếp ca cần
       * đúng hai thứ ấy, không cần tổng mm.
       */
      const tongThat = ngay.muaTongThat || mua.reduce((t, g) => t + g.mua, 0);
      const kheMua = kheKhoVaMua(gio);
      let noi = `mưa ${suNangMua(tongThat)} ${kheMua.doanMua} (${mua.length === 1 ? "1 tiếng" : `${mua.length} tiếng`}, tổng ${tongThat.toFixed(1)}mm)`;
      if (kheMua.toNhat) noi += `, to nhất ${kheMua.toNhat}`;
      noi += kheMua.kheKho ? `. KHÔ ${kheMua.kheKho} — bay được trong khung ấy` : ". Không có khe khô đủ dài trong khung bay";
      if (muaBay.length) {
        const sau = muaBay.filter((g) => g.gio > mua[mua.length - 1].gio);
        noi += sau.length === muaBay.length && sau.length ? `; sau đó mưa bay tới ${gioCua(sau[sau.length - 1])}` : `; mưa bay ${khungCua(muaBay)}`;
      }
      them({
        icon: "🌧",
        ten: "Mưa",
        noiDung: noi,
        ngan: `mưa ${suNangMua(tongThat)} ~${mua.length}h`,
        tong: mua.length >= 4 ? "xau" : "chuY",
      });
    } else if (muaBay.length) {
      them({
        icon: "🌦",
        ten: "Mưa bay",
        noiDung: `mưa bay ${khung(muaBay)} (0,4–0,8 mm/giờ) — không phải mưa, bay vẫn bay; chờ ngớt là lên`,
        ngan: "mưa bay",
        tong: "thongTin",
      });
    }
    if (dongMax >= 20 && !diem.some((d) => d.ten === "Ổn định" && d.noiDung.includes("dông"))) {
      /**
       * Dông luôn là mức CHÚ Ý, không bao giờ "xấu": nó cảnh báo chứ không
       * quyết định bay hay nghỉ, và ngày có dông thường thermal mạnh (luật
       * chủ 11/09). Mưa lâu mới là thứ chặn bay, và mưa đã có mục riêng.
       */
      them({
        icon: "⚡",
        ten: "Dông",
        noiDung: `nguy cơ dông tới ${dongMax}% trong ngày — cảnh báo, không phải lệnh cấm; ngày kiểu này thermal thường mạnh, canh mây tích và hạ cánh sớm`,
        ngan: `dông ${dongMax}%`,
        tong: "chuY",
      });
    }
  }

  /* ===== 9a. GUST MẠNH — cảnh báo theo khung giờ (luật chủ 10/09) =====
   * Giật không quyết định bay hay nghỉ: gió 4 giật 12 là thường. Nhưng TRÊN
   * 16 thì phải nói rõ mấy giờ nào, để người trực tránh cất/hạ cánh đúng lúc đó. */
  {
    const manh = gio.filter((g) => g.giat > GIAT_CANH_BAO);
    if (manh.length) {
      /** Gom thành từng dải giờ liền nhau: "13:00–15:00, 17:00". */
      const dai: string[] = [];
      let tu = manh[0];
      let truoc = manh[0];
      const h = (g: (typeof gio)[number]) => Number(g.gio.slice(11, 13));
      for (const g of manh.slice(1).concat([null as never])) {
        if (g && h(g) === h(truoc) + 1) {
          truoc = g;
          continue;
        }
        dai.push(tu === truoc ? gioCua(tu) : `${gioCua(tu)}–${gioCua(truoc)}`);
        if (g) tu = truoc = g;
      }
      const max = lonNhat(manh.map((g) => g.giat)) ?? 0;
      them({
        icon: "💨",
        ten: "Gust mạnh",
        noiDung: `gust mạnh ${dai.join(", ")} (tới ${max.toFixed(0)} m/s) — tránh cất/hạ cánh đúng mấy giờ đó, giữ tốc độ khi bay`,
        ngan: `gust mạnh ${dai[0]}${dai.length > 1 ? "…" : ""}`,
        tong: max > 18 ? "xau" : "chuY",
      });
    }
  }

  /* ===== 9b. NHIỄU ĐỘNG — gộp các nguồn xóc lại một câu ===== */
  {
    const nguon: string[] = [];
    const gioGat = gio.filter((g) => chiSoBay(g).thermal === "gat").map(gioCua);
    if (gioGat.length) nguon.push(`thermal gắt ${gioGat[0]}–${gioGat[gioGat.length - 1]}`);
    const giatManh = gio.filter((g) => g.giat > GIAT_CANH_BAO).map(gioCua);
    if (giatManh.length) nguon.push(`gust mạnh ${giatManh[0]}–${giatManh[giatManh.length - 1]}`);
    if (gioCaoManh) nguon.push("gió đứt với tầng cao");
    else if (catGio) nguon.push("gió đứt ngay trên bãi");
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

  /* ===== 10. KHUNG GIỜ =====
   *
   * Khung đẹp của bảng giờ chỉ nhìn GIÓ MẶT ĐẤT; ngày gió trên cao xiết buổi
   * sáng nó vẫn nói "07:00–17:00" ngay dưới câu "khuyến cáo không bay 07–13h"
   * — hai câu đá nhau (chủ 12/09). Có khúc dịu thì khung đẹp là khúc ấy.
   */
  if (khungSauGioDiu) {
    khuyenCao.unshift(`Khung giờ đẹp nhất: ${khungSauGioDiu} (sau khi gió trên cao dịu).`);
  } else if (xietCaNgay) {
    /* im — câu "khuyến cáo không bay cả ngày" đã nói đủ, thêm "khung giờ đẹp" là tự cãi mình */
  } else if (ngay.khungDep) {
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
  const uuTien = (c: string) => (/^(Cẩn thận bị THỔI LÙI|Gió mực 500m rất|Nguy cơ dông|Áp suất sụt|Gió tầng)/.test(c) ? 0 : /^(Gió mực|Không leo|Cắt gió|Ngày bất ổn|Thermal gắt|Nắp)/.test(c) ? 1 : /^Khung giờ/.test(c) ? 3 : 2);
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
  /**
   * NGƯỢC SƯỜN CẢ NGÀY đứng trước mọi chuyện gió trên cao (Viên Nam 13/09: gió
   * Bắc cả ngày mà kiểu ngày lại nói "gió trên cao mạnh" — người đọc tưởng chỉ
   * cần chờ gió dịu). Hướng cấm thì có dịu cũng không bay.
   */
  const gioDat = tim("Gió mặt đất");
  if (gioDat?.tong === "xau" && gioDat.ngan.includes("ngược sườn")) {
    return `Ngày NGƯỢC SƯỜN: ${gioDat.ngan.replace(/ ngược sườn.*$/, "")} — bãi này không bay được hướng ấy${gioDat.ngan.includes("đổi hướng") ? "; xem giờ gió xoay trong bảng" : ""}`;
  }
  if (gioCao?.tong === "xau") return "Ngày GIÓ TRÊN CAO RẤT MẠNH: mặt đất có thể lặng nhưng lên vài trăm mét là bị thổi lùi — không bay";
  /** Mưa cả ngày hay mù cả ngày quyết định hơn mọi chỉ số thermal — xét trước. */
  const mua = tim("Mưa");
  if (mua?.tong === "xau") {
    const k = kheKhoVaMua(gio);
    return (
      `Ngày MƯA ${k.doanMua}` +
      (k.toNhat ? `, to nhất ${k.toNhat}` : "") +
      (k.kheKho ? ` — khô ${k.kheKho}: bay được trong khung ấy, hạ trước khi mưa tới` : " — không có khe khô đủ dài, coi như nghỉ")
    );
  }
  if (tim("Mù")?.tong === "xau") return "Ngày MÙ CẢ NGÀY: bãi chìm trong mây, không thấy bãi đáp — không bay";
  if (li !== null && li <= -2) return "Ngày BẤT ỔN ĐỊNH: thermal gắt, nhiễu động mạnh, mây tích phát triển nhanh — nguy cơ OD/dông chiều, chỉ bay sáng";
  if (gioCao?.tong === "chuY" && /^gió trên cao mạnh/.test(gioCao.ngan)) {
    /** Nói luôn khúc bay được nếu mục gió đã tìm ra — "chiều bay được" là thứ người ta cần biết nhất. */
    const khe = gioCao.noiDung.match(/bay được (\d{2}–\d{2}h)/);
    return `Ngày GIÓ TRÊN CAO MẠNH ${gioCao.ngan.replace(/^gió trên cao mạnh /, "")}: thermal bị xé, cất cánh dễ thổi lùi — ${khe ? `chờ gió dịu, bay ${khe[1]}` : "bay bám sườn thấp, chuyến ngắn"}`;
  }
  if (onDinh?.noiDung.includes("OI BỨC")) return "Ngày ỔN ĐỊNH OI BỨC: lift yếu, không khí đục, mù khô — bay ebon, chuyến ngắn, khách dễ mệt vì nóng";
  if (nghich?.tong === "chuY") return "Ngày NGHỊCH NHIỆT THẤP: trần bay bị chặn, mù tích dưới nắp — sáng đục, trưa mới mở";
  if (thermal?.noiDung.startsWith("GẮT")) return "Ngày THERMAL GẮT: lift mạnh nhưng nhiễu động, bãi đáp có rotor nhiệt — bay xong sớm";
  /**
   * CÀ VÁCH THẮNG "ÍT THERMAL" (luật chủ 11/09): ngày lift nhiệt yếu mà gió
   * gió chính bãi 3–5 m/s thì vẫn bay được lâu — nói "ít thermal, chuyến ngắn" là
   * đuổi khách khỏi một ngày đẹp. Mưa và mù đã xét trước đó nên không lấn.
   */
  const caVach = tim("Cà vách");
  if (caVach) {
    return caVach.ngan === "cà vách cực tốt"
      ? `Ngày CÀ VÁCH CỰC TỐT: gió chính bãi dựng đều lên vách — bay bám vách cả tiếng${thermal?.noiDung.startsWith("yếu") ? ", không trông vào thermal" : ", thermal cộng thêm"}`
      : `Ngày CÀ VÁCH: gió chính bãi đủ cà — bay bám vách được${thermal?.noiDung.startsWith("yếu") ? " dù thermal nhẹ" : ", có cả thermal"}`;
  }
  if (thermal?.noiDung.startsWith("yếu")) return "Ngày ÍT THERMAL: bay ebon là chính, chuyến ngắn, lift kém — trời êm, ít xóc";
  if (mua) {
    const k = kheKhoVaMua(gio);
    return `Ngày CÓ MƯA GIỮA CHỪNG (mưa ${k.doanMua}${k.toNhat ? `, to nhất ${k.toNhat}` : ""})${k.kheKho ? ` — khô ${k.kheKho}, bay trong khung ấy` : ""}, để mắt tới mây đen phía gió tới`;
  }
  if (li !== null && li >= 1 && thermal?.tong === "tot") return "Ngày ỔN ĐỊNH, THERMAL ÊM: lift đều, ít xóc — kiểu ngày êm nhất trong năm";
  if (li !== null && li > -2 && li < 1 && thermal?.tong === "tot") return "Ngày HƠI BẤT ỔN, THERMAL TỐT: lift mạnh, mây tích đẹp buổi chiều — chiều để ý mây phát triển";
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
