// lib/baobay/sheet-columns.ts
/**
 * BỐ CỤC CỘT CỦA LƯỚI KIỂU BẢNG TÍNH — khai một nơi, hai lưới cùng dùng
 * (sổ booking hằng ngày ▤ Sheet, và lưới cả tháng của Sa Pa).
 *
 * Riêng SA PA dựng lại ĐÚNG tab tháng của bảng "Bảng theo dõi chuyến bay"
 * (đọc thẳng từ tệp .xlsx của bảng, tab T9-2026), kể cả hai hàng tiêu đề gộp ô
 * và những cột app chưa quản:
 *
 *   A Tháng · B Ghi chú(STT) · C Ngày bay · D Code đại lý or lẻ · E Số booking
 *   F TÊN ĐĂNG KÝ · G SL MCC
 *   ├ THÔNG TIN VÉ ────┤ H Đơn giá · I Thành tiền · J Flycam · K (tiền)
 *                        L 360 · M (tiền) · N Phụ thu khác · O TỔNG THU
 *   ├ CỌC VÀ CK ───────┤ P ĐẶT CỌC
 *   ├ NGƯỜI NHẬN TIỀN ─┤ Q TK Trường(TÀI KHOẢN) · R TM c Yến(TIỀN MẶT)
 *                        S NGOẠI TỆ · T TK Cty · U POS(POS) · V USD(PAYPAL) · W TK CTY
 *   ├ CHI KHOẢN PHỤ ───┤ X Chiết khấu đại lý · Y Tiền xe · Z Chi Flycam
 *                        AA Chi khác · AB Chi TM · AC Chi CK
 *   AD (phi công bay) · AE Hình thức t/t · AF Người thu TM
 *
 * ĐÓNG BĂNG 7 CỘT ĐẦU — không phải con số tự nghĩ ra: chính bảng khai
 * `<pane xSplit="7" ySplit="4" state="frozen"/>`. Bảy cột ấy là phần NHẬN RA
 * KHÁCH (ngày, số thứ tự, nguồn, mã book, tên, số người); cuộn sang phải xem
 * tiền mà mất chúng thì không biết đang nhìn dòng của ai.
 *
 * Vì sao bám sát đến từng cột: người đang giữ sổ đã quen mắt thứ tự ấy suốt
 * nhiều tháng. Đổi bố cục là bắt họ học lại, mà học lại thì họ quay về gõ bảng
 * tính cho nhanh — và ta lại có hai sổ như cũ.
 *
 * TÊN CỘT VIẾT TẮT, BỀ NGANG BÓP SÁT: một ngày đông là hơn ba mươi cột, mỗi
 * cột thừa 20px là phải cuộn thêm một màn hình. Chữ đầy đủ nằm ở `title` (rê
 * chuột vào tiêu đề là hiện).
 */

import { normalizeSpot } from "@/lib/baobay/spots";

export type SheetColKind = "text" | "num" | "money" | "time" | "status" | "names";

export type SheetCol = {
  /** Khoá đọc giá trị khỏi dòng — mỗi lưới tự biết cách đọc. */
  key: string;
  /** Tên cột ở hàng tiêu đề CUỐI (hàng 3 trên bảng tính). */
  label: string;
  /** Nhóm hàng 1 ("THÔNG TIN VÉ", "NGƯỜI NHẬN TIỀN"…). */
  g1?: string;
  /** Nhóm hàng 2 ("TÀI KHOẢN", "TIỀN MẶT", "POS", "PAYPAL"). */
  g2?: string;
  /** Có tên trường thì ô SỬA ĐƯỢC; không thì máy tính hoặc chỉ để đối chiếu. */
  edit?: string;
  kind: SheetColKind;
  /** Bề ngang px — cố định để cột không nhảy mỗi lần gõ. */
  w: number;
  right?: boolean;
  strong?: boolean;
  /** Cho chữ XUỐNG DÒNG trong ô thay vì cắt cụt — ghi chú, tên đoàn. */
  wrap?: boolean;
  /**
   * CỘT CỦA KẾ TOÁN bên bảng tính mà app CHƯA quản (tiền xe, chi flycam, chi
   * khác, chi TM/CK, phi công bay…). Vẽ ra cho bố cục khớp và để còn đối
   * chiếu, nhưng ĐỂ TRỐNG chứ không bịa số: một con số không có nguồn thì tệ
   * hơn một ô trống.
   */
  ketToan?: boolean;
  /** Ô GỘP THEO NGÀY trên bảng tính — không thuộc về một khách nào. */
  theoNgay?: boolean;
  title?: string;
};

