// lib/baobay/thoi-tiet.ts

/**
 * THỜI TIẾT ĐIỂM BAY — phần tính thuần, không chạm mạng và không chạm cơ sở dữ liệu.
 *
 * Chia đôi như vậy để CHẤM MÀU kiểm được bằng phép thử: đưa vào một mảng giờ,
 * nhận ra xanh / vàng / đỏ. Phần gọi Open-Meteo và lưu Mongo nằm ở service.
 *
 * VÌ SAO KHÔNG ĐÓNG CỨNG NGƯỠNG: chủ điểm bay quyết định bay hay nghỉ bằng kinh
 * nghiệm tại chỗ, không bằng một con số trong sách. Nên máy chỉ giữ một bộ
 * ngưỡng KHỞI ĐIỂM, còn mỗi lần chủ chấm "hôm nay bay tốt / hạn chế / nghỉ"
 * thì `hocNguong()` dò lại ngưỡng nào chia đúng nhất những ngày đã chấm — càng
 * chấm nhiều, con số càng giống cách người thật nhìn trời.
 */

import { normalizeSpot, type SpotId } from "./spots";

/* ================================================================== */
/* Toạ độ điểm bay                                                     */
/* ================================================================== */

/**
 * LUẬT HƯỚNG GIÓ CỦA MỘT ĐIỂM BAY.
 *
 * Cùng một tốc độ gió, cùng một giờ, mà hướng khác nhau thì một bên bay đẹp
 * còn một bên không ai dám cất cánh — vì nó phụ thuộc sườn núi quay về đâu.
 * Nên luật hướng phải khai riêng từng điểm, không có mặc định chung.
 *
 * Cung ghi theo độ, `[từ, đến]` đi THEO CHIỀU KIM ĐỒNG HỒ và cho phép vắt qua
 * mốc bắc ([315, 45] là quanh hướng bắc).
 */
export type LuatHuong = {
  /** Cung gió THUẬN sườn — bay đẹp. */
  tot?: [number, number];
  /** Cung gió NGƯỢC sườn — không bay, bất kể tốc độ. */
  xau?: [number, number];
  /**
   * Những hướng mà khi gió MẠNH thì sinh GIÓ XIẾT (gió luồn qua khe, tăng tốc
   * đột ngột ở mép sườn). Ghi tâm hướng, máy tự chấp nhận lệch ±22,5°.
   */
  xiet?: number[];
};

export type ToaDoDiemBay = {
  lat: number;
  lon: number;
  /** Độ cao chỗ cất cánh (m) — để đối chiếu với độ cao mô hình khí tượng. */
  alt?: number;
  /** Tên chỗ cất cánh, hiện trên thẻ để biết đang xem đúng chỗ hay không. */
  ten: string;
  /**
   * Cung hướng gió THUẬN cho cất cánh, tính theo độ (0 = bắc, 90 = đông).
   * `[từ, đến]` đi theo chiều kim đồng hồ, cho phép vắt qua mốc 0 ([315, 45]).
   * Chưa đặt thì máy không chấm hướng — chỉ nhìn tốc độ và mưa.
   */
  huongThuan?: [number, number];
  /** Luật hướng đầy đủ của điểm: gió tốt · gió xấu · hướng sinh gió xiết. */
  luatHuong?: LuatHuong;
};

/**
 * TOẠ ĐỘ TẠM, tra theo bản đồ — chủ điểm bay sửa lại trong trang cài đặt cho
 * đúng chỗ cất cánh thật.
 *
 * Sai vài trăm mét ở đồng bằng thì không đổi gì, nhưng ở núi thì đổi hẳn: mô
 * hình khí tượng chia ô ~9km và lấy độ cao trung bình của ô, nên đứng đỉnh đèo
 * hay đứng dưới thung lũng ra hai kiểu gió khác nhau.
 */
export const TOA_DO_MAC_DINH: Record<SpotId, ToaDoDiemBay> = {
  /**
   * KHAU PHẠ — luật hướng do chủ điểm bay đọc từ kinh nghiệm bay tại chỗ:
   *  · TỐT: đông và đông bắc (cung 22,5°–112,5°), nhẹ tới hơi mạnh — hơi mạnh
   *    thì thermal lên đẹp nhất.
   *  · XẤU: từ đông nam vòng qua nam, tây nam tới tây (112,5°–292,5°) — ngược
   *    sườn, không bay bất kể tốc độ.
   *  · XIẾT khi gió MẠNH: bắc, đông, tây — ba hướng gió luồn qua khe đèo rồi
   *    tăng tốc đột ngột ngay mép cất cánh.
   */
  "khau-pha": {
    lat: 21.7546,
    lon: 104.1279,
    alt: 1200,
    ten: "Đèo Khau Phạ (Mù Cang Chải)",
    luatHuong: { tot: [23, 112], xau: [113, 292], xiet: [0, 90, 270] },
  },
  sapa: { lat: 22.3364, lon: 103.8438, alt: 1500, ten: "Sa Pa (Lào Cai)" },
  /**
   * HÀ NỘI = bãi ĐỒI BÙ (điểm chính). Luật hướng của chủ: tốt với đông, bắc,
   * tây; xấu với nam và tây nam.
   *
   * Bãi VIÊN NAM cách đây chừng 20km và quay NGƯỢC phía nên có luật riêng —
   * xem `lib/weather-spots.ts`, nơi hai bãi được bày thành hai bảng.
   */
  "ha-noi": {
    lat: 20.8386,
    lon: 105.5561,
    alt: 833,
    ten: "Đồi Bù (Chương Mỹ)",
    luatHuong: { tot: [247, 112], xau: [157, 246] },
  },
};

export function toaDoDiemBay(spot: string, luu?: Partial<ToaDoDiemBay> | null): ToaDoDiemBay {
  const goc = TOA_DO_MAC_DINH[normalizeSpot(spot)];
  if (!luu) return goc;
  return {
    lat: Number.isFinite(luu.lat) ? Number(luu.lat) : goc.lat,
    lon: Number.isFinite(luu.lon) ? Number(luu.lon) : goc.lon,
    alt: Number.isFinite(luu.alt as number) ? Number(luu.alt) : goc.alt,
    ten: luu.ten?.trim() || goc.ten,
    huongThuan: luu.huongThuan ?? goc.huongThuan,
    luatHuong: luu.luatHuong ?? goc.luatHuong,
  };
}

/* ================================================================== */
/* Ngưỡng an toàn                                                      */
/* ================================================================== */

