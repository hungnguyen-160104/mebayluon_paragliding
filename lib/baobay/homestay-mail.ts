// lib/baobay/homestay-mail.ts
/**
 * BÓC THƯ ĐẶT PHÒNG homestay từ hộp mebayluon@gmail.com.
 *
 * Xem hộp thư thật (8/2026) thì nguồn chính là AGODA — thư voucher dạng
 * "Agoda Booking ID 1763170463 - CONFIRMED ..." và thư huỷ "... - CANCELLED
 * CLUBHOUSE MEBAYLUON". Airbnb/Booking.com/Trip.com/Traveloka hiện chủ yếu
 * là thư đối tác (quảng bá, hoá đơn) — thư đặt phòng của họ khi xuất hiện sẽ
 * rơi vào bộ đọc CHUNG: bóc được ngày + tên thì vào sổ, không thì vào khay
 * "cần soát" kèm nguyên văn, không bao giờ lặng lẽ bỏ qua.
 *
 * Hàm thuần, không đọc mạng — phần lấy thư qua IMAP nằm ở
 * services/homestay-mail.service.ts.
 */

import { htmlToText } from "@/lib/baobay/ota-generic";
import { resolveRoomType } from "@/lib/baobay/homestay";

export type HomestayMailDraft = {
  kind: "new" | "cancel" | "review" | "ignore";
  source: string;
  ref: string;
  guestName: string;
  country: string;
  roomLabel: string;
  roomTypeId: string;
  rooms: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  /** Giá bán cho khách (Agoda: reference sell rate). */
  amount: number;
  /** Tiền thật về tài khoản (Agoda: net rate đã trừ hoa hồng, thuế). */
  netAmount: number;
  prepaid: boolean;
  note: string;
  /** Vì sao cần người soát (khi kind = "review"). */
  reviewReason?: string;
};

