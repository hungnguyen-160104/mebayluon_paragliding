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
  /**
   * DÒNG NHỎ DƯỚI TÊN CỘT — đơn giá đang áp của dịch vụ đó ("300k").
   *
   * Người gõ sổ phải biết mỗi suất flycam/360/cờ đỏ bao nhiêu tiền mới soát
   * được ô TỔNG THU, mà giá thì mỗi điểm một khác và có lúc đổi (dù cờ đỏ lên
   * 400k ngày 26/08). Ghi ngay dưới tên cột thì khỏi phải nhớ, và khỏi mở bảng
   * giá ra tra giữa lúc đang nhập.
   */
  hint?: string;
  ketToan?: boolean;
  /** Ô GỘP THEO NGÀY trên bảng tính — không thuộc về một khách nào. */
  theoNgay?: boolean;
  title?: string;
  /**
   * MÀU NỀN — chép đúng từ tab T9-2026 của bảng Google (đọc mã màu trong
   * xl/styles.xml của tệp .xlsx, không đoán): `bg` cho ô tiêu đề, `bgCell` cho
   * ô dữ liệu. Nhân viên đã quen mắt "ô xanh ngọc là máy tính, ô vàng là mình
   * gõ, ô xanh lá là cọc" — giữ đúng thì nhìn app như nhìn bảng cũ.
   */
  bg?: string;
  bgCell?: string;
};

/**
 * Bảng màu của sổ tay Sa Pa — CÙNG TÔNG với tệp .xlsx nhưng PHA NHẠT đi.
 *
 * Bảng tính gốc dùng màu nguyên (#FFFF00, #00FFFF, #FF0000): trên giấy và ở
 * vài cột thì được, nhưng ba mươi cột nhìn cả ngày trên màn hình là chói mắt,
 * chữ đen trên xanh ngọc đậm đọc mệt. Giữ đúng sắc (vàng vẫn vàng, ngọc vẫn
 * ngọc) để ai quen sổ cũ vẫn nhận ra cột, chỉ pha trắng vào cho dịu.
 * Mã gốc ghi cạnh để đối chiếu.
 */
export const MAU = {
  nhanDang: "#E3EEF9", // gốc #CFE2F3 — xanh nhạt: nhóm nhận ra khách, chiết khấu, ghi chú
  vang: "#FFF7B3", //     gốc #FFFF00 — đơn giá, số suất dịch vụ, phụ thu (tiêu đề) · Tháng/Ngày (dữ liệu)
  vangNhat: "#FFF3CC", // gốc #FFE599 — ô số suất flycam / 360 (dữ liệu)
  ngoc: "#CFF6F6", //     gốc #00FFFF — Thành tiền, TỔNG THU — máy tính
  la: "#E7F3E2", //       gốc #D9EAD3 — ĐẶT CỌC
  cam: "#FDF0E1", //      gốc #FCE5CD — NGƯỜI NHẬN TIỀN
  xam: "#F3F3F3", //      gốc #EFEFEF — POS
  do: "#F6C9C9", //       gốc #FF0000 — Chi TM / Chi CK (tiêu đề)
} as const;

export type SheetDest = { id: string; label: string };

/** Ba cột đầu ai cũng có. `thang` chỉ bật ở lưới cả tháng. */
const DAU = (thang: boolean): SheetCol[] => [
  ...(thang ? [{ key: "monthLabel", label: "Tháng", kind: "text" as const, w: 44 }] : []),
  { key: "daySeq", label: "STT", kind: "num", w: 34, right: true, title: "Số thứ tự khách trong ngày — máy cấp, không sửa" },
  { key: "flightDate", label: "Ngày", kind: "text", w: 50, title: "Ngày bay — dời lịch bằng nút Dời ở cột thao tác" },
];

/**
 * Cột riêng của app, xếp cuối — bảng tính không có nhưng sổ booking cần.
 *
 * Cột T.THÁI CHỈ CÓ Ở LƯỚI THÁNG: bên đó không có cột thao tác nên ô chọn
 * chờ bay / đã bay / đã huỷ là cách duy nhất đổi trạng thái. Sổ ngày thì đã có
 * nút Đã bay · Huỷ ở cột thao tác, còn trạng thái hiện thành nhãn ngay trong ô
 * mã booking ("⏳ chờ bay", "✈ đã bay by …") — thêm một cột nữa là nói hai lần
 * cùng một điều, tốn 70px cho mỗi dòng.
 */
const CUOI = (thang: boolean): SheetCol[] => [
  { key: "phone", label: "SĐT", edit: "phone", kind: "text", w: 88, g1: "SỔ BOOKING" },
  { key: "pickupNote", label: "Điểm đón", edit: "pickupNote", kind: "text", w: 120, wrap: true },
  ...(thang
    ? [{ key: "status", label: "T.thái", edit: "status", kind: "status" as const, w: 70, title: "Trạng thái: chờ bay / đã bay / đã huỷ" }]
    : []),
  { key: "note", label: "Ghi chú", edit: "note", kind: "text", w: 150, wrap: true },
  { key: "contactNote", label: "Điều phối Liên hệ", edit: "contactNote", kind: "text", w: 130, wrap: true, title: "Điều phối ghi lại khi liên hệ khách" },
];

