// lib/pilot-event.ts
/**
 * Quy định đăng ký bay cho PHI CÔNG tại điểm bay Khau Phạ — Tú Lệ — Mù Cang Chải.
 *
 * Đây là nguồn duy nhất cho ba đợt bay và cách tính phí. Trang đăng ký, API và
 * email đều đọc từ đây, để phi công thấy con số nào thì hộp thư nội bộ và bảng
 * Google Sheets ghi đúng con số đó.
 */

export type FlyingKind = "paragliding" | "paramotor" | "both";
export type PeriodKey = "mua_vang" | "le_hoi_com" | "ngay_thuong";
export type SiteFeeMode = "day" | "month";
export type MotorType = "trike" | "foot";
/**
 * Cấp dù theo chuẩn EN, thêm "PPG" cho cánh dù chuyên dùng với động cơ —
 * dù PPG không xếp theo thang EN nên phải là một lựa chọn riêng.
 */
export type WingClass = "A" | "B" | "C" | "D" | "PPG";

export const WING_CLASSES: WingClass[] = ["A", "B", "C", "D", "PPG"];

/** Nhãn hiển thị: EN A…EN D, riêng dù PPG ghi thẳng "Dù PPG". */
export function wingClassLabel(w: WingClass): string {
  return w === "PPG" ? "Dù PPG" : `EN ${w}`;
}

/** Phi công có bay máy hay không — quyết định gần như toàn bộ phần phí. */
export function hasMotor(kind: FlyingKind): boolean {
  return kind === "paramotor" || kind === "both";
}

/**
 * Phí điểm bay — CHỈ thu vào ngày thường.
 *
 * Hai đợt lễ hội (Mùa Vàng, Lễ hội Cốm Tú Lệ) ban tổ chức không thu phí điểm bay:
 * Mùa Vàng đã gói trọn trong combo, còn Lễ hội Cốm Tú Lệ thì mở cho mọi phi công.
 */
export const SITE_FEE_PER_DAY = 100_000;

/**
 * Gói tháng đặt bằng đúng bảy ngày lẻ: bay tới ngày thứ bảy là hoà, từ ngày
 * thứ tám trở đi trong tháng không mất thêm đồng nào.
 */
export const SITE_FEE_PER_MONTH = 700_000;

/**
 * Ưu đãi chung cho mọi phi công đã đăng ký, áp dụng quanh năm chứ không riêng
 * dịp lễ hội — nên hiện ở cả ba đợt bay.
 */
export const PILOT_DISCOUNT_TEXT =
  "Phi công được giảm 20% mọi chi phí tại điểm bay (phòng ở, ăn uống).";

/**
 * Combo Mùa Vàng — TRỌN GÓI, không tách lẻ và không cho đặt lẻ từng mục.
 *
 * Ban tổ chức bao trọn từ chiều 29 đến trưa 31/8; liệt kê từng mục ra đây chỉ
 * để phi công biết mình được gì, không phải để chọn.
 */
export const MUA_VANG_COMBO_VND = 1_500_000;

/** Số phi công tối đa ban tổ chức nhận cho Festival Mùa Vàng. */
export const MUA_VANG_MAX_PILOTS = 50;

/**
 * Người nhà đi kèm phi công trong dịp Mùa Vàng.
 *
 * Ăn ở cùng đoàn, KHÔNG có phòng riêng — nói rõ ngay khi đăng ký để không ai
 * lên tới nơi mới ngã ngửa.
 */
export const COMPANION_VND = 1_000_000;
export const MUA_VANG_MAX_COMPANIONS = 5;

/**
 * Phi công đã đăng ký Festival Mùa Vàng thì bay ngày thường trong khoảng này
 * cũng không mất phí điểm bay.
 */
export const MUA_VANG_FREE_SITE_FEE = {
  from: "2026-08-26",
  to: "2026-09-04",
} as const;

/**
 * Đúng 10 ngày: 26/8 → 4/9.
 *
 * Ưu đãi này CHỈ dành cho phi công đã đăng ký VÀ thanh toán sự kiện Bay trên
 * mùa vàng — nói rõ ngay trong câu chữ, vì đây là thứ phi công dễ tưởng ai
 * cũng có rồi tới nơi mới vỡ lẽ.
 */
