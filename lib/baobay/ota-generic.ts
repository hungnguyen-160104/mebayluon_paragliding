// lib/baobay/ota-generic.ts

/**
 * Bóc THÔ thư đặt chỗ của các OTA chưa có bộ đọc riêng (GYG, KKday, Trip.com,
 * SeekSophie…).
 *
 * Mỗi OTA một mẫu thư, không thể đoán chắc như Klook. Nên tệp này chỉ cố lấy
 * những thứ gần như bên nào cũng ghi — mã đặt chỗ, ngày bay, số khách, tên, số
 * điện thoại — rồi ĐỂ NGƯỜI SOÁT quyết định. Không bao giờ tự tạo booking từ
 * kết quả ở đây: bóc sai một ngày bay là khách tới bãi mà không ai đón.
 *
 * Có mẫu thư thật của bên nào thì viết bộ đọc riêng cho bên đó (như ota-klook),
 * lúc ấy thư của họ mới chạy thẳng vào lịch.
 */

export type GenericOtaDraft = {
  kind: "new" | "cancel" | "amend" | "unknown";
  ref: string;
  /** "YYYY-MM-DD" nếu đọc được. */
  flightDate: string;
  expectedTime: string;
  guestCount: number;
  contactName: string;
  phone: string;
  email: string;
  /**
   * Cân nặng từng khách (kg) nếu thư có ghi — với bay đôi đây là con số điều
   * phối cần TRƯỚC TIÊN: xếp phi công và chọn dù theo cân nặng, khách quá cân
   * phải gọi lại từ chối trước khi họ lên xe đi mấy trăm cây số.
   */
  weights: number[];
  /** Khách sạn / điểm đón nếu thư có ghi — để xếp xe đưa đón. */
  hotel: string;
  /** Những dòng đáng đọc nhất, để người soát nhìn là hiểu ngay. */
  highlights: string[];
};

/**
 * Thư chỉ có bản HTML (một số OTA không gửi bản chữ): vứt thẻ đi lấy chữ.
 * Không cần đẹp — chỉ cần các dòng "Nhãn: giá trị" sống sót để bộ bóc đọc được.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

const CANCEL_WORDS = /(cancel|cancell|canceled|cancelled|huỷ|hủy)/i;
const AMEND_WORDS = /(amend|change|modif|reschedul|update|đổi lịch|thay đổi)/i;
const NEW_WORDS = /(confirmed|new booking|booking confirmation|order|reservation|đặt chỗ|xác nhận)/i;

export function otaMailKind(subject: string, body: string): GenericOtaDraft["kind"] {
  const s = `${subject}\n${body.slice(0, 400)}`;
  if (CANCEL_WORDS.test(s)) return "cancel";
  if (AMEND_WORDS.test(s)) return "amend";
  if (NEW_WORDS.test(s)) return "new";
  return "unknown";
}

/** Lấy giá trị sau một trong các nhãn cho trước, trên cùng dòng. */
function labelled(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`^[^\\S\\n]*${label}[^\\S\\n]*[:：][^\\S\\n]*(.+)$`, "im");
    const hit = re.exec(text)?.[1]?.trim();
    if (hit) return hit;
  }
  return "";
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Nhận "2026-08-14" · "14/08/2026" · "14 Aug 2026" · "Aug 14, 2026". */
export function findDate(text: string): string {
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = /\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const dMon = /\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(20\d{2})\b/.exec(text);
  if (dMon && MONTHS[dMon[2].toLowerCase()]) {
    return `${dMon[3]}-${MONTHS[dMon[2].toLowerCase()]}-${dMon[1].padStart(2, "0")}`;
  }

  const monD = /\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/.exec(text);
  if (monD && MONTHS[monD[1].toLowerCase()]) {
    return `${monD[3]}-${MONTHS[monD[1].toLowerCase()]}-${monD[2].padStart(2, "0")}`;
  }
  return "";
}

function findTime(text: string): string {
  const hhmm = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  const ampm = /\b(\d{1,2})\s*(am|pm)\b/i.exec(text);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (/pm/i.test(ampm[2])) h += 12;
    return `${String(h).padStart(2, "0")}:00`;
  }
  return "";
}

/**
 * Cân nặng khách: bắt "Weight: 75 kg", "75kg", "Cân nặng: 68", "165 lbs"…
 * Chỉ nhận 30–150 kg — ngoài khoảng đó gần như chắc là bắt nhầm (giá tiền, số
 * đo khác), mà báo nhầm cân nặng còn hại hơn không báo.
 */
