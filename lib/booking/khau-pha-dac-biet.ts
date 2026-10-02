// lib/booking/khau-pha-dac-biet.ts
/**
 * CHUYẾN BAY ĐẶC BIỆT KHAU PHẠ (chủ chốt 02/10/2026).
 *
 * Trước đây chỉ có MỘT dịch vụ gộp cho dù gắn động cơ:
 * "BAY SĂN MÂY, BAY HOÀNG HÔN, BAY BÌNH MINH (2.000m)" — khoá
 * `khau_pha_paramotor_2000m`, 700k. Nay tách thành từng lựa chọn, và dù
 * không động cơ (PG) cũng có bình minh / hoàng hôn / bay lâu:
 *
 *   PPG: "Gói đặc biệt" (chủ chốt lại 02/10) — MỘT lựa chọn: phi công bay bình minh,
 *        hoàng hôn hoặc săn mây (~2.000m) tuỳ trời; +700k/khách,
 *        bay 20–25 phút. Bay lâu (20–25 phút) +700k nếu chọn RIÊNG.
 *   PG : bình minh / hoàng hôn — chuyến bay riêng 9–15 phút, +700k/khách.
 *        Bay lâu 20–25 phút +700k (PG đa số chỉ bay lâu được buổi trưa).
 *   Cả hai: khách đã chọn bình minh / hoàng hôn / săn mây thì BAY LÂU MIỄN PHÍ.
 *
 * Để ở một file riêng (giống combo ảnh ở lib/booking/image-combo.ts) vì cùng
 * một quy tắc phải ra cùng một con số ở bước chọn dịch vụ, bước xác nhận, vé,
 * email, Telegram và máy chủ.
 *
 * MIỄN PHÍ TÍNH THEO TỪNG KHÁCH: mỗi suất bay đặc biệt "kèm" được một suất bay
 * lâu. 2 khách PPG chọn 2 hoàng hôn + 2 bay lâu → cả 2 bay lâu miễn phí;
 * 1 hoàng hôn + 2 bay lâu → 1 miễn phí, 1 tính tiền. Một booking web chỉ có
 * MỘT loại bay (PG hoặc PPG) nên đếm chung trong booking là đúng theo khách.
 *
 * Bình minh / hoàng hôn / săn mây của CÙNG một khách loại trừ nhau (một chuyến
 * bay không thể vừa bình minh vừa hoàng hôn): tổng ba thứ ≤ số khách. Cấu hình
 * gắn `capGroup: KP_DAC_BIET_CAP_GROUP`; bước chọn dịch vụ tự giữ trần, máy chủ
 * chặn lại lần nữa (app/api/booking/create/route.ts).
 */

export const KP_DAC_BIET_VND = 700_000;
export const KP_DAC_BIET_USD = 28;

/** Nhóm dịch vụ có chung trần "tổng số lượng ≤ số khách". */
export const KP_DAC_BIET_CAP_GROUP = "khau_pha_dac_biet";

export const KP_KEYS = {
  pgSunrise: "khau_pha_pg_sunrise",
  pgSunset: "khau_pha_pg_sunset",
  pgLongFlight: "khau_pha_pg_long_flight",
  /**
   * PPG "Gói đặc biệt" (chủ 02/10/2026, lần 2): GỘP săn mây / bình minh /
   * hoàng hôn thành MỘT lựa chọn — khách mua gói, phi công bay một trong ba
   * tuỳ trời hôm đó (có hoàng hôn thì không có mây, có mây thì không có
   * hoàng hôn/bình minh).
   */
  ppgDacBiet: "khau_pha_ppg_dac_biet",
  /** Ba khoá PPG tách rời (bán vài giờ ngày 02/10) — nay là KHOÁ CŨ, chỉ để hiển thị/đồng bộ. */
  ppgCloud: "khau_pha_ppg_san_may",
  ppgSunrise: "khau_pha_ppg_sunrise",
  ppgSunset: "khau_pha_ppg_sunset",
  ppgLongFlight: "khau_pha_ppg_long_flight",
  /** Khoá gộp cũ — chỉ còn để booking cũ trong DB hiển thị đúng. */
  legacy2000m: "khau_pha_paramotor_2000m",
} as const;

export type DacBietKind = "sunrise" | "sunset" | "cloud" | "package" | "legacy";

