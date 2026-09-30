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
 * máy phi công, sửa giờ điện thoại là qua được mốc 9h00.
 */

import { addOneMonth, formatVnDate, formatVnd } from "@/lib/pilot-event";
import { toAsciiNote } from "@/lib/vietqr";

export type BaoBaySpot = "vien-nam" | "khau-pha" | "quan-ba";

export const BAO_BAY_SPOTS: BaoBaySpot[] = ["vien-nam", "khau-pha", "quan-ba"];

/** Cách phi công chọn trả tiền cho những ngày chưa được miễn. */
export type PurchaseMode = "day" | "month" | "year";

/**
 * Kết quả phí lưu trên báo bay:
 * - hnaa_free: hội viên HNAA báo trước 9h00 ngày bay (chỉ Viên Nam)
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
/** Vé năm (bay đơn) — áp cho CẢ BA điểm (chủ 30/09; trước đây chỉ Viên Nam). Vé nào điểm nấy. */
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
   * nếu báo bay TRƯỚC 9h00 sáng ngày bay. Hai điểm còn lại không có thoả thuận.
   */
  hnaa: boolean;
  /**
   * Mã điểm trong lib/weather-spots.ts để mở dự báo (SpotWeatherWidget).
   * Quản Bạ trong sổ thời tiết mang mã "ha-giang" — đúng là bãi Quản Bạ.
   */
  weatherSlug: string;
};

export const BAO_BAY_SPOT_CONFIG: Record<BaoBaySpot, SpotConfig> = {
  "vien-nam": {
    key: "vien-nam",
    // Chủ gọi là "Núi Viên Nam" (30/09) — tên hiện ở thư nội bộ và trang quản trị
    name: "Núi Viên Nam",
    short: "Vien Nam",
    purchaseModes: ["day", "month", "year"],
    hnaa: true,
    weatherSlug: "vien-nam",
  },
  "khau-pha": {
    key: "khau-pha",
    name: "Khau Phạ",
    short: "Khau Pha",
    purchaseModes: ["day", "month", "year"],
    hnaa: false,
    weatherSlug: "khau-pha",
  },
  "quan-ba": {
    key: "quan-ba",
    name: "Quản Bạ",
    short: "Quan Ba",
    purchaseModes: ["day", "month", "year"],
    hnaa: false,
    weatherSlug: "ha-giang",
  },
};

/**
 * ẢNH NỀN DUY NHẤT của trang (chủ 30/09): một cánh dù đơn đỏ lúc hoàng hôn,
 * phi công nhỏ xíu, không thấy mặt ai. Ảnh riêng từng điểm trước đây đều là
 * ảnh bay đôi chụp selfie có mặt khách — không hợp trang của phi công bay đơn,
 * nên bỏ hẳn chuyện đổi ảnh theo điểm bay.
 */
export const BAO_BAY_BG = "/muavang/gallery/1757074008862-552366886798627704-5523668.jpg";

/**
 * TẦN SỐ BỘ ĐÀM THÔNG DỤNG + HOTLINE KHẨN CẤP (chủ 30/09) — hiện trên trang
 * báo bay và màn hình gửi xong, để phi công lưu trước khi lên bãi.
 */
export const BAO_BAY_RADIO = [
  { name: "HNAA", freq: "170.500" },
  { name: "HNPG", freq: "148.770" },
  { name: "VWs", freq: "164.500" },
] as const;

export const BAO_BAY_HOTLINE = { display: "0964 073 555", tel: "tel:+84964073555" } as const;

/**
 * LIÊN KẾT KIẾN THỨC cho phi công bay đơn (chủ 30/09). Chỉ trỏ tới trang/bài
 * CÓ THẬT: bốn mục con của /knowledge (SUB_DB trong app/knowledge/[sub]) và
 * bài đã đăng — đổi slug bài nào thì phải sửa ở đây, không có cơ chế tự dò.
 */
export const BAO_BAY_KNOWLEDGE_LINKS = [
  { key: "weather", href: "/knowledge/weather", icon: "🌦️" },
  { key: "wind", href: "/blog/khi-tuong-du-luon-phan-2", icon: "🌬️" },
  { key: "thermal", href: "/knowledge/thermal", icon: "🌀" },
  { key: "active", href: "/blog/bay-chu-dong-phan-1-xu-ly-bo", icon: "🪂" },
  { key: "p3p4", href: "/blog/ky-thuat-bay-du-luon-p3-p4-lo-trinh-chung-chi", icon: "🎓" },
] as const;

export type BaoBayKnowledgeKey = (typeof BAO_BAY_KNOWLEDGE_LINKS)[number]["key"];

/**
 * Số tiền KHÔNG BAO GIỜ bị bẻ dòng (chủ 30/09 thấy chữ "đ" rơi xuống dòng
 * riêng): giống formatVnd của /muavang nhưng khoảng trắng trước "đ" là khoảng
 * trắng KHÔNG NGẮT (U+00A0). Viết riêng ở đây thay vì sửa formatVnd để không
 * đụng tới /muavang, thư và Google Sheets đang dùng hàm đó.
 */