export type SheetDest = { id: string; label: string };

/** Ba cột đầu ai cũng có. `thang` chỉ bật ở lưới cả tháng. */
const DAU = (thang: boolean): SheetCol[] => [
  ...(thang ? [{ key: "monthLabel", label: "Tháng", kind: "text" as const, w: 44 }] : []),
  { key: "daySeq", label: "STT", kind: "num", w: 34, right: true, title: "Số thứ tự khách trong ngày — máy cấp, không sửa" },
  { key: "flightDate", label: "Ngày", kind: "text", w: 50, title: "Ngày bay — dời lịch bằng nút Dời ở cột thao tác" },
];

/** Cột riêng của app, xếp cuối — bảng tính không có nhưng sổ booking cần. */
const CUOI: SheetCol[] = [
  { key: "phone", label: "SĐT", edit: "phone", kind: "text", w: 88, g1: "SỔ BOOKING" },
  { key: "pickupNote", label: "Điểm đón", edit: "pickupNote", kind: "text", w: 120, wrap: true },
  { key: "expectedTime", label: "Giờ", edit: "expectedTime", kind: "time", w: 44, title: "Giờ đón" },
  { key: "status", label: "T.thái", edit: "status", kind: "status", w: 70, title: "Trạng thái: chờ bay / đã bay / đã huỷ" },
  { key: "note", label: "Ghi chú", edit: "note", kind: "text", w: 150, wrap: true },
  { key: "contactNote", label: "GC gọi", edit: "contactNote", kind: "text", w: 130, wrap: true, title: "Ghi chú gọi khách" },
];

