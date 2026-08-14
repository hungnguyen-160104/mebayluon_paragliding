// lib/baobay/types.ts
/**
 * Kiểu dữ liệu đi qua API báo bay, dùng cho CẢ máy chủ và trình duyệt.
 *
 * File này cố ý không import mongoose: các trang trong app/baocao là client
 * component, import gián tiếp vào model sẽ kéo cả driver MongoDB vào bundle.
 * Vì thế các kiểu dùng chung (dải mã vé, vé dời lịch, khoản chi) định nghĩa ở
 * ĐÂY, còn model trong models/ thì `import type` về dùng.
 */

import type { BaobayRole } from "@/lib/baobay/roles";
import type { Issue, ReconcileTotals } from "@/lib/baobay/reconcile";

/** Một dải mã vé đã xuất: A1234 → A1256 (23 vé). */
export type IssuedRangeDTO = { from: string; to: string; count: number };

/** Một vé dời lịch: mã cũ + ngày dời tới (ngày mới sẽ xuất vé khác). */
export type RescheduledDTO = { code: string; toDate: string; note?: string };

/**
 * Một dòng thu/chi: nội dung – số tiền – thu hay chi – ghi chú.
 * `kind` mặc định "chi"; hiện chỉ camera man có tick THU (khách trả tiền tại bãi).
 */
export type ExpenseDTO = {
  content: string;
  amount: number;
  kind?: "thu" | "chi";
  /** Tiền mặt hay chuyển khoản — sổ "Tiền trong ngày" của kế toán ghi rõ từng dòng. */
  method?: "cash" | "transfer";
  note?: string;
};

/** Vé huỷ theo nhóm: nhiều mã cùng đoàn – lý do – tên liên hệ. */
export type CancelEntryDTO = {
  codes: string[];
  reason: string;
  contactName: string;
  /** Điểm không xuất vé (Hà Nội): ghi chú nhóm khách thay cho ô mã vé. */
  note?: string;
};

/** Vé dời lịch theo nhóm: nhiều mã cùng đoàn – ngày dời tới – lý do – liên hệ – sđt. */
export type RescheduleEntryDTO = {
  codes: string[];
  toDate: string;
  reason: string;
  contactName: string;
  phone: string;
  /** Điểm không xuất vé (Hà Nội): ghi chú nhóm khách thay cho ô mã vé. */
  note?: string;
};

/** Khách ngoại giao: mã vé – số tiền thu được (nếu có) – ghi chú (đoàn nào, có vé/không vé). */
export type DiploEntryDTO = { codes: string[]; amount: number; note?: string };

/**
 * Một lần nhân sự đưa tiền cho quản lý/giám đốc — mọi vai trò đều dùng.
 * Admin bấm "Xác nhận" khi đã cầm tiền.
 */
export type HandoverDTO = {
  id: string;
  /** "handover" = đưa tiền cho quản lý · "advance" = xin ứng tiền. */
  kind: "handover" | "advance";
  spot: string;
  date: string;
  username: string;
  staffName: string;
  role: BaobayRole;
  /** Người nhận tiền, do chính người giao chọn lúc khai. */
  recipientUsername: string;
  recipientName: string;
  recipientRole: BaobayRole;
  amount: number;
  method: "cash" | "transfer";
  content: string;
  /** Lệnh do kế toán/quản trị lập hộ — tên người lập. */
  createdBy?: string;
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  rejected: boolean;
  rejectedReason?: string;
  createdAt: string;
};

export type BaobayUserDTO = {
  id: string;
  username: string;
  name: string;
  role: BaobayRole;
  /** Điểm bay được chỉ định — trang nhập liệu cho chọn 1 trong số này. */
  spots: string[];
  /** Loại phi công (pg/ppg/both) — trang phi công gate khối PPG theo đây. */
  pilotKind?: "pg" | "ppg" | "both";
  mustChangePassword: boolean;
};

/* ------------------------------------------------------------------ */
/* Báo cáo từng nhóm nhân sự                                           */
/* ------------------------------------------------------------------ */

