// lib/baobay/ticket-code.ts
/**
 * Mã vé Khau Phạ có dạng tiền tố + số tăng dần: KP-001234.
 *
 * Quầy vé chỉ nhập "từ mã ... đến mã ..." rồi số lượng tự hiện ra, nên phải
 * tách được phần số ra khỏi tiền tố. Tách bằng cách bắt cụm số Ở CUỐI mã
 * (không phải cụm số đầu tiên): tiền tố có thể chứa số như "KP2-001234", còn
 * phần đếm thì luôn ở cuối.
 *
 * Số 0 ở đầu được giữ nguyên (width) để lúc bung khoảng mã ra vẫn in đúng
 * dạng vé thật: 001234, không phải 1234.
 */

export type ParsedTicketCode = {
  /** Phần không phải số ở cuối, ví dụ "KP-". Có thể rỗng nếu vé chỉ có số. */
  prefix: string;
  /** Phần số nguyên văn, giữ số 0 ở đầu: "001234". */
  digits: string;
  num: number;
  /** Số chữ số, dùng để pad khi in lại mã. */
  width: number;
  /** Mã sau khi chuẩn hoá (in hoa, bỏ khoảng trắng). */
  code: string;
};

/**
 * Chặn trên khi bung một khoảng mã thành danh sách. Một ngày Khau Phạ bay
 * nhiều nhất vài trăm vé; con số này chỉ để một lần gõ sai (KP-1 đến
 * KP-999999) không làm treo máy chủ.
 */
export const MAX_RANGE_SIZE = 5000;

/**
 * Dạng mã vé hợp lệ: 1–3 CHỮ CÁI, có thể kèm một dấu gạch, rồi 3–6 CHỮ SỐ.
 *
 * Hợp lệ:    AB1234 · A1234 · KP-001234 · KPA-0012
 * Không hợp lệ: 1234 (thiếu chữ đầu) · ABCD1234 (quá 3 chữ) · AB12 (dưới 3 số)
 *
 * Đây là điều kiện để phi công CHỐT được báo cáo: sai dạng thì bộ đối chiếu
 * không thể so mã của phi công với dải mã kế toán xuất, và cả ngày sẽ treo vì
 * một mã gõ sai. Lưu thì vẫn lưu được (khỏi mất công nhập lại phần khác), chỉ
 * là chưa chốt được cho tới khi sửa.
 */
export const TICKET_CODE_PATTERN = /^[A-Z]{1,3}-?\d{3,6}$/;

export const TICKET_CODE_HINT =
  "Mã vé gồm 1–3 chữ cái rồi 3–6 chữ số, ví dụ AB1234 hoặc KP-001234";

export function isValidTicketCode(raw: unknown): boolean {
  return TICKET_CODE_PATTERN.test(normalizeTicketCode(raw));
}

