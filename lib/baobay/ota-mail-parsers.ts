// lib/baobay/ota-mail-parsers.ts

/**
 * BỘ ĐỌC RIÊNG cho thư của Viator, GetYourGuide, Trip.com, KKday, Seek Sophie
 * (30/09/2026) — viết theo 595 thư THẬT đã lưu trong sổ thư OTA, không đoán.
 *
 * Trước đây năm bên này chỉ có bộ đọc chung (ota-generic) nên thư nào cũng rơi
 * vào khay "chờ duyệt tay": cả thư đặt chỗ thật lẫn thư quảng cáo, thư khách
 * nhắn tin, thư đối soát tiền. Khay đầy rác thì người trực thôi đọc — rồi bỏ
 * sót đúng cái thư huỷ cần xử lý.
 *
 * Mỗi thư được xếp vào MỘT trong năm loại:
 *   - "booking"  thư đặt mới / huỷ / đổi — từ ĐÚNG địa chỉ gửi đơn của OTA
 *   - "pending"  mới hỏi giữ chỗ (Seek Sophie) — chưa thành đơn
 *   - "notice"   khách nhắn tin, CSKH hỏi, xin hoàn tiền… — có mã đơn nhưng
 *                KHÔNG đổi lịch; vẫn hiện trong lịch sử thư để ai cần thì đọc
 *   - "junk"     quảng cáo, mã đăng nhập, đánh giá, bảng kê tiền — bỏ hẳn
 *   - "unknown"  lạ hoắc — để lối cũ (khay chờ duyệt) lo, không bỏ im
 *
 * Thư đặt chỗ chỉ nhận khi ĐỊA CHỈ GỬI đúng là hộp gửi đơn của OTA: thư "Re:
 * New Booking for…" do chính nhân viên trả lời khách cũng mang y nguyên tiêu
 * đề, nhận theo tiêu đề thôi là tạo booking trùng.
 */

import { htmlToText } from "@/lib/baobay/ota-generic";
import { cleanEmail, type OtaGuest } from "@/lib/baobay/ota-klook";

export type OtaAutoKey = "viator" | "gyg" | "trip" | "kkday" | "seeksophie";

export const OTA_AUTO_KEYS: OtaAutoKey[] = ["viator", "gyg", "trip", "kkday", "seeksophie"];

export function isOtaAutoKey(value: string): value is OtaAutoKey {
  return (OTA_AUTO_KEYS as string[]).includes(value);
}

/**
 * Chữ ghi ở ô "Nguồn" của booking — bám đúng danh sách nguồn quầy vẫn dùng
 * (BOOKING_SOURCES: "GYG", "KKday", "SEEK"…) để báo cáo theo nguồn không tách
 * một nguồn thành hai dòng chỉ vì máy viết khác người.
 */
export const OTA_SOURCE_LABEL: Record<OtaAutoKey, string> = {
  viator: "Viator",
  gyg: "GYG",
  trip: "Trip.com",
  kkday: "KKday",
  seeksophie: "SEEK",
};

export type OtaBookingMail = {
  ota: OtaAutoKey;
  kind: "new" | "cancel" | "amend";
  /** Mã đơn của OTA, chuẩn hoá: "BR-1451979319" · "GYG83W7A7XAV" · "1688901897207774" · "26KK260474588" · "686888190". */
  ref: string;
  productTitle: string;
  /** Gói / tuỳ chọn (Viator "Tour Grade", GYG dòng dưới tên tour, Trip "Resource info"). */
  optionTitle: string;
  /** "YYYY-MM-DD" — thư đổi lịch là ngày MỚI. "" nếu không đọc được. */
  flightDate: string;
  /** Ngày cũ — chỉ thư đổi lịch có ghi ("Travel date changed from … to …"). */
  previousDate: string;
  /** "HH:MM" — khung giờ OTA bán; "" nếu thư không ghi. */
  expectedTime: string;
  /** Số NGƯỜI BAY (không tính dịch vụ kèm). 0 = thư không ghi (thư đổi lịch Viator). */
  guestCount: number;
  /** Trip.com huỷ MỘT PHẦN: số vé huỷ trong thư. 0 = không ghi. */
  cancelledCount: number;
  leadName: string;
  /** Tên từng người bay nếu thư liệt kê (Viator). */
  travellers: string[];
  guests: OtaGuest[];
  phone: string;
  email: string;
  /** Cân nặng từng khách (kg). Chỉ nhận 30–150: Viator để "1.0 kgs" khi khách chưa điền. */
  weights: number[];
  /** Khách sạn / chỗ đón — "" nếu khách chưa chọn. */
  hotel: string;
  /** Ngôn ngữ khách / tour. */
  language: string;
  nationality: string;
  /** Giá khách trả (nguyên văn). */
  price: string;
  /** Tiền mình nhận (Viator "Net Rate", Seek Sophie "Your Earnings"). */
  net: string;
  /** Dịch vụ đặt kèm: "1 x Drone Footage", "2 x Câmera 360°", "360 camera"… */
  addOns: string[];
  /** Lời nhắn thật của khách. */
  specialRequirements: string;
  /** Thư đổi lịch / huỷ: từng thay đổi, lý do huỷ… */
  changes: string[];
  /** Kênh liên lạc khác khách tự ghi (WhatsApp/Kakao/LINE…) — Trip.com che SĐT. */
  messenger: string;
};

export type OtaMailVerdict =
  | { type: "booking"; booking: OtaBookingMail }
  | { type: "pending"; ref: string; reason: string }
  | { type: "notice"; ref: string; reason: string }
  | { type: "junk"; reason: string }
  | { type: "unknown" };

/* ------------------------------------------------------------------ */
/* Làm sạch chữ                                                         */
/* ------------------------------------------------------------------ */

