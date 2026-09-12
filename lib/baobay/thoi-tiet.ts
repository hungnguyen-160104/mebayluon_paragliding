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
  /**
   * TRẦN TỐC ĐỘ THEO HƯỚNG (luật chủ 11/09) — "hướng này chỉ bay được tới
   * ngần này m/s". Khác `xau` (cấm mọi tốc độ) và khác ngưỡng gió chung: ở
   * Khau Phạ gió ĐÔNG là hướng đẹp nhưng quá 6 m/s là gấp dù, trong khi cùng
   * 6 m/s hướng khác vẫn bay. Mỗi mục ghi TÂM hướng (máy nhận lệch ±22,5°)
   * và mức trần; vượt trần là đỏ.
   */
  capToc?: Array<{ tam: number[]; max: number; ten: string }>;
};

export type ToaDoDiemBay = {
  lat: number;
  lon: number;
  /** Độ cao chỗ cất cánh (m) — để đối chiếu với độ cao mô hình khí tượng. */
  alt?: number;
  /**
   * Độ cao BÃI HẠ (m). Chênh giữa cất và hạ chính là "độ cao thả" — thứ quyết
   * định chuyến bay dài bao lâu khi không có nâng, và là mốc phải nhìn trên
   * giản đồ thám không: mây hay nghịch nhiệt nằm dưới mức này thì cả đường
   * bay nằm trong mù.
   */
  altHa?: number;
  /**
   * Bãi cất THỨ HAI (m) — điểm có hai chỗ cất ở hai độ cao; Viên Nam có bãi
   * 650m và bãi 850m (chủ 11/09). Chỉ để ghi chú và vẽ thêm một vạch trên
   * giản đồ; mọi phép chấm vẫn lấy `alt` (bãi chính).
   */
  altCat2?: number;
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
  /**
   * KHUNG GIỜ BAY của điểm, [từ, đến] theo giờ trong ngày. Mọi phép tính theo
   * ngày (khung đẹp, số tiếng mưa, nhận định, điểm chuyên gia) chỉ nhìn trong
   * khung này. Chưa khai thì dùng 7–17. Khau Phạ bay 9–16: sáng sớm đèo còn
   * mù và chưa có nắng đốt sườn, 7h đẹp trên giấy nhưng chẳng ai lên bãi.
   */
  gioBay?: [number, number];
  /**
   * NGƯỠNG KHỞI ĐIỂM RIÊNG của điểm (đè lên NGUONG_MAC_DINH; chủ sửa ở ⚙ thì
   * số đã lưu vẫn thắng). Chỉ khai phần khác, phần còn lại dùng chung.
   */
  nguong?: Partial<NguongBay>;
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
    /** 1.268 m — số chủ đo tại bãi cất cánh (10/09), không phải 1.200 làm tròn. */
    alt: 1268,
    ten: "Đèo Khau Phạ (Mù Cang Chải)",
    /** Bãi hạ ở Tú Lệ — thả 568m (số chủ 11/09). */
    altHa: 700,
    /**
     * TRẦN TỐC ĐỘ THEO HƯỚNG (chủ 11/09): "Khau Phạ cấm gió hướng Tây mạnh
     * hơn 5 m/s, gió Nam hoặc Đông mạnh hơn 6 m/s."
     *
     * Tây (270°) và Nam (180°) đã nằm trong cung NGƯỢC SƯỜN [113–292] nên
     * đang bị cấm ở MỌI tốc độ — khai thêm trần ở đây là để đúng chữ của chủ
     * và để nếu sau này mở cung ngược sườn ra thì trần vẫn còn nguyên. Vế
     * thật sự mới là gió ĐÔNG: đông là hướng ĐẸP nhất của bãi, nhưng quá 6
     * m/s thì luồng bị đèo bóp lại, không bay.
     */
    luatHuong: {
      tot: [23, 112],
      xau: [113, 292],
      xiet: [0, 90, 270],
      capToc: [
        { tam: [270], max: 5, ten: "Tây" },
        { tam: [180], max: 6, ten: "Nam" },
        { tam: [90], max: 6, ten: "Đông" },
      ],
    },
    gioBay: [9, 16],
  },
  /**
   * SA PA — chưa có cung thuận/ngược (chủ chưa chốt), nhưng đã có hai trần
   * tốc độ theo hướng (chủ 11/09): "cấm gió Bắc mạnh hơn 6 m/s và gió Tây
   * mạnh hơn 6 m/s".
   */
  sapa: {
    lat: 22.3364,
    lon: 103.8438,
    alt: 1500,
    altHa: 1000,
    ten: "Sa Pa (Lào Cai)",
    luatHuong: {
      capToc: [
        { tam: [0], max: 6, ten: "Bắc" },
        { tam: [270], max: 6, ten: "Tây" },
      ],
    },
  },
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
    /**
     * ĐỒI BÙ: bãi CẤT 650m, bãi HẠ 50m (số chủ chốt 11/09 — chủ nói lại, trước
     * ghi 833m là độ cao ĐỈNH đồi chứ không phải chỗ cất cánh).
     */
    alt: 650,
    altHa: 50,
    ten: "Đồi Bù (Chương Mỹ)",
    luatHuong: { tot: [247, 112], xau: [157, 246] },
    /**
     * Thang gió của chủ cho Hà Nội (10/09): dưới 4 bình thường (tốt) · 4–6 hơi
     * mạnh · 6–8 mạnh · trên 8 rất mạnh. "Rất mạnh" mới là mức không bay, nên
     * ngưỡng cấm đặt ở 8 chứ không phải 7 như mặc định chung.
     */
    nguong: { gioDo: 8 },
  },
};

