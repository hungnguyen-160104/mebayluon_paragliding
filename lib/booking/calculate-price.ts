/**
 * KHÔNG đánh dấu "use client" ở đây.
 *
 * File này chỉ có dữ liệu cấu hình điểm bay và hàm tính giá thuần — không
 * hook, không API trình duyệt — nên chạy được cả hai phía. Khi còn "use
 * client", mọi module phía máy chủ nhập LOCATIONS chỉ nhận được một tham
 * chiếu rỗng: email nội bộ tra tên dịch vụ theo khoá luôn ra chuỗi rỗng, và
 * đơn của khách Pháp về tới hộp thư nội bộ vẫn nguyên tiếng Pháp — chạy thử
 * bằng node thì lại đúng, vì node không có ranh giới client/server.
 */

import type { LangCode } from "./translations-booking";

export type LocationKey =
  | "sapa"
  | "khau_pha"
  | "da_nang"
  | "ha_noi"
  | "quan_ba";

export type AddonKey = "pickup" | "flycam" | "camera360";
export type FlightTypeKey = "paragliding" | "paramotor";
export type PackageKey =
  | "khau_pha_pkg_1"
  | "khau_pha_pkg_2"
  // Paramotor Khau Phạ tách 2 gói theo ngày bay (giống dù không động cơ):
  // pkg_1 = T2–T6 (2.390.000đ), pkg_2 = T7–CN & Lễ (2.590.000đ), đều giảm
  // từ giá gốc 2.690.000đ.
  | "khau_pha_paramotor_pkg_1"
  | "khau_pha_paramotor_pkg_2"
  // Key cũ (đồng giá 2.390.000đ) — giữ để booking cũ trong DB còn hiển thị
  // đúng nhãn/giá; KHÔNG còn cho khách chọn mới.
  | "khau_pha_paramotor"
  | "ha_noi_850m"
  | "ha_noi_650m"
  // Quản Bạ (Hà Giang, mở 15/10/2026): PG 2.290.000đ đã gồm đón trả 2 chiều;
  // PPG gói cơ bản 15' 2.490.000đ; PPG bay lâu 25' săn mây bình minh/hoàng hôn
  // 3.390.000đ (= cơ bản + 900.000đ).
  | "quan_ba_pg"
  | "quan_ba_ppg_15"
  | "quan_ba_ppg_25";

export type HolidayType = "weekday" | "weekend" | "holiday";

export type AddonConfig = {
  label: Record<LangCode, string>;
  pricePerPersonVND: number | null;
  pricePerPersonUSD: number | null;
};

export type DynamicServiceConfig = {
  key: string;
  label: Record<LangCode, string>;
  description?: Partial<Record<LangCode, string>>;
  note?: Partial<Record<LangCode, string>>;
  controlType?: "checkbox" | "radio" | "counter";
  defaultSelected?: boolean;
  priceVND?: number | null;
  priceUSD?: number | null;
  requiresPickupInput?: boolean;
  fixedMapUrl?: string;
  warningWhenUnchecked?: string;
  exclusiveGroup?: string;
  visibleForPackages?: PackageKey[];
  visibleForFlightTypes?: FlightTypeKey[];
};

export type FlightTypePriceConfig = {
  key: FlightTypeKey;
  label: Record<LangCode, string>;
  weekday?: number;
  weekend?: number;
  holiday?: number;
  fixed?: number;
  /** Giá USD cố định của loại bay này (getBasePriceUSD đọc); thiếu thì lấy priceUSD của gói. */
  fixedUSD?: number;
};

export type PackageConfig = {
  key: PackageKey;
  label: Record<LangCode, string>;
  subtitle?: Partial<Record<LangCode, string>>;
  priceVND?: number;
  priceUSD?: number;
  flightTypes: FlightTypePriceConfig[];
  included?: Record<LangCode, string[]>;
  excluded?: Record<LangCode, string[]>;
};

export type LocationConfig = {
  key: LocationKey;
  name: Record<LangCode, string>;

  basePriceVND: (dateISO?: string) => number;
  basePriceUSD: (dateISO?: string) => number;

  addons: Partial<Record<AddonKey, AddonConfig>>;
  included: Record<LangCode, string[]>;
  excluded?: Record<LangCode, string[]>;
  coordinates?: {
    takeoff?: string;
    landing?: string;
    pickup?: string;
  };

  packages?: PackageConfig[];
  services?: DynamicServiceConfig[];
};

const USD_FALLBACK_RATE = 25_000;
export const BIGC_THANG_LONG_MAP =
  "https://maps.app.goo.gl/3vB2qYuThwBASQZj8";

function toUSDfromVND(vnd: number): number {
  return Math.round(vnd / USD_FALLBACK_RATE);
}
export const vndToUsd = toUSDfromVND;

