// lib/baobay/cafe.ts
/**
 * QUẦY CAFE tại bãi — danh mục món và các hằng dùng chung.
 *
 * Hai quầy, hai nhân viên, việc hằng ngày chỉ có bốn con số: THU (tiền mặt) ·
 * CHI · CK · SỐ KHÁCH UỐNG NƯỚC MIỄN PHÍ (mỗi khách bay dù được một phiếu —
 * 100 khách bay là 100 phiếu). Menu nằm TRONG MÃ, chép đúng máy bán Sunmi
 * ngoài bãi: đổi món / đổi giá là sửa file này rồi deploy — hai quầy không cần
 * trang quản trị menu riêng, nhưng sửa ở đây thì PHẢI SỬA LUÔN TRÊN MÁY SUNMI,
 * lệch giá là phiếu in một đằng tiền thu một nẻo.
 */

/**
 * QUẦY CAFE CHỈ CÓ Ở KHAU PHẠ (luật chủ 06/09) — Sa Pa và Hà Nội không có
 * quầy. Mọi phép cộng, mọi trang của quầy đều ghim vào điểm này, không hỏi
 * người dùng chọn điểm nữa.
 */
export const CAFE_SPOT = "khau-pha";

/** Hai quầy tại bãi: một ở bãi hạ cánh, một ở bãi cất cánh. */
export const CAFE_COUNTERS = [
  { id: "bai-ha", name: "Quầy bãi hạ" },
  { id: "bai-cat", name: "Quầy bãi cất" },
] as const;

export type CafeCounterId = (typeof CAFE_COUNTERS)[number]["id"];

export type CafeMenuItem = {
  id: string;
  name: string;
  /** Tên tiếng Anh in kèm trên nút và trên phiếu — khách Tây đọc được. */
  en?: string;
  price: number;
  /** Nhóm để xếp nút thành từng khối, quầy khỏi dò giữa 27 món. */
  group?: CafeGroupId;
  /**
   * ĐỊNH MỨC: bán một phần món này thì rút những gì ra khỏi kho.
   *
   * Hàng đóng gói đếm được thì một dòng, số lượng 1 — bán một lon bia rút một
   * lon. Đồ pha chế thì kê theo khối lượng: một ly cà phê sữa rút 20g cà phê
   * bột + 30ml sữa đặc. Nhờ vậy kho cân đối được cả hai loại bằng cùng một
   * phép tính, và ước lượng được nguyên liệu cho từng món.
   *
   * Để trống là món KHÔNG theo kho — vẫn bán bình thường, chỉ không vào bảng
   * kiểm kê. Định mức sửa được ngay trên máy bán, không cần deploy.
   */
  uses?: CafeRecipeLine[];
  /**
   * Món "phiếu nước khách bay": giá 0, đếm RIÊNG thành "số khách uống nước"
   * — con số chủ cần thấy hằng ngày để đối chiếu với số khách bay.
   */
  freeTicket?: boolean;
  /**
   * MÓN CỐ ĐỊNH: nằm trong bảng giá niêm yết (cà phê, trà, nước…), quầy KHÔNG
   * sửa và KHÔNG gỡ được — chỉ quản trị. Máy chủ tự gắn cờ này khi dựng menu,
   * không phải khai tay trong danh sách dưới.
   */
  fixed?: boolean;
};

/** Khối nút trên máy bán — thứ tự này cũng là thứ tự hiện trên màn hình. */
export const CAFE_GROUPS = [
  { id: "ca-phe", name: "Cà phê" },
  { id: "tra", name: "Trà" },
  { id: "do-uong", name: "Đồ uống khác" },
  { id: "an-vat", name: "Đồ ăn vặt" },
  /**
   * ĐỒ LƯU NIỆM (áo, khăn, móc khoá…) — khối DUY NHẤT quầy tự thêm bớt được.
   * Đồ uống là bảng giá đã niêm yết, sửa tại quầy thì mỗi máy một giá; hàng
   * lưu niệm thì đổi theo mùa và theo lô nhập nên phải sửa được ngay tại chỗ.
   */
  { id: "luu-niem", name: "Đồ lưu niệm" },
] as const;

export type CafeGroupId = (typeof CAFE_GROUPS)[number]["id"];

