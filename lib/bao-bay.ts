// lib/bao-bay.ts
/**
 * BÁO BAY — phí điểm bay cho PHI CÔNG BAY ĐƠN tại Viên Nam, Khau Phạ, Quản Bạ.
 *
 * Nguồn duy nhất cho bảng giá và cách tính phí: trang /baobay, API và trang
 * quản trị đều đọc từ đây. Tệp THUẦN (không "use client", không đụng cơ sở dữ
 * liệu) để cả máy chủ lẫn trình duyệt nhập được — nhét vào tệp "use client" là
 * mã máy chủ nhập vào sẽ vỡ.
 *
 * Trình duyệt chỉ dùng hàm tính phí để VẼ bảng tạm; con số thật luôn do máy chủ
 * tính lại lúc nhận báo bay, với giờ Việt Nam của máy chủ — không tin đồng hồ
 * máy phi công, sửa giờ điện thoại là qua được mốc 8h00.
 */

import { addOneMonth, formatVnDate } from "@/lib/pilot-event";
import { toAsciiNote } from "@/lib/vietqr";

export type BaoBaySpot = "vien-nam" | "khau-pha" | "quan-ba";

export const BAO_BAY_SPOTS: BaoBaySpot[] = ["vien-nam", "khau-pha", "quan-ba"];

/** Cách phi công chọn trả tiền cho những ngày chưa được miễn. */
export type PurchaseMode = "day" | "month" | "year";

/**
 * Kết quả phí lưu trên báo bay:
 * - hnaa_free: hội viên HNAA báo trước 8h00 ngày bay (chỉ Viên Nam)
 * - pass: đã có vé tháng/năm còn hạn cho đúng điểm bay đó
 * - day / month / year: trả theo ngày, mua vé tháng, mua vé năm
 */
export type FeeMode = "hnaa_free" | "pass" | "day" | "month" | "year";

export const FEE_MODES: FeeMode[] = ["hnaa_free", "pass", "day", "month", "year"];

/** Nhãn tiếng Việt cho thư nội bộ và trang quản trị (hai nơi luôn tiếng Việt). */
export const FEE_MODE_LABEL: Record<FeeMode, string> = {
  hnaa_free: "HNAA miễn phí",
  pass: "Vé tháng/năm còn hạn",
  day: "Theo ngày",
  month: "Vé tháng",
  year: "Vé năm",
};

export const BAO_BAY_FEE_PER_DAY = 100_000;
export const BAO_BAY_FEE_PER_MONTH = 800_000;
/** Vé năm CHỈ có ở Viên Nam. */
export const BAO_BAY_FEE_PER_YEAR = 2_500_000;

type SpotConfig = {
  key: BaoBaySpot;
  /** Tên tiếng Việt — dùng cho thư nội bộ, trang quản trị, nội dung chuyển khoản. */
  name: string;
  /** Tên không dấu, ngắn, để nhét vào nội dung chuyển khoản. */
  short: string;
  /** Các cách trả tiền điểm bay này nhận. */
  purchaseModes: PurchaseMode[];
  /**
   * Viên Nam có thoả thuận với Hội dù lượn Hà Nội (HNAA): hội viên bay miễn phí
   * nếu báo bay TRƯỚC 8h00 sáng ngày bay. Hai điểm còn lại không có thoả thuận.
   */
  hnaa: boolean;
  /** Ảnh nền đầu trang khi chọn điểm bay này. */
  image: string;
};

export const BAO_BAY_SPOT_CONFIG: Record<BaoBaySpot, SpotConfig> = {
  "vien-nam": {
    key: "vien-nam",
    name: "Viên Nam",
    short: "Vien Nam",
    purchaseModes: ["day", "month", "year"],
    hnaa: true,
    image: "/spots/ha-noi/hero.jpg",
  },
  "khau-pha": {
    key: "khau-pha",
    name: "Khau Phạ",
    short: "Khau Pha",
    purchaseModes: ["day", "month"],
    hnaa: false,
    image: "/spots/khau-pha/hero.jpg",
  },
  "quan-ba": {
    key: "quan-ba",
    name: "Quản Bạ",
    short: "Quan Ba",
    purchaseModes: ["day", "month"],
    hnaa: false,
    image: "/spots/ha-giang/quan-ba-hero.jpg",
  },
};