export type PilotReportDTO = {
  id: string;
  date: string;
  username: string;
  pilotName: string;
  flightCount: number;
  ticketCodes: string[];
  /** Dịch vụ gia tăng — số lượng bắt buộc, mã vé tuỳ chọn (chỉ cần khi soát lệch). */
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360Codes: string[];
  redFlag: number;
  redFlagCodes: string[];
  /** Bay hoàng hôn — Hà Nội & Khau Phạ (Mù Cang Chải). */
  sunset: number;
  sunsetCodes: string[];
  flagFlight: number;
  flagFlightCodes: string[];
  diplomaticGuests: number;
  diplomaticCodes: string[];
  /** Khách ngoại giao KHÔNG xuất vé (vẫn bay). */
  diplomaticNoTicket: number;
  /** Ghi chú khách ngoại giao — đoàn nào, có vé/không vé. */
  diplomaticNote: string;
  /** Phí bãi bay theo ĐẦU KHÁCH — số khách, không phải tiền. */
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  /** Số LƯỢT đưa đón phi công tự trả tiền — kế toán nhân đơn giá rồi hoàn. */
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
  /** Chuyến PPG (có động cơ) — vé không bắt buộc, không vé thì đếm vào ppgNoTicket. */
  ppgFlights: number;
  ppgCodes: string[];
  ppgNoTicket: number;
  /** Khách huỷ / dời lịch phi công báo — kênh phụ bên cạnh điều phối. */
  cancelledGuestEntries: CancelGuestDTO[];
  rescheduledGuestEntries: RescheduleGuestDTO[];
  expenses: ExpenseDTO[];
  note: string;
  submitted: boolean;
  submittedAt?: string;
  /** Chốt lần đầu sau giờ quy định — bị phạt nộp muộn. */
  lateSubmit: boolean;
  /** Số tiền phạt THỰC THU: đã trừ trường hợp kế toán huỷ lệnh phạt. */
  latePenalty: number;
  latePenaltyWaived: boolean;
  latePenaltyWaivedBy?: string;
  latePenaltyWaiveReason?: string;
  sheetSynced: boolean;
  sheetError?: string;
  updatedAt: string;
};

export type DispatcherReportDTO = {
  id: string;
  date: string;
  username: string;
  staffName: string;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  issuedRanges: IssuedRangeDTO[];
  cancelledCount: number;
  cancelledCodes: string[];
  cancelledEntries: CancelEntryDTO[];
  /** HÀ NỘI: nhóm KHÁCH huỷ/dời (tên, mã book, số khách…) — nguồn cho kế toán xác nhận. */
  cancelledGuestEntries: CancelGuestDTO[];
  rescheduledGuestEntries: RescheduleGuestDTO[];
  rescheduledCount: number;
  rescheduled: RescheduledDTO[];
  rescheduledEntries: RescheduleEntryDTO[];
  diplomaticEntries: DiploEntryDTO[];
  /** Tiền ngoại giao thu được (cộng từ diplomaticEntries). */
  diplomaticAmount: number;
  flycam: number;
  flycamCodes: string[];
  video360: number;
  video360ServiceCodes: string[];
  redFlag: number;
  redFlagCodes: string[];
  sunset: number;
  sunsetCodes: string[];
  flagFlight: number;
  flagFlightCodes: string[];
  diplomaticGuests: number;
  diplomaticCodes: string[];
  cashReceived: number;
  transferReceived: number;
  /** Khoản thu có tên (thêm bằng nút +) — đã được cộng sẵn vào hai tổng trên. */
  revenueEntries: Array<{ content: string; method: "cash" | "transfer"; amount: number }>;
  guestWaterCost: number;
  mountainCarCost: number;
  shuttleCarCost: number;
  expenses: ExpenseDTO[];
  note: string;
  sheetSynced: boolean;
  sheetError?: string;
  updatedAt: string;
};

export type CameramanReportDTO = {
  id: string;
  date: string;
  username: string;
  cameramanName: string;
  flycamFlights: number;
  flycamCodes: string[];
  /** Nội dung quay thứ hai: QUAY DÙ LƯỢN — số lượng + mã vé. */
  paraglidingFlights: number;
  paraglidingCodes: string[];
  expenses: ExpenseDTO[];
  note: string;
  submitted: boolean;
  submittedAt?: string;
  sheetSynced: boolean;
  sheetError?: string;
  updatedAt: string;
};

