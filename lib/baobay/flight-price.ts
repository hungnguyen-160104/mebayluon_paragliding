// lib/baobay/flight-price.ts

/**
 * Bảng giá dùng cho BOOKING nội bộ (/baocao) — nguồn duy nhất, dùng chung cho
 * cả trình duyệt (điền sẵn đơn giá) và máy chủ (tính lại tổng tiền khi lưu).
 *
 * Giá bay theo NGÀY BAY, không theo ngày đặt: rơi vào thứ Bảy, Chủ nhật hay
 * ngày lễ thì lên giá cao. Tết âm lịch và Giỗ tổ Hùng Vương phải quy đổi âm
 * lịch nên có bộ chuyển đổi ở cuối tệp — không dùng bảng cứng từng năm vì sang
 * năm là sai, mà chẳng ai nhớ để sửa.
 */

export type FlightKind = "pg" | "ppg" | "m650" | "m850";

export const FLIGHT_KIND_LABEL: Record<FlightKind, string> = {
  pg: "PG — dù lượn",
  ppg: "PPG — dù lượn có động cơ",
  m650: "Điểm xuất phát 650m",
  m850: "Điểm xuất phát 850m",
};

/** Chữ ngắn hiện trên nút, trong phiếu ảnh và cột sheet. */
export const FLIGHT_KIND_SHORT: Record<FlightKind, string> = {
  pg: "PG",
  ppg: "PPG",
  m650: "650m",
  m850: "850m",
};

/**
 * Loại hình bay tuỳ ĐIỂM BAY: Khau Phạ (và Sa Pa) chọn PG hay PPG, còn Hà Nội
 * không có PPG mà chọn theo độ cao điểm xuất phát — 650m hoặc 850m.
 */
export function flightKindsOf(spot: string): FlightKind[] {
  return spot === "ha-noi" ? ["m650", "m850"] : ["pg", "ppg"];
}

export function defaultFlightKind(spot: string): FlightKind {
  return flightKindsOf(spot)[0];
}

/** Đơn giá một khách theo ngày: [ngày thường, cuối tuần & lễ]. */
export const FLIGHT_PRICE: Record<"pg" | "ppg", { weekday: number; peak: number }> = {
  pg: { weekday: 2_190_000, peak: 2_590_000 },
  ppg: { weekday: 2_390_000, peak: 2_590_000 },
};

/** Hà Nội ĐỒNG GIÁ mọi ngày, không phân biệt lễ hay cuối tuần. */
export const FLAT_PRICE: Partial<Record<FlightKind, number>> = {
  m650: 1_790_000,
  m850: 2_090_000,
};

/** Xe chuyên dụng lên núi — Hà Nội, tính theo đầu khách. */
export const MOUNTAIN_CAR_PRICE = 150_000;

/**
 * CHIẾT KHẤU trả đại lý / hướng dẫn viên: 150k một khách.
 *
 * Đây là khoản TRẢ NGOÀI — không nằm trong tổng tiền khách trả, không lên phiếu
 * gửi khách. Máy chỉ điền sẵn số mặc định, người chi sửa được vì mỗi đại lý một
 * mức thoả thuận.
 */
export const COMMISSION_PER_GUEST = 150_000;

/** Đơn giá dịch vụ tuỳ chọn, tính theo từng suất khách. */
export const SERVICE_PRICE = {
  flycam: 400_000,
  video360: 400_000,
  redFlag: 100_000,
  flagFlight: 100_000,
  sunset: 700_000,
} as const;

export const SERVICE_PRICE_LABEL: Array<{ key: keyof typeof SERVICE_PRICE; label: string }> = [
  { key: "flycam", label: "Flycam" },
  { key: "video360", label: "Camera 360" },
  { key: "redFlag", label: "Dù cờ đỏ" },
  { key: "flagFlight", label: "Bay kéo cờ/bánh" },
  { key: "sunset", label: "Bay hoàng hôn/săn mây" },
];

/* ================================================================== */
/* Ngày cao điểm: cuối tuần + lễ                                       */
/* ================================================================== */

/** Lễ theo LỊCH DƯƠNG, lặp lại hằng năm — ghi dạng "MM-DD". */
const SOLAR_HOLIDAYS = new Set([
  "01-01", // Tết dương lịch
  "12-31", // nghỉ Tết dương lịch từ đêm 31/12
  "04-30", // Giải phóng miền Nam
  "05-01", // Quốc tế lao động
]);

/** Đợt nghỉ dài theo lịch dương, lặp hằng năm: [từ MM-DD, đến MM-DD]. */
const SOLAR_HOLIDAY_RANGES: ReadonlyArray<readonly [string, string]> = [
  ["08-29", "09-02"], // Quốc khánh: 29–31/8 và 1–2/9
];

/** Ngày bay có ăn giá cao (cuối tuần hoặc lễ) hay không. `date` dạng YYYY-MM-DD. */
export function isPeakDay(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  // Thứ trong tuần: dựng Date ở giữa trưa UTC để không lệch ngày vì múi giờ
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  if (wd === 0 || wd === 6) return true;

  const mmdd = date.slice(5);
  if (SOLAR_HOLIDAYS.has(mmdd)) return true;
  for (const [from, to] of SOLAR_HOLIDAY_RANGES) {
    if (mmdd >= from && mmdd <= to) return true;
  }

  const lunar = solarToLunar(y, m, d);
  // Tết âm lịch: 28/12 âm năm cũ → 5/1 âm năm mới
  if (lunar.month === 12 && lunar.day >= 28) return true;
  if (lunar.month === 1 && lunar.day <= 5) return true;
  // Giỗ tổ Hùng Vương 10/3 âm lịch
  if (lunar.month === 3 && lunar.day === 10 && !lunar.leap) return true;

  return false;
}