export const MUA_VANG_FREE_SITE_FEE_DAYS = 10;
export const MUA_VANG_FREE_SITE_FEE_TEXT =
  "Miễn phí phí điểm bay 10 ngày, từ 26/8 đến hết 4/9 — chỉ dành cho phi công đã đăng ký và thanh toán sự kiện Bay trên mùa vàng";

export function isInFreeSiteFeeWindow(iso: string): boolean {
  return iso >= MUA_VANG_FREE_SITE_FEE.from && iso <= MUA_VANG_FREE_SITE_FEE.to;
}

/**
 * Nhóm Zalo điều phối riêng của Festival Bay trên mùa vàng.
 *
 * Ba ngày sự kiện lịch bay đổi liên tục theo gió, ban tổ chức báo tin trong
 * nhóm này chứ không gọi từng người — nên phi công đăng ký Mùa Vàng phải vào
 * nhóm. Hai đợt còn lại không dùng nhóm.
 */
/**
 * Lễ khai mạc của từng đợt lễ hội — mốc giờ phi công phải có mặt, không phải
 * giờ bay. Đợt bay ngày thường không có lễ khai mạc.
 */
export const OPENING_BY_PERIOD: Partial<Record<PeriodKey, string>> = {
  mua_vang: "Khai mạc 8h00 ngày 30/8 tại bãi hạ cánh dù lượn",
  le_hoi_com: "Khai mạc 8h00 ngày 22/8 tại trung tâm xã Tú Lệ",
};

export const MUA_VANG_OPENING = OPENING_BY_PERIOD.mua_vang as string;

export const MUA_VANG_ZALO_GROUP =
  "https://zalo.me/g/r8ev6in2xlueiydbnbvn";

export const MUA_VANG_COMBO_ITEMS = [
  "Ngủ 2 đêm (29 và 30/8)",
  "Ăn tối ngày 29/8",
  "Ăn sáng và trưa ngày 30/8",
  "Gala dinner đêm 30/8",
  "Ăn sáng và trưa ngày 31/8",
  "Áo sự kiện",
  "Xe con thoi 16 chỗ lên xuống núi, chạy liên tục không giới hạn",
  "Nước uống tại điểm bay",
  "Miễn phí phí điểm bay 10 ngày, từ 26/8 đến hết 4/9 (sau khi hoàn tất thanh toán sự kiện)",
  "Giải thưởng — nếu đủ đông ban tổ chức sẽ tổ chức giải",
] as const;

type PeriodConfig = {
  key: PeriodKey;
  name: string;
  /** Ngày diễn ra, dạng ISO. Rỗng = phi công tự chọn ngày. */
  dates: string[];
  note: string;
};

export const PERIODS: Record<PeriodKey, PeriodConfig> = {
  mua_vang: {
    key: "mua_vang",
    name: "Bay trên Mùa Vàng 2026",
    dates: ["2026-08-29", "2026-08-30", "2026-08-31"],
    note: "Bắt buộc đăng ký combo trọn gói. Phi công bay máy được miễn phí.",
  },
  le_hoi_com: {
    key: "le_hoi_com",
    name: "Lễ hội Cốm Tú Lệ",
    dates: ["2026-08-21", "2026-08-22", "2026-08-23"],
    note: "Không thu phí điểm bay. Phi công dù lượn tự túc ăn ở.",
  },
  ngay_thuong: {
    key: "ngay_thuong",
    name: "Bay ngày thường",
    dates: [],
    note: "Ngoài thời điểm lễ hội. Vui lòng đăng ký trước khi bay.",
  },
};

/**
 * Các địa điểm của sự kiện.
 *
 * Link Maps lấy từ chính cấu hình điểm bay (lib/booking/calculate-price.ts) và
 * lib/site-config.ts để không có hai nguồn toạ độ lệch nhau. Clubhouse nằm
 * ngay bãi hạ cánh nên bãi hạ cánh, bãi cất cánh dù máy và khu sinh hoạt dùng
 * chung một điểm trên bản đồ.
 */