export function formatVndNb(n: number): string {
  return formatVnd(n).replace(/\s+(?=đ$)/, "\u00a0");
}

export function isBaoBaySpot(v: unknown): v is BaoBaySpot {
  return typeof v === "string" && (BAO_BAY_SPOTS as string[]).includes(v);
}

export function purchasePrice(mode: PurchaseMode): number {
  if (mode === "year") return BAO_BAY_FEE_PER_YEAR;
  if (mode === "month") return BAO_BAY_FEE_PER_MONTH;
  return BAO_BAY_FEE_PER_DAY;
}

/* ------------------------------------------------------------------ *
 * Giờ Việt Nam và mốc 9h00 của hội viên HNAA
 * ------------------------------------------------------------------ */

/** Hội viên HNAA phải báo bay TRƯỚC giờ này (giờ Việt Nam) của chính ngày bay. */
export const HNAA_CUTOFF_HOUR = 9;

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
 * Báo cho NGÀY SAU thì lúc nào cũng kịp; báo cho HÔM NAY thì phải trước 9h00;
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
   * Hội viên HNAA nhưng có ngày bay đã quá 9h00 — phải trả như người khác.
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
 *   2. hội viên HNAA, điểm Viên Nam, báo trước 9h00 ngày bay → miễn (hnaa_free)
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

  /**
   * Cả ba điểm đều bán đủ ngày/tháng/năm (chủ 30/09 mở vé năm cho Khau Phạ,
   * Quản Bạ) nên KHÔNG còn hạ "năm" về "tháng". Giá trị lạ thì về theo ngày.
   */
  let purchase: PurchaseMode = cfg.purchaseModes.includes(input.purchase) ? input.purchase : "day";

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
      label: `Hội viên HNAA báo trước 9h00 — miễn phí × ${hnaaDays.length} ngày`,
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

/**
 * KHOÁ SO KHỚP mã hội viên — gõ kiểu gì cũng ra một (chủ 01/10):
 *   "HNAA-01", "hnaa01", "HNAA 1", "hnaa-1", "01", "1"  →  "HNAA1"
 * Bỏ mọi dấu cách/gạch/chấm, chữ hoa; dạng "(HNAA)số" thì bỏ số 0 ở đầu. Mã
 * kiểu khác (nếu sau này có hội khác) giữ nguyên phần chữ-số đã làm sạch.
 * Mã HIỂN THỊ vẫn giữ đúng như trong bảng hội ("HNAA-01"); khoá này chỉ để tra.
 */