export function isWeekend(dateISO?: string): boolean {
  if (!dateISO) return false;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return false;
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

function toYMD(dateISO?: string): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Các đợt nghỉ lễ DÀI NGÀY theo lịch nghỉ chính thức: mọi ngày nằm trong
 * khoảng (tính cả hai đầu) đều ăn giá cuối tuần & lễ, kể cả ngày giữa tuần.
 *
 * Ngày ghi dạng YYYY-MM-DD nên so sánh chuỗi là đủ, không cần dựng Date.
 * Thêm đợt nghỉ mới thì chỉ cần thêm một dòng vào đây.
 */
const HOLIDAY_RANGES: ReadonlyArray<readonly [string, string]> = [
  // Quốc khánh 2/9/2026 — nghỉ 5 ngày, từ thứ Bảy 29/8 đến thứ Tư 2/9.
  ["2026-08-29", "2026-09-02"],
];

function isVietnamMajorHoliday(dateISO?: string): boolean {
  const ymd = toYMD(dateISO);
  if (!ymd) return false;

  for (const [from, to] of HOLIDAY_RANGES) {
    if (ymd >= from && ymd <= to) return true;
  }

  const mmdd = ymd.slice(5);

  if (mmdd === "01-01") return true;
  if (mmdd === "04-30") return true;
  if (mmdd === "05-01") return true;
  if (mmdd === "09-02") return true;

  const mappedByYear = new Set<string>(["2026-04-27"]);
  return mappedByYear.has(ymd);
}

export function getHolidayType(dateISO?: string): HolidayType {
  if (isVietnamMajorHoliday(dateISO)) return "holiday";
  if (isWeekend(dateISO)) return "weekend";
  return "weekday";
}

function getKhauPhaPackageBasePriceVND(
  packageKey?: string,
  flightTypeKey?: string,
  dateISO?: string,
): number {
  const holidayType = getHolidayType(dateISO);
  // Khách chọn gói ở bước 1 nhưng mãi bước 2 mới nhập ngày bay, nên rất dễ
  // chọn gói "Thứ 2 - Thứ 6" rồi lại đặt vào Chủ nhật hoặc ngày lễ. Ngày bay
  // mới là căn cứ tính tiền: rơi vào cuối tuần hay lễ thì tự lên giá lễ.
  const isPeakDay = holidayType !== "weekday";

  if (
    flightTypeKey === "paramotor" ||
    packageKey === "khau_pha_paramotor" ||
    packageKey === "khau_pha_paramotor_pkg_1" ||
    packageKey === "khau_pha_paramotor_pkg_2"
  ) {
    // Booking cũ (key đồng giá) giữ nguyên 2.390.000đ như lúc khách đặt.
    if (packageKey === "khau_pha_paramotor") return 2_390_000;
    if (packageKey === "khau_pha_paramotor_pkg_2") return 2_590_000;
    return isPeakDay ? 2_590_000 : 2_390_000;
  }

  if (packageKey === "khau_pha_pkg_2") {
    return 2_590_000;
  }

  return isPeakDay ? 2_590_000 : 2_190_000;
}

function getKhauPhaPackageBasePriceUSD(
  packageKey?: string,
  flightTypeKey?: string,
  dateISO?: string,
): number {
  // Cùng quy tắc với bản VND ở trên: ngày bay quyết định giá.
  const isPeakDay = getHolidayType(dateISO) !== "weekday";

  if (
    flightTypeKey === "paramotor" ||
    packageKey === "khau_pha_paramotor" ||
    packageKey === "khau_pha_paramotor_pkg_1" ||
    packageKey === "khau_pha_paramotor_pkg_2"
  ) {
    if (packageKey === "khau_pha_paramotor") return 93;
    if (packageKey === "khau_pha_paramotor_pkg_2") return 97;
    return isPeakDay ? 97 : 93;
  }

  if (packageKey === "khau_pha_pkg_2") {
    return 97;
  }

  return isPeakDay ? 97 : 82;
}

/**
 * Giá gói ĐÚNG NHƯ KHÁCH THẤY Ở BƯỚC 1, tức là bỏ qua ngày bay.
 *
 * Khách chọn gói ở bước 1 rồi mới nhập ngày bay ở bước 2, nên nếu ngày rơi
 * vào cuối tuần hay lễ thì số tiền thật cao hơn con số đã báo. Thay vì lặng
 * lẽ đổi giá, bước 4 tách phần chênh ra thành một dòng "phụ thu ngày lễ &
 * cuối tuần" để khách hiểu vì sao 2.190.000đ thành 2.590.000đ.
 *
 * Không chọn gói thì lấy giá ngày thường làm mốc — đó cũng là con số hiện
 * trên thẻ điểm bay ở bước 1.
 */
function getKhauPhaQuotedBaseVND(
  packageKey?: string,
  flightTypeKey?: string,
): number {
  if (packageKey === "khau_pha_pkg_2") return 2_590_000;
  if (packageKey === "khau_pha_paramotor_pkg_2") return 2_590_000;
  if (packageKey === "khau_pha_paramotor") return 2_390_000;
  if (
    flightTypeKey === "paramotor" ||
    packageKey === "khau_pha_paramotor_pkg_1"
  ) {
    return 2_390_000;
  }
  return 2_190_000;
}

function getKhauPhaQuotedBaseUSD(
  packageKey?: string,
  flightTypeKey?: string,
): number {
  if (packageKey === "khau_pha_pkg_2") return 97;
  if (packageKey === "khau_pha_paramotor_pkg_2") return 97;
  if (packageKey === "khau_pha_paramotor") return 93;
  if (
    flightTypeKey === "paramotor" ||
    packageKey === "khau_pha_paramotor_pkg_1"
  ) {
    return 93;
  }
  return 82;
}

/**
 * Nội dung bao gồm của gói paramotor Khau Phạ — dùng chung cho cả 2 gói ngày
 * (T2–T6 và T7–CN & Lễ) để không phải duy trì 2 bản sao.
 */
const KHAU_PHA_PARAMOTOR_INCLUDED = {
  vi: [
    "01 chuyến bay từ 10–20 phút (tuỳ chọn)",
    "Ảnh & video bằng GoPro",
    "Trà & cà phê tại điểm bay",
    "Bảo hiểm dù lượn",
    "Giấy chứng nhận",
  ],
  en: [
    "One flight 10–20 minutes (option)",
    "GoPro photos & video",
    "Coffee & tea at flight site",
    "Paragliding insurance",
    "Certificate",
  ],
  fr: [
    "Un vol de 10 à 20 minutes (au choix)",
    "Photos & vidéo GoPro",
    "Café et thé sur le lieu du vol",
    "Assurance parapente",
    "Certificat",
  ],
  ru: [
    "Один полет от 10 до 20 минут (по выбору)",
    "Фото и видео GoPro",
    "Кофе и чай на месте старта",
    "Страховка парапланериста",
    "Сертификат",
  ],
  zh: [
    "1 次飞行 10-20 分钟（可选）",
    "GoPro 照片与视频",
    "飞行点提供咖啡和茶",
    "滑翔伞保险",
    "证书",
  ],
  hi: [
    "10-20 मिनट से 01 उड़ान (वैकल्पिक)",
    "GoPro फ़ोटो व वीडियो",
    "उड़ान स्थल पर चाय और कॉफ़ी",
    "पैराग्लाइडिंग बीमा",
    "प्रमाणपत्र",
  ],
};

const KHAU_PHA_PARAMOTOR_FLIGHT_LABEL = {
  vi: "Bay dù gắn động cơ",
  en: "Paramotor",
  fr: "Paramoteur",
  ru: "Парамотор",
  zh: "动力伞",
  hi: "पैरामोटर",
};

/**
 * XE ĐÓN/TRẢ TẠI KHÁCH SẠN — ĐIỂM BAY HÀ NỘI (luật chủ 11/09).
 *
 * Trước đây web và app để hai giá khác nhau cho CÙNG một dịch vụ (web tính
 * theo đầu người, app điền sẵn một số cố định) nên cùng một đoàn khách ra hai
 * con số — quầy thu một đằng, phiếu web một nẻo. Nay một hàm duy nhất, mọi
 * nơi gọi vào đây: trang khách, phiếu đặt, bản xem lại, bộ đồng bộ web→app và
 * ô "Phí đón" trong app.
 *
 * Giá theo ĐOÀN, không nhân đầu người: 1 khách 1.000.000đ, mỗi khách thêm cộng
 * 100.000đ — 2 khách 1.100.000đ, 3 khách 1.200.000đ, 4 khách 1.300.000đ…
 * (một chuyến xe chạy cùng quãng đường, thêm người chỉ thêm chỗ ngồi).
 */
export const DON_KHACH_SAN_HA_NOI_VND = 1_000_000;
export const DON_KHACH_SAN_HA_NOI_USD = 40;
const DON_KHACH_SAN_THEM_VND = 100_000;
const DON_KHACH_SAN_THEM_USD = 4;

export function giaDonKhachSanHaNoi(soKhach: number, tienTe: "VND" | "USD" = "VND"): number {
  const them = Math.max(0, Math.ceil(soKhach) - 1);
  return tienTe === "USD"
    ? DON_KHACH_SAN_HA_NOI_USD + them * DON_KHACH_SAN_THEM_USD
    : DON_KHACH_SAN_HA_NOI_VND + them * DON_KHACH_SAN_THEM_VND;
}

export const LOCATIONS: Record<LocationKey, LocationConfig> = {
  sapa: {
    key: "sapa",
    name: {
      vi: "SAPA",
      en: "SAPA",
      fr: "SAPA",
      ru: "SAPA",
      zh: "SAPA",
      hi: "SAPA",
    },
    // 2.190.000đ đã BAO GỒM xe đón trả khách sạn (không tách phí xe riêng)
    basePriceVND: () => 2_190_000,
    basePriceUSD: () => 82,
    services: [
      {
        key: "sapa_hotel_pickup",
        label: {
          vi: "Đón trả 2 chiều từ khách sạn (trung tâm Sapa, Tả Van, Lao Chải)",
          en: "Round-trip hotel pickup (Sapa Center, Ta Van, Lao Chai)",
          fr: "Prise en charge aller-retour à l’hôtel (centre de Sapa, Ta Van, Lao Chai)",
          ru: "Трансфер туда-обратно от отеля (центр Сапы, Та Ван, Лао Чай)",
          zh: "酒店往返接送（沙坝中心、塔万、老柴）",
          hi: "राउंड-ट्रिप होटल पिकअप (सापा सेंटर, ता वान, लाओ चाई)",
        },
        description: {
          vi: "Xe đón/trả 2 chiều từ khách sạn trong khu vực trung tâm Sapa, Tả Van, Lao Chải.",
          en: "Round-trip hotel pickup and drop-off within Sapa Center, Ta Van, and Lao Chai areas.",
          fr: "Prise en charge et retour à l’hôtel dans les zones du centre de Sapa, Ta Van et Lao Chai.",
          ru: "Трансфер туда-обратно от отеля в районах центра Сапы, Та Ван и Лао Чай.",
          zh: "在沙坝市中心、塔凡和老寨区域内提供酒店往返接送。",
          hi: "सापा सेंटर, ता वान और लाओ चाई क्षेत्रों में होटल से राउंड-ट्रिप पिकअप और ड्रॉप-ऑफ।",
        },
        // Đã gộp vào giá vé 2.190.000đ — dịch vụ miễn phí, tích sẵn,
        // giữ lại để khách nhập địa chỉ khách sạn cần đón.
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 0,
        priceUSD: 0,
      },
    ],
    addons: {
      pickup: {
        label: {
          vi: "Đón trả 2 chiều từ khách sạn (trung tâm Sapa, Tả Van, Lao Chải)",
          en: "Round-trip hotel pickup (Sapa Center, Ta Van, Lao Chai)",
          fr: "Prise en charge aller-retour à l’hôtel (centre de Sapa, Ta Van, Lao Chai)",
          ru: "Трансфер туда-обратно от отеля (центр Сапы, Та Ван, Лао Чай)",
          zh: "酒店往返接送（沙坝中心、塔万、老柴）",
          hi: "राउंड-ट्रिप होटल पिकअप (सापा सेंटर, ता वान, लाओ चाई)",
        },
        pricePerPersonVND: 100_000,
        pricePerPersonUSD: 4,
      },
      flycam: {
        label: {
          vi: "Flycam (Drone camera)",
          en: "Flycam (Drone camera)",
          fr: "Flycam (drone)",
          ru: "Flycam (дрон)",
          zh: "航拍（无人机）",
          hi: "फ्लाईकैम (ड्रोन कैमरा)",
        },
        pricePerPersonVND: 300_000,
        pricePerPersonUSD: 12,
      },
      camera360: {
        label: {
          vi: "Camera toàn cảnh 360",
          en: "360° camera",
          fr: "Caméra 360°",
          ru: "Камера 360°",
          zh: "360°全景相机",
          hi: "360° कैमरा",
        },
        pricePerPersonVND: 500_000,
        pricePerPersonUSD: 20,
      },
    },
    included: {
      vi: [
        "01 chuyến bay dù lượn 8–15 phút (tuỳ gió)",
        "Ảnh & video bằng GoPro",
        "Nước uống tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather-dependent)",
        "GoPro photos & video",
        "Drinking water at flight site",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Photos et vidéos GoPro",
        "Eau potable sur le site de vol",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "Один полёт на параплане 8–15 минут (в зависимости от ветра)",
        "Фото и видео GoPro",
        "Питьевая вода на месте полёта",
        "Страховка",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 照片和视频",
        "飞行点饮用水",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "एक पैराग्लाइडिंग उड़ान 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फोटो और वीडियो",
        "उड़ान स्थल पर पीने का पानी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
      ],
    },
    excluded: { vi: [], en: [], fr: [], ru: [], zh: [], hi: [] },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/bGtKFTuxyZvJhsJZ9",
      landing: "https://maps.app.goo.gl/mYnh4KJVk3aQZLYC6",
    },
  },

  khau_pha: {
    key: "khau_pha",
    name: {
      vi: "ĐÈO KHAU PHẠ",
      en: "KHAU PHA PASS",
      fr: "COL DE KHAU PHA",
      ru: "ПЕРЕВАЛ КХАУ ФА",
      zh: "考帕山口",
      hi: "खाउ फ़ा दर्रा",
    },
    basePriceVND: (dateISO) =>
      getHolidayType(dateISO) === "weekday" ? 2_190_000 : 2_590_000,
    basePriceUSD: (dateISO) =>
      getHolidayType(dateISO) === "weekday" ? 82 : 97,
    packages: [
      {
        key: "khau_pha_pkg_1",
        label: {
          vi: "Ngày bay từ Thứ 2 - Thứ 6",
          en: "Flights from Monday to Friday",
          fr: "Vols du lundi au vendredi",
          ru: "Полёты с понедельника по пятницу",
          zh: "周一至周五飞行",
          hi: "सोमवार से शुक्रवार उड़ान",
        },
        priceVND: 2_190_000,
        priceUSD: 82,
        flightTypes: [
          {
            key: "paragliding",
            label: {
              vi: "Bay dù không động cơ",
              en: "Paragliding",
              fr: "Parapente",
              ru: "Параплан",
              zh: "无动力滑翔伞",
              hi: "पैराग्लाइडिंग",
            },
            fixed: 2_190_000,
          },
        ],
      },
      {
        key: "khau_pha_pkg_2",
        label: {
          vi: "Ngày bay Thứ 7 - CN & Lễ",
          en: "Flights on Sat, Sun & Holidays",
          fr: "Vols samedi, dimanche et jours fériés",
          ru: "Полёты по субботам, воскресеньям и праздникам",
          zh: "周六、周日及节假日飞行",
          hi: "शनिवार, रविवार और अवकाश उड़ान",
        },
        priceVND: 2_590_000,
        priceUSD: 97,
        flightTypes: [
          {
            key: "paragliding",
            label: {
              vi: "Bay dù không động cơ",
              en: "Paragliding",
              fr: "Parapente",
              ru: "Параплан",
              zh: "无动力滑翔伞",
              hi: "पैराग्लाइडिंग",
            },
            fixed: 2_590_000,
          },
        ],
      },
      {
        key: "khau_pha_paramotor_pkg_1",
        label: {
          vi: "Ngày bay từ Thứ 2 - Thứ 6",
          en: "Flights from Monday to Friday",
          fr: "Vols du lundi au vendredi",
          ru: "Полёты с понедельника по пятницу",
          zh: "周一至周五飞行",
          hi: "सोमवार से शुक्रवार उड़ान",
        },
        priceVND: 2_390_000,
        priceUSD: 93,
        included: KHAU_PHA_PARAMOTOR_INCLUDED,
        flightTypes: [
          {
            key: "paramotor",
            label: KHAU_PHA_PARAMOTOR_FLIGHT_LABEL,
            fixed: 2_390_000,
          },
        ],
      },
      {
        key: "khau_pha_paramotor_pkg_2",
        label: {
          vi: "Ngày bay Thứ 7 - CN & Lễ",
          en: "Flights on Sat, Sun & Holidays",
          fr: "Vols samedi, dimanche et jours fériés",
          ru: "Полёты по субботам, воскресеньям и праздникам",
          zh: "周六、周日及节假日飞行",
          hi: "शनिवार, रविवार और अवकाश उड़ान",
        },
        priceVND: 2_590_000,
        priceUSD: 97,
        included: KHAU_PHA_PARAMOTOR_INCLUDED,
        flightTypes: [
          {
            key: "paramotor",
            label: KHAU_PHA_PARAMOTOR_FLIGHT_LABEL,
            fixed: 2_590_000,
          },
        ],
      },
    ],
    services: [
      {
        key: "khau_pha_flag",
        label: {
          vi: "Bay dù cờ đỏ sao vàng",
          en: "Flight with the national flag",
          fr: "Vol avec drapeau national",
          ru: "Полёт с национальным флагом",
          zh: "国旗飞行",
          hi: "राष्ट्रीय ध्वज के साथ उड़ान",
        },
        // Counter để chọn đúng số khách bay cùng cờ (checkbox cũ tính cả đoàn)
        controlType: "counter",
        // 100k -> 400k (26/08/2026) -> 300k (11/09/2026), khớp với bảng giá
        // nội bộ ở lib/baobay/flight-price.ts (SPOT_SERVICE_PRICE, khoá
        // "redFlag"). Đổi giá lần sau phải sửa CẢ HAI, không thì khách đặt
        // trên web một giá mà sổ điều hành tính một giá khác.
        priceVND: 300_000,
        priceUSD: 12,
        /**
         * CHỈ DÙ LƯỢN THƯỜNG (PG) — Khau Phạ không có cánh dù cờ đỏ cho loại
         * GẮN ĐỘNG CƠ (PPG), nên bày ra là bán thứ không giao được.
         *
         * Bỏ ở CẢ HAI bộ lọc: trang chọn chuyến xét cả gói lẫn loại hình
         * (điều kiện VÀ, rớt một cái là ẩn), nhưng phiếu vé
         * (components/booking/BookingTicket.tsx) chỉ xét theo GÓI — thiếu vế
         * gói thì vé vẫn in ra dòng cờ đỏ cho khách bay PPG.
         *
         * Có dù cờ đỏ cho PPG rồi thì thêm lại "khau_pha_paramotor*" và
         * "paramotor" vào hai danh sách này.
         */
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2"],
        visibleForFlightTypes: ["paragliding"],
      },
      {
        /**
         * BAY KÉO CỜ — khoá chứa "flag_flight" để bộ đồng bộ web→app đổ vào
         * đúng ô `flagFlight` của sổ (SERVICE_MAP trong
         * services/baobay-web-sync.service.ts bắt /keo_co|flag_flight/ TRƯỚC
         * luật /flag/ chung, nên nó không lẫn sang ô dù cờ đỏ).
         *
         * Khác "Bay dù cờ đỏ sao vàng": cái kia là CÁNH DÙ in cờ (300k, chỉ
         * PG vì không có cánh dù ấy cho loại gắn động cơ); cái này là lá cờ
         * KÉO SAU dù — cờ Tổ quốc hoặc cờ sinh nhật khách mang theo — nên
         * không kén cánh dù, gói nào và loại hình nào cũng bay được.
         */
        key: "khau_pha_flag_flight",
        label: {
          vi: "Bay kéo cờ đỏ / cờ sinh nhật",
          en: "Flight towing a flag (national or birthday)",
          fr: "Vol avec drapeau remorqué (national ou d'anniversaire)",
          ru: "Полёт с буксируемым флагом (государственный или на день рождения)",
          zh: "拖曳旗帜飞行（国旗或生日旗）",
          hi: "झंडा खींचकर उड़ान (राष्ट्रीय या जन्मदिन का झंडा)",
        },
        controlType: "counter",
        priceVND: 150_000,
        priceUSD: 6,
        /**
         * Hiện cùng lứa với flycam/360 — mọi gói và cả hai loại hình. Không
         * khai hai dòng này thì dịch vụ bày ra NGAY KHI khách chưa chọn gói,
         * đứng một mình giữa chỗ trống (đo trên trang thật 11/09).
         */
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },
      {
        key: "khau_pha_paramotor_2000m",
        label: {
          vi: "BAY SĂN MÂY, BAY HOÀNG HÔN, BAY BÌNH MINH (độ cao 2.000m)",
          en: "Cloud Hunting / Sunset / Sunrise Flight (2,000m altitude)",
          fr: "Vol chasse aux nuages / coucher de soleil / lever de soleil (2 000 m)",
          ru: "Полет за облаками / закат / рассвет (высота 2000 м)",
          zh: "云海/日落/日出飞行（2000 米高度）",
          hi: "क्लाउड हंटिंग / सनसेट / सनराइज फ्लाइट (2,000 मीटर ऊंचाई)",
        },
        description: {
          vi: "Bay lên độ cao 2 nghìn mét để ngắm biển mây hoặc đón bình minh/hoàng hôn. Một trải nghiệm độc nhất!",
          en: "Ascend to 2,000m to admire the cloud sea or catch sunrise/sunset. A truly unique experience!",
          fr: "Montez à 2 000 m pour admirer la mer de nuages ou assister au lever/coucher du soleil. Une expérience vraiment unique !",
          ru: "Поднимитесь на 2 000 м, чтобы полюбоваться морем облаков или встретить рассвет либо закат. Поистине уникальные впечатления!",
          zh: "飞升至 2,000 米高空，饱览云海或迎接日出日落。绝无仅有的体验！",
          hi: "बादलों के समुद्र को निहारने या सूर्योदय/सूर्यास्त देखने के लिए 2,000 मीटर की ऊँचाई तक उड़ें। वास्तव में अनोखा अनुभव!",
        },
        // Counter để nhóm khách chọn đúng SỐ NGƯỜI bay 2.000m
        // (checkbox cũ mặc định tính cho cả đoàn).
        controlType: "counter",
        priceVND: 700_000,
        priceUSD: 28,
        visibleForPackages: ["khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paramotor"],
      },
      {
        key: "khau_pha_shuttle",
        label: {
          vi: "Xe trung chuyển xã Tú Lệ (Đón/Trả)",
          en: "Tu Le Commune Shuttle (Pickup/Drop-off)",
          fr: "Navette de la commune de Tu Le (Prise en charge/Dépose)",
          ru: "Трансфер коммуны Ту Ле (Посадка/Высадка)",
          zh: "Tú Lệ 社穿梭巴士（接送）",
          hi: "तू ले कम्यून शटल (पिकअप/ड्रॉप-ऑफ)",
        },
        description: {
          vi: "Xe trung chuyển đón trả khách 2 chiều trong khu vực xã Tú Lệ.",
          en: "Round-trip shuttle pickup for guests within Tu Le area.",
          fr: "Navette aller-retour pour les clients dans la zone de Tu Le.",
          ru: "Трансфер туда-обратно для гостей в районе Ту Ле.",
          zh: "为图勒地区的客人提供往返接送服务。",
          hi: "तू ले क्षेत्र के मेहमानों के लिए राउंड-ट्रिप शटल पिकअप।",
        },
        controlType: "checkbox",
        defaultSelected: true,
        requiresPickupInput: true,
        priceVND: 70_000,
        priceUSD: 3,
        exclusiveGroup: "khau_pha_pickup",
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },
      {
        key: "khau_pha_garrya_pickup",
        label: {
          vi: "Đón từ khu vực Garrya hoặc thị trấn Mù Cang Chải",
          en: "Pickup from Garrya or Mu Cang Chai town",
          fr: "Transfert depuis Garrya ou la ville de Mu Cang Chai",
          ru: "Трансфер из Garrya или города Му Канг Чай",
          zh: "从 Garrya 或木江界镇接送",
          hi: "Garrya या Mu Cang Chai town से पिकअप",
        },
        description: {
          vi: "Nếu đặt 2 chiều vui lòng chọn \"2\".\nKhách có thể chọn đi xe ôm hoặc liên hệ xe Mebayluon đón để tiết kiệm chi phí.",
          en: "For a round trip, please select \"2\".\nGuests may choose a motorbike transfer or contact Mebayluon's shuttle to save costs.",
          fr: "Pour un aller-retour, veuillez sélectionner \"2\".\nLes clients peuvent choisir un transfert en moto ou contacter la navette Mebayluon pour réduire les coûts.",
          ru: "Для поездки туда-обратно выберите \"2\".\nГости могут выбрать трансфер на мотобайке или обратиться к шаттлу Mebayluon, чтобы сэкономить.",
          zh: "如需往返，请选择\"2\"。\n客人可选择摩托车接送，或联系 Mebayluon 班车以节省费用。",
          hi: "राउंड ट्रिप के लिए कृपया \"2\" चुनें।\nमेहमान लागत बचाने के लिए मोटरबाइक ट्रांसफर चुन सकते हैं या Mebayluon शटल से संपर्क कर सकते हैं।",
        },
        controlType: "checkbox",
        requiresPickupInput: true,
        exclusiveGroup: "khau_pha_pickup",
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },
      {
        key: "khau_pha_flycam",
        label: {
          vi: "Flycam (drone camera)",
          en: "Flycam (drone camera)",
          fr: "Flycam (drone)",
          ru: "Flycam (дрон)",
          zh: "航拍（无人机）",
          hi: "फ्लाईकैम (ड्रोन कैमरा)",
        },
        description: {
          vi: "Quay toàn cảnh thung lũng và hành trình bay, video gốc sẽ được gửi ngay sau chuyến bay",
          en: "Panoramic view of the valley and flight journey, original video sent immediately after flight",
          fr: "Vue panoramique de la vallée et du vol, vidéo originale envoyée juste après le vol",
          ru: "Панорамная съёмка долины и всего полёта, исходное видео отправляется сразу после полёта",
          zh: "山谷与飞行全程的全景拍摄，原始视频于飞行后立即发送",
          hi: "घाटी और उड़ान यात्रा का विहंगम दृश्य, मूल वीडियो उड़ान के तुरंत बाद भेजा जाता है",
        },
        controlType: "counter",
        priceVND: 400_000,
        priceUSD: 16,
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },
      {
        key: "khau_pha_camera360",
        label: {
          vi: "360 camera",
          en: "360 camera",
          fr: "Caméra 360",
          ru: "Камера 360",
          zh: "360相机",
          hi: "360 कैमरा",
        },
        description: {
          vi: "Quay toàn cảnh chuyến bay ấn tượng, video được edit và sẽ gửi trong vòng 24h",
          en: "Impressive panoramic flight video, edited and sent within 24h",
          fr: "Vidéo panoramique de vol impressionnante, montée et envoyée sous 24 h",
          ru: "Впечатляющее панорамное видео полёта, смонтированное и отправленное в течение 24 часов",
          zh: "震撼的全景飞行视频，剪辑后 24 小时内发送",
          hi: "प्रभावशाली विहंगम उड़ान वीडियो, एडिट करके 24 घंटे के भीतर भेजा जाता है",
        },
        controlType: "counter",
        priceVND: 400_000,
        priceUSD: 16,
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor", "khau_pha_paramotor_pkg_1", "khau_pha_paramotor_pkg_2"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },

    ],
    addons: {} as Record<string, any>,
    included: {
      vi: [
        "01 chuyến bay dù lượn 8–15 phút (tuỳ gió)",
        "Ảnh & video bằng GoPro",
        "Trà & cà phê tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
        "Xe lên/xuống núi",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather dependent)",
        "GoPro photos & video",
        "Coffee & tea at flight site",
        "Paragliding insurance",
        "Certificate",
        "Mountain shuttle up/down",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Photos & vidéo GoPro",
        "Café et thé sur le lieu du vol",
        "Assurance parapente",
        "Certificat",
        "Navette montée/descente",
      ],
      ru: [
        "Один полет на параплане 8–15 минут (по погоде)",
        "Фото и видео GoPro",
        "Кофе и чай на месте старта",
        "Страховка парапланериста",
        "Сертификат",
        "Трансфер вверх/вниз по горе",
      ],
      zh: [
        "一次滑翔伞飞行 8 - 15 分钟（视风况而定）",
        "GoPro 照片与视频",
        "飞行点提供咖啡和茶",
        "滑翔伞保险",
        "证书",
        "上下山接送车",
      ],
      hi: [
        "1 पैराग्लाइडिंग उड़ान 8-15 मिनट (मौसम पर निर्भर)",
        "GoPro फ़ोटो व वीडियो",
        "उड़ान स्थल पर चाय और कॉफ़ी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
        "पहाड़ ऊपर/नीचे शटल",
      ],
    },
    excluded: { vi: [], en: [], fr: [], ru: [], zh: [], hi: [] },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/Z9X6BnNV4eaUKTE29",
      landing: "https://maps.app.goo.gl/QJWD6Em4b9RYYQMc8",
    },
  },

  da_nang: {
    key: "da_nang",
    name: {
      vi: "ĐÀ NẴNG",
      en: "DA NANG",
      fr: "DA NANG",
      ru: "ДАНАНГ",
      zh: "岘港",
      hi: "दा नांग",
    },
    basePriceVND: () => 2_190_000,
    basePriceUSD: () => 82,
    services: [
      {
        key: "da_nang_mountain_shuttle",
        label: {
          vi: "Xe di chuyển lên đỉnh Sơn Trà",
          en: "Transfer to Son Tra Peak",
          fr: "Transfert au sommet de Son Tra",
          ru: "Трансфер на вершину Шонча",
          zh: "前往山茶山顶接送",
          hi: "Son Tra पीक के लिए ट्रांसफर",
        },
        description: {
          vi: "Xe trung chuyển lên núi đón từ bãi hạ cánh tại bờ biển lên bãi cất cánh đỉnh núi Sơn Trà",
          en: "Shuttle bus from the landing zone at the beach to the takeoff point at Son Tra Peak",
          fr: "Navette depuis la zone d'atterrissage sur la plage jusqu'au point de décollage au sommet de Son Tra",
          ru: "Трансфер от зоны посадки на пляже до точки взлета на вершине Шонча",
          zh: "从海滩降落区前往山茶山顶起飞点的接驳车",
          hi: "समुद्र तट पर लैंडिंग क्षेत्र से Son Tra पीक पर टेकऑफ पॉइंट तक शटल बस",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 100_000,
        priceUSD: 4,
        warningWhenUnchecked: "_USE_LOCALE_WARNING_",
      },
      {
        key: "da_nang_hotel_pickup",
        label: {
          vi: "Xe đón/trả 2 chiều từ khách sạn",
          en: "Round-trip hotel pickup",
          fr: "Prise en charge aller-retour à l’hôtel",
          ru: "Трансфер туда-обратно от отеля",
          zh: "酒店往返接送",
          hi: "राउंड-ट्रिप होटल पिकअप",
        },
        description: {
          vi: "Chi phí đón có thể thay đổi tùy vị trí khách sạn và số lượng khách",
          en: "Pickup cost may vary depending on hotel location and number of guests",
          fr: "Le coût de prise en charge peut varier selon l'emplacement de l'hôtel et le nombre de clients",
          ru: "Стоимость трансфера может варьироваться в зависимости от расположения отеля и количества гостей",
          zh: "接送费用可能会因酒店位置和客人数量而异",
          hi: "होटल के स्थान और मेहमानों की संख्या के आधार पर पिकअप लागत भिन्न हो सकती है",
        },
        controlType: "checkbox",
        priceVND: 200_000,
        priceUSD: 8,
        requiresPickupInput: true,
      },
    ],
    addons: {
      flycam: {
        label: {
          vi: "Flycam (Drone camera)",
          en: "Flycam (Drone camera)",
          fr: "Flycam (drone)",
          ru: "Flycam (дрон)",
          zh: "航拍（无人机）",
          hi: "फ्लाईकैम (ड्रोन कैमरा)",
        },
        pricePerPersonVND: 500_000,
        pricePerPersonUSD: 20,
      },
      camera360: {
        label: {
          vi: "Camera toàn cảnh 360",
          en: "360° camera",
          fr: "Caméra 360°",
          ru: "Камера 360°",
          zh: "360°全景相机",
          hi: "360° कैमरा",
        },
        pricePerPersonVND: 500_000,
        pricePerPersonUSD: 20,
      },
      pickup: {
        label: {
          vi: "Đưa đón trung tâm thành phố",
          en: "City center pickup",
          fr: "Transfert depuis le centre-ville",
          ru: "Трансфер из центра города",
          zh: "市中心接送",
          hi: "सिटी सेंटर पिकअप",
        },
        pricePerPersonVND: 200_000,
        pricePerPersonUSD: 8,
      },
    },
    included: {
      vi: [
        "01 chuyến bay dù lượn 8–15 phút (tuỳ gió)",
        "Ảnh & video bằng GoPro",
        "Nước uống",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather dependent)",
        "GoPro photos & video",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Photos & vidéo GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "Один полет на параплане 8–15 минут (по погоде)",
        "Фото и видео GoPro",
        "Питьевая вода",
        "Страховка парапланериста",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 照片与视频",
        "饮用水",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "एक पैराग्लाइडिंग उड़ान 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फ़ोटो व वीडियो",
        "पिने का पानी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
      ],
    },
    excluded: { vi: [], en: [], fr: [], ru: [], zh: [], hi: [] },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/6NDgTSg8PZb5BtGX8",
      landing: "https://maps.app.goo.gl/ETF9PiL4ijd5hYKQ6",
    },
  },

  ha_noi: {
    key: "ha_noi",
    name: {
      vi: "HÀ NỘI",
      en: "HA NOI",
      fr: "HANOÏ",
      ru: "ХАНОЙ",
      zh: "河内",
      hi: "हनोई",
    },
    basePriceVND: () => 1_790_000,
    basePriceUSD: () => 65,
    packages: [
      {
        key: "ha_noi_850m" as PackageKey,
        label: {
          vi: "Cất cánh từ 850m – Điểm dù lượn cao nhất Hà Nội",
          en: "Take off from 850m – Highest Paragliding point in Hanoi",
          fr: "Décollage depuis 850m – Point de parapente le plus haut de Hanoï",
          ru: "Взлёт с 850м – Высочайшая точка парапланеризма в Ханое",
          zh: "从850米起飞 – 河内最高滑翔伞点",
          hi: "850m से उड़ान – हनोई का सबसे ऊँचा पैराग्लाइडिंग बिंदु",
        },
        subtitle: {
          vi: "Cất cánh từ đỉnh Viên Nam, độ cao 850m – điểm cất cánh dù lượn cao nhất Hà Nội, độ chênh cao lớn nhất Việt Nam (hơn 800m). Thời lượng bay lâu, tầm nhìn rộng, ngắm trọn Sông Đà và núi Ba Vì ngay trước mắt.",
          en: "Take off from Vien Nam summit, 850m altitude – the highest paragliding launch in Hanoi and the greatest altitude difference in Vietnam (over 800m). Longer flights, panoramic views, with the Da River and Ba Vi mountain right in front of you.",
          fr: "Décollage du sommet de Vien Nam, à 850 m d’altitude – le plus haut site de parapente de Hanoï et le plus grand dénivelé du Vietnam (plus de 800 m). Vols plus longs, vues panoramiques, avec la rivière Da et le mont Ba Vi juste devant vous.",
          ru: "Старт с вершины Виен Нам на высоте 850 м — самая высокая точка старта парапланов в Ханое и наибольший перепад высот во Вьетнаме (более 800 м). Более длительные полёты, панорамные виды, река Да и гора Ба Ви прямо перед вами.",
          zh: "从员南山顶 850 米高度起飞——河内最高的滑翔伞起飞点，也是越南落差最大的飞行点（超过 800 米）。飞行时间更长，视野开阔，沱江与巴维山尽收眼底。",
          hi: "विएन नाम शिखर से 850 मीटर की ऊँचाई पर टेकऑफ़ – हनोई का सबसे ऊँचा पैराग्लाइडिंग लॉन्च और वियतनाम में सबसे अधिक ऊँचाई अंतर (800 मीटर से अधिक)। लंबी उड़ानें, विहंगम दृश्य, और सामने दा नदी तथा बा वी पर्वत।",
        },
        priceVND: 2_090_000,
        priceUSD: 65,
        flightTypes: [
          {
            key: "paragliding" as FlightTypeKey,
            label: {
              vi: "Bay dù không động cơ",
              en: "Paragliding",
              fr: "Parapente",
              ru: "Параплан",
              zh: "无动力滑翔伞",
              hi: "पैराग्लाइडिंग",
            },
            fixed: 2_090_000,
          },
        ],
      },
      {
        key: "ha_noi_650m" as PackageKey,
        label: {
          vi: "Cất cánh từ 650m – Gói tiêu chuẩn",
          en: "Take off from 650m – Standard Package",
          fr: "Décollage depuis 650m – Forfait standard",
          ru: "Взлёт с 650м – Стандартный пакет",
          zh: "从650米起飞 – 标准套餐",
          hi: "650m से उड़ान – मानक पैकेज",
        },
        priceVND: 1_790_000,
        priceUSD: 65,
        flightTypes: [
          {
            key: "paragliding" as FlightTypeKey,
            label: {
              vi: "Bay dù không động cơ",
              en: "Paragliding",
              fr: "Parapente",
              ru: "Параплан",
              zh: "无动力滑翔伞",
              hi: "पैराग्लाइडिंग",
            },
            fixed: 1_790_000,
          },
        ],
      },
    ],
    services: [
      {
        key: "ha_noi_fixed_pickup",
        label: {
          vi: "Xe đón/trả từ TTTM GO! Thăng Long, Hà Nội",
          en: "Round-trip pickup from GO! Thang Long Mall, Hanoi",
          fr: "Prise en charge aller-retour depuis GO! Thang Long, Hanoï",
          ru: "Трансфер туда-обратно от ТЦ GO! Thang Long, Ханой",
          zh: "河内 GO! Thang Long 购物中心往返接送",
          hi: "GO! थैंग लॉन्ग मॉल, हनोई से राउंड-ट्रिप पिकअप",
        },
        controlType: "checkbox",
        priceVND: 250_000,
        priceUSD: 10,
        fixedMapUrl: BIGC_THANG_LONG_MAP,
        exclusiveGroup: "ha_noi_pickup_group",
      },
      {
        key: "ha_noi_private_hotel_pickup",
        label: {
          vi: "Xe riêng đón/trả từ khách sạn",
          en: "Private hotel pickup",
          fr: "Prise en charge privée depuis l’hôtel",
          ru: "Индивидуальный трансфер от отеля",
          zh: "酒店专车接送",
          hi: "प्राइवेट होटल पिकअप",
        },
        controlType: "checkbox",
        note: {
          vi: "1–3 khách: 1.400.000đ/xe. Từ khách thứ 4 trở đi cộng thêm 350.000đ/người.",
          en: "1–3 guests: 1,400,000 VND/car. From the 4th guest onward, add 350,000 VND/person.",
          fr: "1 à 3 personnes : 1 400 000 VND/voiture. À partir de la 4e personne, ajouter 350 000 VND/personne.",
          ru: "1–3 гостя: 1 400 000 VND за машину. С 4-го гостя — доплата 350 000 VND с человека.",
          zh: "1–3 位客人：1,400,000 越南盾/车。从第 4 位客人起，每人加收 350,000 越南盾。",
          hi: "1–3 मेहमान: 1,400,000 VND/कार। चौथे मेहमान से आगे, प्रति व्यक्ति 350,000 VND अतिरिक्त।",
        },
        requiresPickupInput: true,
        exclusiveGroup: "ha_noi_pickup_group",
      },
      {
        key: "ha_noi_hotel_pickup_shared",
        label: {
          vi: "Đón trả tận nơi từ khách sạn (ghép xe)",
          en: "Shared hotel pickup",
          fr: "Prise en charge partagée à l'hôtel",
          ru: "Групповой трансфер от отеля",
          zh: "酒店拼车接送",
          hi: "शेयर्ड होटल पिकअप",
        },
        controlType: "checkbox",
        /**
         * GIÁ THEO ĐOÀN, KHÔNG NHÂN ĐẦU NGƯỜI (luật chủ 11/09) — xem
         * `giaDonKhachSanHaNoi`. Con số ở đây là giá của khách ĐẦU TIÊN; phần
         * cộng thêm do hàm ấy tính, nên đừng nhân với số khách ở bất cứ đâu.
         */
        priceVND: DON_KHACH_SAN_HA_NOI_VND,
        priceUSD: DON_KHACH_SAN_HA_NOI_USD,
        note: {
          vi: "1 khách: 1.000.000đ. Mỗi khách thêm cộng 100.000đ (2 khách 1.100.000đ, 3 khách 1.200.000đ).",
          en: "1 guest: 1,000,000 VND. Each extra guest adds 100,000 VND (2 guests 1,100,000; 3 guests 1,200,000).",
          fr: "1 personne : 1 000 000 VND. Chaque personne supplémentaire : +100 000 VND (2 pers. 1 100 000 ; 3 pers. 1 200 000).",
          ru: "1 гость: 1 000 000 VND. Каждый следующий гость +100 000 VND (2 гостя 1 100 000; 3 гостя 1 200 000).",
          zh: "1 位客人：1,000,000 越南盾。每增加 1 位加收 100,000 越南盾（2 位 1,100,000；3 位 1,200,000）。",
          hi: "1 मेहमान: 1,000,000 VND। हर अतिरिक्त मेहमान पर +100,000 VND (2 मेहमान 1,100,000; 3 मेहमान 1,200,000)।",
        },
        requiresPickupInput: true,
        exclusiveGroup: "ha_noi_pickup_group",
      },
      {
        key: "ha_noi_mountain_shuttle",
        label: {
          vi: "Xe chuyên dụng lên núi",
          en: "Special mountain vehicle",
          fr: "Véhicule spécial pour la montagne",
          ru: "Специальный транспорт в горы",
          zh: "专用上山车辆",
          hi: "विशेष पर्वतीय वाहन",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 150_000,
        priceUSD: 6,
      },
      {
        key: "ha_noi_sunset",
        label: {
          vi: "Bay ngắm hoàng hôn",
          en: "Sunset on the mountain top",
          fr: "Coucher de soleil au sommet de la montagne",
          ru: "Закат на вершине горы",
          zh: "山顶日落",
          hi: "पर्वत शिखर पर सूर्यास्त",
        },
        controlType: "checkbox",
        priceVND: 700_000,
        priceUSD: 28,
      },
    ],
    addons: {
      pickup: {
        label: {
          vi: "Xe đón/trả từ TTTM GO! Thăng Long, Hà Nội",
          en: "Round-trip pickup from GO! Thang Long Mall, Hanoi",
          fr: "Prise en charge aller-retour depuis GO! Thang Long, Hanoï",
          ru: "Трансфер туда-обратно от ТЦ GO! Thang Long, Ханой",
          zh: "河内 GO! Thang Long 购物中心往返接送",
          hi: "GO! थैंग लॉन्ग मॉल, हनोई से राउंड-ट्रिप पिकअप",
        },
        pricePerPersonVND: 200_000,
        pricePerPersonUSD: 8,
      },
      camera360: {
        label: {
          vi: "Camera toàn cảnh 360",
          en: "360° camera",
          fr: "Caméra 360°",
          ru: "Камера 360°",
          zh: "360°全景相机",
          hi: "360° कैमरा",
        },
        pricePerPersonVND: 400_000,
        pricePerPersonUSD: 16,
      },
      flycam: {
        label: {
          vi: "Flycam (Drone Camera)",
          en: "Flycam",
          fr: "Flycam",
          ru: "Flycam",
          zh: "航拍",
          hi: "फ्लाईकैम",
        },
        pricePerPersonVND: 400_000,
        pricePerPersonUSD: 16,
      },
    },
    included: {
      vi: [
        "01 chuyến bay dù lượn từ 8–20 phút (tuỳ gió)",
        "Ảnh & video bằng GoPro",
        "Nước uống",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–20 minutes (weather dependent)",
        "GoPro photos & video",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 20 minutes (selon le vent)",
        "Photos & vidéo GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "Один полет на параплане 8–20 минут (по погоде)",
        "Фото и видео GoPro",
        "Питьевая вода",
        "Страховка парапланериста",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8 - 20 分钟（视风况而定）",
        "GoPro 照片与视频",
        "饮用水",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "8–20 मिनट की एक पैराग्लाइडिंग उड़ान (मौसम पर निर्भर)",
        "GoPro फ़ोटो व वीडियो",
        "पिने का पानी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
      ],
    },
    excluded: {
      vi: ["Bữa ăn"],
      en: ["Meals"],
      fr: ["Repas"],
      ru: ["Питание"],
      zh: ["餐食"],
      hi: ["भोजन"],
    },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/RxfRus3UfSz2m4nP6",
      pickup: BIGC_THANG_LONG_MAP,
    },
  },

  quan_ba: {
    key: "quan_ba",
    name: {
      vi: "HÀ GIANG",
      en: "HA GIANG",
      fr: "HA GIANG",
      ru: "ХАЗЯНГ",
      zh: "河江",
      hi: "हा जियांग",
    },
    /**
     * QUẢN BẠ — Mebayluon vận hành từ 15/10/2026 (chủ 25/09/2026).
     * Ba gói, khách chọn PG hay PPG ngay ở bước 1 như Khau Phạ:
     *  · PG 2.290.000đ (cất cánh 950 m) — ĐÃ GỒM đón trả 2 chiều trong khu vực.
     *  · PPG cơ bản 15' 2.490.000đ.
     *  · PPG bay lâu 25' săn mây bình minh/hoàng hôn 3.390.000đ (= cơ bản + 900k).
     * USD quy theo cùng tỉ giá các gói khác (~26k): 88 / 95 / 129.
     * Giá cơ sở (chưa chọn gói) = gói PG, khớp con số trên thẻ điểm bay.
     */
    basePriceVND: () => 2_290_000,
    basePriceUSD: () => 88,
    packages: [
      {
        key: "quan_ba_pg" as PackageKey,
        label: {
          vi: "Dù lượn không động cơ (PG)",
          en: "Paragliding, non-powered (PG)",
          fr: "Parapente sans moteur (PG)",
          ru: "Параплан без мотора (PG)",
          zh: "无动力滑翔伞 (PG)",
          hi: "बिना मोटर पैराग्लाइडिंग (PG)",
        },
        subtitle: {
          vi: "Bay đôi cùng phi công, hoàn toàn nhờ sức gió. Cất cánh sườn núi ở độ cao 950 m, hạ cánh trong thung lũng Quản Bạ. Giá đã gồm đón trả 2 chiều trong khu vực Quản Bạ.",
          en: "Tandem flight with a pilot, powered only by the wind. Take off from the 950 m slope, land in the Quan Ba valley. Round-trip transfer within the Quan Ba area included.",
          fr: "Vol biplace avec un pilote, uniquement porté par le vent. Décollage depuis le versant à 950 m, atterrissage dans la vallée de Quan Ba. Transfert aller-retour dans la zone de Quan Ba inclus.",
          ru: "Полёт в тандеме с пилотом, только на силе ветра. Старт со склона на 950 м, посадка в долине Куан Ба. Трансфер туда-обратно в районе Куан Ба включён.",
          zh: "与飞行员双人飞行，完全依靠风力。从 950 米山坡起飞，在管坝山谷降落。含管坝地区往返接送。",
          hi: "पायलट के साथ टैंडम उड़ान, केवल हवा के सहारे। 950 मी ढलान से टेक-ऑफ, क्वान बा घाटी में लैंडिंग। क्वान बा क्षेत्र में राउंड-ट्रिप ट्रांसफ़र शामिल।",
        },
        priceVND: 2_290_000,
        priceUSD: 88,
        included: {
          vi: [
            "01 chuyến bay dù lượn (PG) 10–15 phút, cất cánh ở độ cao 950 m (tuỳ gió)",
            "Đón trả 2 chiều trong khu vực Quản Bạ (Nậm Đăm, xã Quản Bạ, Lùng Tám, Cán Tỉ)",
            "Ảnh & video bằng GoPro",
            "Bảo hiểm dù lượn",
            "Nước uống, giấy chứng nhận và quà lưu niệm",
          ],
          en: [
            "One paragliding (PG) flight of 10–15 minutes from the 950 m take-off (weather dependent)",
            "Round-trip transfer within the Quan Ba area (Nam Dam, Quan Ba commune, Lung Tam, Can Ti)",
            "GoPro photos & video",
            "Paragliding insurance",
            "Drinking water, certificate and souvenir",
          ],
          fr: [
            "Un vol en parapente (PG) de 10 à 15 minutes depuis le décollage à 950 m (selon le vent)",
            "Transfert aller-retour dans la zone de Quan Ba (Nam Dam, commune de Quan Ba, Lung Tam, Can Ti)",
            "Photos & vidéo GoPro",
            "Assurance parapente",
            "Eau, certificat et souvenir",
          ],
          ru: [
            "Один полёт на параплане (PG) 10–15 минут со старта на 950 м (по погоде)",
            "Трансфер туда-обратно в районе Куан Ба (Нам Дам, коммуна Куан Ба, Лунг Там, Кан Ти)",
            "Фото и видео GoPro",
            "Страховка парапланериста",
            "Вода, сертификат и сувенир",
          ],
          zh: [
            "一次滑翔伞 (PG) 飞行 10–15 分钟，从 950 米起飞点出发（视风况而定）",
            "管坝地区往返接送（南丹、管坝乡、龙潭、干池）",
            "GoPro 照片与视频",
            "滑翔伞保险",
            "饮用水、证书与纪念品",
          ],
          hi: [
            "950 मी टेक-ऑफ से एक पैराग्लाइडिंग (PG) उड़ान 10–15 मिनट (मौसम पर निर्भर)",
            "क्वान बा क्षेत्र में राउंड-ट्रिप ट्रांसफ़र (नाम दाम, क्वान बा कम्यून, लुंग ताम, कान ती)",
            "GoPro फ़ोटो व वीडियो",
            "पैराग्लाइडिंग बीमा",
            "पानी, प्रमाणपत्र और स्मृति-चिह्न",
          ],
        },
        flightTypes: [
          {
            key: "paragliding" as FlightTypeKey,
            label: {
              vi: "Bay dù không động cơ",
              en: "Paragliding",
              fr: "Parapente",
              ru: "Параплан",
              zh: "无动力滑翔伞",
              hi: "पैराग्लाइडिंग",
            },
            fixed: 2_290_000,
            fixedUSD: 88,
          },
        ],
      },
      {
        key: "quan_ba_ppg_15" as PackageKey,
        label: {
          vi: "Dù lượn gắn động cơ (PPG) - gói cơ bản 15 phút",
          en: "Powered paragliding (PPG) - basic package, 15 min",
          fr: "Paramoteur (PPG) - formule de base, 15 min",
          ru: "Парамотор (PPG) - базовый пакет, 15 мин",
          zh: "动力伞 (PPG) - 基础套餐 15 分钟",
          hi: "पैरामोटर (PPG) - बेसिक पैकेज, 15 मिनट",
        },
        subtitle: {
          vi: "Cất cánh ngay tại thung lũng, ít phụ thuộc gió, chủ động leo cao ngắm toàn cảnh Núi Đôi – Cổng Trời. Giá đã gồm đón trả 2 chiều trong khu vực Quản Bạ.",
          en: "Take off right in the valley, less wind-dependent, climb at will for the full view of the Twin Mountains and Heaven's Gate. Round-trip transfer within the Quan Ba area included.",
          fr: "Décollage directement dans la vallée, moins dépendant du vent, montée à volonté pour la vue complète sur les Montagnes Jumelles et la Porte du Ciel. Transfert aller-retour inclus.",
          ru: "Старт прямо в долине, меньше зависит от ветра, свободный набор высоты с видом на Горы-близнецы и Небесные врата. Трансфер туда-обратно включён.",
          zh: "直接在山谷起飞，受风力影响小，可自由爬升，尽览双峰山与天门。含往返接送。",
          hi: "सीधे घाटी से टेक-ऑफ, हवा पर कम निर्भर, जुड़वाँ पर्वत और स्वर्ग के द्वार के पूरे दृश्य के लिए ऊँचाई पर चढ़ें। राउंड-ट्रिप ट्रांसफ़र शामिल।",
        },
        priceVND: 2_490_000,
        priceUSD: 95,
        included: {
          vi: [
            "01 chuyến bay dù lượn có động cơ (PPG) 15 phút, cất cánh ngay tại thung lũng Quản Bạ",
            "Đón trả 2 chiều trong khu vực Quản Bạ (Nậm Đăm, xã Quản Bạ, Lùng Tám, Cán Tỉ)",
            "Ảnh & video bằng GoPro",
            "Bảo hiểm dù lượn",
            "Nước uống, giấy chứng nhận và quà lưu niệm",
          ],
          en: [
            "One powered paragliding (PPG) flight of 15 minutes, taking off right in the Quan Ba valley",
            "Round-trip transfer within the Quan Ba area (Nam Dam, Quan Ba commune, Lung Tam, Can Ti)",
            "GoPro photos & video",
            "Paragliding insurance",
            "Drinking water, certificate and souvenir",
          ],
          fr: [
            "Un vol en paramoteur (PPG) de 15 minutes, décollage directement dans la vallée de Quan Ba",
            "Transfert aller-retour dans la zone de Quan Ba (Nam Dam, commune de Quan Ba, Lung Tam, Can Ti)",
            "Photos & vidéo GoPro",
            "Assurance parapente",
            "Eau, certificat et souvenir",
          ],
          ru: [
            "Один полёт на парамоторе (PPG) 15 минут, старт прямо в долине Куан Ба",
            "Трансфер туда-обратно в районе Куан Ба (Нам Дам, коммуна Куан Ба, Лунг Там, Кан Ти)",
            "Фото и видео GoPro",
            "Страховка парапланериста",
            "Вода, сертификат и сувенир",
          ],
          zh: [
            "一次动力伞 (PPG) 飞行 15 分钟，直接在管坝山谷起飞",
            "管坝地区往返接送（南丹、管坝乡、龙潭、干池）",
            "GoPro 照片与视频",
            "滑翔伞保险",
            "饮用水、证书与纪念品",
          ],
          hi: [
            "एक पैरामोटर (PPG) उड़ान 15 मिनट, सीधे क्वान बा घाटी से टेक-ऑफ",
            "क्वान बा क्षेत्र में राउंड-ट्रिप ट्रांसफ़र (नाम दाम, क्वान बा कम्यून, लुंग ताम, कान ती)",
            "GoPro फ़ोटो व वीडियो",
            "पैराग्लाइडिंग बीमा",
            "पानी, प्रमाणपत्र और स्मृति-चिह्न",
          ],
        },
        flightTypes: [
          {
            key: "paramotor" as FlightTypeKey,
            label: {
              vi: "Bay dù lượn có động cơ",
              en: "Powered paragliding",
              fr: "Paramoteur",
              ru: "Парамотор",
              zh: "动力伞",
              hi: "पैरामोटर",
            },
            fixed: 2_490_000,
            fixedUSD: 95,
          },
        ],
      },
      {
        key: "quan_ba_ppg_25" as PackageKey,
        label: {
          vi: "Dù lượn gắn động cơ (PPG) - gói nâng cao 25 phút – săn mây / bình minh / hoàng hôn",
          en: "Powered paragliding (PPG) - advanced package, 25 min – cloud-hunting / sunrise / sunset",
          fr: "Paramoteur (PPG) - formule avancée, 25 min – chasse aux nuages / aube / coucher du soleil",
          ru: "Парамотор (PPG) - расширенный пакет, 25 мин – охота за облаками / рассвет / закат",
          zh: "动力伞 (PPG) - 进阶套餐 25 分钟 – 追云 / 日出 / 日落",
          hi: "पैरामोटर (PPG) - एडवांस पैकेज, 25 मिनट – क्लाउड-हंटिंग / सूर्योदय / सूर्यास्त",
        },
        subtitle: {
          vi: "Gói cơ bản + 900.000 đ: bay 25 phút vào khung bình minh hoặc hoàng hôn, khi mây còn phủ các thung lũng nhỏ quanh Tam Sơn. Đặt trước để chúng tôi xếp giờ theo mặt trời.",
          en: "Basic package + 900,000 VND: a 25-minute flight at sunrise or sunset, while cloud still fills the small valleys around Tam Son. Book ahead so we can schedule by the sun.",
          fr: "Formule de base + 900 000 VND : vol de 25 minutes à l'aube ou au coucher du soleil, quand les nuages remplissent encore les petites vallées autour de Tam Son. Réservez à l'avance pour un horaire calé sur le soleil.",
          ru: "Базовый пакет + 900 000 VND: полёт 25 минут на рассвете или закате, пока облака ещё заполняют маленькие долины вокруг Там Шона. Бронируйте заранее, чтобы мы подобрали время по солнцу.",
          zh: "基础套餐 + 900,000 越南盾：日出或日落时段 25 分钟飞行，此时云海仍填满三山周围的小山谷。请提前预订，我们按日出日落时间安排。",
          hi: "बेसिक पैकेज + 900,000 VND: सूर्योदय या सूर्यास्त पर 25 मिनट की उड़ान, जब बादल अब भी ताम सोन के आसपास की छोटी घाटियों में भरे रहते हैं। पहले से बुक करें ताकि हम समय सूरज के हिसाब से रखें।",
        },
        priceVND: 3_390_000,
        priceUSD: 129,
        included: {
          vi: [
            "01 chuyến bay PPG 25 phút trong khung bình minh hoặc hoàng hôn — bay săn mây trên cao nguyên đá",
            "Đón trả 2 chiều trong khu vực Quản Bạ (Nậm Đăm, xã Quản Bạ, Lùng Tám, Cán Tỉ)",
            "Ảnh & video bằng GoPro",
            "Bảo hiểm dù lượn",
            "Nước uống, giấy chứng nhận và quà lưu niệm",
          ],
          en: [
            "One 25-minute PPG flight at sunrise or sunset — cloud-hunting over the karst plateau",
            "Round-trip transfer within the Quan Ba area (Nam Dam, Quan Ba commune, Lung Tam, Can Ti)",
            "GoPro photos & video",
            "Paragliding insurance",
            "Drinking water, certificate and souvenir",
          ],
          fr: [
            "Un vol PPG de 25 minutes à l'aube ou au coucher du soleil — chasse aux nuages au-dessus du plateau karstique",
            "Transfert aller-retour dans la zone de Quan Ba (Nam Dam, commune de Quan Ba, Lung Tam, Can Ti)",
            "Photos & vidéo GoPro",
            "Assurance parapente",
            "Eau, certificat et souvenir",
          ],
          ru: [
            "Один полёт на PPG 25 минут на рассвете или закате — охота за облаками над каменным плато",
            "Трансфер туда-обратно в районе Куан Ба (Нам Дам, коммуна Куан Ба, Лунг Там, Кан Ти)",
            "Фото и видео GoPro",
            "Страховка парапланериста",
            "Вода, сертификат и сувенир",
          ],
          zh: [
            "一次 25 分钟 PPG 飞行，日出或日落时段——在石灰岩高原上追云",
            "管坝地区往返接送（南丹、管坝乡、龙潭、干池）",
            "GoPro 照片与视频",
            "滑翔伞保险",
            "饮用水、证书与纪念品",
          ],
          hi: [
            "सूर्योदय या सूर्यास्त पर एक 25 मिनट की PPG उड़ान — पत्थर के पठार पर क्लाउड-हंटिंग",
            "क्वान बा क्षेत्र में राउंड-ट्रिप ट्रांसफ़र (नाम दाम, क्वान बा कम्यून, लुंग ताम, कान ती)",
            "GoPro फ़ोटो व वीडियो",
            "पैराग्लाइडिंग बीमा",
            "पानी, प्रमाणपत्र और स्मृति-चिह्न",
          ],
        },
        flightTypes: [
          {
            key: "paramotor" as FlightTypeKey,
            label: {
              vi: "Bay dù lượn có động cơ",
              en: "Powered paragliding",
              fr: "Paramoteur",
              ru: "Парамотор",
              zh: "动力伞",
              hi: "पैरामोटर",
            },
            fixed: 3_390_000,
            fixedUSD: 129,
          },
        ],
      },
    ],
    services: [
      {
        /**
         * Đón trả 2 chiều ĐÃ NẰM TRONG GIÁ VÉ (cả PG lẫn PPG) nên giá 0 và tích
         * sẵn; vẫn bắt nhập điểm đón để quầy biết đến đâu. Khách tự đến thì bỏ
         * tích — khi đó hiện lời nhắc có mặt trước 15 phút.
         */
        key: "quan_ba_pickup",
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực Quản Bạ (đã bao gồm)",
          en: "Round-trip pickup within the Quan Ba area (included)",
          fr: "Prise en charge aller-retour dans la zone de Quan Ba (incluse)",
          ru: "Трансфер туда-обратно в районе Куан Ба (включён)",
          zh: "管坝地区往返接送（已包含）",
          hi: "क्वान बा क्षेत्र में राउंड-ट्रिप पिकअप (शामिल)",
        },
        description: {
          vi: "Đón trả tại khách sạn/homestay trong khu vực Quản Bạ: Nậm Đăm, xã Quản Bạ (thị trấn Tam Sơn cũ), Lùng Tám và Cán Tỉ.\nVui lòng ghi tên và địa chỉ nơi đón.",
          en: "Pickup and drop-off at hotels/homestays within the Quan Ba area: Nam Dam, Quan Ba commune (former Tam Son town), Lung Tam and Can Ti.\nPlease enter the name and address of your pickup point.",
          fr: "Prise en charge et retour à l'hôtel/homestay dans la zone de Quan Ba : Nam Dam, commune de Quan Ba (ancienne ville de Tam Son), Lung Tam et Can Ti.\nIndiquez le nom et l'adresse du lieu de prise en charge.",
          ru: "Трансфер от отеля/хоумстея и обратно в районе Куан Ба: Нам Дам, коммуна Куан Ба (бывший город Там Шон), Лунг Там и Кан Ти.\nУкажите название и адрес места посадки.",
          zh: "在管坝地区的酒店/民宿接送：南丹、管坝乡（原三山镇）、龙潭和干池。\n请填写接送地点的名称和地址。",
          hi: "क्वान बा क्षेत्र के होटल/होमस्टे से पिकअप और ड्रॉप: नाम दाम, क्वान बा कम्यून (पूर्व ताम सोन कस्बा), लुंग ताम और कान ती।\nकृपया पिकअप स्थान का नाम और पता लिखें।",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 0,
        priceUSD: 0,
        requiresPickupInput: true,
        exclusiveGroup: "quan_ba_pickup",
      },
      {
        /**
         * Đón từ TP HÀ GIANG (chủ 25/09/2026): 500.000đ / xe 4 chỗ / 1 chiều,
         * qty = SỐ CHIỀU (1 hoặc 2), số xe = ceil(khách / 4) — cùng công thức
         * với xe Garrya ở Khau Phạ (xem meta "quan_ba_city_pickup").
         * Cùng nhóm với đón trong khu vực: khách ở TP thì xe TP đưa thẳng lên bãi.
         */
        key: "quan_ba_city_pickup",
        label: {
          vi: "Đón từ TP Hà Giang (xe 4 chỗ, 500.000 đ/chiều)",
          en: "Pickup from Ha Giang city (4-seat car, 500,000 VND/one way)",
          fr: "Prise en charge depuis la ville de Ha Giang (voiture 4 places, 500 000 VND/trajet)",
          ru: "Трансфер из города Хазянг (4-местная машина, 500 000 VND в одну сторону)",
          zh: "从河江市接送（4 座车，500,000 越南盾/单程）",
          hi: "हा जियांग शहर से पिकअप (4-सीटर कार, 500,000 VND/एक तरफ़)",
        },
        description: {
          vi: "Nếu đặt 2 chiều vui lòng chọn \"2\".\nXe 4 chỗ đón tại khách sạn trong TP Hà Giang, khoảng 45 km (1 giờ 15 phút) lên Quản Bạ. Trên 4 khách tính thêm xe.",
          en: "For a round trip, please select \"2\".\n4-seat car from your hotel in Ha Giang city, about 45 km (1 h 15 min) up to Quan Ba. More than 4 guests: extra car.",
          fr: "Pour un aller-retour, veuillez sélectionner \"2\".\nVoiture 4 places depuis votre hôtel en ville de Ha Giang, environ 45 km (1 h 15) jusqu'à Quan Ba. Plus de 4 personnes : voiture supplémentaire.",
          ru: "Для поездки туда-обратно выберите \"2\".\n4-местная машина от отеля в городе Хазянг, около 45 км (1 ч 15 мин) до Куан Ба. Более 4 гостей — дополнительная машина.",
          zh: "如需往返，请选择\"2\"。\n4 座车从河江市酒店出发，约 45 公里（1 小时 15 分钟）到管坝。超过 4 位客人需加车。",
          hi: "राउंड ट्रिप के लिए कृपया \"2\" चुनें।\nहा जियांग शहर के होटल से 4-सीटर कार, क्वान बा तक लगभग 45 किमी (1 घंटा 15 मिनट)। 4 से अधिक मेहमान: अतिरिक्त कार।",
        },
        controlType: "checkbox",
        priceVND: 500_000,
        priceUSD: 20,
        requiresPickupInput: true,
        exclusiveGroup: "quan_ba_pickup",
      },
      /**
       * Flycam và camera 360° là DỊCH VỤ (không phải addon) để hưởng giảm combo
       * flycam + 360 = 700k như Khau Phạ (lib/booking/image-combo.ts chỉ đếm
       * services). Giá 400k mỗi thứ theo chủ 25/09/2026.
       */
      {
        key: "quan_ba_flycam",
        label: {
          vi: "Flycam (drone camera)",
          en: "Flycam (drone camera)",
          fr: "Flycam (drone)",
          ru: "Flycam (дрон)",
          zh: "航拍（无人机）",
          hi: "फ्लाईकैम (ड्रोन कैमरा)",
        },
        description: {
          vi: "Quay toàn cảnh thung lũng và hành trình bay, video gốc sẽ được gửi ngay sau chuyến bay. Đặt cả flycam và camera 360° chỉ 700.000 đ/khách.",
          en: "Panoramic view of the valley and flight journey, original video sent right after the flight. Flycam + 360° camera together: 700,000 VND/guest.",
          fr: "Vue panoramique de la vallée et du vol, vidéo originale envoyée juste après le vol. Flycam + caméra 360° ensemble : 700 000 VND/personne.",
          ru: "Панорамная съёмка долины и всего полёта, исходное видео сразу после полёта. Flycam + камера 360° вместе: 700 000 VND с человека.",
          zh: "山谷与飞行全程的全景拍摄，原始视频于飞行后立即发送。航拍 + 360° 相机合购仅 700,000 越南盾/人。",
          hi: "घाटी और उड़ान यात्रा का विहंगम दृश्य, मूल वीडियो उड़ान के तुरंत बाद। फ्लाईकैम + 360° कैमरा साथ में: 700,000 VND/मेहमान।",
        },
        controlType: "counter",
        priceVND: 400_000,
        priceUSD: 16,
      },
      {
        key: "quan_ba_camera360",
        label: {
          vi: "360 camera",
          en: "360 camera",
          fr: "Caméra 360",
          ru: "Камера 360",
          zh: "360相机",
          hi: "360 कैमरा",
        },
        description: {
          vi: "Quay toàn cảnh chuyến bay ấn tượng, video được edit và sẽ gửi trong vòng 24h",
          en: "Impressive panoramic flight video, edited and sent within 24h",
          fr: "Vidéo panoramique de vol impressionnante, montée et envoyée sous 24 h",
          ru: "Впечатляющее панорамное видео полёта, смонтированное и отправленное в течение 24 часов",
          zh: "震撼的全景飞行视频，剪辑后 24 小时内发送",
          hi: "प्रभावशाली विहंगम उड़ान वीडियो, एडिट करके 24 घंटे के भीतर भेजा जाता है",
        },
        controlType: "counter",
        priceVND: 400_000,
        priceUSD: 16,
      },
    ],
    addons: {
      pickup: {
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực Quản Bạ (đã bao gồm)",
          en: "Round-trip pickup within the Quan Ba area (included)",
          fr: "Prise en charge aller-retour dans la zone de Quan Ba (incluse)",
          ru: "Трансфер туда-обратно в районе Куан Ба (включён)",
          zh: "管坝地区往返接送（已包含）",
          hi: "क्वान बा क्षेत्र में राउंड-ट्रिप पिकअप (शामिल)",
        },
        pricePerPersonVND: 0,
        pricePerPersonUSD: 0,
      },
      // flycam / camera360: xem services ở trên (để được giảm combo 700k).
    },
    /** Dự phòng khi chưa chọn gói — bản đầy đủ nằm trong từng gói ở trên. */
    included: {
      vi: [
        "01 chuyến bay dù lượn (PG) 10–15 phút, cất cánh ở độ cao 950 m (tuỳ gió)",
        "Đón trả 2 chiều trong khu vực Quản Bạ (Nậm Đăm, xã Quản Bạ, Lùng Tám, Cán Tỉ)",
        "Ảnh & video bằng GoPro",
        "Bảo hiểm dù lượn",
        "Nước uống, giấy chứng nhận và quà lưu niệm",
      ],
      en: [
        "One paragliding (PG) flight of 10–15 minutes from the 950 m take-off (weather dependent)",
        "Round-trip transfer within the Quan Ba area (Nam Dam, Quan Ba commune, Lung Tam, Can Ti)",
        "GoPro photos & video",
        "Paragliding insurance",
        "Drinking water, certificate and souvenir",
      ],
      fr: [
        "Un vol en parapente (PG) de 10 à 15 minutes depuis le décollage à 950 m (selon le vent)",
        "Transfert aller-retour dans la zone de Quan Ba (Nam Dam, commune de Quan Ba, Lung Tam, Can Ti)",
        "Photos & vidéo GoPro",
        "Assurance parapente",
        "Eau, certificat et souvenir",
      ],
      ru: [
        "Один полёт на параплане (PG) 10–15 минут со старта на 950 м (по погоде)",
        "Трансфер туда-обратно в районе Куан Ба (Нам Дам, коммуна Куан Ба, Лунг Там, Кан Ти)",
        "Фото и видео GoPro",
        "Страховка парапланериста",
        "Вода, сертификат и сувенир",
      ],
      zh: [
        "一次滑翔伞 (PG) 飞行 10–15 分钟，从 950 米起飞点出发（视风况而定）",
        "管坝地区往返接送（南丹、管坝乡、龙潭、干池）",
        "GoPro 照片与视频",
        "滑翔伞保险",
        "饮用水、证书与纪念品",
      ],
      hi: [
        "950 मी टेक-ऑफ से एक पैराग्लाइडिंग (PG) उड़ान 10–15 मिनट (मौसम पर निर्भर)",
        "क्वान बा क्षेत्र में राउंड-ट्रिप ट्रांसफ़र (नाम दाम, क्वान बा कम्यून, लुंग ताम, कान ती)",
        "GoPro फ़ोटो व वीडियो",
        "पैराग्लाइडिंग बीमा",
        "पानी, प्रमाणपत्र और स्मृति-चिह्न",
      ],
    },
    excluded: { vi: [], en: [], fr: [], ru: [], zh: [], hi: [] },
    coordinates: {
      // Bãi cất PG (950 m) và bãi hạ — cũng là bãi cất PPG (450 m).
      takeoff: "https://maps.google.com/?q=23.0604025,105.0189508",
      landing: "https://maps.google.com/?q=23.0612686,105.0388558",
    },
  },
};