export const CLUBHOUSE_MAP = "https://maps.app.goo.gl/uSy6LHKZXMd6mQ6r6";
export const KHAU_PHA_TAKEOFF_MAP = "https://maps.app.goo.gl/Z9X6BnNV4eaUKTE29";

/**
 * Ban điều hành sự kiện Bay trên mùa vàng.
 *
 * `roleKey` để trang tra tên vai trò theo ngôn ngữ; tên người và số điện
 * thoại là dữ liệu thật nên giữ nguyên ở mọi ngôn ngữ.
 */
export const MUA_VANG_RADIO_FREQ = "148.770";

/**
 * Ảnh sự kiện các mùa trước, để trong public/muavang/gallery.
 *
 * Liệt kê thẳng tên tệp thay vì đánh số 01…16 chạy theo thứ tự thư mục. Đánh
 * số thì thêm một ảnh vào giữa là toàn bộ ảnh sau nó đổi tên, mà trình duyệt
 * vẫn giữ ảnh cũ trong bộ nhớ đệm theo tên — khách sẽ thấy đúng một tấm hiện
 * lên hai lần. Tên gắn với chính tấm ảnh thì thêm bớt bao nhiêu cũng không
 * ảnh hưởng những tấm còn lại.
 *
 * Ảnh gốc có cả HEIC (trình duyệt không mở được) và tệp gần 20MB, nên đều
 * được chuyển sang JPEG rộng tối đa 1800px trước khi đưa vào đây.
 */
export const MUA_VANG_GALLERY = [
  "/muavang/gallery/1747730471089-552366886798627704-5523668.jpg",
  "/muavang/gallery/1747730471161-552366886798627704-5523668.jpg",
  "/muavang/gallery/1757073763521-552366886798627704-5523668.jpg",
  "/muavang/gallery/1757073770099-552366886798627704-5523668.jpg",
  "/muavang/gallery/1757074008862-552366886798627704-5523668.jpg",
  "/muavang/gallery/1785293774880-2299930973201648440-464409.jpg",
  "/muavang/gallery/1786107183058-2299930973201648440-464409.jpg",
  "/muavang/gallery/anh1.jpg",
  "/muavang/gallery/anh2.jpg",
  "/muavang/gallery/bien-lua.jpg",
  "/muavang/gallery/img-20240901-185939.jpg",
  "/muavang/gallery/img-20240901-210523.jpg",
  "/muavang/gallery/img-2210.jpg",
  "/muavang/gallery/img-2811-2.jpg",
  "/muavang/gallery/nen.jpg",
  "/muavang/gallery/screenshot-2026-07-29-at-11-15-07.jpg",
];
export type EventContact = {
  roleKey:
    | "shuttle"
    | "flightOps"
    | "tech"
    | "launch"
    | "lead"
    | "band"
    | "media"
    | "catering";
  name: string;
  phone?: string;
  icon: string;
};

export const MUA_VANG_CONTACTS: EventContact[] = [
  { roleKey: "lead", name: "A Mỹ", phone: "0964073555", icon: "🎯" },
  { roleKey: "flightOps", name: "A Mặc", phone: "0337632532", icon: "🪂" },
  { roleKey: "launch", name: "A Hưng", phone: "0918408204", icon: "🚀" },
  { roleKey: "tech", name: "A Xiêng", phone: "0355507241", icon: "🔧" },
  { roleKey: "shuttle", name: "A Sôm", phone: "0334913924", icon: "🚐" },
  { roleKey: "media", name: "Khang Dùng & Thanh Viên Nam", icon: "📸" },
  { roleKey: "band", name: "Lai Nguyen", icon: "🎸" },
  { roleKey: "catering", name: "Ms Vân", icon: "🍽️" },
];

export type EventPlace = {
  role: string;
  name: string;
  detail: string;
  mapUrl: string;
  icon: string;
  /** Trang trong website nói kỹ hơn về nơi này. */
  pageUrl?: string;
  pageLabel?: string;
};