/**
 * Thư OTA gửi về dạng chữ nhưng đầy rác: link bọc trong <…> hoặc ( … ), ký tự
 * vô hình (Viator chèn cả dãy U+200C và cặp U+2068/U+2069 quanh ô trống), dấu
 * cách cứng. Dọn hết rồi mới bóc, không thì "Hotel Pickup: ⁨⁩" trông như có
 * khách sạn.
 */
export function cleanMailText(raw: string): string {
  let t = String(raw ?? "").replace(/\r/g, "");
  t = t.replace(/<https?:[^>]*>/gi, "").replace(/\(\s*https?:[^)]*\)/gi, "");
  if (/<(html|body|table|div|p|br)[\s>]/i.test(t)) t = htmlToText(t);
  return t
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/[​-‏⁠-⁯͏­﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\t/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .join("\n");
}

function linesOf(text: string, keepBlank = false): string[] {
  const all = text.split("\n");
  return keepBlank ? all : all.filter((l) => l !== "");
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const stripStars = (s: string) => s.replace(/\*/g, "").trim();

/**
 * Bóc khối "Nhãn: giá trị" mà GIÁ TRỊ CÓ THỂ XUỐNG DÒNG (thư Viator/KKday cắt
 * dòng ở ~76 ký tự: "Hotel Pickup: Hotel Montmartre de Sapa, … Sa Pa, Lao\nCai,
 * Vietnam"). Chỉ dòng mở đầu bằng NHÃN QUEN mới mở trường mới — dòng tiếp
 * theo kiểu "Eljane Ragay: 55.0 kgs" có dấu hai chấm nhưng là phần đuôi của ô
 * cân nặng, coi là nhãn mới là mất nửa danh sách khách.
 */
function labelBlock(lines: string[], labels: string[], stop?: RegExp): Map<string, string> {
  const known = new Set(labels.map(norm));
  const out = new Map<string, string>();
  let current: string | null = null;
  for (const line of lines) {
    if (stop && stop.test(line)) {
      current = null;
      continue;
    }
    const m = /^([^:：]{1,60}?)\s*[:：]+\s*(.*)$/.exec(line);
    const label = m ? norm(m[1]) : "";
    if (m && known.has(label)) {
      if (out.has(label)) {
        // Viator có khi lặp "Hotel Pickup" hai lần — giữ lần đầu
        current = null;
        continue;
      }
      current = label;
      out.set(label, m[2].trim());
      continue;
    }
    if (current && line) out.set(current, `${out.get(current)} ${line}`.trim());
  }
  return out;
}

/** Giá trị sau nhãn đứng RIÊNG một dòng (GYG, Seek Sophie): lấy dòng kế, bỏ dòng ảnh. */
function valueAfter(lines: string[], label: RegExp, take = 1): string {
  const i = lines.findIndex((l) => label.test(l));
  if (i < 0) return "";
  const inline = lines[i].replace(label, "").replace(/^\s*[:：]\s*/, "").trim();
  if (inline) return stripStars(inline);
  const vals: string[] = [];
  for (let j = i + 1; j < lines.length && vals.length < take; j += 1) {
    const l = lines[j];
    if (!l || /^\[image/i.test(l)) {
      if (vals.length) break;
      continue;
    }
    vals.push(stripStars(l));
  }
  return vals.join(" ");
}

/* ------------------------------------------------------------------ */
/* Ngày, giờ, số khách, SĐT, cân nặng                                   */
/* ------------------------------------------------------------------ */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function dateKey(y: number, m: number, d: number): string {
  if (!(y >= 2020 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return ""; // 31/02 → loại
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Ngày theo đúng các kiểu OTA đang ghi:
 *   "2026-09-29" · "2026/09/27" (KKday) · "Thu, Nov 12, 2026" (Viator)
 *   "September 27, 2026, 4:00 PM" (GYG) · "25 Oct 2026" (Seek Sophie)
 * Không nhận "dd/mm/yyyy" trần: thư Mỹ ghi "mm/dd", đoán sai là khách tới bãi
 * lệch cả tháng.
 */
export function parseOtaDate(raw: string): string {
  const s = String(raw ?? "");
  const iso = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/.exec(s);
  if (iso) return dateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const monD = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/.exec(s);
  if (monD && MONTHS[monD[1].slice(0, 3).toLowerCase()]) {
    return dateKey(Number(monD[3]), MONTHS[monD[1].slice(0, 3).toLowerCase()], Number(monD[2]));
  }
  const dMon = /\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/.exec(s);
  if (dMon && MONTHS[dMon[2].slice(0, 3).toLowerCase()]) {
    return dateKey(Number(dMon[3]), MONTHS[dMon[2].slice(0, 3).toLowerCase()], Number(dMon[1]));
  }
  return "";
}

/** "4:00 PM" · "07:00am - 08:30am" · "16:00" · "3:00 PM departure" → "HH:MM" (giờ ĐẦU). */
export function parseOtaTime(raw: string): string {
  const m = /\b(\d{1,2})[:h.](\d{2})\s*(am|pm)?\b/i.exec(String(raw ?? ""));
  if (!m) return "";
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) {
    h %= 12;
    if (/pm/i.test(m[3])) h += 12;
  }
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const PERSON_WORD = /(adult|child|youth|infant|senior|student|person|people|pax|participant|traveler|traveller|guest|người|khách|trẻ)/i;

/** "2 Adults" · "1 Adult, 1 Child" → 3; chỉ cộng các cụm là NGƯỜI. */
function countPeople(raw: string): number {
  let n = 0;
  const re = /(\d{1,3})\s*(?:x\s*)?\*?\s*([^\d,;]*)/gi;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    if (PERSON_WORD.test(m[2] || "")) n += Number(m[1]);
  }
  return n;
}

/** Cân nặng trong một ô: "Laura: 92.0 kgs, Linh: 55.0 kgs" · "56kg and 80kg" · "65 and 85". */
function weightsIn(raw: string): number[] {
  const out: number[] = [];
  const re = /(\d{2,3}(?:[.,]\d+)?)/g;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    const kg = Math.round(Number(m[1].replace(",", ".")));
    if (kg >= 30 && kg <= 150) out.push(kg);
  }
  return out.slice(0, 12);
}

/**
 * SỐ TỔNG ĐÀI VIATOR, không phải số khách: 20/57 thư đặt chỗ Viator ghi đúng số
 * này. Lưu vào ô SĐT là điều phối gọi nhầm sang Thái Lan.
 */
const VIATOR_RELAY_PHONES = new Set(["+6620304763"]);

/**
 * "(Alternate Phone)GB+44 07385 170538 Send the customer a message." → "+447385170538".
 * Số Việt Nam (+84 0…) đổi về "0…" cho dễ bấm gọi, như bộ đọc Klook.
 */
export function normalizeOtaPhone(raw: string): string {
  let s = String(raw ?? "")
    .replace(/\(Alternate Phone\)/i, "")
    .replace(/Send the customer.*$/i, "")
    .trim()
    .replace(/^[A-Z]{2}(?=\+)/, "");
  if (!s || s.includes("*")) return ""; // Trip.com che số: "63-966****067"
  const intl = /^\+\s*(\d{1,3})[\s-]+\(?\s*(\d[\d\s().-]*)$/.exec(s);
  if (intl) {
    const rest = intl[2].replace(/\D/g, "").replace(/^0+/, "");
    s = intl[1] === "84" ? `0${rest}` : `+${intl[1]}${rest}`;
  } else if (/^\+/.test(s)) {
    s = `+${s.replace(/\D/g, "")}`;
    if (s.startsWith("+84")) s = `0${s.slice(3).replace(/^0+/, "")}`;
  } else {
    s = s.replace(/[^\d]/g, "");
  }
  if (s.replace(/\D/g, "").length < 8) return "";
  return VIATOR_RELAY_PHONES.has(s) ? "" : s;
}

/**
 * Email khách: bỏ địa chỉ bị che ("chan*****lag@gmail.com" — Trip.com) và địa
 * chỉ TRUNG CHUYỂN của GYG (customer-…@reply.getyourguide.com): app gửi thư báo
 * đổi lịch vào ô email, gửi vào hộp trung chuyển là thư đi qua GYG dưới tên
 * mình mà không ai duyệt nội dung.
 */
function customerEmail(raw: string): string {
  const e = cleanEmail(raw);
  if (!e || e.includes("*") || /@reply\.getyourguide\.com$/i.test(e)) return "";
  return e;
}

/** "Hotel Pickup" mà khách chưa chọn — coi như trống, đừng đưa vào ô đón. */
function realPickup(raw: string): string {
  const s = String(raw ?? "").replace(/[:\s.]+$/, "").trim();
  if (!s) return "";
  if (/(not yet booked|not listed|has not decided|select (my )?pickup location later|\[not applicable\]|^n\/?a$|^none$)/i.test(s)) return "";
  return s;
}

/** Viator ghi "Special Requirements: No" khi khách không nhắn gì. */
function realNote(raw: string): string {
  const s = String(raw ?? "").trim();
  return /^(no|none|n\/a|na|-+|không|nothing)\.?$/i.test(s) ? "" : s;
}

function isoToVn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function blankBooking(ota: OtaAutoKey, kind: OtaBookingMail["kind"], ref: string): OtaBookingMail {
  return {
    ota,
    kind,
    ref,
    productTitle: "",
    optionTitle: "",
    flightDate: "",
    previousDate: "",
    expectedTime: "",
    guestCount: 0,
    cancelledCount: 0,
    leadName: "",
    travellers: [],
    guests: [],
    phone: "",
    email: "",
    weights: [],
    hotel: "",
    language: "",
    nationality: "",
    price: "",
    net: "",
    addOns: [],
    specialRequirements: "",
    changes: [],
    messenger: "",
  };
}

/* ------------------------------------------------------------------ */
/* VIATOR                                                               */
/* ------------------------------------------------------------------ */

const VIATOR_LABELS = [
  "Booking Reference", "Tour Name", "Travel Date", "Lead Traveler Name", "Traveler Names", "Travelers",
  "Product Code", "Tour Grade", "Tour Grade Code", "Tour Grade Description", "Tour Option", "Tour Language",
  "Location", "Net Rate", "Hotel Pickup", "Pickup Point/Meeting point", "Passenger Weights", "Date of Birth",
  "weights_selected_unit", "Special Requirements", "Phone",
];

function parseViator(subject: string, text: string): OtaBookingMail | null {
  const kind: OtaBookingMail["kind"] | null = /^New Booking for/i.test(subject)
    ? "new"
    : /^Amended Booking/i.test(subject)
      ? "amend"
      : /^Cancell?ed Booking/i.test(subject)
        ? "cancel"
        : null;
  if (!kind) return null;
  const lines = linesOf(text);
  const start = lines.findIndex((l) => /^Booking Details$/i.test(l));
  const block = start >= 0 ? lines.slice(start + 1) : lines;
  const f = labelBlock(block, VIATOR_LABELS, /^(Optional:|Please visit|Manage Bookings|Have questions|\.$)/i);
  const get = (k: string) => f.get(norm(k)) ?? "";

  const ref = (/BR-\d{6,12}/i.exec(get("Booking Reference"))?.[0] || /BR-\d{6,12}/i.exec(subject)?.[0] || "").toUpperCase();
  if (!ref) return null;
  const b = blankBooking("viator", kind, ref);

  // Thư huỷ/đổi không có "Tour Name:" — tên tour là dòng ngay sau dòng trạng thái
  let product = get("Tour Name");
  if (!product && start >= 0) {
    const st = block.findIndex((l) => /^(Amended|Canceled|Cancelled)$/i.test(l));
    if (st >= 0 && block[st + 1] && !/:/.test(block[st + 1])) product = block[st + 1];
  }
  b.productTitle = product;
  b.optionTitle = get("Tour Grade") || get("Tour Option");
  b.flightDate = parseOtaDate(get("Travel Date")) || parseOtaDate(subject);
  b.guestCount = countPeople(get("Travelers"));
  b.leadName = get("Lead Traveler Name") || (/^Lead traveler name\s*:\s*(.+)$/im.exec(block.join("\n"))?.[1] ?? "");
  b.travellers = get("Traveler Names")
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  b.weights = weightsIn(get("Passenger Weights"));
  b.hotel = realPickup(get("Hotel Pickup") || get("Pickup Point/Meeting point"));
  b.language = get("Tour Language").replace(/\s*-\s*Guide$/i, "");
  b.net = get("Net Rate").replace(/\.$/, "");
  b.specialRequirements = realNote(get("Special Requirements"));
  b.phone = normalizeOtaPhone(get("Phone"));

  /**
   * Giấy tờ cho bảo hiểm: Viator ghi ngày sinh đủ kiểu (1987-07-19 · 19/11/1997
   * · 16062004 · 05/05/1991 của khách Mỹ). Chỉ nhận dạng ISO — "05/05/1991" là
   * tháng/ngày hay ngày/tháng thì không ai biết, ghi sai vào hồ sơ bảo hiểm còn
   * tệ hơn để trống cho quầy hỏi lại.
   */
  const dobs = get("Date of Birth").split(/\s*,\s*/);
  b.guests = b.travellers.map((name, i) => ({
    fullName: name.toUpperCase(),
    birthday: isoToVn(dobs[i] ?? ""),
    gender: "",
    idNumber: "",
    nationality: "",
  }));

  if (kind === "amend") {
    // "• Travel date changed from 26 Sep 2026 to 27 Sep 2026." — gộp các dòng bị cắt
    // (câu "Here are the changes:" cũng bị cắt dòng nên bám theo dấu "•" đầu tiên)
    const ci = lines.findIndex((l) => l.startsWith("•"));
    if (ci >= 0) {
      const bullets: string[] = [];
      for (let j = ci; j < lines.length && !/^Booking Details$/i.test(lines[j]); j += 1) {
        if (lines[j].startsWith("•")) bullets.push(lines[j].replace(/^•\s*/, ""));
        else if (bullets.length) bullets[bullets.length - 1] += ` ${lines[j]}`;
      }
      b.changes = bullets
        .map((s) => s.replace(/\s+/g, " ").trim())
        .map((s) => (/^Traveler personal information has been changed/i.test(s) ? "thông tin cá nhân khách đã đổi (xem trên Viator)" : s));
      // Cân nặng MỚI của từng khách: "weight changed from 1.0 kgs to 59.0 kgs"
      b.weights = b.changes.flatMap((c) => weightsIn(/weight changed from .+? to (.+)$/i.exec(c)?.[1] ?? ""));
      const moved = /Travel date changed from (.+?) to (.+?)\.?$/i.exec(b.changes.find((c) => /Travel date changed/i.test(c)) ?? "");
      if (moved) {
        b.previousDate = parseOtaDate(moved[1]);
        b.flightDate = parseOtaDate(moved[2]) || b.flightDate;
      }
    }
  }
  return b;
}

function classifyViator(from: string, subject: string, text: string): OtaMailVerdict {
  const refOf = () => (/BR-\d{6,12}/i.exec(`${subject}\n${text}`)?.[0] ?? "").toUpperCase();
  if (/account has been locked/i.test(subject)) {
    return { type: "notice", ref: "", reason: "tài khoản Viator bị khoá — đăng nhập lại" };
  }
  if (
    /(m1b\.viator|b2\.viator|mk2\.viator|mp1\.tripadvisor|hm1\.tripadvisor|ht1\.tripadvisor|unp_transactional@|account@t1\.viator|registration@t1\.viator|listings_no_reply@|email@t1\.tripadvisor|mailer-daemon)/i.test(
      from,
    ) ||
    /(two-factor|one-time .*login|password|đánh giá mới|new review|newsletter)/i.test(subject)
  ) {
    return { type: "junk", reason: "quảng cáo / đánh giá / mã đăng nhập Viator–Tripadvisor" };
  }
  if (/^(re|fwd?|tr)\s*:/i.test(subject)) return { type: "notice", ref: refOf(), reason: "thư trả lời qua lại" };
  if (/expmessaging\.tripadvisor|customer\.care@viator/i.test(from) || /^Conversation with/i.test(subject)) {
    return { type: "notice", ref: refOf(), reason: "khách / CSKH Viator nhắn tin" };
  }
  if (/refund/i.test(subject)) return { type: "notice", ref: refOf(), reason: "hoàn tiền (trả lời trên Viator nếu được hỏi)" };
  if (/suppliers@t1\.viator/i.test(from)) {
    return { type: "notice", ref: "", reason: "việc tài khoản nhà cung cấp Viator (tải giấy bảo hiểm…)" };
  }
  const senderOk = !from || /booking@t1\.viator\.com/i.test(from);
  if (senderOk) {
    const b = parseViator(subject, text);
    if (b) return { type: "booking", booking: b };
  }
  return { type: "unknown" };
}

/* ------------------------------------------------------------------ */
/* GETYOURGUIDE                                                         */
/* ------------------------------------------------------------------ */

function parseGyg(subject: string, text: string): OtaBookingMail | null {
  const kind: OtaBookingMail["kind"] | null = /(was cancell?ed|has been cancell?ed|booking has been canceled)/i.test(subject)
    ? "cancel"
    : /^Booking detail change/i.test(subject)
      ? "amend"
      : /^(Urgent:\s*)?New booking received|^Booking\s*-\s*S\d+/i.test(subject)
        ? "new"
        : null;
  if (!kind) return null;
  const lines = linesOf(text);
  const ref = (
    /\b(GYG[A-Z0-9]{8,12})\b/.exec(subject)?.[1] ||
    valueAfter(lines, /^(Reference number|Reference Number:|Booking reference)$/i) ||
    /\b(GYG[A-Z0-9]{8,12})\b/.exec(text)?.[1] ||
    ""
  ).toUpperCase();
  if (!/^GYG[A-Z0-9]{8,12}$/.test(ref)) return null;
  const b = blankBooking("gyg", kind, ref);

  if (kind === "cancel") {
    // Hai mẫu thư huỷ: "Customer: *X*" cùng dòng, hoặc "Name:" rồi xuống dòng
    b.leadName = valueAfter(lines, /^(Customer|Name)\s*:/i);
    b.productTitle = valueAfter(lines, /^Tour\s*:/i);
    b.flightDate = parseOtaDate(valueAfter(lines, /^Date\s*:/i));
    b.expectedTime = parseOtaTime(valueAfter(lines, /^Date\s*:/i));
    const why = valueAfter(lines, /^Cancellation reason\s*:/i);
    if (why) b.changes.push(`lý do huỷ: ${why}`);
    return b;
  }

  // Tên tour: dòng đầu tiên sau câu mở ("…booked:" / "…booking:" / "…has changed.")
  const intro = lines.findIndex((l) => /(has been booked:|last-minute booking:|booking has changed\.?)$/i.test(l));
  if (intro >= 0) {
    const after = lines.slice(intro + 1).filter((l) => !/^\[image/i.test(l));
    b.productTitle = after[0] ?? "";
    const opt = after[1] ?? "";
    if (opt && opt !== b.productTitle && !/^(Reference number|Booking reference)$/i.test(opt)) b.optionTitle = opt;
  }
  const dateRaw = valueAfter(lines, /^Date$/i);
  b.flightDate = parseOtaDate(dateRaw);
  b.expectedTime = parseOtaTime(dateRaw.replace(/^[^,]*,\s*20\d{2}/, "")); // bỏ "September 27, 2026" để khỏi bắt nhầm

  const pi = lines.findIndex((l) => /^Number of participants$/i.test(l));
  if (pi >= 0) {
    for (let j = pi + 1; j < lines.length; j += 1) {
      const l = lines[j];
      if (/^\[image/i.test(l) || /^(Main customer|Language|Tour language)$/i.test(l)) break;
      const m = /^\*?(\d{1,3})\s*x\*?\s*(.+)$/.exec(l);
      if (m) {
        if (PERSON_WORD.test(m[2])) b.guestCount += Number(m[1]);
        else b.addOns.push(`${m[1]} x ${stripStars(m[2])}`);
      } else if (/^\d{1,3}$/.test(l)) {
        b.guestCount += Number(l); // thư đổi thông tin chỉ ghi con số
      }
    }
  }
  const mc = lines.findIndex((l) => /^Main customer$/i.test(l));
  if (mc >= 0) {
    b.leadName = stripStars(lines[mc + 1] ?? "");
    b.email = customerEmail(lines[mc + 2] ?? "");
  }
  b.phone = normalizeOtaPhone(/^Phone:\s*(.+)$/im.exec(text)?.[1] ?? "");
  // Ngôn ngữ CỦA KHÁCH ("Language: German"); tour thì lúc nào cũng "English (Instructor)"
  b.language = (/^Language:\s*(.+)$/im.exec(text)?.[1] ?? "").trim() || valueAfter(lines, /^Tour language$/i);
  b.hotel = realPickup(valueAfter(lines, /^Pickup$/i));
  b.price = valueAfter(lines, /^Price$/i);

  if (kind === "amend") {
    const pl = lines.findIndex((l) => /^Pickup location/i.test(l));
    if (pl >= 0) {
      const pts: string[] = [];
      for (let j = pl + 1; j < lines.length && !/^\[image/i.test(lines[j]); j += 1) {
        if (!/^\(coordinates|^Open in Google Maps/i.test(lines[j])) pts.push(lines[j]);
      }
      if (pts.length) b.changes.push(`chỗ đón (GYG ghi "New"): ${pts.join(" | ")}`);
    }
    if (b.guestCount) b.changes.push(`số khách: ${b.guestCount}`);
  }
  return b;
}

function classifyGyg(from: string, subject: string, text: string): OtaMailVerdict {
  const refOf = () => (/\b(GYG[A-Z0-9]{8,12})\b/.exec(`${subject}\n${text}`)?.[1] ?? "").toUpperCase();
  if (
    /news@sup\.getyourguide/i.test(from) ||
    /(new review on GetYourGuide|invoice is ready|payment is confirmed|Optimize your content|Congrats on your first booking|Supplier Terms|newsletter|webinar)/i.test(subject)
  ) {
    return { type: "junk", reason: "đánh giá / hoá đơn / thanh toán / tin của GetYourGuide" };
  }
  if (/^(re|fwd?|tr)\s*:/i.test(subject)) return { type: "notice", ref: refOf(), reason: "thư trả lời qua lại" };
  if (/message@reply\.getyourguide|customer\.care@getyourguide/i.test(from)) {
    return { type: "notice", ref: refOf(), reason: /refund/i.test(subject) ? "khách xin hoàn tiền qua CSKH GYG" : "khách / CSKH GYG nhắn tin" };
  }
  const senderOk = !from || /notification\.getyourguide\.com/i.test(from);
  if (senderOk) {
    const b = parseGyg(subject, text);
    if (b) return { type: "booking", booking: b };
  }
  return { type: "unknown" };
}

/* ------------------------------------------------------------------ */
/* TRIP.COM                                                             */
/* ------------------------------------------------------------------ */

function parseTrip(subject: string, text: string): OtaBookingMail | null {
  const kind: OtaBookingMail["kind"] | null = /New order notification/i.test(subject)
    ? "new"
    : /Booking Cancellation Notification/i.test(subject)
      ? "cancel"
      : null;
  if (!kind) return null;
  const ref = /BookingNo\.?\s*(\d{10,19})/i.exec(subject)?.[1] || /^Booking No\.?\s*(\d{10,19})/im.exec(text)?.[1] || "";
  if (!ref) return null;
  const b = blankBooking("trip", kind, ref);
  const lines = linesOf(text);

  b.productTitle = valueAfter(lines, /^Booked product$/i).replace(/^\d+-/, "");
  // "Resource info" xuống dòng giữa chừng: "…[Hotel\ntransfer]-English-3:00 PM departure"
  const ri = lines.findIndex((l) => /^Resource info$/i.test(l));
  if (ri >= 0) {
    const parts: string[] = [];
    for (let j = ri + 1; j < lines.length && !/^Date of use/i.test(lines[j]); j += 1) parts.push(lines[j]);
    b.optionTitle = parts.join(" ").replace(/^\d+\s*\/\s*/, "");
    const dep = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*departure/i.exec(b.optionTitle);
    b.expectedTime = dep ? parseOtaTime(dep[1]) : "";
    const lang = /-([A-Za-z ]{3,20})-\d{1,2}:\d{2}/.exec(b.optionTitle)?.[1];
    if (lang) b.language = lang.trim();
  }
  b.flightDate = parseOtaDate(/^Date of use\s+(.+)$/im.exec(text)?.[1] ?? "");
  b.guestCount = Number(/^Booking Quantity\s+(\d{1,3})/im.exec(text)?.[1] ?? 0);
  b.cancelledCount = Number(/^Cancellation quantity\s+(\d{1,3})/im.exec(text)?.[1] ?? 0);
  const why = valueAfter(lines, /^Cancellation reason$/i);
  if (why) b.changes.push(`lý do huỷ: ${why}`);

  // Khối "Guest request": mỗi câu hỏi một mục, câu trả lời có thể xuống dòng
  const gs = lines.findIndex((l) => /^Guest request$/i.test(l));
  const ge = lines.findIndex((l) => /^Guest contact info$/i.test(l));
  if (gs >= 0) {
    const items: Array<[string, string]> = [];
    for (const l of lines.slice(gs + 1, ge > gs ? ge : undefined)) {
      const m = /^([^:：]{3,90}?)\s*[:：]\s*(.*)$/.exec(l);
      if (m && /(pick|meet|board|messag|messeng|communic|weight|hotel|note|remark|flight|app\b)/i.test(m[1])) items.push([m[1], m[2]]);
      else if (items.length) items[items.length - 1][1] = `${items[items.length - 1][1]} ${l}`.trim();
    }
    for (const [q, a] of items) {
      if (/weight/i.test(q)) b.weights = weightsIn(a);
      else if (/(pick|meet|board|hotel)/i.test(q)) b.hotel = realPickup(a);
      else if (/(messag|messeng|communic|app\b)/i.test(q)) b.messenger = a.trim();
      else b.specialRequirements = [b.specialRequirements, `${q}: ${a}`].filter(Boolean).join(" · ");
    }
  }
  const contact = ge >= 0 ? lines.slice(ge + 1).join("\n") : text;
  const guestName = /^Guest name\s+(.+)$/im.exec(text)?.[1] ?? "";
  b.leadName = (/^Name:\s*(.+)$/im.exec(contact)?.[1] ?? "").trim() || guestName.split("/").reverse().join(" ").trim();
  b.email = customerEmail(/^Email:\s*(.+)$/im.exec(contact)?.[1] ?? "");
  b.phone = normalizeOtaPhone(/^Phone:\s*(.+)$/im.exec(contact)?.[1] ?? "");
  /**
   * Trip.com CHE số điện thoại ("63-966****067"). Số gọi được thật thường nằm
   * ở câu "Preferred Message App": nhận nó làm SĐT chỉ khi khách ghi đủ mã
   * nước bằng dấu "+" — "818053096773" trần thì không biết đầu nào là mã nước.
   */
  if (!b.phone) {
    const plus = /\+\s*[\d][\d\s-]{7,}\d/.exec(b.messenger)?.[0];
    if (plus) b.phone = normalizeOtaPhone(plus.replace(/^\+\s*/, "+"));
  }
  const lang = (/^Preferred language:\s*(.+)$/im.exec(contact)?.[1] ?? "").trim();
  if (lang && lang !== "--") b.language = lang;
  return b;
}

function classifyTrip(from: string, subject: string, text: string): OtaMailVerdict {
  const refOf = () => /(?:Booking\s*No\.?|BookingNo\.?|Order Number)\s*[:：]?\s*(\d{10,19})/i.exec(`${subject}\n${text}`)?.[1] ?? "";
  if (
    /(newsletter\.trip\.com|affiliation@trip\.com|en_noreply@trip\.com)/i.test(from) ||
    /(验证码|verification code|payment completed|promo code|Affiliate Platform)/i.test(subject)
  ) {
    return { type: "junk", reason: "quảng cáo / mã đăng nhập / đối soát tiền Trip.com" };
  }
  if (/^(re|fwd?|tr)\s*:/i.test(subject) || /atguest\.trip\.com/i.test(from)) {
    return { type: "notice", ref: refOf(), reason: "khách trả lời thư qua Trip.com" };
  }
  if (/DDWLYD@trip\.com/i.test(from) || /^【Booking No/.test(subject)) {
    return {
      type: "notice",
      ref: refOf(),
      reason: /cancel/i.test(`${subject} ${text.slice(0, 600)}`)
        ? "CSKH Trip.com hỏi về HUỶ / hoàn tiền — trả lời Trip.com, chưa phải thư huỷ chính thức"
        : "CSKH Trip.com hỏi về đơn — cần trả lời",
    };
  }
  const senderOk = !from || /(TNT_noreply|v_rsv)@trip\.com/i.test(from);
  if (senderOk) {
    const b = parseTrip(subject, text);
    if (b) return { type: "booking", booking: b };
  }
  return { type: "unknown" };
}

/* ------------------------------------------------------------------ */
/* KKDAY                                                                */
/* ------------------------------------------------------------------ */

const KKDAY_LABELS = [
  "Mã đơn hàng", "Mã dịch vụ", "Tên sản phẩm", "Gói sản phẩm", "Ngày sử dụng", "Thời gian quy đổi voucher",
  "Lượt/ buổi", "Lượt/buổi", "Số lượng", "Người đại diện", "Quốc tịch", "Ghi chú",
];

function parseKkday(subject: string, text: string): OtaBookingMail | null {
  const cancelRef = /Đơn hàng có mã:\s*(\d{2}KK\d{6,12})\s*đã bị hu[ỷỷy]/i.exec(subject)?.[1];
  const newRef = /đơn hàng mới,\s*Mã đơn hàng:\s*(\d{2}KK\d{6,12})/i.exec(subject)?.[1];
  const ref = (cancelRef || newRef || "").toUpperCase();
  if (!ref) return null;
  const b = blankBooking("kkday", cancelRef ? "cancel" : "new", ref);
  const lines = linesOf(text);
  if (cancelRef) {
    const why = /^Lý do hu[ỷy]\s*[:：]\s*(.+)$/im.exec(text)?.[1];
    if (why) b.changes.push(`lý do huỷ: ${why}`);
    return b;
  }
  const f = labelBlock(lines, KKDAY_LABELS, /^(Hệ thống đã gửi|Để đảm bảo|https?:|Trong trường hợp|Vui lòng)/i);
  const get = (k: string) => f.get(norm(k)) ?? "";
  b.productTitle = get("Tên sản phẩm");
  b.optionTitle = get("Gói sản phẩm");
  b.flightDate = parseOtaDate(get("Ngày sử dụng"));
  b.expectedTime = parseOtaTime(get("Lượt/ buổi") || get("Lượt/buổi"));
  // "5Du khách" · "2 Người lớn, 1 Trẻ em" — cộng mọi con số của ô số lượng
  b.guestCount = (get("Số lượng").match(/\d{1,3}/g) ?? []).reduce((s, n) => s + Number(n), 0);
  // "Mizrahi, Gilad" (Họ, Tên) → "Gilad Mizrahi"
  const rep = get("Người đại diện");
  const parts = rep.split(/\s*,\s*/);
  b.leadName = parts.length === 2 && parts[0] && parts[1] ? `${parts[1]} ${parts[0]}` : rep;
  b.nationality = get("Quốc tịch");
  const note = get("Ghi chú");
  b.specialRequirements = note;
  // Ô ghi chú KKday hay chỉ ghi tên khách sạn ("KK Sapa Hotel") — nhận làm chỗ đón
  // khi nó NGẮN và không phải câu hỏi ("Can pick up our hotel? …")
  if (note.length <= 80 && !/\?/.test(note) && /(hotel|homestay|hostel|resort|khách sạn|lodge|villa)/i.test(note)) b.hotel = note;
  return b;
}

function classifyKkday(_from: string, subject: string, text: string): OtaMailVerdict {
  if (/(Bảng kê|mã đăng nhập|驗證碼|mật khẩu|bình luận|review has been approved|newsletter)/i.test(subject) || /edm\.kkday/i.test(_from)) {
    return { type: "junk", reason: "bảng kê tiền / mã đăng nhập / đánh giá KKday" };
  }
  const refOf = () => (/(\d{2}KK\d{6,12})/i.exec(`${subject}\n${text}`)?.[1] ?? "").toUpperCase();
  if (/^(re|fwd?|tr)\s*:/i.test(subject)) return { type: "notice", ref: refOf(), reason: "thư trả lời / chuyển tiếp" };
  if (/tin nhắn mới về đơn hàng/i.test(subject)) return { type: "notice", ref: refOf(), reason: "khách nhắn tin trên KKday" };
  const b = parseKkday(subject, text);
  if (b) return { type: "booking", booking: b };
  return { type: "unknown" };
}

/* ------------------------------------------------------------------ */
/* SEEK SOPHIE                                                          */
/* ------------------------------------------------------------------ */

/** Seek Sophie: "Nhãn:" một dòng, giá trị các dòng dưới cho tới dòng trống. */
function sophieBlock(allLines: string[], label: RegExp): string[] {
  const i = allLines.findIndex((l) => label.test(l));
  if (i < 0) return [];
  const out: string[] = [];
  for (let j = i + 1; j < allLines.length; j += 1) {
    if (!allLines[j]) {
      if (out.length) break;
      continue;
    }
    out.push(allLines[j]);
  }
  return out;
}

function parseSeekSophie(subject: string, text: string): OtaBookingMail | null {
  const kind: OtaBookingMail["kind"] | null = /^Booking Confirmed for/i.test(subject)
    ? "new"
    : /cancel/i.test(subject)
      ? "cancel"
      : null;
  if (!kind) return null;
  const ref = /(?:Booking|Request) Info\s*#\s*(\d{6,12})/i.exec(text)?.[1] || /\(#(\d{6,12})\)/.exec(subject)?.[1] || "";
  if (!ref) return null;
  const b = blankBooking("seeksophie", kind, ref);
  const all = linesOf(text, true);
  b.productTitle = sophieBlock(all, /^Ref:$/i).join(" ");
  b.flightDate = parseOtaDate(sophieBlock(all, /^Activity Date:$/i).join(" ")) || parseOtaDate(subject);
  b.expectedTime = parseOtaTime(sophieBlock(all, /^Activity Time:$/i).join(" "));
  b.guestCount = countPeople(sophieBlock(all, /^Number of people:$/i).join(", "));
  b.addOns = sophieBlock(all, /^Add-ons:$/i);
  b.specialRequirements = realNote(sophieBlock(all, /^Other notes:$/i).join(" "));
  b.price = sophieBlock(all, /^Total Amount:$/i).join(" ");
  b.net = sophieBlock(all, /^Your Earnings:$/i).join(" ");
  b.leadName = /^Guest Contact\s*-\s*(.+)$/im.exec(text)?.[1]?.trim() || /Booking for .+? for (.+?) is confirmed/i.exec(text.replace(/\n/g, " "))?.[1] || "";
  for (const l of sophieBlock(all, /^Or contact them on:$/i)) {
    if (!b.phone && /^\+?[\d\s()-]{8,}$/.test(l)) b.phone = normalizeOtaPhone(l.startsWith("+") ? l : l.replace(/\D/g, ""));
    if (!b.email && /@/.test(l)) b.email = customerEmail(l);
  }
  return b;
}

function classifySeekSophie(from: string, subject: string, text: string): OtaMailVerdict {
  const refOf = () => /(?:Info\s*#|\(#)(\d{6,12})/i.exec(`${subject}\n${text}`)?.[1] ?? "";
  if (/^NEW IN:|newsletter|webinar/i.test(subject)) return { type: "junk", reason: "tin quảng cáo Seek Sophie" };
  if (/(new booking request|booking on hold|request expiring|request has expired)/i.test(subject)) {
    return { type: "pending", ref: refOf(), reason: "mới hỏi giữ chỗ / chờ duyệt — chưa thành đơn" };
  }
  if (/^(re|fwd?|tr)\s*:/i.test(subject)) return { type: "notice", ref: refOf(), reason: "thư trả lời qua lại" };
  if (/parse\.seeksophie\.com/i.test(from) || /(new message from|haven't responded to)/i.test(subject)) {
    return { type: "notice", ref: refOf(), reason: "khách nhắn tin trên Seek Sophie" };
  }
  /**
   * "Trip on 10 Sep 2026 - Info from Lau Hwee Jen": khách gửi chỗ đón / lời nhắn
   * SAU khi đặt, thư KHÔNG có mã đơn. Không tự ghép vào booking (ghép theo tên +
   * ngày dễ nhầm), chỉ để trong lịch sử kèm nội dung cho điều phối đọc.
   */
  if (/^Trip on .+ Info from/i.test(subject)) {
    const pick = /^Start point:\s*$/im.test(text) ? (sophieBlock(linesOf(text, true), /^Start point:$/i)[0] ?? "") : "";
    return { type: "notice", ref: "", reason: `khách gửi thông tin chuyến${pick ? ` (${pick})` : ""} — đọc thư, ghi tay vào booking nếu cần` };
  }
  const b = parseSeekSophie(subject, text);
  if (b) return { type: "booking", booking: b };
  return { type: "unknown" };
}

/* ------------------------------------------------------------------ */

/**
 * Xếp loại một thư của năm OTA trên. `ota` là khoá đã suy từ địa chỉ gửi
 * (otaFromSender). Không đọc nổi thì trả "unknown" — lối cũ đưa vào khay chờ
 * duyệt, không bao giờ bỏ im.
 */
export function classifyOtaMail(ota: string, from: string, subject: string, body: string): OtaMailVerdict {
  const text = cleanMailText(body);
  const subj = String(subject ?? "").replace(/\s+/g, " ").trim();
  const sender = String(from ?? "");
  switch (ota) {
    case "viator":
      return classifyViator(sender, subj, text);
    case "gyg":
      return classifyGyg(sender, subj, text);
    case "trip":
      return classifyTrip(sender, subj, text);
    case "kkday":
      return classifyKkday(sender, subj, text);
    case "seeksophie":
      return classifySeekSophie(sender, subj, text);
    default:
      return { type: "unknown" };
  }
}

/**
 * Dịch vụ kèm suy từ gói + add-on — để GHI CHÚ cho điều phối (xếp người quay
 * flycam / cầm 360). Không điền vào ô đếm flycam/360 của booking: ô đó đi vào
 * báo cáo dịch vụ và tiền, máy đoán sai là lệch sổ.
 */
export function extrasOf(b: OtaBookingMail): string[] {
  const out: string[] = [];
  const hay = `${b.optionTitle} ${b.addOns.join(" ")}`;
  const countOf = (re: RegExp) => {
    const hit = b.addOns.find((a) => re.test(a));
    return Number(/^(\d{1,3})\s*x/i.exec(hit ?? "")?.[1] ?? 0);
  };
  if (/(drone|flycam)/i.test(hay)) {
    const n = countOf(/(drone|flycam)/i) || (/(drone|flycam)/i.test(b.optionTitle) ? b.guestCount : 0);
    out.push(`flycam${n ? ` ×${n}` : ""}`);
  }
  if (/360/.test(hay)) {
    const n = countOf(/360/);
    out.push(`360${n ? ` ×${n}` : ""}`);
  }
  /**
   * Bay đặc biệt (chủ 02/10/2026): hoàng hôn / bình minh / săn mây là MỘT dịch
   * vụ trong app (ô `sunset`), bay lâu là dịch vụ riêng. Cũng chỉ GHI CHÚ như
   * flycam/360 — khớp chữ trên tên gói OTA dễ sai, điền thẳng ô đếm là lệch tiền.
   */
  const DAC_BIET = /(sunset|sunrise|cloud[\s-]*hunt|sea of clouds|hoàng hôn|hoang hon|bình minh|binh minh|săn mây|san may)/i;
  if (DAC_BIET.test(hay)) {
    const n = countOf(DAC_BIET);
    out.push(`H.hôn/S.mây/B.minh${n ? ` ×${n}` : ""}`);
  }
  const BAY_LAU = /(long(?:er)?[\s-]*flight|extended[\s-]*flight|bay lâu|bay lau)/i;
  if (BAY_LAU.test(hay)) {
    const n = countOf(BAY_LAU);
    out.push(`bay lâu${n ? ` ×${n}` : ""}`);
  }
  return out;
}