/** Vì sao ngày này giá cao — hiện cho người nhập biết, khỏi thắc mắc. */
export function peakDayReason(date: string): string {
  if (!isPeakDay(date)) return "ngày thường (T2–T6)";
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  if (wd === 6) return "thứ Bảy";
  if (wd === 0) return "Chủ nhật";
  return "ngày lễ";
}

/** Đơn giá một khách theo loại hình bay và ngày bay. */
export function flightUnitPrice(kind: FlightKind, date: string): number {
  const flat = FLAT_PRICE[kind];
  if (flat) return flat;
  const table = FLIGHT_PRICE[kind === "ppg" ? "ppg" : "pg"];
  return isPeakDay(date) ? table.peak : table.weekday;
}

/** Câu giải thích đơn giá đang áp: đồng giá, hay theo ngày thường/lễ. */
export function priceNote(kind: FlightKind, date: string): string {
  if (FLAT_PRICE[kind]) return "đồng giá mọi ngày";
  return peakDayReason(date);
}

/** Tiền dịch vụ tuỳ chọn của cả nhóm. */
export function servicesAmount(s: {
  flycam?: number;
  video360?: number;
  redFlag?: number;
  flagFlight?: number;
  sunset?: number;
}): number {
  return (
    (s.flycam || 0) * SERVICE_PRICE.flycam +
    (s.video360 || 0) * SERVICE_PRICE.video360 +
    (s.redFlag || 0) * SERVICE_PRICE.redFlag +
    (s.flagFlight || 0) * SERVICE_PRICE.flagFlight +
    (s.sunset || 0) * SERVICE_PRICE.sunset
  );
}

/**
 * COMBO flycam + camera 360: khách lấy CẢ HAI thì mỗi cặp bớt 100k.
 * Số cặp = min(flycam, 360) — 3 flycam + 2 cam360 là 2 cặp, bớt 200k.
 */
export const COMBO_DISCOUNT = 100_000;

export function comboDiscount(flycam?: number, video360?: number): number {
  return Math.min(flycam || 0, video360 || 0) * COMBO_DISCOUNT;
}

export type BookingMoneyInput = {
  unitPrice?: number;
  /** Số suất xe lên núi (Hà Nội) — 150k một khách. */
  mountainCar?: number;
  guestCount?: number;
  /**
   * Số khách bay PPG trong nhóm (Khau Phạ cho đặt PG + PPG chung một booking).
   * Phần này tính theo `ppgUnitPrice`; số còn lại (guestCount − ppgGuests) theo
   * `unitPrice`. Không khai thì cả nhóm cùng một giá như cũ.
   */
  ppgGuests?: number;
  ppgUnitPrice?: number;
  flycam?: number;
  video360?: number;
  redFlag?: number;
  flagFlight?: number;
  sunset?: number;
  pickupFee?: number;
  discount?: number;
  /** Tiền giảm combo đã CHỐT TAY — không khai thì máy tự tính min(flycam,360)×100k. */
  comboDiscount?: number;
};

/**
 * Tổng tiền chốt với khách:
 *      đơn giá × khách PG  +  giá PPG × khách PPG  +  tiền dịch vụ  +  phí đưa đón
 *      −  giảm combo (flycam+360)  −  giảm trừ gõ tay
 */
export function bookingTotal(input: BookingMoneyInput): number {
  const ppg = Math.min(input.ppgGuests || 0, input.guestCount || 0);
  const base =
    (input.unitPrice || 0) * ((input.guestCount || 0) - ppg) + (input.ppgUnitPrice || 0) * ppg;
  const car = (input.mountainCar || 0) * MOUNTAIN_CAR_PRICE;
  return Math.max(
    0,
    base +
      servicesAmount(input) +
      car +
      (input.pickupFee || 0) -
      (input.comboDiscount ?? comboDiscount(input.flycam, input.video360)) -
      (input.discount || 0),
  );
}

/* ================================================================== */
/* Đổi dương lịch sang âm lịch (thuật toán Hồ Ngọc Đức, múi giờ +7)     */
/* ================================================================== */

const TZ = 7;

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

/** Ngày (số Julius) của kỳ sóc thứ k tính từ 1/1/1900. */
function newMoonDay(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(dr * 2 * Mpr) -
    0.0004 * Math.sin(dr * 3 * Mpr) +
    0.0104 * Math.sin(dr * 2 * F) -
    0.0051 * Math.sin(dr * (M + Mpr)) -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M)) -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr)) +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltat;
  return Math.floor(JdNew + 0.5 + TZ / 24);
}

/** Kinh độ Mặt Trời (0–11, mỗi đơn vị 30°) của một ngày Julius. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0 - 0.5 - TZ / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

/** Ngày Julius của mồng 1 tháng 11 âm lịch năm dương yy. */
function lunarMonth11(yy: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = newMoonDay(k);
  const sunLong = sunLongitude(nm);
  if (sunLong >= 9) nm = newMoonDay(k - 1);
  return nm;
}

/** Vị trí tháng nhuận so với tháng 11 âm lịch. */
function leapMonthOffset(a11: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = sunLongitude(newMoonDay(k + i));
  do {
    last = arc;
    i += 1;
    arc = sunLongitude(newMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

export type LunarDate = { day: number; month: number; year: number; leap: boolean };

/** Đổi một ngày dương lịch sang âm lịch Việt Nam (múi giờ +7). */
export function solarToLunar(yy: number, mm: number, dd: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);

  let a11 = lunarMonth11(yy);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11);
    let leapDiff = leapOff - 2;
    if (leapDiff < 0) leapDiff += 12;
    if (diff >= leapOff) lunarMonth = diff + 10;
    if (diff === leapOff) lunarLeap = true;
    void leapDiff;
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
}