export const EVENT_PLACES: EventPlace[] = [
  {
    role: "Điểm cất cánh dù lượn",
    name: "Đỉnh đèo Khau Phạ",
    detail: "Độ cao 1.268 m",
    mapUrl: KHAU_PHA_TAKEOFF_MAP,
    icon: "⛰️",
  },
  {
    role: "Điểm cất cánh dù gắn động cơ",
    name: "Thung lũng Lìm Mông",
    detail: "Sân bay tại Mebayluon Clubhouse",
    mapUrl: CLUBHOUSE_MAP,
    icon: "🛩️",
  },
  {
    role: "Điểm hạ cánh dù lượn",
    name: "Thung lũng Lìm Mông",
    detail: "Hạ cánh tại Mebayluon Clubhouse",
    mapUrl: CLUBHOUSE_MAP,
    icon: "🪂",
  },
  {
    role: "Khu vực ở và sinh hoạt",
    name: "Mebayluon Clubhouse",
    detail: "Chỗ nghỉ, ăn uống và gala dinner của sự kiện",
    mapUrl: CLUBHOUSE_MAP,
    icon: "🏡",
    pageUrl: "https://www.mebayluon.com/homestay",
    pageLabel: "Xem Clubhouse & Homestay",
  },
];

/**
 * Hộp thư nhận đơn đăng ký của phi công.
 *
 * Tách khỏi ADMIN_EMAILS (hộp thư nhận đơn đặt bay của khách du lịch): hai
 * loại đơn khác hẳn nhau về việc phải làm, gộp chung một hộp thì mùa cao
 * điểm đơn khách sẽ vùi lấp đơn phi công. Đặt biến môi trường
 * PILOT_ADMIN_EMAILS để đổi mà không phải sửa mã.
 */
export const PILOT_ADMIN_EMAIL_DEFAULT = "dangky.mebayluon@gmail.com";

/** Tài khoản nhận tiền cọc của ban tổ chức. */
export const PAYMENT_ACCOUNT = {
  bankBin: "970407",
  bankName: "Techcombank",
  accountNumber: "1985000000",
  accountDisplay: "1985.000.000",
  accountName: "DANG VAN MY",
} as const;

/**
 * Nội dung chuyển khoản, sinh tự động để phi công khỏi phải gõ.
 *
 * Ban tổ chức đối chiếu sao kê theo chuỗi này, nên nó phải nhận ra được ai
 * chuyển và chuyển cho đợt nào: "pc Nguyen Van A - dk bay Mua Vang 2026".
 */
