// services/baobay-thoitiet.service.ts

/**
 * THỜI TIẾT ĐIỂM BAY — gọi mô hình khí tượng, chấm màu, và giữ sổ kinh nghiệm.
 *
 * NGUỒN SỐ — hai đường, tự chọn:
 *
 *  1. WINDY POINT FORECAST API, dùng khi có biến môi trường `WINDY_API_KEY`.
 *     Số lấy thẳng từ windy.com nên khớp từng con với bản đồ nhúng bên cạnh —
 *     không còn cảnh nhân viên đọc app một đằng, mở Windy thấy một nẻo.
 *  2. OPEN-METEO chạy ECMWF IFS, khi chưa cắm khoá. Cũng là mô hình Windy hiển
 *     thị mặc định nên số rất sát, và không cần khoá, không tính tiền.
 *
 * Đường 1 hỏng (hết lượt, khoá sai, Windy chậm) thì tự rơi xuống đường 2 chứ
 * không để thẻ trống: điều phối cần con số ngay, thà lệch một hai km/h.
 *
 * KHOÁ, KHÔNG PHẢI TÀI KHOẢN: đây là khoá API lấy ở api.windy.com — khác với
 * mật khẩu tài khoản Premium của windy.com, và không bao giờ nên đưa mật khẩu
 * ấy vào mã nguồn hay biến môi trường.
 */

import { connectDB } from "@/lib/mongodb";
import { todayInVN } from "@/lib/baobay/date";
import { normalizeSpot, type SpotId } from "@/lib/baobay/spots";
import {
  chamGio,
  doChinhXac,
  gopNgay,
  hocNguong,
  ngayGiongNhau,
  nguongCuaDiem,
  toaDoDiemBay,
  type GioThoiTiet,
  type LanCham,
  type NgayThoiTiet,
  type DoChinhXac,
  type LuatHuong,
  type MucDo,
  type NgayGiong,
  type NguongBay,
  type NguongHoc,
  type ToaDoDiemBay,
} from "@/lib/baobay/thoi-tiet";
import { nhanDinhNgay } from "@/lib/baobay/nhan-dinh";
import { tiemNangThermal, type TiemNangThermal } from "@/lib/baobay/thermal";
import { danhGiaNgay } from "@/lib/baobay/chuyen-gia";
import { moHinhTheoMa, MO_HINH_MAC_DINH, type MoHinh } from "@/lib/baobay/mo-hinh";
import { BaobaySetting } from "@/models/BaobaySetting.model";
import { BaobayWeatherMark } from "@/models/BaobayWeatherMark.model";

/* ================================================================== */
/* Gọi mô hình                                                         */
/* ================================================================== */

/**
 * Trường lấy từ mô hình CHÍNH (ECMWF): gió, mưa, và những thứ suy ra MÙ —
 * điểm sương với nhiệt độ cho ra trần mây, mây thấp cho biết có mây ở tầng đó
 * thật hay không.
 */
const HOURLY = [
  "temperature_2m",
  "dew_point_2m",
  "relative_humidity_2m",
  "precipitation",
  /** Phần mưa rào / đối lưu — để tách "mưa" với "mưa giông" trên biểu đồ. */
  "showers",
  "precipitation_probability",
  "cloud_cover",
  "cloud_cover_low",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
  "shortwave_radiation",
  /* Cho bộ nhận định ngày bay: áp suất, nắng, gió và nhiệt độ tầng cao, mây tầng giữa/cao. */
  "pressure_msl",
  "sunshine_duration",
  "wind_speed_925hPa",
  "wind_speed_850hPa",
  "wind_speed_700hPa",
  "wind_direction_850hPa",
  /** Hướng gió các mực còn lại — để vẽ airgram (mũi tên theo độ cao). */
  "wind_direction_925hPa",
  "wind_direction_700hPa",
  "temperature_1000hPa",
  "temperature_925hPa",
  "temperature_850hPa",
  "temperature_700hPa",
  "geopotential_height_925hPa",
  "geopotential_height_850hPa",
  "cloud_cover_mid",
  "cloud_cover_high",
].join(",");

/**
 * Trường lấy từ mô hình PHỤ (GFS) — ECMWF của Open-Meteo KHÔNG cấp mấy cái này.
 *
 * `lifted_index` (độ ổn định cả cột khí) và `boundary_layer_height` (trần
 * thermal) là hai số quyết định trời êm hay xóc, và có mầm dông hay không.
 * Thiếu chúng thì chỉ biết gió mạnh hay nhẹ, không biết KHÔNG KHÍ có động hay
 * không — hai chuyện khác hẳn nhau với người bay.
 */
/**
 * Trường của MÔ HÌNH PHỤ (GFS). Ngoài ba chỉ số đối lưu, lấy thêm cặp
 * `showers` + `precipitation` để biết BAO NHIÊU PHẦN lượng mưa là mưa
 * rào/giông — xem `traTyLeRao` dưới.
 */
const HOURLY_PHU = ["lifted_index", "convective_inhibition", "boundary_layer_height", "showers", "precipitation"].join(",");

/**
 * BỘ NHỚ TẠM TRONG TIẾN TRÌNH, 20 phút.
 *
 * Mô hình ECMWF chỉ chạy 4 lần một ngày nên gọi lại sau mỗi lần bấm F5 là phí:
 * số y hệt, mà mỗi lần chờ mạng lại thêm một giây trắng màn hình. 20 phút đủ
 * ngắn để không ai xem phải số cũ của hôm trước, đủ dài để cả ca trực chỉ gọi
 * vài lần. Máy chủ khởi động lại thì mất — không sao, gọi lại là có.
 */
