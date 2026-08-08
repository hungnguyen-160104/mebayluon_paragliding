// lib/booking/phone.ts
/**
 * Kiểm tra số điện thoại khách nhập ở bước 2 của trang đặt bay.
 *
 * Số điện thoại là thông tin quan trọng nhất của một booking: sai một chữ số
 * là mất liên lạc, không xác nhận được lịch bay, không báo được thời tiết xấu.
 * Vì vậy phải chặn ngay lúc nhập chứ không để lọt xuống bước 4.
 *
 * Khách được phép gõ CÓ hoặc KHÔNG có số 0 đầu ("0912 345 678" và
 * "912 345 678" đều đúng), cũng như dùng dấu cách, chấm, gạch nối, ngoặc —
 * hàm tự dọn. Cái bị chặn là chữ cái, ký tự lạ, và độ dài sai.
 */

export type PhoneErrorCode =
  /** Chưa nhập gì */
  | "empty"
  /** Có chữ cái hoặc ký tự không phải chữ số */
  | "chars"
  /** Đúng định dạng chữ số nhưng độ dài / đầu số không hợp lệ */
  | "invalid";

/** Số chữ số hợp lệ của phần thuê bao (đã bỏ mã vùng và số 0 đầu). */
const NATIONAL_LENGTH: Record<string, { min: number; max: number }> = {
  "+84": { min: 9, max: 10 }, // di động 9 số, cố định 9–10 số
  "+1": { min: 10, max: 10 },
  "+44": { min: 9, max: 10 },
  "+33": { min: 9, max: 9 },
  "+7": { min: 10, max: 10 },
  "+91": { min: 10, max: 10 },
  "+86": { min: 11, max: 11 },
  "+81": { min: 9, max: 10 },
  "+82": { min: 9, max: 10 },
  "+49": { min: 9, max: 11 },
  "+66": { min: 9, max: 9 },
  "+61": { min: 9, max: 9 },
};

/** Mặc định cho mã vùng chưa liệt kê ở trên. */
const DEFAULT_LENGTH = { min: 6, max: 14 };

/**
 * Bỏ mọi ký tự trình bày (dấu cách, chấm, gạch nối, ngoặc) và số 0 đứng đầu.
 * Trả về chuỗi chỉ gồm chữ số — phần thuê bao ở dạng quốc tế.
 */
export function normalizeNationalNumber(raw: string): string {
  const digits = String(raw ?? "").replace(/[\s.\-()]/g, "");
  return digits.replace(/^0+/, "");
}

/** Còn ký tự nào không phải chữ số sau khi dọn dấu trình bày không? */
function hasNonDigit(raw: string): boolean {
  return /[^\d]/.test(String(raw ?? "").replace(/[\s.\-()]/g, ""));
}

/**
 * Đầu số di động Việt Nam sau khi bỏ số 0: 3, 5, 7, 8, 9.
 * Số cố định bắt đầu bằng 2. Các đầu số khác (1, 4, 6) không tồn tại.
 */
function isValidVietnamNumber(national: string): boolean {
  if (!/^[235789]/.test(national)) return false;
  if (national.startsWith("2")) return national.length === 9 || national.length === 10;
  return national.length === 9;
}

/**
 * Trả về mã lỗi, hoặc null nếu số hợp lệ.
 * `raw` là phần khách gõ trong ô, KHÔNG kèm mã vùng.
 */
export function validatePhoneNumber(
  countryCode: string,
  raw: string,
): PhoneErrorCode | null {
  if (!String(raw ?? "").trim()) return "empty";
  if (hasNonDigit(raw)) return "chars";

  const national = normalizeNationalNumber(raw);
  if (!national) return "invalid";

  if (countryCode === "+84") {
    return isValidVietnamNumber(national) ? null : "invalid";
  }

  const { min, max } = NATIONAL_LENGTH[countryCode] ?? DEFAULT_LENGTH;
  return national.length >= min && national.length <= max ? null : "invalid";
}

/**
 * Số hoàn chỉnh để lưu vào booking: "+84 912345678".
 * Luôn ở dạng quốc tế, không có số 0 đầu, không có dấu trình bày — nhờ vậy
 * mã booking sinh từ 4 số cuối và việc tra cứu trùng khách luôn nhất quán,
 * dù khách gõ "0912.345.678" hay "912 345 678".
 */
export function formatPhoneForStorage(
  countryCode: string,
  raw: string,
): string {
  const national = normalizeNationalNumber(raw);
  return national ? `${countryCode} ${national}` : countryCode;
}

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/** Ví dụ hiển thị trong thông báo lỗi, theo mã vùng đang chọn. */
const EXAMPLE: Record<string, string> = {
  "+84": "0912 345 678",
  "+1": "202 555 0147",
  "+44": "07700 900123",
  "+33": "06 12 34 56 78",
  "+7": "912 345 67 89",
  "+91": "98765 43210",
  "+86": "138 0013 8000",
  "+81": "90 1234 5678",
  "+82": "10 1234 5678",
  "+49": "151 23456789",
  "+66": "81 234 5678",
  "+61": "412 345 678",
};

const MESSAGES: Record<Lang, Record<PhoneErrorCode, (ex: string) => string>> = {
  vi: {
    empty: () => "Vui lòng nhập số điện thoại.",
    chars: () => "Số điện thoại chỉ gồm chữ số. Vui lòng nhập lại.",
    invalid: (ex) =>
      `Số điện thoại chưa đúng. Vui lòng nhập lại, có hoặc không có số 0 đầu đều được (ví dụ ${ex}).`,
  },
  en: {
    empty: () => "Please enter your phone number.",
    chars: () => "Phone numbers may contain digits only. Please try again.",
    invalid: (ex) =>
      `That phone number doesn't look right. Please re-enter it, with or without the leading zero (e.g. ${ex}).`,
  },
  fr: {
    empty: () => "Veuillez saisir votre numéro de téléphone.",
    chars: () =>
      "Le numéro ne doit contenir que des chiffres. Veuillez réessayer.",
    invalid: (ex) =>
      `Ce numéro semble incorrect. Merci de le saisir à nouveau, avec ou sans le zéro initial (ex. ${ex}).`,
  },
  ru: {
    empty: () => "Пожалуйста, укажите номер телефона.",
    chars: () => "Номер может содержать только цифры. Попробуйте ещё раз.",
    invalid: (ex) =>
      `Похоже, номер указан неверно. Введите его заново — с ведущим нулём или без (например, ${ex}).`,
  },
  zh: {
    empty: () => "请填写电话号码。",
    chars: () => "电话号码只能包含数字，请重新输入。",
    invalid: (ex) =>
      `电话号码似乎有误，请重新输入，开头有没有 0 都可以（例如 ${ex}）。`,
  },
  hi: {
    empty: () => "कृपया अपना फ़ोन नंबर भरें।",
    chars: () => "फ़ोन नंबर में केवल अंक हो सकते हैं। दोबारा भरें।",
    invalid: (ex) =>
      `यह नंबर सही नहीं लग रहा। कृपया दोबारा भरें — शुरुआती शून्य के साथ या बिना (जैसे ${ex})।`,
  },
};

export function phoneErrorMessage(
  lang: string,
  code: PhoneErrorCode,
  countryCode: string,
): string {
  const set = MESSAGES[(lang as Lang) in MESSAGES ? (lang as Lang) : "vi"];
  return set[code](EXAMPLE[countryCode] ?? EXAMPLE["+84"]);
}
