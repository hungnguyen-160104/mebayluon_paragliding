"use client";

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
  | "khau_pha_paramotor";

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

function isVietnamMajorHoliday(dateISO?: string): boolean {
  const ymd = toYMD(dateISO);
  if (!ymd) return false;

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

  if (flightTypeKey === "paramotor" || packageKey === "khau_pha_paramotor") {
    return 2_390_000;
  }

  if (packageKey === "khau_pha_pkg_1") {
    return 2_190_000;
  }

  if (packageKey === "khau_pha_pkg_2") {
    return 2_590_000;
  }

  return holidayType === "weekday" ? 2_190_000 : 2_590_000;
}

function getKhauPhaPackageBasePriceUSD(
  packageKey?: string,
  flightTypeKey?: string,
  dateISO?: string,
): number {
  const holidayType = getHolidayType(dateISO);

  if (flightTypeKey === "paramotor" || packageKey === "khau_pha_paramotor") {
    return 93;
  }

  if (packageKey === "khau_pha_pkg_1") {
    return 82;
  }

  if (packageKey === "khau_pha_pkg_2") {
    return 97;
  }

  return holidayType === "weekday" ? 82 : 97;
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
    basePriceVND: () => 2_090_000,
    basePriceUSD: () => 80,
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
        },
        controlType: "counter",
        priceVND: 100_000,
        priceUSD: 4,
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
        "Quay phim & chụp hình từ GoPro",
        "Nước uống tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather-dependent)",
        "GoPro photos & videos",
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
        key: "khau_pha_paramotor",
        label: {
          vi: "Bay dù gắn động cơ (paramotor)",
          en: "Paramotor",
          fr: "Paramoteur",
          ru: "Парамотор",
          zh: "动力伞",
          hi: "पैरामोटर",
        },
        priceVND: 2_390_000,
        priceUSD: 93,
        included: {
          vi: [
            "01 chuyến bay từ 10–20 phút (tuỳ chọn)",
            "Quay phim & chụp hình GoPro",
            "Miễn phí cà phê & trà tại điểm bay",
            "Bảo hiểm dù lượn",
            "Giấy chứng nhận",
          ],
          en: [
            "One flight 10–20 minutes (option)",
            "GoPro filming & photography",
            "Free coffee & tea at flight site",
            "Paragliding insurance",
            "Certificate",
          ],
          fr: [
            "Un vol de 10 à 20 minutes (au choix)",
            "Vidéos et photos GoPro",
            "Café et thé gratuits sur le lieu du vol",
            "Assurance parapente",
            "Certificat",
          ],
          ru: [
            "Один полет от 10 до 20 минут (по выбору)",
            "Съемка на GoPro",
            "Бесплатный кофе и чай на месте старта",
            "Страховка парапланериста",
            "Сертификат",
          ],
          zh: [
            "1 次飞行 10-20 分钟（可选）",
            "GoPro 拍摄及摄影",
            "飞行点免费提供咖啡和茶",
            "滑翔伞保险",
            "证书",
          ],
          hi: [
            "10-20 मिनट से 01 उड़ान (वैकल्पिक)",
            "GoPro फिल्मिंग और फोटोग्राफी",
            "उड़ान स्थल पर मुफ्त कॉफी और चाय",
            "पैराग्लाइडिंग बीमा",
            "प्रमाणपत्र",
          ],
        },
        flightTypes: [
          {
            key: "paramotor",
            label: {
              vi: "Bay dù gắn động cơ",
              en: "Paramotor",
              fr: "Paramoteur",
              ru: "Парамотор",
              zh: "动力伞",
              hi: "पैरामोटर",
            },
            fixed: 2_390_000,
          },
        ],
      },
    ],
    services: [
      {
        key: "khau_pha_flag",
        label: {
          vi: "Bay dù cờ đỏ sao vàng – biểu tượng Tổ quốc Việt Nam",
          en: "Flight with National Flag – Symbol of Vietnam",
          fr: "Vol avec drapeau national – Symbole du Vietnam",
          ru: "Полет с национальным флагом – Символ Вьетнама",
          zh: "国旗飞行 – 越南的象征",
          hi: "राष्ट्रीय ध्वज के साथ उड़ान – वियतनाम का प्रतीक",
        },
        controlType: "checkbox",
        priceVND: 100_000,
        priceUSD: 4,
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor"],
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
        },
        controlType: "checkbox",
        priceVND: 700_000,
        priceUSD: 28,
        visibleForPackages: ["khau_pha_paramotor"],
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
        },
        controlType: "checkbox",
        defaultSelected: true,
        requiresPickupInput: true,
        priceVND: 70_000,
        priceUSD: 3,
        exclusiveGroup: "khau_pha_pickup",
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor"],
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
          vi: "Chi phí đón có thể thay đổi tùy vị trí cụ thể và số lượng khách.\nKhách có thể chọn đi xe ôm với giá khoảng 300.000 - 500.000 đ/pax/2 chiều (tùy vị trí đón).",
          en: "Pickup cost may vary depending on the exact location and number of guests.\nGuests may also choose motorbike transfer at around 300,000 - 500,000 VND/pax/round trip, depending on the pickup point.",
        },
        controlType: "checkbox",
        requiresPickupInput: true,
        exclusiveGroup: "khau_pha_pickup",
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor"],
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
        },
        controlType: "counter",
        priceVND: 300_000,
        priceUSD: 12,
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor"],
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
        },
        controlType: "counter",
        priceVND: 500_000,
        priceUSD: 20,
        visibleForPackages: ["khau_pha_pkg_1", "khau_pha_pkg_2", "khau_pha_paramotor"],
        visibleForFlightTypes: ["paragliding", "paramotor"],
      },

    ],
    addons: {} as Record<string, any>,
    included: {
      vi: [
        "01 chuyến bay dù lượn 8–15 phút (tuỳ gió)",
        "Quay phim & chụp hình GoPro",
        "Miễn phí cà phê & trà tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
        "Xe lên/xuống núi",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather dependent)",
        "GoPro filming & photography",
        "Free coffee & tea at flight site",
        "Paragliding insurance",
        "Certificate",
        "Mountain shuttle up/down",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Vidéos et photos GoPro",
        "Café et thé gratuits sur le lieu du vol",
        "Assurance parapente",
        "Certificat",
        "Navette montée/descente",
      ],
      ru: [
        "Один полет на параплане 8–15 минут (по погоде)",
        "Съемка на GoPro",
        "Бесплатный кофе и чай на месте старта",
        "Страховка парапланериста",
        "Сертификат",
        "Трансфер вверх/вниз по горе",
      ],
      zh: [
        "一次滑翔伞飞行 8 - 15 分钟（视风况而定）",
        "GoPro 拍摄及摄影",
        "飞行点免费提供咖啡和茶",
        "滑翔伞保险",
        "证书",
        "上下山接送车",
      ],
      hi: [
        "1 पैराग्लाइडिंग उड़ान 8-15 मिनट (मौसम पर निर्भर)",
        "GoPro फिल्मिंग और फोटोग्राफी",
        "उड़ान स्थल पर मुफ्त कॉफी और चाय",
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
    basePriceVND: () => 1_690_000,
    basePriceUSD: () => 65,
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
        "Quay phim & chụp hình GoPro",
        "Nước uống",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather dependent)",
        "GoPro filming & photography",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Vidéos et photos GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "Один полет на параплане 8–15 минут (по погоде)",
        "Съемка на GoPro",
        "Питьевая вода",
        "Страховка парапланериста",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 拍摄及摄影",
        "饮用水",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "एक पैराग्लाइडिंग उड़ान 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फिल्मिंग और फोटोग्राफी",
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
    basePriceVND: () => 1_690_000,
    basePriceUSD: () => 65,
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
        priceVND: 200_000,
        priceUSD: 8,
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
          vi: "1–3 khách: 1.500.000đ/xe. Từ khách thứ 4 trở đi cộng thêm 350.000đ/người.",
          en: "1–3 guests: 1,500,000 VND/car. From the 4th guest onward, add 350,000 VND/person.",
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
        priceVND: 130_000,
        priceUSD: 5,
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
        pricePerPersonVND: 500_000,
        pricePerPersonUSD: 20,
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
        pricePerPersonVND: 350_000,
        pricePerPersonUSD: 14,
      },
    },
    included: {
      vi: [
        "01 chuyến bay dù lượn từ 8–20 phút (tuỳ gió)",
        "Quay phim & chụp hình GoPro",
        "Nước uống",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–20 minutes (weather dependent)",
        "GoPro filming & photography",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 20 minutes (selon le vent)",
        "Vidéos et photos GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "Один полет на параплане 8–20 минут (по погоде)",
        "Съемка на GoPro",
        "Питьевая вода",
        "Страховка парапланериста",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8 - 20 分钟（视风况而定）",
        "GoPro 拍摄及摄影",
        "饮用水",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "8–20 मिनट की एक पैराग्लाइडिंग उड़ान (मौसम पर निर्भर)",
        "GoPro फिल्मिंग और फोटोग्राफी",
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
    basePriceVND: () => 2_190_000,
    basePriceUSD: () => 80,
    services: [
      {
        key: "quan_ba_pickup",
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực xã Quản Bạ",
          en: "Round-trip pickup in Quan Ba commune",
          fr: "Prise en charge aller-retour dans la commune de Quan Ba",
          ru: "Трансфер туда-обратно в коммуне Куан Ба",
          zh: "管坝社区域往返接送",
          hi: "Quan Ba कम्यून क्षेत्र में राउंड-ट्रिप पिकअप",
        },
        description: {
          vi: "Xe trung chuyển đón trả 2 chiều từ khách sạn trong khu vực Quản Bạ.\nPhí đón có thể thay đổi tùy vị trí khách sạn và số lượng khách bay.",
          en: "Round-trip shuttle pickup from hotels within Quan Ba area.\nPickup cost may vary depending on the hotel location and number of flying guests.",
        },
        controlType: "counter",
        priceVND: 150_000,
        priceUSD: 6,
        requiresPickupInput: true,
      },
    ],
    addons: {
      pickup: {
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực xã Quản Bạ",
          en: "Round-trip pickup in Quan Ba commune",
          fr: "Prise en charge aller-retour dans la commune de Quan Ba",
          ru: "Трансфер туда-обратно в коммуне Куан Ба",
          zh: "管坝社区域往返接送",
          hi: "Quan Ba कम्यून क्षेत्र में राउंड-ट्रिप पिकअप",
        },
        pricePerPersonVND: 150_000,
        pricePerPersonUSD: 6,
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
        pricePerPersonVND: 400_000,
        pricePerPersonUSD: 16,
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
        "01 chuyến bay dù lượn 8-15 phút (tuỳ gió)",
        "Quay phim & chụp hình GoPro",
        "Nước uống tại điểm bay",
        "Bảo hiểm dù lượn",
        "Xe lên/xuống núi",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8-15 minutes (weather dependent)",
        "GoPro filming & photography",
        "Drinking water at flight site",
        "Paragliding insurance",
        "Mountain shuttle up/down",
        "Certificate",
      ],
      fr: [
        "Un vol en parapente de 8 à 15 minutes (selon le vent)",
        "Vidéos et photos GoPro",
        "Eau potable sur le site de vol",
        "Assurance parapente",
        "Navette montée/descente",
        "Certificat",
      ],
      ru: [
        "Один полет на параплане 8-15 минут (по погоде)",
        "Съемка на GoPro",
        "Питьевая вода на месте старта",
        "Страховка парапланериста",
        "Трансфер вверх/вниз по горе",
        "Сертификат",
      ],
      zh: [
        "一次滑翔伞飞行 8-15 分钟（视风况而定）",
        "GoPro 拍摄及摄影",
        "飞行点饮用水",
        "滑翔伞保险",
        "上下山接送车",
        "证书",
      ],
      hi: [
        "एक पैराग्लाइडिंग उड़ान 8-15 मिनट (हवा पर निर्भर)",
        "GoPro फिल्मिंग और फोटोग्राफी",
        "उड़ान स्थल पर पीने का पानी",
        "पैराग्लाइडिंग बीमा",
        "पहाड़ ऊपर/नीचे शटल",
        "प्रमाणपत्र",
      ],
    },
    excluded: { vi: [], en: [], fr: [], ru: [], zh: [], hi: [] },
    coordinates: {},
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

const GROUP_DISCOUNT = [
  { min: 6, vnd: 150_000, usd: 6 },
  { min: 4, vnd: 100_000, usd: 4 },
  { min: 3, vnd: 70_000, usd: 3 },
  { min: 2, vnd: 50_000, usd: 2 },
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

  return LOCATIONS[location].basePriceVND(dateISO);
}

function getBasePriceUSD(p: ComputeParams): number {
  const { location, dateISO, packageKey, flightTypeKey } = p;

  if (location === "khau_pha") {
    return getKhauPhaPackageBasePriceUSD(packageKey, flightTypeKey, dateISO);
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
  const discountTotal = discount * guestsCount;
  const totalAfterDiscount = baseTotal + addonsGrandTotal - discountTotal;
  const totalPerPerson = Math.round(totalAfterDiscount / guestsCount);

  return {
    currency,
    guestsCount,
    holidayType: getHolidayType(dateISO),

    basePricePerPerson: base,
    baseTotal,

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