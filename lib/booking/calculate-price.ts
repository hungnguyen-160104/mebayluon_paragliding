"use client";

import type { LangCode } from "./translations-booking";

export type LocationKey = "sapa" | "khau_pha" | "da_nang" | "ha_noi";
export type AddonKey = "pickup" | "flycam" | "camera360";

type AddonConfig = {
  label: Record<LangCode, string>;
  pricePerPersonVND: number | null;
  /** Nếu có số USD chính thức thì điền; nếu null sẽ fallback quy đổi từ VND */
  pricePerPersonUSD: number | null;
};

type LocationConfig = {
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
};

const USD_FALLBACK_RATE = 25_000; // dùng khi không có số USD chính thức

function toUSDfromVND(vnd: number): number {
  return Math.round(vnd / USD_FALLBACK_RATE);
}
function isWeekend(dateISO?: string): boolean {
  if (!dateISO) return false;
  const d = new Date(dateISO);
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

export const LOCATIONS: Record<LocationKey, LocationConfig> = {
  sapa: {
    key: "sapa",
    name: {
      vi: "Lào Cai (Sapa)",
      en: "Lao Cai (Sapa)",
      fr: "Lao Cai (Sapa)",
      ru: "Лаокай (Сапа)",
      zh: "老街（沙坝）",
      hi: "लाओ काई (सापा)",
    },
    basePriceVND: () => 2_190_000,
    basePriceUSD: () => 85,
    addons: {
      pickup: {
        label: {
          vi: "Xe đón trả khách sạn",
          en: "Hotel pickup (Sapa area)",
          fr: "Prise en charge à l’hôtel (Sapa)",
          ru: "Трансфер от/до отеля (Сапа)",
          zh: "酒店接送（沙坝区域）",
          hi: "होटल पिकअप (सापा क्षेत्र)",
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
      vi: "Yên Bái (Đèo Khau Phạ – Mù Cang Chải)",
      en: "Yen Bai (Khau Pha Pass – Mu Cang Chai)",
      fr: "Yen Bai (Col de Khau Pha – Mu Cang Chai)",
      ru: "Йенбай (пер. Хаупха – Му Канг Чай)",
      zh: "安沛（考帕山口 – 木仓寨）",
      hi: "येन बाई (खाउ फ़ा दर्रा – मु कांग चाई)",
    },
    basePriceVND: (dateISO) => (isWeekend(dateISO) ? 2_590_000 : 2_190_000),
    basePriceUSD: (dateISO) => (isWeekend(dateISO) ? 100 : 85),
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
      vi: "Đà Nẵng (Bán đảo Sơn Trà)",
      en: "Da Nang (Son Tra Peninsula)",
      fr: "Da Nang (Péninsule de Son Tra)",
      ru: "Дананг (полуостров Сонча)",
      zh: "岘港（山茶半岛）",
      hi: "दा नांग (सोन त्रà प्रायद्वीप)",
    },
    basePriceVND: () => 1_790_000,
    basePriceUSD: () => 70,
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
          vi: "Đưa đón trung tâm TP (không bao gồm)",
          en: "City center pickup (not included)",
          fr: "Transfert centre-ville (non inclus)",
          ru: "Трансфер из центра (не включён)",
          zh: "市中心接送（不包含）",
          hi: "सिटी सेंटर पिकअप (शामिल नहीं)",
        },
        pricePerPersonVND: null,
        pricePerPersonUSD: null,
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
      vi: ["Bữa ăn", "Đưa đón từ trung tâm thành phố"],
      en: ["Meals", "City center pickup"],
      fr: ["Repas", "Transfert depuis le centre-ville"],
      ru: ["Питание", "Трансфер из центра города"],
      zh: ["餐食", "市中心接送"],
      hi: ["भोजन", "सिटी सेंटर पिकअप"],
    },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/6NDgTSg8PZb5BtGX8",
      landing: "https://maps.app.goo.gl/ETF9PiL4ijd5hYKQ6",
    },
  },

  ha_noi: {
    key: "ha_noi",
    name: {
      vi: "Hà Nội (Đồi Bù / Viên Nam)",
      en: "Hanoi (Doi Bu / Vien Nam)",
      fr: "Hanoï (Doi Bu / Vien Nam)",
      ru: "Ханой (Дойбу / Вьен Нам)",
      zh: "河内（Đồi Bù / Viên Nam）",
      hi: "हनोई (दोई बू / विएन नाम)",
    },
    basePriceVND: () => 1_850_000,
    basePriceUSD: () => 75,
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
          vi: "Flycam (không có dịch vụ)",
          en: "Flycam (not available)",
          fr: "Flycam (indisponible)",
          ru: "Flycam (нет услуги)",
          zh: "航拍（暂无服务）",
          hi: "फ्लाईकैम (उपलब्ध नहीं)",
        },
        pricePerPersonVND: null,
        pricePerPersonUSD: null,
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
      vi: ["Flycam (drone camera)", "Bữa ăn"],
      en: ["Flycam (drone camera)", "Meals"],
      fr: ["Flycam (drone)", "Repas"],
      ru: ["Flycam (дрон)", "Питание"],
      zh: ["航拍（无人机）", "餐食"],
      hi: ["फ्लाईकैम (ड्रोन कैमरा)", "भोजन"],
    },
    coordinates: {
      takeoff: "https://maps.app.goo.gl/RxfRus3UfSz2m4nP6",
      pickup: "https://maps.app.goo.gl/3vB2qYuThwBASQZj8",
    },
  },
};

