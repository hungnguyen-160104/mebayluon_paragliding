"use client";

import type { LangCode } from "./translations-booking";

export type LocationKey = "sapa" | "khau_pha" | "da_nang" | "ha_noi" | "quan_ba";
export type AddonKey = "pickup" | "flycam" | "camera360";
export type FlightTypeKey = "paragliding" | "paramotor";
export type PackageKey = "khau_pha_pkg_1" | "khau_pha_pkg_2";
export type HolidayType = "weekday" | "weekend" | "holiday";

export type AddonConfig = {
  label: Record<LangCode, string>;
  pricePerPersonVND: number | null;
  /** Nếu có số USD chính thức thì điền; nếu null sẽ fallback quy đổi từ VND */
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
  exclusiveGroup?: string;
  visibleForPackages?: PackageKey[];
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
  flightTypes: FlightTypePriceConfig[];
};

export type LocationConfig = {
  key: LocationKey;
  name: Record<LangCode, string>;

  /** Giá cơ bản theo ngày (có thể đổi cuối tuần / lễ) */
  basePriceVND: (dateISO?: string) => number;
  basePriceUSD: (dateISO?: string) => number;

  addons: Record<AddonKey, AddonConfig>;
  included: Record<LangCode, string[]>;
  excluded?: Record<LangCode, string[]>;
  coordinates?: {
    takeoff?: string;
    landing?: string;
    pickup?: string;
  };

  /**
   * NEW:
   * Dùng cho rule mới, nhưng không phá flow cũ.
   */
  packages?: PackageConfig[];
  services?: DynamicServiceConfig[];
};

const USD_FALLBACK_RATE = 25_000;
export const BIGC_THANG_LONG_MAP = "https://maps.app.goo.gl/3vB2qYuThwBASQZj8";

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

  const mappedByYear = new Set<string>([
    "2026-04-27",
  ]);

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
  dateISO?: string
): number {
  const holidayType = getHolidayType(dateISO);

  if (packageKey === "khau_pha_pkg_1") {
    if (flightTypeKey === "paramotor") {
      if (holidayType === "holiday" || holidayType === "weekend") return 2_520_000;
      return 2_120_000;
    }

    if (holidayType === "holiday" || holidayType === "weekend") return 2_520_000;
    return 2_120_000;
  }

  if (packageKey === "khau_pha_pkg_2") {
    if (flightTypeKey === "paramotor") return 2_390_000;
    return 2_390_000;
  }

  return holidayType === "holiday" || holidayType === "weekend" ? 2_520_000 : 2_120_000;
}

