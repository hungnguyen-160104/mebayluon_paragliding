// lib/baobay/booking-quick-parse.ts

/**
 * BÓC MỘT DÒNG CHỮ THÀNH BOOKING — cho ô "nhập nhanh" trên thẻ BOOKING MỚI.
 *
 * Điều phối nhận khách qua Zalo/điện thoại thường ghi vội một dòng kiểu:
 *
 *   "mcc 18.8 nguyễn trang 0956778444 PG 8h00 đón tại bluehome 2k 2xflycam đã cọc 300k giảm 200k"
 *
 * Dán dòng đó vào là máy điền sẵn form, người nhập chỉ soát lại rồi bấm lưu.
 * Nguyên tắc: máy CHỈ điền, không tự lưu — bóc thiếu hay bóc sai thì người
 * nhập sửa tay như thường, không có gì tự chảy vào sổ.
 *
 * Thứ tự bóc quan trọng: tiền (cọc/giảm "300k") phải bóc TRƯỚC số khách ("2k"),
 * vì cùng là "số + k" — bóc xong thì xoá cụm đó khỏi chuỗi để khỏi bắt trùng.
 */

export type QuickParsed = {
  spot?: "khau-pha" | "ha-noi" | "sapa";
  /** "YYYY-MM-DD" — 18.8 hiểu là lần 18/8 GẦN NHẤT chưa qua. */
  flightDate?: string;
  contactName?: string;
  phone?: string;
  expectedTime?: string;
  /** Số khách từng loại — chỉ điền loại nào chuỗi nhắc đến. */
  pgCount?: number;
  ppgCount?: number;
  guestCount?: number;
  flycam?: number;
  video360?: number;
  redFlag?: number;
  sunset?: number;
  flagFlight?: number;
  mountainCar?: number;
  pickup?: "self" | "bigc" | "hotel" | "other";
  pickupNote?: string;
  deposit?: number;
  discount?: number;
  source?: string;
  /** Những cụm máy không hiểu — trả lại cho người nhập tự xem. */
  leftover: string;
};

/**
 * Biên từ CHỊU ĐƯỢC TIẾNG VIỆT: \b của JS chỉ hiểu chữ ASCII — đứng cạnh "ạ",
 * "ờ", "đ"… là hỏng, "kéo cờ" không bao giờ khớp. Dùng lookaround unicode thay.
 */
const B1 = "(?<![\\p{L}\\d])";
const B2 = "(?![\\p{L}\\d])";
const word = (alts: string) => new RegExp(`${B1}(?:${alts})${B2}`, "iu");

const SPOT_WORDS: Array<[RegExp, QuickParsed["spot"]]> = [
  [word("mcc|mù cang chải|mu cang chai|khau ph[aạ]|kp"), "khau-pha"],
  [word("hn|hà nội|ha noi|hanoi|đồi bù|doi bu"), "ha-noi"],
  [word("sapa|sa pa|sp"), "sapa"],
];

const SOURCE_WORDS: Array<[RegExp, string]> = [
  [word("klook"), "Klook"],
  [word("gyg|getyourguide"), "GYG"],
  [word("kkday"), "KKday"],
  [word("seek ?sophie|seek"), "SEEK"],
  [word("viator"), "Viator"],
  [word("fb|facebook"), "Facebook"],
  [word("tiktok"), "TikTok"],
  [word("zalo"), "Zalo"],
  [word("tại chỗ|tai cho|walk ?-? ?in"), "TẠI CHỖ"],
];

/** "300k" → 300000 · "1tr2"/"1.2tr" → 1200000 · "300" (cạnh chữ tiền) → 300000. */
function toMoney(raw: string): number {
  const t = raw.toLowerCase().replace(/\s/g, "");
  const tr = /^(\d+)(?:[.,](\d+))?(?:tr|triệu|trieu|m)(\d+)?$/.exec(t);
  if (tr) {
    const whole = Number(tr[1]) * 1_000_000;
    if (tr[3]) return whole + Number(tr[3]) * 100_000; // "1tr2" = 1,2 triệu
    if (tr[2]) return whole + Number(`0.${tr[2]}`) * 1_000_000;
    return whole;
  }
  const k = /^(\d+)(?:[.,](\d+))?k$/.exec(t);
  if (k) return Math.round(Number(`${k[1]}.${k[2] || 0}`) * 1_000);
  const n = Number(t.replace(/[.,]/g, ""));
  // "cọc 300" gần như chắc là 300 nghìn — chẳng ai cọc 300 đồng
  return n < 10_000 ? n * 1_000 : n;
}

function cut(state: { text: string }, re: RegExp): RegExpExecArray | null {
  const m = re.exec(state.text);
  if (m) state.text = state.text.replace(m[0], " ");
  return m;
}

/** Đếm dịch vụ: "2xflycam" · "flycam x2" · "2 flycam" · "flycam" (=1). */
function service(state: { text: string }, words: string): number | undefined {
  const before = cut(state, new RegExp(`(\\d{1,2})\\s*[x×]?\\s*(?:${words})${B2}`, "iu"));
  if (before) return Number(before[1]);
  const after = cut(state, new RegExp(`(?:${words})\\s*[x×]?\\s*(\\d{1,2})(?!\\d)`, "iu"));
  if (after) return Number(after[1]);
  if (cut(state, new RegExp(`${B1}(?:${words})${B2}`, "iu"))) return 1;
  return undefined;
}