/** Định dạng tiền theo ngôn ngữ */
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

/** Tầng giảm giá theo số lượng (áp dụng chung) */
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

  /** backward compat */
  addons?: Partial<Record<AddonKey, boolean>>;

  /** NEW */
  addonsQty?: Partial<Record<AddonKey, number>>;
};

export type ComputeResult = {
  currency: "VND" | "USD";
  guestsCount: number;

  basePricePerPerson: number;
  baseTotal: number;

  /** backward compat: đơn giá addon (chỉ set >0 nếu qty>0) */
  addonsPerPerson: Record<AddonKey, number>;

  /** NEW: breakdown theo qty */
  addonsUnitPrice: Record<AddonKey, number>;
  addonsQty: Record<AddonKey, number>;
  addonsTotal: Record<AddonKey, number>;
  addonsGrandTotal: number;

  discountPerPerson: number;
  discountTotal: number;

  /** Trung bình/khách (đã tính addons theo qty -> chia đều) */
  totalPerPerson: number;

  totalAfterDiscount: number;
};

/** Backward-compat: trả VND */
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

function computePriceByCurrency(p: ComputeParams, currency: "VND" | "USD"): ComputeResult {
  const {
    location,
    guestsCount: rawGuests,
    dateISO,
    addons = {},
    addonsQty = {},
  } = p;

  const guestsCount = Math.max(1, clampInt(rawGuests ?? 1, 1, 100));
  const cfg = LOCATIONS[location];

  const base = currency === "VND" ? cfg.basePriceVND(dateISO) : cfg.basePriceUSD(dateISO);

  const addonsPerPerson: Record<AddonKey, number> = { pickup: 0, flycam: 0, camera360: 0 };
  const addonsUnitPrice: Record<AddonKey, number> = { pickup: 0, flycam: 0, camera360: 0 };
  const addonsQtyNorm: Record<AddonKey, number> = { pickup: 0, flycam: 0, camera360: 0 };
  const addonsTotal: Record<AddonKey, number> = { pickup: 0, flycam: 0, camera360: 0 };

  (["pickup", "flycam", "camera360"] as AddonKey[]).forEach((key) => {
    const a = cfg.addons[key];

    // unit price
    let unit = currency === "VND" ? a.pricePerPersonVND : a.pricePerPersonUSD;
    if (unit == null) {
      if (currency === "USD" && a.pricePerPersonVND != null) {
        unit = toUSDfromVND(a.pricePerPersonVND);
      } else {
        unit = 0;
      }
    }
    addonsUnitPrice[key] = unit ?? 0;

    // qty (NEW) ưu tiên addonsQty; fallback boolean -> guestsCount
    let qty = addonsQty?.[key];
    if (qty == null) qty = addons?.[key] ? guestsCount : 0;

    qty = clampInt(qty ?? 0, 0, guestsCount);

    // nếu addon không available (unit=0 vì null) thì ép qty=0
    if (!addonsUnitPrice[key]) qty = 0;

    addonsQtyNorm[key] = qty;
    addonsTotal[key] = addonsUnitPrice[key] * qty;

    // backward compat
    addonsPerPerson[key] = qty > 0 ? addonsUnitPrice[key] : 0;
  });

  const addonsGrandTotal = Object.values(addonsTotal).reduce((s, x) => s + x, 0);

  // giảm theo nhóm
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

  // trung bình/khách (làm tròn để tránh số lẻ khó nhìn)
  const totalPerPerson = Math.round(totalAfterDiscount / guestsCount);

  return {
    currency,
    guestsCount,

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

/** Helpers để lấy tên địa điểm / label addon theo ngôn ngữ */
export function getLocationName(loc: LocationConfig, lang: LangCode): string {
  return loc.name[lang] ?? loc.name.vi;
}
export function getAddonLabel(cfg: LocationConfig, key: AddonKey, lang: LangCode): string {
  const a = cfg.addons[key];
  return a?.label?.[lang] ?? a?.label?.vi ?? key;
}