/** Số chốt ngày của kế toán tổng hợp. */
export type DailyCloseDTO = {
  id: string;
  date: string;
  accountantName: string;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: IssuedRangeDTO[];
  cancelledCodes: string[];
  /** Ghi chú cho nhóm vé huỷ hoàn tiền (lý do, ai duyệt hoàn…). */
  cancelledNote: string;
  rescheduled: RescheduledDTO[];
  /** HÀ NỘI (không xuất vé): số khách ĐĂNG KÝ trong ngày — thế chỗ "vé xuất ra". */
  registeredGuests: number;
  /** HÀ NỘI: từng nhóm khách HUỶ hoàn tiền — tên, mã book, số khách, nguồn, tiền hoàn. */
  cancelledGuestEntries: CancelGuestDTO[];
  /** HÀ NỘI: từng nhóm khách DỜI lịch — tên, số lượng, ngày dời, ghi chú. */
  rescheduledGuestEntries: RescheduleGuestDTO[];
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  /** Sổ THU/CHI riêng của kế toán. */
  ledger: ExpenseDTO[];
  /** Dấu DUYỆT/TỪ CHỐI từng khoản thu chi nhân viên khai — khoá theo expenseLines.key. */
  expenseReviews: Array<{ key: string; status: "ok" | "no"; reason?: string }>;
  expensesApproved: boolean;
  expensesApprovedNote: string;
  varianceApproved: boolean;
  varianceNote: string;
  status: "draft" | "closed";
  closedAt?: string;
  closedBy?: string;
  note: string;
  sheetSynced: boolean;
  sheetError?: string;
  updatedAt: string;
};

/** Lệnh THU TIỀN: TM chỉ định người thu (xác nhận 2 chiều), CK ghi thẳng vào TK công ty. */
export type CollectDTO = {
  id: string;
  spot: string;
  date: string;
  guestName: string;
  bookingCode: string;
  agency: string;
  guests: number;
  amount: number;
  method: "cash" | "transfer";
  toCompanyAccount: boolean;
  transferCode: string;
  note: string;
  collectorUsername?: string;
  collectorName?: string;
  status: "pending" | "collected" | "rejected" | "company";
  rejectedReason?: string;
  resolvedAt?: string;
  createdByUsername: string;
  createdByName: string;
  createdAt: string;
};

/** Booking đặt trước — khách chốt hôm nay, bay ngày khác. */
export type BookingDTO = {
  id: string;
  spot: string;
  /** Ngày khách bay — booking hiện trên trang điều phối đúng ngày này. */
  flightDate: string;
  createdByUsername: string;
  createdByName: string;
  /** Thời điểm điều phối NHẬP booking (ISO) — chính là lúc khách đặt. */
  createdAt: string;
  source: string;
  contactName: string;
  /** SĐT khách — để người được giao lịch gọi. */
  phone: string;
  bookingCode: string;
  guestCount: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  /** Loại hình bay: "pg" dù lượn · "ppg" có động cơ — quyết định đơn giá. */
  flightKind: "pg" | "ppg" | "m650" | "m850";
  /** Phí đưa đón thu của khách. */
  pickupFee: number;
  /** Số suất xe lên núi (Hà Nội) — 150k/khách. */
  mountainCar: number;
  /** HUỶ BAY: đã xuất vé chưa · mã vé thu hồi · tiền hoàn và hoàn bằng gì. */
  cancelTicketIssued?: boolean;
  cancelTicketCodes?: string[];
  refundAmount?: number;
  refundMethod?: "cash" | "transfer";
  cancelledBy?: string;
  /** Đơn giá một khách · giảm trừ cả đoàn · tổng tiền (máy tự tính). */
  unitPrice: number;
  discount: number;
  totalAmount: number;
  pickup: "self" | "bigc" | "hotel" | "other";
  /** Đón tại đâu khi pickup = "other". */
  pickupNote: string;
  expectedTime: string;
  deposit: number;
  /** Còn lại phải thu khi khách đến bay. */
  remaining: number;
  /** Mã chuyển khoản của khoản cọc (nếu khách CK). */
  transferCode: string;
  /** Cọc CHUYỂN KHOẢN vào thẳng TK CÔNG TY — không ai cầm khoản này. */
  depositToCompany: boolean;
  note: string;
  status: "open" | "done" | "cancelled";
  doneAt?: string;
  doneBy?: string;
  /** Ngày bay cũ nếu đã dời lịch — hiện "dời từ dd/mm" cho điều phối biết. */
  rescheduledFrom: string[];
  /** Người được điều phối GIAO lịch (đón khách, tiếp khách…). */
  assignedToUsername?: string;
  assignedToName?: string;
  assignedBy?: string;
};