export type NguongBay = {
  /** Gió trung bình (m/s) còn được coi là ĐẸP. */
  gioXanh: number;
  /** Trên mức này là CẤM — giữa hai mức là vàng, cân nhắc. */
  gioDo: number;
  /**
   * Gió giật (m/s) vượt mức này thì KHÔNG KHUYẾN CÁO BAY. Mặc định 18 — giật
   * dưới 14 không ảnh hưởng quyết định, 14–18 chỉ là cảnh báo nhiễu.
   */
  giatDo: number;
  /** Mưa trong giờ (mm) vượt mức này là cấm. */
  muaDo: number;
  /**
   * Trần mây (m TRÊN bãi cất cánh) thấp hơn mức này là cấm: mây đã trùm bãi,
   * cất cánh vào trong mây thì không thấy sườn núi lẫn bãi đáp.
   */
  tranMayDo: number;
};

/**
 * NGƯỠNG KHỞI ĐIỂM cho dù lượn đôi (chở khách). ĐƠN VỊ GIÓ LÀ M/S.
 *
 * Dùng m/s vì đó là đơn vị phi công đọc trên máy đo gió tại bãi và nói với
 * nhau ngoài đèo; đổi qua km/h trên màn hình rồi lại nhẩm ngược lại trong đầu
 * là chỗ sinh nhầm lẫn, mà nhầm ở đây thì trả giá bằng người.
 *
 * Lấy mức phổ biến của tandem thương mại chứ không lấy mức bay solo: chở khách
 * thì cánh nặng hơn, cất cánh chậm hơn, và người ngồi trước không biết cách
 * xử lý khi dù bị gấp. Đây chỉ là chỗ BẮT ĐẦU — số thật do chủ chấm dần.
 */
export const NGUONG_MAC_DINH: NguongBay = { gioXanh: 4, gioDo: 7, giatDo: 18, muaDo: 0.5, tranMayDo: 150 };

export function nguongCuaDiem(luu?: Partial<NguongBay> | null): NguongBay {
  const n = { ...NGUONG_MAC_DINH };
  if (!luu) return n;
  for (const k of ["gioXanh", "gioDo", "giatDo", "muaDo", "tranMayDo"] as const) {
    const v = Number(luu[k]);
    if (Number.isFinite(v) && v > 0) n[k] = v;
  }
  /** Xanh không được cao hơn đỏ — gõ nhầm thì đảo lại còn hơn chấm bậy. */
  if (n.gioXanh > n.gioDo) [n.gioXanh, n.gioDo] = [n.gioDo, n.gioXanh];
  return n;
}

/* ================================================================== */
/* Chấm màu từng giờ                                                   */
/* ================================================================== */

export type GioThoiTiet = {
  /** "YYYY-MM-DDTHH:mm" giờ Việt Nam. */
  gio: string;
  /** Gió trung bình ở độ cao 10m, M/S. */
  gio10m: number;
  giat: number;
  /** Hướng gió THỔI TỚI TỪ đâu, độ (0 = từ bắc). */
  huong: number;
  mua: number;
  may: number;
  nhietDo: number;
  /** Điểm sương (°C) — cùng với nhiệt độ suy ra trần mây, xem `tranMay()`. */
  diemSuong?: number;
  /** Mây THẤP (%) — thứ trùm lên bãi cất cánh, khác mây tổng cộng. */
  mayThap?: number;
  /** Độ ẩm (%) — trên 97 kèm chênh nhiệt nhỏ là sương mù. */
  am?: number;

  /* ---- Chỉ số đối lưu: thermal, độ ổn định, nguy cơ dông ---- */
  /** CAPE (J/kg) — thế năng đối lưu: càng lớn không khí càng muốn bốc lên. */
  cape?: number;
  /**
   * Lifted index (°C) — thước ĐỘ ỔN ĐỊNH của cả cột khí. Dương lớn: khí nén
   * chặt, không có thermal, trời êm. Âm: khí muốn bốc, có thermal; âm sâu là
   * mầm dông.
   */
  chiSoNang?: number;
  /** Trần lớp xáo trộn (m) — xấp xỉ TRẦN BAY thermal trong ngày. */
  tranThermal?: number;
  /** Xác suất mưa trong giờ (%), lấy thẳng từ mô hình. */
  xacSuatMua?: number;
  /** Bức xạ mặt trời (W/m²) — nắng đốt mặt đất mạnh thì thermal mạnh. */
  buXa?: number;
  /** Ô lưới mô hình cao hơn bãi cất cánh bao nhiêu mét — xem `tranMay`. */
  chenhDoCao?: number;

  /* ---- Tầng cao và áp suất: cho bộ nhận định ngày bay ---- */
  /** Áp suất quy về mực biển (hPa) — để xem xu hướng, không phải trị tuyệt đối. */
  apSuat?: number;
  /** Giây có nắng trong giờ (0–3600). */
  giayNang?: number;
  /** Gió ở ba mực khí áp (m/s): 925 ≈ 800m · 850 ≈ 1.500m · 700 ≈ 3.000m trên mực biển. */
  gio925?: number;
  gio850?: number;
  gio700?: number;
  huong850?: number;
  /** Nhiệt độ ở bốn mực (°C) — so hai mực kề nhau để tìm lớp nghịch nhiệt. */
  t1000?: number;
  t925?: number;
  t850?: number;
  t700?: number;
  /** Độ cao thật (m trên mực biển) của mực 925 và 850 — đổi ra "cách bãi bao nhiêu". */
  h925?: number;
  h850?: number;
  mayGiua?: number;
  mayCao?: number;
};

/* ------------------------------------------------------------------ */
/* Chỉ số bay: thermal · ổn định · dông                                */
/* ------------------------------------------------------------------ */

export type SucThermal = "khong" | "nhe" | "vua" | "manh" | "gat";

export type ChiSoBay = {
  /**
   * THERMAL trong ngày. Với bay đôi CHỞ KHÁCH thì "êm" mới là tốt: thermal vừa
   * đủ giúp kéo dài chuyến, còn thermal gắt làm dù xóc, khách say, và bãi đáp
   * nổi bụi gió xoáy. Ngược hẳn với bay solo đường dài — nên đừng đọc thang
   * này như thang của phi công thể thao.
   */
  thermal: SucThermal;
  /** Trần bay ước tính (m trên mặt đất), null khi mô hình không cấp. */
  tran: number | null;
  /** Câu tả độ ổn định để hiện thẳng lên màn hình. */
  onDinh: string;
  /** Xác suất dông ước lượng (%), gộp từ CAPE và chỉ số nâng. */
  xacSuatDong: number;
  /** Xác suất mưa (%) của mô hình, -1 khi không có. */
  xacSuatMua: number;
};

