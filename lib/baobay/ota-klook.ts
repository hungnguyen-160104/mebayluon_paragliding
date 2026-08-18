// lib/baobay/ota-klook.ts

/**
 * Bóc thư đặt chỗ của KLOOK thành booking nội bộ.
 *
 * Ba loại thư dùng CHUNG một bố cục thân thư, chỉ khác câu mở đầu và tiêu đề:
 *   - "Klook has confirmed an order"      → đặt mới
 *   - "has now been cancelled"            → huỷ
 *   - "A request to amend booking"        → xin đổi lịch
 *
 * Thư đổi lịch ghi CẢ HAI giá trị trên cùng một dòng, cũ trước mới sau, cách
 * nhau bằng vài khoảng trắng:  "Date Request: 2026-08-10   2026-12-07".
 * Nên với thư này luôn lấy giá trị CUỐI làm số mới.
 *
 * Thư Klook KHÔNG có tiền — khách trả cho Klook rồi, quầy không thu gì nữa.
 */

export type KlookMailKind = "new" | "cancel" | "amend";

export type OtaGuest = {
  fullName: string;
  /** "dd/mm/yyyy" — dạng dùng cho bảo hiểm. */
  birthday: string;
  gender: string;
  idNumber: string;
  nationality: string;
};

export type KlookBooking = {
  kind: KlookMailKind;
  /** Mã booking của Klook — khoá đối chiếu, vd "ENB058227". */
  ref: string;
  productTitle: string;
  packageLabel: string;
  /** "YYYY-MM-DD" — thư đổi lịch trả về ngày MỚI. */
  flightDate: string;
  /** Ngày cũ, chỉ có ở thư đổi lịch. */
  previousDate?: string;
  /** "HH:MM" nếu đọc được; Klook hay ghi "NA" hoặc "7am". */
  expectedTime: string;
  /** Nguyên văn giờ khách mong muốn, giữ lại cho điều phối đọc. */
  preferredTimeRaw: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  nationality: string;
  guestCount: number;
  departure: string;
  specialRequirements: string;
  guests: OtaGuest[];
};

/**
 * Chuẩn hoá thư nhưng GIỮ NGUYÊN cụm nhiều khoảng trắng: thư đổi lịch phân cách
 * "giá trị cũ" và "giá trị mới" bằng đúng mấy khoảng trắng đó — gộp lại là mất
 * luôn ngày mới.
 */
function tidy(raw: string): string {
  return String(raw ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "  ");
}