/** HÀ NỘI: một nhóm khách huỷ hoàn tiền — điều phối nhập, kế toán xác nhận. */
export type CancelGuestDTO = {
  name: string;
  bookingCode: string;
  guests: number;
  source: string;
  refund: number;
  note?: string;
  /** Điểm CÓ VÉ (Khau Phạ, Sa Pa): mã vé của nhóm — Hà Nội để trống. */
  codes?: string[];
  /** Huỷ khi CHƯA XUẤT VÉ: không có mã vé thu hồi, chỉ hoàn tiền. */
  noTicket?: boolean;
  /** Tiền khách đã thanh toán trước khi huỷ. */
  paid?: number;
  /** Hoàn bằng CK (từ TK công ty) hay TM (nhân viên chi tại chỗ). */
  refundMethod?: "cash" | "transfer";
};

/** HÀ NỘI: một nhóm khách dời lịch — tên, số lượng, SĐT, ngày dời, ghi chú. */
export type RescheduleGuestDTO = {
  name: string;
  guests: number;
  toDate: string;
  note: string;
  /** SĐT khách — theo nhóm sang lịch ngày mới để còn gọi. */
  phone?: string;
  /** Tự đến hay hẹn đón — theo nhóm sang booking của ngày dời. */
  pickup?: "self" | "other";
  /** Đón ở đâu khi chọn hẹn đón. */
  pickupNote?: string;
  /** Giờ hẹn "HH:MM". */
  expectedTime?: string;
  /** Điểm CÓ VÉ: mã vé của nhóm — Hà Nội để trống. */
  codes?: string[];
  /** id booking đã ĐẨY VÀO LỊCH ngày dời — có rồi thì khỏi đẩy lần hai. */
  bookedId?: string;
};

/** Kết quả đối chiếu một ngày, dạng gửi qua API. */
export type ReconcileDTO = {
  date: string;
  /** Ngày trắng — không ai báo gì: hiện "Chưa có dữ liệu" thay vì "Cần xử lý". */
  empty: boolean;
  canClose: boolean;
  issues: Issue[];
  totals: ReconcileTotals;
  missingCodes: string[];
  duplicateCodes: Array<{ code: string; pilots: string[] }>;
  /** Tổng chi tiêu của cả ngày, để kế toán xác nhận. */
  expenseTotal: number;
  expenseLines: Array<{
    who: string;
    /** Tài khoản người khai — để lệnh từ chối trỏ đúng người. */
    username: string;
    role: BaobayRole;
    content: string;
    amount: number;
    /** thu = tiền nhân viên cầm hộ/thu tại bãi (xanh) · chi = tiền đã chi (đỏ). */
    kind?: "thu" | "chi";
    note?: string;
    /**
     * Khoá định danh dòng: role|username|nội dung|tiền|thu-chi. Nhân viên sửa
     * khoản là khoá đổi → dấu duyệt/từ chối cũ tự rơi về "chưa duyệt".
     */
    key: string;
  }>;
  /** Lỗi của riêng người đang đăng nhập. */
  myIssues?: Issue[];
};

/* ------------------------------------------------------------------ */
/* Bảng tổng hợp theo kỳ                                               */
/* ------------------------------------------------------------------ */

export type DailyRollupDTO = {
  date: string;

  /** "closed" mới được tính vào tổng kỳ. */
  status: "none" | "draft" | "closed";
  /** Còn lỗi đỏ hay không (ngày đang treo). */
  blocked: boolean;
  issueCount: number;

  /** Số kế toán khai (0 nếu chưa nhập). */
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  cashTotal: number;
  transferTotal: number;
  revenueTotal: number;
  flycam: number;
  video360: number;
  flagFlight: number;

  /** Ai bấm chốt ngày này — hiện cạnh nhãn ĐÃ CHỐT. */
  closedBy?: string;

  /** Số cộng từ báo cáo nhân viên, để so với số kế toán khai. */
  pilotFlights: number;
  pilotCodes: number;
  pilot360: number;
  dispatcherIssued: number;
  dispatcherCash: number;
  dispatcherTransfer: number;
  dispatcherFlycam: number;
  cameramanFlycam: number;
  /** Khách ngoại giao PHI CÔNG khai đã bay. */
  diplomaticGuests: number;
  /** Số VÉ ngoại giao quầy xuất ra (điều phối khai) — số dùng để đối chiếu. */
  diplomaticTickets: number;
  /** Tiền THU ĐƯỢC từ khách ngoại giao (điều phối khai theo từng mã). */
  diplomaticAmount: number;
  redFlag: number;
  sunset: number;

  /** Tổng chi tiêu mọi nhân sự khai trong ngày. */
  expenseTotal: number;

  pilotCount: number;
  pilotSubmitted: number;
  dispatcherCount: number;
  cameramanCount: number;
};