/**
 * GỘP CÁC CHỈ SỐ ĐỐI LƯU THÀNH BA CÂU NGƯỜI ĐỌC HIỂU.
 *
 * CAPE và lifted index là ngôn ngữ của khí tượng, không phải của người xếp
 * lịch bay. Ở đây quy chúng về: bốc mạnh cỡ nào, trời êm hay động, và khả năng
 * dông bao nhiêu phần trăm — ba câu quyết định được lịch trong ngày.
 *
 * XÁC SUẤT DÔNG tính bằng thang bậc chứ không bằng công thức thống kê: CAPE
 * cho biết có bao nhiêu "nhiên liệu", chỉ số nâng cho biết có "mồi lửa" không.
 * Nhiều nhiên liệu mà khí quyển vẫn nén chặt thì dông không nổ; ít nhiên liệu
 * mà cột khí bất ổn sâu thì vẫn có ổ dông lẻ.
 */
export function chiSoBay(g: GioThoiTiet): ChiSoBay {
  const cape = g.cape ?? 0;
  const li = g.chiSoNang;
  const tran = Number.isFinite(g.tranThermal as number) ? Math.round(g.tranThermal as number) : null;
  const buXa = g.buXa ?? 0;

  /** Trần bay là thước chính; chưa có trần thì mượn CAPE và nắng để đoán. */
  let thermal: SucThermal;
  if (tran !== null) {
    thermal = tran < 300 ? "khong" : tran < 800 ? "nhe" : tran < 1500 ? "vua" : tran < 2200 ? "manh" : "gat";
  } else {
    thermal = cape < 100 ? "khong" : cape < 400 ? "nhe" : cape < 1000 ? "vua" : cape < 2000 ? "manh" : "gat";
  }
  /** Đêm và sáng sớm: không có nắng thì không có thermal, dù CAPE còn sót lại. */
  if (buXa < 50 && thermal !== "khong") thermal = "khong";

  let onDinh: string;
  if (li === undefined || !Number.isFinite(li)) onDinh = "—";
  else if (li >= 6) onDinh = "rất ổn định — trời êm, ít thermal";
  else if (li >= 2) onDinh = "ổn định — bay êm";
  else if (li >= -1) onDinh = "hơi bất ổn — có thermal";
  else if (li >= -4) onDinh = "bất ổn — thermal mạnh, dễ có mây đối lưu";
  else onDinh = "rất bất ổn — nguy cơ dông";

  let xacSuatDong = 0;
  if (cape > 0) {
    /** Nhiên liệu: CAPE 2500 J/kg trở lên coi như đầy thang. */
    const nhienLieu = Math.min(1, cape / 2500);
    /** Mồi: chỉ số nâng 0 trở xuống mới tính, -6 là hết thang. */
    const moi = li === undefined || !Number.isFinite(li) ? 0.35 : Math.min(1, Math.max(0, -li / 6));
    xacSuatDong = Math.round(nhienLieu * (0.3 + 0.7 * moi) * 100);
  }

  return {
    thermal,
    tran,
    onDinh,
    xacSuatDong,
    xacSuatMua: xacSuatMuaThat(g.xacSuatMua, g.mua),
  };
}

export const NHAN_THERMAL: Record<SucThermal, string> = {
  khong: "không",
  nhe: "nhẹ",
  vua: "vừa",
  manh: "mạnh",
  gat: "gắt",
};

export type MucDo = "xanh" | "vang" | "do";

export type ChamGio = {
  muc: MucDo;
  /** Vì sao ra màu đó — hiện thẳng trên ô để người trực khỏi phải đoán. */
  lyDo: string[];
};

/* ------------------------------------------------------------------ */
/* Thang sức gió — thang của chủ điểm bay, không phải thang Beaufort    */
/* ------------------------------------------------------------------ */

export type SucGio = "nhe" | "vua" | "hoiManh" | "manh" | "ratManh";

/**
 * NĂM MỨC GIÓ theo cách chủ điểm bay đọc trời (m/s):
 *   < 2 nhẹ · 2–4 vừa · 4–6 hơi mạnh · 6–8 mạnh · > 8 rất mạnh
 *
 * Không dùng thang Beaufort: Beaufort chia theo sức phá của gió trên biển, còn
 * ở đây mốc nào cũng gắn với một quyết định cất cánh cụ thể. Hai mức đầu là
 * bay được, "hơi mạnh" là lúc thermal lên đẹp nhất ở Khau Phạ, "mạnh" là chỉ
 * phi công cứng, "rất mạnh" là gấp dù.
 */
export function sucGio(v: number): SucGio {
  if (v < 2) return "nhe";
  if (v < 4) return "vua";
  if (v < 6) return "hoiManh";
  if (v <= 8) return "manh";
  return "ratManh";
}

export const NHAN_SUC_GIO: Record<SucGio, string> = {
  nhe: "nhẹ",
  vua: "vừa",
  hoiManh: "hơi mạnh",
  manh: "mạnh",
  ratManh: "rất mạnh",
};

export type SucGiat = "nhe" | "vua" | "manh" | "ratManh";

/**
 * Thang GIÓ GIẬT (luật chủ 10/09): **giật KHÔNG quyết định bay hay nghỉ** trừ
 * khi quá mạnh.
 *
 *   < 6 nhẹ · 6–14 vừa (vẫn bay bình thường) · 14–18 mạnh, nhiễu (cảnh báo)
 *   · > 18 không khuyến cáo bay
 *
 * Vì sao nới xa đến thế: mô hình chia ô ~25km, ở địa hình đèo nó gần như luôn
 * báo giật gấp ba bốn lần gió trung bình. Lấy con số ấy làm mốc cấm thì Khau
 * Phạ đỏ quanh năm, còn phi công đứng ở bãi thì thấy trời hoàn toàn bay được —
 * cảnh báo sai kiểu đó vài lần là không ai nhìn bảng nữa.
 */
export function sucGiat(v: number): SucGiat {
  if (v < 6) return "nhe";
  if (v < 14) return "vua";
  if (v <= 18) return "manh";
  return "ratManh";
}

export const NHAN_SUC_GIAT: Record<SucGiat, string> = {
  nhe: "nhẹ",
  vua: "vừa",
  manh: "mạnh, nhiễu",
  ratManh: "rất mạnh — không khuyến cáo bay",
};

/**
 * MŨI TÊN HƯỚNG GIÓ.
 *
 * Mũi tên chỉ ĐÚNG CHIỀU GIÓ THỔI TỚI — gió đông (thổi từ phía đông) thì mũi
 * tên chỉ sang trái, tức là chiều nó đang đẩy dù. Đọc bằng mắt nhanh hơn hẳn
 * chữ "ĐĐB": nhìn cả hàng ngang là thấy ngay lúc nào gió đổi chiều.
 */
const MUI_TEN = ["↓", "↙", "↙", "←", "←", "↖", "↖", "↑", "↑", "↗", "↗", "→", "→", "↘", "↘", "↓"];

export function muiTenGio(do_: number): string {
  const h = ((do_ % 360) + 360) % 360;
  return MUI_TEN[Math.round(h / 22.5) % 16];
}