export function findWeights(text: string): number[] {
  const out: number[] = [];
  const kgRe = /(\d{2,3})(?:[.,]\d)?\s*(?:kg|kgs|kilo)/gi;
  for (let m = kgRe.exec(text); m; m = kgRe.exec(text)) {
    const kg = Number(m[1]);
    if (kg >= 30 && kg <= 150) out.push(kg);
  }
  if (!out.length) {
    const lbsRe = /(\d{2,3})\s*(?:lbs?|pounds?)/gi;
    for (let m = lbsRe.exec(text); m; m = lbsRe.exec(text)) {
      const kg = Math.round(Number(m[1]) * 0.4536);
      if (kg >= 30 && kg <= 150) out.push(kg);
    }
  }
  // Cùng một số lặp lại (thư nhắc lại bảng) thì thôi, nhưng hai khách trùng cân
  // nặng vẫn phải giữ cả hai — chỉ cắt khi danh sách dài bất thường
  return out.slice(0, 12);
}

function findGuests(text: string): number {
  const labelled1 = labelled(text, [
    "Participants", "Participant", "Pax", "Guests", "Number of travelers", "Number of travellers",
    "Travelers", "Travellers", "Quantity", "Số khách", "Số người",
  ]);
  const fromLabel = /(\d{1,3})/.exec(labelled1)?.[1];
  if (fromLabel) return Math.max(1, Number(fromLabel));

  const inline = /\b(\d{1,3})\s*(?:x\s*)?(?:adults?|people|persons?|pax|participants?|travellers?|travelers?|khách|người)\b/i.exec(text);
  return inline ? Math.max(1, Number(inline[1])) : 1;
}

/** Mã đặt chỗ: ưu tiên dòng có nhãn, không có thì bắt cụm chữ-số in hoa. */
function findRef(subject: string, body: string): string {
  const byLabel = labelled(body, [
    "Booking reference ID", "Booking reference", "Reference number", "Reference", "Booking ID",
    "Booking number", "Booking no", "Order number", "Order ID", "Order no", "Confirmation number",
    "Mã đặt chỗ", "Mã booking", "Mã đơn",
  ]);
  const cleanLabel = byLabel.split(/\s{2,}/)[0].trim();
  if (cleanLabel && cleanLabel.length <= 24) return cleanLabel;

  const fromSubject = /\b([A-Z]{2,5}[- ]?\d{5,10}|\d{8,12}|[A-Z0-9]{8,12})\b/.exec(subject)?.[1];
  return fromSubject ? fromSubject.replace(/\s/g, "") : "";
}

/** Vài dòng đáng đọc nhất — người soát nhìn là biết thư nói gì. */
function pickHighlights(body: string): string[] {
  const keep =
    /(date|time|pax|participant|guest|traveller|traveler|activity|product|package|option|pickup|hotel|phone|mobile|weight|language|nationality|total|amount|ngày|giờ|khách|đón|cân nặng|quốc tịch|tổng)/i;
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && l.length < 160 && l.includes(":") && keep.test(l))
    .slice(0, 12);
}

export function parseGenericOtaEmail(subject: string, bodyRaw: string): GenericOtaDraft {
  let body = String(bodyRaw ?? "").replace(/\r/g, "");
  // Thư chỉ có bản HTML: vứt thẻ lấy chữ rồi bóc như thường
  if (/<(html|body|table|div|p|br)[\s>]/i.test(body)) body = htmlToText(body);
  const dateLine = labelled(body, [
    "Date Request", "Travel date", "Activity date", "Tour date", "Date of travel", "Participation date",
    "Booking date", "Date", "Ngày bay", "Ngày đi", "Ngày",
  ]);

  return {
    kind: otaMailKind(subject, body),
    ref: findRef(subject, body),
    // Ưu tiên ngày trên dòng có nhãn; không có thì dò cả thư
    flightDate: findDate(dateLine) || findDate(subject) || findDate(body),
    expectedTime: findTime(
      labelled(body, ["Time Request", "Start time", "Time", "Preferred time", "Giờ bay", "Giờ"]),
    ),
    guestCount: findGuests(body),
    contactName: labelled(body, [
      "Lead participant", "Lead traveller", "Lead traveler", "Customer name", "Guest name",
      "Traveller name", "Traveler name", "Name", "Tên khách", "Khách hàng",
    ])
      .replace(/^\([^)]*\)\s*/, "")
      .split(/\s{2,}/)[0]
      .trim(),
    phone: (/(\+?\d[\d\s.-]{7,}\d)/.exec(labelled(body, ["Mobile", "Phone", "Telephone", "Contact number", "SĐT", "Điện thoại"]) || "")?.[1] ?? "")
      .replace(/[\s.]/g, ""),
    email: /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(body)?.[0] ?? "",
    weights: findWeights(body),
    hotel: labelled(body, [
      "Pickup location", "Pickup point", "Pick-up location", "Hotel name", "Hotel", "Accommodation",
      "Meeting point", "Khách sạn", "Điểm đón", "Nơi đón",
    ]).split(/\s{2,}/)[0].trim(),
    highlights: pickHighlights(body),
  };
}