export function normalizeTicketCode(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function parseTicketCode(raw: unknown): ParsedTicketCode | null {
  const code = normalizeTicketCode(raw);
  if (!code) return null;

  // Tiền tố "lười" (.*?) + cụm số neo ở cuối ($) => luôn lấy cụm số cuối cùng.
  const m = code.match(/^(.*?)(\d+)$/);
  if (!m) return null;

  const [, prefix, digits] = m;
  // Quá 12 chữ số thì Number() bắt đầu mất chính xác — vé không bao giờ dài thế.
  if (digits.length > 12) return null;

  return { prefix, digits, num: Number(digits), width: digits.length, code };
}

export function formatTicketCode(prefix: string, num: number, width: number): string {
  return `${prefix}${String(num).padStart(width, "0")}`;
}

export type TicketRangeResult =
  | { ok: true; count: number; from: ParsedTicketCode; to: ParsedTicketCode }
  | { ok: false; error: string };

/**
 * Số lượng vé trong khoảng [from, to], tính cả hai đầu.
 * Trả về lỗi bằng tiếng Việt để hiện thẳng dưới ô nhập, không phải dịch lại.
 */
export function countTicketRange(fromRaw: unknown, toRaw: unknown): TicketRangeResult {
  const fromText = normalizeTicketCode(fromRaw);
  const toText = normalizeTicketCode(toRaw);

  if (!fromText) return { ok: false, error: "Chưa nhập mã bắt đầu" };
  if (!toText) return { ok: false, error: "Chưa nhập mã kết thúc" };

  const from = parseTicketCode(fromText);
  if (!from) return { ok: false, error: `Mã “${fromText}” không có phần số` };

  const to = parseTicketCode(toText);
  if (!to) return { ok: false, error: `Mã “${toText}” không có phần số` };

  if (from.prefix !== to.prefix) {
    return {
      ok: false,
      error: `Hai mã khác tiền tố (“${from.prefix || "không có"}” và “${to.prefix || "không có"}”)`,
    };
  }

  if (to.num < from.num) {
    return { ok: false, error: "Mã kết thúc nhỏ hơn mã bắt đầu" };
  }

  return { ok: true, count: to.num - from.num + 1, from, to };
}

export type ExpandResult = { ok: true; codes: string[] } | { ok: false; error: string };

/** Bung khoảng mã thành danh sách mã đầy đủ. */
export function expandTicketRange(fromRaw: unknown, toRaw: unknown): ExpandResult {
  const range = countTicketRange(fromRaw, toRaw);
  if (!range.ok) return range;

  if (range.count > MAX_RANGE_SIZE) {
    return { ok: false, error: `Khoảng mã quá lớn (${range.count} vé)` };
  }

  const width = Math.max(range.from.width, range.to.width);
  const codes: string[] = [];
  for (let n = range.from.num; n <= range.to.num; n += 1) {
    codes.push(formatTicketCode(range.from.prefix, n, width));
  }
  return { ok: true, codes };
}

export type TicketCodeListResult = {
  /** Mã đọc được, đã chuẩn hoá và bỏ trùng, giữ thứ tự nhập. */
  codes: string[];
  /** Cụm không đọc được (không có phần số, khoảng mã sai...). */
  invalid: string[];
  /** Mã bị nhập hai lần — không tính vào `codes`, chỉ để cảnh báo. */
  duplicates: string[];
  /**
   * Mã đọc được nhưng SAI DẠNG (xem TICKET_CODE_PATTERN).
   *
   * Vẫn nằm trong `codes` để người nhập không mất phần đã gõ và còn thấy mà
   * sửa — nhưng còn mã ở đây thì không chốt được báo cáo.
   */
  malformed: string[];
};

/**
 * Ký tự tạm thay cho dấu khoảng (".." "->" "→") trong lúc cắt chuỗi.
 *
 * PHẢI là ký tự không nằm trong danh sách dấu tách bên dưới. Dùng khoảng trắng
 * thì "AB1234..AB1237" bị cắt thành hai mã rời, mất luôn ý nghĩa khoảng mã.
 */
const RANGE_MARK = "\u0000";

/**
 * Đọc ô "mã vé đã bay" phi công dán vào.
 *
 * Nhận mọi kiểu ngăn cách hay gặp khi dán từ điện thoại: khoảng trắng, dấu
 * phẩy, chấm phẩy, DẤU CHẤM, gạch chéo, gạch dọc, xuống dòng — và cả DẤU GẠCH
 * (cách phân xử nằm trong thân hàm, vì mã vé cũng có thể chứa dấu gạch).
 *
 * Khoảng mã viết bằng ".." hoặc "->" (AB1234..AB1240). Không dùng dấu gạch đơn
 * làm dấu khoảng: "AB1234-AB1240" được hiểu là HAI mã chứ không phải bảy —
 * người nhập gõ gạch để tách, không phải để chỉ khoảng.
 */
export function parseTicketCodeList(text: unknown): TicketCodeListResult {
  /**
   * Chỉ IN HOA, KHÔNG gọi normalizeTicketCode ở đây: hàm đó xoá MỌI khoảng
   * trắng (đúng cho một mã đơn lẻ) nên sẽ dán cả danh sách thành một chuỗi —
   * "AB1234 AB1235" thành "AB1234AB1235".
   */
  const raw = String(text ?? "").toUpperCase();

  /**
   * Bảo vệ dấu khoảng TRƯỚC khi cắt.
   *
   * Dấu chấm cũng là dấu tách (người nhập hay gõ "AB1234. AB1235"), mà khoảng
   * mã lại viết bằng hai dấu chấm "AB1234..AB1240" — cắt trước thì khoảng mã
   * vỡ thành hai mã rời. Nên đổi mọi dạng dấu khoảng thành một ký tự riêng, cắt
   * xong mới xử lý.
   */
  const marked = raw.replace(/\s*(?:\.{2,}|…|->|→|=>)\s*/g, RANGE_MARK);

  const tokens = marked
    // Dấu tách: khoảng trắng, phẩy, chấm phẩy, chấm, gạch chéo, gạch dọc, xuống dòng.
    .split(/[\s,;.\/|\n\r]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const codes: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  const push = (code: string) => {
    if (seen.has(code)) {
      if (!duplicates.includes(code)) duplicates.push(code);
      return;
    }
    seen.add(code);
    codes.push(code);
  };

  for (const token of tokens) {
    const rangeParts = token.split(RANGE_MARK).filter(Boolean);

    if (rangeParts.length === 2) {
      const expanded = expandTicketRange(rangeParts[0], rangeParts[1]);
      if (expanded.ok) {
        expanded.codes.forEach(push);
      } else {
        invalid.push(token);
      }
      continue;
    }

    /**
     * Dấu gạch: vừa là dấu tách vừa nằm TRONG mã (KP-001234).
     *
     * Cách phân xử: mã đúng dạng thì để nguyên (KP-001234 là một mã). Không
     * đúng dạng mà cắt theo gạch ra toàn mã đúng dạng thì coi là danh sách
     * (AB1234-AB1235 là hai mã). Còn lại mới báo không đọc được.
     */
    if (token.includes("-") && !TICKET_CODE_PATTERN.test(token)) {
      const parts = token.split("-").filter(Boolean);
      if (parts.length >= 2 && parts.every((p) => TICKET_CODE_PATTERN.test(p))) {
        parts.forEach(push);
        continue;
      }
    }

    const parsed = parseTicketCode(token);
    if (!parsed) {
      invalid.push(token);
      continue;
    }
    push(parsed.code);
  }

  const malformed = codes.filter((c) => !TICKET_CODE_PATTERN.test(c));

  return { codes, invalid, duplicates, malformed };
}

export type TicketRangeInput = { from: string; to: string };

export type ExpandRangesResult = {
  /** Mọi mã trong các dải, đã bỏ trùng, giữ thứ tự. */
  codes: string[];
  /** Dải nào không đọc được, kèm lý do — hiện thẳng cạnh dòng nhập. */
  errors: Array<{ index: number; error: string }>;
  /** Mã xuất hiện ở hai dải khác nhau — gần như luôn là gõ nhầm. */
  overlaps: string[];
};

/**
 * Bung NHIỀU dải mã cùng lúc: kế toán xuất vé theo nhiều cuốn khác tiền tố
 * trong một ngày (A1234–A1256 và B1234–B1239), nên một cặp "từ – đến" không đủ.
 */
export function expandTicketRanges(ranges: TicketRangeInput[]): ExpandRangesResult {
  const seen = new Set<string>();
  const codes: string[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  const overlaps: string[] = [];

  ranges.forEach((range, index) => {
    if (!String(range?.from ?? "").trim() && !String(range?.to ?? "").trim()) return;

    const expanded = expandTicketRange(range.from, range.to);
    if (!expanded.ok) {
      errors.push({ index, error: expanded.error });
      return;
    }

    for (const c of expanded.codes) {
      if (seen.has(c)) {
        if (!overlaps.includes(c)) overlaps.push(c);
        continue;
      }
      seen.add(c);
      codes.push(c);
    }
  });

  return { codes, errors, overlaps };
}