/**
 * BIỂU TƯỢNG TRỜI — nắng, nắng một phần, âm u, mưa.
 *
 * Con số phần trăm mây đúng nhưng không gợi hình: "35%" phải nghĩ một nhịp mới
 * ra "trời có nắng". Biểu tượng thì nhìn phát biết, và biết ngay có nắng để
 * chụp ảnh cho khách hay không — thứ khách hỏi nhiều thứ hai sau "có bay được
 * không".
 */
export function bieuTuongTroi(may: number, mua = 0, buXa?: number): string {
  if (mua > 0.5) return "🌧";
  if (mua > 0.1) return "🌦";
  /** Chưa có nắng (sáng sớm, chiều muộn) thì đừng vẽ mặt trời. */
  if (buXa !== undefined && buXa < 30) return may > 70 ? "☁️" : "🌥";
  if (may < 30) return "☀️";
  if (may < 70) return "⛅";
  return "☁️";
}

export type HuongTheNao = "tot" | "xau" | "thuong";

/**
 * HƯỚNG NÀY TỐT HAY XẤU cho điểm bay — để tô màu mũi tên.
 *
 * Màu ở đây trả lời một câu khác hẳn màu ô gió: ô gió nói "mạnh cỡ nào", mũi
 * tên nói "thổi vào sườn hay thổi ngược". Ở núi thì hai chuyện ấy độc lập —
 * gió nhẹ mà ngược sườn vẫn không bay được — nên phải nhìn thấy cả hai.
 *
 * Điểm chưa khai luật hướng thì trả "thường": thà để xám còn hơn tô xanh một
 * hướng mà mình không biết có thuận sườn hay không.
 */
export function huongTheNao(huong: number, gio: number, luat?: LuatHuong): HuongTheNao {
  if (!luat) return "thuong";
  if (luat.xau && trongCung(huong, luat.xau)) return "xau";
  const manh = gio > 6;
  if (manh && luat.xiet?.some((h) => Math.abs(lechGoc(huong, h)) <= 22.5)) return "xau";
  if (luat.tot && trongCung(huong, luat.tot)) return "tot";
  return "thuong";
}

/** Hướng có nằm trong một cung không — cung cho phép vắt qua mốc bắc. */
export function trongCung(huong: number, cung: [number, number]): boolean {
  const [tu, den] = cung;
  const h = ((huong % 360) + 360) % 360;
  return tu <= den ? h >= tu && h <= den : h >= tu || h <= den;
}