/** BỐ CỤC SA PA — bám đúng tab tháng, kể cả những cột app để trống. */
function cotSapa(dests: SheetDest[], thang: boolean, keToan: boolean): SheetCol[] {
  const G2 = ["TÀI KHOẢN", "TIỀN MẶT", "", "", "POS"];
  return [
    ...DAU(thang),
    { key: "source", label: "Code ĐL/lẻ", edit: "source", kind: "text", w: 104, title: "Code đại lý or lẻ" },
    { key: "bookingCode", label: "Số book", edit: "bookingCode", kind: "text", w: 88, title: "Số booking" },
    { key: "guestNames", label: "TÊN ĐĂNG KÝ", edit: "guestNames", kind: "names", w: 160, wrap: true, title: "Mỗi khách một dòng" },
    { key: "guestCount", label: "SL", edit: "guestCount", kind: "num", w: 34, right: true, title: "SL MCC — số khách" },

    { key: "unitPrice", label: "Đơn giá", edit: "unitPrice", kind: "money", w: 78, right: true, g1: "THÔNG TIN VÉ" },
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: 82, right: true, g1: "THÔNG TIN VÉ" },
    { key: "flycam", label: "Fly", edit: "flycam", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Flycam — số suất" },
    { key: "flycamMoney", label: "", kind: "money", w: 68, right: true, g1: "THÔNG TIN VÉ", title: "Tiền flycam — máy tính" },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Camera 360 — số suất" },
    { key: "video360Money", label: "", kind: "money", w: 68, right: true, g1: "THÔNG TIN VÉ", title: "Tiền cam 360 — máy tính" },
    { key: "extraFee", label: "Phụ thu", edit: "extraFee", kind: "money", w: 78, right: true, g1: "THÔNG TIN VÉ", title: "Phụ thu khác — gõ số ÂM nghĩa là giảm giá, đúng nếp sổ tay" },
    { key: "total", label: "TỔNG THU", kind: "money", w: 92, right: true, strong: true, g1: "THÔNG TIN VÉ" },

    { key: "deposit", label: "ĐẶT CỌC", edit: "deposit", kind: "money", w: 78, right: true, g1: "CỌC VÀ CK" },

    ...dests.map(
      (d, i): SheetCol => ({
        key: `dest:${d.id}`,
        label: d.label,
        kind: "money",
        w: 84,
        right: true,
        g1: "NGƯỜI NHẬN TIỀN",
        g2: G2[i] || "",
        title: `${d.label} — cộng từ các khoản đã thu; sửa ở nút Thu tiền, không gõ đè lên tổng`,
      }),
    ),
    { key: "usd", label: "USD", kind: "money", w: 72, right: true, g1: "NGƯỜI NHẬN TIỀN", g2: "PAYPAL", title: "Quy đổi từ POS (÷ 1,08) — đúng công thức trên bảng" },
    { key: "tkCty2", label: "TK CTY", kind: "money", w: 72, right: true, g1: "NGƯỜI NHẬN TIỀN", ketToan: true },

    { key: "commission", label: "C.khấu ĐL", edit: "commission", kind: "money", w: 78, right: true, g1: "CHI KHOẢN PHỤ", title: "Chiết khấu đại lý" },
    ...(keToan
      ? ([
          { key: "xeKhach", label: "Tiền xe", kind: "money", w: 78, right: true, g1: "CHI KHOẢN PHỤ", ketToan: true, title: "Tiền xe cho khách — cột của kế toán, app chưa quản" },
          { key: "chiFlycam", label: "Chi Fly", kind: "money", w: 72, right: true, g1: "CHI KHOẢN PHỤ", ketToan: true, title: "Chi Flycam — cột của kế toán, app chưa quản" },
          { key: "chiKhac", label: "Chi khác", kind: "money", w: 78, right: true, g1: "CHI KHOẢN PHỤ", ketToan: true },
          { key: "chiTM", label: "Chi TM", kind: "text", w: 120, wrap: true, g1: "CHI KHOẢN PHỤ", ketToan: true, theoNgay: true, title: "Ô gộp theo NGÀY trên bảng — không thuộc về một khách nào" },
          { key: "chiCK", label: "Chi CK", kind: "text", w: 120, wrap: true, g1: "CHI KHOẢN PHỤ", ketToan: true, theoNgay: true, title: "Ô gộp theo NGÀY trên bảng" },
          { key: "phiCongBay", label: "PC bay", kind: "text", w: 130, wrap: true, g1: "phi công bay", ketToan: true, theoNgay: true, title: "Phi công bay — ô gộp theo NGÀY trên bảng" },
          { key: "hinhThucTT", label: "HT t/t", kind: "text", w: 76, g1: "GHI CHÚ CŨ", ketToan: true, title: "Hình thức thanh toán" },
          { key: "nguoiThuTM", label: "Thu TM", kind: "text", w: 76, g1: "GHI CHÚ CŨ", ketToan: true, title: "Người thu tiền mặt" },
        ] as SheetCol[])
      : []),

    ...CUOI,
  ];
}