/** Loại chuyến bay đặc biệt của một khoá dịch vụ; không phải thì null. */
export function dacBietKindOf(key: unknown): DacBietKind | null {
  const k = String(key || "");
  if (k === KP_KEYS.legacy2000m) return "legacy";
  if (k === KP_KEYS.ppgDacBiet) return "package";
  if (k === KP_KEYS.ppgCloud) return "cloud";
  if (k === KP_KEYS.pgSunrise || k === KP_KEYS.ppgSunrise) return "sunrise";
  if (k === KP_KEYS.pgSunset || k === KP_KEYS.ppgSunset) return "sunset";
  return null;
}

export const isLongFlightKey = (key: unknown) =>
  key === KP_KEYS.pgLongFlight || key === KP_KEYS.ppgLongFlight;

/** Khoá thuộc nhóm bay đặc biệt / bay lâu — dùng để hiện lời hoàn phụ phí. */
export const isKhauPhaSpecialKey = (key: unknown) =>
  dacBietKindOf(key) !== null || isLongFlightKey(key);

export type DacBietServiceState = { key: string; selected?: boolean; qty?: number };

function qtyOf(s: DacBietServiceState): number {
  if (!s.selected) return 0;
  return Math.max(1, Math.floor(Number(s.qty) || 1));
}

/** Tổng số suất bình minh + hoàng hôn + săn mây (kể cả khoá gộp cũ). */
export function dacBietCount(services: DacBietServiceState[]): number {
  return services.reduce((n, s) => (dacBietKindOf(s.key) ? n + qtyOf(s) : n), 0);
}

export function longFlightCount(services: DacBietServiceState[]): number {
  return services.reduce((n, s) => (isLongFlightKey(s.key) ? n + qtyOf(s) : n), 0);
}

/** Số suất bay lâu được MIỄN PHÍ = min(bay lâu, bay đặc biệt). */
export function longFlightFreeCount(services: DacBietServiceState[]): number {
  return Math.min(longFlightCount(services), dacBietCount(services));
}

export const longFlightFreeVND = (services: DacBietServiceState[]) =>
  longFlightFreeCount(services) * KP_DAC_BIET_VND;
export const longFlightFreeUSD = (services: DacBietServiceState[]) =>
  longFlightFreeCount(services) * KP_DAC_BIET_USD;

/** Chuyển `data.services` (map khoá → trạng thái) sang mảng cho các hàm trên. */
export function toDacBietStates(
  services: Record<string, { selected?: boolean; qty?: number } | undefined> | undefined | null,
): DacBietServiceState[] {
  return Object.entries(services || {}).map(([key, st]) => ({
    key,
    selected: !!st?.selected,
    qty: Number(st?.qty) || 1,
  }));
}

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";
const langOf = (lang: unknown): Lang => {
  const l = String(lang ?? "vi").slice(0, 2).toLowerCase();
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(l as Lang) ? (l as Lang) : "vi";
};

const KIND_NAME: Record<DacBietKind, Record<Lang, string>> = {
  sunrise: { vi: "bình minh", en: "sunrise", fr: "lever du soleil", ru: "рассвет", zh: "日出", hi: "सूर्योदय" },
  sunset: { vi: "hoàng hôn", en: "sunset", fr: "coucher du soleil", ru: "закат", zh: "日落", hi: "सूर्यास्त" },
  cloud: { vi: "săn mây", en: "cloud hunting", fr: "chasse aux nuages", ru: "охота за облаками", zh: "追云", hi: "क्लाउड हंटिंग" },
  package: { vi: "gói đặc biệt", en: "special flight", fr: "vol spécial", ru: "особый полёт", zh: "特别飞行套餐", hi: "विशेष उड़ान" },
  legacy: { vi: "bay đặc biệt", en: "special flight", fr: "vol spécial", ru: "особый полёт", zh: "特别飞行", hi: "विशेष उड़ान" },
};

const FREE_TEMPLATE: Record<Lang, string> = {
  vi: "Bay lâu: miễn phí kèm {x}",
  en: "Long flight: free with {x}",
  fr: "Vol long : offert avec {x}",
  ru: "Долгий полёт: бесплатно вместе с «{x}»",
  zh: "长时间飞行：搭配{x}免费",
  hi: "लंबी उड़ान: {x} के साथ मुफ़्त",
};