const CACHE = new Map<string, { luc: number; du: NgayThoiTiet[]; moHinh: string }>();
const CACHE_MS = 20 * 60 * 1000;

/**
 * SỐ NGÀY DỰ BÁO — 10 ngày (luật chủ 10/09).
 *
 * Đã dò thật trước khi nâng: ECMWF IFS025 và GFS đều trả đủ 240 giờ không
 * thủng lỗ nào, kể cả chỉ số nâng của mô hình phụ. Mười là con số chẵn, dải
 * ngày xếp 5 ô một hàng thì vừa đúng hai hàng.
 *
 * Đừng nâng tiếp: qua 10 ngày mô hình toàn cầu chỉ còn nói được xu thế lớn,
 * mà ở địa hình đèo thì xu thế lớn không quyết định được ngày bay — bày ra chỉ
 * khiến người ta tin vào một con số không có thật.
 */
export const SO_NGAY = 10;
/**
 * BẢN CŨ CÒN DÙNG ĐƯỢC TỚI 6 TIẾNG khi không gọi được mô hình.
 *
 * Mạng ngoài đèo rớt là chuyện thường, và nhà cung cấp cũng có lúc chậm. Lúc
 * ấy thà đưa số của ba tiếng trước kèm dòng "lấy lúc …" còn hơn một hộp báo
 * lỗi: dự báo ba tiếng trước vẫn cho biết chiều nay gió thế nào, còn hộp lỗi
 * thì không cho biết gì. Quá 6 tiếng mới chịu thua — xa hơn nữa thì số cũ bắt
 * đầu nói sai về buổi đang tới.
 */
const CACHE_CUU_MS = 6 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Đường 1: Windy Point Forecast API                                    */
/* ------------------------------------------------------------------ */

/**
 * Windy trả GIÓ THEO HAI THÀNH PHẦN u (đông) và v (bắc), đơn vị m/s — phải tự
 * đổi ra tốc độ và hướng. Hướng tính bằng `atan2` rồi cộng 180° vì quy ước khí
 * tượng nói gió THỔI TỚI TỪ đâu, còn véc-tơ u/v chỉ hướng gió ĐI VỀ.
 */
function uvSangGio(u: number, v: number): { tocDo: number; huong: number } {
  const tocDo = Math.sqrt(u * u + v * v); // Windy trả m/s, đúng đơn vị đang dùng
  const huong = (Math.atan2(-u, -v) * 180) / Math.PI;
  return { tocDo, huong: ((huong % 360) + 360) % 360 };
}

/**
 * MÔ HÌNH DÙNG Ở WINDY — mặc định GFS, KHÔNG PHẢI ECMWF.
 *
 * Windy KHÔNG bán ECMWF qua Point Forecast API ("not included due to licensing
 * conditions") dù chính trang windy.com hiển thị nó. Những mô hình API ấy có —
 * arome (Pháp), iconEu (châu Âu), nam và hrrr (Bắc Mỹ) — đều KHÔNG phủ Việt
 * Nam; còn lại đúng một mô hình toàn cầu là GFS.
 *
 * Hệ quả cần biết trước khi trả tiền: đường Open-Meteo đang chạy miễn phí cấp
 * ECMWF IFS, tức là MỊN HƠN và thường đúng hơn GFS ở địa hình núi. Cắm khoá
 * Windy vào là đổi sang GFS — khớp tuyệt đối với vài lớp của Windy, nhưng
 * không phải là nâng cấp về độ chính xác.
 *
 * Đặt `WINDY_MODEL` nếu sau này Windy mở thêm mô hình phủ Việt Nam.
 */
const WINDY_MODEL = process.env.WINDY_MODEL?.trim() || "gfs";

/**
 * Gọi Windy và trả về ĐÚNG hình dạng mà Open-Meteo trả, để phần chấm màu phía
 * sau không cần biết số đến từ đâu.
 */