/** Khau Phạ và Hà Nội: cùng lối bày, nhưng bộ dịch vụ của chính điểm đó. */
function cotDiemKhac(spot: string, dests: SheetDest[], thang: boolean): SheetCol[] {
  const kp = spot === "khau-pha";
  const hn = spot === "ha-noi";
  return [
    ...DAU(thang),
    { key: "source", label: "Nguồn", edit: "source", kind: "text", w: 92 },
    { key: "bookingCode", label: "Mã book", edit: "bookingCode", kind: "text", w: 84 },
    { key: "guestNames", label: "Tên khách", edit: "guestNames", kind: "names", w: 150, wrap: true, title: "Mỗi khách một dòng" },
    /**
     * KHAU PHẠ hỏi PG và PPG như form vẫn hỏi, còn TỔNG thì máy cộng.
     * "3 PG + 1 PPG" là cách người ta nói; "tổng 4, trong đó PPG 1" phải tính
     * nhẩm mới ra, và tính nhẩm trên sổ tiền là chỗ sinh sai.
     */
    ...(kp
      ? ([
          { key: "pgGuests", label: "PG", edit: "pgGuests", kind: "num", w: 32, right: true, title: "Khách bay dù lượn thường (PG)" },
          { key: "ppgGuests", label: "PPG", edit: "ppgGuests", kind: "num", w: 34, right: true, title: "Khách bay dù lượn có động cơ (PPG)" },
          { key: "guestCount", label: "SL", kind: "num", w: 32, right: true, title: "Tổng khách — máy cộng PG + PPG" },
        ] as SheetCol[])
      : ([{ key: "guestCount", label: "SL", edit: "guestCount", kind: "num", w: 34, right: true, title: "Số khách" }] as SheetCol[])),

    { key: "unitPrice", label: "Đơn giá", edit: "unitPrice", kind: "money", w: 78, right: true, g1: "THÔNG TIN VÉ" },
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: 82, right: true, g1: "THÔNG TIN VÉ" },
    { key: "flycam", label: "Fly", edit: "flycam", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Flycam" },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Camera 360" },
    { key: "redFlag", label: "Đỏ", edit: "redFlag", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Dù cờ đỏ" },
    { key: "sunset", label: "H.hôn", edit: "sunset", kind: "num", w: 42, right: true, g1: "THÔNG TIN VÉ", title: "Bay hoàng hôn / săn mây" },
    { key: "flagFlight", label: "Cờ", edit: "flagFlight", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Bay kéo cờ / bánh" },
    ...(hn ? ([{ key: "mountainCar", label: "Xe", edit: "mountainCar", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Xe lên núi" }] as SheetCol[]) : []),
    { key: "pickupFee", label: "Phí đón", edit: "pickupFee", kind: "money", w: 68, right: true, g1: "THÔNG TIN VÉ" },
    { key: "discount", label: "Giảm", edit: "discount", kind: "money", w: 64, right: true, g1: "THÔNG TIN VÉ", title: "Giảm trừ / chiết khấu cả đoàn" },
    { key: "total", label: "TỔNG", kind: "money", w: 88, right: true, strong: true, g1: "THÔNG TIN VÉ" },

    { key: "deposit", label: "Cọc", edit: "deposit", kind: "money", w: 74, right: true, g1: "CỌC VÀ THU" },
    ...dests.map(
      (d): SheetCol => ({ key: `dest:${d.id}`, label: d.label, kind: "money", w: 84, right: true, g1: "NGƯỜI NHẬN TIỀN" }),
    ),
    { key: "paid", label: "Đã thu", kind: "money", w: 78, right: true, g1: "CỌC VÀ THU" },
    { key: "remaining", label: "Còn thu", kind: "money", w: 78, right: true, g1: "CỌC VÀ THU" },
    { key: "commission", label: "C.khấu", edit: "commission", kind: "money", w: 72, right: true, g1: "CỌC VÀ THU", title: "Chiết khấu đại lý" },

    ...CUOI,
  ];
}

export function sheetColumns(
  spot: string,
  dests: SheetDest[] = [],
  opts: { thang?: boolean; keToan?: boolean } = {},
): SheetCol[] {
  const id = normalizeSpot(spot);
  const thang = opts.thang ?? false;
  return id === "sapa" ? cotSapa(dests, thang, opts.keToan ?? false) : cotDiemKhac(id, dests, thang);
}

/**
 * SỐ CỘT ĐÓNG BĂNG bên trái — hết cột "số khách" thì thôi.
 *
 * Đúng bằng `xSplit="7"` của bảng tính khi lưới có cột Tháng; lưới một ngày
 * không cần cột Tháng nên còn 6. Tính theo TÊN CỘT chứ không đếm cứng: thêm
 * bớt một cột ở đầu là con số đếm cứng lệch ngay, mà lệch thì cột đóng băng
 * đè lên cột cuộn và chữ chồng lên nhau.
 */
export function frozenCount(cols: SheetCol[]): number {
  const i = cols.findIndex((c) => c.key === "guestCount");
  return i >= 0 ? i + 1 : Math.min(4, cols.length);
}

/** Mép trái (px) của từng cột — để dán cột đóng băng đúng chỗ. */
export function frozenOffsets(cols: SheetCol[], count: number): number[] {
  const out: number[] = [];
  let x = 0;
  for (let i = 0; i < count && i < cols.length; i++) {
    out.push(x);
    x += cols[i].w;
  }
  return out;
}

/**
 * Gộp cột liền nhau CÙNG nhóm thành các ô tiêu đề trải ngang.
 * Trả về từng ô: nhãn (rỗng = ô đệm), số cột nó trùm, và chỉ số cột bắt đầu.
 */
export function groupSpans(cols: SheetCol[], level: 1 | 2): Array<{ label: string; span: number; from: number }> {
  const out: Array<{ label: string; span: number; from: number }> = [];
  cols.forEach((c, i) => {
    const label = (level === 1 ? c.g1 : c.g2) ?? "";
    const last = out[out.length - 1];
    if (last && last.label === label) last.span += 1;
    else out.push({ label, span: 1, from: i });
  });
  return out;
}