/**
 * MENU THẬT của quầy — chép từ máy bán hàng Sunmi ngày 06/09/2026 (chủ gửi
 * ảnh chụp màn hình "Tất cả mặt hàng"). Giá ở đây PHẢI khớp máy bán ngoài
 * bãi: hai nơi lệch giá là phiếu in ra một đằng, tiền thu một nẻo.
 *
 * Giữ mỗi món một `id` ổn định (đừng đổi id khi đổi giá HAY ĐỔI TÊN) vì phiếu
 * đã bán lưu theo tên + giá tại thời điểm bán, còn thống kê theo món, số liệu
 * kho và định mức đều bám id. Đổi tên thoải mái, đổi id là cắt đứt tất cả.
 * Đã đổi tên: 06/09 Bia Hà Nội → Bia Sài Gòn (lon), Nước lọc → Nước khoáng
 * Lavie; mã vẫn là "bia-ha-noi" và "nuoc-loc".
 */
export const CAFE_MENU: CafeMenuItem[] = [
  { id: "free-water", name: "Phiếu nước khách bay", price: 0, freeTicket: true },

  /* --- Cà phê --- */
  { id: "ca-phe-den", name: "Cà phê đen", en: "Black coffee", price: 35_000, group: "ca-phe" },
  { id: "ca-phe-sua", name: "Cà phê sữa", en: "Milk coffee", price: 35_000, group: "ca-phe" },
  { id: "bac-xiu", name: "Cà phê bạc xỉu", en: "White coffee", price: 40_000, group: "ca-phe" },
  { id: "ca-phe-americano", name: "Cà phê Americano", en: "Americano", price: 40_000, group: "ca-phe" },
  { id: "ca-phe-cot-dua", name: "Cà phê cốt dừa", en: "Coconut coffee", price: 45_000, group: "ca-phe" },
  { id: "ca-phe-muoi", name: "Cà phê muối", en: "Salt coffee", price: 45_000, group: "ca-phe" },

  /* --- Trà --- */
  { id: "tra-da", name: "Trà đá", en: "Iced tea", price: 15_000, group: "tra" },
  { id: "tra-chanh", name: "Trà chanh", en: "Lemon tea", price: 30_000, group: "tra" },
  { id: "tra-gung", name: "Trà gừng", en: "Ginger tea", price: 30_000, group: "tra" },
  { id: "tra-chanh-nha-dam", name: "Trà chanh nha đam", en: "Aloe lemon tea", price: 35_000, group: "tra" },
  { id: "tra-dao", name: "Trà đào", en: "Peach tea", price: 35_000, group: "tra" },
  { id: "am-tra-man", name: "Ấm trà mạn / trà thảo mộc", en: "Pot of tea", price: 40_000, group: "tra" },
  { id: "tra-sua", name: "Trà sữa", en: "Milk tea", price: 50_000, group: "tra" },
  { id: "tra-dau-biec", name: "Trà đậu biếc", en: "Pealuna", price: 55_000, group: "tra" },

  /* --- Đồ uống khác --- */
  { id: "nuoc-loc", name: "Nước khoáng Lavie", en: "Lavie mineral water", price: 10_000, group: "do-uong", uses: [{ key: "nuoc-loc", qty: 1 }] },
  { id: "cocacola", name: "Cocacola", price: 20_000, group: "do-uong", uses: [{ key: "cocacola", qty: 1 }] },
  { id: "bia-ha-noi", name: "Bia Sài Gòn (lon)", en: "Beer Saigon (can)", price: 25_000, group: "do-uong", uses: [{ key: "bia-ha-noi", qty: 1 }] },
  { id: "bo-huc", name: "Bò húc", en: "Red Bull", price: 25_000, group: "do-uong", uses: [{ key: "bo-huc", qty: 1 }] },
  { id: "nuoc-chanh-tuoi", name: "Nước chanh tươi", en: "Fresh lemonade", price: 30_000, group: "do-uong" },
  { id: "dua-tuoi", name: "Dừa tươi", en: "Fresh coconut", price: 30_000, group: "do-uong" },
  { id: "sua-chua-danh-da", name: "Sữa chua đánh đá", en: "Iced yogurt", price: 35_000, group: "do-uong" },
  { id: "cacao", name: "Cacao", price: 40_000, group: "do-uong" },
  { id: "macha-dua", name: "Macha dừa", en: "Coco Matcha", price: 55_000, group: "do-uong" },
  { id: "matcha-latte", name: "Matcha latte", price: 55_000, group: "do-uong" },

  /* --- Đồ ăn vặt --- */
  { id: "bong-ngo", name: "Bỏng ngô", en: "Popcorn", price: 25_000, group: "an-vat", uses: [{ key: "bong-ngo", qty: 1 }] },
  { id: "huong-duong", name: "Hướng dương", en: "Sun flower seeds", price: 25_000, group: "an-vat", uses: [{ key: "huong-duong", qty: 1 }] },
  { id: "kho-ga-heo", name: "Khô gà/heo", en: "Dried chicken/pork", price: 30_000, group: "an-vat", uses: [{ key: "kho-ga-heo", qty: 1 }] },
];