/** Lấy phần sau "Nhãn:" trên đúng dòng đó. */
function field(text: string, label: string): string {
  const re = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`, "im");
  return re.exec(text)?.[1]?.trim() ?? "";
}

/**
 * Dòng của thư ĐỔI LỊCH có hai giá trị "cũ  mới" — cắt theo cụm 2+ khoảng trắng
 * rồi lấy cụm cuối. Thư thường thì chỉ có một cụm, lấy cụm đó.
 */
function lastValue(value: string): { latest: string; previous?: string } {
  const parts = value
    .split(/\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) return { latest: parts[parts.length - 1], previous: parts[0] };

  // Dự phòng: thư bị gộp khoảng trắng thì bắt theo dạng "ngày cũ ngày mới"
  const twoDates = /^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$/.exec(value.trim());
  if (twoDates) return { latest: twoDates[2], previous: twoDates[1] };
  return { latest: value.trim() };
}

function kindOf(subject: string, body: string): KlookMailKind | null {
  const s = `${subject} ${body}`.toLowerCase();
  if (s.includes("amend")) return "amend";
  if (s.includes("cancel")) return "cancel"; // gồm cả "canceled" và "cancelled"
  if (s.includes("confirmed an order") || s.includes("order confirmed")) return "new";
  return null;
}

/** "2003-04-29" → "29/04/2003"; giữ nguyên nếu không đúng dạng. */
function toVnDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso.trim();
}

/** "62-82225130415" → "+6282225130415"; số Việt "84-9…" → "09…" cho dễ gọi. */
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+-]/g, "");
  const m = /^(\d{1,3})-0?(\d+)$/.exec(cleaned);
  if (!m) return cleaned.replace(/-/g, "");
  const [, cc, rest] = m;
  if (cc === "84") return `0${rest}`;
  return `+${cc}${rest}`;
}

/** "1 x Person" · "1 x 1 person" · "2 x Adult" → số khách. */
function guestCountOf(raw: string): number {
  const m = /^\s*(\d+)\s*x/i.exec(raw);
  return m ? Math.max(1, Number(m[1])) : 1;
}

/** "7am" · "07:30" · "NA" → "HH:MM" hoặc "" nếu không đọc được. */
function toHHMM(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v || v === "na" || v === "n/a") return "";
  const hhmm = /^(\d{1,2})[:h](\d{2})/.exec(v);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  const ampm = /^(\d{1,2})\s*(am|pm)/.exec(v);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[2] === "pm") h += 12;
    return `${String(h).padStart(2, "0")}:00`;
  }
  return "";
}

/** Bóc từng hành khách: Participant1 Full name / Title / Country / Date of birth / ID number. */
function parseGuests(text: string, nationalityFallback: string): OtaGuest[] {
  const out: OtaGuest[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = lastValue(field(text, `Participant${i} Full name`)).latest;
    const title = lastValue(field(text, `Participant${i} Title`)).latest;
    const country = lastValue(field(text, `Participant${i} Country/region`)).latest;
    const dob = lastValue(field(text, `Participant${i} Date of birth`)).latest;
    const idNumber = lastValue(field(text, `Participant${i} ID number (Passport)`)).latest;
    if (!name && !dob && !idNumber) continue;
    const t = title.toLowerCase();
    out.push({
      fullName: name.toUpperCase(),
      birthday: toVnDate(dob),
      gender: t.startsWith("mr") && !t.startsWith("mrs") ? "Nam" : t.startsWith("ms") || t.startsWith("mrs") || t.startsWith("miss") ? "Nữ" : "",
      idNumber,
      nationality: country || nationalityFallback,
    });
  }
  return out;
}

/** Điểm bay suy từ tên sản phẩm — tên lạ thì trả null để người soát tự chọn. */
export function spotFromProduct(title: string): "ha-noi" | "khau-pha" | "sapa" | null {
  const t = title.toLowerCase();
  if (RE_KHAU_PHA.test(t)) return "khau-pha";
  if (RE_SAPA.test(t)) return "sapa";
  if (RE_HA_NOI.test(t)) return "ha-noi";
  return null;
}

const RE_KHAU_PHA = /(khau pha|khau phạ|mu cang chai|mù cang chải|yen bai|yên bái)/;
const RE_SAPA = /(sa pa|sapa|sa-pa|lao cai|lào cai|fansipan|muong hoa|mường hoa)/;
const RE_HA_NOI = /(ha noi|hanoi|hà nội|ba vi|ba vì|doi bu|đồi bù|vien nam|viên nam)/;

/**
 * ĐIỂM BAY SUY TỪ CẢ THÂN THƯ — dùng khi tên sản phẩm không nói ra điểm.
 *
 * Vì sao cần: điểm Sa Pa được bán cả trên hộp thư mebayluon@gmail.com, mà tên
 * sản phẩm của OTA nhiều khi chỉ ghi "Paragliding Tour in Vietnam" — chỗ duy
 * nhất nhắc Sa Pa là trong thân thư ("Sapa Paragliding", "dù lượn Sa Pa", điểm
 * đón ở Lào Cai…).
 *
 * Nhắc TỪ HAI ĐIỂM TRỞ LÊN thì trả null: chân thư quảng cáo hay thư gộp nhiều
 * sản phẩm sẽ nhắc đủ cả ba điểm, đoán bừa là booking rơi sai sổ — thà để người
 * duyệt chọn tay. Đó cũng là lý do không đoán bằng một cụm rời rạc: phải là
 * NHẮC ĐÚNG MỘT điểm trong toàn bộ thư.
 */
export function spotFromEmailText(text: string): "ha-noi" | "khau-pha" | "sapa" | null {
  const t = (text || "").toLowerCase();
  const hit = [
    RE_KHAU_PHA.test(t) ? ("khau-pha" as const) : null,
    RE_SAPA.test(t) ? ("sapa" as const) : null,
    RE_HA_NOI.test(t) ? ("ha-noi" as const) : null,
  ].filter(Boolean) as Array<"ha-noi" | "khau-pha" | "sapa">;
  return hit.length === 1 ? hit[0] : null;
}

export function parseKlookEmail(subject: string, bodyRaw: string): KlookBooking | null {
  const body = tidy(bodyRaw);
  const kind = kindOf(subject, body);
  if (!kind) return null;

  const ref = (field(body, "Booking reference ID") || /\b([A-Z]{2,4}\d{5,8})\b/.exec(subject)?.[1] || "").trim();
  if (!ref) return null;

  const dateField = lastValue(field(body, "Date Request"));
  const timeField = lastValue(field(body, "Time Request"));
  const preferred = lastValue(field(body, "Preferred time"));
  const nationality = lastValue(field(body, "Country/region of passport")).latest;

  /**
   * Tên sản phẩm: dòng đứng ngay trước dòng "Package:" — Klook lặp lại tên đầy
   * đủ ở đó, còn tiêu đề thư thì bị cắt bằng "…".
   */
  const lines = body.split("\n").map((l) => l.trim());
  const pkgIdx = lines.findIndex((l) => /^Package\s*:/i.test(l));
  const productTitle = pkgIdx > 0 ? lines[pkgIdx - 1] : "";

  return {
    kind,
    ref,
    productTitle,
    packageLabel: lastValue(field(body, "Package")).latest,
    flightDate: dateField.latest,
    previousDate: dateField.previous,
    expectedTime: toHHMM(timeField.latest) || toHHMM(preferred.latest),
    preferredTimeRaw: preferred.latest,
    leadName: lastValue(field(body, "Lead participant")).latest.replace(/^\([^)]*\)\s*/, "").trim(),
    leadEmail: lastValue(field(body, "Lead person email")).latest,
    leadPhone: normalizePhone(lastValue(field(body, "Lead person mobile")).latest),
    nationality,
    guestCount: guestCountOf(lastValue(field(body, "Participant")).latest),
    departure: lastValue(field(body, "Departure location")).latest,
    specialRequirements: lastValue(field(body, "Special requirements")).latest,
    guests: parseGuests(body, nationality),
  };
}

/** Chỗ đón của Klook → ô "đưa đón" trong app. */
export function pickupFromDeparture(departure: string): {
  pickup: "self" | "bigc" | "hotel" | "other";
  pickupNote: string;
} {
  const d = departure.toLowerCase();
  if (!d) return { pickup: "self", pickupNote: "" };
  if (/(go!|go |big ?c|thang long|thăng long)/.test(d)) return { pickup: "bigc", pickupNote: "" };
  if (/hotel/.test(d)) return { pickup: "hotel", pickupNote: departure };
  if (/(self|meeting point|flying site)/.test(d)) return { pickup: "self", pickupNote: "" };
  return { pickup: "other", pickupNote: departure };
}
