// lib/baobay/validation.ts
/**
 * Kiểm dữ liệu báo bay ở máy chủ. Trình duyệt cũng kiểm để hiện lỗi ngay,
 * nhưng đây mới là chỗ tính thật — số lượng vé từ dải mã, số vé huỷ, số vé dời
 * lịch đều được tính LẠI từ chuỗi mã, không tin con số client gửi lên.
 */

import { z } from "zod";

import { isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { isSpotId } from "@/lib/baobay/spots";

/** Số đếm: nguyên, không âm, có trần để một lần gõ nhầm không thành 99999 chuyến. */
const count = (max: number) =>
  z.coerce.number().int("Phải là số nguyên").min(0, "Không được âm").max(max, `Không vượt quá ${max}`);

/** Tiền VND: nguyên, không âm. Trần 10 tỉ/ngày cho một người là quá đủ. */
const money = z.coerce
  .number()
  .int("Số tiền phải là số nguyên (đồng)")
  .min(0, "Không được âm")
  .max(10_000_000_000, "Số tiền quá lớn");

const text = (max: number) => z.string().trim().max(max).optional().default("");

/**
 * Ngày báo cáo: không được ở tương lai (chưa bay sao báo) và không quá 60 ngày
 * trước (gõ nhầm năm thành 2025 thì báo lỗi thay vì lặng lẽ tạo bản ghi lạc).
 * Muốn sửa số của kỳ cũ hơn thì kế toán sửa thẳng trên bảng.
 */
export const BACKDATE_LIMIT_DAYS = 60;

/**
 * PHI CÔNG chỉ tự tra cứu được dữ liệu trong 45 ngày gần nhất — bảng kê, tổng
 * chu kỳ, xem lại báo cáo cũ. Kế toán và quản trị xem không giới hạn. Đây là
 * quyền khoá dữ liệu của kế toán: quá 45 ngày, số liệu chỉ còn phục vụ đối
 * soát nội bộ, không phải để nhân sự tự soát lại.
 */
export const PILOT_VIEW_LIMIT_DAYS = 45;

/** Điểm bay của báo cáo — bắt buộc, và máy chủ còn kiểm người này có được chỉ định điểm đó không. */
const spotField = z.string().refine(isSpotId, "Điểm bay không hợp lệ");

const reportDate = z
  .string()
  .refine(isDateKey, "Ngày không hợp lệ (cần dạng YYYY-MM-DD)")
  .superRefine((value, ctx) => {
    const today = todayInVN();
    if (value > today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Không báo cáo cho ngày ở tương lai" });
      return;
    }
    if (value < shiftDateKey(today, -BACKDATE_LIMIT_DAYS)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ngày quá cũ (chỉ nhập trong ${BACKDATE_LIMIT_DAYS} ngày gần đây)`,
      });
    }
  });

/** Một dải mã vé đã xuất. `count` do máy chủ tính lại, client gửi gì cũng bỏ. */
const rangeInput = z.object({
  from: text(50),
  to: text(50),
});

/**
 * Vé dời lịch: mã cũ + ngày dời tới.
 *
 * Ngày dời tới KHÔNG dùng `reportDate`: nó ở tương lai so với ngày báo cáo, còn
 * reportDate cấm ngày tương lai. Chỉ cần đúng dạng, còn "phải sau ngày báo cáo"
 * do bộ đối chiếu kiểm (lib/baobay/reconcile.ts) để báo lỗi kèm ngữ cảnh.
 */
const rescheduledInput = z.object({
  code: z.string().trim().max(50),
  toDate: z.string().refine((v) => v === "" || isDateKey(v), "Ngày dời tới không hợp lệ"),
  note: text(500),
});

/** Một dòng thu/chi: nội dung – số tiền – thu/chi – ghi chú. */
const expenseInput = z.object({
  content: z.string().trim().max(200),
  amount: money,
  kind: z.enum(["thu", "chi"]).optional().default("chi"),
  method: z.enum(["cash", "transfer"]).optional(),
  note: text(500),
});

/** HÀ NỘI: nhóm KHÁCH huỷ hoàn tiền — tên, mã book, số khách, nguồn, tiền hoàn, ghi chú. */
const cancelledGuestList = z
  .array(
    z.object({
      name: text(200),
      bookingCode: text(100),
      guests: count(100),
      source: text(200),
      refund: money,
      note: text(500),
      /** Điểm có vé: mã vé của nhóm (nhiều mã một ô). */
      codesText: text(2_000),
      /** Huỷ khi CHƯA XUẤT VÉ — nhóm này không có mã vé để thu hồi. */
      noTicket: z.boolean().optional().default(false),
      /**
       * Tiền khách đã thanh toán trước đó. Bản ghi CŨ không có trường này, mà
       * `money` là z.coerce nên undefined thành NaN rồi gãy cả form — phải cho
       * phép trống và mặc định 0.
       */
      paid: money.optional().default(0),
      /** Hoàn bằng gì: CK là tiền ra từ TK công ty · TM là nhân viên chi tại chỗ. */
      refundMethod: z.enum(["cash", "transfer"]).optional().default("transfer"),
    }),
  )
  .max(200)
  .default([]);

/** HÀ NỘI: nhóm KHÁCH dời lịch — tên, số lượng, ngày dời, ghi chú. */
const rescheduledGuestList = z
  .array(
    z.object({
      name: text(200),
      guests: count(100),
      toDate: z.string().refine((v) => v === "" || isDateKey(v), "Ngày dời tới không hợp lệ"),
      note: text(500),
      phone: text(50),
      pickup: z.enum(["self", "other"]).optional().default("self"),
      pickupNote: text(200),
      expectedTime: text(20),
      codesText: text(2_000),
      /** id booking đã đẩy vào lịch ngày dời — giữ để không đẩy trùng. */
      bookedId: text(50),
    }),
  )
  .max(200)
  .default([]);

/** Vé huỷ theo nhóm đoàn: nhiều mã một ô – lý do – tên liên hệ. */
const cancelEntryInput = z.object({
  codesText: text(2_000),
  reason: text(200),
  contactName: text(200),
  /** Điểm không xuất vé (Hà Nội): ghi chú nhóm khách thay ô mã. */
  note: text(500),
});

/** Vé dời lịch theo nhóm: nhiều mã một ô – ngày dời – lý do – liên hệ – sđt. */
const rescheduleEntryInput = z.object({
  codesText: text(2_000),
  toDate: z.string().refine((v) => v === "" || isDateKey(v), "Ngày dời tới không hợp lệ"),
  reason: text(200),
  contactName: text(200),
  phone: text(50),
  note: text(500),
});

/** Khách ngoại giao: mã vé – số tiền thu (nếu có). */
const diploEntryInput = z.object({
  codesText: text(2_000),
  amount: money,
  note: text(500),
});

const expenseList = z.array(expenseInput).max(50, "Tối đa 50 khoản chi một ngày").default([]);

/* ------------------------------------------------------------------ */

/** PHI CÔNG: số chuyến, mã vé, Camera360, khách ngoại giao, chi tiêu. */
export const pilotReportSchema = z.object({
  spot: spotField,
  date: reportDate,
  flightCount: count(300),
  ticketCodesText: text(20_000),
  /** Dịch vụ gia tăng: SỐ LƯỢNG bắt buộc, mã vé để trống được. */
  flycam: count(300),
  flycamCodesText: text(20_000),
  video360: count(300),
  video360CodesText: text(20_000),
  redFlag: count(300),
  redFlagCodesText: text(20_000),
  sunset: count(300),
  sunsetCodesText: text(20_000),
  flagFlight: count(300),
  flagFlightCodesText: text(20_000),
  diplomaticGuests: count(300),
  diplomaticCodesText: text(20_000),
  /** Khách ngoại giao KHÔNG xuất vé (vẫn bay). */
  diplomaticNoTicket: count(300),
  diplomaticNote: text(500),
  /** Phí bãi theo ĐẦU KHÁCH: bấm +/− số khách, kế toán nhân đơn giá ngoài app. */
  siteFeeGuests: count(500),
  waterCost: money,
  guestCarCost: money,
  /** Số LƯỢT đưa đón (phi công tự trả tiền, kế toán hoàn theo đơn giá ngoài app). */
  pickupBigC: count(100),
  pickupHotel: count(100),
  mountainTrips: count(100),
  /** Chuyến PPG: có vé thì khai mã, không vé thì đếm số chuyến không vé. */
  ppgFlights: count(300),
  ppgCodesText: text(20_000),
  ppgNoTicket: count(300),
  cancelledGuestEntries: cancelledGuestList,
  rescheduledGuestEntries: rescheduledGuestList,
  expenses: expenseList,
  note: text(2_000),
  /**
   * true = phi công bấm "Chốt báo cáo" (khẳng định số đã xong, soát được).
   * Máy chủ vẫn từ chối nếu mã vé sai dạng hoặc số chuyến lệch số mã.
   */
  submit: z.boolean().optional().default(false),
});

/** ĐIỀU PHỐI BAY: vé xuất/thu, tiền mặt, dịch vụ gia tăng, chi cho khách. */
export const dispatcherReportSchema = z.object({
  spot: spotField,
  date: reportDate,
  guestCount: count(5_000),
  ticketsIssued: count(5_000),
  ticketsReturned: count(5_000),
  issuedRanges: z.array(rangeInput).max(20, "Tối đa 20 dải mã một ngày").default([]),
  cancelledEntries: z.array(cancelEntryInput).max(200).default([]),
  cancelledGuestEntries: cancelledGuestList,
  rescheduledGuestEntries: rescheduledGuestList,
  rescheduledEntries: z.array(rescheduleEntryInput).max(200).default([]),
  diplomaticEntries: z.array(diploEntryInput).max(200).default([]),
  flycam: count(1_000),
  flycamCodesText: text(20_000),
  video360: count(1_000),
  video360CodesText: text(20_000),
  redFlag: count(1_000),
  redFlagCodesText: text(20_000),
  sunset: count(1_000),
  sunsetCodesText: text(20_000),
  flagFlight: count(1_000),
  flagFlightCodesText: text(20_000),
  cashReceived: money,
  transferReceived: money,
  /** Khoản thu có tên: nội dung – tiền mặt/CK – số tiền. */
  revenueEntries: z
    .array(z.object({ content: text(200), method: z.enum(["cash", "transfer"]).default("cash"), amount: money }))
    .max(50, "Tối đa 50 khoản thu một ngày")
    .default([]),
  guestWaterCost: money,
  mountainCarCost: money,
  shuttleCarCost: money,
  expenses: expenseList,
  note: text(2_000),
  /** false = lưu nháp (còn nhập tiếp), true = chốt ca. */
  submit: z.boolean().optional().default(false),
});

/** CAMERA MAN: số chuyến quay flycam + chi tiêu. */
export const cameramanReportSchema = z.object({
  spot: spotField,
  date: reportDate,
  flycamFlights: count(1_000),
  flycamCodesText: text(20_000),
  paraglidingFlights: count(1_000),
  paraglidingCodesText: text(20_000),
  expenses: expenseList,
  note: text(2_000),
  submit: z.boolean().optional().default(false),
});

/** KẾ TOÁN: số chốt ngày — mọi ô đều do kế toán tự gõ. */
export const dailyCloseSchema = z.object({
  spot: spotField,
  date: reportDate,
  guestCount: count(5_000),
  /** Khách bay KHÔNG VÉ — đếm theo sổ booking, vẫn tính là chuyến bay. */
  noTicketGuests: count(5_000).optional().default(0),
  ticketsIssued: count(5_000),
  ticketsReturned: count(5_000),
  cancelledCount: count(5_000),
  cancelledRefundCount: count(5_000).optional().default(0),
  cancelledNoRefundCount: count(5_000).optional().default(0),
  rescheduledCount: count(5_000),
  issuedRanges: z.array(rangeInput).max(20, "Tối đa 20 dải mã một ngày").default([]),
  cancelledCodesText: text(20_000),
  cancelledNote: text(2_000),
  rescheduled: z.array(rescheduledInput).max(500).default([]),
  /** Hà Nội (không xuất vé): khách đăng ký + nhóm khách huỷ/dời. */
  registeredGuests: count(5_000).optional().default(0),
  cancelledGuestEntries: cancelledGuestList,
  rescheduledGuestEntries: rescheduledGuestList,
  cashTotal: money,
  transferTotal: money,
  flycam: count(1_000),
  video360: count(1_000),
  redFlag: count(1_000),
  sunset: count(1_000),
  flagFlight: count(1_000),
  /** Sổ THU/CHI riêng của kế toán: nội dung – số tiền – tick thu/chi. */
  ledger: expenseList,
  /** Duyệt/từ chối từng khoản nhân viên khai. */
  expenseReviews: z
    .array(z.object({ key: text(300), status: z.enum(["ok", "no"]), reason: text(300) }))
    .max(300)
    .default([]),
  expensesApproved: z.boolean().optional().default(false),
  expensesApprovedNote: text(1_000),
  varianceApproved: z.boolean().optional().default(false),
  varianceNote: text(1_000),
  note: text(2_000),
});

/** Booking đặt trước: nguồn – liên hệ – số khách – dịch vụ – đón – cọc. */
export const bookingSchema = z.object({
  spot: spotField,
  flightDate: z.string().refine(isDateKey, "Ngày bay không hợp lệ"),
  source: text(200),
  contactName: text(200),
  phone: text(50),
  bookingCode: text(100),
  guestCount: count(100),
  flycam: count(100),
  video360: count(100),
  redFlag: count(100),
  sunset: count(100),
  flagFlight: count(100),
  pickup: z.enum(["self", "bigc", "hotel", "other"]).default("self"),
  /** Booking sinh từ lệnh DỜI LỊCH — ngày bay cũ, để hiện "dời từ dd/mm". */
  rescheduledFrom: z
    .string()
    .refine((v) => v === "" || isDateKey(v), "Ngày dời từ không hợp lệ")
    .optional()
    .default(""),
  pickupNote: text(200),
  expectedTime: text(20),
  flightKind: z.enum(["pg", "ppg", "m650", "m850"]).optional().default("pg"),
  // Khách PPG trong nhóm trộn PG+PPG — PHẢI optional+default, form cũ không gửi
  ppgGuests: count(100).optional().default(0),
  // Không gửi (form cũ) thì để undefined cho máy chủ TỰ TÍNH theo flycam+360
  comboDiscount: money.optional(),
  pickupFee: money,
  mountainCar: count(100),
  unitPrice: money,
  discount: money,
  deposit: money,
  remaining: money,
  /** Khách đã trả cho ĐẠI LÝ (đối tác giữ hộ) — trừ vào còn thu, đại lý nợ công ty. */
  agencyPaidAmount: money,
  agencyName: text(120),
  transferCode: text(100),
  depositToCompany: z.boolean().optional().default(false),
  /** Cọc gõ tay đi đường nào — quầy bấm TM/CK; rỗng = bản ghi cũ chưa hỏi. */
  depositMethod: z.enum(["cash", "transfer", ""]).optional().default(""),
  /** Còn lại > 0: chỉ định người thu — máy chủ tự lập LỆNH THU TIỀN gửi người đó. */
  collectorUsername: text(100),
  collectorNote: text(500),
  note: text(1_000),
});

/** Lệnh thu tiền: tên khách – mã booking – đại lý – số người – tiền – TM (người thu) | CK (TK cty + mã CK). */
export const collectSchema = z.object({
  spot: spotField,
  guestName: text(200),
  bookingCode: text(100),
  agency: text(200),
  guests: count(100),
  amount: money.refine((v) => v > 0, "Chưa nhập số tiền"),
  method: z.enum(["cash", "transfer"]).default("cash"),
  collectorUsername: text(100),
  toCompanyAccount: z.boolean().optional().default(false),
  transferCode: text(100),
  note: text(500),
});

/** Nhân sự đưa tiền cho quản lý/giám đốc. */
export const handoverSchema = z.object({
  spot: spotField,
  date: reportDate,
  /** "handover" = đưa tiền · "advance" = xin ứng tiền. */
  kind: z.enum(["handover", "advance"]).default("handover"),
  /** Tài khoản người nhận — bắt buộc chọn; máy chủ kiểm lại vai trò và điểm bay. */
  recipientUsername: z.string().trim().min(1, "Chưa chọn người nhận tiền"),
  amount: money.refine((v) => v > 0, "Chưa nhập số tiền"),
  method: z.enum(["cash", "transfer"]).default("cash"),
  content: text(500),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Chưa nhập mật khẩu hiện tại"),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải từ 8 ký tự")
    .max(72, "Mật khẩu quá dài") // bcrypt chỉ đọc 72 byte đầu
    .refine((v) => v.trim() === v, "Mật khẩu không được có khoảng trắng ở đầu/cuối"),
});

export const summaryQuerySchema = z
  .object({
    spot: spotField,
    from: z.string().refine(isDateKey, "Ngày bắt đầu không hợp lệ"),
    to: z.string().refine(isDateKey, "Ngày kết thúc không hợp lệ"),
  })
  .refine((v) => v.from <= v.to, { message: "Ngày bắt đầu phải trước ngày kết thúc", path: ["from"] });

/** Gộp lỗi zod thành một câu tiếng Việt để hiện trên form. */
export function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Dữ liệu không hợp lệ";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}