/** Lệch bao nhiêu độ giữa hai hướng, luôn trong khoảng -180…180. */
export function lechGoc(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/** Hướng gió có nằm trong cung thuận không (cung cho phép vắt qua mốc bắc). */
export function huongThuanLoi(huong: number, cung?: [number, number]): boolean {
  if (!cung) return true;
  return trongCung(huong, cung);
}

const HUONG_CHU = ["B", "BĐB", "ĐB", "ĐĐB", "Đ", "ĐĐN", "ĐN", "NĐN", "N", "NTN", "TN", "TTN", "T", "TTB", "TB", "BTB"];

/** 135° → "ĐN" — người trực đọc chữ nhanh hơn đọc số độ. */
export function huongChu(do_: number): string {
  const h = ((do_ % 360) + 360) % 360;
  return HUONG_CHU[Math.round(h / 22.5) % 16];
}

/**
 * TRẦN MÂY ước tính, mét TRÊN mặt đất — công thức phi công vẫn dùng ngoài bãi.
 *
 * Không khí bốc lên nguội đi khoảng 1°C mỗi 100m, còn điểm sương chỉ giảm
 * ~0,2°C, nên khoảng cách nhiệt độ và điểm sương khép lại sau chừng
 * 125m cho mỗi 1°C chênh lệch — tới lúc khép là hơi nước ngưng thành mây.
 * Chênh 2°C thì mây nằm ngay trên đầu ở 250m; chênh 10°C thì mây cao 1.250m.
 *
 * Vì sao phải tính: mô hình cho biết BAO NHIÊU PHẦN TRĂM mây, nhưng không nói
 * mây nằm ở độ cao nào. Ở núi, 80% mây nằm cao 2.000m là trời đẹp có bóng râm;
 * 80% mây nằm ở 100m là bãi cất cánh chìm trong sương, không thấy lối bay.
 */
export function tranMay(
  nhietDo: number,
  diemSuong?: number,
  mayThap?: number,
  /**
   * Chênh độ cao giữa Ô LƯỚI của mô hình và BÃI CẤT CÁNH thật (m).
   *
   * Đây là chỗ trước đây tính sai và ra số thấp vô lý. Mô hình chia ô ~25km
   * rồi lấy độ cao TRUNG BÌNH của ô: ở Khau Phạ ô ấy cao 1.620m trong khi bãi
   * cất cánh ở 1.200m. Công thức chỉ cho biết mây cách MẶT ĐẤT CỦA MÔ HÌNH bao
   * nhiêu, nên muốn biết mây cách bãi bao nhiêu thì phải cộng thêm 420m ấy —
   * không cộng thì báo "trần mây 87m" trong khi đứng ở bãi nhìn lên còn hơn
   * nửa cây số nữa mới tới mây.
   */
  chenhDoCao = 0,
): number | null {
  if (diemSuong === undefined || !Number.isFinite(diemSuong)) return null;
  /**
   * KHÔNG CÓ MÂY THÌ KHÔNG CÓ TRẦN MÂY.
   *
   * Công thức chỉ nói "nếu khối khí này bốc lên thì tới độ cao ấy nó ngưng
   * thành mây" — nó KHÔNG nói trên đầu đang có mây. Ở núi nhiệt đới, sáng sớm
   * và sau mưa thì nhiệt độ với điểm sương gần nhau nên con số ra rất thấp,
   * trong khi trời quang: báo "trần mây 200m" lúc nhìn lên thấy nắng là sai
   * hiển nhiên, và người ta sẽ thôi tin cả bảng.
   *
   * Nên chỉ trả số khi mô hình thật sự thấy mây ở tầng thấp (≥ 25%).
   */
  if (mayThap !== undefined && Number.isFinite(mayThap) && mayThap < 25) return null;
  return Math.max(0, Math.round((nhietDo - diemSuong) * 125 + chenhDoCao));
}

/**
 * XÁC SUẤT MƯA ĐÃ HIỆU CHỈNH.
 *
 * Mô hình ở vùng nhiệt đới mùa mưa gần như luôn báo 90–100%, vì nó tính "có
 * mưa ở đâu đó trong ô lưới 25km trong giờ đó" — mà ô ấy trùm cả một vùng núi
 * rộng. Người xếp lịch bay cần biết "có mưa Ở BÃI, đủ ướt để hoãn không", nên
 * hạ theo LƯỢNG mưa dự báo: xác suất cao mà lượng gần bằng không thì đó là vài
 * hạt ở sườn bên kia, không phải cơn mưa ở bãi.
 */
export function xacSuatMuaThat(xacSuat?: number, luongMua = 0): number {
  if (xacSuat === undefined || !Number.isFinite(xacSuat)) return -1;
  const p = Math.max(0, Math.min(100, xacSuat));
  if (luongMua >= 1) return Math.round(p);
  if (luongMua >= 0.4) return Math.round(p * 0.8);
  if (luongMua >= 0.1) return Math.round(p * 0.55);
  return Math.round(p * 0.3);
}

/**
 * CHẤM MÀU MỘT GIỜ.
 *
 * Thứ tự xét quan trọng: xét ĐỎ trước rồi mới tới vàng, và mỗi lý do đều ghi
 * lại. Một giờ có thể đỏ vì nhiều thứ cùng lúc (gió mạnh + mưa) — hiện đủ thì
 * người đọc biết trời hôm đó hỏng vì cái gì, chứ không chỉ thấy một ô đỏ.
 */
export function chamGio(
  g: GioThoiTiet,
  nguong: NguongBay,
  huongThuan?: [number, number],
  luat?: LuatHuong,
): ChamGio {
  const lyDo: string[] = [];
  let muc: MucDo = "xanh";
  const len = (m: MucDo) => {
    if (m === "do" || (m === "vang" && muc === "xanh")) muc = m;
  };

  /**
   * THUẬN SƯỜN THÌ NỚI NGƯỠNG GIÓ ĐẸP.
   *
   * Cùng 5 m/s: thổi ngược sườn là hỏng, còn thổi thẳng vào sườn ở Khau Phạ
   * thì đó lại là ngày đẹp nhất — gió dựng lên mặt núi, thermal lên đều, dù
   * lên cao mà không xóc. Nên khi hướng nằm trong cung tốt, mức "hơi mạnh"
   * (tới 6 m/s) vẫn tính là gió đẹp; qua đó mới cân nhắc.
   *
   * Ngưỡng CẤM thì không nới: thuận sườn hay không, quá mức ấy là gấp dù.
   */
  const huongTot = Boolean(luat?.tot && trongCung(g.huong, luat.tot));
  const nguongDep = huongTot ? Math.max(nguong.gioXanh, 6) : nguong.gioXanh;
  if (g.gio10m > nguong.gioDo) {
    lyDo.push(`gió ${g.gio10m.toFixed(1)} m/s vượt ngưỡng ${nguong.gioDo}`);
    len("do");
  } else if (g.gio10m > nguongDep) {
    lyDo.push(`gió ${g.gio10m.toFixed(1)} m/s — cân nhắc`);
    len("vang");
  }

  /**
   * GIẬT KHÔNG QUYẾT ĐỊNH BAY HAY NGHỈ, trừ khi quá mạnh (luật chủ 10/09).
   *
   * Dưới 14 m/s thì im lặng: mô hình ở đèo gần như luôn báo giật gấp mấy lần
   * gió trung bình, nói ra mỗi giờ là thành tiếng ồn. 14–18 mới cảnh báo nhiễu,
   * trên 18 mới là không khuyến cáo bay.
   */
  const gGiat = sucGiat(g.giat);
  if (g.giat > nguong.giatDo) {
    lyDo.push(`giật ${g.giat.toFixed(1)} m/s — quá mạnh, không khuyến cáo bay`);
    len("do");
  } else if (gGiat === "manh") {
    lyDo.push(`giật ${g.giat.toFixed(1)} m/s — mạnh, gió nhiễu`);
    len("vang");
  }

  /**
   * KHÔNG CÒN LUẬT "GIÓ RỐI" theo chênh giật (luật chủ 10/09).
   *
   * Trước đây chênh giữa giật và gió trung bình bị coi là dấu hiệu trời rối và
   * hạ màu xuống. Nhưng ở đèo, mô hình luôn báo giật gấp mấy lần gió nền, nên
   * chênh 8–10 m/s là chuyện của mọi giờ trong mọi ngày — luật ấy chỉ sinh ra
   * cảnh báo mà không ai dùng. Nay giật đã có thang riêng (im dưới 14, cảnh báo
   * 14–18, cấm trên 18) và thang đó nói đủ.
   */

  if (g.mua > nguong.muaDo) {
    lyDo.push(`mưa ${g.mua.toFixed(1)} mm`);
    len("do");
  } else if (g.mua > 0.1) {
    /**
     * MƯA LÁC ĐÁC CHỈ LÀ GHI CHÚ, không hạ màu (luật chủ 10/09).
     *
     * Ở Tây Bắc mùa mưa, 0,1–0,5 mm mỗi giờ là mưa phùn rải rác — bay vẫn bay,
     * mà nó chiếm tới hai phần ba số ô cảnh báo. Cảnh báo nào cũng bật thì
     * người trực thôi đọc, rồi bỏ qua luôn cái cảnh báo thật.
     */
    lyDo.push("mưa lác đác");
  }

  /**
   * MÙ VÀ MÂY THẤP — thứ chặn bay nhiều thứ hai sau gió, và mô hình KHÔNG có
   * sẵn một ô "hôm nay có mù không" để đọc, phải tự suy.
   *
   * Hai dấu hiệu, xét cùng lúc và phải cùng xuất hiện mới kết luận:
   *  - TRẦN MÂY thấp hơn ngưỡng của điểm: mây nằm ngay trên hoặc dưới bãi.
   *  - MÂY THẤP nhiều: có mây thật ở tầng đó, chứ không phải trời khô mà chênh
   *    nhiệt độ nhỏ.
   * Chỉ một trong hai thì chưa đủ: sáng sớm ở núi chênh nhiệt độ luôn nhỏ, bắt
   * mình nó là ngày nào cũng đỏ; còn mây thấp 100% mà trần mây 1.500m là mây
   * lửng trên đầu, vẫn bay tốt.
   */
  const mayThap = g.mayThap ?? 0;
  const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
  /** Phải mây thấp DÀY (≥70%) mới gọi là trùm bãi — 50% là mây rải, vẫn thấy lối. */
  if (cm !== null && mayThap >= 70) {
    if (cm < nguong.tranMayDo) {
      lyDo.push(`mù: mây trùm bãi (trần mây ~${cm}m, mây thấp ${Math.round(mayThap)}%)`);
      len("do");
    } else if (cm < nguong.tranMayDo * 2) {
      lyDo.push(`mây thấp ~${cm}m — tầm nhìn hạn chế`);
      len("vang");
    }
  }
  /**
   * Sương mù thật sự: không khí bão hoà. Đây là trường hợp mù dày đặc dưới đất
   * mà mây thấp có khi vẫn báo ít, nên xét riêng.
   */
  if ((g.am ?? 0) >= 98 && (g.mayThap ?? 0) >= 70 && cm !== null && cm < 150) {
    lyDo.push(`sương mù (ẩm ${Math.round(g.am ?? 0)}%)`);
    len("do");
  }

  /**
   * DÔNG — thứ duy nhất trong bảng này có thể giết người, nên chặn sớm và chặn
   * chắc: 40% đã đủ để không cất cánh. Dông không chỉ là mưa: trước khi mây
   * dông tới, luồng gió đổ xuống (gust front) quét qua bãi làm gió đảo chiều
   * và mạnh gấp mấy lần trong vài phút.
   */
  const cs = chiSoBay(g);
  if (cs.xacSuatDong >= 40) {
    lyDo.push(`nguy cơ dông ${cs.xacSuatDong}%`);
    len("do");
  } else if (cs.xacSuatDong >= 20) {
    lyDo.push(`có thể có dông (${cs.xacSuatDong}%)`);
    len("vang");
  }

  /**
   * THERMAL GẮT: bay được nhưng xóc. Chỉ hạ xuống vàng, không cấm — đây là
   * chuyện thoải mái của khách và tay nghề phi công, không phải chuyện an toàn
   * tuyệt đối như dông hay gió mạnh.
   */
  if (cs.thermal === "gat") {
    lyDo.push(`thermal gắt${cs.tran ? ` (trần ~${cs.tran}m)` : ""} — dù xóc, khách dễ say`);
    len("vang");
  }

  /** Khả năng mưa ĐÃ HIỆU CHỈNH theo lượng (xem xacSuatMuaThat) — thô thì lúc nào cũng 100%. */
  const pMua = xacSuatMuaThat(g.xacSuatMua, g.mua);
  if (pMua >= 75 && g.mua <= nguong.muaDo) {
    lyDo.push(`khả năng mưa ${pMua}%`);
    len("vang");
  }

  /**
   * HƯỚNG GIÓ — ở núi thì hướng quan trọng ngang tốc độ.
   *
   * Ba luật, xét theo thứ tự nặng dần:
   *  1. GIÓ XẤU (ngược sườn): không bay, bất kể gió nhẹ tới đâu — dù đổ về
   *     phía sau sườn, cất cánh là bị hút xuống.
   *  2. GIÓ XIẾT: đúng hướng luồn khe VÀ đang mạnh. Nguy hiểm riêng của địa
   *     hình đèo: ngoài bãi đo được gió vừa phải, nhưng ngay mép cất cánh thì
   *     luồng bị bóp lại và vọt lên gấp rưỡi.
   *  3. GIÓ TỐT: đúng sườn thì nói rõ ra, kèm mức gió — để người trực biết
   *     hôm nay là ngày đẹp chứ không chỉ "không có gì sai".
   */
  const suc = sucGio(g.gio10m);
  const manh = suc === "manh" || suc === "ratManh";
  if (luat?.xau && trongCung(g.huong, luat.xau)) {
    lyDo.push(`gió ${huongChu(g.huong)} — ngược sườn cất cánh, không bay`);
    len("do");
  } else if (luat?.xiet?.length && manh && luat.xiet.some((h) => Math.abs(lechGoc(g.huong, h)) <= 22.5)) {
    lyDo.push(`⚠ GIÓ XIẾT: hướng ${huongChu(g.huong)} ${NHAN_SUC_GIO[suc]} — luồn khe, tăng tốc ở mép bãi`);
    len("do");
  } else if (huongTot) {
    lyDo.push(`gió ${huongChu(g.huong)} ${NHAN_SUC_GIO[suc]} — thuận sườn`);
  } else if (!huongThuanLoi(g.huong, huongThuan)) {
    lyDo.push(`gió hướng ${huongChu(g.huong)} — ngược sườn cất cánh`);
    len("do");
  }

  if (!lyDo.length) lyDo.push(`gió ${g.gio10m.toFixed(1)} m/s ${huongChu(g.huong)} — đẹp`);
  return { muc, lyDo };
}

/* ================================================================== */
/* Tổng hợp một ngày                                                   */
/* ================================================================== */

/** Khung giờ THẬT SỰ bay: ngoài khoảng này trời thế nào cũng không dùng tới. */
export const GIO_BAY_TU = 7;
export const GIO_BAY_DEN = 17;

export type NgayThoiTiet = {
  /** "YYYY-MM-DD". */
  ngay: string;
  muc: MucDo;
  /** Số giờ bay được (xanh) trong khung giờ bay. */
  gioXanh: number;
  gioVang: number;
  gioDo: number;
  /** Khoảng giờ đẹp nhất trong ngày, ví dụ "08:00–11:00". */
  khungDep: string | null;
  gioMax: number;
  giatMax: number;
  muaTong: number;
  nhietMin: number;
  nhietMax: number;
  /** Xác suất mưa cao nhất trong khung giờ bay (%), -1 khi mô hình không cấp. */
  xacSuatMuaMax: number;
  /** Xác suất dông cao nhất trong khung giờ bay (%). */
  xacSuatDongMax: number;
  /** Trần thermal cao nhất (m) — thermal của ngày. */
  tranMax: number | null;
  gio: Array<GioThoiTiet & ChamGio>;
  /**
   * Bộ nhận định ngày bay — gắn ở service sau khi gộp xong cả dãy (cần ngày
   * trước để xem xu hướng áp suất). Để `unknown` ở đây tránh vòng import với
   * `nhan-dinh.ts`; nơi dùng ép về `NhanDinhNgay`.
   */
  nhanDinh?: unknown;
  /** Điểm điều kiện bay 0–100 của chuyên gia (lib/baobay/chuyen-gia.ts) — gắn ở service. */
  chuyenGia?: unknown;
};

/**
 * GỘP CÁC GIỜ THÀNH MỘT NGÀY.
 *
 * Màu của ngày lấy theo CHỖ TỐT NHẤT chứ không theo trung bình: sáng đẹp chiều
 * gió thì vẫn là ngày bay được, chỉ bay buổi sáng. Lấy trung bình thì ngày ấy
 * ra vàng, người đọc tưởng cả ngày dở và huỷ khách oan.
 */
export function gopNgay(ngay: string, gio: Array<GioThoiTiet & ChamGio>): NgayThoiTiet {
  const trongKhung = gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= GIO_BAY_TU && h <= GIO_BAY_DEN;
  });
  const dem = (m: MucDo) => trongKhung.filter((g) => g.muc === m).length;

  /** Dải giờ xanh DÀI NHẤT — một giờ đẹp lẻ loi giữa ngày gió thì không đáng gọi khách. */
  let dai = { tu: -1, den: -1, len: 0 };
  let dau = -1;
  trongKhung.forEach((g, i) => {
    if (g.muc === "xanh") {
      if (dau < 0) dau = i;
      const len = i - dau + 1;
      if (len > dai.len) dai = { tu: dau, den: i, len };
    } else dau = -1;
  });

  const so = (f: (g: GioThoiTiet) => number, gop: (a: number[]) => number, mac = 0) =>
    trongKhung.length ? gop(trongKhung.map(f)) : mac;

  return {
    ngay,
    muc: dem("xanh") > 0 ? "xanh" : dem("vang") > 0 ? "vang" : "do",
    gioXanh: dem("xanh"),
    gioVang: dem("vang"),
    gioDo: dem("do"),
    khungDep:
      dai.len > 1
        ? `${trongKhung[dai.tu].gio.slice(11, 16)}–${trongKhung[dai.den].gio.slice(11, 16)}`
        : dai.len === 1
          ? trongKhung[dai.tu].gio.slice(11, 16)
          : null,
    gioMax: so((g) => g.gio10m, (a) => Math.max(...a)),
    giatMax: so((g) => g.giat, (a) => Math.max(...a)),
    muaTong: so((g) => g.mua, (a) => a.reduce((t, x) => t + x, 0)),
    nhietMin: so((g) => g.nhietDo, (a) => Math.min(...a)),
    nhietMax: so((g) => g.nhietDo, (a) => Math.max(...a)),
    xacSuatMuaMax: trongKhung.length
      ? Math.max(-1, ...trongKhung.map((g) => xacSuatMuaThat(g.xacSuatMua, g.mua)))
      : -1,
    xacSuatDongMax: trongKhung.length ? Math.max(0, ...trongKhung.map((g) => chiSoBay(g).xacSuatDong)) : 0,
    tranMax: (() => {
      const t = trongKhung.map((g) => chiSoBay(g).tran).filter((x): x is number => x !== null);
      return t.length ? Math.max(...t) : null;
    })(),
    gio,
  };
}