export function buildTransferNote(input: {
  fullName: string;
  phone: string;
  period: PeriodKey;
  dates: string[];
  siteFeeMode?: SiteFeeMode;
}): string {
  const who = String(input.fullName || "").trim() || "phi cong";
  const phone = String(input.phone || "").trim();

  const when = (() => {
    if (input.period === "mua_vang") return "Mua Vang 2026";
    if (input.period === "le_hoi_com") return "Le hoi Com";

    // Gói tháng thì ghi tháng cho gọn.
    if (input.siteFeeMode === "month") {
      const [y, m] = String(input.dates[0] || "").split("-");
      return y && m ? `thang ${m}/${y}` : "tron thang";
    }

    return input.dates.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`).join(" ");
  })();

  /**
   * Ô nội dung chuyển khoản chỉ chứa được khoảng 99 ký tự. Số điện thoại là
   * thứ ban tổ chức dùng để gọi lại nên phải sống sót; nếu dài quá thì cắt
   * bớt phần liệt kê ngày chứ không cắt đuôi cả chuỗi.
   */
  const head = `pc ${who}`;
  const tail = phone ? ` - ${phone}` : "";
  const room = 99 - head.length - tail.length - 3;
  const middle = when.length > room ? `${when.slice(0, Math.max(0, room - 1))}…` : when;

  return `${head} - ${middle}${tail}`;
}

/**
 * Bài viết phi công và người nhà nên đọc trước khi lên đường.
 *
 * Slug lấy từ chính cơ sở dữ liệu bài viết — đổi slug bài nào thì phải sửa ở
 * đây, không có cơ chế tự dò.
 */
export const GUIDE_LINKS = [
  {
    href: "/blog/le-hoi-du-luon-bay-tren-mua-vang-2026",
    title: "Lễ hội dù lượn Mùa Vàng 2026 tại đèo Khau Phạ",
    desc: "Toàn cảnh sự kiện năm nay",
    icon: "🌾",
  },
  {
    href: "/blog/mua-lua-xanh-mu-cang-chai",
    title: "Bay mùa lúa xanh Mù Cang Chải",
    desc: "Tháng 8 — lúa còn xanh, trùng dịp Lễ hội Cốm Tú Lệ",
    icon: "🌱",
  },
  {
    href: "/blog/ultra-trail-mua-vang-2026-chay-trail-va-bay-du-luon-mu-cang-chai",
    title: "Ultra Trail Mùa Vàng 2026: chạy trail & bay dù lượn",
    desc: "Giải trail chạy cùng dịp lễ hội",
    icon: "🏃",
  },
  {
    href: "/blog/di-chuyen-den-diem-bay-du-luon-khau-pha",
    title: "Cách di chuyển đến điểm bay đèo Khau Phạ",
    desc: "Đường vào bãi cất cánh và bãi hạ cánh",
    icon: "🧭",
  },
  {
    href: "/blog/duong-ha-noi-di-mu-cang-chai-qua-ic14",
    title: "Đường Hà Nội đi Mù Cang Chải qua nút giao IC14",
    desc: "Lối đi nhanh nhất bằng ô tô",
    icon: "🛣️",
  },
  {
    href: "/blog/tu-san-bay-noi-bai-di-mu-cang-chai",
    title: "Từ sân bay Nội Bài tới Mù Cang Chải",
    desc: "Dành cho phi công bay tới Hà Nội",
    icon: "✈️",
  },
  {
    href: "/blog/xe-di-mu-cang-chai",
    title: "Tổng hợp xe đi Mù Cang Chải",
    desc: "Nhà xe, giờ chạy, giá vé",
    icon: "🚌",
  },
  {
    href: "/blog/diem-cat-canh-ha-canh-du-luon-khau-pha",
    title: "Điểm cất cánh và hạ cánh đèo Khau Phạ có gì?",
    desc: "Địa hình, gió và bố trí bãi",
    icon: "🪂",
  },
  {
    href: "/blog/cam-nang-du-lich-mu-cang-chai-lao-cai",
    title: "Cẩm nang du lịch Mù Cang Chải",
    desc: "Cho người nhà đi cùng: ăn gì, chơi đâu",
    icon: "🗺️",
  },
] as const;

/**
 * Khoá của từng dòng phí.
 *
 * Nhãn tiếng Việt bên dưới dùng cho email và Google Sheets (hai nơi luôn
 * tiếng Việt). Trang đăng ký thì tra theo khoá này để lấy câu chữ đúng ngôn
 * ngữ khách đang xem — đổi câu tiếng Việt không làm hỏng bản dịch.
 */
export type FeeKey =
  | "combo"
  | "companions"
  | "extraFree"
  | "extraPaid"
  | "comFree"
  | "siteMonth"
  | "siteDay"
  | "siteFreeDays"
  | "siteNone";

export type NoteKey =
  | "muaVangMotor"
  | "muaVangPara"
  | "com"
  | "month"
  | "dayFree"
  | "day";

export type FeeLine = {
  key: FeeKey;
  /** Số lượng đi kèm (số ngày, số người) để bản dịch ghép câu. */
  count?: number;
  label: string;
  amount: number;
  free?: boolean;
  /**
   * Chữ thay cho "Miễn phí" ở cột tiền.
   *
   * Combo Mùa Vàng không miễn phí cho tất cả — chỉ phi công PPG. Ghi trơ
   * "Miễn phí" thì phi công dù lượn nhìn bảng của người khác lại tưởng mình
   * cũng được, nên nói thẳng miễn cho ai.
   */
  freeLabel?: string;
};

export type FeeResult = {
  lines: FeeLine[];
  total: number;
  /** Câu giải thích ngắn hiện dưới bảng phí. */
  note: string;
  noteKey: NoteKey;
};

/**
 * Tính phí cho một lượt đăng ký.
 *
 * Ba đợt bay có ba cách tính khác hẳn nhau nên gom về một hàm: bảng phí trên
 * trang, email gửi phi công và dòng ghi vào Google Sheets đều gọi hàm này.
 */
export function computePilotFee(input: {
  period: PeriodKey;
  kind: FlyingKind;
  /** Những ngày phi công đã tích trên lịch. */
  dates: string[];
  siteFeeMode: SiteFeeMode;
  /** Người nhà đi kèm — chỉ áp dụng cho đợt Mùa Vàng. */
  companionCount?: number;
  /** Đã đăng ký VÀ thanh toán Festival Mùa Vàng (miễn phí điểm bay 26/8–4/9). */
  muaVangRegistered?: boolean;
}): FeeResult {
  const motor = hasMotor(input.kind);
  const dates = Array.isArray(input.dates) ? input.dates : [];

  if (input.period === "mua_vang") {
    const companions = Math.max(0, Math.floor(Number(input.companionCount) || 0));
    const lines: FeeLine[] = [];

    const comboLabel =
      "Combo tham dự Festival dù lượn Bay trên mùa vàng 2026 trọn gói";

    if (motor) {
      lines.push({
        key: "combo",
        label: comboLabel,
        amount: 0,
        free: true,
        freeLabel: "Free cho pc PPG",
      });
    } else {
      lines.push({ key: "combo", label: comboLabel, amount: MUA_VANG_COMBO_VND });
    }

    // Người nhà đóng đủ kể cả khi phi công được miễn phí: suất ăn ở của họ
    // vẫn là chi phí thật của ban tổ chức.
    if (companions > 0) {
      lines.push({
        key: "companions",
        count: companions,
        label: `Người nhà đi kèm × ${companions}`,
        amount: COMPANION_VND * companions,
      });
    }

    /**
     * Ngày bay THÊM ngoài ba ngày lễ hội.
     * Nằm trong 26/8–4/9 thì miễn phí điểm bay, ngoài khoảng đó vẫn thu
     * như ngày thường.
     */
    const extra = dates.filter((d) => !PERIODS.mua_vang.dates.includes(d));
    const extraFree = extra.filter(isInFreeSiteFeeWindow);
    const extraPaid = extra.filter((d) => !isInFreeSiteFeeWindow(d));

    if (extraFree.length) {
      lines.push({
        key: "extraFree",
        count: extraFree.length,
        label: `Bay thêm × ${extraFree.length} ngày (trong ${MUA_VANG_FREE_SITE_FEE_DAYS} ngày miễn phí)`,
        amount: 0,
        free: true,
      });
    }

    if (extraPaid.length) {
      lines.push({
        key: "extraPaid",
        count: extraPaid.length,
        label: `Phí điểm bay ${SITE_FEE_PER_DAY.toLocaleString("vi-VN")} đ × ${extraPaid.length} ngày (ngoài khoảng miễn phí)`,
        amount: SITE_FEE_PER_DAY * extraPaid.length,
      });
    }

    const total = lines.reduce((sum, l) => sum + (l.free ? 0 : l.amount), 0);

    return {
      lines,
      total,
      noteKey: motor ? "muaVangMotor" : "muaVangPara",
      note: motor
        ? `Phi công bay dù máy được miễn phí combo. Người nhà đi kèm đóng theo suất. ${MUA_VANG_FREE_SITE_FEE_TEXT}.`
        : `Combo trọn gói, không tách lẻ và không nhận đặt lẻ từng mục. ${MUA_VANG_FREE_SITE_FEE_TEXT}.`,
    };
  }

  if (input.period === "le_hoi_com") {
    return {
      lines: [
        { key: "comFree", label: "Phí bay trong Lễ hội Cốm Tú Lệ", amount: 0, free: true },
      ],
      total: 0,
      noteKey: "com",
      note: "Ban tổ chức không thu phí trong dịp Lễ hội Cốm Tú Lệ, phi công tự túc ăn ở đi lại.",
    };
  }

  // Còn lại là ngày thường: phí điểm bay, theo ngày hoặc trọn tháng.
  if (input.siteFeeMode === "month") {
    return {
      lines: [
        { key: "siteMonth", label: "Phí điểm bay trọn tháng", amount: SITE_FEE_PER_MONTH },
      ],
      total: SITE_FEE_PER_MONTH,
      noteKey: "month",
      note: "Gói tháng bằng đúng 7 ngày lẻ — từ ngày thứ 8 trong tháng là bay không mất thêm. Chi phí này không bao gồm ăn ở và đi lại.",
    };
  }

  /**
   * Tính theo ĐÚNG số ngày đã tích, kể cả tích rời rạc — bay ngày nào tính
   * ngày đó. Phi công đã đăng ký và thanh toán Festival Mùa Vàng thì những
   * ngày rơi vào 26/8–4/9
   * được trừ ra.
   */
  const freeDays = input.muaVangRegistered
    ? dates.filter(isInFreeSiteFeeWindow)
    : [];
  const paidDays = dates.filter((d) => !freeDays.includes(d));

  const lines: FeeLine[] = [];

  if (paidDays.length) {
    lines.push({
      key: "siteDay",
      count: paidDays.length,
      label: `Phí điểm bay ${SITE_FEE_PER_DAY.toLocaleString("vi-VN")} đ × ${paidDays.length} ngày`,
      amount: SITE_FEE_PER_DAY * paidDays.length,
    });
  }

  if (freeDays.length) {
    lines.push({
      key: "siteFreeDays",
      count: freeDays.length,
      label: `Miễn phí điểm bay × ${freeDays.length} ngày (đã đăng ký và thanh toán Mùa Vàng)`,
      amount: 0,
      free: true,
    });
  }

  if (!lines.length) {
    lines.push({ key: "siteNone", label: "Phí điểm bay", amount: 0, free: true });
  }

  return {
    lines,
    total: SITE_FEE_PER_DAY * paidDays.length,
    noteKey: freeDays.length ? "dayFree" : "day",
    note: freeDays.length
      ? `Phi công dự Festival Mùa Vàng được ${MUA_VANG_FREE_SITE_FEE_TEXT.toLowerCase()}. Chi phí này không bao gồm ăn ở và đi lại.`
      : "Bay ngày nào tính ngày đó, không cần chọn các ngày liền nhau. Từ 8 ngày trong tháng thì gói tháng rẻ hơn. Chi phí này không bao gồm ăn ở và đi lại.",
  };
}

export const KIND_LABEL: Record<FlyingKind, string> = {
  paragliding: "Bay dù lượn",
  paramotor: "Bay dù gắn động cơ",
  both: "Bay cả dù lượn và dù gắn động cơ",
};

export const MOTOR_LABEL: Record<MotorType, string> = {
  trike: "Máy Trike",
  foot: "Máy Foot",
};

export const SITE_FEE_LABEL: Record<SiteFeeMode, string> = {
  day: "Theo ngày",
  month: "Trọn tháng",
};

/**
 * Tên viết gọn để công bố danh sách phi công đã đăng ký.
 *
 * Viết tắt mọi chữ trước tên gọi rồi chấm, giữ nguyên tên gọi:
 *   "Nguyễn Mạnh Hùng" -> "NM.Hùng"
 *   "Đặng Văn Mỹ"      -> "ĐV.Mỹ"
 *
 * Đủ để anh em trong giới nhận ra nhau mà không phơi tên đầy đủ của người ta
 * lên một trang ai cũng xem được.
 */
export function shortenPilotName(raw: string): string {
  const parts = String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) return parts.join(" ");

  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((w) => w.charAt(0).toLocaleUpperCase("vi-VN"))
    .join("");

  return `${initials}.${last}`;
}

/** "2026-08-29" -> "29/08/2026" */
export function formatVnDate(iso: string): string {
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

export function formatVnd(n: number): string {
  return `${Math.round(Number(n) || 0).toLocaleString("vi-VN")} đ`;
}