async function goiWindy(toaDo: ToaDoDiemBay, key: string): Promise<any> {
  const res = await fetch("https://api.windy.com/api/point-forecast/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat: toaDo.lat,
      lon: toaDo.lon,
      model: WINDY_MODEL,
      parameters: ["wind", "gust", "precip", "temp", "lclouds", "mclouds", "hclouds"],
      levels: ["surface"],
      key,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Windy trả ${res.status}`);
  const w = await res.json();
  const ts: number[] = w?.ts ?? [];
  if (!ts.length) throw new Error("Windy không trả mốc thời gian");

  const u: number[] = w["wind_u-surface"] ?? [];
  const v: number[] = w["wind_v-surface"] ?? [];
  const gust: number[] = w["gust-surface"] ?? [];
  const precip: number[] = w["past3hprecip-surface"] ?? w["precip-surface"] ?? [];
  const temp: number[] = w["temp-surface"] ?? [];
  const may = (i: number) =>
    Math.max(
      Number(w["lclouds-surface"]?.[i] ?? 0),
      Number(w["mclouds-surface"]?.[i] ?? 0),
      Number(w["hclouds-surface"]?.[i] ?? 0),
    );

  const hourly: any = {
    time: [],
    wind_speed_10m: [],
    wind_direction_10m: [],
    wind_gusts_10m: [],
    precipitation: [],
    cloud_cover: [],
    temperature_2m: [],
  };
  for (let i = 0; i < ts.length; i++) {
    /**
     * Windy trả mốc UTC; cả hệ này làm việc bằng giờ Việt Nam nên đổi ngay tại
     * đây, không để lệch 7 tiếng chảy vào phần gộp theo ngày.
     */
    const d = new Date(ts[i] + 7 * 3600 * 1000);
    hourly.time.push(d.toISOString().slice(0, 16));
    const g = uvSangGio(Number(u[i] ?? 0), Number(v[i] ?? 0));
    hourly.wind_speed_10m.push(g.tocDo);
    hourly.wind_direction_10m.push(g.huong);
    hourly.wind_gusts_10m.push(Number(gust[i] ?? 0));
    /** Windy gộp mưa 3 giờ; chia ra để cùng thang "mm trong giờ" với Open-Meteo. */
    hourly.precipitation.push(Math.max(0, Number(precip[i] ?? 0)) / 3);
    hourly.cloud_cover.push(may(i));
    hourly.temperature_2m.push(Number(temp[i] ?? 273.15) - 273.15); // Kelvin → °C
  }
  return { hourly };
}

async function goiMoHinh(toaDo: ToaDoDiemBay, soNgay: number, moHinh?: string, truong = HOURLY): Promise<any> {
  const q = new URLSearchParams({
    latitude: String(toaDo.lat),
    longitude: String(toaDo.lon),
    hourly: truong,
    /** Mọc/lặn từng ngày — đổi theo mùa; dùng để tô đêm trên biểu đồ và ghi ở đầu thẻ. */
    daily: "sunrise,sunset",
    forecast_days: String(soNgay),
    timezone: "Asia/Bangkok",
    /** M/S — đơn vị phi công đọc trên máy đo gió tại bãi; xem ghi chú ở NGUONG_MAC_DINH. */
    wind_speed_unit: "ms",
  });
  if (moHinh) q.set("models", moHinh);
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, {
    /** Next tự cache fetch phía máy chủ — tắt đi vì đã có bộ nhớ tạm ở trên. */
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Open-Meteo trả ${res.status}`);
  return res.json();
}

/** Đọc dự báo và chấm màu từng giờ, gộp theo ngày. */
export async function duBaoDiemBay(
  spot: string,
  opts: { soNgay?: number; boCache?: boolean; moHinh?: string } = {},
): Promise<{
  spot: SpotId;
  toaDo: ToaDoDiemBay;
  nguong: NguongBay;
  ngay: NgayThoiTiet[];
  /** Mô hình thật sự dùng được — hiện dưới thẻ cho minh bạch. */
  moHinh: string;
  layLuc: string;
}> {
  const key = normalizeSpot(spot);
  const { toaDo, nguong } = await cauHinhDiem(key);
  const soNgay = Math.min(10, Math.max(1, opts.soNgay ?? SO_NGAY));
  const mh = moHinhTheoMa(opts.moHinh ?? MO_HINH_MAC_DINH);
  const cacheKey = `${key}:${mh.ma}:${soNgay}:${toaDo.lat},${toaDo.lon}`;

  const cu = CACHE.get(cacheKey);
  if (!opts.boCache && cu && Date.now() - cu.luc < CACHE_MS) {
    return { spot: key, toaDo, nguong, ngay: cu.du, moHinh: cu.moHinh, layLuc: new Date(cu.luc).toISOString() };
  }

  try {
    const { ngay, moHinh } = await layVaCham(toaDo, soNgay, nguong, mh);
    CACHE.set(cacheKey, { luc: Date.now(), du: ngay, moHinh });
    return { spot: key, toaDo, nguong, ngay, moHinh, layLuc: new Date().toISOString() };
  } catch (e) {
    /** Không gọi được thì đưa bản cũ, nếu còn trong hạn cứu — xem CACHE_CUU_MS. */
    if (cu && Date.now() - cu.luc < CACHE_CUU_MS) {
      return {
        spot: key,
        toaDo,
        nguong,
        ngay: cu.du,
        moHinh: `${cu.moHinh} — số cũ, chưa lấy lại được`,
        layLuc: new Date(cu.luc).toISOString(),
      };
    }
    throw e;
  }
}

/**
 * Lấy số về rồi chấm màu — phần ruột dùng chung cho sổ nội bộ lẫn trang khách.
 * Tách ra vì hai đường chỉ khác nhau ở chỗ LẤY CẤU HÌNH TỪ ĐÂU, còn cách gọi
 * mô hình và cách chấm màu thì phải y hệt, không được lệch một luật nào.
 */