/** "August 23, 2026" / "23 August 2026" / "23/08/2026" -> "2026-08-23". */
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export function parseMailDate(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let m = /([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i.exec(s);
  if (m && MONTHS[m[1].toLowerCase()]) {
    return `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = /(\d{1,2})\s+([a-z]+),?\s+(\d{4})/i.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) {
    return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[0];
  return "";
}

/** "VND 450,940.00" / "656,000" -> 450940 (đồng, bỏ phần lẻ .00 của Agoda). */
function parseVnd(raw: string): number {
  const m = /([\d,.]+)/.exec(String(raw ?? ""));
  if (!m) return 0;
  let s = m[1];
  // Agoda viết "450,940.00": phẩy là nghìn, chấm là phần lẻ — cắt phần lẻ đi
  if (/\.\d{1,2}$/.test(s)) s = s.replace(/\.\d{1,2}$/, "");
  const n = Number(s.replace(/[,.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Giá trị đứng sau một nhãn ("Check-in", "Room Type"…) trong văn bản thư. */
function fieldAfter(text: string, label: RegExp, lines = 3): string {
  // Bọc (?:...) quanh nhãn: nhãn dạng "a|b" mà không bọc thì dấu | nuốt luôn
  // phần bắt giá trị phía sau — m[1] thành undefined và vỡ ở .trim()
  const re = new RegExp(`(?:${label.source})` + String.raw`\s*:?\s*([^\n]*)\n((?:[^\n]*\n?){0,${lines}})`, "i");
  const m = re.exec(text);
  if (!m) return "";
  // Giá trị có thể nằm cùng dòng với nhãn, hoặc rơi xuống 1-2 dòng dưới (bảng HTML vỡ dòng)
  const same = (m[1] ?? "").trim();
  if (same && !/^[:\-–]*$/.test(same)) return same;
  return (m[2] ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[:\-–]*$/.test(l))[0] ?? "";
}

/* ================================================================== */
/* AGODA                                                               */
/* ================================================================== */

/**
 * Thư XÁC NHẬN của Agoda (voucher): các trường nằm thành bảng — Booking ID,
 * Customer First/Last Name, Check-in/Check-out, Room Type, No. of Rooms,
 * Occupancy, Net rate (tiền mình nhận), Reference sell rate (giá khách trả).
 * Thư HUỶ gọn hơn: Booking ID, Arrival/Departure, Room Type, Number of Rooms.
 */
function parseAgoda(subject: string, text: string): HomestayMailDraft | null {
  const ref = /Booking ID\s*:?\s*(\d{6,})/i.exec(subject + "\n" + text)?.[1] ?? "";
  if (!ref) return null;

  const cancelled = /CANCELLED/i.test(subject) || /Details of Booking[\s\S]{0,200}Cancellation/i.test(text);

  const first = fieldAfter(text, /Customer First Name/);
  const last = fieldAfter(text, /Customer Last Name/);
  const guestName = [last, first].filter(Boolean).join(" ").trim();
  const country = fieldAfter(text, /Country(?: of Residence)?\b/);

  // "Arrival" phải kèm dấu hai chấm: chữ "arrival date" còn nằm trong đoạn
  // chính sách huỷ ("...within 1 day prior to arrival date...") — vớ nhầm là hỏng
  const checkIn =
    parseMailDate(fieldAfter(text, /Check-?in\b/)) || parseMailDate(fieldAfter(text, /Arrival\s*:/));
  const checkOut =
    parseMailDate(fieldAfter(text, /Check-?out\b/)) || parseMailDate(fieldAfter(text, /Departure\s*:/));

  /**
   * Tên phòng: voucher xếp thành BẢNG — bốn dòng tiêu đề trước, bốn dòng giá
   * trị sau ("Room Type / No. of Rooms / Occupancy / No. of Extra Bed" rồi mới
   * "Double Room / 1 / 2 Adults / 0"). Thư huỷ thì lại ghi thẳng một dòng
   * "Room Type : Loft A". Đọc kiểu bảng trước, hụt thì rơi về kiểu một dòng.
   */
  const table =
    /Room Type\s*\n\s*No\.? of Rooms\s*\n\s*Occupancy\s*\n\s*No\.? of Extra Beds?\s*\n\s*([^\n]+)\n\s*(\d+)\s*\n\s*([^\n]+)/i.exec(
      text,
    );
  const roomLabel = table ? table[1].trim() : fieldAfter(text, /Room Type/);
  const rooms =
    Number(table?.[2] ?? /(?:No\.? of Rooms|Number of Rooms)\s*:?\s*(\d+)/i.exec(text)?.[1] ?? "1") || 1;
  const adults =
    Number(/(\d+)\s*Adults?/i.exec(text)?.[1] ?? /Number of Adults\s*:?\s*(\d+)/i.exec(text)?.[1] ?? "0") || 0;
  const children = Number(/Number of Children\s*:?\s*(\d+)/i.exec(text)?.[1] ?? "0") || 0;

  const net = parseVnd(/Net rate[^\n]*\n?\s*(?:VND)?\s*([\d,.]+)/i.exec(text)?.[1] ?? "");
  const sell = parseVnd(/Reference sell rate[\s\S]{0,80}?VND\s*([\d,.]+)/i.exec(text)?.[1] ?? "");

  const draft: HomestayMailDraft = {
    kind: cancelled ? "cancel" : "new",
    source: "agoda",
    ref,
    guestName,
    country,
    roomLabel,
    roomTypeId: resolveRoomType(roomLabel),
    rooms,
    adults,
    children,
    checkIn,
    checkOut,
    amount: sell,
    netAmount: net,
    // Agoda thu tiền khách rồi ("PREPAID" trên voucher) — tại nhà không thu nữa
    prepaid: true,
    note: [/PREPAID/i.test(text) ? "" : "kiểm lại hình thức thanh toán", fieldAfter(text, /Notes/)]
      .filter(Boolean)
      .join(" · "),
  };

  // Thư mới mà thiếu ngày ở thì không tự vào lịch được — chuyển người soát
  if (draft.kind === "new" && (!draft.checkIn || !draft.checkOut)) {
    return { ...draft, kind: "review", reviewReason: "Thư Agoda nhưng không đọc được ngày nhận/trả phòng" };
  }
  return draft;
}

/* ================================================================== */
/* Bộ đọc CHUNG cho nguồn chưa có bộ đọc riêng                          */
/* ================================================================== */

const SOURCE_BY_SENDER: Array<[RegExp, string]> = [
  [/agoda/i, "agoda"],
  [/airbnb/i, "airbnb"],
  [/booking\.com/i, "booking"],
  [/trip\.com|ctrip/i, "trip"],
  [/traveloka/i, "traveloka"],
  [/klook/i, "klook"],
];

export function homestaySourceFromSender(from: string): string {
  for (const [re, s] of SOURCE_BY_SENDER) if (re.test(from)) return s;
  return "";
}

/** Thư chắc chắn KHÔNG phải đơn đặt phòng — quảng bá, hoá đơn, báo cáo đối tác. */
const NOISE_SUBJECT =
  /invoice|newsletter|insight|performance|promotion|update your|boost|webinar|survey|payout|remittance|tax|verify|verification|password|reminder|expired|marketing|inquir|partner account|account security|report/i;
const BOOKINGISH = /booking|reservation|confirm|cancel|huỷ|hủy|đặt phòng|check-?in/i;

/**
 * Bóc một lá thư đặt phòng homestay. Trả về:
 *  - kind "new"/"cancel": đủ tin để tự ghi sổ.
 *  - kind "review": có vẻ là đơn nhưng máy không bóc trọn — người soát xử.
 *  - kind "ignore": thư rác/quảng bá, bỏ qua (có ghi log, không ghi sổ).
 */
export function parseHomestayMail(input: {
  from: string;
  subject: string;
  body: string;
}): HomestayMailDraft {
  const source = homestaySourceFromSender(input.from) || "khac";
  const subject = String(input.subject ?? "");
  const text = htmlToText(String(input.body ?? ""))
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ");

  const empty: HomestayMailDraft = {
    kind: "ignore",
    source,
    ref: "",
    guestName: "",
    country: "",
    roomLabel: "",
    roomTypeId: "",
    rooms: 1,
    adults: 0,
    children: 0,
    checkIn: "",
    checkOut: "",
    amount: 0,
    netAmount: 0,
    prepaid: source !== "khac",
    note: "",
  };

  if (source === "agoda") {
    const agoda = parseAgoda(subject, text);
    if (agoda) return agoda;
    // Thư Agoda mà không có Booking ID: thư đối tác — bỏ qua
    return empty;
  }

  // Thư TOUR BAY của Klook (dù lượn) đã có đường ống OTA bay riêng xử lý —
  // máy quét PHÒNG bỏ qua, kẻo khay soát ngập đơn bay.
  if (source === "klook" && /paragliding|tour|flight|bay du lượn|dù lượn/i.test(subject)) {
    return empty;
  }

  // Nguồn khác: chỉ động vào thư TRÔNG NHƯ đơn đặt phòng
  if (NOISE_SUBJECT.test(subject) || !BOOKINGISH.test(subject + "\n" + text.slice(0, 400))) {
    return empty;
  }

  const cancelled = /cancel|huỷ|hủy/i.test(subject);
  const checkIn = parseMailDate(fieldAfter(text, /check-?in|arrival|nhận phòng/i));
  const checkOut = parseMailDate(fieldAfter(text, /check-?out|departure|trả phòng/i));
  const ref = /(?:booking|reservation|confirmation)\s*(?:id|no\.?|number|code)?\s*[:#]?\s*([A-Z0-9-]{6,})/i.exec(
    subject + "\n" + text,
  )?.[1] ?? "";

  return {
    ...empty,
    kind: "review",
    ref,
    checkIn,
    checkOut,
    reviewReason: cancelled
      ? `Thư huỷ từ ${source} — máy chưa có bộ đọc riêng, soát tay`
      : `Thư đặt phòng từ ${source} — máy chưa có bộ đọc riêng, soát tay`,
  };
}
