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

export const CAFE_COUNTERS = [
  { id: "cafe-1", name: "Quầy cafe 1" },
  { id: "cafe-2", name: "Quầy cafe 2" },
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
   * Món "phiếu nước khách bay": giá 0, đếm RIÊNG thành "số khách uống nước"
   * — con số chủ cần thấy hằng ngày để đối chiếu với số khách bay.
   */
  freeTicket?: boolean;
};

/** Khối nút trên máy bán — thứ tự này cũng là thứ tự hiện trên màn hình. */
export const CAFE_GROUPS = [
  { id: "ca-phe", name: "Cà phê" },
  { id: "tra", name: "Trà" },
  { id: "do-uong", name: "Đồ uống khác" },
  { id: "an-vat", name: "Đồ ăn vặt" },
] as const;

export type CafeGroupId = (typeof CAFE_GROUPS)[number]["id"];

/**
 * MENU THẬT của quầy — chép từ máy bán hàng Sunmi ngày 06/09/2026 (chủ gửi
 * ảnh chụp màn hình "Tất cả mặt hàng"). Giá ở đây PHẢI khớp máy bán ngoài
 * bãi: hai nơi lệch giá là phiếu in ra một đằng, tiền thu một nẻo.
 *
 * Giữ mỗi món một `id` ổn định (đừng đổi id khi đổi giá) vì phiếu đã bán lưu
 * theo tên + giá tại thời điểm bán, còn thống kê theo món thì bám id.
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
  { id: "nuoc-loc", name: "Nước lọc", en: "Mineral water", price: 10_000, group: "do-uong" },
  { id: "cocacola", name: "Cocacola", price: 20_000, group: "do-uong" },
  { id: "bia-ha-noi", name: "Bia Hà Nội", en: "Beer Hanoi", price: 25_000, group: "do-uong" },
  { id: "bo-huc", name: "Bò húc", en: "Red Bull", price: 25_000, group: "do-uong" },
  { id: "nuoc-chanh-tuoi", name: "Nước chanh tươi", en: "Fresh lemonade", price: 30_000, group: "do-uong" },
  { id: "dua-tuoi", name: "Dừa tươi", en: "Fresh coconut", price: 30_000, group: "do-uong" },
  { id: "sua-chua-danh-da", name: "Sữa chua đánh đá", en: "Iced yogurt", price: 35_000, group: "do-uong" },
  { id: "cacao", name: "Cacao", price: 40_000, group: "do-uong" },
  { id: "macha-dua", name: "Macha dừa", en: "Coco Matcha", price: 55_000, group: "do-uong" },
  { id: "matcha-latte", name: "Matcha latte", price: 55_000, group: "do-uong" },

  /* --- Đồ ăn vặt --- */
  { id: "bong-ngo", name: "Bỏng ngô", en: "Popcorn", price: 25_000, group: "an-vat" },
  { id: "huong-duong", name: "Hướng dương", en: "Sun flower seeds", price: 25_000, group: "an-vat" },
  { id: "kho-ga-heo", name: "Khô gà/heo", en: "Dried chicken/pork", price: 30_000, group: "an-vat" },
];

/** Một dòng đã bán / một khoản chi — dạng lưu trong hàng đợi máy bán lẫn DB. */
export type CafeEntry = {
  /** Mã sinh ở MÁY BÁN (uuid) — chống ghi trùng khi mạng chập chờn gửi lại. */
  clientId: string;
  counter: CafeCounterId;
  kind: "sale" | "expense";
  /** kind "sale": các món trong phiếu. */
  items: Array<{ id: string; name: string; price: number; qty: number }>;
  /** Tổng tiền phiếu (sale) hoặc số tiền chi (expense). */
  total: number;
  /** sale: khách trả bằng gì. "free" = toàn phiếu nước miễn phí, không thu tiền. */
  method: "cash" | "transfer" | "free";
  /** expense: nội dung khoản chi. */
  note: string;
  /** Giờ bấm bán TẠI MÁY (ISO) — lúc mất mạng vẫn đúng giờ bán thật. */
  soldAt: string;
};
