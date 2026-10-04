// lib/baobay/booking-order.ts
/**
 * THỨ TỰ DANH SÁCH BOOKING TRONG NGÀY (chủ 04/10: "cho thêm 'sắp xếp theo số
 * thứ tự'; các booking mới nhập nhất sẽ hiện lên trên cùng (trong 1 khoảng
 * thời gian)").
 *
 * Dùng chung cho cả ba kiểu xem (☰ Thẻ · ▦ Bảng · ▤ Sheet) — một chỗ quyết
 * định thứ tự thì ba kiểu không bao giờ xếp khác nhau.
 */

/** Booking nhập trong chừng này PHÚT gần nhất được GHIM lên đầu kèm nhãn "mới". */
export const MOI_NHAP_PHUT = 30;

/**
 * Kiểu xếp người dùng chọn (nhớ theo từng máy):
 *  - seq    : theo số thứ tự trong ngày (#1, #2, …) — mặc định
 *  - newest : mới nhập trước (giờ tạo giảm dần)
 *  - flown  : đã bay lên trước, rồi theo số
 *  - ticket : đã xuất vé lên trước, theo giờ xuất (= thứ tự khách đến quầy)
 */
export type BookingSort = "seq" | "newest" | "flown" | "ticket";
export const BOOKING_SORTS: BookingSort[] = ["seq", "newest", "flown", "ticket"];
export const BOOKING_SORT_KEY = "baobay-booking-sort";

type Row = {
  daySeq?: number;
  status?: string;
  createdAt?: string;
  ticketIssued?: boolean;
  ticketIssuedAt?: string;
};

const createdMs = (b: Row) => {
  const t = b.createdAt ? Date.parse(b.createdAt) : NaN;
  return Number.isFinite(t) ? t : 0;
};

/** Booking CHỜ BAY nhập trong `MOI_NHAP_PHUT` phút gần nhất. */
export function moiNhap(b: Row, now = Date.now()): boolean {
  if (b.status !== "open") return false;
  const t = createdMs(b);
  return t > 0 && now - t >= -60_000 && now - t < MOI_NHAP_PHUT * 60_000;
}

/** Nhập cách đây bao nhiêu phút (để ghi trên nhãn "mới · 12'"). */
export function phutTruoc(b: Row, now = Date.now()): number {
  return Math.max(0, Math.floor((now - createdMs(b)) / 60_000));
}

/** So sánh theo kiểu xếp đã chọn; hoà thì theo số thứ tự cho ổn định. */
export function soBooking(sort: BookingSort) {
  return (a: Row, b: Row): number => {
    if (sort === "newest") {
      const d = createdMs(b) - createdMs(a);
      if (d) return d;
    }
    if (sort === "flown") {
      const d = Number(b.status === "done") - Number(a.status === "done");
      if (d) return d;
    }
    if (sort === "ticket") {
      const d = Number(Boolean(b.ticketIssued)) - Number(Boolean(a.ticketIssued));
      if (d) return d;
      // Cùng đã xuất vé thì xếp theo GIỜ XUẤT (= thứ tự khách đến) — luật chủ 04/09
      const ta = a.ticketIssuedAt ? Date.parse(a.ticketIssuedAt) : Number.MAX_SAFE_INTEGER;
      const tb = b.ticketIssuedAt ? Date.parse(b.ticketIssuedAt) : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
    }
    return (a.daySeq || 0) - (b.daySeq || 0);
  };
}

/**
 * Xếp danh sách: những dòng `ghim` lên ĐẦU (mới nhập nhất trên cùng), phần còn
 * lại theo kiểu đã chọn. Trả mảng mới.
 */
export function xepBooking<T extends Row>(rows: T[], sort: BookingSort, ghim: (b: T) => boolean): T[] {
  const cmp = soBooking(sort);
  return [...rows].sort((a, b) => {
    const ga = ghim(a);
    const gb = ghim(b);
    if (ga !== gb) return ga ? -1 : 1;
    if (ga && gb) return createdMs(b) - createdMs(a) || (a.daySeq || 0) - (b.daySeq || 0);
    return cmp(a, b);
  });
}

/** Đọc kiểu xếp đã nhớ trên máy — máy chặn localStorage thì về mặc định. */
export function docKieuXep(): BookingSort {
  try {
    const v = localStorage.getItem(BOOKING_SORT_KEY) as BookingSort | null;
    return v && BOOKING_SORTS.includes(v) ? v : "seq";
  } catch {
    return "seq";
  }
}

export function luuKieuXep(v: BookingSort): void {
  try {
    localStorage.setItem(BOOKING_SORT_KEY, v);
  } catch {
    /* không lưu được thì thôi — lần sau về mặc định */
  }
}