/**
 * Nhãn dòng miễn phí, ví dụ "Bay lâu: miễn phí kèm hoàng hôn". Kể đúng các
 * loại khách đã chọn để khách hiểu vì sao được miễn.
 */
export function longFlightFreeLabel(lang: unknown, services: DacBietServiceState[]): string {
  const l = langOf(lang);
  const kinds: DacBietKind[] = [];
  for (const s of services) {
    const k = dacBietKindOf(s.key);
    if (k && s.selected && !kinds.includes(k)) kinds.push(k);
  }
  const order: DacBietKind[] = ["package", "cloud", "sunrise", "sunset", "legacy"];
  kinds.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const names = (kinds.length ? kinds : (["legacy"] as DacBietKind[])).map((k) => KIND_NAME[k][l]);
  const joiner = l === "zh" ? "／" : " / ";
  return FREE_TEMPLATE[l].replace("{x}", names.join(joiner));
}

/** Nhãn tiếng Việt cố định cho kênh nội bộ (email đội bay, Telegram). */
export const LONG_FLIGHT_FREE_KEY = "long_flight_free";

/**
 * LUẬT HOÀN PHỤ PHÍ — hiện dưới lựa chọn, ở bước xác nhận, trong email xác
 * nhận và trên vé.
 */
export const KP_REFUND_NOTE: Record<Lang, string> = {
  vi: "Nếu chuyến bay đặc biệt không thực hiện được (bình minh không có nắng, hoàng hôn bị mây che, không bay lâu được vì gió yếu), phụ phí được hoàn lại sau chuyến bay và chuyến bay trở thành chuyến bay thường.",
  en: "If the special flight can't be done (no sun at sunrise, sunset lost to cloud, a long flight not possible because the wind is too weak), the surcharge is refunded after the flight, which becomes a normal flight.",
  fr: "Si le vol spécial n'est pas réalisable (pas de soleil au lever, coucher de soleil caché par les nuages, vol long impossible faute de vent), le supplément est remboursé après le vol, qui devient un vol normal.",
  ru: "Если особый полёт невозможен (нет солнца на рассвете, закат скрыт облаками, долгий полёт невозможен из-за слабого ветра), доплата возвращается после полёта, который становится обычным.",
  zh: "如果特别飞行无法实现（日出时没有阳光、日落被云遮住、风太弱无法长时间飞行），附加费将在飞行后退还，该次飞行改为普通飞行。",
  hi: "यदि विशेष उड़ान संभव न हो (सूर्योदय पर धूप न हो, सूर्यास्त बादलों में छिप जाए, कमज़ोर हवा के कारण लंबी उड़ान संभव न हो), तो उड़ान के बाद अतिरिक्त शुल्क लौटा दिया जाता है और उड़ान सामान्य उड़ान बन जाती है।",
};

/**
 * Bản cho PPG "Gói đặc biệt": khách mua gói, phi công bay một trong ba — chỉ
 * hoàn khi CẢ BA đều không bay được (mây che hoàng hôn thì đã có săn mây).
 */
export const KP_REFUND_NOTE_PPG: Record<Lang, string> = {
  vi: "Nếu hôm bay không thực hiện được cả bình minh, hoàng hôn lẫn săn mây (hoặc gió yếu không bay lâu được), phụ phí được hoàn lại sau chuyến bay và chuyến bay trở thành chuyến bay thường.",
  en: "If none of sunrise, sunset or cloud hunting can be done that day (or the wind is too weak for a long flight), the surcharge is refunded after the flight, which becomes a normal flight.",
  fr: "Si ni le lever, ni le coucher du soleil, ni la chasse aux nuages ne sont réalisables ce jour-là (ou si le vent est trop faible pour un vol long), le supplément est remboursé après le vol, qui devient un vol normal.",
  ru: "Если в этот день невозможны ни рассвет, ни закат, ни охота за облаками (или ветер слишком слабый для долгого полёта), доплата возвращается после полёта, который становится обычным.",
  zh: "如果当天日出、日落和追云都无法实现（或风太弱无法长时间飞行），附加费将在飞行后退还，该次飞行改为普通飞行。",
  hi: "अगर उस दिन सूर्योदय, सूर्यास्त और क्लाउड हंटिंग में से कोई भी संभव न हो (या लंबी उड़ान के लिए हवा बहुत कमज़ोर हो), तो उड़ान के बाद अतिरिक्त शुल्क लौटा दिया जाता है और उड़ान सामान्य उड़ान बन जाती है।",
};