/**
 * CHÍNH SÁCH GIẢM GIÁ tại quầy (luật chủ 06/09) — bấm một nút khi tính tiền.
 *
 * Phiếu giảm 100% VẪN LÀ MỘT PHIẾU BÁN, không phải phiếu bỏ đi: hàng đã ra
 * khỏi kho thật, nên phải nằm trong phép kiểm kê "nhập bao nhiêu, bán bao
 * nhiêu". Đây cũng là lý do không dùng lại nút "phiếu nước khách bay" cho
 * khách ngoại giao — phiếu nước là quà kèm vé bay, còn đây là hàng bán.
 */
export const CAFE_DISCOUNTS = [
  { id: "none", name: "Khách thường", short: "", rate: 0, countsTicket: false },
  { id: "staff", name: "Phi công / người nhà", short: "PC −20%", rate: 0.2, countsTicket: false },
  {
    /**
     * KHÁCH BAY DÙ: nước miễn phí theo ĐẦU VÉ đã xuất — mỗi khách bay một
     * phiếu. Khác hai mức trên ở chỗ nó ĐẾM PHIẾU: mỗi phần nước trong đơn là
     * một phiếu trừ vào số vé đã xuất trong ngày, và cộng vào số phiếu người
     * bán đang giữ.
     *
     * Dùng tích này thay cho nút "phiếu nước khách bay" khi khách lấy đồ uống
     * có thật (trà đá, nước lọc): món ghi đúng tên nên VẪN TRỪ KHO, còn nút
     * kia chỉ in một tờ phiếu trắng không nói được khách uống gì.
     */
    id: "khach-bay",
    name: "Khách bay dù",
    short: "BAY −100%",
    rate: 1,
    countsTicket: true,
  },
  { id: "diplomatic", name: "Khách ngoại giao", short: "NG −100%", rate: 1, countsTicket: false },
] as const;

export type CafeDiscountId = (typeof CAFE_DISCOUNTS)[number]["id"];

/** Tỉ lệ giảm của một mức — mã lạ thì coi như không giảm. */
export function cafeDiscountRate(id: string | undefined): number {
  return CAFE_DISCOUNTS.find((d) => d.id === id)?.rate ?? 0;
}

/** Mức này có đếm vào "số phiếu nước khách bay" không. */
export function cafeDiscountCountsTicket(id: string | undefined): boolean {
  return CAFE_DISCOUNTS.find((d) => d.id === id)?.countsTicket ?? false;
}

/** Một dòng định mức: bán một phần món thì rút `qty` đơn vị của hàng `key`. */
export type CafeRecipeLine = { key: string; qty: number };

/**
 * DANH MỤC KHO — hai loại hàng, cùng một phép tính.
 *
 *  - "packaged": đếm được từng cái (lon bia, chai nước, gói bỏng ngô). Đơn vị
 *    gốc là cái; một thùng bia 24 lon nên khai "30 thùng" ra 720 lon.
 *  - "ingredient": đong theo khối lượng / thể tích (cà phê bột tính bằng gam,
 *    sữa đặc tính bằng ml). Đơn vị gốc là g hoặc ml; một bao cà phê 1kg là
 *    1000g, một thùng sữa 5 lít là 5000ml.
 *
 * Quy MỌI thứ về đơn vị gốc nhỏ nhất là mấu chốt: nhập theo kiện, bán theo
 * món, hai vế vẫn cộng trừ được với nhau. Nhờ đó trả lời được cả "tháng 9 nhập
 * 30 thùng bia thì bán được bao nhiêu lon" lẫn "5kg cà phê bột pha được bao
 * nhiêu ly, còn lại bao nhiêu".
 *
 * Đây là danh mục NỀN. Quầy thêm mặt hàng khác ngay trên máy — xem
 * models/CafeStockItem.model.ts.
 */
export type CafeStockKind = "packaged" | "ingredient";

export type CafeStockItem = {
  key: string;
  name: string;
  kind: CafeStockKind;
  /** Đơn vị gốc: lon · chai · gói · g · ml. */
  unit: string;
  /** Tên kiện nhập: thùng · bao · can · hộp. */
  packName: string;
  /** Một kiện bằng bao nhiêu đơn vị gốc. */
  packSize: number;
};