/** Tổng của một phi công trong kỳ — dùng để tính tiền cho phi công. */
export type PilotPeriodTotalDTO = {
  username: string;
  pilotName: string;
  days: number;
  flights: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  diplomaticGuests: number;
  expenseTotal: number;
  /** Tổng phạt nộp muộn trong kỳ (200k/lần chốt muộn). */
  latePenalty: number;
  /** Tiền đã ứng và ĐƯỢC DUYỆT trong kỳ — trừ vào lương cuối tháng. */
  advanceTotal: number;
  /** Số lượt đưa đón phi công tự trả — kế toán nhân đơn giá rồi hoàn. */
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
};

export type BaobaySummaryDTO = {
  /** Điểm bay của bảng tổng hợp này — mỗi điểm một hệ thống riêng. */
  spot: string;
  from: string;
  to: string;
  pilotReports: PilotReportDTO[];
  dispatcherReports: DispatcherReportDTO[];
  cameramanReports: CameramanReportDTO[];
  closes: DailyCloseDTO[];
  days: DailyRollupDTO[];
  /** Chỉ cộng những ngày đã chốt. */
  totals: Omit<DailyRollupDTO, "date" | "status" | "blocked">;
  /** Số ngày chưa chốt trong kỳ — nêu rõ để kế toán biết tổng còn thiếu gì. */
  pendingDays: string[];
  byPilot: PilotPeriodTotalDTO[];
};

/* ------------------------------------------------------------------ */
/* Báo cáo tháng                                                       */
/* ------------------------------------------------------------------ */

/** Các chỉ tiêu cộng được của một phi công trong một khoảng thời gian. */
export type MonthlyTotalsDTO = {
  /** Số ngày có báo cáo. */
  days: number;
  flights: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  diplomaticGuests: number;
  /** Phí bãi theo đầu khách (số khách). */
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  otherExpense: number;
  /** Tổng chi = phí bãi bay + nước + xe cho khách + chi khác. */
  expenseTotal: number;
  /** Phạt nộp muộn (200k/lần chốt sau giờ quy định). */
  latePenalty: number;
  /** Tiền ứng đã được duyệt trong tháng — trừ vào lương. */
  advanceTotal: number;
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
  /** Chuyến PPG (có động cơ). */
  ppgFlights: number;
  /** Tiền THU trong ngày (thu hộ tiền bay, flycam… — các dòng THU trong sổ). */
  thuTotal: number;
  /** Tiền CHI trong ngày (nước + chi khác). */
  chiTotal: number;
};

export type MonthlyDayCellDTO = MonthlyTotalsDTO & {
  /** Ngày trong tháng, 1–31. */
  day: number;
  /** Ngày này kế toán đã chốt chưa — số chưa chốt còn có thể đổi. */
  closed: boolean;
  /** Có báo cáo của phi công này trong ngày hay không. */
  hasReport: boolean;
};

export type MonthlyPilotDTO = {
  username: string;
  pilotName: string;
  daily: MonthlyDayCellDTO[];
  /** Cộng từ ngày 1 đến hôm nay (tháng đã qua thì bằng `month`). */
  toDate: MonthlyTotalsDTO;
  /** Cộng cả tháng. */
  month: MonthlyTotalsDTO;
  /** Chi tiết các khoản chi trong tháng, để kế toán soát. */
  expenses: Array<ExpenseDTO & { date: string }>;
};

export type MonthlyReportDTO = {
  spot: string;
  /** "YYYY-MM". */
  month: string;
  daysInMonth: number;
  /** Hôm nay theo giờ Việt Nam — mốc của cột "đến ngày hiện tại". */
  today: string;
  /** true nếu tháng đang xem là tháng hiện tại. */
  isCurrentMonth: boolean;
  pilots: MonthlyPilotDTO[];
  /** Ngày trong tháng có số liệu nhưng kế toán chưa chốt. */
  unclosedDays: string[];
  grandToDate: MonthlyTotalsDTO;
  grandMonth: MonthlyTotalsDTO;
};

export type BaobayAccountDTO = {
  id: string;
  username: string;
  displayName: string;
  role: BaobayRole;
  email: string;
  phone: string;
  /** Mật khẩu đọc được — chỉ xuất hiện ở API quản trị, theo yêu cầu chủ hệ thống. */
  password: string;
  /** Các điểm bay admin đã chỉ định cho người này. */
  spots: string[];
  /** Loại phi công: pg / ppg / both — chỉ có nghĩa với role pilot. */
  pilotKind: "pg" | "ppg" | "both";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
};