/* ================================================================== */
/* Học ngưỡng từ kinh nghiệm chủ điểm bay                              */
/* ================================================================== */

/** Một ngày đã chấm: trời thế nào (số của mô hình) và người quyết ra sao. */
export type LanCham = {
  ngay: string;
  /** Chủ chấm: bay tốt · bay hạn chế · nghỉ. */
  ket: "tot" | "han-che" | "nghi";
  /** Số của ngày hôm đó, đo trong khung giờ bay. */
  gioMax: number;
  giatMax: number;
  muaTong: number;
  /** Chủ dự báo TRƯỚC ngày đó thế nào (nếu có ghi). */
  duBaoChu?: "tot" | "han-che" | "nghi";
  /** Máy chấm ngày đó ra màu gì. */
  mayCham?: MucDo;
  /** Ghi chú của chủ — hiện lại khi gặp ngày có thời tiết tương tự. */
  ghiChu?: string;
};

export type NguongHoc = {
  /** Đủ dữ liệu để nói gì chưa. */
  du: boolean;
  soLan: number;
  goiY: Partial<NguongBay>;
  /** Câu giải thích cho người đọc, kiểu "12 ngày nghỉ đều có gió trên 21 km/h". */
  giaiThich: string[];
};

/**
 * DÒ NGƯỠNG KHỚP NHẤT VỚI CÁCH CHỦ QUYẾT ĐỊNH.
 *
 * Cách làm cố ý ĐƠN GIẢN và giải thích được, không dùng mô hình hộp đen: quét
 * mọi ngưỡng khả dĩ (1 km/h một bước), với mỗi ngưỡng đếm xem chia đúng được
 * bao nhiêu ngày đã chấm, rồi lấy ngưỡng đúng nhiều nhất. Người dùng nhìn vào
 * là biết vì sao máy đề nghị con số ấy, và bác được nếu thấy vô lý.
 *
 * Cân bằng hai phía chứ không đếm tổng: nếu 30 ngày bay và 3 ngày nghỉ thì
 * ngưỡng "không bao giờ nghỉ" đã đúng 30/33 — đúng cao mà vô dụng. Tính tỉ lệ
 * đúng của mỗi phía rồi lấy trung bình thì phía ít ngày vẫn có tiếng nói.
 *
 * KHÔNG tự áp: chỉ đề nghị. Đổi ngưỡng an toàn phải do người bấm.
 */