export function isBaoBaySpot(v: unknown): v is BaoBaySpot {
  return typeof v === "string" && (BAO_BAY_SPOTS as string[]).includes(v);
}

export function purchasePrice(mode: PurchaseMode): number {
  if (mode === "year") return BAO_BAY_FEE_PER_YEAR;
  if (mode === "month") return BAO_BAY_FEE_PER_MONTH;
  return BAO_BAY_FEE_PER_DAY;
}

/* ------------------------------------------------------------------ *
 * Giờ Việt Nam và mốc 8h00 của hội viên HNAA
 * ------------------------------------------------------------------ */

/** Hội viên HNAA phải báo bay TRƯỚC giờ này (giờ Việt Nam) của chính ngày bay. */
export const HNAA_CUTOFF_HOUR = 8;

/**
 * Ngày và giờ theo GIỜ VIỆT NAM của một thời điểm.
 *
 * Tính bằng Intl với múi Asia/Ho_Chi_Minh thay vì lấy giờ máy: máy chủ Vercel
 * chạy UTC, 7h sáng ở Việt Nam là 0h UTC — lấy giờ máy thì cả buổi sáng đều bị
 * coi là "trước 8h" và mốc cắt vô nghĩa.
 */
export function vnParts(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Báo bay lúc `now` cho ngày bay `flyDate` có còn kịp mốc HNAA không.
 *
 * Báo cho NGÀY SAU thì lúc nào cũng kịp; báo cho HÔM NAY thì phải trước 8h00;
 * ngày đã qua thì không (máy chủ vốn đã từ chối ngày quá khứ).
 */
export function isBeforeHnaaCutoff(flyDate: string, now: Date): boolean {
  const { date, minutes } = vnParts(now);
  if (flyDate > date) return true;
  if (flyDate < date) return false;
  return minutes < HNAA_CUTOFF_HOUR * 60;
}

/* ------------------------------------------------------------------ *
 * Vé tháng / vé năm
 * ------------------------------------------------------------------ */

/**
 * Cùng ngày đó của năm sau — hạn vé năm. 29/2 mà năm sau không có thì lùi về
 * 28/2, giống cách addOneMonth lùi ngày 31 về ngày cuối tháng.
 */
export function addOneYear(iso: string): string {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const lastDay = new Date(y + 1, m, 0).getDate();
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/**
 * Hạn dùng của vé mua bắt đầu từ `start`.
 *
 * Tính trọn tới HẾT ngày hạn (so sánh "<="): chủ chốt "từ ngày bắt đầu tới
 * cùng ngày tháng sau", đọc theo đúng chữ là ngày đó vẫn bay được.
 */
export function passValidUntil(start: string, mode: "month" | "year"): string {
  return mode === "year" ? addOneYear(start) : addOneMonth(start);
}

/** Một vé tháng/năm đã có (máy chủ tra từ các báo bay cũ). */
export type ExistingPass = {
  from: string;
  until: string;
  mode: "month" | "year";
  noticeCode?: string;
};

function passCovering(passes: ExistingPass[], date: string): ExistingPass | undefined {
  return passes
    .filter((p) => p.from <= date && date <= p.until)
    .sort((a, b) => (a.until < b.until ? 1 : -1))[0];
}

/* ------------------------------------------------------------------ *
 * Tính phí
 * ------------------------------------------------------------------ */

export type BaoBayLineKey = "hnaaFree" | "passCovered" | "day" | "month" | "year";

export type BaoBayFeeLine = {
  key: BaoBayLineKey;
  /** Những ngày thuộc dòng này. */
  dates: string[];
  amount: number;
  /** Nhãn tiếng Việt cho thư nội bộ; trang công khai tra theo `key` để dịch. */
  label: string;
};

export type BaoBayFee = {
  lines: BaoBayFeeLine[];
  total: number;
  /** Tóm gọn cả báo bay thành một loại — cột "loại phí" ở trang quản trị. */
  feeMode: FeeMode;
  /** Vé tháng/năm MUA TRONG báo bay này: ngày bắt đầu và hạn cuối. */
  passFrom?: string;
  passValidUntil?: string;
  /** Vé đã có từ trước và đang che các ngày bay — để trang báo "còn hạn tới". */
  coveredByPass?: ExistingPass;
  /**
   * Hội viên HNAA nhưng có ngày bay đã quá 8h00 — phải trả như người khác.
   * Trang dùng để giải thích vì sao hội viên vẫn bị tính tiền.
   */
  hnaaLateDates: string[];
  /** Phi công chọn trả theo ngày nhưng đủ ngày để vé tháng rẻ hơn → tự đổi. */
  autoMonth?: boolean;
};

/**
 * Số ngày lẻ mà tiền theo ngày đã bằng vé tháng: từ đây trở đi trả theo ngày là
 * thu đắt hơn mà không cho thêm gì (cùng luật với /muavang).
 */
export const BAO_BAY_BREAK_EVEN_DAYS = Math.ceil(BAO_BAY_FEE_PER_MONTH / BAO_BAY_FEE_PER_DAY);

/**
 * Tính phí cho một lượt báo bay.
 *
 * Thứ tự xét cho TỪNG ngày bay:
 *   1. có vé tháng/năm còn hạn cho đúng điểm bay → miễn (pass)
 *   2. hội viên HNAA, điểm Viên Nam, báo trước 8h00 ngày bay → miễn (hnaa_free)
 *   3. còn lại là ngày phải trả, tính theo cách phi công chọn.
 *
 * Mua vé tháng/năm: vé bắt đầu từ NGÀY PHẢI TRẢ ĐẦU TIÊN; ngày nào lỡ nằm ngoài
 * hạn vé (chọn trải quá một tháng) thì tính thêm theo ngày, không cho lọt.
 */
export function computeBaoBayFee(input: {
  spot: BaoBaySpot;
  dates: string[];
  purchase: PurchaseMode;
  /** Mã hội viên HNAA đã được máy chủ xác nhận đúng và còn hiệu lực. */
  hnaaMember: boolean;
  /** Vé tháng/năm đã có của phi công tại ĐÚNG điểm bay này. */
  passes?: ExistingPass[];
  now: Date;
}): BaoBayFee {
  const cfg = BAO_BAY_SPOT_CONFIG[input.spot];
  const dates = [...new Set(input.dates)].sort();
  const passes = input.passes ?? [];

  // Điểm không có vé năm mà gửi "year" lên thì hạ về vé tháng — không bán thứ không có.
  let purchase: PurchaseMode = cfg.purchaseModes.includes(input.purchase)
    ? input.purchase
    : "month";

  const passDays: string[] = [];
  const hnaaDays: string[] = [];
  const hnaaLateDates: string[] = [];
  const payDays: string[] = [];
  let coveredByPass: ExistingPass | undefined;

  for (const d of dates) {
    const pass = passCovering(passes, d);
    if (pass) {
      passDays.push(d);
      if (!coveredByPass || pass.until > coveredByPass.until) coveredByPass = pass;
      continue;
    }
    if (cfg.hnaa && input.hnaaMember) {
      if (isBeforeHnaaCutoff(d, input.now)) {
        hnaaDays.push(d);
        continue;
      }
      hnaaLateDates.push(d);
    }
    payDays.push(d);
  }

  const lines: BaoBayFeeLine[] = [];
  if (passDays.length) {
    lines.push({
      key: "passCovered",
      dates: passDays,
      amount: 0,
      label: `Vé ${coveredByPass?.mode === "year" ? "năm" : "tháng"} còn hạn tới ${formatVnDate(coveredByPass?.until ?? "")} × ${passDays.length} ngày`,
    });
  }
  if (hnaaDays.length) {
    lines.push({
      key: "hnaaFree",
      dates: hnaaDays,
      amount: 0,
      label: `Hội viên HNAA báo trước 8h00 — miễn phí × ${hnaaDays.length} ngày`,
    });
  }

  /**
   * Trả theo ngày mà đủ số ngày (trong phạm vi một vé tháng) để vé tháng rẻ
   * hơn hoặc bằng → tự đổi sang vé tháng: cùng tiền mà còn bay thêm được.
   */
  let autoMonth = false;
  if (purchase === "day" && payDays.length >= BAO_BAY_BREAK_EVEN_DAYS) {
    const until = passValidUntil(payDays[0], "month");
    if (payDays.every((d) => d <= until)) {
      purchase = "month";
      autoMonth = true;
    }
  }

  let passFrom: string | undefined;
  let newPassUntil: string | undefined;

  if (payDays.length) {
    if (purchase === "day") {
      lines.push({
        key: "day",
        dates: payDays,
        amount: BAO_BAY_FEE_PER_DAY * payDays.length,
        label: `Phí điểm bay ${BAO_BAY_FEE_PER_DAY.toLocaleString("vi-VN")} đ × ${payDays.length} ngày`,
      });
    } else {
      passFrom = payDays[0];
      newPassUntil = passValidUntil(passFrom, purchase);
      const inside = payDays.filter((d) => d <= (newPassUntil as string));
      const outside = payDays.filter((d) => d > (newPassUntil as string));

      lines.push({
        key: purchase,
        dates: inside,
        amount: purchasePrice(purchase),
        label: `Vé ${purchase === "year" ? "năm" : "tháng"} ${formatVnDate(passFrom)} – ${formatVnDate(newPassUntil)}`,
      });
      if (outside.length) {
        lines.push({
          key: "day",
          dates: outside,
          amount: BAO_BAY_FEE_PER_DAY * outside.length,
          label: `Ngày ngoài hạn vé ${BAO_BAY_FEE_PER_DAY.toLocaleString("vi-VN")} đ × ${outside.length} ngày`,
        });
      }
    }
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);

  // Có tiền thì theo cách trả; miễn hết thì ưu tiên ghi HNAA (có ngày miễn nhờ hội)
  const feeMode: FeeMode = total > 0 ? purchase : hnaaDays.length ? "hnaa_free" : "pass";

  return {
    lines,
    total,
    feeMode,
    ...(passFrom ? { passFrom, passValidUntil: newPassUntil } : {}),
    ...(coveredByPass ? { coveredByPass } : {}),
    hnaaLateDates,
    ...(autoMonth ? { autoMonth } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Chuẩn hoá để nhận ra cùng một phi công
 * ------------------------------------------------------------------ */

/**
 * Số điện thoại chỉ còn chữ số, đầu +84/84 đổi về 0 — "+84 912 345 678",
 * "0912.345.678" và "84912345678" phải ra cùng một người, không thì phi công
 * gõ khác kiểu một chút là mất vé tháng đã mua.
 */
export function normalizePhone(raw: unknown): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("84") && d.length >= 11) d = `0${d.slice(2)}`;
  return d;
}

/** CCCD/hộ chiếu: chữ hoa, bỏ khoảng trắng và dấu chấm/gạch. */
export function normalizeIdNumber(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

/** Mã hội viên HNAA: chữ hoa, bỏ khoảng trắng hai đầu và ở giữa. */
export function normalizeMemberCode(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** "0912345456" → "***456" — đủ để hội viên nhận ra số của mình, không lộ số. */
export function maskTail(raw: unknown, keep = 3): string {
  const s = String(raw ?? "").replace(/\s+/g, "");
  if (!s) return "";
  return `***${s.slice(-keep)}`;
}

/* ------------------------------------------------------------------ *
 * Mã báo bay và nội dung chuyển khoản
 * ------------------------------------------------------------------ */

/**
 * Mã báo bay: BB + yyMMdd của ngày bay đầu tiên + "." + 4 số cuối điện thoại.
 * Cùng lối đặt mã với đăng ký /muavang (MVddmm.xxxx) để nhìn là đoán ra ngày.
 */
export function buildNoticeCode(dates: string[], phone: string): string {
  const first = [...dates].sort()[0] || "";
  const [y, m, d] = first.split("-");
  const ymd = y && m && d ? `${y.slice(2)}${m}${d}` : "000000";
  const tail = String(phone || "").replace(/\D/g, "").slice(-4) || "0000";
  return `BB${ymd}.${tail}`;
}

/**
 * Nội dung chuyển khoản: mã báo bay đứng đầu để đối chiếu sao kê là tìm ra ngay
 * bản ghi, sau đó tới tên và điểm bay. Ô nội dung chỉ chứa ~99 ký tự nên cắt
 * đuôi phần ngày chứ không cắt mã.
 */
export function buildBaoBayTransferNote(input: {
  code: string;
  fullName: string;
  spot: BaoBaySpot;
  dates: string[];
  feeMode: FeeMode;
}): string {
  const who = String(input.fullName || "").trim() || "phi cong";
  const spot = BAO_BAY_SPOT_CONFIG[input.spot].short;
  const when =
    input.feeMode === "year"
      ? "ve nam"
      : input.feeMode === "month"
        ? "ve thang"
        : input.dates.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`).join(" ");

  // Bỏ dấu ngay ở đây (không đợi lúc dựng QR): phi công chuyển khoản tay thì
  // gõ theo đúng chữ hiện trên màn hình, có dấu là nhiều app ngân hàng từ chối.
  const head = toAsciiNote(`${input.code} ${who} ${spot}`);
  const room = 99 - head.length - 1;
  const tail = when.length > room ? when.slice(0, Math.max(0, room)) : when;
  return `${head} ${tail}`.trim();
}

/* ------------------------------------------------------------------ *
 * Dán bảng hội viên từ Excel / Google Sheets
 * ------------------------------------------------------------------ */

export type MemberField = "code" | "fullName" | "idNumber" | "phone" | "emergencyPhone";

export type ParsedMemberRow = {
  code: string;
  fullName: string;
  idNumber: string;
  phone: string;
  emergencyPhone: string;
  extra: Record<string, string>;
};

function plain(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Đoán cột nào là trường nào theo chữ ở dòng tiêu đề.
 *
 * Xét "khẩn cấp" TRƯỚC "điện thoại": tiêu đề "SĐT khẩn cấp" chứa cả hai chữ,
 * xét ngược thì số người nhà đè lên số của chính hội viên.
 */
export function guessMemberField(header: string): MemberField | null {
  const h = plain(header);
  if (!h) return null;
  if (/khan cap|nguoi than|emergency|lien he khi/.test(h)) return "emergencyPhone";
  if (/^ma\b|ma hoi vien|ma hv|member code|^code$|^id hoi vien|so the/.test(h)) return "code";
  if (/cccd|cmnd|can cuoc|ho chieu|passport|dinh danh|giay to/.test(h)) return "idNumber";
  if (/sdt|dien thoai|so dt|phone|mobile|di dong/.test(h)) return "phone";
  if (/ho ten|ho va ten|full ?name|^ten$|^name$|ten hoi vien/.test(h)) return "fullName";
  return null;
}

/**
 * Bóc bảng dán từ Excel/Sheets: các ô cách nhau bằng TAB, dòng đầu là tiêu đề.
 *
 * Cột không nhận ra thì giữ nguyên vào `extra` theo đúng tên tiêu đề — bảng hội
 * hay có thêm năm vào hội, cấp bằng… bỏ đi thì lần sau lại phải dán lại.
 */
export function parseMemberPaste(
  text: string,
  /** Admin tự sửa cột nào là trường nào ở bước xem trước; bỏ trống = tự đoán. */
  mappingOverride?: Array<MemberField | null>,
): {
  headers: string[];
  mapping: Array<MemberField | null>;
  rows: ParsedMemberRow[];
  skipped: number;
} {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (!lines.length) return { headers: [], mapping: [], rows: [], skipped: 0 };

  const headers = lines[0].split("\t").map((h) => h.trim());
  const mapping: Array<MemberField | null> = [];
  const used = new Set<MemberField>();
  for (const [i, h] of headers.entries()) {
    const f = mappingOverride && i < mappingOverride.length ? mappingOverride[i] : guessMemberField(h);
    // Hai cột cùng đoán ra một trường thì chỉ nhận cột đầu, cột sau vào extra.
    if (f && !used.has(f)) {
      mapping.push(f);
      used.add(f);
    } else {
      mapping.push(null);
    }
  }

  const rows: ParsedMemberRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = line.split("\t").map((c) => c.trim());
    const row: ParsedMemberRow = {
      code: "",
      fullName: "",
      idNumber: "",
      phone: "",
      emergencyPhone: "",
      extra: {},
    };
    cells.forEach((cell, i) => {
      const f = mapping[i];
      if (f) row[f] = cell;
      else if (cell && headers[i]) row.extra[headers[i]] = cell;
      else if (cell) row.extra[`Cột ${i + 1}`] = cell;
    });
    row.code = normalizeMemberCode(row.code);

    // Không có mã hội viên thì không nhận được — mã là khoá để ghi đè lần sau.
    if (!row.code) {
      skipped++;
      continue;
    }
    rows.push(row);
  }

  return { headers, mapping, rows, skipped };
}