export function formatVND(n: number): string {
  return `${(n ?? 0).toLocaleString("vi-VN")}₫`;
}

export function formatUSD(n: number): string {
  return `${(n ?? 0).toLocaleString("en-US")} USD`;
}

export function formatByLang(
  lang: LangCode,
  vnd: number,
  usd: number,
): string {
  return lang === "vi" ? formatVND(vnd) : formatUSD(usd);
}

export function currencyOf(lang: LangCode): "VND" | "USD" {
  return lang === "vi" ? "VND" : "USD";
}

/**
 * GIẢM GIÁ THEO NHÓM (21/08/2026): nhóm 3 khách bớt 50k mỗi khách, nhóm từ 4
 * khách trở lên bớt 70k mỗi khách. Đi 1–2 khách không giảm.
 *
 * Xếp từ mốc CAO xuống THẤP — vòng tìm lấy mốc đầu tiên khớp là dừng.
 * XUẤT RA NGOÀI để giao diện đọc đúng bảng này; trước đây bảng bị chép tay
 * lần hai trong select-flight-step nên sửa giá một nơi là hai nơi nói khác nhau.
 */
export const GROUP_DISCOUNT = [
  { min: 4, vnd: 70_000, usd: 3 },
  { min: 3, vnd: 50_000, usd: 2 },
] as const;