/* ------------------------------------------------------------------ */
/* Đối chiếu: máy đoán đúng bao nhiêu, chủ đoán đúng bao nhiêu           */
/* ------------------------------------------------------------------ */

export type DoChinhXac = {
  /** Số ngày có đủ cặp để so. */
  soNgay: number;
  /** Phần trăm ngày máy chấm trùng thực tế. */
  mayDung: number;
  /** Phần trăm ngày chủ dự báo trùng thực tế (chỉ tính ngày chủ có dự báo trước). */
  chuDung: number;
  soNgayChuDuBao: number;
  /**
   * Máy lệch VỀ PHÍA NÀO: dương = máy khắt khe hơn chủ (máy cấm những ngày chủ
   * vẫn bay), âm = máy dễ dãi hơn. Con số này quan trọng hơn tỉ lệ đúng: biết
   * lệch phía nào thì biết nên nới hay siết ngưỡng.
   */
  mayKhatKheHon: number;
  cau: string[];
};

/** Quy màu của máy về cùng thang ba mức với chủ, để so được với nhau. */
function mucSangKet(m: MucDo): "tot" | "han-che" | "nghi" {
  return m === "xanh" ? "tot" : m === "vang" ? "han-che" : "nghi";
}

const THU_TU: Record<"tot" | "han-che" | "nghi", number> = { tot: 0, "han-che": 1, nghi: 2 };

/**
 * MÁY ĐANG ĐỌC TRỜI GIỐNG CHỦ ĐẾN ĐÂU.
 *
 * Không chỉ đếm đúng/sai mà đo cả CHIỀU LỆCH. Một hệ cảnh báo lúc nào cũng
 * khắt khe hơn người thật thì rồi sẽ bị bỏ qua hết, còn hệ dễ dãi hơn thì nguy
 * hiểm — hai kiểu sai này phải chữa ngược nhau, nên phải phân biệt được.
 */