function getKhauPhaPackageBasePriceUSD(
  packageKey?: string,
  flightTypeKey?: string,
  dateISO?: string
): number {
  return toUSDfromVND(getKhauPhaPackageBasePriceVND(packageKey, flightTypeKey, dateISO));
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
    basePriceVND: () => 2_190_000,
    basePriceUSD: () => 85,
    addons: {
      pickup: {
        label: {
            vi: "Xe đón trả tại khách sạn (Trung tâm Sapa, bản Lao Chải, bản Tả Van)",
  en: "Hotel pickup and drop-off (Sapa Center, Lao Chai Village, Ta Van Village)",
  fr: "Prise en charge et retour à l’hôtel (centre de Sapa, village de Lao Chai, village de Ta Van)",
  ru: "Трансфер от/до отеля (центр Сапы, деревни Лао Чай и Та Ван)",
  zh: "酒店接送（沙坝中心、老柴村、塔万村）",
  hi: "होटल पिकअप और ड्रॉप-ऑफ (सापा केंद्र, लाओ चाई गाँव, ता वान गाँव)",
        },
        pricePerPersonVND: 100_000,
        pricePerPersonUSD: 5,
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
        "Miễn phí cà phê & trà tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather-dependent)",
        "GoPro photos & videos",
        "Free coffee & tea at the site",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "1 vol en parapente 8–15 min (selon vent)",
        "Photos & vidéos GoPro",
        "Café & thé offerts sur le site",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "1 полёт на параплане 8–15 мин (зависит от ветра)",
        "Фото и видео на GoPro",
        "Бесплатный кофе и чай на локации",
        "Страховка",
        "Сертификат",
      ],
      zh: [
        "1次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 拍摄照片与视频",
        "飞行点免费咖啡与茶",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "1 पैराग्लाइडिंग फ़्लाइट 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फ़ोटो और वीडियो",
        "साइट पर मुफ्त कॉफी और चाय",
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
      vi: "Đèo Khau Phạ (Tú Lê - Mù Cang Chải)",
      en: "Khau Pha Pass (Tu Le - Mu Cang Chai)",
      fr: "Col de Khau Pha (Tu Le - Mu Cang Chai)",
      ru: "Перевал Кхау Фа (Ту Ле - Му Канг Чай)",
      zh: "考帕山口（图勒－木江界）",
      hi: "खाउ फ़ा दर्रा (टू ले - मु कांग चाई)",
    },
    basePriceVND: (dateISO) =>
      getHolidayType(dateISO) === "weekday" ? 2_120_000 : 2_520_000,
    basePriceUSD: (dateISO) =>
      toUSDfromVND(
        getHolidayType(dateISO) === "weekday" ? 2_120_000 : 2_520_000
      ),
    packages: [
      {
        key: "khau_pha_pkg_1",
        label: {
          vi: "Khau Phạ - Gói 1",
          en: "Khau Pha - Package 1",
          fr: "Khau Pha - Forfait 1",
          ru: "Khau Pha - Пакет 1",
          zh: "Khau Pha - 套餐 1",
          hi: "Khau Pha - पैकेज 1",
        },
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
            weekday: 2_120_000,
            weekend: 2_520_000,
            holiday: 2_520_000,
          },
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
            weekday: 2_120_000,
            weekend: 2_520_000,
            holiday: 2_520_000,
          },
        ],
      },
      {
        key: "khau_pha_pkg_2",
        label: {
          vi: "Khau Phạ - Gói 2",
          en: "Khau Pha - Package 2",
          fr: "Khau Pha - Forfait 2",
          ru: "Khau Pha - Пакет 2",
          zh: "Khau Pha - 套餐 2",
          hi: "Khau Pha - पैकेज 2",
        },
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
            fixed: 2_390_000,
          },
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
        key: "khau_pha_pkg_1_shuttle",
        label: {
          vi: "Xe trung chuyển lên/xuống núi",
          en: "Mountain shuttle",
          fr: "Navette montagne",
          ru: "Горный трансфер",
          zh: "上下山接驳车",
          hi: "माउंटेन शटल",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 70_000,
        priceUSD: 3,
        visibleForPackages: ["khau_pha_pkg_1"],
      },
      {
        key: "khau_pha_pkg_1_garrya_pickup",
        label: {
          vi: "Xe đón Garrya / Mù Cang Chải",
          en: "Pickup from Garrya / Mu Cang Chai",
          fr: "Transfert Garrya / Mu Cang Chai",
          ru: "Трансфер Garrya / Mu Cang Chai",
          zh: "Garrya / 木仓寨接送",
          hi: "Garrya / Mu Cang Chai पिकअप",
        },
        controlType: "checkbox",
        note: {
          vi: "Tính theo block 4 khách: 700.000đ/xe/1 chiều.",
          en: "Charged by blocks of 4 guests: 700,000 VND/car/one way.",
          fr: "Facturé par bloc de 4 passagers : 700 000 VND/voiture/aller simple.",
          ru: "Стоимость по блокам по 4 гостя: 700 000 VND/машина/в одну сторону.",
          zh: "按每 4 位客人为一个区块计费：700,000 VND/车/单程。",
          hi: "4 यात्रियों के ब्लॉक के अनुसार शुल्क: 700,000 VND/कार/एक तरफ।",
        },
        requiresPickupInput: true,
        visibleForPackages: ["khau_pha_pkg_1"],
      },
      {
        key: "khau_pha_pkg_2_tu_le_pickup",
        label: {
          vi: "Đón trả trong khu vực Tú Lệ",
          en: "Pickup in Tu Le area",
          fr: "Prise en charge zone Tu Le",
          ru: "Трансфер в районе Tu Le",
          zh: "Tú Lệ 区域接送",
          hi: "Tu Le क्षेत्र पिकअप",
        },
        controlType: "checkbox",
        priceVND: 70_000,
        priceUSD: 3,
        requiresPickupInput: true,
        exclusiveGroup: "khau_pha_pkg_2_pickup",
        visibleForPackages: ["khau_pha_pkg_2"],
      },
      {
        key: "khau_pha_pkg_2_garrya_pickup",
        label: {
          vi: "Đón Garrya / Mù Cang Chải",
          en: "Pickup from Garrya / Mu Cang Chai",
          fr: "Transfert Garrya / Mu Cang Chai",
          ru: "Трансфер Garrya / Mu Cang Chai",
          zh: "Garrya / 木仓寨接送",
          hi: "Garryya / Mu Cang Chai पिकअप",
        },
        controlType: "checkbox",
        note: {
          vi: "Tính theo block 4 khách: 700.000đ/xe/1 chiều.",
          en: "Charged by blocks of 4 guests: 700,000 VND/car/one way.",
          fr: "Facturé par bloc de 4 passagers : 700 000 VND/voiture/aller simple.",
          ru: "Стоимость по блокам по 4 гостя: 700 000 VND/машина/в одну сторону.",
          zh: "按每 4 位客人为一个区块计费：700,000 VND/车/单程。",
          hi: "4 यात्रियों के ब्लॉक के अनुसार शुल्क: 700,000 VND/कार/एक तरफ।",
        },
        requiresPickupInput: true,
        exclusiveGroup: "khau_pha_pkg_2_pickup",
        visibleForPackages: ["khau_pha_pkg_2"],
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
      pickup: {
        label: {
          vi: "Xe đón trả (nếu có)",
          en: "Pickup (if available)",
          fr: "Transfert (si dispo.)",
          ru: "Трансфер (если доступно)",
          zh: "接送（如提供）",
          hi: "पिकअप (यदि उपलब्ध)",
        },
        pricePerPersonVND: null,
        pricePerPersonUSD: null,
      },
    },
    included: {
      vi: [
        "01 chuyến bay dù lượn 8–15 phút (tuỳ gió)",
        "Quay phim & chụp hình GoPro",
        "Miễn phí cà phê & trà tại điểm bay",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
        "Xe lên/xuống núi",
        "Quà lưu niệm",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather-dependent)",
        "GoPro photos & videos",
        "Free coffee & tea at the site",
        "Paragliding insurance",
        "Certificate",
        "Mountain shuttle up & down",
        "Souvenir",
      ],
      fr: [
        "1 vol en parapente 8–15 min (selon vent)",
        "Photos & vidéos GoPro",
        "Café & thé offerts sur le site",
        "Assurance parapente",
        "Certificat",
        "Navette montée/descente",
        "Souvenir",
      ],
      ru: [
        "1 полёт на параплане 8–15 мин (зависит от ветра)",
        "Фото и видео на GoPro",
        "Бесплатный кофе и чай на локации",
        "Страховка",
        "Сертификат",
        "Трансфер в гору и обратно",
        "Сувенир",
      ],
      zh: [
        "1次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 拍摄照片与视频",
        "飞行点免费咖啡与茶",
        "滑翔伞保险",
        "证书",
        "上下山接驳车",
        "纪念品",
      ],
      hi: [
        "1 पैराग्लाइडिंग फ़्लाइट 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फ़ोटो और वीडियो",
        "साइट पर मुफ्त कॉफी और चाय",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
        "पहाड़ पर ऊपर/नीचे शटल",
        "स्मृति-चिह्न",
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
      vi: "Đà Nẵng ",
      en: "Da Nang ",
      fr: "Da Nang ",
      ru: "Дананг ",
      zh: "岘港 ",
      hi: "दा नांग ",
    },
    basePriceVND: () => 1_690_000,
    basePriceUSD: () => 65,
    services: [
      {
        key: "da_nang_mountain_shuttle",
        label: {
          vi: "Xe di chuyển lên điểm cất cánh",
          en: "Shuttle to takeoff point",
          fr: "Navette vers le décollage",
          ru: "Трансфер до точки старта",
          zh: "前往起飞点接驳车",
          hi: "टेकऑफ पॉइंट शटल",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 100_000,
        priceUSD: 4,
      },
      {
        key: "da_nang_hotel_pickup",
        label: {
          vi: "Đón trả 2 chiều từ khách sạn",
          en: "Round-trip hotel pickup",
          fr: "Transfert A/R depuis l’hôtel",
          ru: "Трансфер туда-обратно от отеля",
          zh: "酒店往返接送",
          hi: "राउंड-ट्रिप होटल पिकअप",
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
          fr: "Transfert centre-ville",
          ru: "Трансфер из центра",
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
        "Xe lên/xuống núi",
      ],
      en: [
        "One paragliding flight 8–15 minutes (weather-dependent)",
        "GoPro photos & videos",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
        "Mountain shuttle up & down",
      ],
      fr: [
        "1 vol en parapente 8–15 min (selon vent)",
        "Photos & vidéos GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
        "Navette montée/descente",
      ],
      ru: [
        "1 полёт на параплане 8–15 мин (зависит от ветра)",
        "Фото и видео на GoPro",
        "Питьевая вода",
        "Страховка",
        "Сертификат",
        "Трансфер в гору и обратно",
      ],
      zh: [
        "1次滑翔伞飞行 8–15 分钟（视风况而定）",
        "GoPro 拍摄照片与视频",
        "饮用水",
        "滑翔伞保险",
        "证书",
        "上下山接驳车",
      ],
      hi: [
        "1 पैराग्लाइडिंग फ़्लाइट 8–15 मिनट (हवा पर निर्भर)",
        "GoPro फ़ोटो और वीडियो",
        "पीने का पानी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
        "पहाड़ पर ऊपर/नीचे शटल",
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
      takeoff: "https://maps.app.goo.gl/6NDgTSg8PZb5BtGX8",
      landing: "https://maps.app.goo.gl/ETF9PiL4ijd5hYKQ6",
    },
  },

  ha_noi: {
    key: "ha_noi",
    name: {
        vi: "Hà Nội (Đồi Bù - Viên Nam)",
        en: "Hanoi (Doi Bu - Vien Nam)",
        fr: "Hanoï (Doi Bu - Vien Nam)",
        ru: "Ханой (Дой Бу - Вьен Нам)",
        zh: "河内（布丘－边南）",
        hi: "हनोई (दोई बू - वियन नाम)",
    },
    basePriceVND: () => 1_690_000,
    basePriceUSD: () => 65,
    services: [
      {
        key: "ha_noi_fixed_pickup",
        label: {
          vi: "Xe đón/trả từ BigC Thăng Long",
          en: "Round-trip pickup from BigC Thang Long",
          fr: "Transfert A/R depuis BigC Thang Long",
          ru: "Трансфер туда-обратно от BigC Thang Long",
          zh: "BigC Thăng Long 往返接送",
          hi: "BigC Thang Long से राउंड-ट्रिप पिकअप",
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
          fr: "Transfert privé depuis l’hôtel",
          ru: "Индивидуальный трансфер от отеля",
          zh: "酒店专车接送",
          hi: "प्राइवेट होटल पिकअप",
        },
        controlType: "checkbox",
        note: {
          vi: "1–3 khách: 1.500.000đ/xe. Từ khách thứ 4 trở đi cộng thêm 350.000đ/người.",
          en: "1–3 guests: 1,500,000 VND/car. From the 4th guest onward, add 350,000 VND/person.",
          fr: "1–3 passagers : 1 500 000 VND/voiture. À partir du 4e passager, ajouter 350 000 VND/personne.",
          ru: "1–3 гостя: 1 500 000 VND/машина. Начиная с 4-го гостя, добавляется 350 000 VND/чел.",
          zh: "1–3 位客人：1,500,000 VND/车。第 4 位起每人加收 350,000 VND。",
          hi: "1–3 यात्री: 1,500,000 VND/कार। चौथे यात्री से आगे 350,000 VND/व्यक्ति अतिरिक्त।",
        },
        requiresPickupInput: true,
        exclusiveGroup: "ha_noi_pickup_group",
      },
      {
        key: "ha_noi_mountain_shuttle",
        label: {
          vi: "Xe chuyên dụng lên núi",
          en: "Special mountain vehicle",
          fr: "Véhicule spécialisé montagne",
          ru: "Специальный горный транспорт",
          zh: "专用上山车辆",
          hi: "स्पेशल माउंटेन वाहन",
        },
        controlType: "checkbox",
        defaultSelected: true,
        priceVND: 130_000,
        priceUSD: 5,
      },
      {
        key: "ha_noi_sunset",
        label: {
          vi: "Hoàng hôn trên đỉnh núi",
          en: "Sunset on the mountain top",
          fr: "Coucher du soleil au sommet",
          ru: "Закат на вершине",
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
          vi: "Xe đón/trả từ BigC Thăng Long",
          en: "Round-trip pickup from BigC Thang Long",
          fr: "Transfert A/R depuis BigC Thang Long",
          ru: "Трансфер туда-обратно от BigC Thang Long",
          zh: "BigC Thăng Long 往返接送",
          hi: "BigC Thang Long से राउंड-ट्रिप पिकअप",
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
          vi: "Flycam",
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
        "01 chuyến bay dù lượn 8–20 phút (tuỳ gió)",
        "Quay phim & chụp hình GoPro",
        "Nước uống",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
        "Xe lên/xuống núi",
      ],
      en: [
        "One paragliding flight 8–20 minutes (weather-dependent)",
        "GoPro photos & videos",
        "Drinking water",
        "Paragliding insurance",
        "Certificate",
        "Mountain shuttle up & down",
      ],
      fr: [
        "1 vol en parapente 8–20 min (selon vent)",
        "Photos & vidéos GoPro",
        "Eau potable",
        "Assurance parapente",
        "Certificat",
        "Navette montée/descente",
      ],
      ru: [
        "1 полёт на параплане 8–20 мин (зависит от ветра)",
        "Фото и видео на GoPro",
        "Питьевая вода",
        "Страховка",
        "Сертификат",
        "Трансфер в гору и обратно",
      ],
      zh: [
        "1次滑翔伞飞行 8–20 分钟（视风况而定）",
        "GoPro 拍摄照片与视频",
        "饮用水",
        "滑翔伞保险",
        "证书",
        "上下山接驳车",
      ],
      hi: [
        "1 पैराग्लाइडिंग फ़्लाइट 8–20 मिनट (हवा पर निर्भर)",
        "GoPro फ़ोटो और वीडियो",
        "पीने का पानी",
        "पैराग्लाइडिंग बीमा",
        "प्रमाणपत्र",
        "पहाड़ पर ऊपर/नीचे शटल",
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
      vi: "Hà Giang (Quản Bạ)",
      en: "Ha Giang (Quan Ba)",
      fr: "Ha Giang (Quan Ba)",
      ru: "Хазянг (Куан Ба)",
      zh: "河江（管坝）",
      hi: "हा जियांग (क्वान बा)",
    },
    basePriceVND: () => 2_090_000,
    basePriceUSD: () => 80,
    services: [
      {
        key: "quan_ba_pickup",
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực Quản Bạ",
          en: "Round-trip pickup in Quan Ba area",
          fr: "Transfert A/R dans la zone de Quan Ba",
          ru: "Трансфер туда-обратно в районе Quan Ba",
          zh: "管坝区域往返接送",
          hi: "Quan Ba क्षेत्र राउंड-ट्रिप पिकअप",
        },
        controlType: "checkbox",
        priceVND: 150_000,
        priceUSD: 6,
        requiresPickupInput: true,
      },
    ],
    addons: {
      pickup: {
        label: {
          vi: "Xe đón trả 2 chiều trong khu vực Quản Bạ",
          en: "Round-trip pickup in Quan Ba area",
          fr: "Transfert A/R dans la zone de Quan Ba",
          ru: "Трансфер туда-обратно в районе Quan Ba",
          zh: "管坝区域往返接送",
          hi: "Quan Ba क्षेत्र राउंड-ट्रिप पिकअप",
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
        pricePerPersonVND: 350_000,
        pricePerPersonUSD: 14,
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
        "01 chuyến bay dù lượn",
        "Quay phim & chụp hình GoPro",
        "Bảo hiểm dù lượn",
        "Giấy chứng nhận",
      ],
      en: [
        "One paragliding flight",
        "GoPro photos & videos",
        "Paragliding insurance",
        "Certificate",
      ],
      fr: [
        "1 vol en parapente",
        "Photos & vidéos GoPro",
        "Assurance parapente",
        "Certificat",
      ],
      ru: [
        "1 полёт на параплане",
        "Фото и видео на GoPro",
        "Страховка",
        "Сертификат",
      ],
      zh: [
        "1次滑翔伞飞行",
        "GoPro 拍摄照片与视频",
        "滑翔伞保险",
        "证书",
      ],
      hi: [
        "1 पैराग्लाइडिंग फ़्लाइट",
        "GoPro फ़ोटो और वीडियो",
        "पैराग्लाइडिंग बीमा",
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
export function formatByLang(lang: LangCode, vnd: number, usd: number): string {
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

export function computePriceByLang(p: ComputeParams, lang: LangCode): ComputeResult {
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
  currency: "VND" | "USD"
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
    const a = cfg.addons[key];

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

  const addonsGrandTotal = Object.values(addonsTotal).reduce((s, x) => s + x, 0);

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
  return loc.name[lang] ?? loc.name.vi;
}
export function getAddonLabel(
  cfg: LocationConfig,
  key: AddonKey,
  lang: LangCode
): string {
  const a = cfg.addons[key];
  return a?.label?.[lang] ?? a?.label?.vi ?? key;
}