type ComputeParams = {
  location: LocationKey;
  guestsCount: number;
  dateISO?: string;
  packageKey?: string;
  flightTypeKey?: string;
  addons?: Partial<Record<AddonKey, boolean>>;
  addonsQty?: Partial<Record<AddonKey, number>>;
};

export type ComputeResult = {
  currency: "VND" | "USD";
  guestsCount: number;
  holidayType: HolidayType;

  basePricePerPerson: number;
  baseTotal: number;

  /**
   * Giá gói khách đã thấy ở bước 1 (chưa cộng phụ thu ngày lễ & cuối tuần),
   * và phần chênh lệch mỗi khách. Bước 4 tách hai con số này thành hai dòng
   * riêng thay vì chỉ hiện một mức giá đã cộng gộp.
   * Ngày thường hoặc điểm bay đồng giá thì phụ thu bằng 0.
   */
  quotedBasePerPerson: number;
  peakSurchargePerPerson: number;
  peakSurchargeTotal: number;

  addonsPerPerson: Record<AddonKey, number>;
  addonsUnitPrice: Record<AddonKey, number>;
  addonsQty: Record<AddonKey, number>;
  addonsTotal: Record<AddonKey, number>;
  addonsGrandTotal: number;

  discountPerPerson: number;
  discountTotal: number;

  totalPerPerson: number;
  totalAfterDiscount: number;
};