async function layVaCham(
  toaDo: ToaDoDiemBay,
  soNgay: number,
  nguong: NguongBay,
  mh: MoHinh = moHinhTheoMa(MO_HINH_MAC_DINH),
): Promise<{ ngay: NgayThoiTiet[]; moHinh: string }> {
  /**
   * KHỞI ĐỘNG MÔ HÌNH PHỤ NGAY, KHÔNG CHỜ MÔ HÌNH CHÍNH.
   *
   * Hai lần gọi mạng độc lập nhau, mỗi lần tới 12 giây. Chạy nối tiếp là 24
   * giây — vượt giới hạn thời gian của route (25s) chỉ vì cộng dồn thời gian
   * CHỜ, chứ không phải vì tính toán gì. Bắt đầu cả hai cùng lúc thì tổng chỉ
   * bằng cái chậm hơn.
   *
   * `.catch` gắn NGAY tại đây: promise này bị await mãi sau, mà một promise
   * hỏng chưa ai bắt sẽ bị Node coi là lỗi không xử lý.
   */
  /**
   * Mô hình phụ (GFS) lấy chỉ số ổn định — trừ khi mô hình chính đã có sẵn
   * (GFS chọn làm chính): gọi thêm là gọi hai lần cùng một thứ.
   */
  const hen = mh.coChiSoOnDinh
    ? goiMoHinh(toaDo, soNgay, mh.id, HOURLY_PHU).catch(() => null)
    : goiMoHinh(toaDo, soNgay, "gfs_seamless", HOURLY_PHU).catch(() => null);

  let raw: any;
  let moHinh = `${mh.ten} (Open-Meteo)`;
  const khoaWindy = process.env.WINDY_API_KEY?.trim();
  /** Khoá Windy chỉ thay cho mô hình MẶC ĐỊNH; chọn mô hình khác là chọn Open-Meteo rõ ràng. */
  if (khoaWindy && mh.ma === MO_HINH_MAC_DINH) {
    try {
      raw = await goiWindy(toaDo, khoaWindy);
      moHinh = `Windy Point Forecast (${WINDY_MODEL.toUpperCase()})`;
    } catch (e) {
      /** Ghi lại rồi đi tiếp: hết lượt gọi trong ngày là chuyện thường, không phải sự cố. */
      console.warn("Windy API không dùng được, rơi về Open-Meteo:", (e as Error)?.message);
    }
  }
  if (!raw) {
    try {
      raw = await goiMoHinh(toaDo, soNgay, mh.id);
    } catch {
      /** Mô hình chọn hỏng thì lấy bản trộn của Open-Meteo — xem ghi chú đầu tệp. */
      raw = await goiMoHinh(toaDo, soNgay);
      moHinh = "Open-Meteo (trộn mô hình)";
    }
  }

  const h = raw?.hourly;
  if (!h?.time?.length) throw new Error("Mô hình không trả dữ liệu theo giờ");

  /**
   * Ô lưới của mô hình cao hơn bãi cất cánh bao nhiêu — cần cho phép tính trần
   * mây (xem `tranMay`). Mô hình trả `elevation` là độ cao TRUNG BÌNH của ô
   * ~25km; ở Khau Phạ ô ấy 1.620m còn bãi 1.200m, lệch tới 420m.
   *
   * Chỉ cộng khi ô CAO HƠN bãi. Ô thấp hơn (điểm bay trên đỉnh núi lẻ giữa
   * đồng bằng) thì để 0: trừ đi sẽ ra trần mây âm, mà mây thì không nằm dưới
   * chân người đứng.
   */
  const chenhDoCao = Number.isFinite(raw?.elevation) && Number.isFinite(toaDo.alt as number)
    ? Math.max(0, Math.round(Number(raw.elevation) - Number(toaDo.alt)))
    : 0;

  /**
   * Ghép mô hình PHỤ (đã chạy song song từ đầu hàm) theo mốc giờ. Hỏng thì bỏ
   * qua: mất mấy chỉ số đối lưu chứ không mất bảng gió — thà thiếu một cột còn
   * hơn trang trắng vì một máy chủ phụ chậm.
   */
  const phu = await hen;
  const tra = new Map<string, number>();
  const traCin = new Map<string, number>();
  const traTran = new Map<string, number>();
  /**
   * TỈ LỆ MƯA RÀO/GIÔNG trong tổng lượng mưa của giờ đó (0–1).
   *
   * ECMWF — mô hình chính — KHÔNG mô hình hoá mưa rào riêng: hỏi `showers` nó
   * trả 0 suốt (đã dò thật 10/09). GFS thì có. Nên lấy TỈ LỆ của GFS rồi áp lên
   * lượng mưa của mô hình chính, thay vì bê thẳng số milimét của GFS sang —
   * hai mô hình đoán lượng khác nhau, trộn số là ra cột mưa sai.
   */
  const traTyLeRao = new Map<string, number>();
  if (phu?.hourly?.time?.length) {
    phu.hourly.time.forEach((t: string, i: number) => {
      const li = phu.hourly.lifted_index?.[i];
      const cin = phu.hourly.convective_inhibition?.[i];
      const tran = phu.hourly.boundary_layer_height?.[i];
      if (li !== null && li !== undefined) tra.set(t, Number(li));
      if (cin !== null && cin !== undefined) traCin.set(t, Number(cin));
      if (tran !== null && tran !== undefined) traTran.set(t, Number(tran));
      const tong = Number(phu.hourly.precipitation?.[i] ?? 0);
      const rao = Number(phu.hourly.showers?.[i] ?? 0);
      if (tong > 0.05) traTyLeRao.set(t, Math.max(0, Math.min(1, rao / tong)));
    });
  }

  const theoNgay = new Map<string, Array<GioThoiTiet & ReturnType<typeof chamGio>>>();
  for (let i = 0; i < h.time.length; i++) {
    const t = h.time[i];
    const so = (mang: unknown[] | undefined) => {
      const v = mang?.[i];
      return v === null || v === undefined ? undefined : Number(v);
    };
    const g: GioThoiTiet = {
      gio: t,
      gio10m: Number(h.wind_speed_10m?.[i] ?? 0),
      giat: Number(h.wind_gusts_10m?.[i] ?? 0),
      huong: Number(h.wind_direction_10m?.[i] ?? 0),
      mua: Number(h.precipitation?.[i] ?? 0),
      /** Mô hình chính có số của chính nó thì dùng; không thì suy theo tỉ lệ của mô hình phụ. */
      muaRao: (() => {
        const tong = Number(h.precipitation?.[i] ?? 0);
        const rieng = so(h.showers);
        if (rieng !== undefined && rieng > 0) return rieng;
        const tyLe = traTyLeRao.get(t);
        return tyLe === undefined || tong <= 0 ? undefined : Number((tong * tyLe).toFixed(2));
      })(),
      may: Number(h.cloud_cover?.[i] ?? 0),
      nhietDo: Number(h.temperature_2m?.[i] ?? 0),
      diemSuong: so(h.dew_point_2m),
      mayThap: so(h.cloud_cover_low),
      am: so(h.relative_humidity_2m),
      cape: so(h.cape),
      xacSuatMua: so(h.precipitation_probability),
      buXa: so(h.shortwave_radiation),
      chiSoNang: tra.get(t),
      tranThermal: traTran.get(t),
      chenhDoCao,
      apSuat: so(h.pressure_msl),
      giayNang: so(h.sunshine_duration),
      gio925: so(h.wind_speed_925hPa),
      gio850: so(h.wind_speed_850hPa),
      gio700: so(h.wind_speed_700hPa),
      huong850: so(h.wind_direction_850hPa),
      huong925: so(h.wind_direction_925hPa),
      huong700: so(h.wind_direction_700hPa),
      t1000: so(h.temperature_1000hPa),
      t925: so(h.temperature_925hPa),
      t850: so(h.temperature_850hPa),
      t700: so(h.temperature_700hPa),
      h925: so(h.geopotential_height_925hPa),
      h850: so(h.geopotential_height_850hPa),
      mayGiua: so(h.cloud_cover_mid),
      mayCao: so(h.cloud_cover_high),
    };
    const ngay = g.gio.slice(0, 10);
    if (!theoNgay.has(ngay)) theoNgay.set(ngay, []);
    theoNgay.get(ngay)!.push({ ...g, ...chamGio(g, nguong, toaDo.huongThuan, toaDo.luatHuong, toaDo.alt) });
  }

  /** Mọc/lặn theo ngày: Open-Meteo trả "YYYY-MM-DDTHH:mm" giờ địa phương. */
  const matTroi = new Map<string, { moc: string; lan: string }>();
  const dl = raw?.daily;
  if (dl?.time?.length) {
    dl.time.forEach((d: string, i: number) => {
      const moc = String(dl.sunrise?.[i] ?? "").slice(11, 16);
      const lan = String(dl.sunset?.[i] ?? "").slice(11, 16);
      if (moc && lan) matTroi.set(d, { moc, lan });
    });
  }
  const ngay = [...theoNgay.entries()].map(([d, gio]) => gopNgay(d, gio, toaDo.gioBay, matTroi.get(d))).slice(0, soNgay);
  /**
   * Nhận định từng ngày, làm SAU khi có đủ cả dãy: ngày nào cũng cần ngày liền
   * trước để biết áp suất đang lên hay xuống — thứ báo front sớm nhất.
   */
  ngay.forEach((n, i) => {
    /**
     * THERMAL TRƯỚC, NHẬN ĐỊNH SAU: hai chỗ cùng nói về thermal thì phải cùng
     * một nguồn, không thì thẻ hiện "thermal yếu" ở mục này và "38/100 nhẹ" ở
     * mục kia (chủ 11/09). Quy tắc sáu yếu tố là nguồn chuẩn; nhận định chỉ
     * kể lại.
     */
    n.thermal = tiemNangThermal(n.gio, { altBai: toaDo.alt, gioBay: toaDo.gioBay });
    n.nhanDinh = nhanDinhNgay(n, {
      ngayTruoc: i > 0 ? ngay[i - 1] : null,
      altBai: toaDo.alt,
      luatHuong: toaDo.luatHuong,
      gioBay: toaDo.gioBay,
      thermal: n.thermal as TiemNangThermal,
    });
    /** Điểm 0–100 của chuyên gia — cùng dữ liệu, cùng luật hướng, ngưỡng và khung giờ của điểm. */
    n.chuyenGia = danhGiaNgay(n, nguong, {
      luatHuong: toaDo.luatHuong,
      altBai: toaDo.alt,
      thuTu: i,
      ngayTruoc: i > 0 ? ngay[i - 1] : null,
      gioBay: toaDo.gioBay,
    });
  });
  return { ngay, moHinh };
}

