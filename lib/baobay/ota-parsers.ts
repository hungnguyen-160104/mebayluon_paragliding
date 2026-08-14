// lib/baobay/ota-parsers.ts

/**
 * Nhận dạng thư của TỪNG OTA: loại thư, mã đặt chỗ, ngày bay.
 *
 * Mỗi bên một kiểu ghi, nên chỗ khác nhau khai thành bảng cấu hình chứ không
 * viết năm bộ đọc rời — sau này có mẫu thư thật chỉ phải sửa một dòng trong bảng.
 *
 *   GYG        mã dạng GYG… / S687438, ngày nằm trong thân thư
 *   KKday      thư tiếng Việt, mã dạng 26KK…, huỷ ghi cả "huỷ" lẫn "hủy"
 *   SeekSophie mã chỉ có trong thân thư, ngày kiểu "04 Jul 2026"
 *   Viator     mã dạng BR-…, ngày kiểu "Mon, Aug 31, 2026"
 *   Trip.com   mã toàn số dài, thư song ngữ Anh/Trung
 *
 * Riêng Klook có bộ đọc riêng (ota-klook.ts) vì thư của họ đủ trường để dựng
 * thẳng booking, kể cả giấy tờ từng khách.
 */

import { findDate, parseGenericOtaEmail, type GenericOtaDraft } from "@/lib/baobay/ota-generic";

export type OtaKey = "klook" | "gyg" | "kkday" | "seeksophie" | "viator" | "trip";

/**
 * Đoán OTA theo ĐỊA CHỈ NGƯỜI GỬI — cách nhận diện bền nhất, vì mọi thư đều đổ
 * về một hộp (mebayluon@gmail.com): tiêu đề thì mỗi mùa mỗi kiểu, nhưng tên miền
 * gửi thư của OTA gần như không bao giờ đổi.
 */
const SENDER_DOMAIN: Array<[RegExp, OtaKey]> = [
  [/klook/i, "klook"],
  [/getyourguide|gyg\.\w+/i, "gyg"],
  [/kkday/i, "kkday"],
  [/seeksophie/i, "seeksophie"],
  [/viator|tripadvisor/i, "viator"],
  [/trip\.com|ctrip/i, "trip"],
];

export function otaFromSender(from: string): OtaKey | null {
  for (const [re, key] of SENDER_DOMAIN) {
    if (re.test(from)) return key;
  }
  return null;
}

type OtaConfig = {
  label: string;
  /** Cách bắt mã đặt chỗ, thử lần lượt trên tiêu đề rồi thân thư. */
  refPatterns: RegExp[];
  /** Tiêu đề báo hiệu thư HUỶ. */
  cancel: RegExp;
  /** Tiêu đề báo hiệu thư SỬA ĐƠN. */
  amend: RegExp;
  /** Tiêu đề báo hiệu ĐẶT MỚI thật sự (đã chốt, không phải hỏi giữ chỗ). */
  confirmed: RegExp;
  /**
   * Trạng thái TRUNG GIAN — hỏi giữ chỗ, chờ duyệt, sắp hết hạn…
   * Tuyệt đối không đưa vào lịch bay: khách chưa chắc bay.
   */
  pending?: RegExp;
};

