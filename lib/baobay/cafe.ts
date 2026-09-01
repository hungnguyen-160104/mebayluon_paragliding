// lib/baobay/cafe.ts
/**
 * QUẦY CAFE tại bãi — danh mục món và các hằng dùng chung.
 *
 * Hai quầy, hai nhân viên, việc hằng ngày chỉ có bốn con số: THU (tiền mặt) ·
 * CHI · CK · SỐ KHÁCH UỐNG NƯỚC MIỄN PHÍ (mỗi khách bay dù được một phiếu —
 * 100 khách bay là 100 phiếu). Menu cố ý ĐƠN GIẢN và nằm trong mã: đổi món /
 * đổi giá là sửa file này, deploy phát ăn ngay — hai quầy không cần trang
 * quản trị menu riêng.
 */

export const CAFE_COUNTERS = [
  { id: "cafe-1", name: "Quầy cafe 1" },
  { id: "cafe-2", name: "Quầy cafe 2" },
] as const;

export type CafeCounterId = (typeof CAFE_COUNTERS)[number]["id"];

export type CafeMenuItem = {
  id: string;
  name: string;
  price: number;
  /**
   * Món "phiếu nước khách bay": giá 0, đếm RIÊNG thành "số khách uống nước"
   * — con số chủ cần thấy hằng ngày để đối chiếu với số khách bay.
   */
  freeTicket?: boolean;
};

/**
 * MENU MẪU — chủ đưa danh sách thật thì thay vào đây. Giữ mỗi món một `id`
 * ổn định (đừng đổi id khi đổi giá) vì phiếu đã bán lưu theo tên + giá tại
 * thời điểm bán, còn thống kê theo món thì bám id.
 */
export const CAFE_MENU: CafeMenuItem[] = [
  { id: "free-water", name: "Phiếu nước khách bay", price: 0, freeTicket: true },
  { id: "ca-phe-den", name: "Cà phê đen", price: 25_000 },
  { id: "ca-phe-sua", name: "Cà phê sữa", price: 30_000 },
  { id: "bac-xiu", name: "Bạc xỉu", price: 35_000 },
  { id: "tra-chanh", name: "Trà chanh", price: 20_000 },
  { id: "tra-dao", name: "Trà đào", price: 30_000 },
  { id: "nuoc-suoi", name: "Nước suối", price: 10_000 },
  { id: "nuoc-ngot", name: "Nước ngọt", price: 15_000 },
  { id: "nuoc-dua", name: "Nước dừa", price: 30_000 },
  { id: "mi-tom", name: "Mì tôm trứng", price: 25_000 },
  { id: "xuc-xich", name: "Xúc xích nướng", price: 20_000 },
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