export function doChinhXac(cac: LanCham[]): DoChinhXac {
  const coMay = cac.filter((c) => c.mayCham);
  const coChu = cac.filter((c) => c.duBaoChu);
  const cau: string[] = [];

  const mayDung = coMay.length
    ? Math.round((coMay.filter((c) => mucSangKet(c.mayCham!) === c.ket).length / coMay.length) * 100)
    : 0;
  const chuDung = coChu.length
    ? Math.round((coChu.filter((c) => c.duBaoChu === c.ket).length / coChu.length) * 100)
    : 0;

  let lech = 0;
  for (const c of coMay) lech += THU_TU[mucSangKet(c.mayCham!)] - THU_TU[c.ket];
  const mayKhatKheHon = coMay.length ? Math.round((lech / coMay.length) * 100) / 100 : 0;

  if (coMay.length) {
    cau.push(`Máy chấm trùng thực tế ${mayDung}% trên ${coMay.length} ngày.`);
    if (mayKhatKheHon > 0.25) cau.push("Máy đang KHẮT KHE hơn thực tế — cân nhắc nới ngưỡng gió lên.");
    else if (mayKhatKheHon < -0.25) cau.push("Máy đang DỄ DÃI hơn thực tế — nên siết ngưỡng lại.");
    else cau.push("Máy không thiên về bên nào — độ khắt khe đang vừa.");
  }
  if (coChu.length) {
    cau.push(`Anh dự báo trước đúng ${chuDung}% trên ${coChu.length} ngày.`);
  }

  return { soNgay: coMay.length, mayDung, chuDung, soNgayChuDuBao: coChu.length, mayKhatKheHon, cau };
}

/* ------------------------------------------------------------------ */
/* Tìm ngày cũ giống hệt ngày sắp tới                                   */
/* ------------------------------------------------------------------ */

export type NgayGiong = {
  ngay: string;
  ket: "tot" | "han-che" | "nghi";
  ghiChu?: string;
  gioMax: number;
  giatMax: number;
  muaTong: number;
  /** Khác nhau bao nhiêu — càng nhỏ càng giống. */
  khoangCach: number;
};

/**
 * NHỮNG NGÀY CŨ CÓ SỐ GIỐNG NGÀY ĐANG XEM.
 *
 * Đây là cách học hợp với dữ liệu ÍT — vài chục ngày là dùng được, trong khi
 * mọi mô hình huấn luyện tử tế đều cần hàng nghìn. Và nó GIẢI THÍCH ĐƯỢC: thay
 * vì "máy nghĩ 73%", nó nói "ba ngày giống thế này thì hai ngày bay tốt, một
 * ngày nghỉ — hôm ấy anh ghi: gió xuôi sườn từ trưa". Người đọc tự quyết được,
 * và tự thấy máy dựa vào đâu.
 *
 * Khoảng cách chuẩn hoá theo thang thực tế của từng đại lượng: gió lệch 1 m/s
 * đáng kể ngang mưa lệch 3mm, nên chia mỗi thứ cho biên độ riêng trước khi cộng.
 */
export function ngayGiongNhau(
  ngay: { gioMax: number; giatMax: number; muaTong: number },
  kho: LanCham[],
  soLuong = 3,
): NgayGiong[] {
  return kho
    .map((c) => ({
      ngay: c.ngay,
      ket: c.ket,
      ghiChu: c.ghiChu,
      gioMax: c.gioMax,
      giatMax: c.giatMax,
      muaTong: c.muaTong,
      khoangCach:
        Math.abs(c.gioMax - ngay.gioMax) / 3 +
        Math.abs(c.giatMax - ngay.giatMax) / 5 +
        Math.abs(c.muaTong - ngay.muaTong) / 10,
    }))
    .sort((a, b) => a.khoangCach - b.khoangCach)
    .slice(0, soLuong);
}

export function hocNguong(cac: LanCham[], toiThieu = 8): NguongHoc {
  const sach = cac.filter((c) => Number.isFinite(c.gioMax) && Number.isFinite(c.giatMax));
  if (sach.length < toiThieu) {
    return {
      du: false,
      soLan: sach.length,
      goiY: {},
      giaiThich: [`Mới có ${sach.length} ngày được chấm — cần ít nhất ${toiThieu} ngày mới dám đề nghị ngưỡng.`],
    };
  }

  const bay = sach.filter((c) => c.ket !== "nghi");
  const nghi = sach.filter((c) => c.ket === "nghi");
  const giaiThich: string[] = [];
  const goiY: Partial<NguongBay> = {};

  /** Ngưỡng CẤM: dưới ngưỡng thì bay, trên thì nghỉ — dò chỗ chia gọn nhất. */
  const doNguongCam = (lay: (c: LanCham) => number, ten: string): number | null => {
    if (!bay.length || !nghi.length) return null;
    let tot = { nguong: 0, diem: -1 };
    /**
     * Quét từ 1 đến 20 m/s, bước NỬA m/s.
     *
     * Bước phải nhỏ vì cả dải bay đôi chỉ nằm trong khoảng 3–8 m/s: bước 1 m/s
     * là cả thang chỉ còn năm nấc, không đủ để phân biệt "chủ dừng ở 5,5" với
     * "chủ dừng ở 6". Trên 20 m/s thì không cần xét — chẳng ai bay đôi ở đó.
     */
    for (let n = 1; n <= 20; n += 0.5) {
      const dungBay = bay.filter((c) => lay(c) <= n).length / bay.length;
      const dungNghi = nghi.filter((c) => lay(c) > n).length / nghi.length;
      const diem = (dungBay + dungNghi) / 2;
      if (diem > tot.diem) tot = { nguong: n, diem };
    }
    /** Dưới 65% thì con số ấy không thật sự chia được gì — im còn hơn nói bừa. */
    if (tot.diem < 0.65) {
      giaiThich.push(`Chưa thấy mốc ${ten} nào chia rõ ngày bay và ngày nghỉ.`);
      return null;
    }
    giaiThich.push(
      `${ten}: mốc ${tot.nguong} m/s khớp ${Math.round(tot.diem * 100)}% số ngày đã chấm ` +
        `(${bay.length} ngày bay · ${nghi.length} ngày nghỉ).`,
    );
    return tot.nguong;
  };

  const gioDo = doNguongCam((c) => c.gioMax, "Gió trung bình");
  if (gioDo) goiY.gioDo = gioDo;
  const giatDo = doNguongCam((c) => c.giatMax, "Gió giật");
  if (giatDo) goiY.giatDo = giatDo;

  /**
   * Ngưỡng XANH lấy từ chính những ngày chủ chấm "bay tốt": mức gió mà 80% số
   * ngày đẹp nằm dưới. Không dò như ngưỡng cấm vì "tốt" và "hạn chế" là hai
   * mức của cùng một chuyện bay được, ranh giới vốn mờ.
   */
  const tot = bay.filter((c) => c.ket === "tot").map((c) => c.gioMax).sort((a, b) => a - b);
  if (tot.length >= 4) {
    /** Làm tròn nửa m/s cho khớp bước quét ở trên. */
    const v = Math.round(tot[Math.floor(tot.length * 0.8)] * 2) / 2;
    if (v > 0 && (!goiY.gioDo || v < goiY.gioDo)) {
      goiY.gioXanh = v;
      giaiThich.push(`Ngày được chấm "bay tốt": 80% có gió dưới ${v} m/s.`);
    }
  }

  return { du: Object.keys(goiY).length > 0, soLan: sach.length, goiY, giaiThich };
}