/* ------------------------------------------------------------------ */
/* Dự báo cho WEBSITE KHÁCH                                            */
/* ------------------------------------------------------------------ */

/**
 * Dự báo một điểm bay trên trang khách.
 *
 * Điểm nào có sổ nội bộ thì mượn NGUYÊN cấu hình của sổ ấy — toạ độ chủ đã
 * chỉnh đúng bãi cất cánh, và nhất là NGƯỠNG GIÓ đã học từ những ngày chủ chấm
 * bay hay nghỉ. Nhờ vậy màu khách nhìn thấy trên web đúng bằng màu người trong
 * nhà nhìn, không phải hai thước đo khác nhau cho cùng một ngọn núi.
 *
 * Điểm chưa có sổ (Sơn Trà, Hà Giang, Trạm Tấu…) thì dùng toạ độ trong danh
 * sách và ngưỡng khởi điểm của bay đôi.
 */
export async function duBaoDiemCongKhai(diem: {
  slug: string;
  ten: string;
  tinh: string;
  lat: number;
  lon: number;
  /** Độ cao bãi cất / bãi hạ (m) — điểm trang khách khai riêng thì đè lên số của sổ nội bộ. */
  alt?: number;
  altHa?: number;
  /** Bãi cất thứ hai (Viên Nam có hai chỗ cất). */
  altCat2?: number;
  spotNoiBo?: SpotId;
  luatHuong?: LuatHuong;
}, moHinhMa?: string): Promise<{
  slug: string;
  ten: string;
  tinh: string;
  toaDo: ToaDoDiemBay;
  nguong: NguongBay;
  ngay: NgayThoiTiet[];
  moHinh: string;
  layLuc: string;
}> {
  /**
   * Điểm có sổ nội bộ vẫn ưu tiên cấu hình của sổ, NHƯNG luật hướng khai trong
   * danh sách công khai thì đè lên: Đồi Bù và Viên Nam dùng chung sổ "Hà Nội"
   * mà hai bãi quay hai phía, nên luật hướng phải theo từng bãi.
   */
  const mh = moHinhTheoMa(moHinhMa ?? MO_HINH_MAC_DINH);
  if (diem.spotNoiBo) {
    const du = await duBaoDiemBay(diem.spotNoiBo, { moHinh: mh.ma });
    /** Điểm trang khách khai riêng thì đè lên số của sổ nội bộ (Đồi Bù và Viên Nam dùng chung sổ "Hà Nội"). */
    const toaDo: ToaDoDiemBay = {
      ...du.toaDo,
      ...(diem.luatHuong ? { luatHuong: diem.luatHuong } : {}),
      ...(diem.alt !== undefined ? { alt: diem.alt } : {}),
      ...(diem.altHa !== undefined ? { altHa: diem.altHa } : {}),
      ...(diem.altCat2 !== undefined ? { altCat2: diem.altCat2 } : {}),
    };
    return { slug: diem.slug, ten: diem.ten, tinh: diem.tinh, ...du, toaDo };
  }

  const toaDo: ToaDoDiemBay = {
    lat: diem.lat,
    lon: diem.lon,
    ten: diem.ten,
    alt: diem.alt,
    altHa: diem.altHa,
    altCat2: diem.altCat2,
    luatHuong: diem.luatHuong,
  };
  const nguong = nguongCuaDiem(null);
  const cacheKey = `web:${diem.slug}:${mh.ma}:${SO_NGAY}:${diem.lat},${diem.lon}`;
  const cu = CACHE.get(cacheKey);
  if (cu && Date.now() - cu.luc < CACHE_MS) {
    return {
      slug: diem.slug,
      ten: diem.ten,
      tinh: diem.tinh,
      toaDo,
      nguong,
      ngay: cu.du,
      moHinh: cu.moHinh,
      layLuc: new Date(cu.luc).toISOString(),
    };
  }

  try {
    const { ngay, moHinh } = await layVaCham(toaDo, SO_NGAY, nguong, mh);
    CACHE.set(cacheKey, { luc: Date.now(), du: ngay, moHinh });
    return { slug: diem.slug, ten: diem.ten, tinh: diem.tinh, toaDo, nguong, ngay, moHinh, layLuc: new Date().toISOString() };
  } catch (e) {
    if (cu && Date.now() - cu.luc < CACHE_CUU_MS) {
      return {
        slug: diem.slug,
        ten: diem.ten,
        tinh: diem.tinh,
        toaDo,
        nguong,
        ngay: cu.du,
        moHinh: cu.moHinh,
        layLuc: new Date(cu.luc).toISOString(),
      };
    }
    throw e;
  }
}