export function parseQuickBooking(input: string, today: string): QuickParsed {
  const out: QuickParsed = { leftover: "" };
  const state = { text: ` ${String(input || "").replace(/\s+/g, " ").trim()} ` };

  /* ---- điểm bay + nguồn (bóc sớm cho khỏi lẫn vào tên) ---- */
  for (const [re, spot] of SPOT_WORDS) {
    if (cut(state, re)) {
      out.spot = spot;
      break;
    }
  }
  for (const [re, name] of SOURCE_WORDS) {
    if (cut(state, re)) {
      out.source = name;
      break;
    }
  }

  /* ---- SĐT ---- */
  const phone = cut(state, /(?:\+?84|0)\d{8,10}\b/);
  if (phone) out.phone = phone[0].replace(/^\+?84/, "0");

  /* ---- giờ: "8h00" "8h" "15:30" (bóc trước ngày — "8h" chứa số dễ lẫn) ---- */
  const time = cut(state, /\b([01]?\d|2[0-3])[h:]([0-5]\d)?\b/i);
  if (time) out.expectedTime = `${time[1].padStart(2, "0")}:${time[2] || "00"}`;

  /* ---- ngày: "18.8" "18/8" "18-8-2026" — không năm thì lấy lần chưa qua gần nhất ---- */
  const date = cut(state, /\b(\d{1,2})[./-](\d{1,2})(?:[./-](20\d{2}))?\b/);
  if (date) {
    const [d, mo] = [date[1].padStart(2, "0"), date[2].padStart(2, "0")];
    const year = date[3] ? Number(date[3]) : Number(today.slice(0, 4));
    let key = `${year}-${mo}-${d}`;
    if (!date[3] && key < today) key = `${year + 1}-${mo}-${d}`;
    out.flightDate = key;
  }

  /* ---- tiền: PHẢI trước số khách ("300k" vs "2k") ---- */
  const MONEY = "(\\d+(?:[.,]\\d+)?(?:\\s*(?:k|tr|triệu|trieu|m)(?![\\p{L}]))?(?:\\d+)?)";
  const dep = cut(state, new RegExp(`(?:đã\\s*)?(?:cọc|coc|đặt cọc|dat coc)\\s*[:=]?\\s*${MONEY}`, "iu"));
  if (dep) out.deposit = toMoney(dep[1]);
  const dis = cut(state, new RegExp(`(?:giảm|giam|bớt|bot|ck|chiết khấu|chiet khau)\\s*(?:trừ|tru)?\\s*[:=]?\\s*${MONEY}`, "iu"));
  if (dis) out.discount = toMoney(dis[1]);

  /* ---- dịch vụ ---- */
  out.flycam = service(state, "flycam|fly cam");
  out.video360 = service(state, "360|cam ?360|camera ?360");
  out.redFlag = service(state, "cờ đỏ|co do|dù cờ đỏ");
  out.sunset = service(state, "hoàng hôn|hoang hon|săn mây|san may|sunset");
  out.flagFlight = service(state, "kéo cờ|keo co|kéo bánh|keo banh");
  out.mountainCar = service(state, "xe núi|xe nui|xe lên núi|xe len nui");

  /* ---- loại hình + số khách: "2pg 3ppg" · "PG 2k" · "ppg" ---- */
  const ppg = cut(state, /(\d{1,2})\s*[x×]?\s*ppg\b/i) || cut(state, /ppg\s*[x×]?\s*(\d{1,2})\b/i);
  if (ppg) out.ppgCount = Number(ppg[1]);
  else if (cut(state, /\bppg\b/i)) out.ppgCount = -1; // có nhắc PPG nhưng chưa rõ mấy khách
  const pg = cut(state, /(\d{1,2})\s*[x×]?\s*pg\b/i) || cut(state, /pg\s*[x×]?\s*(\d{1,2})\b/i);
  if (pg) out.pgCount = Number(pg[1]);
  else if (cut(state, /\bpg\b/i)) out.pgCount = -1;

  const guests =
    cut(state, /(\d{1,3})\s*(?:k|khách|khach|người|nguoi|pax)\b/i) ||
    cut(state, /\b(?:khách|khach|pax)\s*[:=]?\s*(\d{1,3})\b/i);
  if (guests) out.guestCount = Number(guests[1]);

  // "PG 2k" → 2 khách đó là khách PG; chỉ nhắc một loại thì dồn hết vào loại đó
  if (out.pgCount === -1) out.pgCount = out.ppgCount && out.ppgCount > 0 ? 0 : out.guestCount;
  if (out.ppgCount === -1) out.ppgCount = out.pgCount && out.pgCount > 0 ? 0 : out.guestCount;
  if (!out.guestCount && (out.pgCount || out.ppgCount)) {
    out.guestCount = (out.pgCount || 0) + (out.ppgCount || 0);
  }

  /* ---- điểm đón: "đón tại bluehome" / "đón bigc" / "đón ks" ---- */
  const pick = cut(state, /(?:đón|don|pick ?up)\s*(?:tại|tai|ở|o)?\s*[:=]?\s*([^\d,;·]+?)(?=\s{2,}|[,;·]|\s(?:và|va)\s|$)/i);
  if (pick) {
    const place = pick[1].trim().replace(/\s+/g, " ");
    if (/^big ?c$/i.test(place)) out.pickup = "bigc";
    else if (/^(ks|khách sạn|khach san|hotel)$/i.test(place)) out.pickup = "hotel";
    else if (place) {
      out.pickup = "other";
      out.pickupNote = place;
    }
  }

  /* ---- tên khách: cụm CHỮ dài nhất còn sót lại ---- */
  const words = state.text
    .split(/[,;·]/)
    .map((w) =>
      w
        .replace(/[^\p{L}\s]/gu, " ")
        .replace(/\b(khách|khach|người|nguoi|pax|đã|da)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((w) => w.length >= 2 && !/^(anh|chị|chi|em|và|va)$/i.test(w));
  if (words.length) {
    out.contactName = words.sort((a, b) => b.length - a.length)[0];
  }

  out.leftover = state.text.replace(/\s+/g, " ").trim();
  return out;
}