/** BỐ CỤC SA PA — bám đúng tab tháng, kể cả những cột app để trống. */
function cotSapa(dests: SheetDest[], thang: boolean, keToan: boolean): SheetCol[] {
  const G2 = ["TÀI KHOẢN", "TIỀN MẶT", "", "", "POS"];
  return [
    ...DAU(thang),
    /**
     * Cột nguồn BÓP SÁT nội dung thật: "Klook", "web", "GYG", "kkday", "lẻ",
     * "Huy TN" — dài nhất cũng chỉ trên dưới 60px. Chừa 104px là chừa cho một
     * cái tên đại lý dài mà cả tháng mới gặp một lần, còn ba mươi cột kia thì
     * ngày nào cũng phải cuộn thêm.
     */
    { key: "source", label: "Code ĐL/lẻ", edit: "source", kind: "text", w: 76, wrap: true, title: "Code đại lý or lẻ" },
    { key: "bookingCode", label: "Số book", edit: "bookingCode", kind: "text", w: 108, title: "Số booking — nút 📄 mở bảng kê chi tiết" },
    { key: "guestNames", label: "TÊN ĐĂNG KÝ", edit: "guestNames", kind: "names", w: 160, wrap: true, title: "Mỗi khách một dòng" },
    { key: "guestCount", label: "SL", edit: "guestCount", kind: "num", w: 34, right: true, title: "SL MCC — số khách" },
    /**
     * GIỜ BAY đứng ngay cạnh thông tin khách, không nằm tít cuối sau ba mươi
     * cột tiền. Điều phối xếp lịch cả ngày phải liếc được giờ cùng lúc với tên
     * và số người — cuộn sang phải rồi cuộn về là mất mạch.
     */
    { key: "expectedTime", label: "Giờ bay", edit: "expectedTime", kind: "time", w: 52, title: "Giờ khách muốn bay (Sa Pa: cũng là giờ hẹn đón)" },

    { key: "unitPrice", label: "Đơn giá", edit: "unitPrice", kind: "money", w: 78, right: true, g1: "THÔNG TIN VÉ" },
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: 82, right: true, g1: "THÔNG TIN VÉ" },
    { key: "flycam", label: "Fly", edit: "flycam", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Flycam — số suất" },
    /**
     * Có TÊN, dù trên bảng Google ô này trống (tiêu đề "Flycam" bị gộp trùm hai
     * cột). Bắt chước cái trống đó lên app là một cột không ai biết là gì.
     */
    { key: "flycamMoney", label: "Tiền fly", kind: "money", w: 68, right: true, g1: "THÔNG TIN VÉ", title: "Tiền flycam — máy tính" },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Camera 360 — số suất" },
    { key: "video360Money", label: "Tiền 360", kind: "money", w: 68, right: true, g1: "THÔNG TIN VÉ", title: "Tiền cam 360 — máy tính" },
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

    ...CUOI(thang),
  ];
}

/** Khau Phạ và Hà Nội: cùng lối bày, nhưng bộ dịch vụ của chính điểm đó. */
function cotDiemKhac(spot: string, dests: SheetDest[], thang: boolean): SheetCol[] {
  const kp = spot === "khau-pha";
  const hn = spot === "ha-noi";
  return [
    ...DAU(thang),
    /** Bóp sát nội dung thật (Klook · web · GYG · Zalo…); tên dài thì xuống dòng. */
    { key: "source", label: "Nguồn", edit: "source", kind: "text", w: 76, wrap: true },
    { key: "bookingCode", label: "Mã book", edit: "bookingCode", kind: "text", w: 104, title: "Mã booking — nút 📄 mở bảng kê chi tiết" },
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
    /** Giờ bay đứng cạnh thông tin khách — xem chú thích ở bố cục Sa Pa. */
    { key: "expectedTime", label: "Giờ bay", edit: "expectedTime", kind: "time", w: 52, title: "Giờ khách muốn bay" },

    /**
     * KHAU PHẠ: ĐƠN GIÁ PG VÀ PPG LÀ HAI Ô RIÊNG, vì hai loại khác giá nhau và
     * bán chung một booking. Gộp một ô thì không biết con số đang là giá của
     * loại nào — mà nhầm chỗ này là sai tiền cả đoàn.
     *
     * Ô PPG chỉ có nghĩa với booking CÓ khách PPG; dòng không có thì lưới để
     * mờ và không cho gõ (xem `chiKhiCo` bên BookingSheet).
     */
    { key: "unitPrice", label: kp ? "Giá PG" : "Đơn giá", edit: "unitPrice", kind: "money", w: 78, right: true, g1: "THÔNG TIN VÉ" },
    ...(kp
      ? ([
          {
            key: "ppgUnitPrice",
            label: "Giá PPG",
            edit: "ppgUnitPrice",
            kind: "money",
            w: 78,
            right: true,
            g1: "THÔNG TIN VÉ",
            title: "Đơn giá riêng phần khách PPG — để trống là theo bảng giá",
          },
        ] as SheetCol[])
      : []),
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: 82, right: true, g1: "THÔNG TIN VÉ" },
    { key: "flycam", label: "Fly", edit: "flycam", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Flycam" },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: 32, right: true, g1: "THÔNG TIN VÉ", title: "Camera 360" },
    /** "C.đỏ" và "K.cờ" — hai chữ đầu đủ để phân biệt mà vẫn vừa cột 38px (chủ 11/09). */
    { key: "redFlag", label: "C.đỏ", edit: "redFlag", kind: "num", w: 38, right: true, g1: "THÔNG TIN VÉ", title: "Dù cờ đỏ" },
    { key: "sunset", label: "H.hôn", edit: "sunset", kind: "num", w: 42, right: true, g1: "THÔNG TIN VÉ", title: "Bay hoàng hôn / săn mây" },
    { key: "flagFlight", label: "K.cờ", edit: "flagFlight", kind: "num", w: 38, right: true, g1: "THÔNG TIN VÉ", title: "Bay kéo cờ đỏ / cờ sinh nhật" },
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

    ...CUOI(thang),
  ];
}