/* ================================================================== */
/* Cấu hình toạ độ + ngưỡng của điểm                                   */
/* ================================================================== */

export async function cauHinhDiem(spot: string): Promise<{ toaDo: ToaDoDiemBay; nguong: NguongBay }> {
  await connectDB();
  const key = normalizeSpot(spot);
  const doc = await BaobaySetting.findOne({ key }).select("weather").lean<any>();
  const w = doc?.weather ?? null;
  const gioBay: [number, number] | undefined =
    w && Number.isFinite(w.gioBayTu) && Number.isFinite(w.gioBayDen) && w.gioBayTu < w.gioBayDen ? [Number(w.gioBayTu), Number(w.gioBayDen)] : undefined;
  const toaDo = toaDoDiemBay(key, w ? { ...w, gioBay } : null);
  return { toaDo, nguong: nguongCuaDiem(w, toaDo.nguong) };
}

export type LuuCauHinh = Partial<{
  lat: number;
  lon: number;
  alt: number;
  ten: string;
  huongTu: number;
  huongDen: number;
  gioXanh: number;
  gioDo: number;
  giatDo: number;
  muaDo: number;
  tranMayDo: number;
  gioBayTu: number;
  gioBayDen: number;
}>;

export async function luuCauHinhDiem(
  spot: string,
  patch: LuuCauHinh,
  boi: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = normalizeSpot(spot);
  const set: Record<string, unknown> = {};

  if (patch.lat !== undefined || patch.lon !== undefined) {
    const lat = Number(patch.lat);
    const lon = Number(patch.lon);
    /** Chặn toạ độ vô lý ngay ở đây: sai một dấu là thẻ chỉ về giữa Thái Bình Dương. */
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, error: "Vĩ độ phải trong khoảng -90…90" };
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { ok: false, error: "Kinh độ phải trong khoảng -180…180" };
    set["weather.lat"] = lat;
    set["weather.lon"] = lon;
  }
  if (patch.alt !== undefined) set["weather.alt"] = Math.max(0, Math.round(Number(patch.alt) || 0));
  if (patch.ten !== undefined) set["weather.ten"] = String(patch.ten).trim().slice(0, 80);

  if (patch.huongTu !== undefined && patch.huongDen !== undefined) {
    const tu = Number(patch.huongTu);
    const den = Number(patch.huongDen);
    /** Bỏ trống cả hai = không chấm hướng nữa (điểm bay xoay được nhiều phía). */
    if (!Number.isFinite(tu) || !Number.isFinite(den)) set["weather.huongThuan"] = null;
    else set["weather.huongThuan"] = [((tu % 360) + 360) % 360, ((den % 360) + 360) % 360];
  }

  for (const k of ["gioXanh", "gioDo", "giatDo", "muaDo", "tranMayDo"] as const) {
    if (patch[k] === undefined) continue;
    const v = Number(patch[k]);
    if (!Number.isFinite(v) || v <= 0) return { ok: false, error: `Ngưỡng ${k} phải là số dương` };
    set[`weather.${k}`] = v;
  }

  if (patch.gioBayTu !== undefined || patch.gioBayDen !== undefined) {
    const tu = Number(patch.gioBayTu);
    const den = Number(patch.gioBayDen);
    if (!Number.isInteger(tu) || !Number.isInteger(den) || tu < 4 || den > 20 || tu >= den) {
      return { ok: false, error: "Khung giờ bay phải là hai số nguyên trong 4–20, giờ từ nhỏ hơn giờ đến (ví dụ 9 và 16)" };
    }
    set["weather.gioBayTu"] = tu;
    set["weather.gioBayDen"] = den;
  }

  if (!Object.keys(set).length) return { ok: true };
  set.updatedBy = boi;

  await connectDB();
  await BaobaySetting.updateOne({ key }, { $set: set }, { upsert: true });
  /** Đổi toạ độ là số cũ vô nghĩa — xoá bộ nhớ tạm của điểm này ngay. */
  for (const k of [...CACHE.keys()]) if (k.startsWith(`${key}:`)) CACHE.delete(k);
  return { ok: true };
}