export function toaDoDiemBay(spot: string, luu?: Partial<ToaDoDiemBay> | null): ToaDoDiemBay {
  const goc = TOA_DO_MAC_DINH[normalizeSpot(spot)];
  if (!luu) return goc;
  return {
    lat: Number.isFinite(luu.lat) ? Number(luu.lat) : goc.lat,
    lon: Number.isFinite(luu.lon) ? Number(luu.lon) : goc.lon,
    alt: Number.isFinite(luu.alt as number) ? Number(luu.alt) : goc.alt,
    altHa: Number.isFinite(luu.altHa as number) ? Number(luu.altHa) : goc.altHa,
    altCat2: goc.altCat2,
    ten: luu.ten?.trim() || goc.ten,
    huongThuan: luu.huongThuan ?? goc.huongThuan,
    luatHuong: luu.luatHuong ?? goc.luatHuong,
    gioBay: luu.gioBay ?? goc.gioBay,
    nguong: goc.nguong,
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
   * KHÔNG quyết định bay hay nghỉ (luật chủ 10/09: gió 4 m/s giật 12 là chuyện
   * thường); trên 16 chỉ là cảnh báo "gust mạnh" ở mấy khung giờ đó.
   */
  giatDo: number;
  /**
   * Mưa trong giờ (mm) TỪ mức này là mưa thật — cấm. Dưới đó tới `MUA_BAY` là
   * "mưa bay" (ghi chú, không hạ màu); dưới `MUA_BAY` coi như không mưa.
   */
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
export const NGUONG_MAC_DINH: NguongBay = { gioXanh: 4, gioDo: 7, giatDo: 18, muaDo: 0.8, tranMayDo: 150 };

/**
 * @param luu    số chủ đã lưu ở ⚙ (thắng tất cả)
 * @param rieng  ngưỡng khởi điểm riêng của điểm (`ToaDoDiemBay.nguong`), đè lên mặc định chung
 */
export function nguongCuaDiem(luu?: Partial<NguongBay> | null, rieng?: Partial<NguongBay> | null): NguongBay {
  const n = { ...NGUONG_MAC_DINH };
  for (const k of ["gioXanh", "gioDo", "giatDo", "muaDo", "tranMayDo"] as const) {
    const v = Number(rieng?.[k]);
    if (Number.isFinite(v) && v > 0) n[k] = v;
  }
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
  /**
   * Phần mưa RÀO / GIÔNG trong tổng lượng mưa (mm) — mô hình tách riêng
   * (`showers`, mưa đối lưu). Mưa dầm 1mm và mưa giông 5mm rơi rất khác nhau:
   * mưa dầm thì chờ ngớt là bay, còn ổ giông kéo theo gió đổ xuống đảo chiều
   * ngay trước khi mưa tới. Vẽ thành hai màu chồng nhau trên cùng một cột.
   */
  muaRao?: number;
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
  huong925?: number;
  huong700?: number;
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

/**
 * MẶT CƯỜI / MẶT BUỒN cho ba mức (luật chủ 10/09): người trực và khách nhìn
 * mặt là hiểu, không phải nhớ ✔ ⚠ ✕ nghĩa là gì.
 */
export const BIEU_TUONG_MUC: Record<MucDo, string> = { xanh: "😊", vang: "😐", do: "😞" };

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
/**
 * THANG GIẬT (luật chủ 10/09): giật KHÔNG quyết định bay hay nghỉ — gió 4 m/s
 * mà giật 12, thậm chí hơn, là chuyện thường; gió to thì giật to theo. Chỉ
 * TRÊN 16 mới phải cảnh báo "gust mạnh" ở mấy khung giờ đó; trên 18 là quá
 * mạnh (ngưỡng `giatDo`).
 */
export const GIAT_CANH_BAO = 16;

export function sucGiat(v: number): SucGiat {
  if (v < 6) return "nhe";
  if (v <= GIAT_CANH_BAO) return "vua";
  if (v <= 18) return "manh";
  return "ratManh";
}

export const NHAN_SUC_GIAT: Record<SucGiat, string> = {
  nhe: "nhẹ",
  vua: "vừa",
  manh: "gust mạnh — cảnh báo",
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
  if (mua >= MUA_DANG_KE) return "🌧";
  if (mua >= MUA_BAY) return "🌦";
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
 * hướng mà mình không biết có phải gió chính bãi hay không.
 */
export function huongTheNao(huong: number, gio: number, luat?: LuatHuong): HuongTheNao {
  if (!luat) return "thuong";
  if (luat.xau && trongCung(huong, luat.xau)) return "xau";
  if (vuotCapToc(huong, gio, luat)) return "xau";
  const manh = gio > 6;
  if (manh && luat.xiet?.some((h) => Math.abs(lechGoc(huong, h)) <= 22.5)) return "xau";
  if (luat.tot && trongCung(huong, luat.tot)) return "tot";
  return "thuong";
}

/**
 * Gió có VƯỢT TRẦN TỐC ĐỘ của hướng ấy không — trả về mục đã vượt, hoặc null.
 *
 * Tách riêng để `chamGio` vừa biết "có vượt không" vừa lấy được tên hướng mà
 * viết ra lý do cho người đọc ("gió Tây 5,4 m/s — bãi cấm gió Tây trên 5").
 */
export function capTocBiVuot(huong: number, gio: number, luat?: LuatHuong) {
  if (!luat?.capToc?.length || !Number.isFinite(huong)) return null;
  for (const c of luat.capToc) {
    if (gio > c.max && c.tam.some((h) => Math.abs(lechGoc(huong, h)) <= 22.5)) return c;
  }
  return null;
}

function vuotCapToc(huong: number, gio: number, luat?: LuatHuong): boolean {
  return capTocBiVuot(huong, gio, luat) !== null;
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

/**
 * NGÀY NÀY CÓ HOÀNG HÔN ĐẸP KHÔNG.
 *
 * Chuyến bay hoàng hôn là một món bán riêng, mà bán được hay không phụ thuộc
 * đúng BỐN MƯƠI PHÚT cuối trước khi mặt trời lặn: còn nắng, ít mây, không mưa
 * thì trời rực; mây dày hoặc mưa thì khách trả tiền để bay trong một màu xám
 * (chủ chốt 11/09).
 *
 * Xét hai giờ cuối trước lúc lặn — giờ chứa mốc "lặn trừ 40 phút" và giờ kế
 * tiếp — vì mô hình chỉ cho số theo từng giờ tròn.
 */
export function hoangHonDep(ngay: NgayThoiTiet): boolean {
  const lan = ngay.matTroi?.lan;
  if (!lan || !/^\d{2}:\d{2}$/.test(lan)) return false;
  const gioLan = Number(lan.slice(0, 2)) + Number(lan.slice(3, 5)) / 60;
  const tu = Math.floor(gioLan - 40 / 60);
  const cuoi = ngay.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= tu && h <= Math.floor(gioLan);
  });
  if (!cuoi.length) return false;
  /** Mưa là hỏng hẳn; mây dày cũng vậy — 60% trở xuống thì mặt trời còn xuyên qua. */
  if (cuoi.some((g) => g.mua >= MUA_BAY)) return false;
  if (cuoi.some((g) => g.may > 60)) return false;
  /** Phải CÒN NẮNG ở khúc ấy: hết nắng thì trời chỉ xám dần, không có màu. */
  return cuoi.some((g) => (g.giayNang ?? 0) > 600 || (g.buXa ?? 0) > 30);
}

/**
 * GIÓ Ở MỘT ĐỘ CAO TÍNH TỪ BÃI (m), nội suy giữa các mực mô hình.
 *
 * Phi công không nghĩ bằng "850hPa", họ nghĩ bằng "lên 500m thì gió thế nào".
 * Lấy độ cao thật của từng mực (mô hình cấp), bỏ mực nào nằm DƯỚI bãi (ở
 * Khau Phạ mực 925 hPa ~750m nằm dưới bãi 1.268m — đó là gió thung lũng),
 * rồi nội suy tuyến tính. Đặt ở đây (không ở nhan-dinh) để `chamGio` dùng
 * được mà không tạo vòng import.
 */
export function gioTrenBai(g: GioThoiTiet, mTrenBai: number, alt: number): number | null {
  const co_ = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const moc: Array<{ h: number; v: number }> = [{ h: alt, v: g.gio10m }];
  if (co_(g.h925) && co_(g.gio925) && g.h925 > alt + 50) moc.push({ h: g.h925, v: g.gio925 });
  if (co_(g.h850) && co_(g.gio850) && g.h850 > alt + 50) moc.push({ h: g.h850, v: g.gio850 });
  /** 700 hPa không có độ cao riêng — ~3.000m là đủ đúng cho mục đích này. */
  if (co_(g.gio700)) moc.push({ h: 3000, v: g.gio700 });
  if (moc.length < 2) return null;
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

/** Ngưỡng gió trên bãi 500m (luật chủ 12/09): từ 8 m/s đã phải LẮP SPEEDBAR · trên 12 khuyến cáo không bay. */
export const GIO_TREN_CAO_SPEEDBAR = 8;
export const GIO_TREN_CAO_CAM = 12;

/**
 * HƯỚNG GIÓ TRỘI của một dãy giờ — trung bình VÉC-TƠ có trọng số theo tốc độ.
 *
 * Không lấy trung bình số độ: 350° và 10° cộng chia đôi ra 180°, tức là báo
 * gió nam trong khi thực tế là gió bắc. Giờ lặng (≤ 0,3 m/s) không nói lên
 * hướng nên bỏ. `khung` để chỉ lấy giờ ban ngày khi cần (thẻ khách lấy 6–18h).
 */
export function huongTroiNgay(gio: GioThoiTiet[], khung?: [number, number]): number | null {
  let x = 0;
  let y = 0;
  for (const g of gio) {
    if (!Number.isFinite(g.huong) || !(g.gio10m > 0.3)) continue;
    if (khung) {
      const h = Number(g.gio.slice(11, 13));
      if (h < khung[0] || h > khung[1]) continue;
    }
    const r = (g.huong * Math.PI) / 180;
    x += Math.sin(r) * g.gio10m;
    y += Math.cos(r) * g.gio10m;
  }
  if (x === 0 && y === 0) return null;
  const d = (Math.atan2(x, y) * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

/** Tên đầy đủ tám hướng, tiếng Việt — cho câu nói ở thẻ nội bộ ("gió BẮC 2,3 m/s"). */
const HUONG_DAY_DU_VI = ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"];
export function huongDayDuVi(do_: number): string {
  const h = ((do_ % 360) + 360) % 360;
  return HUONG_DAY_DU_VI[Math.round(h / 45) % 8];
}

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
  if (luongMua >= MUA_DANG_KE) return Math.round(p);
  /** Mưa bay: có hạt nhưng chưa phải cơn mưa — hạ bớt. */
  if (luongMua >= MUA_BAY) return Math.round(p * 0.7);
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
  /** Độ cao bãi cất (m) — có thì chấm thêm GIÓ TRÊN CAO; không có thì bỏ qua luật ấy. */
  altBai?: number,
): ChamGio {
  const lyDo: string[] = [];
  let muc: MucDo = "xanh";
  const len = (m: MucDo) => {
    if (m === "do" || (m === "vang" && muc === "xanh")) muc = m;
  };

  /**
   * ĐÚNG GIÓ CHÍNH BÃI THÌ NỚI NGƯỠNG GIÓ ĐẸP.
   *
   * Cùng 5 m/s: thổi ngược sườn là hỏng, còn thổi thẳng vào sườn ở Khau Phạ
   * thì đó lại là ngày đẹp nhất — gió dựng lên mặt núi, thermal lên đều, dù
   * lên cao mà không xóc. Nên khi hướng nằm trong cung tốt, mức "hơi mạnh"
   * (tới 6 m/s) vẫn tính là gió đẹp; qua đó mới cân nhắc.
   *
   * Ngưỡng CẤM thì không nới: đúng gió chính bãi hay không, quá mức ấy là gấp dù.
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
   * GIẬT KHÔNG QUYẾT ĐỊNH BAY HAY NGHỈ (luật chủ 10/09): gió 4 m/s giật 12
   * hoặc hơn là chuyện thường, gió to thì giật to theo. Tới 16 im lặng; TRÊN 16
   * cảnh báo "gust mạnh" (vàng — để người trực để mắt mấy giờ đó); trên 18 mới
   * là quá mạnh.
   */
  const gGiat = sucGiat(g.giat);
  if (g.giat > nguong.giatDo) {
    lyDo.push(`giật ${g.giat.toFixed(1)} m/s — quá mạnh, không khuyến cáo bay`);
    len("do");
  } else if (gGiat === "manh") {
    lyDo.push(`gust mạnh ${g.giat.toFixed(1)} m/s — cảnh báo`);
    len("vang");
  }

  /**
   * KHÔNG CÒN LUẬT "GIÓ RỐI" theo chênh giật (luật chủ 10/09).
   *
   * Trước đây chênh giữa giật và gió trung bình bị coi là dấu hiệu trời rối và
   * hạ màu xuống. Nhưng ở đèo, mô hình luôn báo giật gấp mấy lần gió nền, nên
   * chênh 8–10 m/s là chuyện của mọi giờ trong mọi ngày — luật ấy chỉ sinh ra
   * cảnh báo mà không ai dùng. Nay giật đã có thang riêng (im tới 16, cảnh báo
   * 16–18, cấm trên 18) và thang đó nói đủ.
   */

  if (g.mua >= nguong.muaDo) {
    lyDo.push(`mưa ${g.mua.toFixed(1)} mm`);
    len("do");
  } else if (g.mua >= MUA_BAY) {
    /**
     * MƯA BAY (0,4 – dưới 0,8 mm/giờ) CHỈ LÀ GHI CHÚ, không hạ màu (luật chủ
     * 10/09). Ở Tây Bắc mùa mưa đó là mưa phùn rải rác — bay vẫn bay, mà nó
     * từng chiếm hai phần ba số ô cảnh báo. Từ 0,3 trở xuống coi như không
     * mưa, không ghi gì cả.
     */
    lyDo.push(`mưa bay ${g.mua.toFixed(1)} mm`);
  }

  /**
   * GIÓ TRÊN CAO THEO TỪNG GIỜ (luật chủ 12/09). Bãi cất ở cao thì gió ở
   * +500m trên bãi mạnh nghĩa là gió NGAY TẠI BÃI CẤT đã mạnh hơn nhiều so
   * với dưới bãi hạ — cất cánh dễ bị thổi lùi. Trên 12 m/s: khuyến cáo không
   * bay (đỏ); 8–12: lắp speedbar (vàng) — chủ 12/09: "từ 8 m/s đã phải nhắc". Chấm TỪNG GIỜ chứ không cả ngày:
   * ngày gió Bắc ở Đồi Bù nó mạnh sáng tới trưa rồi dịu, chiều bay được — tô
   * cả ngày là mất buổi chiều đẹp.
   */
  if (altBai !== undefined && altBai > 0) {
    const v500 = gioTrenBai(g, 500, altBai);
    if (v500 !== null && v500 > GIO_TREN_CAO_CAM) {
      lyDo.push(`gió trên bãi 500m ${v500.toFixed(0)} m/s — dễ thổi lùi, khuyến cáo không bay`);
      len("do");
    } else if (v500 !== null && v500 >= GIO_TREN_CAO_SPEEDBAR) {
      lyDo.push(`gió trên bãi 500m ${v500.toFixed(0)} m/s — lắp speedbar, bám sườn thấp`);
      len("vang");
    }
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
   * DÔNG LÀ CẢNH BÁO, KHÔNG PHẢI LỆNH CẤM (luật chủ 11/09).
   *
   * Trước đây 40% là đỏ, tức là máy tự tuyên bố "không bay" cho cả ngày. Ở Tây
   * Bắc mùa hè thì con số ấy gặp suốt: chiều nào cũng có ổ dông lẻ đâu đó
   * trong ô lưới 9km, mà bãi vẫn bay cả buổi sáng. Tệ hơn, NGÀY CÓ DÔNG
   * thường là ngày THERMAL KHOẺ — chấm đỏ nó là bỏ mất đúng những ngày bay
   * đẹp nhất.
   *
   * Thứ thật sự chặn bay là MƯA (đã tính ở trên, theo lượng và số tiếng) và
   * gió. Dông thì báo để người trực canh trời: gust front quét qua bãi làm gió
   * đảo chiều và mạnh gấp mấy lần khoảng 10–20 phút TRƯỚC khi mưa tới, nên
   * thấy mây tích dựng cao, đáy tối là dừng — chứ không phải nghỉ cả ngày vì
   * một con số phần trăm.
   */
  const cs = chiSoBay(g);
  if (cs.xacSuatDong >= 40) {
    lyDo.push(`nguy cơ dông ${cs.xacSuatDong}% — canh mây tích, dừng khi đáy mây tối`);
    len("vang");
  } else if (cs.xacSuatDong >= 20) {
    /** Dưới 40% chỉ ghi chú, không hạ màu: mức này là "chiều có thể có ổ dông lẻ". */
    lyDo.push(`có thể có dông (${cs.xacSuatDong}%)`);
  }

  /**
   * THERMAL GẮT: bay được nhưng xóc. Chỉ hạ xuống vàng, không cấm — đây là
   * chuyện thoải mái của khách và tay nghề phi công, không phải chuyện an toàn
   * tuyệt đối như dông hay gió mạnh.
   */
  if (cs.thermal === "gat") {
    lyDo.push(`thermal gắt${cs.tran ? ` (trần ~${cs.tran}m)` : ""} — dù xóc, nhiễu động mạnh`);
    len("vang");
  }

  /**
   * KHÔNG CÒN CẢNH BÁO THEO % MƯA (luật chủ 10/09).
   *
   * Mưa nay xét bằng MILIMÉT: từ 0,3 trở xuống coi như khô, 0,4–0,8 là mưa bay (vẫn
   * bay), từ 0,8 là mưa thật (cấm). Phần trăm của mô hình là "có mưa ở đâu đó
   * trong ô 25 km" — hạ màu theo nó thì mùa mưa ngày nào cũng vàng, trong khi
   * ở bãi trời khô. Ai muốn xem phần trăm thì vẫn còn `xacSuatMuaThat` cho
   * bảng so sánh mô hình.
   */

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
  const capVuot = capTocBiVuot(g.huong, g.gio10m, luat);
  if (luat?.xau && trongCung(g.huong, luat.xau)) {
    lyDo.push(`gió ${huongChu(g.huong)} — ngược sườn cất cánh, không bay`);
    len("do");
  } else if (capVuot) {
    /**
     * TRẦN TỐC ĐỘ RIÊNG CỦA HƯỚNG (luật chủ 11/09): hướng vẫn là gió chính bãi
     * nhưng quá mức này là địa hình bóp gió, không bay — Khau Phạ gió Đông
     * trên 6 m/s, Sa Pa gió Bắc hoặc Tây trên 6 m/s.
     */
    /** Hướng vừa quá trần vừa là hướng luồn khe thì nói cả hai — đó chính là lý do có trần. */
    const cungXiet = luat?.xiet?.some((h) => Math.abs(lechGoc(g.huong, h)) <= 22.5);
    lyDo.push(
      `gió ${capVuot.ten} ${g.gio10m.toFixed(1)} m/s — bãi cấm gió ${capVuot.ten} trên ${capVuot.max} m/s` +
        (cungXiet ? " (⚠ GIÓ XIẾT: luồn khe, tăng tốc ở mép bãi)" : ""),
    );
    len("do");
  } else if (luat?.xiet?.length && manh && luat.xiet.some((h) => Math.abs(lechGoc(g.huong, h)) <= 22.5)) {
    lyDo.push(`⚠ GIÓ XIẾT: hướng ${huongChu(g.huong)} ${NHAN_SUC_GIO[suc]} — luồn khe, tăng tốc ở mép bãi`);
    len("do");
  } else if (huongTot) {
    /** Không thêm "— gió chính bãi" ở hàng giờ: người đọc thấy chữ đó không biết làm gì với nó (luật chủ 10/09). */
    lyDo.push(`gió ${huongChu(g.huong)} ${NHAN_SUC_GIO[suc]}`);
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

/**
 * BA MỨC MƯA (luật chủ 10/09):
 *  - dưới `MUA_BAY` (0,4 mm/giờ): coi như KHÔNG mưa — không ghi, không vẽ.
 *    Chủ chốt rõ 10/09: 0,2 và 0,3 mm là KHÔNG MƯA, đừng nhắc tới.
 *  - từ 0,4 tới dưới `MUA_DANG_KE` (0,8): "MƯA BAY" — ghi chú cho biết, không
 *    hạ màu, không đếm vào số tiếng mưa. Bay vẫn bay.
 *  - từ `MUA_DANG_KE`: mưa thật — đếm tiếng, chấm đỏ (khớp `muaDo` mặc định).
 *
 * Ví dụ chủ đưa: 10h mưa 1,0 mm, 11h–13h mưa 0,6 mm → "mưa lúc 10:00, sau đó
 * mưa bay tới 13:00", chứ không phải "mưa 4 tiếng". Đếm cả mưa bay thì một
 * ngày rả rích 4mm thành "mưa 11 tiếng" — đúng chữ nhưng sai ý.
 */
export const MUA_BAY = 0.4;
export const MUA_DANG_KE = 0.8;

/** Mô tả cường độ mưa cả ngày theo TỔNG lượng — "nhỏ" 4mm khác hẳn "to" 30mm. */
export function suNangMua(tongMm: number): string {
  if (tongMm < 3) return "nhỏ";
  if (tongMm < 15) return "vừa";
  return "to";
}

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
  /**
   * SỐ GIỜ CÓ MƯA ĐÁNG KỂ trong khung bay, và khung giờ mưa.
   *
   * Thay cho "khả năng mưa 93%" ở mức NGÀY: con số phần trăm ấy là xác suất
   * "có mưa ở đâu đó trong ô lưới, lúc nào đó trong giờ", nhưng người đọc hiểu
   * thành "mưa 93% thời gian trong ngày" — tức gần như cả ngày. Nói "mưa
   * khoảng 2 tiếng (13h–15h)" thì không ai hiểu nhầm được.
   */
  /** Số giờ MƯA THẬT (≥ `MUA_DANG_KE`) trong khung bay. */
  gioMua: number;
  /**
   * Tổng mm CỦA RIÊNG NHỮNG GIỜ MƯA THẬT — khác `muaTong` (cộng cả mưa bay).
   * Phải có hai số: đầu thẻ nói "mưa ~2 tiếng, tổng X" thì X đúng là mưa của
   * hai tiếng ấy, chứ cộng thêm mưa bay vào là câu tự mâu thuẫn.
   */
  muaTongThat: number;
  khungMua: string | null;
  /** Số giờ MƯA BAY (0,4 – dưới 0,8 mm) — ghi cho biết, không phải mưa. */
  gioMuaBay: number;
  khungMuaBay: string | null;
  /** Mặt trời mọc / lặn ("HH:mm" giờ Việt Nam) — đổi theo mùa, do mô hình cấp. */
  matTroi?: { moc: string; lan: string };
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
  /**
   * Tiềm năng thermal của ngày (lib/baobay/thermal.ts) — gắn ở service. Sáu
   * yếu tố (nắng, trần xáo trộn, độ dốc nhiệt, LI, gió mực 500 m, độ khô) chấm
   * 0–100 rồi ra năm mức; khác `tranMax` (một con số thô) ở chỗ nó đã cân cả
   * nắng lẫn nắp nghịch nhiệt. `unknown` để tránh vòng import; nơi dùng ép về
   * `TiemNangThermal`.
   */
  thermal?: unknown;
};

/**
 * GỘP CÁC GIỜ THÀNH MỘT NGÀY.
 *
 * Màu của ngày lấy theo CHỖ TỐT NHẤT chứ không theo trung bình: sáng đẹp chiều
 * gió thì vẫn là ngày bay được, chỉ bay buổi sáng. Lấy trung bình thì ngày ấy
 * ra vàng, người đọc tưởng cả ngày dở và huỷ khách oan.
 */
/** "10:00" hay "10:00–13:00" — chỉ nói đầu–cuối: mưa ngắt quãng vẫn là "khoảng ấy có mưa". */
/**
 * KHUNG MƯA viết theo ĐOẠN giờ liền nhau, giờ cuối là giờ KẾT THÚC.
 *
 * Trước đây ghi "giờ đầu–giờ cuối" của mọi giờ có mưa: 5 tiếng mưa rải ở
 * 9,10,11 và 14,15 giờ ra "09:00–16:00" — chủ đọc thành "mưa 7 tiếng" (11/09),
 * mà thật ra giữa trưa ngớt. Nay: "09–12h, 14–16h" — mỗi đoạn trừ đi là ra
 * số tiếng, cộng các đoạn đúng bằng `gioMua`; chỗ ngớt lộ ra ở dấu phẩy.
 * Dạng "09–12h" cố ý khác dạng "09:00–16:00" của khung đẹp để khỏi đọc lẫn.
 */
export function khungCua(m: Array<{ gio: string }>): string | null {
  if (!m.length) return null;
  const gio = m.map((x) => Number(x.gio.slice(11, 13))).sort((a, b) => a - b);
  const doan: Array<[number, number]> = [];
  for (const h of gio) {
    const cuoi = doan[doan.length - 1];
    if (cuoi && h === cuoi[1] + 1) cuoi[1] = h;
    else if (!cuoi || h !== cuoi[1]) doan.push([h, h]);
  }
  const hh = (h: number) => String(h).padStart(2, "0");
  return doan.map(([a, b]) => `${hh(a)}–${hh(b + 1)}h`).join(", ");
}

export function gopNgay(
  ngay: string,
  gio: Array<GioThoiTiet & ChamGio>,
  /** Khung giờ bay của điểm — xem `ToaDoDiemBay.gioBay`. */
  khung: [number, number] = [GIO_BAY_TU, GIO_BAY_DEN],
  /** Giờ mặt trời mọc/lặn của ngày ("HH:mm"), nếu mô hình cấp. */
  matTroi?: { moc: string; lan: string },
): NgayThoiTiet {
  const trongKhung = gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= khung[0] && h <= khung[1];
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
    /**
     * NGÀY "BAY TỐT" PHẢI CÓ ÍT NHẤT HAI GIỜ XANH LIỀN NHAU. Một giờ xanh lẻ
     * loi giữa ngày gió xiết (13/09 Đồi Bù: 15h xanh, còn lại vàng/đỏ) mà huy
     * hiệu ngày vẫn "BAY TỐT" là tự cãi với câu "khuyến cáo không bay 07–15h"
     * ngay dưới. Một giờ đẹp thì ngày là "cân nhắc" — vẫn thấy giờ ấy trong
     * bảng, nhưng không hứa với khách cả ngày.
     */
    muc: dai.len >= 2 ? "xanh" : dem("xanh") + dem("vang") > 0 ? "vang" : "do",
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
    gioMua: trongKhung.filter((g) => g.mua >= MUA_DANG_KE).length,
    muaTongThat: trongKhung.filter((g) => g.mua >= MUA_DANG_KE).reduce((t, g) => t + g.mua, 0),
    khungMua: khungCua(trongKhung.filter((g) => g.mua >= MUA_DANG_KE)),
    gioMuaBay: trongKhung.filter((g) => g.mua >= MUA_BAY && g.mua < MUA_DANG_KE).length,
    khungMuaBay: khungCua(trongKhung.filter((g) => g.mua >= MUA_BAY && g.mua < MUA_DANG_KE)),
    xacSuatDongMax: trongKhung.length ? Math.max(0, ...trongKhung.map((g) => chiSoBay(g).xacSuatDong)) : 0,
    tranMax: (() => {
      const t = trongKhung.map((g) => chiSoBay(g).tran).filter((x): x is number => x !== null);
      return t.length ? Math.max(...t) : null;
    })(),
    gio,
    matTroi,
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