/** Lời hoàn phụ phí theo loại bay: có khoá PPG thì dùng bản "Gói đặc biệt". */
export const kpRefundNote = (lang: unknown, keys: unknown[] = []) =>
  (keys.some((k) => /^khau_pha_(ppg_|paramotor_2000m)/.test(String(k))) ? KP_REFUND_NOTE_PPG : KP_REFUND_NOTE)[langOf(lang)];

/** Lời nhắc khi khách PG tích "bay lâu" (chủ 02/10, câu nguyên văn bản tiếng Việt). */
export const PG_LONG_FLIGHT_NOTE: Record<Lang, string> = {
  vi: "PG đa số chỉ bay lâu được vào khung giờ trưa; khung giờ sáng và chiều thường không bay lâu được.",
  en: "Paragliding (PG) can mostly only fly long around midday; morning and afternoon slots usually can't fly long.",
  fr: "En parapente (PG), un vol long n'est généralement possible qu'en milieu de journée ; le matin et l'après-midi, ce n'est souvent pas possible.",
  ru: "На параплане (PG) долгий полёт в основном возможен только в середине дня; утром и после обеда обычно нет.",
  zh: "无动力滑翔伞（PG）大多只有中午时段才能长时间飞行；上午和下午时段通常无法长时间飞行。",
  hi: "पैराग्लाइडिंग (PG) में लंबी उड़ान ज़्यादातर दोपहर के समय ही संभव होती है; सुबह और शाम के स्लॉट में आमतौर पर नहीं।",
};

/** Lời giải thích trần "mỗi khách một chuyến đặc biệt" — chỉ còn hiện cho PG (PPG đã gộp một gói). */
export const KP_ONE_PER_GUEST_NOTE: Record<Lang, string> = {
  vi: "Mỗi khách chỉ chọn một chuyến đặc biệt (bình minh hoặc hoàng hôn) — tổng không vượt số khách.",
  en: "Each guest picks at most one special flight (sunrise or sunset) — the total can't exceed the number of guests.",
  fr: "Chaque passager choisit au plus un vol spécial (lever ou coucher du soleil) — le total ne peut pas dépasser le nombre de passagers.",
  ru: "Каждый гость выбирает не более одного особого полёта (рассвет или закат) — всего не больше числа гостей.",
  zh: "每位客人最多选择一种特别飞行（日出或日落），总数不能超过客人数。",
  hi: "हर मेहमान अधिकतम एक विशेष उड़ान चुनता है (सूर्योदय या सूर्यास्त) — कुल संख्या मेहमानों से अधिक नहीं हो सकती।",
};

export const kpOnePerGuestNote = (lang: unknown) => KP_ONE_PER_GUEST_NOTE[langOf(lang)];
export const pgLongFlightNote = (lang: unknown) => PG_LONG_FLIGHT_NOTE[langOf(lang)];

/**
 * Giữ trần của nhóm: dịch vụ vừa đổi được ưu tiên giữ số khách chọn, phần
 * vượt trần lấy bớt từ các dịch vụ KHÁC trong nhóm (từ cuối lên). Với 1 khách
 * nhóm này hành xử như nút radio: chọn hoàng hôn thì bình minh tự bỏ.
 *
 * Trả về bản đồ dịch vụ mới (không sửa bản cũ).
 */
export function fitCapGroup<T extends { selected?: boolean; qty?: number }>(
  services: Record<string, T>,
  groupKeys: string[],
  changedKey: string,
  cap: number,
): Record<string, T> {
  const next: Record<string, T> = { ...services };
  const q = (k: string) => (next[k]?.selected ? Math.max(1, Number(next[k]?.qty) || 1) : 0);
  const changedQty = Math.min(q(changedKey), cap);
  if (next[changedKey]?.selected) next[changedKey] = { ...next[changedKey], qty: changedQty };
  let over = groupKeys.reduce((s, k) => s + q(k), 0) - cap;
  const others = groupKeys.filter((k) => k !== changedKey).reverse();
  for (const k of others) {
    if (over <= 0) break;
    const cur = q(k);
    if (!cur) continue;
    const take = Math.min(cur, over);
    over -= take;
    next[k] = cur - take > 0 ? { ...next[k], qty: cur - take } : { ...next[k], selected: false, qty: 1 };
  }
  return next;
}