/* ================================================================== */
/* Sổ kinh nghiệm: chấm ngày và học ngưỡng                             */
/* ================================================================== */

export async function chamNgay(
  spot: string,
  input: { date: string; verdict: "tot" | "han-che" | "nghi"; note?: string },
  boi: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = normalizeSpot(spot);
  const date = String(input.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Ngày không hợp lệ" };
  if (!["tot", "han-che", "nghi"].includes(input.verdict)) return { ok: false, error: "Kết luận không hợp lệ" };
  /** Chấm ngày mai thì chấm cái gì? Chỉ nhận hôm nay trở về trước. */
  if (date > todayInVN()) return { ok: false, error: "Chưa qua ngày thì chưa chấm được" };

  /**
   * CHỤP SỐ CỦA NGÀY ĐÓ ngay lúc chấm — xem ghi chú ở model. Ngày hôm nay thì
   * lấy từ dự báo đang chạy; ngày đã qua thì hỏi kho lịch sử của Open-Meteo.
   */
  const so = await soCuaNgay(key, date);

  await connectDB();
  await BaobayWeatherMark.updateOne(
    { spot: key, date },
    {
      $set: {
        verdict: input.verdict,
        note: String(input.note || "").trim().slice(0, 300),
        markedBy: boi,
        ...(so ?? {}),
      },
    },
    { upsert: true },
  );
  return { ok: true };
}

/** Gió/giật/mưa lớn nhất trong khung giờ bay của một ngày — cho sổ kinh nghiệm. */
async function soCuaNgay(
  spot: SpotId,
  date: string,
): Promise<{ windMax: number; gustMax: number; rainTotal: number; windDir: number } | null> {
  try {
    const { toaDo } = await cauHinhDiem(spot);
    const [tuGio, denGio] = toaDo.gioBay ?? [7, 17];
    const homNay = todayInVN();
    const q = new URLSearchParams({
      latitude: String(toaDo.lat),
      longitude: String(toaDo.lon),
      hourly: HOURLY,
      timezone: "Asia/Bangkok",
      wind_speed_unit: "kmh",
      start_date: date,
      end_date: date,
    });
    /**
     * Ngày đã qua thì phải hỏi máy chủ LỊCH SỬ: máy chủ dự báo chỉ giữ vài ngày
     * gần đây, hỏi ngày cũ nó trả rỗng chứ không báo lỗi — thẻ sẽ im lặng thiếu số.
     */
    const goc = date < homNay ? "https://archive-api.open-meteo.com/v1/archive" : "https://api.open-meteo.com/v1/forecast";
    const res = await fetch(`${goc}?${q}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const h = (await res.json())?.hourly;
    if (!h?.time?.length) return null;

    let windMax = 0;
    let gustMax = 0;
    let rainTotal = 0;
    let windDir = 0;
    let dem = 0;
    for (let i = 0; i < h.time.length; i++) {
      const gio = Number(String(h.time[i]).slice(11, 13));
      if (gio < tuGio || gio > denGio) continue;
      windMax = Math.max(windMax, Number(h.wind_speed_10m?.[i] ?? 0));
      gustMax = Math.max(gustMax, Number(h.wind_gusts_10m?.[i] ?? 0));
      rainTotal += Number(h.precipitation?.[i] ?? 0);
      windDir += Number(h.wind_direction_10m?.[i] ?? 0);
      dem++;
    }
    if (!dem) return null;
    return {
      windMax: Math.round(windMax * 10) / 10,
      gustMax: Math.round(gustMax * 10) / 10,
      rainTotal: Math.round(rainTotal * 10) / 10,
      windDir: Math.round(windDir / dem),
    };
  } catch {
    /** Không lấy được số thì vẫn cho chấm — mất một dòng dữ liệu học, không mất việc. */
    return null;
  }
}

/**
 * CHỦ DỰ BÁO TRƯỚC cho một ngày sắp tới.
 *
 * Chụp lại luôn màu máy đang chấm ngày ấy: sau khi ngày qua và có chấm thực
 * tế, ba con số (máy đoán · chủ đoán · thực tế) nằm cùng một dòng thì mới so
 * được ai đúng hơn và máy lệch về phía nào.
 */
export async function duBaoCuaChu(
  spot: string,
  input: { date: string; forecast: "tot" | "han-che" | "nghi"; window?: string; note?: string },
  boi: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = normalizeSpot(spot);
  const date = String(input.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Ngày không hợp lệ" };
  if (!["tot", "han-che", "nghi"].includes(input.forecast)) return { ok: false, error: "Dự báo không hợp lệ" };
  /** Dự báo là nói TRƯỚC. Ngày đã qua thì dùng nút chấm thực tế, không phải ô này. */
  if (date < todayInVN()) return { ok: false, error: "Ngày đã qua — dùng nút chấm thực tế" };

  let mayCham: MucDo | undefined;
  try {
    const du = await duBaoDiemBay(key);
    mayCham = du.ngay.find((n) => n.ngay === date)?.muc;
  } catch {
    /** Không lấy được dự báo máy thì vẫn cho ghi — mất một cột đối chiếu thôi. */
  }

  await connectDB();
  await BaobayWeatherMark.updateOne(
    { spot: key, date },
    {
      $set: {
        forecast: input.forecast,
        forecastWindow: String(input.window || "").trim().slice(0, 40),
        forecastNote: String(input.note || "").trim().slice(0, 300),
        forecastBy: boi,
        forecastAt: new Date(),
        ...(mayCham ? { machineVerdict: mayCham } : {}),
      },
    },
    { upsert: true },
  );
  return { ok: true };
}

export type LichSuCham = {
  date: string;
  verdict?: "tot" | "han-che" | "nghi";
  note: string;
  forecast?: "tot" | "han-che" | "nghi";
  forecastWindow?: string;
  forecastNote?: string;
  forecastBy?: string;
  machineVerdict?: MucDo;
  windMax?: number;
  gustMax?: number;
  rainTotal?: number;
  markedBy: string;
};

export async function soKinhNghiem(
  spot: string,
  gioiHan = 120,
  /** Số của các ngày đang hiện trên thẻ — để tìm ngày cũ giống từng ngày. */
  ngaySapToi: Array<{ ngay: string; gioMax: number; giatMax: number; muaTong: number }> = [],
): Promise<{
  cham: LichSuCham[];
  hoc: NguongHoc;
  chinhXac: DoChinhXac;
  giong: Record<string, NgayGiong[]>;
}> {
  await connectDB();
  const key = normalizeSpot(spot);
  const docs = await BaobayWeatherMark.find({ spot: key }).sort({ date: -1 }).limit(gioiHan).lean<any[]>();
  const cham: LichSuCham[] = docs.map((d) => ({
    date: d.date,
    verdict: d.verdict,
    note: d.note ?? "",
    forecast: d.forecast,
    forecastWindow: d.forecastWindow,
    forecastNote: d.forecastNote,
    forecastBy: d.forecastBy,
    machineVerdict: d.machineVerdict,
    windMax: d.windMax,
    gustMax: d.gustMax,
    rainTotal: d.rainTotal,
    markedBy: d.markedBy ?? "",
  }));

  /** Chỉ ngày ĐÃ CHẤM THỰC TẾ và có số mới dùng để học được. */
  const lan: LanCham[] = cham
    .filter((c) => c.verdict && Number.isFinite(c.windMax) && Number.isFinite(c.gustMax))
    .map((c) => ({
      ngay: c.date,
      ket: c.verdict!,
      gioMax: Number(c.windMax),
      giatMax: Number(c.gustMax),
      muaTong: Number(c.rainTotal ?? 0),
      duBaoChu: c.forecast,
      mayCham: c.machineVerdict,
      ghiChu: c.note || c.forecastNote,
    }));

  const giong: Record<string, NgayGiong[]> = {};
  /**
   * Cần ÍT NHẤT 5 ngày trong kho mới đi tìm ngày giống: với hai ba ngày thì
   * "ngày giống nhất" chỉ là ngày duy nhất có sẵn, nói ra thành ra đánh lừa.
   */
  if (lan.length >= 5) {
    for (const n of ngaySapToi) giong[n.ngay] = ngayGiongNhau(n, lan);
  }

  return { cham, hoc: hocNguong(lan), chinhXac: doChinhXac(lan), giong };
}