export function memberCodeKey(raw: unknown): string {
  const s = String(raw ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  const m = s.match(/^(?:HNAA)?0*(\d+)$/);
  if (m) return `HNAA${Number(m[1])}`;
  return s;
}

/**
 * Quốc tịch trong bảng hội: "Việt Nam", "Vietnam", "Viet Nam", "VN" (hoặc bỏ
 * trống) là người Việt; còn lại là người nước ngoài với đúng quốc tịch đó.
 */
export function normalizeNationality(raw: unknown): { foreigner: boolean; nationality: string } {
  const s = String(raw ?? "").trim();
  const p = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!p || p === "vietnam" || p === "vn") return { foreigner: false, nationality: VN_NATIONALITY };
  return { foreigner: true, nationality: s };
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
 * Tên viết gọn để công bố danh sách báo bay: chữ cái đầu của mọi chữ trừ chữ
 * cuối, mỗi chữ cái một dấu chấm, rồi tên gọi đầy đủ (chủ 30/09):
 *   "Nguyễn Gia Ngọc" → "N.G. Ngọc",  "Đặng Văn Mỹ" → "Đ.V. Mỹ"
 *
 * Khác shortenPilotName của /muavang ("NG.Ngọc") ở dấu chấm sau TỪNG chữ cái
 * và khoảng trắng trước tên — nên viết riêng, không sửa hàm của /muavang.
 */
export function shortPilotName(raw: unknown): string {
  const parts = String(raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((w) => `${w.charAt(0).toLocaleUpperCase("vi-VN")}.`)
    .join("");
  return `${initials} ${last}`;
}

/**
 * NỘI DUNG CHUYỂN KHOẢN — biết được TRƯỚC khi gửi báo bay (chủ 30/09: trả tiền
 * rồi mới gửi), nên dựng từ dữ liệu đã có trên phiếu chứ không từ mã đã lưu
 * (mã lưu có thể thêm đuôi -2 khi trùng):
 *   BB + yyMMdd ngày bay đầu + "." + 4 số cuối SĐT   (hội viên: + mã hội viên,
 *   để khỏi lộ thêm số điện thoại của họ ra trình duyệt)
 *   + tên gọn không dấu + điểm bay + ngày / "ve thang" / "ve nam".
 *
 * Toàn chữ không dấu và gọn dưới 70 ký tự: nhiều app ngân hàng cắt ô nội
 * dung sớm hơn mức 99 ký tự của chuẩn VietQR. Dài quá thì rút phần ngày thành
 * "01/10-15/10 6n" chứ không cắt mã ở đầu.
 */
export function buildPaymentNote(input: {
  dates: string[];
  phone?: string;
  memberCode?: string;
  fullName?: string;
  spot: BaoBaySpot;
  feeMode: FeeMode;
}): string {
  const dates = [...input.dates].sort();
  const base = input.memberCode
    ? `${buildNoticeCode(dates, "").split(".")[0]}.${input.memberCode}`
    : buildNoticeCode(dates, input.phone || "");
  const who = toAsciiNote(shortPilotName(input.fullName)).replace(/\s+/g, "");
  const spot = BAO_BAY_SPOT_CONFIG[input.spot].short;
  const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  let when =
    input.feeMode === "year"
      ? "ve nam"
      : input.feeMode === "month"
        ? "ve thang"
        : dates.map(dm).join(" ");

  const head = toAsciiNote([base, who, spot].filter(Boolean).join(" "));
  if (head.length + 1 + when.length > 70 && dates.length > 1) {
    when = `${dm(dates[0])}-${dm(dates[dates.length - 1])} ${dates.length}n`;
  }
  return `${head} ${when}`.trim().slice(0, 90);
}

/* ------------------------------------------------------------------ *
 * Quốc tịch
 * ------------------------------------------------------------------ */

/** Người Việt thì quốc tịch mặc định là chữ này — cũng là giá trị lưu vào báo bay. */
export const VN_NATIONALITY = "Việt Nam";

/**
 * Quốc tịch trong các cột phụ của danh sách hội viên (nếu bảng hội có cột đó):
 * tìm cột tên "Quốc tịch"/"Nationality", không có thì rỗng.
 */
export function nationalityFromExtra(extra: unknown): string {
  if (!extra || typeof extra !== "object") return "";
  for (const [k, v] of Object.entries(extra as Record<string, unknown>)) {
    if (/quoc tich|nationality|country/.test(plain(k))) return String(v ?? "").trim();
  }
  return "";
}

/* ------------------------------------------------------------------ *
 * Dán bảng hội viên từ Excel / Google Sheets
 * ------------------------------------------------------------------ */

/** "skip" = cột bỏ hẳn (vd. STT — số thứ tự của bảng, không phải thông tin hội viên). */
export type MemberField =
  | "code"
  | "fullName"
  | "idNumber"
  | "phone"
  | "emergencyPhone"
  | "nationality"
  | "email"
  | "skip";

type MemberDataField = Exclude<MemberField, "skip">;

export type ParsedMemberRow = {
  code: string;
  fullName: string;
  idNumber: string;
  phone: string;
  emergencyPhone: string;
  nationality: string;
  /** Lưu để admin liên hệ — KHÔNG BAO GIỜ trả ra trang công khai. */
  email: string;
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
  if (/quoc tich|nationality|country/.test(h)) return "nationality";
  if (/^e ?mail|thu dien tu/.test(h)) return "email";
  if (/^stt$|^so thu tu$|^tt$|^no$/.test(h)) return "skip";
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
  const all = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    // Dòng trống hoặc chỉ toàn ô trống (Excel hay dán kèm "\t\t\t") thì bỏ
    .filter((l) => l.replace(/\t/g, "").trim() !== "");

  /**
   * DÒNG TIÊU ĐỀ không nhất thiết là dòng đầu: bảng hội có dòng tên bảng ở trên
   * ("Danh sach HNAA cap nhat 01/10/26"). Lấy dòng ĐẦU TIÊN có cột mã hội viên,
   * hoặc có từ hai cột nhận ra được; các dòng phía trên nó bỏ qua.
   */
  const hIdx = all.findIndex((l) => {
    const f = l.split("\t").map((c) => guessMemberField(c));
    return f.includes("code") || f.filter((x) => x && x !== "skip").length >= 2;
  });
  const lines = hIdx > 0 ? all.slice(hIdx) : all;

  if (!lines.length) return { headers: [], mapping: [], rows: [], skipped: 0 };

  const headers = lines[0].split("\t").map((h) => h.trim());
  const mapping: Array<MemberField | null> = [];
  const used = new Set<MemberField>();
  for (const [i, h] of headers.entries()) {
    const f = mappingOverride && i < mappingOverride.length ? mappingOverride[i] : guessMemberField(h);
    // Hai cột cùng đoán ra một trường thì chỉ nhận cột đầu, cột sau vào extra.
    if (f === "skip") {
      mapping.push("skip");
    } else if (f && !used.has(f)) {
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
      nationality: "",
      email: "",
      extra: {},
    };
    cells.forEach((cell, i) => {
      const f = mapping[i];
      if (f === "skip") return;
      if (f) row[f as MemberDataField] = cell;
      else if (cell && headers[i]) row.extra[headers[i]] = cell;
      else if (cell) row.extra[`Cột ${i + 1}`] = cell;
    });
    // Mã giữ nguyên cách viết của bảng ("HNAA-01"), chỉ bỏ khoảng trắng + chữ hoa
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
