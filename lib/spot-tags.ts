// lib/spot-tags.ts
/**
 * ĐIỂM BAY GẮN VÀO BÀI VIẾT (trường `spots` của Post) — dùng chung cho
 * admin (client), máy chủ lưu bài và trang /spots, /blog. File thuần TS,
 * KHÔNG import gì từ máy chủ (mongoose…) để trình soạn bài phía client dùng được.
 *
 * Slug trùng slug ở lib/weather-spots.ts. "vien-nam" giữ riêng với "doi-bu"
 * (hai bãi quay hai phía, luật gió ngược nhau) nhưng cả hai cùng đổ về một
 * trang /spots/doi-bu ("Hà Nội"). "dai-tue" chưa có trang điểm bay.
 */

export type SpotTag =
  | "khau-pha"
  | "muong-hoa-sapa"
  | "doi-bu"
  | "vien-nam"
  | "ha-giang"
  | "tram-tau"
  | "son-tra"
  | "dai-tue";

type Lang6 = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export const SPOT_TAGS: {
  key: SpotTag;
  /** Trang /spots/<page> chứa điểm này; null = chưa có trang. */
  page: string | null;
  name: Record<Lang6, string>;
}[] = [
  {
    key: "khau-pha",
    page: "khau-pha",
    name: { vi: "Đèo Khau Phạ (Mù Cang Chải)", en: "Khau Pha Pass (Mu Cang Chai)", fr: "Col de Khau Pha (Mu Cang Chai)", ru: "Перевал Кхау Фа (Му Канг Чай)", zh: "考帕山口（木江界）", hi: "खाउ फ़ा दर्रा (मु कांग चाई)" },
  },
  {
    key: "muong-hoa-sapa",
    page: "muong-hoa-sapa",
    name: { vi: "Mường Hoa (Sa Pa)", en: "Muong Hoa Valley (Sapa)", fr: "Vallée de Muong Hoa (Sapa)", ru: "Долина Мыонг Хоа (Сапа)", zh: "孟花谷（沙坝）", hi: "मुओंग होआ घाटी (सापा)" },
  },
  {
    key: "doi-bu",
    page: "doi-bu",
    name: { vi: "Đồi Bù (Hà Nội)", en: "Doi Bu (Hanoi)", fr: "Doi Bu (Hanoï)", ru: "Дой Бу (Ханой)", zh: "布山（河内）", hi: "डोई बू (हनोई)" },
  },
  {
    key: "vien-nam",
    page: "doi-bu",
    name: { vi: "Núi Viên Nam (Hà Nội)", en: "Vien Nam Peak (Hanoi)", fr: "Mont Vien Nam (Hanoï)", ru: "Гора Виен Нам (Ханой)", zh: "员南山（河内）", hi: "विएन नाम पर्वत (हनोई)" },
  },
  {
    key: "ha-giang",
    page: "ha-giang",
    name: { vi: "Quản Bạ (Hà Giang)", en: "Quan Ba (Ha Giang)", fr: "Quan Ba (Ha Giang)", ru: "Куан Ба (Хазянг)", zh: "管坝（河江）", hi: "क्वान बा (हा जियांग)" },
  },
  {
    key: "tram-tau",
    page: "tram-tau",
    name: { vi: "Phình Hồ – Trạm Tấu", en: "Phinh Ho – Tram Tau", fr: "Phinh Ho – Tram Tau", ru: "Пхинь Хо – Чам Тау", zh: "平湖 – 站濑", hi: "फिन्ह हो – ट्राम ताउ" },
  },
  {
    key: "son-tra",
    page: "son-tra",
    name: { vi: "Bán đảo Sơn Trà (Đà Nẵng)", en: "Son Tra Peninsula (Da Nang)", fr: "Péninsule de Son Tra (Da Nang)", ru: "Полуостров Шонча (Дананг)", zh: "山茶半岛（岘港）", hi: "सोन ट्रा प्रायद्वीप (दा नांग)" },
  },
  {
    key: "dai-tue",
    page: null,
    name: { vi: "Núi Đại Huệ (Nghệ An)", en: "Dai Hue Mountain (Nghe An)", fr: "Mont Dai Hue (Nghe An)", ru: "Гора Дай Хюэ (Нгеан)", zh: "大慧山（乂安）", hi: "दाई ह्वे पर्वत (न्घे आन)" },
  },
];

const KEYS = new Set<string>(SPOT_TAGS.map((s) => s.key));

/** Lọc danh sách điểm bay: chỉ giữ slug hợp lệ, bỏ trùng, giữ thứ tự. */
export function cleanSpotTags(value: unknown): SpotTag[] {
  if (!Array.isArray(value)) return [];
  const out: SpotTag[] = [];
  for (const v of value) {
    const k = String(v ?? "").trim().toLowerCase();
    if (KEYS.has(k) && !out.includes(k as SpotTag)) out.push(k as SpotTag);
  }
  return out;
}

/** Slug điểm (trường `spots`) mà trang /spots/<page> gom bài về. */
export function spotTagsOfPage(page: string): SpotTag[] {
  return SPOT_TAGS.filter((s) => s.page === page).map((s) => s.key);
}

export function spotTagInfo(key: string) {
  return SPOT_TAGS.find((s) => s.key === key) ?? null;
}