export const OTA_CONFIG: Record<OtaKey, OtaConfig> = {
  klook: {
    label: "Klook",
    refPatterns: [/\b([A-Z]{3}\d{6})\b/],
    cancel: /order cancel(l)?ed/i,
    amend: /booking amendment request/i,
    confirmed: /order confirmed/i,
  },
  gyg: {
    label: "GetYourGuide",
    // GYG dùng cả mã nội bộ (S687438) lẫn mã GYG… — bắt cả hai
    refPatterns: [/\b(GYG[A-Z0-9]{5,12})\b/i, /\b(S\d{6,8})\b/],
    cancel: /(cancel(l)?ed|cancellation)/i,
    amend: /booking detail change/i,
    confirmed: /(new booking|booking confirm)/i,
  },
  kkday: {
    label: "KKday",
    refPatterns: [/\b(\d{2}KK[A-Z0-9]{4,12})\b/i, /\b(KK[A-Z0-9]{6,14})\b/i],
    // Thư tiếng Việt: phải bắt cả hai cách viết "huỷ" và "hủy"
    cancel: /(hu[ỷỳy]|hủy|cancel(l)?ed)/i,
    amend: /(thay đổi|đổi lịch|amend|change)/i,
    confirmed: /(xác nhận|đặt chỗ thành công|order confirmed|new order)/i,
  },
  seeksophie: {
    label: "Seek Sophie",
    refPatterns: [/\b(SS[A-Z0-9]{5,12})\b/i, /\b([A-Z0-9]{8,12})\b/],
    cancel: /cancel(l)?ed/i,
    amend: /(amend|change|reschedul)/i,
    confirmed: /booking confirmed/i,
    /**
     * Bốn trạng thái trung gian của Seek Sophie — khách MỚI HỎI, chưa thành đơn.
     * Đưa vào lịch là điều phối chuẩn bị người và dù cho chuyến không có thật.
     */
    pending: /(new booking request|booking on hold|request expiring|request has expired)/i,
  },
  viator: {
    label: "Viator",
    refPatterns: [/\b(BR-\d{4,12})\b/i, /\b(\d{9,12})\b/],
    cancel: /(cancel(l)?ed booking|booking cancel)/i,
    amend: /amended booking/i,
    confirmed: /(new booking|booking confirmation)/i,
  },
  trip: {
    label: "Trip.com",
    refPatterns: [/\border\s*(?:no|number|id)?[.:：#\s]*(\d{10,19})\b/i, /\b(\d{10,19})\b/],
    cancel: /(cancel(l)?ed|cancellation)/i,
    amend: /(amend|change|modif)/i,
    confirmed: /(new order|order confirmed|booking confirmed|confirmation)/i,
  },
};

export type OtaMailRead = {
  ota: OtaKey;
  /** "new" đặt mới · "cancel" huỷ · "amend" sửa đơn · "pending" hỏi giữ chỗ · "unknown". */
  kind: "new" | "cancel" | "amend" | "pending" | "unknown";
  ref: string;
  flightDate: string;
  expectedTime: string;
  guestCount: number;
  contactName: string;
  phone: string;
  email: string;
  /** Cân nặng từng khách (kg) — điều phối cần để xếp phi công/dù bay đôi. */
  weights: number[];
  /** Khách sạn / điểm đón nếu thư có ghi. */
  hotel: string;
  highlights: string[];
};

function firstMatch(patterns: RegExp[], ...texts: string[]): string {
  for (const text of texts) {
    for (const re of patterns) {
      const hit = re.exec(text)?.[1];
      if (hit) return hit.toUpperCase();
    }
  }
  return "";
}

/**
 * Đọc thư của một OTA bất kỳ (trừ Klook — dùng bộ riêng).
 *
 * Phân loại theo TIÊU ĐỀ trước, vì thân thư của mọi loại gần như giống hệt nhau:
 * thư huỷ và thư đặt mới của Klook chỉ khác đúng câu đầu.
 */
export function readOtaMail(ota: OtaKey, subject: string, body: string): OtaMailRead {
  const cfg = OTA_CONFIG[ota];
  const generic: GenericOtaDraft = parseGenericOtaEmail(subject, body);
  const head = `${subject}\n${body.slice(0, 300)}`;

  let kind: OtaMailRead["kind"] = "unknown";
  if (cfg.pending?.test(subject)) kind = "pending";
  else if (cfg.amend.test(head)) kind = "amend";
  else if (cfg.cancel.test(head)) kind = "cancel";
  else if (cfg.confirmed.test(head)) kind = "new";
  else kind = generic.kind === "unknown" ? "unknown" : generic.kind;

  return {
    ota,
    kind,
    ref: firstMatch(cfg.refPatterns, subject, body) || generic.ref,
    // Ngày: ưu tiên bản bóc theo nhãn của bộ tổng quát, rồi mới dò cả thư
    flightDate: generic.flightDate || findDate(body),
    expectedTime: generic.expectedTime,
    guestCount: generic.guestCount,
    contactName: generic.contactName,
    phone: generic.phone,
    email: generic.email,
    weights: generic.weights,
    hotel: generic.hotel,
    highlights: generic.highlights,
  };
}

export function isOtaKey(value: string): value is OtaKey {
  return value in OTA_CONFIG;
}