export function computePrice(p: ComputeParams): ComputeResult {
  return computePriceByCurrency(p, "VND");
}

export function computePriceByLang(
  p: ComputeParams,
  lang: LangCode,
): ComputeResult {
  return computePriceByCurrency(p, currencyOf(lang));
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function getBasePriceVND(p: ComputeParams): number {
  const { location, dateISO, packageKey, flightTypeKey } = p;

  if (location === "khau_pha") {
    return getKhauPhaPackageBasePriceVND(packageKey, flightTypeKey, dateISO);
  }

  if (packageKey) {
    const locCfg = LOCATIONS[location] as any;
    const pkg = locCfg.packages?.find((pk: any) => pk.key === packageKey);
    if (pkg) {
      if (flightTypeKey && pkg.flightTypes?.length) {
        const ft = pkg.flightTypes.find((f: any) => f.key === flightTypeKey);
        if (ft?.fixed != null) return ft.fixed;
      }
      if (pkg.priceVND != null) return pkg.priceVND;
    }
  }

  return LOCATIONS[location].basePriceVND(dateISO);
}

function getBasePriceUSD(p: ComputeParams): number {
  const { location, dateISO, packageKey, flightTypeKey } = p;

  if (location === "khau_pha") {
    return getKhauPhaPackageBasePriceUSD(packageKey, flightTypeKey, dateISO);
  }

  if (packageKey) {
    const locCfg = LOCATIONS[location] as any;
    const pkg = locCfg.packages?.find((pk: any) => pk.key === packageKey);
    if (pkg) {
      if (flightTypeKey && pkg.flightTypes?.length) {
        const ft = pkg.flightTypes.find((f: any) => f.key === flightTypeKey);
        if (ft?.fixedUSD != null) return ft.fixedUSD;
      }
      if (pkg.priceUSD != null) return pkg.priceUSD;
    }
  }

  return LOCATIONS[location].basePriceUSD(dateISO);
}

function computePriceByCurrency(
  p: ComputeParams,
  currency: "VND" | "USD",
): ComputeResult {
  const {
    location,
    guestsCount: rawGuests,
    dateISO,
    addons = {},
    addonsQty = {},
  } = p;

  const guestsCount = Math.max(1, clampInt(rawGuests ?? 1, 1, 100));
  const cfg = LOCATIONS[location];

  const base = currency === "VND" ? getBasePriceVND(p) : getBasePriceUSD(p);

  const addonsPerPerson: Record<AddonKey, number> = {
    pickup: 0,
    flycam: 0,
    camera360: 0,
  };
  const addonsUnitPrice: Record<AddonKey, number> = {
    pickup: 0,
    flycam: 0,
    camera360: 0,
  };
  const addonsQtyNorm: Record<AddonKey, number> = {
    pickup: 0,
    flycam: 0,
    camera360: 0,
  };
  const addonsTotal: Record<AddonKey, number> = {
    pickup: 0,
    flycam: 0,
    camera360: 0,
  };

  (["pickup", "flycam", "camera360"] as AddonKey[]).forEach((key) => {
    const a = cfg.addons?.[key];
    if (!a) return;

    let unit =
      currency === "VND" ? a.pricePerPersonVND : a.pricePerPersonUSD;

    if (unit == null) {
      if (currency === "USD" && a.pricePerPersonVND != null) {
        unit = toUSDfromVND(a.pricePerPersonVND);
      } else {
        unit = 0;
      }
    }

    addonsUnitPrice[key] = unit ?? 0;

    let qty = addonsQty?.[key];
    if (qty == null) qty = addons?.[key] ? guestsCount : 0;

    qty = clampInt(qty ?? 0, 0, guestsCount);

    if (!addonsUnitPrice[key]) qty = 0;

    addonsQtyNorm[key] = qty;
    addonsTotal[key] = addonsUnitPrice[key] * qty;
    addonsPerPerson[key] = qty > 0 ? addonsUnitPrice[key] : 0;
  });

  const addonsGrandTotal = Object.values(addonsTotal).reduce(
    (s, x) => s + x,
    0,
  );

  let discount = 0;
  for (const tier of GROUP_DISCOUNT) {
    if (guestsCount >= tier.min) {
      discount = currency === "VND" ? tier.vnd : tier.usd;
      break;
    }
  }

  const baseTotal = base * guestsCount;

  // Chỉ Khau Phạ mới có hai mức giá theo ngày; các điểm còn lại đồng giá nên
  // giá báo ở bước 1 luôn bằng giá thu.
  const quotedBase =
    location === "khau_pha"
      ? currency === "VND"
        ? getKhauPhaQuotedBaseVND(p.packageKey, p.flightTypeKey)
        : getKhauPhaQuotedBaseUSD(p.packageKey, p.flightTypeKey)
      : base;
  const peakSurcharge = Math.max(0, base - quotedBase);

  const discountTotal = discount * guestsCount;
  const totalAfterDiscount = baseTotal + addonsGrandTotal - discountTotal;
  const totalPerPerson = Math.round(totalAfterDiscount / guestsCount);

  return {
    currency,
    guestsCount,
    holidayType: getHolidayType(dateISO),

    basePricePerPerson: base,
    baseTotal,

    quotedBasePerPerson: quotedBase,
    peakSurchargePerPerson: peakSurcharge,
    peakSurchargeTotal: peakSurcharge * guestsCount,

    addonsPerPerson,
    addonsUnitPrice,
    addonsQty: addonsQtyNorm,
    addonsTotal,
    addonsGrandTotal,

    discountPerPerson: discount,
    discountTotal,

    totalPerPerson,
    totalAfterDiscount,
  };
}

export function getLocationName(loc: LocationConfig, lang: LangCode): string {
  return loc.name[lang] ?? loc.name.en ?? loc.name.vi;
}

export function getAddonLabel(
  cfg: LocationConfig,
  key: AddonKey,
  lang: LangCode,
): string {
  const a = cfg.addons[key];
  return a?.label?.[lang] ?? a?.label?.en ?? a?.label?.vi ?? key;
}