export const CAFE_STOCK_ITEMS: CafeStockItem[] = [
  /* --- Hàng đóng gói: đếm từng cái --- */
  { key: "bia-ha-noi", name: "Bia Sài Gòn", kind: "packaged", unit: "lon", packName: "thùng", packSize: 24 },
  { key: "bo-huc", name: "Bò húc", kind: "packaged", unit: "lon", packName: "thùng", packSize: 24 },
  { key: "cocacola", name: "Cocacola", kind: "packaged", unit: "lon", packName: "thùng", packSize: 24 },
  { key: "nuoc-loc", name: "Nước khoáng Lavie", kind: "packaged", unit: "chai", packName: "thùng", packSize: 24 },
  { key: "bong-ngo", name: "Bỏng ngô", kind: "packaged", unit: "gói", packName: "thùng", packSize: 20 },
  { key: "huong-duong", name: "Hướng dương", kind: "packaged", unit: "gói", packName: "thùng", packSize: 20 },
  { key: "kho-ga-heo", name: "Khô gà/heo", kind: "packaged", unit: "gói", packName: "thùng", packSize: 20 },

  /*
   * --- Nguyên liệu pha chế: đong theo gam / ml ---
   *
   * ĐỊNH MỨC TỪNG MÓN CHƯA ĐIỀN SẴN, và đó là cố ý: một ly cà phê sữa của quầy
   * này rút bao nhiêu gam bột là con số chỉ người pha mới biết. Quầy cân thử
   * một ly rồi gõ vào ô "định mức" của món — từ đó máy tự ước lượng.
   */
  { key: "ca-phe-bot", name: "Cà phê bột", kind: "ingredient", unit: "g", packName: "bao", packSize: 1000 },
  { key: "sua-dac", name: "Sữa đặc", kind: "ingredient", unit: "ml", packName: "thùng", packSize: 5000 },
  { key: "sua-tuoi", name: "Sữa tươi", kind: "ingredient", unit: "ml", packName: "thùng", packSize: 12000 },
  { key: "tra-kho", name: "Trà khô", kind: "ingredient", unit: "g", packName: "bao", packSize: 1000 },
  { key: "bot-matcha", name: "Bột matcha", kind: "ingredient", unit: "g", packName: "hộp", packSize: 500 },
  { key: "duong", name: "Đường", kind: "ingredient", unit: "g", packName: "bao", packSize: 1000 },
  { key: "da-cay", name: "Đá cây", kind: "ingredient", unit: "g", packName: "cây", packSize: 25000 },
];

/** Mã đơn vị gốc nào là khối lượng/thể tích — chỗ hiển thị đổi ra kg/lít cho dễ đọc. */
export function isBulkUnit(unit: string): boolean {
  return unit === "g" || unit === "ml";
}

/**
 * Đổi số đơn vị gốc ra chữ dễ đọc: 1500 g → "1,5 kg", 720 lon → "720 lon".
 * Kho nguyên liệu đếm bằng gam nên con số rất to, in trần ra thì không ai đọc.
 */
export function formatStockUnits(units: number, unit: string): string {
  const n = Math.round(units);
  if (unit === "g" && Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} kg`;
  if (unit === "ml" && Math.abs(n) >= 1000) return `${(n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lít`;
  return `${n.toLocaleString("vi-VN")} ${unit}`;
}

/** Một dòng đã bán / một khoản chi — dạng lưu trong hàng đợi máy bán lẫn DB. */
export type CafeEntry = {
  /** Mã sinh ở MÁY BÁN (uuid) — chống ghi trùng khi mạng chập chờn gửi lại. */
  clientId: string;
  counter: CafeCounterId;
  kind: "sale" | "expense";
  /**
   * kind "sale": các món trong phiếu.
   *
   * `note` là câu dặn của khách ("ít đá") — để RIÊNG chứ không ghép vào tên:
   * ghép rồi thì lúc sửa lại đơn phải bóc chuỗi trong ngoặc ra đoán ngược, mà
   * tên món cũng có thể vốn đã có ngoặc (Trà đậu biếc (Pealuna)).
   */
  items: Array<{ id: string; name: string; note?: string; price: number; qty: number }>;
  /** Tổng tiền phiếu (sale) hoặc số tiền chi (expense) — máy chủ tính lại. */
  total: number;
  /** Mức giảm đã bấm khi tính tiền: khách thường / phi công / ngoại giao. */
  discount?: CafeDiscountId;
  /** sale: khách trả bằng gì. "free" = toàn phiếu nước miễn phí, không thu tiền. */
  method: "cash" | "transfer" | "free";
  /**
   * kind "expense": THU hay CHI. Quầy không chỉ chi ra — khách trả nợ ly cà
   * phê hôm qua, người nhà gửi lại tiền lẻ… đều là tiền vào tay người trực,
   * phải ghi được ngay tại máy bán chứ không đợi cuối ca nhớ lại.
   */
  direction?: "thu" | "chi";
  /** expense: nội dung khoản thu/chi. */
  note: string;
  /** Giờ bấm bán TẠI MÁY (ISO) — lúc mất mạng vẫn đúng giờ bán thật. */
  soldAt: string;
};