export function sheetColumns(
  spot: string,
  dests: SheetDest[] = [],
  opts: { thang?: boolean; keToan?: boolean; gia?: Partial<Record<string, number>> } = {},
): SheetCol[] {
  const id = normalizeSpot(spot);
  const thang = opts.thang ?? false;
  const cols = toMau(id === "sapa" ? cotSapa(dests, thang, opts.keToan ?? false) : cotDiemKhac(id, dests, thang));
  /** Gắn đơn giá đang áp vào dòng nhỏ dưới tên cột dịch vụ. */
  const gia = opts.gia;
  if (!gia) return cols;
  const k = (n?: number) => (n ? `${Math.round(n / 1000).toLocaleString("vi-VN")}k` : undefined);
  return cols.map((c) => {
    const g = k(gia[c.key]);
    return g ? { ...c, hint: g } : c;
  });
}

/**
 * Điểm đón viết gọn — hàm nằm ở `lib/baobay/pickup.ts`, xuất lại ở đây cho
 * những chỗ đang nhập từ tệp này khỏi phải sửa đường dẫn.
 */
export { shortPickup, shortPickupSo } from "./pickup";

/**
 * TÔ MÀU theo VAI của cột — cùng một bảng màu cho mọi điểm, vì màu nói "cột này
 * là gì" chứ không nói "đây là Sa Pa". Ánh xạ đúng từng ô của T9-2026:
 *   A–G nhận dạng: tiêu đề xanh nhạt; Tháng & Ngày dữ liệu VÀNG
 *   H Đơn giá · J/L số suất · N Phụ thu: tiêu đề vàng; số suất dữ liệu vàng nhạt
 *   I Thành tiền · O TỔNG THU: xanh ngọc cả tiêu đề lẫn dữ liệu
 *   P ĐẶT CỌC: xanh lá cả hai · Q–W người nhận tiền: tiêu đề cam (POS xám cả hai)
 *   X–AA, AE–AF: tiêu đề xanh nhạt · AB/AC Chi TM/CK: tiêu đề ĐỎ
 */
function toMau(cols: SheetCol[]): SheetCol[] {
  const nhanDang = new Set(["monthLabel", "daySeq", "flightDate", "source", "bookingCode", "guestNames", "guestCount", "pgGuests", "ppgGuests", "expectedTime"]);
  const vang = new Set(["unitPrice", "ppgUnitPrice", "flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar", "extraFee", "pickupFee", "discount"]);
  const suat = new Set(["flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"]);
  const ngoc = new Set(["lineAmount", "total", "paid", "remaining", "flycamMoney", "video360Money"]);
  const xanhNhat = new Set(["commission", "xeKhach", "chiFlycam", "chiKhac", "hinhThucTT", "nguoiThuTM", "phone", "pickupNote", "status", "note", "contactNote"]);
  return cols.map((c) => {
    if (c.key === "monthLabel" || c.key === "flightDate") return { ...c, bg: MAU.nhanDang, bgCell: MAU.vang };
    if (nhanDang.has(c.key)) return { ...c, bg: MAU.nhanDang };
    if (suat.has(c.key)) return { ...c, bg: MAU.vang, bgCell: MAU.vangNhat };
    if (vang.has(c.key)) return { ...c, bg: MAU.vang };
    if (ngoc.has(c.key)) return { ...c, bg: MAU.ngoc, bgCell: MAU.ngoc };
    if (c.key === "deposit") return { ...c, bg: MAU.la, bgCell: MAU.la };
    if (c.key === "dest:pos") return { ...c, bg: MAU.xam, bgCell: MAU.xam };
    if (c.key.startsWith("dest:") || c.key === "usd" || c.key === "tkCty2") return { ...c, bg: MAU.cam };
    if (c.key === "chiTM" || c.key === "chiCK") return { ...c, bg: MAU.do };
    if (xanhNhat.has(c.key)) return { ...c, bg: MAU.nhanDang };
    return c;
  });
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
