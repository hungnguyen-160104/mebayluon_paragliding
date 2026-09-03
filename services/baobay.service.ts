// services/baobay.service.ts
/**
 * Nghiệp vụ trang báo bay: tài khoản, báo cáo của bốn nhóm nhân sự, chốt ngày
 * của kế toán, đối chiếu và các bảng tổng hợp.
 *
 * Ba nguyên tắc xuyên suốt:
 *
 *  1. GHI MONGODB TRƯỚC, đẩy Google Sheets sau. Bảng tính là bản sao cho kế
 *     toán; mất kết nối tới Apps Script không được phép làm nhân viên mất công
 *     nhập lại — bản ghi nào chưa đẩy được thì mang `sheetSynced: false`.
 *
 *  2. NGÀY ĐÃ CHỐT LÀ KHOÁ. Kế toán bấm chốt xong thì không ai sửa được số của
 *     ngày đó nữa (kể cả chính kế toán) — muốn sửa phải gỡ khoá (mở lại ngày),
 *     và việc gỡ khoá được ghi vết. Không có chốt cứng thì con số đã dùng để
 *     trả tiền vẫn có thể đổi sau lưng.
 *
 *  3. Số của kế toán và số của nhân viên là HAI NGUỒN RIÊNG. Hàm ở đây không
 *     bao giờ tự điền số kế toán từ số nhân viên; app chỉ cộng sẵn để hiện cạnh
 *     ô nhập cho kế toán so.
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { after } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { formatDateKeyVN, isDateKey, isPastSubmitDeadline, nowStampVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { reconcileDay, type ReconcileInput, type ReconcileResult } from "@/lib/baobay/reconcile";
import { ROLE_LABEL, isBaobayRole, isDispatcherLike, wearsRole, type BaobayRole } from "@/lib/baobay/roles";
import { DEFAULT_SPOT, normalizeSpot, normalizeSpotList, spotName, type SpotId } from "@/lib/baobay/spots";
import { pushBaobayRow, sheetTargetFromSetting, type SheetTarget } from "@/lib/baobay/sheet";
import { clearQueueNoOnWeb, pushQueueNoToWeb } from "@/lib/baobay/web-queue";
import { buildShiftEmail } from "@/lib/baobay/shift-email";
import {
  buildBookingChangeMail,
  buildBookingConfirmMail,
  diffBooking,
  SERVICE_LABEL,
  type BookingSnapshot,
} from "@/lib/baobay/booking-change-mail";
import { customerEmailHtml, customerEmailSubject } from "@/lib/email/customer-booking";
import { sendSmtpMail } from "@/lib/mailer";
import {
  countTicketRange,
  expandTicketRanges,
  normalizeTicketCode,
  parseTicketCodeList,
  TICKET_CODE_HINT,
  TICKET_CODE_PATTERN,
  parseTicketCode,
  formatTicketCode,
} from "@/lib/baobay/ticket-code";
import { FLIGHT_KIND_SHORT, bookingTotal, comboDiscount, flightUnitPrice, type FlightKind } from "@/lib/baobay/flight-price";
import { PILOT_VIEW_LIMIT_DAYS } from "@/lib/baobay/validation";
import type { BaobaySession } from "@/lib/baobay/token";
import type {
  BaobayAccountDTO,
  BaobaySummaryDTO,
  BookingDTO,
  CollectDTO,
  CameramanReportDTO,
  CancelEntryDTO,
  DiploEntryDTO,
  HandoverDTO,
  RescheduleEntryDTO,
  DailyCloseDTO,
  DailyRollupDTO,
  DispatcherReportDTO,
  ExpenseDTO,
  IssuedRangeDTO,
  MonthlyDayCellDTO,
  MonthlyPilotDTO,
  MonthlyReportDTO,
  MonthlyTotalsDTO,
  PilotPeriodTotalDTO,
  PilotReportDTO,
  ReconcileDTO,
  RescheduledDTO,
} from "@/lib/baobay/types";
import { AccountantDailyClose } from "@/models/AccountantDailyClose.model";
import { BaobayAccount, type IBaobayAccount } from "@/models/BaobayAccount.model";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayCollect } from "@/models/BaobayCollect.model";
import { BaobayServiceChange } from "@/models/BaobayServiceChange.model";
import { BaobayHandover } from "@/models/BaobayHandover.model";
import { BaobayReviewRequest, REVIEW_TARGET_ROLES, REVIEW_TOPIC_LABEL, type ReviewTopic } from "@/models/BaobayReviewRequest.model";
import { BaobayFlycamCancel } from "@/models/BaobayFlycamCancel.model";
import { BaobayRefund } from "@/models/BaobayRefund.model";
import { BaobayShift } from "@/models/BaobayShift.model";
import { BaobaySetting, DEFAULT_SUBMIT_DEADLINE } from "@/models/BaobaySetting.model";
import { CameramanDailyReport } from "@/models/CameramanDailyReport.model";
import { DispatcherDailyReport } from "@/models/DispatcherDailyReport.model";
import { PilotDailyReport } from "@/models/PilotDailyReport.model";
import { sendPartnerFlightMail } from "@/services/baobay-partner.service";
import { toSlug } from "@/utils/slug";

const BCRYPT_ROUNDS = 10;

/** Lỗi nghiệp vụ có câu tiếng Việt hiện thẳng lên form. */
/**
 * Đẩy sang Google Sheets SAU KHI đã trả lời người dùng.
 *
 * Trước đây mọi lần lưu đều ngồi CHỜ Apps Script (3–13 giây, lúc "nguội" còn
 * thử lại) rồi mới trả lời — người đứng bãi bấm Lưu tưởng app treo, tệ nhất
 * vượt trần 30 giây của hàm và yêu cầu bị cắt = "không lưu". Nay ghi cơ sở dữ
 * liệu xong là trả lời ngay; bảng tính nhận số sau vài giây bằng `after()`
 * (Next chạy phần này sau khi đã đóng phản hồi, serverless không cắt mất).
 * Kết quả đẩy ghi lại vào bản ghi — hỏng thì mang nhãn "chưa sang bảng" và
 * nút "Đẩy lại Google Sheets" quét lại được như trước.
 */
function pushSheetInBackground(
  push: () => Promise<{ ok: boolean; error?: string }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: { updateOne: (filter: any, update: any) => unknown },
  id: unknown,
): void {
  const job = async () => {
    try {
      const sync = await push();
      await model.updateOne(
        { _id: id },
        { $set: { sheetSynced: sync.ok, sheetError: sync.ok ? "" : sync.error || "" } },
      );
      if (!sync.ok) console.warn("[baocao] đẩy bảng tính thất bại:", sync.error);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await model.updateOne({ _id: id }, { $set: { sheetSynced: false, sheetError: msg } });
      console.warn("[baocao] đẩy bảng tính lỗi:", msg);
    }
  };

  try {
    after(job); // trong ngữ cảnh request của Next
  } catch {
    void job(); // gọi từ chỗ khác (script, test) thì chạy thẳng, không chặn ai
  }
}

/**
 * ĐƯỜNG LIÊN HỆ in cuối thư báo khách. Đổi được bằng biến môi trường để khi
 * công ty đổi số thì không phải sửa mã nguồn.
 */
const BOOKING_HOTLINE = process.env.BOOKING_HOTLINE || "0964.073.555 – 0385.907.789 (Zalo/WhatsApp)";

/** Chỉ giữ những trường KHÁCH nhìn thấy — phần còn lại không phải việc của thư. */
function bookingSnapshot(doc: any): BookingSnapshot {
  return {
    flightDate: doc?.flightDate || "",
    expectedTime: doc?.expectedTime || "",
    guestCount: doc?.guestCount ?? 0,
    ppgGuests: doc?.ppgGuests ?? 0,
    flycam: doc?.flycam ?? 0,
    video360: doc?.video360 ?? 0,
    redFlag: doc?.redFlag ?? 0,
    sunset: doc?.sunset ?? 0,
    flagFlight: doc?.flagFlight ?? 0,
    mountainCar: doc?.mountainCar ?? 0,
    pickup: doc?.pickup || "self",
    pickupNote: doc?.pickupNote || "",
    totalAmount: doc?.totalAmount ?? 0,
    deposit: doc?.deposit ?? 0,
    remaining: doc?.remaining ?? 0,
    refundedTotal: doc?.refundedTotal ?? 0,
    status: doc?.status || "open",
  };
}

/**
 * ĐÁNH DẤU "BOOKING VỪA ĐỔI, CHƯA BÁO KHÁCH".
 *
 * KHÔNG tự gửi thư. Nhân viên bấm nút "Gửi mail báo khách" trên dòng booking
 * mới gửi — vì người sửa mới biết thay đổi này đã chốt với khách hay còn đang
 * trao đổi dở. Sửa tới sửa lui ba lượt rồi mới ngã ngũ là chuyện thường; tự
 * gửi mỗi lượt một thư thì khách nhận ba thư đá nhau, chẳng biết tin thư nào.
 *
 * Chỗ này chỉ ghi lại ẢNH CHỤP TRƯỚC lượt sửa ĐẦU TIÊN. Các lượt sau không
 * đụng vào nữa, nên lúc bấm gửi khách đọc được một dòng "Giờ hẹn: 10:00 →
 * 16:00" thay vì cả nhật ký nhân viên đổi ý.
 *
 * Sửa xong lại quay về y như cũ thì dấu tự xoá — không còn gì để báo.
 */
async function markBookingChanged(before: any, after: any): Promise<Record<string, unknown> | null> {
  const base = bookingSnapshot(before);
  const now = bookingSnapshot(after);
  const cu = (after?.notifyPendingBase ?? null) as BookingSnapshot | null;

  if (cu) {
    // Đã có dấu từ lượt trước: so với ảnh chụp GỐC, hết khác thì xoá dấu
    if (diffBooking(cu, now).length === 0) {
      await BaobayBooking.updateOne({ _id: after._id }, { $set: { notifyPendingBase: null } });
      return null;
    }
    return cu as unknown as Record<string, unknown>;
  }

  if (diffBooking(base, now).length === 0) return null;
  await BaobayBooking.updateOne({ _id: after._id }, { $set: { notifyPendingBase: base } });
  return base as unknown as Record<string, unknown>;
}

/** Những thay đổi ĐANG CHỜ báo khách — dựng lại từ ảnh chụp gốc. */
function pendingChangesOf(doc: any) {
  const base = doc?.notifyPendingBase as BookingSnapshot | undefined;
  if (!base) return [];
  return diffBooking(base, bookingSnapshot(doc));
}

/**
 * NHÂN VIÊN BẤM GỬI THƯ BÁO KHÁCH.
 *
 * Gửi NGAY và CHỜ kết quả (khác phần đẩy Google Sheets chạy nền): người vừa
 * bấm nút đang đứng đó nhìn màn hình, họ cần biết thư đã đi hay hộp thư sai —
 * báo "đã gửi" rồi âm thầm hỏng là tệ nhất, vì cả đội tin là khách đã biết.
 */
export async function sendBookingChangeMail(
  session: BaobaySession,
  spotRaw: string,
  id: string,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);

  const to = String(doc.email || "").trim();
  if (!to) throw new BaobayError('Booking chưa có email khách — sửa booking, điền ô "Email khách" rồi gửi', 400);

  /**
   * Có thay đổi chờ báo thì gửi thư THAY ĐỔI; không có thì gửi thư XÁC NHẬN
   * toàn bộ booking. Trước đây không có gì chờ là báo lỗi — nghe hợp lý mà
   * sai việc: booking VỪA NHẬP xong không có "thay đổi" nào, trong khi đó
   * chính là lúc khách cần một bản xác nhận bằng chữ nhất.
   */
  const changes = pendingChangesOf(doc);
  const info = {
    guestName: doc.contactName || "",
    bookingCode: doc.bookingCode || "",
    spotName: spotName(spot),
    hotline: BOOKING_HOTLINE,
  };
  /** Bản chữ thuần (text/plain) giữ SONG NGỮ như cũ — phòng máy khách chặn HTML. */
  const mail =
    changes.length > 0
      ? buildBookingChangeMail(info, changes, bookingSnapshot(doc))
      : buildBookingConfirmMail(info, bookingSnapshot(doc));
  if (!mail) throw new BaobayError("Không dựng được nội dung thư", 400);

  /**
   * PHẦN HTML dùng ĐÚNG MẪU thư xác nhận của website (lib/email/customer-booking)
   * — khách đặt web đã nhận kiểu thư đó rồi, thư từ app phải cùng một bộ mặt,
   * hai kiểu thư khác nhau từ cùng một công ty nhìn như lừa đảo.
   *
   * NGÔN NGỮ: sổ nội bộ không lưu ngôn ngữ khách nên phải đoán bằng dấu vết:
   * booking từ OTA (Klook/Viator/GYG… — khách quốc tế đặt qua đó) hoặc khách
   * trong hồ sơ bảo hiểm mang quốc tịch ngoài Việt Nam → tiếng Anh; còn lại
   * tiếng Việt. Đoán sai vẫn còn bản text song ngữ đỡ phía dưới.
   */
  const nuocNgoai =
    Boolean(doc.otaName) ||
    /klook|viator|gyg|getyourguide|kkday|trip\.com|agoda|booking\.com/i.test(String(doc.source ?? "")) ||
    (doc.insured ?? []).some(
      (g: any) => g?.nationality && !/^(viet\s?nam|vi[eệ]t\s?nam|vn)$/i.test(String(g.nationality).trim()),
    );
  const mailLang = nuocNgoai ? "en" : "vi";

  const dichVu = (["flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"] as const)
    .map((k) => ({ k, qty: Math.max(0, Math.round(Number(doc[k]) || 0)) }))
    .filter((x) => x.qty > 0)
    .map((x) => ({ label: SERVICE_LABEL[x.k][mailLang], qty: x.qty }));

  const daTra = Math.max(0, doc.deposit ?? 0);
  const html = customerEmailHtml({
    lang: mailLang,
    bookingId: doc.bookingCode || String(doc._id).slice(-6).toUpperCase(),
    locationName: spotName(spot),
    dateISO: doc.flightDate || "",
    timeSlot: doc.expectedTime || "",
    guestsCount: doc.guestCount ?? 0,
    name: doc.contactName || "",
    contact: { phone: doc.phone || "", email: to },
    guests: (doc.insured ?? [])
      .filter((g: any) => !g?.cancelled && g?.fullName)
      .map((g: any) => ({
        fullName: g.fullName,
        dob: g.birthday || "",
        gender: g.gender === "nam" ? "Nam" : g.gender === "nu" ? "Nữ" : "",
        nationality: g.nationality || "",
        idNumber: g.idNumber || "",
      })),
    selectedServiceLines: dichVu,
    price: { total: doc.totalAmount ?? 0 },
    paid: daTra,
    balance: Math.max(0, doc.remaining ?? 0),
    update:
      changes.length > 0
        ? {
            changes: changes.map((c) => (mailLang === "en" ? c.en : c.vi)),
            cancelled: doc.status === "cancelled",
          }
        : undefined,
    logoSrc: "https://www.mebayluon.com/logo-mbl.png",
  });
  const subject = customerEmailSubject({
    lang: mailLang,
    bookingId: doc.bookingCode || String(doc._id).slice(-6).toUpperCase(),
    update: changes.length > 0 ? { changes: [], cancelled: doc.status === "cancelled" } : undefined,
  });

  const entry: Record<string, unknown> = {
    at: new Date(),
    by: session?.name || session?.username || "",
    to,
    changes: changes.length > 0 ? changes.map((c) => c.vi) : ["Thư xác nhận đặt chỗ (toàn bộ thông tin hiện tại)"],
    ok: true,
    error: "",
  };
  try {
    await sendSmtpMail({ to, subject, html, text: mail.text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    entry.ok = false;
    entry.error = msg;
    /**
     * Gửi hỏng thì VẪN ghi nhật ký nhưng GIỮ NGUYÊN dấu chờ báo: thay đổi đó
     * khách chưa biết, xoá dấu là nó biến mất khỏi màn hình và không ai nhớ
     * phải nhắn tay nữa.
     */
    await BaobayBooking.updateOne({ _id: doc._id }, { $push: { notifyLog: entry } });
    throw new BaobayError(`Không gửi được thư tới ${to}: ${msg}`, 502);
  }

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: doc._id },
    { $push: { notifyLog: entry }, $set: { notifyPendingBase: null } },
    { new: true },
  ).lean<any>();
  return toBookingDTO(updated ?? doc);
}

/** Việc nền không gắn với một bản ghi nào (đẩy lại cả ngày, dòng tổng hợp…). */
function runInBackground(job: () => Promise<unknown>): void {
  const wrapped = async () => {
    try {
      await job();
    } catch (e: unknown) {
      console.warn("[baocao] việc nền lỗi:", e instanceof Error ? e.message : String(e));
    }
  };
  try {
    after(wrapped);
  } catch {
    void wrapped();
  }
}

export class BaobayError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/* ================================================================== */
/* Tài khoản                                                           */
/* ================================================================== */

export type AccountDoc = IBaobayAccount & { _id: mongoose.Types.ObjectId };

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * ÂN HẠN PHẠT NỘP MUỘN: mọi ngày bay đến hết mốc này KHÔNG bị ghi phạt —
 * lệnh chủ hệ thống 12/08/2026 (giai đoạn cả đội mới làm quen với app).
 * Từ ngày 16/08 trở đi phạt chạy như thường.
 */
const LATE_PENALTY_GRACE_UNTIL = "2026-08-15";

/** Sai quá số lần này thì khoá tạm — đủ rộng cho người gõ nhầm, đủ chặt với máy dò. */
const MAX_FAILED_LOGINS = 8;
/** Khoá tạm bao lâu sau khi vượt ngưỡng. */
const LOGIN_LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; account: AccountDoc }
  | { ok: false; reason: "wrong" }
  | { ok: false; reason: "locked"; minutes: number };

/**
 * Kiểm tài khoản + mật khẩu, có chống dò mật khẩu.
 *
 * Đếm số lần sai LIÊN TIẾP trong cơ sở dữ liệu chứ không đếm trong bộ nhớ tiến
 * trình: máy chủ chạy nhiều bản (serverless), đếm trong RAM thì kẻ dò chỉ cần
 * gọi rải ra là thoát. Sai quá ngưỡng thì khoá tạm 15 phút; đăng nhập đúng là
 * xoá sạch bộ đếm.
 *
 * Vẫn KHÔNG phân biệt "sai mật khẩu" với "không có tài khoản" ở tầng trên —
 * tránh để người ngoài dò ra danh sách tài khoản.
 */
export async function authenticateBaobay(usernameRaw: string, password: string): Promise<LoginResult> {
  await connectDB();

  const username = normalizeUsername(usernameRaw);
  if (!username || !password) return { ok: false, reason: "wrong" };

  const account = await BaobayAccount.findOne({ username }).lean<AccountDoc | null>();
  if (!account) return { ok: false, reason: "wrong" };

  // Tài khoản bị khoá hẳn: coi như sai mật khẩu, không nói rõ lý do.
  if (!account.isActive) return { ok: false, reason: "wrong" };

  const lockedUntil = account.lockedUntil ? new Date(account.lockedUntil) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    return {
      ok: false,
      reason: "locked",
      minutes: Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000)),
    };
  }

  const ok = await bcrypt.compare(password, account.passwordHash);

  if (!ok) {
    const failed = (account.failedLogins || 0) + 1;
    const set: Record<string, unknown> = { failedLogins: failed };
    if (failed >= MAX_FAILED_LOGINS) {
      set.lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000);
      set.failedLogins = 0;
    }
    await BaobayAccount.updateOne({ _id: account._id }, { $set: set });

    return failed >= MAX_FAILED_LOGINS
      ? { ok: false, reason: "locked", minutes: LOGIN_LOCK_MINUTES }
      : { ok: false, reason: "wrong" };
  }

  // Không await: cập nhật lần đăng nhập cuối chỉ để tiện theo dõi.
  BaobayAccount.updateOne(
    { _id: account._id },
    { $set: { lastLoginAt: new Date(), failedLogins: 0 }, $unset: { lockedUntil: "" } },
  ).catch((e) => console.warn("[baobay] không ghi được lastLoginAt:", e?.message));

  return { ok: true, account };
}

export function toSession(account: AccountDoc): BaobaySession {
  const spots = normalizeSpotList(account.spots);
  return {
    id: String(account._id),
    username: account.username,
    name: account.displayName,
    role: account.role,
    // Chưa được chỉ định điểm nào thì cho điểm mặc định, khỏi kẹt cứng không làm được gì
    spots: spots.length ? spots : [DEFAULT_SPOT],
    extraRoles: (account.extraRoles ?? []).filter((r: string) => r !== account.role) as BaobayRole[],
    adminLevel: account.role === "admin" ? (account.adminLevel === 1 ? 1 : 2) : undefined,
  };
}

/* ================================================================== */
/* Hai cấp quản trị                                                    */
/* ================================================================== */

/**
 * Quản trị TOÀN QUYỀN hay không.
 *
 * Cấp 1 mới được đổi cấu hình điểm bay (giờ chốt, webhook Sheets) và lập/sửa/xoá
 * tài khoản quản trị khác. Cấp 2 quản nhân sự thường là hết. Token quản trị
 * WEBSITE (viaAdmin) coi như cấp 1: đó là chủ site.
 *
 * Mặc định của mọi chỗ nghi ngờ là KHÔNG toàn quyền.
 */
export function isFullAdmin(session: { role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean }): boolean {
  if (session.viaAdmin) return true;
  return session.role === "admin" && session.adminLevel === 1;
}

export class BaobayForbidden extends BaobayError {
  constructor(message: string) {
    super(message, 403);
  }
}

/** Ném lỗi 403 nếu không phải quản trị cấp 1. */
export function assertFullAdmin(
  session: { role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean },
  what: string,
): void {
  if (!isFullAdmin(session)) {
    throw new BaobayForbidden(`Quản trị cấp 2 không được ${what} — việc này thuộc quản trị cấp 1`);
  }
}

/**
 * Chặn làm việc ở điểm bay KHÔNG được chỉ định.
 *
 * Mỗi điểm là một hệ thống riêng, nên đây là ranh giới an toàn quan trọng nhất
 * của phần đa điểm: phi công Sa Pa không được ghi đè số của Khau Phạ dù chỉ đổi
 * một tham số trên đường dẫn.
 */
export function assertSpotAllowed(session: BaobaySession, spot: string): SpotId {
  const target = normalizeSpot(spot);
  const allowed = normalizeSpotList(session.spots);
  if (!allowed.includes(target)) {
    throw new BaobayError(
      `Tài khoản này không được chỉ định điểm bay ${spotName(target)}`,
      403,
    );
  }
  return target;
}

export async function changeOwnPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();

  const account = await BaobayAccount.findById(accountId).lean<AccountDoc | null>();
  if (!account) return { ok: false, error: "Không tìm thấy tài khoản" };

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) return { ok: false, error: "Mật khẩu hiện tại không đúng" };

  const same = await bcrypt.compare(newPassword, account.passwordHash);
  if (same) return { ok: false, error: "Mật khẩu mới phải khác mật khẩu cũ" };

  await BaobayAccount.updateOne(
    { _id: account._id },
    {
      $set: {
        passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        // Bản đọc được cho admin xem — yêu cầu rõ của chủ hệ thống (xem model).
        passwordPlain: newPassword,
        mustChangePassword: false,
      },
    },
  );

  return { ok: true };
}

export type CreateAccountInput = {
  username: string;
  password: string;
  displayName: string;
  role: BaobayRole;
  email?: string;
  phone?: string;
  /** Danh sách điểm bay admin chỉ định. Bỏ trống = điểm mặc định. */
  spots?: string[];
  note?: string;
};

/** Kiểm email khi có nhập — để trống thì thôi, không bắt buộc. */
function normalizeEmail(raw: unknown): { ok: true; email: string } | { ok: false; error: string } {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email) return { ok: true, email: "" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: `Email “${email}” không đúng dạng` };
  }
  return { ok: true, email };
}

export async function createAccount(
  input: CreateAccountInput,
  by?: { role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean },
): Promise<{ ok: true; account: BaobayAccountDTO } | { ok: false; error: string }> {
  await connectDB();

  /**
   * Chỉ quản trị cấp 1 mới đẻ ra được tài khoản quản trị, và con đẻ ra luôn là
   * CẤP 2. Muốn có thêm một người toàn quyền thì phải sửa thẳng cơ sở dữ liệu —
   * cố ý làm khó, vì cấp 1 nắm cấu hình Sheets và toàn bộ nhân sự.
   */
  if (input.role === "admin" && by && !isFullAdmin(by)) {
    return { ok: false, error: "Quản trị cấp 2 không được lập tài khoản quản trị khác" };
  }

  const username = normalizeUsername(input.username);
  if (username.length < 3) return { ok: false, error: "Tên đăng nhập phải từ 3 ký tự" };
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { ok: false, error: "Tên đăng nhập chỉ gồm chữ không dấu, số và . _ -" };
  }
  if (input.password.length < 6) return { ok: false, error: "Mật khẩu phải từ 6 ký tự" };
  if (!input.displayName.trim()) return { ok: false, error: "Chưa nhập tên hiển thị" };

  const existed = await BaobayAccount.exists({ username });
  if (existed) return { ok: false, error: `Tên đăng nhập “${username}” đã có người dùng` };


  const email = normalizeEmail(input.email);
  if (!email.ok) return { ok: false, error: email.error };

  const doc = await BaobayAccount.create({
    username,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    passwordPlain: input.password,
    displayName: input.displayName.trim(),
    role: input.role,
    // Quản trị mới luôn là cấp 2; nâng lên cấp 1 phải sửa thẳng cơ sở dữ liệu
    adminLevel: 2,
    email: email.email || undefined,
    phone: input.phone?.trim() || undefined,
    spots: normalizeSpotList(input.spots).length ? normalizeSpotList(input.spots) : [DEFAULT_SPOT],
    note: input.note?.trim() || undefined,
    isActive: true,
    mustChangePassword: true,
  });

  return { ok: true, account: toAccountDTO(doc.toObject() as AccountDoc) };
}

export async function listAccounts(by?: {
  role: BaobayRole;
  adminLevel?: 1 | 2;
  viaAdmin?: boolean;
}): Promise<BaobayAccountDTO[]> {
  await connectDB();
  const docs = await BaobayAccount.find({}).sort({ role: 1, displayName: 1 }).lean<AccountDoc[]>();
  const full = !by || isFullAdmin(by);

  return docs.map((doc) => {
    const dto = toAccountDTO(doc);
    // Cấp 2 thấy có tài khoản quản trị nào, nhưng KHÔNG thấy mật khẩu của họ
    if (!full && doc.role === "admin") return { ...dto, password: "••••••" };
    return dto;
  });
}

export type UpdateAccountInput = {
  displayName?: string;
  role?: BaobayRole;
  email?: string;
  phone?: string;
  spots?: string[];
  note?: string;
  isActive?: boolean;
  /** Loại phi công: pg / ppg / both. */
  pilotKind?: "pg" | "ppg" | "both";
  /** Vai kiêm nhiệm — mảng vai trò ngoài vai chính. */
  extraRoles?: string[];
  /** Quản trị đặt lại mật khẩu — người dùng sẽ bị buộc đổi ở lần đăng nhập sau. */
  newPassword?: string;
};

export async function updateAccount(
  id: string,
  patch: UpdateAccountInput,
  by?: { username: string; role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean },
): Promise<{ ok: true; account: BaobayAccountDTO } | { ok: false; error: string }> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, error: "Mã tài khoản không hợp lệ" };

  /**
   * Quản trị cấp 2 không đụng được vào tài khoản quản trị nào — kể cả của chính
   * mình — và cũng không tự phong ai lên quản trị. Nếu không chặn, cấp 2 chỉ
   * cần đổi vai trò một tài khoản thường thành "admin" là leo thang quyền.
   */
  if (by) {
    const target = await BaobayAccount.findById(id).select("role username").lean<any>();
    if (!target) return { ok: false, error: "Không tìm thấy tài khoản" };

    /**
     * Với CHÍNH MÌNH: không tự khoá và không tự bỏ vai trò quản trị. Hai đường
     * này đều kết thúc bằng cảnh không ai còn quyền vào sửa — đổi mật khẩu của
     * mình thì vẫn được, làm ở trang riêng.
     */
    if (target.username === by.username) {
      if (patch.isActive === false) {
        return { ok: false, error: "Không thể tự khoá tài khoản của chính mình" };
      }
      if (patch.role !== undefined && patch.role !== "admin" && target.role === "admin") {
        return { ok: false, error: "Không thể tự bỏ vai trò quản trị của chính mình" };
      }
    }

    if (!isFullAdmin(by)) {
      if (target.role === "admin") {
        return { ok: false, error: "Quản trị cấp 2 không được sửa tài khoản quản trị" };
      }
      if (patch.role === "admin") {
        return { ok: false, error: "Quản trị cấp 2 không được phong người khác làm quản trị" };
      }
    }
  }

  const set: Record<string, unknown> = {};
  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim();
    if (!name) return { ok: false, error: "Tên hiển thị không được để trống" };
    set.displayName = name;
  }
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.email !== undefined) {
    const email = normalizeEmail(patch.email);
    if (!email.ok) return { ok: false, error: email.error };
    set.email = email.email;
  }
  if (patch.phone !== undefined) set.phone = patch.phone.trim();
  if (patch.pilotKind !== undefined) {
    if (!["pg", "ppg", "both"].includes(patch.pilotKind)) return { ok: false, error: "Loại phi công không hợp lệ" };
    set.pilotKind = patch.pilotKind;
  }
  if (patch.spots !== undefined) {
    const spots = normalizeSpotList(patch.spots);
    if (!spots.length) return { ok: false, error: "Phải chỉ định ít nhất một điểm bay" };
    set.spots = spots;
  }
  /**
   * KIÊM NHIỆM: chỉ nhận vai có thật, bỏ trùng, và bỏ luôn vai chính (kiêm chính
   * mình thì vô nghĩa). KHÔNG cho kiêm "quản trị" — muốn ai làm quản trị thì đổi
   * hẳn vai chính, để đường phong quyền chỉ có một lối, dễ soát.
   */
  if (patch.extraRoles !== undefined) {
    const mainRole = (patch.role ?? (await BaobayAccount.findById(id).select("role").lean<any>())?.role) as string;
    const list = [...new Set(patch.extraRoles.map(String))].filter(
      (r) => isBaobayRole(r) && r !== "admin" && r !== mainRole,
    );
    set.extraRoles = list;
  }
  if (patch.note !== undefined) set.note = patch.note.trim();
  if (patch.isActive !== undefined) set.isActive = patch.isActive;

  if (patch.newPassword !== undefined) {
    if (patch.newPassword.length < 6) return { ok: false, error: "Mật khẩu phải từ 6 ký tự" };
    set.passwordHash = await bcrypt.hash(patch.newPassword, BCRYPT_ROUNDS);
    set.passwordPlain = patch.newPassword;
    set.mustChangePassword = true;
  }

  if (!Object.keys(set).length) return { ok: false, error: "Không có gì để cập nhật" };

  const doc = await BaobayAccount.findByIdAndUpdate(id, { $set: set }, { new: true }).lean<AccountDoc | null>();
  if (!doc) return { ok: false, error: "Không tìm thấy tài khoản" };

  return { ok: true, account: toAccountDTO(doc) };
}

/**
 * XOÁ VĨNH VIỄN một tài khoản kèm toàn bộ báo cáo hằng ngày của người đó.
 *
 * Đây là lựa chọn của chủ điểm bay: "Khoá" giữ nguyên số liệu (dùng cho người
 * thôi việc bình thường), còn "Xoá" là dọn hẳn khỏi cơ sở dữ liệu — dùng khi
 * tạo nhầm hoặc muốn xoá sạch dấu vết một người. KHÔNG xoá gì trên Google
 * Sheets (bản sao bên đó xoá tay nếu cần).
 *
 * Hệ quả cần biết trước khi gọi: báo cáo của người này trong những NGÀY ĐÃ CHỐT
 * cũng bị xoá — tổng của các kỳ cũ sẽ hụt đi phần của họ. Bản chốt ngày của kế
 * toán (accountantdailycloses) thì GIỮ NGUYÊN kể cả khi xoá tài khoản kế toán:
 * đó là số của cả điểm bay, không phải của riêng ai.
 */
export async function deleteAccount(
  id: string,
  confirmUsername: string,
  by?: { username: string; role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean },
): Promise<
  | { ok: true; username: string; deleted: { pilot: number; dispatcher: number; cameraman: number } }
  | { ok: false; error: string }
> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, error: "Mã tài khoản không hợp lệ" };

  const account = await BaobayAccount.findById(id).lean<AccountDoc | null>();
  if (!account) return { ok: false, error: "Không tìm thấy tài khoản" };

  /**
   * Không ai tự xoá được chính mình — kể cả quản trị cấp 1. Đã xảy ra thật:
   * chủ hệ thống bấm nhầm và tự xoá tài khoản gốc, phải vào thẳng cơ sở dữ
   * liệu dựng lại. Muốn xoá thì nhờ quản trị khác làm.
   */
  if (by && account.username === by.username) {
    return { ok: false, error: "Không thể tự xoá tài khoản của chính mình — nhờ quản trị khác thao tác" };
  }

  if (account.role === "admin" && by && !isFullAdmin(by)) {
    return { ok: false, error: "Quản trị cấp 2 không được xoá tài khoản quản trị" };
  }

  /**
   * Không xoá quản trị CẤP 1 đang hoạt động cuối cùng: mất người này là không
   * còn ai đổi được cấu hình hay lập quản trị mới — hệ thống tự khoá trái.
   */
  if (account.role === "admin" && account.adminLevel === 1) {
    const otherFull = await BaobayAccount.countDocuments({
      _id: { $ne: account._id },
      role: "admin",
      adminLevel: 1,
      isActive: true,
    });
    if (!otherFull) {
      return { ok: false, error: "Đây là quản trị cấp 1 cuối cùng — phải có người thay trước khi xoá" };
    }
  }

  /**
   * So tên xác nhận TRƯỚC khi động vào bất cứ thứ gì: phép xoá này không hoàn
   * tác được, nên gõ sai tên là dừng ngay từ đây, chưa mất một bản ghi nào.
   */
  if (confirmUsername.trim().toLowerCase() !== account.username) {
    return { ok: false, error: `Tên xác nhận không khớp — phải gõ đúng “${account.username}”` };
  }

  const oid = new mongoose.Types.ObjectId(id);
  const [p, d, c] = await Promise.all([
    PilotDailyReport.deleteMany({ accountId: oid }),
    DispatcherDailyReport.deleteMany({ accountId: oid }),
    CameramanDailyReport.deleteMany({ accountId: oid }),
  ]);

  await BaobayAccount.deleteOne({ _id: oid });

  console.warn(
    `[baobay] ĐÃ XOÁ tài khoản ${account.username} (${account.displayName}) kèm ` +
      `${p.deletedCount} báo cáo phi công, ${d.deletedCount} điều phối, ${c.deletedCount} camera man`,
  );

  return {
    ok: true,
    username: account.username,
    deleted: {
      pilot: p.deletedCount ?? 0,
      dispatcher: d.deletedCount ?? 0,
      cameraman: c.deletedCount ?? 0,
    },
  };
}

export type BulkCreated = { username: string; displayName: string; password: string; role: BaobayRole };

/**
 * Tạo nhiều tài khoản một lượt từ danh sách tên — dùng khi mở tài khoản cho cả
 * 15 phi công. Tên đăng nhập suy ra từ tên, mật khẩu sinh ngẫu nhiên và CHỈ hiện
 * một lần trên trang quản trị (trong cơ sở dữ liệu chỉ còn bản băm).
 */
export async function createAccountsBulk(
  names: string[],
  role: BaobayRole,
  spots?: string[],
): Promise<{ created: BulkCreated[]; failed: Array<{ name: string; error: string }> }> {
  await connectDB();

  const created: BulkCreated[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (const raw of names) {
    const displayName = raw.trim().replace(/\s+/g, " ");
    if (!displayName) continue;

    const username = await freeUsername(displayName);
    if (!username) {
      failed.push({ name: displayName, error: "Không tạo được tên đăng nhập từ tên này" });
      continue;
    }

    const password = randomPassword();
    const result = await createAccount({ username, password, displayName, role, spots });

    if (result.ok) created.push({ username, displayName, password, role });
    else failed.push({ name: displayName, error: result.error });
  }

  return { created, failed };
}

/** "Nguyễn Văn A" -> "nguyenvana"; đã có người dùng thì thêm số: nguyenvana2. */
async function freeUsername(displayName: string): Promise<string | null> {
  const base = toSlug(displayName).replace(/-/g, "").slice(0, 20);
  if (base.length < 3) return null;

  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const taken = await BaobayAccount.exists({ username: candidate });
    if (!taken) return candidate;
  }
  return null;
}

/**
 * Tạo mật khẩu ngẫu nhiên dễ đọc để đưa cho nhân viên.
 * Bỏ các ký tự dễ nhìn lẫn (0/O, 1/l/I) vì mật khẩu này được đọc qua điện thoại.
 */
export function randomPassword(length = 8): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function toAccountDTO(doc: AccountDoc): BaobayAccountDTO {
  return {
    id: String(doc._id),
    username: doc.username,
    displayName: doc.displayName,
    role: doc.role,
    email: doc.email || "",
    phone: doc.phone || "",
    // Chỉ chảy ra API quản trị — mọi hàm dùng toAccountDTO đều nằm sau requireAuth admin.
    password: doc.passwordPlain || "",
    spots: normalizeSpotList(doc.spots).length ? normalizeSpotList(doc.spots) : [DEFAULT_SPOT],
    pilotKind: doc.pilotKind === "ppg" ? "ppg" : doc.pilotKind === "both" ? "both" : "pg",
    extraRoles: ((doc as any).extraRoles ?? []).filter((r: string) => isBaobayRole(r)) as BaobayRole[],
    isActive: doc.isActive !== false,
    mustChangePassword: Boolean(doc.mustChangePassword),
    lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Khoá theo ngày đã chốt                                              */
/* ================================================================== */

/**
 * Ngày kế toán đã chốt thì mọi bản ghi của ngày đó đóng băng.
 * Gọi ở đầu MỌI hàm ghi số liệu — đây là chốt cửa duy nhất.
 */
async function assertDayOpen(spot: string, date: string): Promise<void> {
  const close = await AccountantDailyClose.findOne({ spot, date }).select("status").lean<any>();
  if (close?.status === "closed") {
    throw new BaobayError(
      `Ngày ${date} ở ${spotName(spot)} đã được kế toán chốt — không sửa được nữa. Cần sửa thì nhờ kế toán gỡ khoá ngày.`,
      409,
    );
  }
}

export async function isDayClosed(spot: string, date: string): Promise<boolean> {
  await connectDB();
  const close = await AccountantDailyClose.findOne({ spot: normalizeSpot(spot), date })
    .select("status")
    .lean<any>();
  return close?.status === "closed";
}

/* ================================================================== */
/* Chuẩn hoá dữ liệu vé và chi tiêu                                    */
/* ================================================================== */

/** Tính lại `count` cho từng dải mã ở máy chủ, không tin số client gửi. */
function normalizeRanges(input: Array<{ from: string; to: string }>): {
  ranges: IssuedRangeDTO[];
  warnings: string[];
} {
  const ranges: IssuedRangeDTO[] = [];
  const warnings: string[] = [];

  input.forEach((raw, index) => {
    const from = normalizeTicketCode(raw?.from);
    const to = normalizeTicketCode(raw?.to);
    if (!from && !to) return;

    const counted = countTicketRange(from, to);
    if (!counted.ok) {
      warnings.push(`Dải mã thứ ${index + 1} chưa đọc được: ${counted.error}`);
      // Vẫn lưu để người nhập thấy mà sửa, count = 0 cho khỏi cộng sai.
      ranges.push({ from, to, count: 0 });
      return;
    }
    ranges.push({ from, to, count: counted.count });
  });

  const expanded = expandTicketRanges(ranges);
  if (expanded.overlaps.length) {
    warnings.push(
      `Các dải mã chồng nhau ở ${expanded.overlaps.length} mã: ${expanded.overlaps.slice(0, 8).join(", ")}`,
    );
  }

  return { ranges, warnings };
}

function normalizeRescheduled(input: Array<{ code: string; toDate: string; note?: string }>): {
  list: RescheduledDTO[];
  warnings: string[];
} {
  const list: RescheduledDTO[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const code = normalizeTicketCode(raw?.code);
    if (!code) continue;

    if (seen.has(code)) {
      warnings.push(`Vé dời lịch ${code} nhập hai lần, chỉ tính một lần`);
      continue;
    }
    seen.add(code);

    if (!TICKET_CODE_PATTERN.test(code)) {
      warnings.push(`Mã vé dời lịch “${code}” sai dạng. ${TICKET_CODE_HINT}`);
    }
    if (!raw?.toDate) warnings.push(`Vé dời lịch ${code} chưa ghi dời sang ngày nào`);

    list.push({ code, toDate: raw?.toDate || "", note: raw?.note?.trim() || undefined });
  }

  return { list, warnings };
}

/** Bỏ dòng trống, cắt khoảng trắng, cảnh báo dòng thiếu nội dung hoặc thiếu tiền. */
function normalizeExpenses(
  input: Array<{ content: string; amount: number; kind?: "thu" | "chi"; method?: "cash" | "transfer"; note?: string }>,
): {
  list: ExpenseDTO[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const list = input
    .map((e) => ({
      content: String(e?.content ?? "").trim(),
      amount: Number(e?.amount) || 0,
      kind: (e?.kind === "thu" ? "thu" : "chi") as "thu" | "chi",
      method: e?.method === "transfer" ? ("transfer" as const) : e?.method === "cash" ? ("cash" as const) : undefined,
      note: e?.note?.trim() || undefined,
    }))
    .filter((e) => e.content || e.amount);

  for (const e of list) {
    if (!e.content) warnings.push(`Có khoản chi ${e.amount.toLocaleString("vi-VN")}đ chưa ghi nội dung`);
    if (!e.amount) warnings.push(`Khoản chi “${e.content}” chưa ghi số tiền`);
  }

  return { list, warnings };
}

/** Tổng CHI — dòng đánh dấu "thu" (tiền khách trả tại bãi) không phải khoản chi. */
export function expenseTotal(list: ExpenseDTO[] = []): number {
  return (list || []).reduce((s, e) => s + (e.kind === "thu" ? 0 : e.amount || 0), 0);
}

/** Tổng THU tại bãi trong sổ thu/chi. */
export function thuTotal(list: ExpenseDTO[] = []): number {
  return (list || []).reduce((s, e) => s + (e.kind === "thu" ? e.amount || 0 : 0), 0);
}

/**
 * Tổng THU bằng TIỀN MẶT — dòng THU khai "CK" là tiền vào thẳng tài khoản
 * công ty, người khai không cầm đồng nào; cộng nó vào "đang giữ" là bắt
 * nhân viên nộp thứ tiền họ chưa từng cầm.
 */
function thuCashTotal(list: ExpenseDTO[] = []): number {
  return (list || []).reduce(
    (s, e) => s + (e.kind === "thu" && e.method !== "transfer" ? e.amount || 0 : 0),
    0,
  );
}

function formatExpenses(list: ExpenseDTO[] = []): string {
  return (list || [])
    .map(
      (e) =>
        `${e.kind === "thu" ? "[THU] " : ""}${e.content}: ${(e.amount || 0).toLocaleString("vi-VN")}đ${e.method ? (e.method === "transfer" ? " CK" : " TM") : ""}${e.note ? ` (${e.note})` : ""}`,
    )
    .join(" | ");
}

function formatRanges(ranges: IssuedRangeDTO[] = []): string {
  return ranges.map((r) => `${r.from}–${r.to} (${r.count})`).join(", ");
}

function formatRescheduled(list: RescheduledDTO[] = []): string {
  return list.map((r) => `${r.code} → ${r.toDate || "chưa ghi ngày"}`).join(", ");
}

/** Tổng chi của phi công: ba khoản có tên + các khoản tự thêm. */
function pilotExpenseTotal(doc: {
  waterCost?: number;
  guestCarCost?: number;
  expenses?: ExpenseDTO[];
}): number {
  // Phí bãi KHÔNG cộng ở đây nữa: nay khai theo đầu khách, kế toán nhân đơn giá ngoài app
  return (doc.waterCost || 0) + (doc.guestCarCost || 0) + expenseTotal(doc.expenses);
}

/** Tổng chi của điều phối: ba khoản chi hộ khách + các khoản tự thêm. */
function dispatcherExpenseTotal(doc: {
  guestWaterCost?: number;
  mountainCarCost?: number;
  shuttleCarCost?: number;
  expenses?: ExpenseDTO[];
}): number {
  return (
    (doc.guestWaterCost || 0) +
    (doc.mountainCarCost || 0) +
    (doc.shuttleCarCost || 0) +
    expenseTotal(doc.expenses)
  );
}

/* ================================================================== */
/* Cấu hình vận hành (giờ chốt báo cáo)                                */
/* ================================================================== */

/** Tiền phạt mỗi lần phi công chốt báo cáo sau giờ quy định. */
export const LATE_PENALTY_VND = 200_000;

/**
 * Cấu hình lưu THEO ĐIỂM BAY: `key` của BaobaySetting chính là mã điểm bay.
 * Mỗi điểm có giờ chốt riêng và bảng Google Sheets riêng.
 */
export async function getSpotSetting(spot: string): Promise<{
  spot: SpotId;
  submitDeadline: string;
  sheetWebhookUrl: string;
  sheetSecret: string;
}> {
  await connectDB();
  const key = normalizeSpot(spot);
  const doc = await BaobaySetting.findOne({ key }).lean<any>();
  return {
    spot: key,
    submitDeadline: doc?.submitDeadline || DEFAULT_SUBMIT_DEADLINE,
    sheetWebhookUrl: doc?.sheetWebhookUrl || "",
    sheetSecret: doc?.sheetSecret || "",
  };
}

/** Giờ chốt của một điểm bay — đọc thẳng, admin đổi là hiệu lực ngay. */
export async function getSubmitDeadline(spot: string): Promise<string> {
  return (await getSpotSetting(spot)).submitDeadline;
}

/**
 * Kế toán đặt GIỜ PHẠT NỘP MUỘN cho điểm mình phụ trách — chỉ mỗi giờ chốt,
 * không đụng được webhook/mã bảo vệ (những thứ đó vẫn của quản trị cấp 1).
 */
export async function setSubmitDeadline(session: BaobaySession, spotRaw: string, deadline: string): Promise<string> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(deadline)) {
    throw new BaobayError("Giờ chốt phải dạng HH:MM, ví dụ 19:30", 400);
  }
  // BaobaySetting khoá theo `key` = mã điểm bay
  await BaobaySetting.updateOne({ key: spot }, { $set: { submitDeadline: deadline, updatedBy: session.username } }, { upsert: true });
  return deadline;
}

/** Đích đẩy Sheets của một điểm bay (mỗi điểm một bảng riêng). */
async function sheetTargetForSpot(spot: string): Promise<SheetTarget | null> {
  const setting = await getSpotSetting(spot);
  return sheetTargetFromSetting({
    sheetWebhookUrl: setting.sheetWebhookUrl,
    sheetSecret: setting.sheetSecret,
  });
}

export async function updateSpotSetting(
  spot: string,
  patch: { submitDeadline?: string; sheetWebhookUrl?: string; sheetSecret?: string },
  updatedBy: string,
  by?: { role: BaobayRole; adminLevel?: 1 | 2; viaAdmin?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  /**
   * Cấu hình điểm bay là chỗ nhạy nhất: đổi webhook là dữ liệu chảy sang bảng
   * tính khác, đổi giờ chốt là ảnh hưởng tiền phạt của cả đội. Chỉ quản trị
   * cấp 1.
   */
  if (by && !isFullAdmin(by)) {
    return { ok: false, error: "Quản trị cấp 2 không được đổi cấu hình điểm bay" };
  }

  const key = normalizeSpot(spot);
  const set: Record<string, unknown> = { updatedBy };

  if (patch.submitDeadline !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.submitDeadline)) {
      return { ok: false, error: "Giờ chốt phải có dạng HH:mm, ví dụ 20:00" };
    }
    set.submitDeadline = patch.submitDeadline;
  }
  if (patch.sheetWebhookUrl !== undefined) {
    const url = patch.sheetWebhookUrl.trim();
    if (url && !/^https:\/\/script\.google\.com\//.test(url)) {
      return { ok: false, error: "Đường dẫn phải là webhook Apps Script (https://script.google.com/…)" };
    }
    set.sheetWebhookUrl = url;
  }
  if (patch.sheetSecret !== undefined) set.sheetSecret = patch.sheetSecret.trim();

  await connectDB();
  await BaobaySetting.updateOne({ key }, { $set: set }, { upsert: true });
  return { ok: true };
}

/* ================================================================== */
/* Báo cáo phi công                                                    */
/* ================================================================== */

export type PilotReportSaveInput = {
  /** Điểm bay của báo cáo — mỗi điểm là một hệ thống riêng. */
  spot: string;
  date: string;
  flightCount: number;
  ticketCodesText: string;
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
  sunset: number;
  sunsetCodesText: string;
  flagFlight: number;
  flagFlightCodesText: string;
  diplomaticGuests: number;
  diplomaticCodesText: string;
  /** Phí bãi theo ĐẦU KHÁCH — số khách, kế toán nhân đơn giá ngoài app. */
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  /** Khách ngoại giao KHÔNG xuất vé (vẫn bay) — ghi chú tách khỏi phần có vé. */
  diplomaticNoTicket: number;
  diplomaticNote?: string;
  /** Khách huỷ/dời phi công báo — kênh phụ, kèm mã vé ở điểm có vé. */
  cancelledGuestEntries?: Array<{
    name: string;
    bookingCode: string;
    guests: number;
    source: string;
    refund: number;
    note?: string;
    codesText?: string;
    /** Huỷ khi CHƯA XUẤT VÉ: không có mã vé, chỉ hoàn tiền. */
    noTicket?: boolean;
    paid?: number;
    refundMethod?: "cash" | "transfer";
  }>;
  rescheduledGuestEntries?: Array<{ name: string; guests: number; toDate: string; note?: string; phone?: string; pickup?: "self" | "other"; pickupNote?: string; expectedTime?: string; codesText?: string; bookedId?: string }>;
  /** Số LƯỢT đưa đón phi công tự trả tiền — kế toán hoàn theo đơn giá ngoài app. */
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
  /** Chuyến PPG: có vé thì khai mã, không vé thì đếm vào ppgNoTicket. */
  ppgFlights: number;
  /** Suất ăn & xe trong ngày làm — thanh toán với bếp/đội xe theo ngày, tháng. */
  mealBreakfast?: number;
  mealLunch?: number;
  mealDinner?: number;
  motorbikeRides?: number;
  carRides?: number;
  ppgCodesText: string;
  ppgNoTicket: number;
  expenses: Array<{ content: string; amount: number; note?: string }>;
  note: string;
  submit: boolean;
};

export type SaveResult<T> = { report: T; warnings: string[] };

export async function upsertPilotReport(
  session: BaobaySession,
  input: PilotReportSaveInput,
): Promise<SaveResult<PilotReportDTO>> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  await assertDayOpen(spot, input.date);

  const parsed = parseTicketCodeList(input.ticketCodesText);
  const warnings: string[] = [];

  if (parsed.invalid.length) {
    warnings.push(`Bỏ qua ${parsed.invalid.length} cụm không đọc được: ${parsed.invalid.slice(0, 5).join(", ")}`);
  }
  if (parsed.duplicates.length) {
    warnings.push(`Có mã nhập trùng, đã tính một lần: ${parsed.duplicates.slice(0, 5).join(", ")}`);
  }

  /**
   * Chốt báo cáo bị từ chối khi mã sai dạng hoặc số chuyến lệch số mã.
   *
   * Đây là hai lỗi CHÍNH CHỦ tự sửa được ngay. Các lỗi còn lại (mã trùng với
   * phi công khác, mã không thuộc dải đã xuất, thiếu mã) là lỗi cấp NGÀY — chúng
   * chặn kế toán chốt ngày chứ không chặn từng phi công, vì người này không thể
   * tự biết người kia khai gì.
   */
  /** Mã vé chỉ BẮT BUỘC ở Khau Phạ (vé 3 liên in mã); điểm khác khai được thì tốt. */
  const requireCodes = spot === "khau-pha";

  if (input.submit) {
    if (parsed.malformed.length) {
      // Mã sai dạng là gõ nhầm — chặn ở mọi điểm, đã gõ thì phải gõ đúng
      throw new BaobayError(
        `Chưa chốt được: ${parsed.malformed.length} mã vé sai dạng — ${parsed.malformed.slice(0, 8).join(", ")}. ${TICKET_CODE_HINT}`,
      );
    }
    if (requireCodes && parsed.codes.length !== input.flightCount) {
      throw new BaobayError(
        `Chưa chốt được: khai ${input.flightCount} chuyến nhưng liệt kê ${parsed.codes.length} mã vé. Hai số phải bằng nhau.`,
      );
    }
    if (!requireCodes && parsed.codes.length && parsed.codes.length !== input.flightCount) {
      warnings.push(
        `Số mã vé (${parsed.codes.length}) khác số chuyến (${input.flightCount}) — điểm này không bắt buộc mã nên vẫn chốt được.`,
      );
    }
  } else {
    if (parsed.malformed.length) {
      warnings.push(
        `${parsed.malformed.length} mã sai dạng (${parsed.malformed.slice(0, 5).join(", ")}) — sửa xong mới chốt được. ${TICKET_CODE_HINT}`,
      );
    }
    if (parsed.codes.length && parsed.codes.length !== input.flightCount) {
      warnings.push(`Số mã vé (${parsed.codes.length}) khác số chuyến bay đã khai (${input.flightCount}).`);
    }
  }

  /**
   * Mã Camera360 và mã khách ngoại giao là TẬP CON của mã vé đã bay: khách phải
   * bay mới quay được, và khách ngoại giao vẫn là một chuyến bay có vé.
   */
  const flownSet = new Set(parsed.codes);
  const codesFlycam = parseTicketCodeList(input.flycamCodesText);
  const codes360 = parseTicketCodeList(input.video360CodesText);
  const codesRedFlag = parseTicketCodeList(input.redFlagCodesText);
  const codesSunset = parseTicketCodeList(input.sunsetCodesText);
  const codesFlagFlight = parseTicketCodeList(input.flagFlightCodesText);
  const diplomatic = parseTicketCodeList(input.diplomaticCodesText);

  /**
   * Mã vé dịch vụ gia tăng KHÔNG bắt buộc — bỏ trống là chuyện bình thường.
   * Nhưng đã ghi thì kiểm: mã phải nằm trong danh sách đã bay, và nếu ghi đủ mã
   * thì số mã nên bằng số lượng khai. Cả hai chỉ là NHẮC, không chặn chốt.
   */
  const serviceCodeChecks: Array<{ label: string; codes: string[]; count: number }> = [
    { label: "Flycam", codes: codesFlycam.codes, count: input.flycam },
    { label: "Camera360", codes: codes360.codes, count: input.video360 },
    { label: "Cờ đỏ", codes: codesRedFlag.codes, count: input.redFlag },
    { label: "Hoàng hôn/săn mây", codes: codesSunset.codes, count: input.sunset },
    { label: "Kéo cờ", codes: codesFlagFlight.codes, count: input.flagFlight },
  ];

  for (const chk of serviceCodeChecks) {
    if (!chk.codes.length) continue;
    const orphan = chk.codes.filter((c) => !flownSet.has(c));
    if (orphan.length) {
      warnings.push(`Mã ${chk.label} không có trong danh sách mã vé đã bay: ${orphan.slice(0, 5).join(", ")}`);
    }
    if (chk.codes.length !== chk.count) {
      warnings.push(`Số mã ${chk.label} (${chk.codes.length}) khác số lượng đã khai (${chk.count}).`);
    }
  }

  const orphanDiplomatic = diplomatic.codes.filter((c) => !flownSet.has(c));
  if (orphanDiplomatic.length) {
    warnings.push(
      `Mã vé khách ngoại giao không có trong danh sách đã bay: ${orphanDiplomatic.slice(0, 5).join(", ")}`,
    );
  }

  /**
   * PPG: vé không bắt buộc, nhưng SỐ PHẢI KHỚP — mã đã khai + chuyến không vé
   * phải bằng tổng chuyến PPG. Đã bay có vé thì phải khai mã; không vé thì đếm
   * vào ô "không vé", không được bỏ lửng.
   */
  const ppg = parseTicketCodeList(input.ppgCodesText);
  if (spot === "khau-pha" && ppg.malformed.length) {
    if (input.submit) {
      throw new BaobayError(
        `Chưa chốt được: mã vé PPG sai dạng — ${ppg.malformed.slice(0, 5).join(", ")}. ${TICKET_CODE_HINT}`,
      );
    }
    warnings.push(`Mã vé PPG sai dạng: ${ppg.malformed.slice(0, 5).join(", ")}`);
  }
  if (spot === "khau-pha" && input.ppgFlights > 0 && ppg.codes.length + input.ppgNoTicket !== input.ppgFlights) {
    const msg = `PPG: khai ${input.ppgFlights} chuyến nhưng mã vé (${ppg.codes.length}) + không vé (${input.ppgNoTicket}) = ${ppg.codes.length + input.ppgNoTicket}. Có vé thì khai mã, không vé thì đếm vào ô "không vé".`;
    if (input.submit) throw new BaobayError(`Chưa chốt được: ${msg}`);
    warnings.push(msg);
  }

  const { list: expenses, warnings: expenseWarnings } = normalizeExpenses(input.expenses);
  warnings.push(...expenseWarnings);

  /**
   * Mã vé đã bay ở NGÀY KHÁC — bộ đối chiếu chỉ soi trong phạm vi một ngày nên
   * không thấy được chuyện này. Một vé chỉ bay đúng một lần: vé dời lịch bị huỷ
   * ở ngày cũ và ngày mới xuất vé khác, nên cùng một mã xuất hiện ở hai ngày là
   * dấu hiệu chép nhầm sổ. Chỉ NHẮC, không chặn: ngày cũ có thể đã chốt và khoá,
   * người sửa được là kế toán.
   */
  if (parsed.codes.length) {
    const elsewhere = await PilotDailyReport.find({
      spot,
      date: { $ne: input.date },
      ticketCodes: { $in: parsed.codes },
    })
      .select("date pilotName ticketCodes")
      .limit(20)
      .lean<any[]>();

    const clashes: string[] = [];
    for (const doc of elsewhere) {
      for (const c of doc.ticketCodes ?? []) {
        if (parsed.codes.includes(c)) clashes.push(`${c} (${formatDateKeyVN(doc.date)}, ${doc.pilotName})`);
      }
    }
    if (clashes.length) {
      warnings.push(
        `Mã vé này đã được khai bay ở ngày khác: ${clashes.slice(0, 5).join(" · ")}. Một vé chỉ bay một lần — soát lại kẻo trùng.`,
      );
    }
  }

  /**
   * Phạt nộp muộn: tính MỘT LẦN theo thời điểm chốt ĐẦU TIÊN, đọc giờ quy định
   * mới nhất từ cấu hình (admin đổi là hiệu lực ngay). Sửa và chốt lại về sau
   * không tính lại — "không tính giờ sửa báo cáo". 0 chuyến thì không cần báo
   * cáo nên cũng không phạt.
   */
  const existing = await PilotDailyReport.findOne({
    accountId: new mongoose.Types.ObjectId(session.id),
    date: input.date,
    spot,
  })
    .select("firstSubmittedAt lateSubmit latePenalty latePenaltyWaived")
    .lean<any>();

  const penaltySet: Record<string, unknown> = {};
  if (input.submit && !existing?.firstSubmittedAt) {
    const deadline = await getSubmitDeadline(spot);
    // Ngày CHỈ bay PPG cũng là ngày bay — chốt muộn vẫn tính phạt như thường
    const flewAnything = input.flightCount > 0 || (spot === "khau-pha" && input.ppgFlights > 0);
    const late =
      flewAnything &&
      input.date > LATE_PENALTY_GRACE_UNTIL &&
      isPastSubmitDeadline(input.date, deadline);
    penaltySet.firstSubmittedAt = new Date();
    penaltySet.lateSubmit = late;
    penaltySet.latePenalty = late ? LATE_PENALTY_VND : 0;
    if (late) {
      warnings.push(
        `Chốt sau giờ quy định (${deadline}) — bị ghi phạt nộp muộn ${LATE_PENALTY_VND.toLocaleString("vi-VN")}đ.`,
      );
    }
  } else if (existing?.lateSubmit && !existing.latePenaltyWaived) {
    /**
     * Sửa lại báo cáo đã ghi phạt: cả PG lẫn PPG về 0 thì tiền phạt cũng về 0
     * (không bay thì không phải báo cáo); khai lại có chuyến thì phạt quay lại.
     * Giờ chốt lần đầu vẫn giữ nguyên, không tính lại theo giờ sửa.
     */
    const stillFlew = input.flightCount > 0 || (spot === "khau-pha" && input.ppgFlights > 0);
    penaltySet.latePenalty = stillFlew ? LATE_PENALTY_VND : 0;
  }

  const doc = await PilotDailyReport.findOneAndUpdate(
    { accountId: new mongoose.Types.ObjectId(session.id), date: input.date, spot },
    {
      $set: {
        username: session.username,
        pilotName: session.name,
        spot,
        flightCount: input.flightCount,
        ticketCodes: parsed.codes,
        flycam: input.flycam,
        flycamCodes: codesFlycam.codes,
        video360: input.video360,
        video360Codes: codes360.codes,
        redFlag: input.redFlag,
        redFlagCodes: codesRedFlag.codes,
        sunset: input.sunset,
        sunsetCodes: codesSunset.codes,
        flagFlight: input.flagFlight,
        flagFlightCodes: codesFlagFlight.codes,
        diplomaticGuests: input.diplomaticGuests,
        diplomaticCodes: diplomatic.codes,
        diplomaticNoTicket: input.diplomaticNoTicket,
        diplomaticNote: (input.diplomaticNote ?? "").trim(),
        // Khách huỷ/dời PHI CÔNG báo — kênh phụ; mã bung sẵn để đọc, KHÔNG vào bộ đối chiếu (điều phối là nguồn chính)
        cancelledGuestEntries: (input.cancelledGuestEntries ?? [])
          .map((e) => ({
            name: e.name.trim(),
            bookingCode: e.bookingCode.trim(),
            guests: e.guests || 0,
            source: e.source.trim(),
            refund: e.refund || 0,
            note: (e.note ?? "").trim(),
            // Chưa xuất vé thì bỏ luôn mã vé — nhóm này không có gì để thu hồi
            codes: e.noTicket ? [] : parseTicketCodeList(spot === "ha-noi" ? "" : (e.codesText ?? "")).codes,
            noTicket: Boolean(e.noTicket),
            paid: e.paid || 0,
            refundMethod: e.refundMethod === "cash" ? "cash" : "transfer",
          }))
          .filter((e) => e.name || e.guests || e.bookingCode || e.codes.length),
        rescheduledGuestEntries: (input.rescheduledGuestEntries ?? [])
          .map((e) => ({
            ...e,
            name: e.name.trim(),
            note: (e.note ?? "").trim(),
            codes: parseTicketCodeList(spot === "ha-noi" ? "" : (e.codesText ?? "")).codes,
          }))
          .filter((e) => e.name || e.guests || e.toDate || e.codes.length),
        // Phí bãi + nước: đặc thù RIÊNG Hà Nội (Sa Pa, Khau Phạ được miễn phí)
        siteFeeGuests: spot === "ha-noi" ? input.siteFeeGuests : 0,
        waterCost: spot === "ha-noi" ? input.waterCost : 0,
        guestCarCost: input.guestCarCost,
        /**
         * Ba khoản đưa đón (BigC / khách sạn / xe lên núi) là đặc thù RIÊNG
         * của điểm Hà Nội — điểm khác gửi gì cũng ghi 0 để số liệu không lẫn.
         */
        pickupBigC: spot === "ha-noi" ? input.pickupBigC : 0,
        pickupHotel: spot === "ha-noi" ? input.pickupHotel : 0,
        mountainTrips: spot === "ha-noi" ? input.mountainTrips : 0,
        // PPG chỉ bay ở Khau Phạ — điểm khác gửi gì cũng ghi 0
        ppgFlights: spot === "khau-pha" ? input.ppgFlights : 0,
        ppgCodes: spot === "khau-pha" ? ppg.codes : [],
        ppgNoTicket: spot === "khau-pha" ? input.ppgNoTicket : 0,
        // Suất ăn & xe — thanh toán với bếp và đội xe theo ngày/tháng
        mealBreakfast: input.mealBreakfast ?? 0,
        mealLunch: input.mealLunch ?? 0,
        mealDinner: input.mealDinner ?? 0,
        motorbikeRides: input.motorbikeRides ?? 0,
        carRides: input.carRides ?? 0,
        expenses,
        note: input.note,
        submitted: input.submit,
        ...(input.submit ? { submittedAt: new Date() } : { submittedAt: undefined }),
        ...penaltySet,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<any>();

  // Trả lời NGAY, bảng tính nhận số sau vài giây — xem pushSheetInBackground
  pushSheetInBackground(() => pushPilotRow(doc), PilotDailyReport, doc._id);

  return {
    report: toPilotDTO({ ...doc, sheetSynced: false, sheetError: "đang gửi sang bảng tính…" }),
    warnings,
  };
}

/**
 * Trạng thái chốt của NGÀY, ghi kèm mọi dòng trên bảng tính.
 *
 * Nhờ cột này kế toán mở bảng ra là biết dòng nào đã khoá, dòng nào còn sửa
 * được — số vẫn chảy sang bảng ngay khi nhân viên lưu (tránh mất dữ liệu), chỉ
 * khác là mang nhãn "chưa chốt" cho tới khi kế toán bấm chốt.
 */
async function dayStatusLabel(spot: string, date: string): Promise<string> {
  const close = await AccountantDailyClose.findOne({ spot, date }).select("status").lean<any>();
  return close?.status === "closed" ? "ĐÃ CHỐT" : "chưa chốt";
}

/**
 * Dựng dòng + đẩy báo cáo phi công sang thẻ riêng của người đó theo tháng.
 * Tách riêng để hàm đẩy lại (resyncSheets) dùng chung, khỏi chép hai bản cột.
 */
/**
 * Phi công báo NHẦM NGÀY: xoá hẳn báo cáo của mình ở ngày đó.
 *
 * Trước đây không có đường ra: đưa hết số về 0 thì không chốt lại được (chốt
 * đòi phải có chuyến), mà để nháp thì kế toán cũng không chốt ngày được. Xoá là
 * cách đúng vì theo quy tắc "0 chuyến thì không cần báo cáo" — ngày đó phải
 * TRẮNG chứ không phải có một bản ghi rỗng.
 *
 * Kế toán đã chốt ngày thì không cho xoá — phải nhờ gỡ khoá, y như khi sửa số.
 * Dòng trên bảng tính được ghi đè thành "ĐÃ XOÁ" kèm số 0 để giữ dấu vết.
 */
export async function deleteMyPilotReport(
  session: BaobaySession,
  spotRaw: string,
  date: string,
): Promise<{ deleted: boolean }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  if (await isDayClosed(spot, date)) {
    throw new BaobayError(`Ngày ${formatDateKeyVN(date)} đã được kế toán chốt — nhờ kế toán gỡ khoá rồi xoá.`, 409);
  }

  const doc = await PilotDailyReport.findOneAndDelete({
    accountId: new mongoose.Types.ObjectId(session.id),
    spot,
    date,
  }).lean<any>();
  if (!doc) return { deleted: false };

  // Bảng tính: ghi đè dòng cũ bằng số 0 + trạng thái ĐÃ XOÁ, không để số cũ nằm lại
  runInBackground(() =>
    pushPilotRow({
      ...doc,
      flightCount: 0,
      ticketCodes: [],
      flycam: 0,
      flycamCodes: [],
      video360: 0,
      video360Codes: [],
      redFlag: 0,
      redFlagCodes: [],
      sunset: 0,
      sunsetCodes: [],
      flagFlight: 0,
      flagFlightCodes: [],
      diplomaticGuests: 0,
      diplomaticCodes: [],
      ppgFlights: 0,
      ppgCodes: [],
      siteFeeGuests: 0,
      waterCost: 0,
      guestCarCost: 0,
      pickupBigC: 0,
      pickupHotel: 0,
      mountainTrips: 0,
      expenses: [],
      latePenalty: 0,
      note: `ĐÃ XOÁ (phi công báo nhầm ngày)${doc.note ? ` — ghi chú cũ: ${doc.note}` : ""}`,
      submitted: false,
      deletedRow: true,
    }),
  );
  runInBackground(() => pushDaySummaryRow(spot, date));
  return { deleted: true };
}

async function pushPilotRow(doc: any) {
  return pushBaobayRow(
    "pilot",
    {
      key: `${doc.date}|${doc.username}`,
      date: formatDateKeyVN(doc.date),
      pilotName: doc.pilotName,
      username: doc.username,
      spot: doc.spot || "",
      flightCount: doc.flightCount,
      ticketCount: (doc.ticketCodes || []).length,
      ticketCodes: (doc.ticketCodes || []).join(", "),
      flycam: doc.flycam || 0,
      flycamCodes: (doc.flycamCodes || []).join(", "),
      video360: doc.video360,
      video360Codes: (doc.video360Codes || []).join(", "),
      redFlag: doc.redFlag || 0,
      redFlagCodes: (doc.redFlagCodes || []).join(", "),
      sunset: doc.sunset || 0,
      sunsetCodes: (doc.sunsetCodes || []).join(", "),
      flagFlight: doc.flagFlight || 0,
      flagFlightCodes: (doc.flagFlightCodes || []).join(", "),
      diplomaticGuests: doc.diplomaticGuests || 0,
      diplomaticCodes:
        (doc.diplomaticCodes || []).join(", ") +
        (doc.diplomaticNote ? `${(doc.diplomaticCodes || []).length ? " — " : ""}${doc.diplomaticNote}` : ""),
      siteFeeGuests: doc.siteFeeGuests || 0,
      waterCost: doc.waterCost || 0,
      guestCarCost: doc.guestCarCost || 0,
      thuTotal: thuTotal(doc.expenses),
      otherExpense: expenseTotal(doc.expenses),
      expenseDetail: formatExpenses(doc.expenses),
      expenseTotal: pilotExpenseTotal(doc),
      note: doc.note || "",
      submitted: doc.deletedRow ? "ĐÃ XOÁ" : doc.submitted ? "ĐÃ CHỐT" : "còn nháp",
      dayStatus: await dayStatusLabel(doc.spot, doc.date),
      latePenalty: doc.latePenalty || 0,
      // Có dấu vết nộp muộn nhưng đã được kế toán (hoặc luật 0 chuyến) huỷ phạt
      penaltyWaived: doc.lateSubmit && doc.latePenaltyWaived
        ? `đã huỷ phạt${doc.latePenaltyWaiveReason ? `: ${doc.latePenaltyWaiveReason}` : ""}`
        : "",
      updatedAt: nowStampVN(),
    },
    // Bảng tính chia thẻ theo từng phi công theo tháng (docs/baocao-apps-script.md)
    `${doc.pilotName} ${doc.date.slice(0, 7)}`,
    await sheetTargetForSpot(doc.spot),
  );
}

export async function listPilotReportsOfAccount(
  accountId: string,
  spot: string,
  limit = 30,
): Promise<PilotReportDTO[]> {
  await connectDB();
  // Danh sách tự tra của phi công dừng ở cửa sổ 45 ngày — phần cũ hơn đã khoá
  const docs = await PilotDailyReport.find({
    accountId,
    spot: normalizeSpot(spot),
    date: { $gte: shiftDateKey(todayInVN(), -PILOT_VIEW_LIMIT_DAYS) },
  })
    .sort({ date: -1 })
    .limit(limit)
    .lean<any[]>();
  return docs.map(toPilotDTO);
}

/** Báo cáo của MỌI phi công trong một ngày — cho kế toán sửa trực tiếp. */
export async function listPilotReportsOfDate(spot: string, date: string): Promise<PilotReportDTO[]> {
  await connectDB();
  const docs = await PilotDailyReport.find({ spot: normalizeSpot(spot), date }).sort({ pilotName: 1 }).lean<any[]>();
  return docs.map(toPilotDTO);
}

export async function getPilotReport(
  accountId: string,
  spot: string,
  date: string,
): Promise<PilotReportDTO | null> {
  await connectDB();
  const doc = await PilotDailyReport.findOne({ accountId, spot: normalizeSpot(spot), date }).lean<any>();
  return doc ? toPilotDTO(doc) : null;
}

function toPilotDTO(doc: any): PilotReportDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    username: doc.username,
    pilotName: doc.pilotName,
    flightCount: doc.flightCount ?? 0,
    ticketCodes: doc.ticketCodes ?? [],
    flycam: doc.flycam ?? 0,
    flycamCodes: doc.flycamCodes ?? [],
    video360: doc.video360 ?? 0,
    video360Codes: doc.video360Codes ?? [],
    redFlag: doc.redFlag ?? 0,
    redFlagCodes: doc.redFlagCodes ?? [],
    sunset: doc.sunset ?? 0,
    sunsetCodes: doc.sunsetCodes ?? [],
    flagFlight: doc.flagFlight ?? 0,
    flagFlightCodes: doc.flagFlightCodes ?? [],
    diplomaticGuests: doc.diplomaticGuests ?? 0,
    diplomaticCodes: doc.diplomaticCodes ?? [],
    diplomaticNoTicket: doc.diplomaticNoTicket ?? 0,
    diplomaticNote: doc.diplomaticNote ?? "",
    cancelledGuestEntries: doc.cancelledGuestEntries ?? [],
    rescheduledGuestEntries: doc.rescheduledGuestEntries ?? [],
    siteFeeGuests: doc.siteFeeGuests ?? 0,
    waterCost: doc.waterCost ?? 0,
    guestCarCost: doc.guestCarCost ?? 0,
    pickupBigC: doc.pickupBigC ?? 0,
    pickupHotel: doc.pickupHotel ?? 0,
    mountainTrips: doc.mountainTrips ?? 0,
    ppgFlights: doc.ppgFlights ?? 0,
    ppgCodes: doc.ppgCodes ?? [],
    ppgNoTicket: doc.ppgNoTicket ?? 0,
    mealBreakfast: doc.mealBreakfast ?? 0,
    mealLunch: doc.mealLunch ?? 0,
    mealDinner: doc.mealDinner ?? 0,
    motorbikeRides: doc.motorbikeRides ?? 0,
    carRides: doc.carRides ?? 0,
    expenses: doc.expenses ?? [],
    note: doc.note ?? "",
    submitted: Boolean(doc.submitted),
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).toISOString() : undefined,
    lateSubmit: Boolean(doc.lateSubmit),
    latePenalty: doc.latePenalty ?? 0,
    latePenaltyWaived: Boolean(doc.latePenaltyWaived),
    latePenaltyWaivedBy: doc.latePenaltyWaivedBy || undefined,
    latePenaltyWaiveReason: doc.latePenaltyWaiveReason || undefined,
    sheetSynced: Boolean(doc.sheetSynced),
    sheetError: doc.sheetError || undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/**
 * Kế toán sửa báo cáo của MỘT phi công ngay trên giao diện kế toán.
 *
 * Mượn toàn bộ đường lưu của phi công (cùng kiểm tra, cùng đối chiếu, cùng đẩy
 * Sheets) bằng cách dựng phiên "đứng tên" phi công đó — khác duy nhất: người
 * gọi là kế toán. Ngày đã chốt vẫn bị khoá như thường; muốn sửa thì gỡ khoá
 * ngày trước, đúng một cửa duy nhất.
 */
export async function upsertPilotReportByAccountant(
  accountant: BaobaySession,
  targetUsername: string,
  input: PilotReportSaveInput,
): Promise<SaveResult<PilotReportDTO>> {
  await connectDB();

  const target = await BaobayAccount.findOne({ username: normalizeUsername(targetUsername) }).lean<AccountDoc | null>();
  if (!target) throw new BaobayError(`Không tìm thấy tài khoản “${targetUsername}”`, 404);
  if (target.role !== "pilot") {
    throw new BaobayError(`“${target.displayName}” không phải phi công`, 400);
  }

  // Kế toán phải có quyền ở điểm bay đó; phi công cũng phải được chỉ định điểm ấy.
  assertSpotAllowed(accountant, input.spot);
  return upsertPilotReport(toSession(target), input);
}

/**
 * Kế toán sửa hộ báo cáo ĐIỀU PHỐI — cùng lý do với sửa hộ phi công: kế toán
 * là quyền cao nhất về số liệu, không thể để một ô sai của quầy vé treo cả
 * ngày trong khi người nhập đã về nhà. Đi cùng một đường lưu (cùng kiểm tra,
 * cùng chặn ngày khoá, cùng đẩy bảng tính).
 */
export async function upsertDispatcherReportByAccountant(
  accountant: BaobaySession,
  targetUsername: string,
  input: DispatcherReportSaveInput,
): Promise<SaveResult<DispatcherReportDTO>> {
  await connectDB();

  const target = await BaobayAccount.findOne({ username: normalizeUsername(targetUsername) }).lean<AccountDoc | null>();
  if (!target) throw new BaobayError(`Không tìm thấy tài khoản “${targetUsername}”`, 404);
  if (!isDispatcherLike(target.role)) {
    throw new BaobayError(`“${target.displayName}” không phải điều phối / quầy vé`, 400);
  }

  assertSpotAllowed(accountant, input.spot);
  return upsertDispatcherReport(toSession(target), input);
}

/** Kế toán sửa hộ báo cáo CAMERA MAN. */
export async function upsertCameramanReportByAccountant(
  accountant: BaobaySession,
  targetUsername: string,
  input: CameramanReportSaveInput,
): Promise<SaveResult<CameramanReportDTO>> {
  await connectDB();

  const target = await BaobayAccount.findOne({ username: normalizeUsername(targetUsername) }).lean<AccountDoc | null>();
  if (!target) throw new BaobayError(`Không tìm thấy tài khoản “${targetUsername}”`, 404);
  if (target.role !== "cameraman") {
    throw new BaobayError(`“${target.displayName}” không phải camera man`, 400);
  }

  assertSpotAllowed(accountant, input.spot);
  return upsertCameramanReport(toSession(target), input);
}

/** Danh sách báo cáo điều phối của một ngày — cho khung sửa hộ của kế toán. */
export async function listDispatcherReportsOfDate(spot: string, date: string): Promise<DispatcherReportDTO[]> {
  await connectDB();
  const docs = await DispatcherDailyReport.find({ spot: normalizeSpot(spot), date })
    .sort({ staffName: 1 })
    .lean<any[]>();
  return docs.map(toDispatcherDTO);
}

/** Danh sách báo cáo camera man của một ngày — cho khung sửa hộ của kế toán. */
export async function listCameramanReportsOfDate(spot: string, date: string): Promise<CameramanReportDTO[]> {
  await connectDB();
  const docs = await CameramanDailyReport.find({ spot: normalizeSpot(spot), date })
    .sort({ cameramanName: 1 })
    .lean<any[]>();
  return docs.map(toCameramanDTO);
}

/* ================================================================== */
/* Báo cáo điều phối bay                                               */
/* ================================================================== */

export type DispatcherReportSaveInput = {
  /** Điểm bay của báo cáo — mỗi điểm là một hệ thống riêng. */
  spot: string;
  date: string;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  issuedRanges: Array<{ from: string; to: string }>;
  /** Vé huỷ theo nhóm đoàn: nhiều mã một ô + lý do + tên liên hệ. */
  cancelledEntries: Array<{ codesText: string; reason: string; contactName: string; note?: string }>;
  /** HÀ NỘI: nhóm KHÁCH huỷ/dời — điểm không vé thu thập theo khách. */
  cancelledGuestEntries?: Array<{
    name: string;
    bookingCode: string;
    guests: number;
    source: string;
    refund: number;
    note?: string;
    codesText?: string;
    /** Huỷ khi CHƯA XUẤT VÉ: không có mã vé, chỉ hoàn tiền. */
    noTicket?: boolean;
    paid?: number;
    refundMethod?: "cash" | "transfer";
  }>;
  rescheduledGuestEntries?: Array<{ name: string; guests: number; toDate: string; note?: string; phone?: string; pickup?: "self" | "other"; pickupNote?: string; expectedTime?: string; codesText?: string; bookedId?: string }>;
  /** Dời lịch theo nhóm: nhiều mã một ô + ngày + lý do + liên hệ + sđt. */
  rescheduledEntries: Array<{
    codesText: string;
    toDate: string;
    reason: string;
    contactName: string;
    phone: string;
    note?: string;
  }>;
  /** Khách ngoại giao: mã vé + tiền thu (nếu có). */
  diplomaticEntries: Array<{ codesText: string; amount: number; note?: string }>;
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
  sunset: number;
  sunsetCodesText: string;
  flagFlight: number;
  flagFlightCodesText: string;
  cashReceived: number;
  transferReceived: number;
  /** Khoản thu có tên (nút +): nội dung – tiền mặt/CK – số tiền. */
  revenueEntries: Array<{ content: string; method: "cash" | "transfer"; amount: number }>;
  guestWaterCost: number;
  mountainCarCost: number;
  shuttleCarCost: number;
  expenses: Array<{ content: string; amount: number; kind?: "thu" | "chi"; note?: string }>;
  note: string;
  /** true = chốt ca, false = lưu nháp. Chốt lại được, y như phi công. */
  submit: boolean;
};

/**
 * DÒ MÃ VÉ ĐÃ XUẤT Ở NGÀY KHÁC.
 *
 * Quầy hay gõ nhầm dải mã sang seri của ngày trước (21/08 có ca xuất trùng
 * hẳn mã của ngày khác). Mã vé là giấy có seri — một mã chỉ được xuất MỘT
 * LẦN, trùng nghĩa là hoặc gõ nhầm, hoặc vé bị dùng lại: cả hai đều phải kêu.
 *
 * Dò trong BA sổ: dải mã quầy đã khai, mã phi công báo đã bay, và mã ghi trên
 * booking. Bỏ qua chính ngày đang khai (sửa lại báo cáo của mình không phải là
 * trùng). Trả về từng mã kèm nơi đã dùng để người nhập biết đường lần.
 */
export async function findDuplicateTicketCodes(
  spotRaw: string,
  date: string,
  codes: string[],
): Promise<Array<{ code: string; usedOn: string; where: string }>> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const wanted = [...new Set(codes.map((c) => normalizeTicketCode(c)).filter(Boolean))];
  if (!wanted.length) return [];

  const [dispatchers, pilots] = await Promise.all([
    DispatcherDailyReport.find({ spot, date: { $ne: date } })
      .select("date staffName issuedRanges")
      .lean<any[]>(),
    PilotDailyReport.find({ spot, date: { $ne: date }, ticketCodes: { $in: wanted } })
      .select("date pilotName ticketCodes")
      .lean<any[]>(),
  ]);

  const hits = new Map<string, { code: string; usedOn: string; where: string }>();
  const want = new Set(wanted);

  for (const d of dispatchers) {
    const { codes: issued } = expandTicketRanges(d.issuedRanges ?? []);
    for (const c of issued) {
      if (!want.has(c) || hits.has(c)) continue;
      hits.set(c, {
        code: c,
        usedOn: d.date,
        where: `quầy đã khai xuất${d.staffName ? ` (${d.staffName})` : ""}`,
      });
    }
  }
  for (const p of pilots) {
    for (const c of p.ticketCodes ?? []) {
      const code = normalizeTicketCode(c);
      if (!want.has(code) || hits.has(code)) continue;
      hits.set(code, {
        code,
        usedOn: p.date,
        where: `phi công báo đã bay${p.pilotName ? ` (${p.pilotName})` : ""}`,
      });
    }
  }
  return [...hits.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export async function upsertDispatcherReport(
  session: BaobaySession,
  input: DispatcherReportSaveInput,
): Promise<SaveResult<DispatcherReportDTO>> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  await assertDayOpen(spot, input.date);

  const warnings: string[] = [];

  const { ranges, warnings: rangeWarnings } = normalizeRanges(input.issuedRanges);
  warnings.push(...rangeWarnings);

  const rangeTotal = ranges.reduce((s, r) => s + r.count, 0);
  if (rangeTotal && input.ticketsIssued && rangeTotal !== input.ticketsIssued) {
    warnings.push(`Các dải mã cho ra ${rangeTotal} vé, khác số vé đã xuất đã khai (${input.ticketsIssued}).`);
  }

  /** MÃ TRÙNG NGÀY KHÁC — kêu ngay lúc lưu, không chặn (có thể là seri in lại). */
  const { codes: issuedCodes } = expandTicketRanges(ranges);
  const dupes = await findDuplicateTicketCodes(spot, input.date, issuedCodes);
  for (const d of dupes.slice(0, 8)) {
    warnings.push(
      `⚠ Mã ${d.code} ĐÃ XUẤT ngày ${formatDateKeyVN(d.usedOn)} — ${d.where}. Kiểm lại dải mã của hôm nay.`,
    );
  }
  if (dupes.length > 8) warnings.push(`… và ${dupes.length - 8} mã trùng nữa.`);

  /**
   * Vé huỷ / dời lịch nhập theo NHÓM ĐOÀN (nhiều mã một ô, chung lý do + liên
   * hệ). Máy chủ bung từng nhóm thành mã, giữ cả hai bản: bản nhóm để đọc lại
   * đúng như đã nhập, bản phẳng cho bộ đối chiếu và Sheets.
   */
  /** Hà Nội không xuất vé giấy — các ô vé ép 0/rỗng, nhóm huỷ/dời ghi chú thay mã. */
  const noTickets = spot === "ha-noi";

  const cancelledEntries: CancelEntryDTO[] = [];
  const cancelledFlat: string[] = [];
  for (const raw of input.cancelledEntries) {
    const parsedCodes = parseTicketCodeList(noTickets ? "" : raw.codesText);
    const note = (raw.note ?? "").trim();
    if (!parsedCodes.codes.length && !raw.reason.trim() && !raw.contactName.trim() && !note) continue;
    if (parsedCodes.invalid.length) {
      warnings.push(`Vé huỷ: bỏ qua cụm không đọc được "${parsedCodes.invalid.slice(0, 3).join(", ")}"`);
    }
    cancelledEntries.push({
      codes: parsedCodes.codes,
      reason: raw.reason.trim(),
      contactName: raw.contactName.trim(),
      note,
    });
    cancelledFlat.push(...parsedCodes.codes);
  }


  /**
   * Nhóm KHÁCH huỷ/dời (tên, mã book, số khách, tiền hoàn…) chạy ở MỌI điểm —
   * điểm có vé (Khau Phạ, Sa Pa) nhập thêm MÃ VÉ của nhóm, mã bung vào danh
   * sách phẳng cho bộ đối chiếu như vé huỷ thường.
   */
  const cancelledGuestEntries = (input.cancelledGuestEntries ?? [])
    .map((e) => {
      /** Huỷ khi CHƯA XUẤT VÉ: không có mã nào để thu hồi, nên không đọc mã. */
      const parsed = parseTicketCodeList(noTickets || e.noTicket ? "" : (e.codesText ?? ""));
      if (parsed.invalid.length) {
        warnings.push(`Khách huỷ: bỏ qua cụm mã không đọc được "${parsed.invalid.slice(0, 3).join(", ")}"`);
      }
      return {
        name: e.name.trim(),
        bookingCode: e.bookingCode.trim(),
        guests: e.guests || 0,
        source: e.source.trim(),
        refund: e.refund || 0,
        note: (e.note ?? "").trim(),
        codes: parsed.codes,
        noTicket: Boolean(e.noTicket),
        paid: e.paid || 0,
        refundMethod: e.refundMethod === "cash" ? "cash" : "transfer",
      };
    })
    .filter((e) => e.name || e.guests || e.bookingCode || e.codes.length);
  for (const e of cancelledGuestEntries) cancelledFlat.push(...e.codes);
  const cancelledCodesAll = [...new Set(cancelledFlat)];
  if (cancelledCodesAll.length !== cancelledFlat.length) {
    warnings.push("Có mã vé huỷ xuất hiện ở hai nhóm — chỉ tính một lần.");
  }

  const rescheduledGuestEntries = (input.rescheduledGuestEntries ?? [])
    .map((e) => {
      const parsed = parseTicketCodeList(noTickets ? "" : (e.codesText ?? ""));
      if (parsed.invalid.length) {
        warnings.push(`Khách dời: bỏ qua cụm mã không đọc được "${parsed.invalid.slice(0, 3).join(", ")}"`);
      }
      return { ...e, note: (e.note ?? "").trim(), codes: parsed.codes };
    })
    .filter((e) => e.name.trim() || e.guests || e.toDate || e.codes.length);
  for (const e of rescheduledGuestEntries) {
    if (!e.toDate) warnings.push(`Nhóm khách dời "${e.name || "?"}" chưa ghi dời sang ngày nào`);
  }

  // HN đếm theo đầu KHÁCH trong các nhóm; điểm có vé đếm theo mã
  const cancelledCount = noTickets
    ? cancelledGuestEntries.reduce((a, e) => a + (e.guests || 0), 0)
    : cancelledCodesAll.length;

  const rescheduledEntries: RescheduleEntryDTO[] = [];
  const rescheduled: RescheduledDTO[] = [];
  for (const raw of input.rescheduledEntries) {
    const parsedCodes = parseTicketCodeList(noTickets ? "" : raw.codesText);
    const note = (raw.note ?? "").trim();
    if (!parsedCodes.codes.length && !raw.toDate && !raw.contactName.trim() && !note) continue;
    if (!raw.toDate) {
      warnings.push(`Nhóm dời lịch "${(noTickets ? note : raw.codesText).slice(0, 30)}" chưa ghi dời sang ngày nào`);
    }
    rescheduledEntries.push({
      codes: parsedCodes.codes,
      toDate: raw.toDate,
      reason: raw.reason.trim(),
      contactName: raw.contactName.trim(),
      phone: raw.phone.trim(),
      note,
    });
    for (const code of parsedCodes.codes) {
      rescheduled.push({ code, toDate: raw.toDate, note: raw.reason.trim() || undefined });
    }
  }
  // Mã vé trong NHÓM KHÁCH dời (điểm có vé) cũng là vé dời — vào cùng danh sách phẳng
  for (const e of rescheduledGuestEntries) {
    for (const code of e.codes) {
      rescheduled.push({ code, toDate: e.toDate, note: e.note || undefined });
    }
  }

  const diplomaticEntries: DiploEntryDTO[] = [];
  const diplomaticFlat: string[] = [];
  let diplomaticAmount = 0;
  for (const raw of input.diplomaticEntries) {
    const parsedCodes = parseTicketCodeList(raw.codesText);
    const dNote = (raw.note ?? "").trim();
    if (!parsedCodes.codes.length && !raw.amount && !dNote) continue;
    diplomaticEntries.push({ codes: parsedCodes.codes, amount: raw.amount, note: dNote });
    diplomaticFlat.push(...parsedCodes.codes);
    diplomaticAmount += raw.amount;
  }
  const diplomaticCodesUnique = [...new Set(diplomaticFlat)];

  const { list: expenses, warnings: expenseWarnings } = normalizeExpenses(input.expenses);
  warnings.push(...expenseWarnings);

  /** Khoản thu có tên: bỏ dòng trống, tiền phải dương. */
  const revenueEntries = (input.revenueEntries ?? [])
    .map((e) => ({
      content: (e.content || "").trim(),
      method: e.method === "transfer" ? ("transfer" as const) : ("cash" as const),
      amount: e.amount || 0,
    }))
    .filter((e) => e.amount > 0 || e.content);

  const returned = cancelledCount + rescheduled.length;
  if (!noTickets && input.ticketsReturned && input.ticketsReturned !== returned) {
    warnings.push(
      `Số vé thu về đã khai (${input.ticketsReturned}) khác tổng huỷ + dời lịch (${cancelledCount} + ${rescheduled.length} = ${returned}).`,
    );
  }

  const doc = await DispatcherDailyReport.findOneAndUpdate(
    { accountId: new mongoose.Types.ObjectId(session.id), date: input.date, spot },
    {
      $set: {
        username: session.username,
        staffName: session.name,
        spot,
        guestCount: input.guestCount,
        ticketsIssued: noTickets ? 0 : input.ticketsIssued,
        ticketsReturned: noTickets ? 0 : input.ticketsReturned,
        issuedRanges: noTickets ? [] : ranges,
        cancelledCount,
        cancelledCodes: cancelledCodesAll,
        cancelledEntries,
        cancelledGuestEntries,
        rescheduledCount: noTickets
          ? rescheduledGuestEntries.reduce((a, e) => a + (e.guests || 0), 0)
          : rescheduled.length,
        rescheduled,
        rescheduledEntries,
        rescheduledGuestEntries,
        diplomaticEntries,
        diplomaticAmount,
        flycam: input.flycam,
        flycamCodes: parseTicketCodeList(input.flycamCodesText).codes,
        video360: input.video360,
        video360ServiceCodes: parseTicketCodeList(input.video360CodesText).codes,
        redFlag: input.redFlag,
        redFlagCodes: parseTicketCodeList(input.redFlagCodesText).codes,
        sunset: input.sunset,
        sunsetCodes: parseTicketCodeList(input.sunsetCodesText).codes,
        flagFlight: input.flagFlight,
        flagFlightCodes: parseTicketCodeList(input.flagFlightCodesText).codes,
        diplomaticGuests: diplomaticCodesUnique.length,
        diplomaticCodes: diplomaticCodesUnique,
        /**
         * Hai tổng LƯU LUÔN cả các khoản thu có tên — mọi phép đối chiếu và
         * bảng tổng hợp phía sau đọc hai số này, không phải cộng lại lần nữa.
         * Form đọc ngược ra ô "tiền vé" bằng phép trừ (tổng − các dòng).
         */
        cashReceived:
          input.cashReceived +
          revenueEntries.filter((e) => e.method === "cash").reduce((a, e) => a + e.amount, 0),
        transferReceived:
          input.transferReceived +
          revenueEntries.filter((e) => e.method === "transfer").reduce((a, e) => a + e.amount, 0),
        revenueEntries,
        guestWaterCost: input.guestWaterCost,
        mountainCarCost: input.mountainCarCost,
        shuttleCarCost: input.shuttleCarCost,
        expenses,
        note: input.note,
        submitted: input.submit,
        // null (không phải undefined) mới xoá được mốc chốt cũ khi quay về nháp —
        // Mongoose bỏ qua undefined trong $set nên mốc cũ sẽ nằm lại.
        submittedAt: input.submit ? new Date() : null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<any>();

  // Trả lời NGAY, bảng tính nhận số sau vài giây — xem pushSheetInBackground
  pushSheetInBackground(() => pushDispatcherRow(doc), DispatcherDailyReport, doc._id);

  return {
    report: toDispatcherDTO({ ...doc, sheetSynced: false, sheetError: "đang gửi sang bảng tính…" }),
    warnings,
  };
}

/** Dựng dòng + đẩy báo cáo điều phối sang tab "Điều phối". */
async function pushDispatcherRow(doc: any) {
  return pushBaobayRow("dispatcher", {
    key: `${doc.date}|${doc.username}`,
    date: formatDateKeyVN(doc.date),
    staffName: doc.staffName,
    username: doc.username,
    spot: doc.spot || "",
    guestCount: doc.guestCount,
    ticketsIssued: doc.ticketsIssued,
    ticketsReturned: doc.ticketsReturned,
    issuedRanges: formatRanges(doc.issuedRanges),
    cancelledCount: doc.cancelledCount,
    cancelledCodes: (doc.cancelledCodes || []).join(", "),
    cancelledDetail:
      (doc.cancelledGuestEntries || [])
        .map(
          (e: any) =>
            `${e.name || "khách"}${e.bookingCode ? ` (${e.bookingCode})` : ""} ×${e.guests}${(e.codes || []).length ? ` [${e.codes.join(" ")}]` : ""}${e.source ? ` — ${e.source}` : ""}${e.refund ? ` — hoàn ${(e.refund || 0).toLocaleString("vi-VN")}đ` : ""}${e.note ? ` — ${e.note}` : ""}`,
        )
        .join(" | ") ||
      (doc.cancelledEntries || [])
        .map(
          (e: CancelEntryDTO) =>
            `${e.codes.length ? e.codes.join(" ") : e.note || "khách"} — ${e.reason || "?"}${e.contactName ? ` — ${e.contactName}` : ""}${e.codes.length && e.note ? ` (${e.note})` : ""}`,
        )
        .join(" | "),
    rescheduledCount: doc.rescheduledCount,
    rescheduledCodes: formatRescheduled(doc.rescheduled),
    rescheduledDetail:
      (doc.rescheduledGuestEntries || [])
        .map(
          (e: any) =>
            `${e.name || "khách"} ×${e.guests}${e.phone ? ` (${e.phone})` : ""}${(e.codes || []).length ? ` [${e.codes.join(" ")}]` : ""} → ${e.toDate ? formatDateKeyVN(e.toDate) : "?"}${e.pickup === "other" ? ` — đón ${e.pickupNote || "?"}` : ""}${e.expectedTime ? ` ${e.expectedTime}` : ""}${e.note ? ` — ${e.note}` : ""}`,
        )
        .join(" | ") ||
      (doc.rescheduledEntries || [])
      .map(
        (e: RescheduleEntryDTO) =>
          `${e.codes.length ? e.codes.join(" ") : e.note || "khách"} → ${e.toDate || "?"} — ${e.reason || "?"}${e.contactName ? ` — ${e.contactName}` : ""}${e.phone ? ` (${e.phone})` : ""}${e.codes.length && e.note ? ` (${e.note})` : ""}`,
      )
      .join(" | "),
    diplomaticAmount: doc.diplomaticAmount || 0,
    flycam: doc.flycam,
    video360: doc.video360,
    redFlag: doc.redFlag,
    sunset: doc.sunset || 0,
    flagFlight: doc.flagFlight,
    diplomaticGuests: doc.diplomaticGuests,
    diplomaticCodes: (doc.diplomaticCodes || []).join(", "),
    cashReceived: doc.cashReceived,
    transferReceived: doc.transferReceived,
    revenueDetail: (doc.revenueEntries ?? [])
      .map((e: any) => `${e.content || "?"}: ${(e.amount || 0).toLocaleString("vi-VN")}đ (${e.method === "transfer" ? "CK" : "TM"})`)
      .join(" | "),
    revenueTotal: (doc.cashReceived || 0) + (doc.transferReceived || 0),
    dayStatus: await dayStatusLabel(doc.spot, doc.date),
    guestWaterCost: doc.guestWaterCost || 0,
    mountainCarCost: doc.mountainCarCost || 0,
    shuttleCarCost: doc.shuttleCarCost || 0,
    otherExpense: expenseTotal(doc.expenses),
    expenseDetail: formatExpenses(doc.expenses),
    expenseTotal: dispatcherExpenseTotal(doc),
    note: doc.note || "",
    submitted: doc.submitted ? "ĐÃ CHỐT" : "còn nháp",
    updatedAt: nowStampVN(),
  },
  undefined,
  await sheetTargetForSpot(doc.spot),
  );
}

export async function listDispatcherReportsOfAccount(
  accountId: string,
  spot: string,
  limit = 30,
): Promise<DispatcherReportDTO[]> {
  await connectDB();
  const docs = await DispatcherDailyReport.find({ accountId, spot: normalizeSpot(spot) }).sort({ date: -1 }).limit(limit).lean<any[]>();
  return docs.map(toDispatcherDTO);
}

export async function getDispatcherReport(
  accountId: string,
  spot: string,
  date: string,
): Promise<DispatcherReportDTO | null> {
  await connectDB();
  const doc = await DispatcherDailyReport.findOne({ accountId, spot: normalizeSpot(spot), date }).lean<any>();
  return doc ? toDispatcherDTO(doc) : null;
}

function toDispatcherDTO(doc: any): DispatcherReportDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    username: doc.username,
    staffName: doc.staffName,
    guestCount: doc.guestCount ?? 0,
    ticketsIssued: doc.ticketsIssued ?? 0,
    ticketsReturned: doc.ticketsReturned ?? 0,
    issuedRanges: doc.issuedRanges ?? [],
    cancelledCount: doc.cancelledCount ?? 0,
    cancelledCodes: doc.cancelledCodes ?? [],
    cancelledEntries: doc.cancelledEntries ?? [],
    cancelledGuestEntries: doc.cancelledGuestEntries ?? [],
    rescheduledGuestEntries: doc.rescheduledGuestEntries ?? [],
    rescheduledCount: doc.rescheduledCount ?? 0,
    rescheduled: doc.rescheduled ?? [],
    rescheduledEntries: doc.rescheduledEntries ?? [],
    diplomaticEntries: doc.diplomaticEntries ?? [],
    diplomaticAmount: doc.diplomaticAmount ?? 0,
    flycam: doc.flycam ?? 0,
    flycamCodes: doc.flycamCodes ?? [],
    video360: doc.video360 ?? 0,
    video360ServiceCodes: doc.video360ServiceCodes ?? [],
    redFlag: doc.redFlag ?? 0,
    redFlagCodes: doc.redFlagCodes ?? [],
    sunset: doc.sunset ?? 0,
    sunsetCodes: doc.sunsetCodes ?? [],
    flagFlight: doc.flagFlight ?? 0,
    flagFlightCodes: doc.flagFlightCodes ?? [],
    diplomaticGuests: doc.diplomaticGuests ?? 0,
    diplomaticCodes: doc.diplomaticCodes ?? [],
    cashReceived: doc.cashReceived ?? 0,
    transferReceived: doc.transferReceived ?? 0,
    revenueEntries: (doc.revenueEntries ?? []).map((e: any) => ({
      content: e.content || "",
      method: e.method === "transfer" ? ("transfer" as const) : ("cash" as const),
      amount: e.amount ?? 0,
    })),
    guestWaterCost: doc.guestWaterCost ?? 0,
    mountainCarCost: doc.mountainCarCost ?? 0,
    shuttleCarCost: doc.shuttleCarCost ?? 0,
    expenses: doc.expenses ?? [],
    note: doc.note ?? "",
    submitted: Boolean(doc.submitted),
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).toISOString() : undefined,
    sheetSynced: Boolean(doc.sheetSynced),
    sheetError: doc.sheetError || undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Báo cáo camera man                                                  */
/* ================================================================== */

export type CameramanReportSaveInput = {
  /** Điểm bay của báo cáo — mỗi điểm là một hệ thống riêng. */
  spot: string;
  date: string;
  flycamFlights: number;
  flycamCodesText: string;
  paraglidingFlights: number;
  paraglidingCodesText: string;
  expenses: Array<{ content: string; amount: number; kind?: "thu" | "chi"; note?: string }>;
  note: string;
  submit: boolean;
};

export async function upsertCameramanReport(
  session: BaobaySession,
  input: CameramanReportSaveInput,
): Promise<SaveResult<CameramanReportDTO>> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  await assertDayOpen(spot, input.date);

  const warnings: string[] = [];
  const codes = parseTicketCodeList(input.flycamCodesText);
  const paraCodes = parseTicketCodeList(input.paraglidingCodesText);

  if (codes.malformed.length) {
    warnings.push(`Mã vé flycam sai dạng: ${codes.malformed.slice(0, 5).join(", ")}. ${TICKET_CODE_HINT}`);
  }
  if (codes.codes.length && codes.codes.length !== input.flycamFlights) {
    warnings.push(
      `Số mã vé flycam (${codes.codes.length}) khác số lượng đã khai (${input.flycamFlights}).`,
    );
  }
  if (paraCodes.codes.length && paraCodes.codes.length !== input.paraglidingFlights) {
    warnings.push(
      `Số mã vé quay dù lượn (${paraCodes.codes.length}) khác số lượng đã khai (${input.paraglidingFlights}).`,
    );
  }

  const { list: expenses, warnings: expenseWarnings } = normalizeExpenses(input.expenses);
  warnings.push(...expenseWarnings);

  const doc = await CameramanDailyReport.findOneAndUpdate(
    { accountId: new mongoose.Types.ObjectId(session.id), date: input.date, spot },
    {
      $set: {
        username: session.username,
        cameramanName: session.name,
        spot,
        flycamFlights: input.flycamFlights,
        flycamCodes: codes.codes,
        paraglidingFlights: input.paraglidingFlights,
        paraglidingCodes: paraCodes.codes,
        expenses,
        note: input.note,
        submitted: input.submit,
        ...(input.submit ? { submittedAt: new Date() } : { submittedAt: undefined }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<any>();

  // Trả lời NGAY, bảng tính nhận số sau vài giây — xem pushSheetInBackground
  pushSheetInBackground(() => pushCameramanRow(doc), CameramanDailyReport, doc._id);

  return {
    report: toCameramanDTO({ ...doc, sheetSynced: false, sheetError: "đang gửi sang bảng tính…" }),
    warnings,
  };
}

/** Dựng dòng + đẩy báo cáo camera man sang tab "Camera man". */
async function pushCameramanRow(doc: any) {
  return pushBaobayRow("cameraman", {
    key: `${doc.date}|${doc.username}`,
    date: formatDateKeyVN(doc.date),
    cameramanName: doc.cameramanName,
    username: doc.username,
    flycamFlights: doc.flycamFlights,
    flycamCodes: (doc.flycamCodes || []).join(", "),
    paraglidingFlights: doc.paraglidingFlights || 0,
    paraglidingCodes: (doc.paraglidingCodes || []).join(", "),
    thuTotal: thuTotal(doc.expenses),
    otherExpense: expenseTotal(doc.expenses),
    expenseDetail: formatExpenses(doc.expenses),
    note: doc.note || "",
    submitted: doc.submitted ? "ĐÃ CHỐT" : "còn nháp",
    dayStatus: await dayStatusLabel(doc.spot, doc.date),
    updatedAt: nowStampVN(),
  },
  undefined,
  await sheetTargetForSpot(doc.spot),
  );
}

export async function listCameramanReportsOfAccount(
  accountId: string,
  spot: string,
  limit = 30,
): Promise<CameramanReportDTO[]> {
  await connectDB();
  const docs = await CameramanDailyReport.find({ accountId, spot: normalizeSpot(spot) }).sort({ date: -1 }).limit(limit).lean<any[]>();
  return docs.map(toCameramanDTO);
}

export async function getCameramanReport(
  accountId: string,
  spot: string,
  date: string,
): Promise<CameramanReportDTO | null> {
  await connectDB();
  const doc = await CameramanDailyReport.findOne({ accountId, spot: normalizeSpot(spot), date }).lean<any>();
  return doc ? toCameramanDTO(doc) : null;
}

function toCameramanDTO(doc: any): CameramanReportDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    username: doc.username,
    cameramanName: doc.cameramanName,
    flycamFlights: doc.flycamFlights ?? 0,
    flycamCodes: doc.flycamCodes ?? [],
    paraglidingFlights: doc.paraglidingFlights ?? 0,
    paraglidingCodes: doc.paraglidingCodes ?? [],
    expenses: doc.expenses ?? [],
    note: doc.note ?? "",
    submitted: Boolean(doc.submitted),
    submittedAt: doc.submittedAt ? new Date(doc.submittedAt).toISOString() : undefined,
    sheetSynced: Boolean(doc.sheetSynced),
    sheetError: doc.sheetError || undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Nhân sự đưa tiền cho quản lý/giám đốc                               */
/* ================================================================== */

export type HandoverSaveInput = {
  spot: string;
  date: string;
  /** "handover" = đưa tiền cho quản lý · "advance" = xin ứng tiền. */
  kind: "handover" | "advance";
  /** Người nhận tiền (giao tiền) hoặc người duyệt (ứng tiền). */
  recipientUsername: string;
  amount: number;
  method: "cash" | "transfer";
  content: string;
};

/**
 * Ai được chọn làm người nhận tiền tại một điểm bay.
 *
 * Chỉ ba vai trò thật sự cầm tiền của công ty: quản trị (giám đốc), kế toán và
 * điều phối (quầy vé). Bỏ chính mình ra khỏi danh sách — không ai tự giao tiền
 * cho mình.
 */
const HANDOVER_RECIPIENT_ROLES: BaobayRole[] = ["admin", "accountant", "dispatcher"];

/**
 * Ai được duyệt ỨNG TIỀN: chỉ kế toán và quản trị — đây là tiền công ty chi ra,
 * điều phối không có thẩm quyền đó.
 */
const ADVANCE_APPROVER_ROLES: BaobayRole[] = ["accountant", "admin"];

export async function listHandoverRecipients(
  session: BaobaySession,
  spotRaw: string,
  kind: "handover" | "advance" = "handover",
): Promise<Array<{ username: string; name: string; role: BaobayRole; roleLabel: string }>> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  /**
   * Kế toán / quản trị GIAO TIỀN được cho MỌI nhân sự — đường chuyển lương,
   * hoàn tiền chi hộ. Nhân sự thường vẫn chỉ nộp lên ba vai trò giữ quỹ.
   * Người nhận vẫn phải bấm xác nhận trên trang mình như mọi lệnh khác.
   */
  const senderIsFinance = session.role === "accountant" || session.role === "admin";
  const allowed: BaobayRole[] =
    kind === "advance"
      ? ADVANCE_APPROVER_ROLES
      : senderIsFinance
        ? ["admin", "accountant", "dispatcher", "counter", "pilot", "cameraman"]
        : HANDOVER_RECIPIENT_ROLES;

  const docs = await BaobayAccount.find({
    role: { $in: allowed },
    isActive: true,
    spots: spot,
    username: { $ne: session.username },
  })
    .select("username displayName role")
    .lean<any[]>();

  const rank = (r: BaobayRole) => allowed.indexOf(r);
  return docs
    .map((d) => ({
      username: d.username,
      name: d.displayName,
      role: d.role as BaobayRole,
      roleLabel: ROLE_LABEL[d.role as BaobayRole] ?? d.role,
    }))
    .sort((a, b) => rank(a.role) - rank(b.role) || a.name.localeCompare(b.name, "vi"));
}

/**
 * Nhân sự (phi công / điều phối / camera man) khai một lần đưa tiền.
 *
 * KHÔNG gọi assertDayOpen: đưa tiền không phải sửa số liệu của ngày, nên ngày
 * đã chốt vẫn khai được — tiền có thể đưa muộn vài hôm.
 */
export async function createHandover(
  session: BaobaySession,
  input: HandoverSaveInput,
): Promise<HandoverDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);

  if (input.amount <= 0) throw new BaobayError("Chưa nhập số tiền");

  const isAdvance = input.kind === "advance";
  if (isAdvance && !input.content.trim()) {
    throw new BaobayError("Ứng tiền phải ghi rõ nội dung ứng");
  }

  /**
   * Người nhận/người duyệt phải là tài khoản thật, còn hoạt động, có mặt ở đúng
   * điểm bay và không phải chính mình — kiểm ở máy chủ, không tin danh sách
   * trình duyệt gửi lên.
   */
  const recipient = await BaobayAccount.findOne({
    username: normalizeUsername(input.recipientUsername),
  })
    .select("username displayName role isActive spots")
    .lean<any>();

  if (!recipient) throw new BaobayError("Không tìm thấy người nhận tiền");
  if (!recipient.isActive) throw new BaobayError(`Tài khoản “${recipient.displayName}” đã bị khoá`);
  if (recipient.username === session.username) throw new BaobayError("Không thể tự giao tiền cho chính mình");
  const financeSender = session.role === "accountant" || session.role === "admin";
  const allowedRoles: BaobayRole[] = isAdvance
    ? ADVANCE_APPROVER_ROLES
    : financeSender
      ? ["admin", "accountant", "dispatcher", "counter", "pilot", "cameraman"]
      : HANDOVER_RECIPIENT_ROLES;
  if (!allowedRoles.includes(recipient.role)) {
    throw new BaobayError(
      isAdvance
        ? `“${recipient.displayName}” không có quyền duyệt ứng tiền (chỉ kế toán hoặc quản trị)`
        : `“${recipient.displayName}” không phải người nhận tiền của điểm bay`,
    );
  }
  if (!normalizeSpotList(recipient.spots).includes(spot)) {
    throw new BaobayError(`“${recipient.displayName}” không làm ở ${spotName(spot)}`);
  }

  const doc = await BaobayHandover.create({
    kind: isAdvance ? "advance" : "handover",
    spot,
    date: input.date,
    accountId: new mongoose.Types.ObjectId(session.id),
    username: session.username,
    staffName: session.name,
    role: session.role,
    /**
     * Kế toán/quản trị CHUYỂN TIỀN xuống nhân sự thường (lương, hoàn phí…) là
     * tiền cá nhân của người nhận — đánh dấu như lệnh tài chính lập để KHÔNG
     * cộng vào "tiền giữ hộ công ty" của họ. Chuyển giữa những người giữ quỹ
     * (nộp lên giám đốc/kế toán/điều phối) vẫn là dòng tiền quỹ như cũ.
     */
    createdBy:
      !isAdvance && financeSender && !HANDOVER_RECIPIENT_ROLES.includes(recipient.role)
        ? session.username
        : undefined,
    recipientId: recipient._id,
    recipientUsername: recipient.username,
    recipientName: recipient.displayName,
    recipientRole: recipient.role,
    amount: input.amount,
    method: input.method,
    content: input.content?.trim() || undefined,
  });

  const saved = doc.toObject();
  pushSheetInBackground(() => pushHandoverRow(saved), BaobayHandover, saved._id);

  return toHandoverDTO({ ...saved, sheetSynced: false });
}

export type FinanceOrderCategory = "luong" | "ung" | "phi" | "khac";

const ORDER_LABEL: Record<FinanceOrderCategory, string> = {
  luong: "Chuyển lương",
  ung: "Ứng tiền",
  phi: "Trả phí",
  khac: "Chuyển tiền",
};

/**
 * KẾ TOÁN / QUẢN TRỊ chủ động lập LỆNH CHUYỂN TIỀN cho một nhân sự — chuyển
 * lương, ứng, trả phí hay khoản khác. Nhân sự vào app bấm "Đã nhận tiền" là
 * xong hai bên.
 *
 * Riêng loại Ứ NG: bản ghi đứng tên NGƯỜI HƯỞNG (username/accountId là nhân sự)
 * để tiền tự cộng vào cột "Tiền ứng" và trừ vào lương của đúng người — người
 * xác nhận cũng chính là họ. Ba loại còn lại là lệnh GIAO TIỀN bình thường,
 * đứng tên người lập, nhân sự là bên nhận.
 */
export async function createFinanceOrder(
  session: BaobaySession,
  spotRaw: string,
  input: {
    targetUsername: string;
    category: FinanceOrderCategory;
    date: string;
    amount: number;
    method: "cash" | "transfer";
    content: string;
  },
): Promise<HandoverDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  if (session.role !== "accountant" && session.role !== "admin") {
    throw new BaobayError("Chỉ kế toán hoặc quản trị được lập lệnh chuyển tiền", 403);
  }
  if (input.amount <= 0) throw new BaobayError("Chưa nhập số tiền");

  const target = await BaobayAccount.findOne({ username: normalizeUsername(input.targetUsername) })
    .select("username displayName role isActive spots")
    .lean<any>();
  if (!target) throw new BaobayError("Không tìm thấy nhân sự");
  if (!target.isActive) throw new BaobayError(`Tài khoản “${target.displayName}” đã bị khoá`);
  if (target.username === session.username) throw new BaobayError("Không lập lệnh cho chính mình");
  if (!normalizeSpotList(target.spots).includes(spot)) {
    throw new BaobayError(`“${target.displayName}” không làm ở ${spotName(spot)}`);
  }

  const label = ORDER_LABEL[input.category];
  const content = input.content.trim() ? `${label}: ${input.content.trim()}` : label;
  const isAdvance = input.category === "ung";

  const doc = await BaobayHandover.create({
    kind: isAdvance ? "advance" : "handover",
    spot,
    date: input.date,
    /**
     * Ứng: đứng tên người hưởng để trừ đúng lương. Còn lại: đứng tên người
     * lập (kế toán giao tiền), nhân sự là bên nhận — như lệnh giao tiền thường.
     */
    accountId: isAdvance ? target._id : new mongoose.Types.ObjectId(session.id),
    username: isAdvance ? target.username : session.username,
    staffName: isAdvance ? target.displayName : session.name,
    role: isAdvance ? target.role : session.role,
    recipientId: target._id,
    recipientUsername: target.username,
    recipientName: target.displayName,
    recipientRole: target.role,
    createdBy: session.username,
    amount: input.amount,
    method: input.method,
    content,
  });

  const saved = doc.toObject();
  pushSheetInBackground(() => pushHandoverRow(saved), BaobayHandover, saved._id);
  return toHandoverDTO(saved);
}

/** Các lệnh do CHÍNH MÌNH lập gần đây — để kế toán theo dõi ai đã bấm nhận. */
export async function listOrdersCreatedBy(
  session: BaobaySession,
  spotRaw: string,
  limit = 20,
): Promise<HandoverDTO[]> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const docs = await BaobayHandover.find({ spot, createdBy: session.username })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<any[]>();
  return docs.map(toHandoverDTO);
}

/** Các lần đưa tiền của CHÍNH mình, mới nhất trước — để nhân sự theo dõi đã ai nhận chưa. */
export async function listMyHandovers(
  session: BaobaySession,
  spot: string,
  limit = 20,
): Promise<HandoverDTO[]> {
  await connectDB();
  const docs = await BaobayHandover.find({
    accountId: new mongoose.Types.ObjectId(session.id),
    spot: normalizeSpot(spot),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<any[]>();
  return docs.map(toHandoverDTO);
}

/**
 * Tiền người khác giao CHO MÌNH — hộp thư đến, khoản chờ xác nhận lên trước.
 *
 * Bản ghi cũ (trước khi có chọn người nhận) mặc định gửi cho quản trị, nên tài
 * khoản quản trị vẫn nhận được chúng.
 */
export async function listIncomingHandovers(
  session: BaobaySession,
  spotRaw: string,
  limit = 30,
): Promise<HandoverDTO[]> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const addressedToMe: any[] = [{ recipientUsername: session.username }];
  if (session.role === "admin") {
    addressedToMe.push({ recipientUsername: { $in: [null, ""] } });
  }

  const docs = await BaobayHandover.find({ spot, $or: addressedToMe })
    .sort({ confirmed: 1, date: -1, createdAt: -1 })
    .limit(limit)
    .lean<any[]>();
  return docs.map(toHandoverDTO);
}

/** Mọi khoản đưa tiền của một điểm bay trong khoảng ngày — cho trang quản trị. */
export async function listHandovers(spotRaw: string, from: string, to: string): Promise<HandoverDTO[]> {
  await connectDB();
  const docs = await BaobayHandover.find({
    spot: normalizeSpot(spotRaw),
    date: { $gte: from, $lte: to },
  })
    .sort({ confirmed: 1, date: -1, createdAt: -1 })
    .lean<any[]>();
  return docs.map(toHandoverDTO);
}

/**
 * Đếm khoản CHƯA xác nhận ở TỪNG điểm bay, để trang quản trị chấm số đỏ lên nút
 * điểm bay — giám đốc liếc một cái là biết chỗ nào còn tiền chưa nhận.
 *
 * Không giới hạn khoảng ngày: khoản chờ từ tuần trước vẫn phải nhắc, không được
 * biến mất chỉ vì lọt ra ngoài "30 ngày gần đây".
 */
export async function countPendingHandoversBySpot(spots: string[]): Promise<Record<string, number>> {
  await connectDB();

  const ids = normalizeSpotList(spots);
  const rows = await BaobayHandover.aggregate<{ _id: string; count: number }>([
    { $match: { spot: { $in: ids }, confirmed: false, rejected: { $ne: true } } },
    { $group: { _id: "$spot", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const r of rows) counts[r._id] = r.count;
  return counts;
}

/**
 * NGƯỜI NHẬN xác nhận ĐÃ NHẬN, hoặc từ chối kèm lý do.
 *
 * Ai được bấm: đúng người được chọn làm người nhận, hoặc tài khoản quản trị
 * (giám đốc luôn nhìn thấy mọi lệnh của điểm bay mình quản, và các bản ghi cũ
 * chưa ghi người nhận thì mặc định là của quản trị).
 *
 * Cố ý KHÔNG kiểm ngày đã chốt: đây là chữ ký nhận tiền, không phải sửa số liệu.
 */
export async function confirmHandover(
  id: string,
  by: { username: string; role: BaobayRole | "admin"; viaAdmin?: boolean },
  reject?: string,
): Promise<{ ok: true; handover: HandoverDTO } | { ok: false; error: string }> {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, error: "Mã khoản tiền không hợp lệ" };

  const doc = await BaobayHandover.findById(id).lean<any>();
  if (!doc) return { ok: false, error: "Không tìm thấy khoản tiền này" };
  if (doc.confirmed) return { ok: false, error: "Khoản này đã được xác nhận trước đó" };

  const isRecipient = doc.recipientUsername
    ? doc.recipientUsername === by.username
    : by.role === "admin" || by.viaAdmin === true;
  const isAdmin = by.role === "admin" || by.viaAdmin === true;
  if (!isRecipient && !isAdmin) {
    return {
      ok: false,
      error: `Khoản này giao cho ${doc.recipientName || "người khác"} — chỉ người đó xác nhận được`,
    };
  }

  const set = reject
    ? { rejected: true, rejectedReason: reject, confirmed: false }
    : { confirmed: true, confirmedAt: new Date(), confirmedBy: by.username, rejected: false };

  const updated = await BaobayHandover.findByIdAndUpdate(id, { $set: set }, { new: true }).lean<any>();

  // Bảng tính ghi đè đúng dòng cũ — chạy nền, người bấm không phải chờ Google
  pushSheetInBackground(() => pushHandoverRow(updated), BaobayHandover, updated._id);

  return { ok: true, handover: toHandoverDTO(updated) };
}

async function pushHandoverRow(doc: any) {
  return pushBaobayRow(
    doc.kind === "advance" ? "advance" : "handover",
    {
      key: String(doc._id),
      date: formatDateKeyVN(doc.date),
      spot: doc.spot,
      staffName: doc.staffName,
      username: doc.username,
      role: ROLE_LABEL[doc.role as BaobayRole] ?? doc.role,
      recipientName: doc.recipientName || "Quản lý/giám đốc",
      recipientRole: ROLE_LABEL[doc.recipientRole as BaobayRole] ?? doc.recipientRole ?? "",
      amount: doc.amount ?? 0,
      method: doc.method === "transfer" ? "Chuyển khoản" : "Tiền mặt",
      content: doc.content || "",
      status: doc.rejected ? "TỪ CHỐI" : doc.confirmed ? "ĐÃ NHẬN" : "chờ xác nhận",
      confirmedAt: doc.confirmedAt ? new Date(doc.confirmedAt).toLocaleString("vi-VN") : "",
      confirmedBy: doc.confirmedBy || "",
      rejectedReason: doc.rejectedReason || "",
      updatedAt: nowStampVN(),
    },
    undefined,
    await sheetTargetForSpot(doc.spot),
  );
}

function toHandoverDTO(doc: any): HandoverDTO {
  return {
    id: String(doc._id),
    kind: doc.kind === "advance" ? "advance" : "handover",
    spot: doc.spot,
    date: doc.date,
    username: doc.username,
    staffName: doc.staffName,
    role: doc.role,
    recipientUsername: doc.recipientUsername || "",
    recipientName: doc.recipientName || "Quản lý/giám đốc",
    recipientRole: doc.recipientRole || "admin",
    amount: doc.amount ?? 0,
    method: doc.method === "transfer" ? "transfer" : "cash",
    content: doc.content || "",
    createdBy: doc.createdBy || undefined,
    confirmed: Boolean(doc.confirmed),
    confirmedAt: doc.confirmedAt ? new Date(doc.confirmedAt).toISOString() : undefined,
    confirmedBy: doc.confirmedBy || undefined,
    rejected: Boolean(doc.rejected),
    rejectedReason: doc.rejectedReason || undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Số tiền nhân sự ĐANG GIỮ                                            */
/* ================================================================== */

export type CashOnHandDTO = {
  /**
   * Tiền nhân sự khác NỘP LÊN cho mình, hai bên đã xác nhận — cộng vào số đang
   * giữ của người nhận (điều phối/kế toán cầm tiền anh em nộp lên là đang cầm
   * hộ công ty). Lệnh do kế toán/quản trị LẬP (lương, trả phí…) không tính:
   * đó là tiền cá nhân được trả, không phải tiền công ty gửi giữ.
   */
  received: number;
  spot: string;
  /** Khoảng ngày đã cộng; rỗng nghĩa là cộng toàn bộ lịch sử. */
  from: string;
  to: string;
  /** Tiền thu hộ công ty: các dòng THU trong sổ, và với điều phối là tiền mặt bán vé. */
  collected: number;
  /** Chi ngay tại bãi, trừ thẳng vào tiền đang cầm. */
  spent: number;
  /** Đã đưa và giám đốc ĐÃ ký nhận. */
  handedConfirmed: number;
  /** Đã khai đưa nhưng giám đốc chưa ký nhận — vẫn trừ, chỉ là còn treo. */
  handedPending: number;
  /** Giám đốc từ chối: cộng trả lại vào tiền đang giữ. */
  handedRejected: number;
  /** collected − spent − (confirmed + pending). Âm nghĩa là công ty nợ lại nhân sự. */
  holding: number;
};

/**
 * Tiền nhân sự đang cầm hộ công ty.
 *
 *   đang giữ = thu hộ − chi tại bãi − đã đưa quản lý
 *
 * Khoản đã khai đưa được trừ NGAY, không đợi giám đốc ký: người đưa tiền không
 * còn cầm nữa thì không thể vẫn tính là họ giữ. Chỗ giám đốc chưa ký được tách
 * riêng (`handedPending`) để hai bên nhìn thấy phần còn treo. Khoản bị TỪ CHỐI
 * cộng ngược trở lại — tiền chưa tới tay giám đốc thì vẫn là nhân sự giữ.
 *
 * `from`/`to` bỏ trống thì cộng toàn bộ lịch sử — đó mới là số dư thật; truyền
 * khoảng ngày chỉ để xem phát sinh trong kỳ.
 */
/* ================================================================== */
/* BẢNG TIỀN TRONG NGÀY — ai đang cầm bao nhiêu, khách nào đã trả       */
/* ================================================================== */

export type MoneyBoardItem = {
  /** Tên khách (lệnh thu) hoặc nội dung khoản (sổ THU CHI). */
  label: string;
  bookingCode: string;
  guests: number;
  amount: number;
  /** Mã giao dịch ngân hàng — chỉ có ở khoản chuyển khoản. */
  transferCode: string;
  /** Nguồn số: "lệnh thu" hay "sổ thu chi" — để biết đường tìm lại. */
  from: string;
  /** Người thu khoản này (chỉ có ở khoản tiền mặt) — để biết tiền đang ở tay ai. */
  by?: string;
  /** Số thứ tự của booking trong ngày bay — 0 khi khoản không gắn với booking nào. */
  daySeq: number;
};

export type MoneyBoardPerson = {
  username: string;
  name: string;
  role: string;
  total: number;
  items: MoneyBoardItem[];
};

export type MoneyBoard = {
  date: string;
  /** Tiền khách chuyển thẳng vào TK công ty — không ai cầm. */
  transfer: { total: number; items: MoneyBoardItem[] };
  /** Tiền mặt trong ngày, tách theo từng người đang cầm. */
  cashByPerson: MoneyBoardPerson[];
  /** TỪNG KHOẢN tiền mặt khách đã trả — khách nào, ai thu (danh sách phẳng). */
  cashItems: MoneyBoardItem[];
  cashTotal: number;
  /** Tiền CHI trong ngày, tách theo từng người đứng ra chi. */
  spendByPerson: MoneyBoardPerson[];
  spendTotal: number;
  /** Công ty CHI thẳng từ TK (chiết khấu trả đại lý bằng chuyển khoản). */
  companySpend: { total: number; items: MoneyBoardItem[] };
  /**
   * DOANH SỐ CỦA NGÀY — tiền gắn với các booking BAY hôm nay, bất kể thu vào
   * hôm nào. Đứng cạnh "hôm nay thu" (tiền về trong ngày, gồm cả cọc của ngày
   * khác) theo đúng cách chủ muốn nhìn: hai con số, hai câu hỏi khác nhau.
   */
  dayRevenue: { collected: number; totalValue: number; remaining: number };
  /** ĐẠI LÝ NỢ: khách của ngày đã trả cho đại lý bao nhiêu — đại lý phải chuyển về. */
  agencyDebts: Array<{ name: string; amount: number; bookings: string[] }>;
};

/**
 * Ai đang cầm bao nhiêu tiền mặt trong ngày, và khách nào đã chuyển khoản.
 *
 * Gom từ HAI nguồn, vì tiền vào tay nhân sự bằng hai đường khác nhau:
 *  - LỆNH THU TIỀN (gồm cả nút "thu tiền" trên booking): có tên khách, mã booking.
 *  - Sổ THU CHI trong báo cáo ngày: phi công/camera man thu tại bãi ghi ở đây.
 *
 * Chỉ tính khoản đã hoàn tất (lệnh thu trạng thái "collected") — lệnh còn chờ
 * người ta xác nhận thì tiền chưa nằm trong tay ai.
 */
export async function getMoneyBoardOfDay(spotRaw: string, date: string): Promise<MoneyBoard> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);

  const [collects, pilots, dispatchers, cameramen, commissionBookings, flycamRefunds, refunds] = await Promise.all([
    BaobayCollect.find({ spot, date }).lean<any[]>(),
    PilotDailyReport.find({ spot, date }).select("username pilotName expenses").lean<any[]>(),
    DispatcherDailyReport.find({ spot, date }).select("username staffName expenses").lean<any[]>(),
    CameramanDailyReport.find({ spot, date }).select("username cameramanName expenses").lean<any[]>(),
    // Chiết khấu đại lý đã chi cho các đoàn bay hôm nay
    BaobayBooking.find({ spot, flightDate: date, "commission.amount": { $gt: 0 } })
      .select("contactName bookingCode daySeq guestCount commission")
      .lean<any[]>(),
    // Hoàn tiền khách vì huỷ flycam
    BaobayFlycamCancel.find({ spot, date, status: { $in: ["done", "paid"] } }).lean<any[]>(),
    // Hoàn tiền khách (huỷ bay, huỷ dịch vụ) đã thực hiện xong
    BaobayRefund.find({ spot, date, status: { $in: ["done", "paid"] } }).lean<any[]>(),
  ]);

  /** Doanh số ngày: tổng giá trị và phần đã thu của các booking bay hôm nay. */
  const revenueBookings = await BaobayBooking.find({
    spot,
    flightDate: date,
    status: { $in: ["open", "done"] },
  })
    .select("totalAmount remaining")
    .lean<any[]>();
  const dayRevenue = {
    totalValue: revenueBookings.reduce((a, b) => a + (b.totalAmount || 0), 0),
    remaining: revenueBookings.reduce((a, b) => a + Math.max(0, b.remaining || 0), 0),
    collected: 0,
  };
  dayRevenue.collected = Math.max(0, dayRevenue.totalValue - dayRevenue.remaining);

  /**
   * Công nợ ĐẠI LÝ của ngày: gom theo tên, kèm khách nào để đối chiếu.
   *
   * Số phải đòi là số ĐẠI LÝ CÒN NỢ THẬT, không phải số khách đã trả họ: chiết
   * khấu trả theo đường "trừ vào tiền đại lý đang cầm" thì đại lý giữ luôn phần
   * đó, chỉ hoàn công ty phần còn lại. Không trừ ở đây là kế toán đi đòi thừa.
   */
  const agencyBookings = await BaobayBooking.find({
    spot,
    flightDate: date,
    agencyPaidAmount: { $gt: 0 },
    status: { $nin: ["cancelled", "voided"] },
  })
    .select("agencyPaidAmount agencyName contactName daySeq source commission")
    .lean<any[]>();
  const debtByName = new Map<string, { name: string; amount: number; bookings: string[] }>();
  for (const b of agencyBookings) {
    // Thiếu ô tên đại lý thì lấy NGUỒN ĐẶT — khách đặt qua đại lý nào thì nguồn là đại lý đó
    const name = (b.agencyName || "").trim() || (b.source || "").trim() || "(chưa ghi tên đại lý)";
    const giuLai = agencyKeptCommission(b);
    const conNo = Math.max(0, (b.agencyPaidAmount || 0) - giuLai);
    const cur = debtByName.get(name) ?? { name, amount: 0, bookings: [] as string[] };
    cur.amount += conNo;
    cur.bookings.push(
      `#${b.daySeq || "?"} ${b.contactName || ""} (${(conNo / 1000).toLocaleString("vi-VN")}k` +
        (giuLai > 0
          ? `, đã giữ lại ${(giuLai / 1000).toLocaleString("vi-VN")}k chiết khấu`
          : "") +
        ")",
    );
    debtByName.set(name, cur);
  }
  const agencyDebts = [...debtByName.values()]
    .filter((a) => a.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  /**
   * Tra SỐ THỨ TỰ booking cho từng khoản: ưu tiên bookingId (lệnh thu bấm từ
   * booking), rồi mã booking / tên khách trong đúng ngày — lệnh thu cũ chưa lưu
   * bookingId vẫn ra số.
   */
  const ids = collects.map((c) => c.bookingId).filter(Boolean);
  const dayBookings = await BaobayBooking.find({
    $or: [...(ids.length ? [{ _id: { $in: ids } }] : []), { spot, flightDate: date }],
  })
    .select("bookingCode contactName daySeq")
    .lean<any[]>();
  const seqById = new Map(dayBookings.map((b) => [String(b._id), Number(b.daySeq) || 0]));
  const seqByCode = new Map<string, number>();
  const seqByName = new Map<string, number>();
  for (const b of dayBookings) {
    if (b.bookingCode) seqByCode.set(String(b.bookingCode).trim().toLowerCase(), Number(b.daySeq) || 0);
    if (b.contactName) seqByName.set(String(b.contactName).trim().toLowerCase(), Number(b.daySeq) || 0);
  }
  const seqOfCollect = (c: any): number =>
    (c.bookingId && seqById.get(String(c.bookingId))) ||
    (c.bookingCode && seqByCode.get(String(c.bookingCode).trim().toLowerCase())) ||
    (c.guestName && seqByName.get(String(c.guestName).trim().toLowerCase())) ||
    0;

  const transferItems: MoneyBoardItem[] = [];
  const cashItems: MoneyBoardItem[] = [];
  const byPerson = new Map<string, MoneyBoardPerson>();
  const spendBy = new Map<string, MoneyBoardPerson>();
  const roleOf = new Map<string, string>();

  const from = (
    store: Map<string, MoneyBoardPerson>,
    username: string,
    name: string,
    role: string,
  ): MoneyBoardPerson => {
    const key = normalizeUsername(username || name);
    let p = store.get(key);
    if (!p) {
      p = { username: key, name: name || key, role, total: 0, items: [] };
      store.set(key, p);
    }
    if (!p.name && name) p.name = name;
    return p;
  };
  const personOf = (username: string, name: string, role: string) => from(byPerson, username, name, role);

  for (const c of collects) {
    const item: MoneyBoardItem = {
      label: c.guestName || c.agency || "khách",
      bookingCode: c.bookingCode || "",
      guests: c.guests || 0,
      amount: c.amount || 0,
      transferCode: c.transferCode || "",
      from: "lệnh thu",
      daySeq: seqOfCollect(c),
    };
    if (c.method === "transfer") {
      transferItems.push(item);
      continue;
    }
    // Tiền mặt: chỉ tính khi người thu đã xác nhận cầm tiền
    if (c.status !== "collected") continue;
    const p = personOf(c.collectorUsername || c.createdByUsername, c.collectorName || c.createdByName, "");
    item.by = p.name;
    p.items.push(item);
    p.total += item.amount;
    cashItems.push(item);
  }

  /** Dòng THU trong sổ thu chi = tiền khách trả tại bãi, người khai đang cầm. */
  const addReportThu = (docs: any[], nameKey: string, role: string) => {
    for (const d of docs) {
      roleOf.set(normalizeUsername(d.username), role);
      for (const e of d.expenses ?? []) {
        if (!(e.amount > 0)) continue;
        /** Dòng CHI: tiền nhân sự đã bỏ ra (nước, xe, chi khác) — kế toán phải hoàn. */
        if (e.kind !== "thu") {
          const sp = from(spendBy, d.username, d[nameKey], role);
          sp.items.push({
            label: e.content || "chi tại bãi",
            bookingCode: "",
            guests: 0,
            amount: e.amount || 0,
            transferCode: "",
            from: "sổ thu chi",
            daySeq: 0,
          });
          sp.total += e.amount || 0;
          continue;
        }
        // Khoản khai là CHUYỂN KHOẢN thì tiền không nằm trong tay ai
        const item: MoneyBoardItem = {
          label: e.content || "thu tại bãi",
          bookingCode: "",
          guests: 0,
          amount: e.amount || 0,
          transferCode: "",
          from: "sổ thu chi",
          // Khoản gõ tay trong sổ không gắn booking nào — không có số
          daySeq: 0,
        };
        if (e.method === "transfer") {
          transferItems.push(item);
          continue;
        }
        const p = personOf(d.username, d[nameKey], role);
        item.by = p.name;
        p.items.push(item);
        p.total += item.amount;
        cashItems.push(item);
      }
    }
  };
  addReportThu(pilots, "pilotName", "pilot");
  addReportThu(dispatchers, "staffName", "dispatcher");
  addReportThu(cameramen, "cameramanName", "cameraman");

  // Vai trò của người chỉ xuất hiện qua lệnh thu: tra trong danh bạ tài khoản
  const missing = [...byPerson.values()].filter((p) => !p.role).map((p) => p.username);
  if (missing.length) {
    const accounts = await BaobayAccount.find({ username: { $in: missing } })
      .select("username role displayName")
      .lean<any[]>();
    for (const a of accounts) {
      const p = byPerson.get(a.username);
      if (!p) continue;
      p.role = a.role;
      if (!p.name) p.name = a.displayName;
    }
  }
  for (const [username, role] of roleOf) {
    const p = byPerson.get(username);
    if (p && !p.role) p.role = role;
  }

  /**
   * CHIẾT KHẤU ĐẠI LÝ — ba đường, tiền đi ba nơi khác nhau:
   *  - tiền mặt: TRỪ vào phần người đó đang giữ (họ rút ví đưa ngay tại bãi);
   *  - chuyển khoản: công ty chi từ TK, không ai phải nộp;
   *  - trừ vào tiền đại lý đang cầm: KHÔNG AI CHI GÌ — đã trừ thẳng vào công nợ
   *    đại lý ở trên, tính thêm một lần nữa ở đây là ghi khống một khoản chi.
   */
  const companySpendItems: MoneyBoardItem[] = [];
  for (const b of commissionBookings) {
    const c = b.commission;
    const item: MoneyBoardItem = {
      // Ghi rõ ĐẠI LÝ NÀO và CHUYỂN VÀO ĐÂU — kế toán chuyển tiền khỏi phải mở
      // từng booking ra tra số tài khoản
      label:
        `chiết khấu đại lý${c.agencyName ? ` ${c.agencyName}` : ""} — ${b.contactName || b.bookingCode || "đoàn khách"}` +
        (c.bankAccount ? ` · STK ${c.bankAccount}${c.bankAccountName ? ` (${c.bankAccountName})` : ""}` : "") +
        (c.note2 ? ` · ${c.note2}` : ""),
      bookingCode: b.bookingCode || "",
      guests: b.guestCount || 0,
      amount: Number(c.amount) || 0,
      transferCode: c.transferCode || "",
      from: "chiết khấu",
      daySeq: Number(b.daySeq) || 0,
      by: c.byName || "",
    };
    if (c.method === "agency") continue;
    if (c.method === "transfer") {
      companySpendItems.push(item);
      continue;
    }
    const p = personOf(c.byUsername, c.byName, "");
    p.items.push({ ...item, amount: -item.amount });
    p.total -= item.amount;
  }

  /**
   * HUỶ FLYCAM: tự hoàn tại bãi thì phi công bay kèm rút tiền đang giữ ra trả
   * ⇒ trừ vào phần họ phải nộp. Công ty chuyển khoản thì tính vào chi từ TK.
   */
  for (const f of flycamRefunds) {
    const item: MoneyBoardItem = {
      label: `hoàn khách huỷ flycam ${f.ticketCode || ""}${f.bookingLabel ? ` — ${f.bookingLabel}` : ""}`,
      bookingCode: f.ticketCode || "",
      guests: 0,
      amount: Number(f.amount) || 0,
      transferCode: f.transferCode || "",
      from: "huỷ flycam",
      daySeq: 0,
      by: f.pilotName || f.createdByName || "",
    };
    if (f.refundMode === "company") {
      companySpendItems.push(item);
      continue;
    }
    const p = personOf(f.pilotUsername, f.pilotName, "pilot");
    p.items.push({ ...item, amount: -item.amount });
    p.total -= item.amount;
  }

  /**
   * HOÀN TIỀN KHÁCH: trả tiền mặt thì người trực rút từ tiền đang giữ ⇒ trừ
   * vào phần họ phải nộp; chuyển khoản (kế toán đã chuyển) thì công ty chi.
   */
  for (const r of refunds) {
    const item: MoneyBoardItem = {
      label: `hoàn khách ${r.guestName || ""}${r.reason ? ` — ${r.reason}` : ""}`,
      bookingCode: r.bookingCode || "",
      guests: r.guests || 0,
      amount: Number(r.amount) || 0,
      transferCode: r.transferCode || "",
      from: "hoàn tiền",
      daySeq: 0,
      by: r.createdByName || "",
    };
    if (r.method === "transfer") {
      companySpendItems.push(item);
      continue;
    }
    const p = personOf(r.createdByUsername, r.createdByName, "");
    p.items.push({ ...item, amount: -item.amount });
    p.total -= item.amount;
  }

  const cashByPerson = [...byPerson.values()]
    .filter((p) => p.total !== 0)
    .sort((a, b) => b.total - a.total);
  // Vai trò của người chỉ xuất hiện ở cột CHI: mượn lại từ bảng vai trò đã tra
  for (const [username, role] of roleOf) {
    const p = spendBy.get(username);
    if (p && !p.role) p.role = role;
  }
  const spendByPerson = [...spendBy.values()].filter((p) => p.total > 0).sort((a, b) => b.total - a.total);

  return {
    date,
    dayRevenue,
    agencyDebts,
    companySpend: { total: companySpendItems.reduce((t, i) => t + i.amount, 0), items: companySpendItems },
    cashItems: cashItems.sort((a, b) => (a.daySeq || 999) - (b.daySeq || 999)),
    spendByPerson,
    spendTotal: spendByPerson.reduce((s, p) => s + p.total, 0),
    transfer: { total: transferItems.reduce((s, i) => s + i.amount, 0), items: transferItems },
    cashByPerson,
    cashTotal: cashByPerson.reduce((s, p) => s + p.total, 0),
  };
}

export async function getCashOnHand(
  session: BaobaySession,
  spotRaw: string,
  from?: string,
  to?: string,
): Promise<CashOnHandDTO> {
  await connectDB();

  const spot = assertSpotAllowed(session, spotRaw);
  const accountId = new mongoose.Types.ObjectId(session.id);
  const dateFilter = from && to ? { date: { $gte: from, $lte: to } } : {};
  const where = { accountId, spot, ...dateFilter };

  let collected = 0;
  let spent = 0;

  if (session.role === "pilot") {
    const docs = await PilotDailyReport.find(where).lean<any[]>();
    for (const d of docs) {
      collected += thuCashTotal(d.expenses);
      spent += pilotExpenseTotal(d);
    }
  } else if (isDispatcherLike(session.role)) {
    const docs = await DispatcherDailyReport.find(where).lean<any[]>();
    for (const d of docs) {
      // Chỉ TIỀN MẶT: khoản chuyển khoản vào thẳng tài khoản công ty, điều phối không cầm
      collected += (d.cashReceived || 0) + thuCashTotal(d.expenses);
      spent += dispatcherExpenseTotal(d);
    }
  } else if (session.role === "cameraman") {
    const docs = await CameramanDailyReport.find(where).lean<any[]>();
    for (const d of docs) {
      collected += thuCashTotal(d.expenses);
      spent += expenseTotal(d.expenses);
    }
  }
  // Kế toán và quản trị không có báo cáo ngày nên không có tiền thu hộ; họ vẫn
  // khai được khoản đưa tiền, số đang giữ khi đó chỉ là phần đã đưa (số âm).

  /**
   * Chỉ tính lệnh GIAO TIỀN. Tiền ứng là công ty chi ra cho cá nhân, trừ vào
   * lương cuối tháng — không liên quan tới số tiền đang cầm hộ công ty.
   */
  const [handovers, receivedDocs, collectDocs, cashCommissions, cashRefunds, cashFlycamRefunds] = await Promise.all([
    BaobayHandover.find({
      accountId,
      spot,
      kind: { $ne: "advance" },
      ...dateFilter,
    })
      .select("amount confirmed rejected createdBy username")
      .lean<any[]>(),
    // Khoản người khác NỘP LÊN cho mình đã xác nhận 2 bên (bỏ lệnh do quản lý lập)
    BaobayHandover.find({
      recipientUsername: session.username,
      spot,
      kind: { $ne: "advance" },
      confirmed: true,
      createdBy: { $in: [null, ""] },
      ...dateFilter,
    })
      .select("amount")
      .lean<any[]>(),
    // Tiền LỆNH THU booking mình đã cầm (tiền mặt đã xác nhận thu) — cũng là tiền giữ hộ công ty
    BaobayCollect.find({
      spot,
      collectorUsername: session.username,
      status: "collected",
      ...dateFilter,
    })
      .select("amount")
      .lean<any[]>(),
    /**
     * BA KHOẢN CHI TIỀN MẶT NGAY TẠI BÃI — người trực rút ví ra trả, nên phải
     * TRỪ vào phần họ đang cầm hộ công ty.
     *
     * Trước đây chỉ "bảng tiền trong ngày" trừ ba khoản này, còn số "đang giữ"
     * của cá nhân thì không — hai chỗ cùng nói về một túi tiền mà ra hai con
     * số. Ms Duyên đếm tay 11.160.000 trong khi app đòi 12.060.000, lệch đúng
     * 900.000 là ba khoản chiết khấu đại lý chị trả tiền mặt ngày 21–22/08.
     *
     * Chiết khấu/hoàn tiền trả bằng CHUYỂN KHOẢN thì công ty chi thẳng từ tài
     * khoản, không ai phải rút ví, nên không tính ở đây.
     */
    BaobayBooking.find({
      spot,
      "commission.method": "cash",
      "commission.byUsername": session.username,
      ...(from && to ? { flightDate: { $gte: from, $lte: to } } : {}),
    })
      .select("commission")
      .lean<any[]>(),
    BaobayRefund.find({
      spot,
      method: "cash",
      createdByUsername: session.username,
      ...dateFilter,
    })
      .select("amount")
      .lean<any[]>(),
    BaobayFlycamCancel.find({
      spot,
      refundMode: { $ne: "company" },
      pilotUsername: session.username,
      ...dateFilter,
    })
      .select("amount")
      .lean<any[]>(),
  ]);
  /**
   * Lệnh thu tiền mặt mình đã cầm là tiền MÌNH THU HỘ, không phải "được nộp
   * lên" — cộng vào `collected` để dòng "Tổng thu hộ cty" trên trang nhân
   * viên nói đúng sự thật (trước đây nó bằng 0 trong khi "đang giữ" thì có
   * tiền, ai nhìn cũng tưởng máy tính sai). Tổng `holding` không đổi vì hai
   * biến này cùng nằm một phía của phép cộng.
   */
  collected += collectDocs.reduce((a, c) => a + (c.amount || 0), 0);
  const received = receivedDocs.reduce((a, h) => a + (h.amount || 0), 0);

  /** Tiền rút ví trả tại bãi: chiết khấu đại lý · hoàn khách · hoàn huỷ flycam. */
  spent += cashCommissions.reduce((a: number, b: any) => a + (Number(b.commission?.amount) || 0), 0);
  spent += cashRefunds.reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0);
  spent += cashFlycamRefunds.reduce((a: number, f: any) => a + (Number(f.amount) || 0), 0);

  let handedConfirmed = 0;
  let handedPending = 0;
  let handedRejected = 0;
  for (const h of handovers) {
    if (h.rejected) handedRejected += h.amount || 0;
    else if (h.confirmed) handedConfirmed += h.amount || 0;
    else handedPending += h.amount || 0;
  }

  return {
    spot,
    from: from || "",
    to: to || "",
    received,
    collected,
    spent,
    handedConfirmed,
    handedPending,
    handedRejected,
    // Nhận của anh em nộp lên cũng là tiền đang cầm hộ công ty
    holding: collected + received - spent - handedConfirmed - handedPending,
  };
}

/* ================================================================== */
/* Booking đặt trước — khách chốt hôm nay, bay ngày khác               */
/* ================================================================== */

export type BookingSaveInput = {
  spot: string;
  flightDate: string;
  source: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  guestCount: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  pickup: "self" | "bigc" | "hotel" | "other";
  pickupNote: string;
  expectedTime: string;
  flightKind?: "pg" | "ppg" | "m650" | "m850";
  ppgGuests?: number;
  comboDiscount?: number;
  pickupFee: number;
  mountainCar: number;
  unitPrice: number;
  discount: number;
  deposit: number;
  agencyPaidAmount?: number;
  agencyName?: string;
  remaining: number;
  transferCode: string;
  depositToCompany?: boolean;
  /** Cọc gõ tay đi đường nào — quầy chọn TM/CK ngay khi nhập. */
  depositMethod?: "cash" | "transfer" | "";
  note: string;
  /** Email khách — app gửi thư báo mỗi khi booking thay đổi. Trống thì không gửi. */
  email?: string;
  /** Ngày khách TRẢ cọc, khi khác ngày lập booking. Trống = đúng hôm lập. */
  depositDate?: string;
  /** Booking sinh từ lệnh DỜI LỊCH — ngày bay cũ, hiện "dời từ dd/mm". */
  rescheduledFrom?: string;
  /** Còn lại > 0: người được chỉ định thu — tự lập LỆNH THU TIỀN kèm booking. */
  collectorUsername?: string;
  collectorNote?: string;
};

/**
 * LỌC NGÀY CỌC gõ trong form booking.
 *
 * Bỏ qua trong im lặng ba trường hợp, KHÔNG chặn cả booking vì chúng — đây là
 * mốc đối soát, không phải số liệu của sổ:
 *  - không có tiền cọc  → ngày cọc vô nghĩa;
 *  - ngày rác / sai lịch → tin vào nó còn tệ hơn để trống;
 *  - ngày TƯƠNG LAI → cọc là tiền đã trả rồi. Gõ nhầm năm mà lọt là khoản đó
 *    biến khỏi mọi danh sách soát, không ai thấy nó nữa.
 */
function cleanDepositDate(raw: unknown, deposit: number): string {
  const v = String(raw ?? "").trim();
  if (!v || deposit <= 0) return "";
  if (!isDateKey(v)) return "";
  return v > todayInVN() ? "" : v;
}

/** "HH:MM" hiện tại theo giờ Việt Nam — chặn giờ dự kiến lùi về quá khứ. */
function nowHHMMVN(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 5);
}

/**
 * "CÒN LẠI PHẢI THU" = TỔNG TIỀN − ĐÃ THU. Máy chủ chốt lại con số này chứ không
 * tin số máy khách gửi lên: mỗi nơi tự tính một kiểu là sinh ra cảnh "tổng
 * 2.190.000 · còn lại 2.340.000" — hai con số chỏi nhau trên cùng một dòng.
 *
 * Ngoại lệ duy nhất: booking CHƯA CÓ tổng tiền (tổng = 0, thường là bản nhập từ
 * thời chưa tính tiền trong app) thì giữ nguyên số đã khai — đó là công nợ thật,
 * tính lại thành 0 là xoá mất nợ.
 */
/**
 * Phần chiết khấu ĐẠI LÝ TỰ GIỮ LẠI từ tiền khách trả họ (`method: "agency"`).
 *
 * Đại lý đang cầm tiền bay của khách; thay vì công ty chi chiết khấu rồi đại lý
 * hoàn đủ, hai bên cấn trừ: đại lý giữ luôn phần chiết khấu, chỉ hoàn phần còn
 * lại. Vì vậy khoản này KHÔNG phải tiền công ty chi ra — nó chỉ làm công nợ đại
 * lý nhỏ đi. Mọi chỗ tính "đại lý còn nợ bao nhiêu" đều phải trừ qua đây, không
 * thì kế toán đi đòi số tiền đại lý không còn cầm.
 */
/** Chữ ngắn cho đường trả chiết khấu — dùng ở dòng xuất bảng và sổ. */
function commissionWayLabel(method?: string): string {
  return method === "transfer" ? "CK" : method === "agency" ? "trừ tiền ĐL cầm" : "TM";
}

function agencyKeptCommission(booking: { commission?: { amount?: number; method?: string } | null }): number {
  const c = booking?.commission;
  if (!c || c.method !== "agency") return 0;
  return Math.max(0, Math.round(Number(c.amount) || 0));
}

function remainingOf(total: number, deposit: number, declared: number, agencyPaid = 0): number {
  // Phần khách đã trả ĐẠI LÝ: khách khỏi trả nữa (đại lý nợ công ty phần đó)
  return total > 0
    ? Math.max(0, total - Math.max(0, deposit) - Math.max(0, agencyPaid))
    : Math.max(0, declared);
}

/** Booking phải nằm ở tương lai: ngày bay không lùi, giờ dự kiến hôm nay không sớm hơn bây giờ. */
function assertBookingTime(flightDate: string, expectedTime: string) {
  const today = todayInVN();
  if (flightDate < today) throw new BaobayError("Ngày bay không thể ở quá khứ", 400);
  if (flightDate === today && expectedTime && expectedTime < nowHHMMVN()) {
    throw new BaobayError(`Giờ dự kiến ${expectedTime} đã qua (bây giờ là ${nowHHMMVN()})`, 400);
  }
}

/**
 * Điều phối nhập booking ngay hôm khách đặt — `createdAt` chính là thời điểm
 * nhập liệu. Booking tự hiện trên trang điều phối vào đúng NGÀY BAY.
 */
/**
 * Số thứ tự kế tiếp của một ngày bay: max hiện có + 1. Số ĐÃ CẤP thì không bao
 * giờ cấp lại — kể cả khách huỷ, số của họ vẫn đứng đó, nên lấy max chứ không
 * đếm số dòng.
 */
export async function nextDaySeq(spot: string, flightDate: string): Promise<number> {
  const top = await BaobayBooking.findOne({ spot, flightDate }).sort({ daySeq: -1 }).select("daySeq").lean<any>();
  return (Number(top?.daySeq) || 0) + 1;
}

export async function createBooking(session: BaobaySession, input: BookingSaveInput): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);

  if (!input.contactName.trim() && !input.bookingCode.trim() && !input.source.trim()) {
    throw new BaobayError("Booking phải có ít nhất nguồn, tên liên hệ hoặc số booking", 400);
  }
  if (input.guestCount <= 0) throw new BaobayError("Booking chưa ghi số khách", 400);
  assertBookingTime(input.flightDate, input.expectedTime.trim());

  /** Dịch vụ bám theo đầu khách: 2 khách thì tối đa 2 flycam, 2 cam360… */
  const services: Array<[string, number]> = [
    ["Flycam", input.flycam],
    ["Camera 360", input.video360],
    ["Dù cờ đỏ", input.redFlag],
    ["Bay hoàng hôn/săn mây", input.sunset],
    ["Bay kéo cờ/bánh", input.flagFlight],
  ];
  for (const [label, count] of services) {
    if (count > input.guestCount) {
      throw new BaobayError(`${label} (${count}) vượt quá số khách (${input.guestCount})`, 400);
    }
  }

  /**
   * "Còn lại (thu trước khi bay)" + người thu: KHÔNG bắt buộc — lúc nhận
   * booking thường chưa biết hôm đó ai trực, ai đón đoàn. Để trống thì booking
   * vẫn ghi rõ "còn thu", đến hôm bay giao cho ai thì người đó lo thu.
   *
   * Có chọn thì kiểm tài khoản TRƯỚC khi tạo booking, để lỗi chọn nhầm người
   * không để lại booking mồ côi.
   */
  const collectorUsername = (input.collectorUsername ?? "").trim();
  const collectorNote = (input.collectorNote ?? "").trim();
  let collector: { username: string; displayName: string } | null = null;
  if (input.remaining > 0 && collectorUsername) {
    const doc = await BaobayAccount.findOne({ username: normalizeUsername(collectorUsername) })
      .select("username displayName isActive spots")
      .lean<any>();
    if (!doc || !doc.isActive) throw new BaobayError("Không tìm thấy người thu", 404);
    if (!(doc.spots ?? []).includes(spot)) throw new BaobayError(`“${doc.displayName}” không làm ở điểm này`, 400);
    collector = doc;
  }

  /** Tổng tiền do MÁY CHỦ tính theo bảng giá chung, không tin số máy khách gửi. */
  const newTotal = bookingTotal({
    ...input,
    // Điểm bay + LÚC LẬP quyết bảng giá DỊCH VỤ (dù cờ đỏ đổi giá ngày
    // 26/08/2026; booking lập từ giờ trở đi ăn giá mới) — xem servicePriceOf
    spot,
    createdAt: new Date(),
    // Nhóm trộn PG+PPG: phần PPG tính theo BẢNG GIÁ của ngày bay
    ppgGuests: input.flightKind === "ppg" ? 0 : input.ppgGuests,
    ppgUnitPrice: flightUnitPrice("ppg", input.flightDate),
  });

  const saved = (
    await BaobayBooking.create({
      spot,
      flightDate: input.flightDate,
      daySeq: await nextDaySeq(spot, input.flightDate),
      createdByUsername: session.username,
      createdByName: session.name,
      source: input.source.trim(),
      contactName: input.contactName.trim(),
      phone: input.phone.trim(),
      bookingCode: input.bookingCode.trim(),
      guestCount: input.guestCount,
      flycam: input.flycam,
      video360: input.video360,
      redFlag: input.redFlag,
      sunset: input.sunset,
      flagFlight: input.flagFlight,
      flightKind: input.flightKind ?? "pg",
      ppgGuests: input.ppgGuests ?? 0,
      comboDiscount: input.comboDiscount ?? comboDiscount(input.flycam, input.video360),
      pickupFee: input.pickupFee,
      mountainCar: input.mountainCar,
      unitPrice: input.unitPrice,
      discount: input.discount,
      // Tổng tiền do MÁY CHỦ tính theo bảng giá chung, không tin số máy khách gửi
      totalAmount: newTotal,
      // BigC chỉ có ở Hà Nội — điểm khác rơi về "tự đến"
      pickup: input.pickup === "bigc" && spot !== "ha-noi" ? "self" : input.pickup,
      pickupNote: input.pickup === "other" ? input.pickupNote.trim() : "",
      expectedTime: input.expectedTime.trim(),
      deposit: input.deposit,
      agencyPaidAmount: input.agencyPaidAmount ?? 0,
      agencyName: (input.agencyName ?? "").trim(),
      remaining: remainingOf(newTotal, input.deposit, input.remaining, input.agencyPaidAmount ?? 0),
      transferCode: input.transferCode.trim(),
      /**
       * `depositToCompany` giữ lại cho bản ghi cũ đọc được, nhưng KHÔNG còn là
       * căn cứ hiển thị: nó bật cho mọi khoản cọc nên nói sai với 29/93 booking.
       * Đường tiền thật nằm ở `depositMethod` — quầy chọn tay khi nhập.
       */
      depositToCompany: input.deposit > 0,
      email: (input.email ?? "").trim().toLowerCase(),
      depositDate: cleanDepositDate(input.depositDate, input.deposit),
      depositMethod: input.depositMethod ?? "",
      note: [input.note.trim(), collectorNote ? `Người thu: ${collectorNote}` : ""].filter(Boolean).join(" — "),
      rescheduledFrom: input.rescheduledFrom ? [input.rescheduledFrom] : [],
      /**
       * "Người thu" của booking CHÍNH LÀ người được giao khách — không đẻ ra
       * một lệnh thu riêng nữa.
       *
       * Trước đây hai thứ chạy hai đường: chọn người thu thì sinh LỆNH THU
       * TIỀN, còn "Giao PC" thì gán khách cho phi công. Ai được giao khách thì
       * đằng nào cũng là người cầm tiền của khách đó, nên hai đường ấy cùng
       * nhắc một việc — và nếu thu bằng đường này thì đường kia vẫn nằm chờ
       * mãi, sổ sách thành ra nhắc nợ khống. Giờ nhập một chỗ: người được giao
       * thấy khách trên trang mình kèm nhắc "còn thu", ai khác vẫn thu hộ được.
       */
      ...(collector
        ? {
            assignedToUsername: collector.username,
            assignedToName: collector.displayName,
            assignedBy: session.name,
            assignedAt: new Date(),
          }
        : {}),
      status: "open",
    })
  ).toObject();

  /** Cọc tiền mặt: vào sổ tiền của người nhập ngay, xem chú thích cashDepositToCollect. */
  if (input.depositMethod === "cash" && input.deposit > 0) {
    await cashDepositToCollect(session, spot, saved, input.deposit);
  }

  pushSheetInBackground(() => pushBookingRow(saved), BaobayBooking, saved._id);

  return toBookingDTO({ ...saved, sheetSynced: false });
}

/**
 * Booking cho trang điều phối: `forDate` = bay đúng ngày đang xem (banner đầu
 * trang, gồm cả đã hoàn thành để hiện mờ), `upcoming` = đang chờ từ hôm nay
 * trở đi (danh sách thống kê nhỏ dưới thẻ nhập).
 */
/** Cộng dồn dịch vụ gia tăng của các booking ĐÃ BAY trong ngày. */
export type FlownServices = {
  bookings: number;
  guests: number;
  /** Trong số đã bay: khách của các booking đánh dấu BAY KHÔNG VÉ — vẫn là
   *  chuyến bay thật, nhưng không nằm trong dải mã vé nên phép đếm theo vé
   *  phải cộng bù nhóm này. */
  noTicketGuests: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  mountainCar: number;
  /**
   * AI ĐÓNG GÓP BAO NHIÊU vào từng loại dịch vụ — "360: Duyên 13 · Đặng V.M 2
   * · Trúc Ngọc 3 = 18". Cần vì cả điều phối lẫn kế toán đều lập booking và
   * thêm/bớt dịch vụ được: điều phối trực chỉ khai phần mình nắm nên số báo
   * cáo thiếu đúng phần người khác nhập (21/08: Duyên khai 16 flycam trong khi
   * sổ có 18 — 2 cái của booking do Đặng V.M lập).
   */
  byPerson: Record<string, Array<{ name: string; qty: number }>>;
};

/**
 * CỌC TIỀN MẶT SINH LỆNH THU đứng tên NGƯỜI NHẬP BOOKING.
 *
 * Quy tắc của chủ: ai lập lệnh thu tiền mặt thì tiền đó cộng vào phần người ấy
 * đang giữ. Cọc gõ tay lúc nhập booking trước đây KHÔNG sinh lệnh thu nào, nên
 * tiền mặt ấy nằm ngoài mọi sổ: không vào "ai đang giữ", không lên bảng tiền
 * trong ngày, cuối ngày không ai bị đòi nộp (16 khoản = 14.253.000đ tính tới
 * 23/08).
 *
 * Sinh hẳn một lệnh thu là mọi thứ khác chạy theo đúng đường sẵn có — tiền giữ,
 * bảng tiền ngày, giao nộp, đối soát — thay vì cộng tay ở một chỗ rồi quên chỗ
 * khác (đúng cái bẫy đã gây lệch 900k của Ms Duyên hôm 22/08).
 *
 * `amount` là phần cọc CHƯA có lệnh thu nào đại diện; <= 0 thì không làm gì.
 */
async function cashDepositToCollect(
  session: BaobaySession,
  spot: string,
  booking: any,
  amount: number,
): Promise<void> {
  if (!(amount > 0)) return;
  const doc = (
    await BaobayCollect.create({
      spot,
      date: todayInVN(),
      guestName: booking.contactName || "",
      bookingId: booking._id,
      bookingCode: booking.bookingCode || "",
      agency: booking.source || "",
      guests: booking.guestCount || 0,
      amount,
      method: "cash",
      toCompanyAccount: false,
      transferCode: "",
      note: `Cọc TIỀN MẶT lúc nhập booking bay ${formatDateKeyVN(booking.flightDate)}`,
      collectorUsername: session.username,
      collectorName: session.name,
      /** Chính mình cầm nên xong luôn — không phải chờ ai xác nhận với chính mình. */
      status: "collected",
      resolvedAt: new Date(),
      resolvedBy: session.username,
      createdByUsername: session.username,
      createdByName: session.name,
    })
  ).toObject();

  /** Ghi vào vệt thu tiền của booking để dòng booking hiện "… đã thu … TM". */
  await BaobayBooking.updateOne(
    { _id: booking._id },
    {
      $push: {
        collectedLog: {
          amount,
          method: "cash",
          byName: session.name,
          at: new Date(),
          kind: "deposit",
          code: "",
        },
      },
    },
  );
  void doc;
}

export async function listBookings(
  spotRaw: string,
  date: string,
  /** Chỉ lấy booking ĐÃ GIAO cho người này — trang phi công/camera man. */
  assignedTo?: string,
): Promise<{
  forDate: BookingDTO[];
  upcoming: BookingDTO[];
  flown: FlownServices;
  moved: { bookings: number; guests: number };
  /** Danh sách khách đã DỜI KHỎI ngày này (đi sang ngày khác) — thẻ huỷ/dời cần đọc. */
  movedOut: BookingDTO[];
  /** Booking đã bỏ khỏi sổ trong ngày — hiện mục riêng, có nút lấy lại. */
  voided: BookingDTO[];
  /** Lần gần nhất chạy "Lấy book từ website & OTA" cho điểm này (ISO, "" nếu chưa từng). */
  webSyncAt: string;
}> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const me = assignedTo ? normalizeUsername(assignedTo) : "";
  const extra = me ? { assignedToUsername: me } : {};

  /**
   * PHI CÔNG BAY THEO NHÓM: ai được giao ÍT NHẤT MỘT khách trong ngày thì thấy
   * CẢ danh sách khách của ngày đó tại điểm đó — để chuyển khách cho nhau và
   * thu tiền hộ nhau ngay tại bãi. Người không có lịch hôm đó vẫn không thấy gì.
   *
   * Lịch "sắp tới" thì vẫn CHỈ của riêng mình: xem lịch cá nhân mấy ngày tới là
   * việc riêng, không cần biết ai bay cùng.
   */
  /**
   * KHAU PHẠ: phi công CHỈ thấy khách giao cho mình. Điểm này bán vé giấy, quầy
   * đứng thu tiền và điều phối chia khách — phi công không cần (và không nên)
   * đọc cả sổ khách của ngày. Các điểm khác vẫn xem chung theo nhóm bay.
   */
  const crewShare = spot !== "khau-pha";
  const inCrew = me && crewShare ? await inCrewOfDay(spot, date, me) : false;
  const forDateWhere = me && !inCrew ? { spot, flightDate: date, ...extra } : { spot, flightDate: date };
  /** Booking đã BỎ (nhập nhầm/trùng): tách riêng, không lẫn vào danh sách làm việc. */
  const voidedWhere = { ...forDateWhere, status: "voided" };

  const [forDate, voided, upcoming, movedAway, setting] = await Promise.all([
    // Xếp theo thứ tự ĐẶT CHỖ: ai đặt trước đứng trước (đúng thứ tự nhận khách)
    BaobayBooking.find({ ...forDateWhere, status: { $ne: "voided" } }).sort({ createdAt: 1 }).lean<any[]>(),
    BaobayBooking.find(voidedWhere).sort({ voidedAt: -1 }).limit(30).lean<any[]>(),
    BaobayBooking.find({ spot, status: "open", flightDate: { $gte: todayInVN() }, ...extra })
      .sort({ flightDate: 1, expectedTime: 1 })
      .limit(100)
      .lean<any[]>(),
    /**
     * Booking đã DỜI KHỎI ngày này (rescheduledFrom còn ghi ngày cũ): chúng đã
     * mang flightDate mới nên không nằm trong danh sách, nhưng dòng thống kê
     * "Dời Nk" của ngày vẫn phải đếm được.
     */
    /** Lấy đủ trường: thẻ "Khách huỷ / dời lịch" liệt kê tên, số khách, ngày dời tới. */
    BaobayBooking.find({ spot, rescheduledFrom: date, flightDate: { $ne: date }, ...extra })
      .sort({ flightDate: 1 })
      .lean<any[]>(),
    BaobaySetting.findOne({ key: spot }).select("webSyncAt").lean<any>(),
  ]);
  /**
   * Tích "đã bay" cho khách nào thì dịch vụ đăng ký của khách đó được cộng vào
   * đây — quầy khỏi đếm tay. Chỉ đếm booking ĐÃ BAY: khách còn chờ hoặc đã huỷ
   * thì dịch vụ chưa thành hiện thực.
   */
  const done = forDate.filter((b) => b.status === "done");
  const sum = (pick: (b: any) => number) => done.reduce((t, b) => t + (pick(b) || 0), 0);
  const flown: FlownServices = {
    bookings: done.length,
    guests: sum((b) => b.guestCount),
    noTicketGuests: done.filter((b) => b.noTicketFlight).reduce((t, b) => t + (b.guestCount || 0), 0),
    flycam: sum((b) => b.flycam),
    video360: sum((b) => b.video360),
    redFlag: sum((b) => b.redFlag),
    sunset: sum((b) => b.sunset),
    flagFlight: sum((b) => b.flagFlight),
    mountainCar: sum((b) => b.mountainCar),
    byPerson: {},
  };

  /**
   * TÁCH THEO NGƯỜI. Số dịch vụ trên booking hiện tại ĐÃ GỒM các lệnh thêm/bớt
   * tại bãi, nên phải bóc ngược: phần lúc TẠO booking = số hiện tại − (đã thêm
   * − đã bớt). Người tạo booking nhận phần lúc tạo, người lập lệnh nhận đúng
   * phần mình cộng/trừ — cộng lại đúng bằng tổng, không đếm trùng.
   */
  const doneIds = done.map((b) => String(b._id));
  const changes = doneIds.length
    ? await BaobayServiceChange.find({
        spot,
        bookingId: { $in: doneIds },
        undoneAt: null,
      })
        .select("bookingId kind items createdByName createdByUsername")
        .lean<any[]>()
    : [];

  const KEYS = ["flycam", "video360", "redFlag", "sunset", "flagFlight"] as const;
  /** loại dịch vụ → tên người → số lượng */
  const tally = new Map<string, Map<string, number>>();
  const add = (key: string, name: string, qty: number) => {
    if (!qty) return;
    const per = tally.get(key) ?? new Map<string, number>();
    per.set(name, (per.get(name) ?? 0) + qty);
    tally.set(key, per);
  };

  const changeByBooking = new Map<string, any[]>();
  for (const c of changes) {
    const k = String(c.bookingId);
    (changeByBooking.get(k) ?? changeByBooking.set(k, []).get(k)!).push(c);
  }

  for (const b of done) {
    const mine = changeByBooking.get(String(b._id)) ?? [];
    for (const key of KEYS) {
      const delta = mine.reduce(
        (t, c) => t + (c.kind === "add" ? 1 : -1) * (c.items?.[key] ?? 0),
        0,
      );
      // Phần lúc tạo booking = số hiện tại trừ đi phần thêm/bớt sau đó
      add(key, b.createdByName || b.createdBy || "không rõ", (b[key] || 0) - delta);
      for (const c of mine) {
        const qty = (c.items?.[key] ?? 0) * (c.kind === "add" ? 1 : -1);
        add(key, c.createdByName || c.createdByUsername || "không rõ", qty);
      }
    }
  }

  for (const [key, per] of tally) {
    const list = [...per.entries()]
      .filter(([, qty]) => qty !== 0)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => Math.abs(b.qty) - Math.abs(a.qty));
    if (list.length) flown.byPerson[key] = list;
  }

  /**
   * CHE SỐ TIỀN với phi công / camera man: họ cần biết khách là ai, mấy người,
   * dịch vụ gì, đón ở đâu và CÒN PHẢI THU bao nhiêu — chỉ vậy là đủ làm việc.
   * Nguồn khách, tổng tiền, đã cọc, chiết khấu là chuyện giá cả và đối tác, để
   * lọt ra bãi là sinh chuyện. Cắt ngay ở máy chủ, không gửi xuống máy họ.
   *
   * Riêng CÂN NẶNG trong ghi chú thì giữ lại: đó là thứ phi công buộc phải biết
   * để chọn dù và xếp người bay.
   */
  /**
   * MỨC TIỀN cho tổ bay, tính theo TỪNG booking (luật của chủ, 30/08/2026):
   * Khau Phạ ẩn sạch; mở lại khi có lệnh thu CHỈ ĐỊNH ĐÍCH DANH người đang xem
   * (chỉ "còn phải thu"), hoặc kế toán tích "hiện tiền cho phi công" (đủ bộ).
   * Điểm khác giữ nguyên: thấy "còn phải thu" như trước nay.
   */
  const moneyLevelOf = (b: any, myPendingCollect: boolean): "none" | "remaining" | "full" => {
    if (b.pilotMoneyAt) return "full";
    if (spot !== "khau-pha") return "remaining";
    return myPendingCollect ? "remaining" : "none";
  };

  /**
   * GẮN TRẠNG THÁI ĐÃ SOÁT cho từng khoản thu.
   *
   * `collectedLog` trên booking chỉ là BẢN CHỤP (số tiền, kiểu, mã, người thu),
   * không nối ngược về lệnh thu nên tự nó không biết kế toán đã bấm "Đã nhận"
   * chưa. Lấy trạng thái từ nguồn thật là BaobayCollect rồi ghép lại theo
   * (kiểu + số tiền + mã); mỗi lệnh thu chỉ ghép MỘT lần để hai khoản trùng số
   * tiền không cùng ăn một dấu tích.
   */
  const allRows = [...forDate, ...voided, ...upcoming, ...movedAway];
  const ids = [...new Set(allRows.map((b: any) => String(b._id)))];
  const collectDocs = ids.length
    ? await BaobayCollect.find({ bookingId: { $in: ids }, status: { $ne: "rejected" } })
        .select("bookingId amount method transferCode verifiedAt collectorUsername collectorName status")
        .lean<any[]>()
    : [];
  const collectsByBooking = new Map<string, any[]>();
  for (const c of collectDocs) {
    const kb = String(c.bookingId);
    (collectsByBooking.get(kb) ?? collectsByBooking.set(kb, []).get(kb)!).push(c);
  }
  const withVerified = (b: any): BookingDTO => {
    const pool = [...(collectsByBooking.get(String(b._id)) ?? [])];
    const myPendingCollect =
      Boolean(me) && pool.some((c) => normalizeUsername(c.collectorUsername ?? "") === me && c.status === "pending");
    const dto = me ? maskForCrew(b, moneyLevelOf(b, myPendingCollect)) : toBookingDTO(b);
    dto.collected = (dto.collected ?? []).map((entry) => {
      const i = pool.findIndex(
        (c) =>
          (c.method === "transfer" ? "transfer" : "cash") === entry.method &&
          (Number(c.amount) || 0) === entry.amount &&
          (entry.code ? String(c.transferCode ?? "") === entry.code : true),
      );
      if (i < 0) return entry;
      const hit = pool.splice(i, 1)[0];
      return {
        ...entry,
        verified: Boolean(hit.verifiedAt),
        collectId: String(hit._id),
        collectorUsername: hit.collectorUsername || undefined,
      };
    });
    return dto;
  };

  return {
    forDate: forDate.map(withVerified),
    voided: voided.map(withVerified),
    upcoming: upcoming.map(withVerified),
    flown,
    moved: { bookings: movedAway.length, guests: movedAway.reduce((t, b) => t + (b.guestCount || 0), 0) },
    movedOut: movedAway.map(withVerified),
    webSyncAt: setting?.webSyncAt ? new Date(setting.webSyncAt).toISOString() : "",
  };
}

/**
 * Điều phối SỬA thông tin booking đang chờ (gõ nhầm tên, đổi dịch vụ, thêm
 * cọc…). Đổi cả ngày bay được — ngày cũ lưu vào `rescheduledFrom` như lệnh dời.
 */
export async function updateBookingInfo(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: BookingSaveInput,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);

  if (input.guestCount <= 0) throw new BaobayError("Booking chưa ghi số khách", 400);
  const before = await BaobayBooking.findOne({ _id: id, spot }).select("status flightDate").lean<any>();
  if (!before) throw new BaobayError("Không tìm thấy booking", 404);
  /**
   * SỬA booking thì KHÔNG chặn theo giờ.
   *
   * Khách đặt 07:00, 11 giờ trưa mới gọi lại đổi số khách — chặn vì "giờ dự kiến
   * đã qua" là cấm sửa đúng lúc cần sửa nhất. Booking bay hôm nay mà quá giờ
   * vẫn là booking có thật, giờ chỉ là dự kiến.
   *
   * Cửa khoá duy nhất là KẾ TOÁN ĐÃ CHỐT NGÀY — chốt rồi thì số liệu đã lên sổ,
   * sửa sau lưng bản chốt là sai lệch sổ sách. Chặn theo cả ngày cũ và ngày mới
   * (dời sang một ngày đã chốt cũng không được).
   */
  const lockedDays = await AccountantDailyClose.find({
    spot,
    date: { $in: [...new Set([before.flightDate, input.flightDate])] },
    status: "closed",
  })
    .select("date")
    .lean<any[]>();
  if (lockedDays.length) {
    throw new BaobayError(
      `Ngày ${formatDateKeyVN(lockedDays[0].date)} kế toán đã chốt — không sửa booking của ngày đó nữa`,
      400,
    );
  }
  /**
   * Đổi ngày bay ở ô SỬA cũng là một kiểu dời lịch, nên theo đúng luật của
   * `assertMoveDatesOpen`: lùi về ngày cũ hơn được (25 mưa thì bay 23), chỉ
   * chặn khi lùi quá xa — dấu hiệu gõ nhầm tháng/năm chứ không phải sửa muộn.
   * Ngày đã chốt thì đã bị khối kiểm tra ngay bên trên chặn rồi.
   */
  if (input.flightDate !== before.flightDate && input.flightDate < shiftDateKey(todayInVN(), -MOVE_BACK_LIMIT_DAYS)) {
    throw new BaobayError(
      `Ngày bay mới ${formatDateKeyVN(input.flightDate)} lùi quá ${MOVE_BACK_LIMIT_DAYS} ngày so với hôm nay — kiểm lại tháng/năm`,
      400,
    );
  }
  for (const [label, count] of [
    ["Flycam", input.flycam],
    ["Camera 360", input.video360],
    ["Dù cờ đỏ", input.redFlag],
    ["Bay hoàng hôn/săn mây", input.sunset],
    ["Bay kéo cờ/bánh", input.flagFlight],
  ] as Array<[string, number]>) {
    if (count > input.guestCount) {
      throw new BaobayError(`${label} (${count}) vượt quá số khách (${input.guestCount})`, 400);
    }
  }

  /**
   * SỬA ĐƯỢC CẢ BOOKING ĐÃ BAY. Bay xong mới biết khách thêm flycam, thêm khách,
   * hay số tiền phải sửa — mà tiền thu chi bám vào đúng chuyến đó. Chặn ở đây thì
   * kế toán không còn đường nào ngoài gõ tay ra ngoài sổ, càng sai.
   */
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking này", 404);

  /** Tổng tiền tính lại theo bảng giá — "còn lại" bám theo đúng con số này. */
    /**
   * Ô "đã cọc" KHÔNG được thấp hơn tiền đã có LỆNH THU.
   *
   * Nhân viên thu nhầm sang booking khác rồi vào đây sửa số cọc cho khớp là
   * sổ vỡ ngay: booking ghi 2.890.000 trong khi hai lệnh thu cộng lại
   * 8.670.000 (đúng ca #16 Thu Huyền ngày 21/08). Tiền đã vào sổ chỉ được sửa
   * ở đúng nơi sinh ra nó — "Sửa khoản đã thu" trên dòng booking.
   */
  /**
   * KẾ TOÁN/QUẢN TRỊ được vượt hai chốt hạ-cọc bên dưới (luật chủ 03/09/2026):
   * quầy thu nhầm/nhập nhầm thì kế toán phải hạ được về đúng số, kể cả về 0.
   * Không lặng lẽ: mọi lần hạ đều tự ghi vệt vào ghi chú booking (ai, từ bao
   * nhiêu xuống bao nhiêu, ngày nào) — chịu trách nhiệm bằng tên mình.
   * Nhân viên thường vẫn bị chặn như cũ.
   */
  const canLowerDeposit =
    wearsRole(session, "accountant") || wearsRole(session, "admin") || Boolean((session as { viaAdmin?: boolean }).viaAdmin);
  const collectedSoFar = (
    await BaobayCollect.find({ spot, bookingId: id, status: { $in: ["collected", "company"] } })
      .select("amount")
      .lean<any[]>()
  ).reduce((t, c) => t + (c.amount || 0), 0);
  if (!canLowerDeposit && collectedSoFar > 0 && input.deposit < collectedSoFar) {
    throw new BaobayError(
      `Booking này đã có ${collectedSoFar.toLocaleString("vi-VN")} đ ghi bằng LỆNH THU — không hạ ô "đã cọc" xuống ${input.deposit.toLocaleString("vi-VN")} đ được. Thu nhầm thì báo kế toán: kế toán sửa/xoá được từng khoản ở "🧾 Sửa thu" hoặc hạ thẳng ô cọc.`,
      400,
    );
  }

  /**
   * CỌC GÕ TAY ĐÃ ĐỐI SOÁT THÌ KHÔNG HẠ XUỐNG ĐƯỢC NỮA.
   *
   * Lỗ hổng trước đây: khoản cọc CHUYỂN KHOẢN gõ tay không đẻ ra lệnh thu nào
   * (chỉ cọc TIỀN MẶT mới đẻ), nên chốt chặn phía trên không với tới nó. Kế
   * toán đã dò ra dòng sao kê và bấm "Đã nhận", vậy mà nhân viên vào sửa
   * booking hạ ô cọc về 0 là khoản tiền biến mất khỏi sổ — trong khi cờ
   * `depositVerifiedAt` vẫn còn nguyên và dòng sao kê vẫn trỏ vào đúng booking
   * này. Kết quả: tiền thật đã về tài khoản công ty mà sổ ghi khách chưa cọc,
   * lại không còn dấu vết nào cho thấy nó từng có.
   *
   * Muốn sửa thật thì kế toán phải BỎ XÁC NHẬN trước (nút trên trang soát sao
   * kê) — tức là có người chịu trách nhiệm cho việc gỡ một khoản đã đối soát,
   * chứ không phải sửa lặng lẽ trong ô nhập.
   */
  const manualNow = Math.max(0, (current.deposit ?? 0) - collectedSoFar);
  const manualNext = Math.max(0, input.deposit - collectedSoFar);
  if (!canLowerDeposit && current.depositVerifiedAt && manualNext < manualNow) {
    throw new BaobayError(
      `Khoản cọc ${manualNow.toLocaleString("vi-VN")} đ này kế toán ĐÃ ĐỐI SOÁT với sao kê (${
        current.depositVerifiedBy || "kế toán"
      } xác nhận) — không hạ xuống ${manualNext.toLocaleString("vi-VN")} đ được. Nếu khoản đó thật sự sai thì báo kế toán sửa (kế toán hạ được, có ghi vệt).`,
      400,
    );
  }

const editedTotal = bookingTotal({
    ...input,
    spot,
    /**
     * SỬA booking thì GIỮ NGUYÊN bảng giá dịch vụ lúc nó được lập — booking cũ
     * đã chốt giá cờ đỏ 100k với khách, sửa cái tên mà tổng nhảy thêm 300k là
     * không giải thích được với ai.
     */
    createdAt: current.createdAt,
    ppgGuests: input.flightKind === "ppg" ? 0 : input.ppgGuests,
    ppgUnitPrice: flightUnitPrice("ppg", input.flightDate),
  });

  const update: Record<string, unknown> = {
    $set: {
      flightDate: input.flightDate,
      source: input.source.trim(),
      contactName: input.contactName.trim(),
      phone: input.phone.trim(),
      bookingCode: input.bookingCode.trim(),
      guestCount: input.guestCount,
      flycam: input.flycam,
      video360: input.video360,
      redFlag: input.redFlag,
      sunset: input.sunset,
      flagFlight: input.flagFlight,
      flightKind: input.flightKind ?? "pg",
      ppgGuests: input.ppgGuests ?? 0,
      comboDiscount: input.comboDiscount ?? comboDiscount(input.flycam, input.video360),
      pickupFee: input.pickupFee,
      mountainCar: input.mountainCar,
      unitPrice: input.unitPrice,
      discount: input.discount,
      totalAmount: editedTotal,
      pickup: input.pickup === "bigc" && spot !== "ha-noi" ? "self" : input.pickup,
      pickupNote: input.pickup === "other" ? input.pickupNote.trim() : "",
      expectedTime: input.expectedTime.trim(),
      deposit: input.deposit,
      agencyPaidAmount: input.agencyPaidAmount ?? 0,
      agencyName: (input.agencyName ?? "").trim(),
      remaining: remainingOf(editedTotal, input.deposit, input.remaining, input.agencyPaidAmount ?? 0),
      transferCode: input.transferCode.trim(),
      /**
       * `depositToCompany` giữ lại cho bản ghi cũ đọc được, nhưng KHÔNG còn là
       * căn cứ hiển thị: nó bật cho mọi khoản cọc nên nói sai với 29/93 booking.
       * Đường tiền thật nằm ở `depositMethod` — quầy chọn tay khi nhập.
       */
      depositToCompany: input.deposit > 0,
      depositMethod: input.depositMethod ?? "",
      /**
       * Email để TRỐNG trong form thì XOÁ email cũ — quầy cố ý bỏ đi (khách xin
       * đừng gửi thư nữa, hoặc gõ nhầm hộp thư người khác) phải làm được, chứ
       * không phải sửa hoài mà địa chỉ cũ vẫn nằm đó gửi tiếp.
       */
      email: (input.email ?? "").trim().toLowerCase(),
      /**
       * Ngày cọc sửa được ngay trong form. Người nhập tự xoá đi thì về mặc
       * định "đúng hôm lập booking" — không giữ lại ngày cũ sau lưng họ.
       */
      depositDate: cleanDepositDate(input.depositDate, input.deposit),
      depositDateBy: cleanDepositDate(input.depositDate, input.deposit)
        ? session.name || session.username
        : "",
      note: input.note.trim(),
    },
  };
  if (input.flightDate !== current.flightDate) {
    update.$push = { rescheduledFrom: current.flightDate };
  }

  /**
   * Cọc gõ tay TĂNG thêm sau khi kế toán đã xác nhận: phần tăng là tiền MỚI,
   * chưa ai dò ra nó trong sao kê. Xoá cờ để khoản này quay lại hàng chờ soát,
   * không thì phần tăng thêm lọt sổ vĩnh viễn dưới cái tích của lần trước.
   */
  if (current.depositVerifiedAt && manualNext > manualNow) {
    (update.$set as Record<string, unknown>).depositVerifiedAt = null;
    (update.$set as Record<string, unknown>).depositVerifiedBy = "";
    (update.$set as Record<string, unknown>).ckCheckedAt = null;
  }

  /**
   * KẾ TOÁN HẠ CỌC (quầy thu nhầm/nhập nhầm): ghi vệt vào ghi chú — ai hạ, từ
   * bao nhiêu xuống bao nhiêu — và gỡ mọi tích đối soát cũ (số đã đổi thì tích
   * cũ hết giá trị, khoản còn lại quay về hàng chờ soát).
   */
  if (canLowerDeposit && input.deposit < (current.deposit ?? 0)) {
    (update.$set as Record<string, unknown>).note = [
      input.note.trim(),
      `kế toán ${session.name || session.username} hạ "đã cọc" ${(current.deposit ?? 0).toLocaleString("vi-VN")}đ → ${input.deposit.toLocaleString("vi-VN")}đ (${formatDateKeyVN(todayInVN())})`,
    ]
      .filter(Boolean)
      .join(" · ");
    (update.$set as Record<string, unknown>).depositVerifiedAt = null;
    (update.$set as Record<string, unknown>).depositVerifiedBy = "";
    (update.$set as Record<string, unknown>).ckCheckedAt = null;
    (update.$set as Record<string, unknown>).tmCheckedAt = null;
  }

  const doc = await BaobayBooking.findOneAndUpdate({ _id: id, spot }, update, { new: true }).lean<any>();
  if (!doc) throw new BaobayError("Booking vừa được người khác cập nhật", 409);

  /**
   * SỬA booking mà cọc TIỀN MẶT tăng thêm: phần TĂNG cũng phải vào sổ tiền của
   * người vừa sửa. Chỉ tính phần cọc CHƯA có lệnh thu nào đại diện, nếu không
   * mỗi lần bấm Lưu lại đẻ thêm một lệnh thu ma.
   */
  if (input.depositMethod === "cash" && input.deposit > 0) {
    const daCo = await BaobayCollect.find({ bookingId: doc._id, status: { $ne: "rejected" } })
      .select("amount")
      .lean<any[]>();
    const dis = input.deposit - daCo.reduce((t, c) => t + (c.amount || 0), 0);
    await cashDepositToCollect(session, spot, doc, dis);
  }

  /**
   * Ghi dấu NGAY (không đẩy sang việc nền): người vừa bấm Lưu phải thấy nút
   * "Gửi mail báo khách" hiện lên cùng lúc với lời báo đã lưu. Ghi ở nền thì
   * màn hình trả về trước khi dấu kịp ghi, nút không hiện, và người ta đóng
   * máy mà tưởng chẳng có gì phải báo.
   */
  const pendingBase = await markBookingChanged(current, doc);
  pushSheetInBackground(() => pushBookingRow(doc), BaobayBooking, doc._id);
  return toBookingDTO({ ...doc, notifyPendingBase: pendingBase, sheetSynced: false });
}

/**
 * XOÁ booking nhập nhầm — chỉ xoá được booking đang chờ. Trước khi xoá, đẩy
 * dòng "ĐÃ XOÁ" sang bảng tính để bản sao ngoài DB không còn dòng mồ côi.
 */
/**
 * BỎ BOOKING khỏi sổ vì NHẬP NHẦM (gõ hai lần, gõ sai khách…).
 *
 * Bản cũ xoá thẳng khỏi cơ sở dữ liệu — mất dấu hoàn toàn, chỉ còn một dòng
 * "ĐÃ XOÁ" bên Google Sheet mà dòng đó cũng xoá tay được. Đó là cửa mở cho gian
 * lận, nên giờ chỉ ĐÁNH DẤU: bản ghi ở lại sổ, không cộng vào bất cứ con số nào
 * của ngày (khách, dịch vụ, tiền), không lên lịch bay, và luôn lấy lại được.
 *
 * ĐÃ BỎ cách "gộp booking trùng": nó dời tiền ngầm từ bản này sang bản kia rồi
 * tính lại "còn thu" — không ai soát được, và đã làm sai số tiền thu thật (cặp
 * trùng SĐT 0345272046 ngày 16/08). Booking đã có tiền thì phải sửa tiền trước
 * bằng thẻ "Sửa tiền đã thu", xong mới bỏ được.
 */
export async function voidBooking(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: { reason: string },
): Promise<{ voided: BookingDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const doc = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
  if (doc.status === "voided") throw new BaobayError("Booking này đã được bỏ khỏi sổ", 400);

  const reason = (input.reason ?? "").trim();
  if (!reason) throw new BaobayError("Ghi giúp lý do bỏ booking này", 400);

  /** Ngày đã chốt sổ thì khoá — sửa sau lưng kế toán là hỏng đối soát. */
  const closed = await AccountantDailyClose.findOne({ spot, date: doc.flightDate, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không bỏ booking được nữa", 400);

  const paid = (doc.deposit ?? 0) > 0 || (doc.collectedLog ?? []).length > 0;

  /**
   * ĐÃ BỎ HẲN cách "gộp booking trùng".
   *
   * Gộp phải dời tiền từ bản này sang bản kia rồi tính lại "còn thu" — một phép
   * cộng trừ ngầm mà không ai soát được, và nó đã làm sai số tiền thu thật (cặp
   * trùng SĐT 0345272046 ngày 16/08: gộp xong "còn thu" về 0 trong khi khách vẫn
   * còn nợ). Giờ chỉ còn MỘT đường: báo NHẬP NHẦM, booking đó không được cộng
   * vào bất cứ con số nào của ngày, tiền thì sửa bằng chính thẻ "Sửa tiền đã thu".
   */
  if (paid) {
    throw new BaobayError(
      "Booking này đã có tiền — mở ⋯ Thêm → “Sửa tiền đã thu” để xoá hoặc chuyển khoản thu sang booking đúng, rồi mới báo nhập nhầm",
      400,
    );
  }
  if (doc.ticketIssuedAt) throw new BaobayError("Booking đã xuất vé — thu hồi vé rồi mới bỏ được", 400);
  if (doc.status === "done") throw new BaobayError("Booking đã bay — không bỏ được", 400);

  const voided = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: {
        status: "voided",
        voidedAt: new Date(),
        voidedBy: session.name || session.username,
        voidReason: reason,
        voidKind: "mistake",
      },
    },
    { new: true },
  ).lean<any>();
  // Bỏ khỏi sổ thì số thứ tự bên trang khách cũng phải mất theo
  if (voided.webBookingId) await clearQueueNoOnWeb(voided.webBookingId);
  pushSheetInBackground(() => pushBookingRow(voided), BaobayBooking, voided._id);
  return { voided: toBookingDTO(voided) };
}


/**
 * KHOÁ MỘT BOOKING — kế toán bấm 🔒 thì dòng đó đông cứng: không ai sửa thông
 * tin, không thu tiền, không tích đã bay, không huỷ, không dời, không thêm/huỷ
 * dịch vụ, không bỏ khỏi sổ.
 *
 * Khác "chốt ngày" (khoá cả ngày, và chỉ khoá được khi hết lỗi đỏ): đây là khoá
 * TỪNG dòng, dùng khi số của riêng khách đó đã đối soát xong, hoặc đang có
 * tranh cãi và phải giữ nguyên hiện trạng để soi. Mở lại cũng chỉ kế toán.
 */
/**
 * Booking bị KHOÁ thì không ai sửa — TRỪ KẾ TOÁN.
 *
 * Khoá là dấu "tiền của khách này đã soát xong", do chính kế toán bấm. Bắt kế
 * toán mở khoá → sửa → khoá lại chỉ tổ ba bước cho một việc, mà lỗi cần sửa
 * thường do nhân viên nhập sai, phát hiện lúc soát. Người khác vẫn bị chặn.
 */
async function assertBookingUnlocked(
  spot: string,
  id: string,
  session?: BaobaySession & { viaAdmin?: boolean },
) {
  if (session && (session.viaAdmin || wearsRole(session, "accountant") || wearsRole(session, "admin"))) {
    return;
  }
  const doc = await BaobayBooking.findOne({ _id: id, spot }).select("lockedAt lockedBy").lean<any>();
  if (doc?.lockedAt) {
    throw new BaobayError(
      `Booking này đã bị KHOÁ${doc.lockedBy ? ` bởi ${doc.lockedBy}` : ""} — nhờ kế toán mở khoá rồi mới sửa được`,
      409,
    );
  }
}

/**
 * QUẦY NHẬP "NGÀY CỌC" khi khách trả cọc KHÔNG cùng hôm lập booking.
 *
 * Vì sao cần: đối soát sao kê xếp tiền theo ngày ghi trên sao kê, còn khoản
 * cọc thì trước đây xếp theo ngày lập booking. Khách chuyển hôm 20, quầy gõ
 * vào app hôm 23 — dòng sao kê nằm ở danh sách ngày 20, khoản cọc nằm ở danh
 * sách ngày 23, hai bên không bao giờ gặp nhau và kế toán phải mò tay.
 *
 * Để TRỐNG (`date` rỗng) là gỡ ngày đã nhập, quay về "trả đúng hôm lập
 * booking" — nhập nhầm thì sửa lại được, không phải nhờ ai.
 *
 * KHÔNG cho đặt ngày ở TƯƠNG LAI: cọc là tiền đã trả rồi, ngày mai chưa trả
 * được. Gõ nhầm năm (2027 thay vì 2026) mà lọt là khoản đó biến mất khỏi mọi
 * danh sách soát, không ai thấy nó nữa.
 */
export async function setDepositDate(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  date: string,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);

  const clean = String(date ?? "").trim();
  if (clean && !isDateKey(clean)) throw new BaobayError("Ngày cọc không đúng dạng", 400);
  if (clean && clean > todayInVN()) {
    throw new BaobayError("Ngày cọc không thể ở tương lai — cọc là tiền khách đã trả rồi", 400);
  }

  const current = await BaobayBooking.findOne({ _id: id, spot })
    .select("deposit createdAt depositDate")
    .lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);
  if ((current.deposit ?? 0) <= 0) {
    throw new BaobayError("Booking này chưa ghi tiền cọc — nhập số cọc trước đã", 400);
  }

  const doc = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    { $set: { depositDate: clean, depositDateBy: clean ? session.name || session.username : "" } },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
  pushSheetInBackground(() => pushBookingRow(doc), BaobayBooking, doc._id);
  return toBookingDTO(doc);
}

/**
 * Nhãn ngắn "đã báo khách lúc nào" cho dòng booking.
 *
 * Chỉ lấy lần GẦN NHẤT: cả nhật ký hiện lên dòng thì đọc không nổi, mà thứ cần
 * biết lúc nhìn lướt chỉ là "báo rồi hay chưa, có hỏng không".
 */
function lastNotifyLabel(log?: Array<{ at?: Date; ok?: boolean; error?: string }>): string {
  const last = (log ?? [])[(log ?? []).length - 1];
  if (!last?.at) return "";
  const d = new Date(last.at);
  const khi = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return last.ok === false ? `${khi} · GỬI HỎNG: ${last.error || "không rõ"}` : `${khi} · đã gửi`;
}

/**
 * KẾ TOÁN BẬT/TẮT "hiện tiền cho phi công" trên một booking (luật Khau Phạ:
 * phi công không thấy tiền — đây là cái van mở đích danh từng booking khi cần
 * phi công thu hộ; xem maskForCrew).
 */
export async function setPilotMoney(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  on: boolean,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const doc = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    on
      ? { $set: { pilotMoneyAt: new Date(), pilotMoneyBy: session.name || session.username } }
      : { $set: { pilotMoneyAt: null, pilotMoneyBy: "" } },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
  return toBookingDTO(doc);
}

/** Kế toán bấm khoá / mở khoá một booking. */
export async function setBookingLock(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  locked: boolean,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const doc = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    locked
      ? { $set: { lockedAt: new Date(), lockedBy: session.name || session.username } }
      : { $set: { lockedAt: null, lockedBy: "" } },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking", 404);
  pushSheetInBackground(() => pushBookingRow(doc), BaobayBooking, doc._id);
  return toBookingDTO(doc);
}

/**
 * Điều phối GIAO booking cho một nhân sự đang làm việc tại điểm — người được
 * giao thấy booking trên trang của mình (tên khách, SĐT, chỗ đón, giờ…).
 */
export async function assignBooking(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  assigneeRaw: string,
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);

  const assignee = await BaobayAccount.findOne({ username: normalizeUsername(assigneeRaw) })
    .select("username displayName isActive spots")
    .lean<any>();
  if (!assignee || !assignee.isActive) throw new BaobayError("Không tìm thấy nhân sự tiếp nhận", 404);
  if (!(assignee.spots ?? []).includes(spot)) {
    throw new BaobayError(`“${assignee.displayName}” không làm ở điểm này`, 400);
  }

  /**
   * PHI CÔNG / CAMERA MAN chuyển khách CHO NHAU được, miễn cả hai cùng có lịch
   * bay ngày đó tại điểm đó — nhóm đứng cùng bãi tự san khách theo cân nặng,
   * theo dù, theo lượt; bắt gọi điều phối mỗi lần đổi là chậm việc.
   */
  const current = await BaobayBooking.findOne({ _id: id, spot, status: "open" }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking đang chờ này", 404);
  if (session.role === "pilot" || session.role === "cameraman") {
    if (!(await inCrewOfDay(spot, current.flightDate, session.username))) {
      throw new BaobayError("Bạn không có lịch bay ngày này", 403);
    }
    if (!(await inCrewOfDay(spot, current.flightDate, assignee.username))) {
      throw new BaobayError(`“${assignee.displayName}” không có lịch bay ngày này — nhờ điều phối chuyển giúp`, 400);
    }
  }

  const doc = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot, status: "open" },
    {
      $set: {
        assignedToUsername: assignee.username,
        assignedToName: assignee.displayName,
        assignedBy: session.name,
        assignedAt: new Date(),
        // Người mới phải tự xác nhận lại — dấu nhận của người cũ không còn đúng
        acceptedAt: null,
        acceptedBy: "",
      },
    },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy booking đang chờ này", 404);

  pushSheetInBackground(() => pushBookingRow(doc), BaobayBooking, doc._id);
  return toBookingDTO({ ...doc, sheetSynced: false });
}

export type BookingAction = "flown" | "cancel" | "move";

/**
 * Ba xác nhận của điều phối với một booking đang chờ:
 *  - "flown": khách ĐÃ BAY — ghi nhận chuyến vào đúng ngày bay, ẩn khỏi hàng chờ.
 *  - "cancel": khách HUỶ — báo huỷ toàn hệ thống, không làm gì thêm.
 *  - "move": khách DỜI — nhập ngày mới, booking tự chuyển sang ngày đó
 *    (ngày cũ lưu vào `rescheduledFrom` để còn dấu vết).
 * KHÔNG xoá bản ghi nào.
 */
/**
 * THU TIỀN cho một booking ngay tại bãi.
 *
 * Hai đường tiền khác nhau hẳn nhau, nên không gộp làm một:
 *  - CHUYỂN KHOẢN: tiền vào thẳng TK công ty, không ai cầm → ghi "đã cọc vào TK
 *    công ty" của booking và lệnh thu ở trạng thái "company".
 *  - TIỀN MẶT: chính người bấm đang cầm → lệnh thu ghi tên họ, hoàn tất luôn nên
 *    khoản này chảy vào TIỀN GIỮ HỘ CÔNG TY của họ (getCashOnHand cộng vào), và
 *    KHÔNG ghi vào "đã cọc" vì tiền chưa về công ty.
 *
 * Cả hai đều trừ ngay phần "còn phải thu" của booking để quầy không thu hai lần.
 */
export async function collectForBooking(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    /**
     * Khách trả LÀM HAI ĐƯỜNG trong cùng một lần: một phần tiền mặt, một phần
     * chuyển khoản (rất hay gặp — đưa nốt tiền lẻ, phần lớn chuyển trước).
     * Khai riêng từng phần; bỏ trống thì rơi về `amount` + `method` như cũ.
     */
    cash?: number;
    transfer?: number;
    /**
     * Khách chuyển làm NHIỀU BILL (mỗi bill một mã giao dịch riêng) — hay gặp
     * khi vượt hạn mức chuyển một lần, hoặc mấy người trong đoàn tự chuyển phần
     * của mình. Mỗi bill vào sổ một dòng để đối soát với sao kê ngân hàng.
     */
    transfers?: Array<{ amount: number; code: string }>;
    amount?: number;
    method?: "cash" | "transfer";
    transferCode?: string;
    /** "deposit" = thu cọc một phần · "full" = thu nốt toàn bộ phần còn lại. */
    kind?: "deposit" | "full";
    /**
     * NGÀY KHÁCH CHUYỂN KHOẢN, khi khác hôm nay.
     *
     * Nhân viên bấm thu tiền sau khi tiền đã về mấy hôm — lúc nhớ ra, lúc rảnh
     * tay. Ghi ngày hôm nay thì lệnh thu nằm ở danh sách soát của hôm nay còn
     * dòng sao kê nằm ở ngày tiền thật sự về, hai bên không gặp nhau.
     *
     * CHỈ áp cho phần CHUYỂN KHOẢN. Tiền mặt luôn là hôm nay: nó vào túi người
     * thu ngay lúc bấm, và số "đang giữ" của người đó tính theo ngày ấy.
     */
    transferDate?: string;
  },
): Promise<{ booking: BookingDTO; collect: CollectDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BaobayError("Booking không hợp lệ", 400);

  const booking = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);

  /**
   * Phi công / camera man chỉ thu tiền của KHÁCH ĐƯỢC GIAO CHO MÌNH. Điều phối,
   * quầy vé, kế toán thu của ai cũng được — họ đứng quầy.
   */
  if (session.role === "pilot" || session.role === "cameraman") {
    const me = normalizeUsername(session.username);
    const mine = normalizeUsername(booking.assignedToUsername || "") === me;
    /**
     * Phi công bay theo NHÓM: ai có lịch trong ngày đó tại điểm đó thì thu hộ
     * nhau được — khách trả tiền cho ai cũng vào sổ đúng người ấy đang giữ.
     * Người không bay hôm đó thì không đụng được vào tiền của ngày.
     */
    if (!mine && !(await inCrewOfDay(spot, booking.flightDate, me))) {
      throw new BaobayError("Bạn không có lịch bay ngày này", 403);
    }
  }

  /**
   * THU ĐỦ thì số tiền do máy chủ chốt bằng đúng phần còn phải thu — người bấm
   * khỏi tự tính, và cũng không lệch được vì máy đọc số từ bản ghi.
   */
  const isFull = input.kind === "full";
  const transferCode = (input.transferCode ?? "").trim();

  /** Từng bill chuyển khoản — bản gọi cũ (một khoản) quy về một dòng. */
  const bills = (input.transfers?.length
    ? input.transfers
    : input.transfer
      ? [{ amount: input.transfer, code: transferCode }]
      : []
  )
    .map((b) => ({ amount: Math.max(0, Math.round(b.amount || 0)), code: (b.code ?? "").trim() }))
    .filter((b) => b.amount > 0);

  /** Tách thành hai đường tiền; bản gọi cũ (một phương thức) quy về đây luôn. */
  const split = input.cash !== undefined || input.transfer !== undefined || Boolean(input.transfers?.length);
  let cashPart = Math.max(0, Math.round(input.cash ?? 0));
  let transferPart = bills.reduce((t, b) => t + b.amount, 0);
  if (!split) {
    const one = isFull ? Math.max(0, booking.remaining ?? 0) : Math.max(0, Math.round(input.amount ?? 0));
    if (input.method === "transfer") {
      transferPart = one;
      bills.push({ amount: one, code: transferCode });
    } else cashPart = one;
  } else if (isFull && !input.cash) {
    /** Thu đủ mà chia hai đường: phần còn lại sau khi trừ CK đi vào tiền mặt. */
    cashPart = Math.max(0, (booking.remaining ?? 0) - transferPart);
  }

  const amount = cashPart + transferPart;
  if (amount <= 0) {
    throw new BaobayError(isFull ? "Booking này không còn phải thu" : "Chưa nhập số tiền thu", 400);
  }
  if (bills.some((b) => !b.code)) {
    throw new BaobayError("Chuyển khoản phải ghi mã giao dịch (mỗi bill một mã)", 400);
  }

  /**
   * Mỗi đường tiền một lệnh thu RIÊNG: tiền mặt ghi tên người đang cầm, chuyển
   * khoản ghi thẳng về tài khoản công ty. Gộp chung một dòng thì cuối ngày
   * không biết ai phải nộp bao nhiêu.
   */
  /**
   * Ngày ghi cho phần CHUYỂN KHOẢN. Ngày rác / ngày tương lai thì rơi về hôm
   * nay, không chặn việc thu tiền vì một cái ngày gõ nhầm.
   */
  const ckDate = (() => {
    const v = String(input.transferDate ?? "").trim();
    if (!v || !isDateKey(v) || v > todayInVN()) return todayInVN();
    return v;
  })();
  /**
   * Đẩy tiền vào một ngày KẾ TOÁN ĐÃ CHỐT là làm sai lệch bản chốt đó — số của
   * ngày ấy đã lên sổ rồi. Chỉ soát khi thật sự chọn ngày khác hôm nay.
   */
  if (ckDate !== todayInVN() && transferPart > 0) await assertDayOpen(spot, ckDate);

  const label = isFull ? "Thu đủ" : "Cọc";
  const makeCollect = async (part: number, method: "cash" | "transfer", code = "") =>
    (
      await BaobayCollect.create({
        spot,
        date: method === "transfer" ? ckDate : todayInVN(),
        guestName: booking.contactName || "",
        bookingId: booking._id,
        bookingCode: booking.bookingCode || "",
        agency: booking.source || "",
        guests: booking.guestCount || 0,
        amount: part,
        method,
        toCompanyAccount: method === "transfer",
        transferCode: method === "transfer" ? code : "",
        note:
          `${label} cho booking bay ${formatDateKeyVN(booking.flightDate)}` +
          (cashPart > 0 && transferPart > 0 ? " (khách trả một phần TM, một phần CK)" : ""),
        collectorUsername: method === "cash" ? session.username : undefined,
        collectorName: method === "cash" ? session.name : undefined,
        // Tiền mặt: chính mình thu nên xong luôn, khỏi ai xác nhận với chính mình
        status: method === "cash" ? "collected" : "company",
        resolvedAt: method === "cash" ? new Date() : undefined,
        resolvedBy: method === "cash" ? session.username : undefined,
        createdByUsername: session.username,
        createdByName: session.name,
      })
    ).toObject();

  const madeCash = cashPart > 0 ? await makeCollect(cashPart, "cash") : null;
  const madeBills = [];
  for (const b of bills) madeBills.push(await makeCollect(b.amount, "transfer", b.code));
  for (const doc of [madeCash, ...madeBills]) {
    if (doc) pushSheetInBackground(() => pushCollectRow(doc), BaobayCollect, doc._id);
  }
  const saved = (madeCash ?? madeBills[0])!;

  /**
   * Tiền đã nhận luôn cộng vào "đã cọc", phần "còn thu" trừ đi tương ứng — thu
   * đủ thì về 0. Riêng dấu "cọc → TK công ty" chỉ bật khi CÓ phần CHUYỂN KHOẢN,
   * vì tiền mặt là người thu đang cầm, chưa về tài khoản công ty.
   */
  /**
   * "CÒN THU" LUÔN TRỪ ĐÚNG SỐ TIỀN THẬT NHẬN, không tin vào nút "Thu đủ".
   *
   * Một booking trả làm nhiều lần là chuyện thường (đoàn ghép, khách góp tiền
   * dần). Trước đây bấm "Thu đủ" là máy quét "còn thu" về 0 bất kể gõ bao nhiêu
   * — nhân viên gõ 3 triệu trên booking 5 triệu là mất trắng 2 triệu phải thu,
   * không ai biết. Nút "Thu đủ" giờ chỉ để ĐIỀN SẴN số, không quyết định sổ.
   */
  const set: Record<string, unknown> = {
    remaining: Math.max(0, (booking.remaining ?? 0) - amount),
    deposit: (booking.deposit ?? 0) + amount,
    // Có tiền MỚI về là booking coi như chưa soát lại — tích ✓CK/✓TM tự tắt
    ...(transferPart > 0 ? { ckCheckedAt: null } : {}),
    ...(cashPart > 0 ? { tmCheckedAt: null } : {}),
  };
  if (transferPart > 0) {
    set.depositToCompany = true;
    // Ô "mã CK" trên booking chỉ chứa được một mã — lấy bill đầu, các bill khác
    // vẫn đầy đủ trong sổ lệnh thu
    if (!booking.transferCode) set.transferCode = bills[0]?.code ?? "";
  }
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: set,
      // Vệt thu ghi thẳng lên booking — mỗi đường tiền một dòng riêng
      $push: {
        collectedLog: {
          $each: [
            ...(cashPart > 0
              ? [{ amount: cashPart, method: "cash", byName: session.name, at: new Date(), kind: isFull ? "full" : "deposit" }]
              : []),
            ...bills.map((b) => ({
              amount: b.amount,
              method: "transfer",
              byName: session.name,
              at: new Date(),
              kind: isFull ? "full" : "deposit",
              // MÃ GD đi theo từng bill — dòng booking hiện "GD #1234" cho kế toán đối soát
              code: b.code,
            })),
          ],
        },
      },
    },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);

  return { booking: toBookingDTO(updated), collect: toCollectDTO({ ...saved, sheetSynced: false }) };
}

/**
 * KHÁCH ĐĂNG KÝ THÊM DỊCH VỤ tại bãi (thấy người ta bay flycam đẹp quá nên mua
 * thêm) — cộng vào đúng booking đang có, tính lại tiền, rồi thu luôn nếu khách
 * trả ngay.
 *
 * Cộng dồn vào booking thay vì lập booking mới: khách vẫn là khách ấy, chuyến
 * vẫn chuyến ấy. Lập bản mới thì đếm khách thành hai lần, mà đối chiếu cuối
 * ngày lại lệch.
 *
 * Combo flycam + 360 tính LẠI TRÊN TỔNG sau khi cộng: khách đã có flycam, giờ
 * mua thêm 360 thì thành một cặp và được bớt 100k — đúng như mua cùng lúc.
 */
/** Ảnh chụp các số của booking trước khi sửa dịch vụ — nguồn để hoàn tác. */
function serviceSnapshot(b: any) {
  return {
    flycam: b.flycam ?? 0,
    video360: b.video360 ?? 0,
    redFlag: b.redFlag ?? 0,
    sunset: b.sunset ?? 0,
    flagFlight: b.flagFlight ?? 0,
    comboDiscount: b.comboDiscount ?? 0,
    discount: b.discount ?? 0,
    totalAmount: b.totalAmount ?? 0,
    deposit: b.deposit ?? 0,
    remaining: b.remaining ?? 0,
    note: b.note ?? "",
    collectedLog: b.collectedLog ?? [],
  };
}

/** Nhãn đọc được của booking, giữ lại trong sổ phòng khi sau này đổi tên. */
function bookingLabelOf(b: any): string {
  return `#${b.daySeq ?? "?"} ${b.contactName || b.phone || "khách"}`;
}

/** Camera man được sửa dịch vụ trong bao nhiêu ngày gần đây (kể cả hôm nay). */
export const CAMERAMAN_SERVICE_DAYS = 3;

/**
 * GIỚI HẠN CỦA CAMERA MAN khi tự thêm/bớt dịch vụ.
 *
 * Khách hay đòi mua flycam ngay tại bãi, người quay là người chốt — nên camera
 * man được sửa booking, nhưng chỉ trong hai vạch:
 *  1. CHỈ flycam (dịch vụ do chính họ làm), không đụng 360/cờ đỏ/hoàng hôn.
 *  2. CHỈ ngày bay trong 3 ngày gần nhất (hôm kia, hôm qua, hôm nay) — sổ cũ
 *     là việc của kế toán.
 * Người kiêm điều phối/quầy/kế toán/admin không bị chặn.
 */
function assertCameramanServiceLimits(
  // viaAdmin = token quản trị website, không nằm trong BaobaySession chuẩn
  session: BaobaySession & { viaAdmin?: boolean },
  qty: Record<string, number | undefined>,
  flightDate: string,
) {
  const privileged =
    session.viaAdmin ||
    wearsRole(session, "admin") ||
    wearsRole(session, "dispatcher") ||
    wearsRole(session, "counter") ||
    wearsRole(session, "accountant");
  if (privileged || !wearsRole(session, "cameraman")) return;

  const others = ["video360", "redFlag", "sunset", "flagFlight"] as const;
  if (others.some((k) => (qty[k] ?? 0) > 0)) {
    throw new BaobayError("Camera man chỉ được thêm hoặc bớt dịch vụ flycam", 403);
  }

  const oldest = shiftDateKey(todayInVN(), -(CAMERAMAN_SERVICE_DAYS - 1));
  if (flightDate < oldest || flightDate > todayInVN()) {
    throw new BaobayError(
      `Camera man chỉ sửa được dịch vụ của ${CAMERAMAN_SERVICE_DAYS} ngày gần nhất (từ ${formatDateKeyVN(oldest)})`,
      403,
    );
  }
}

export async function addBookingServices(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    add: { flycam?: number; video360?: number; redFlag?: number; sunset?: number; flagFlight?: number };
    /** Giảm trừ riêng cho lần đăng ký thêm này (cộng vào giảm trừ của booking). */
    discount?: number;
    note?: string;
    /** Thu luôn: tiền mặt và/hoặc các bill chuyển khoản. */
    pay?: { cash?: number; transfers?: Array<{ amount: number; code: string }> };
  },
): Promise<{ booking: BookingDTO; added: number; charge: number }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const booking = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);
  if (booking.status === "voided") throw new BaobayError("Booking này đã bỏ khỏi sổ", 400);

  const closed = await AccountantDailyClose.findOne({ spot, date: booking.flightDate, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không thêm dịch vụ được nữa", 400);

  assertCameramanServiceLimits(session, input.add, String(booking.flightDate ?? ""));

  const keys = ["flycam", "video360", "redFlag", "sunset", "flagFlight"] as const;
  const add = Object.fromEntries(keys.map((k) => [k, Math.max(0, Math.round(input.add[k] ?? 0))])) as Record<
    (typeof keys)[number],
    number
  >;
  const addedCount = keys.reduce((t, k) => t + add[k], 0);
  if (addedCount <= 0) throw new BaobayError("Chưa chọn dịch vụ nào để thêm", 400);

  /** Dịch vụ bám theo đầu khách: 2 khách thì tối đa 2 flycam, 2 cam360… */
  const next: Record<string, number> = {};
  for (const k of keys) {
    const sum = (booking[k] ?? 0) + add[k];
    if (sum > (booking.guestCount ?? 0)) {
      throw new BaobayError(
        `${k === "video360" ? "Camera 360" : k === "flycam" ? "Flycam" : k === "redFlag" ? "Dù cờ đỏ" : k === "sunset" ? "Bay hoàng hôn/săn mây" : "Bay kéo cờ/bánh"} vượt số khách của booking (${booking.guestCount})`,
        400,
      );
    }
    next[k] = sum;
  }

  const before = serviceSnapshot(booking);
  const discountAdd = Math.max(0, Math.round(input.discount ?? 0));
  const merged = {
    ...booking,
    ...next,
    discount: (booking.discount ?? 0) + discountAdd,
    // Combo tính lại trên TỔNG sau khi cộng — thêm 360 vào flycam sẵn có là thành cặp
    comboDiscount: comboDiscount(next.flycam, next.video360),
    ppgGuests: booking.flightKind === "ppg" ? 0 : (booking.ppgGuests ?? 0),
    ppgUnitPrice: flightUnitPrice("ppg", booking.flightDate),
  };
  const newTotal = bookingTotal(merged as never);
  /** Tiền khách phải trả THÊM lần này = tổng mới − tổng cũ. */
  const charge = Math.max(0, newTotal - (booking.totalAmount ?? 0));

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: {
        ...next,
        discount: merged.discount,
        comboDiscount: merged.comboDiscount,
        totalAmount: newTotal,
        remaining: Math.max(0, newTotal - (booking.deposit ?? 0) - (booking.agencyPaidAmount ?? 0)),
        note: [
          booking.note,
          `đăng ký thêm: ${keys
            .filter((k) => add[k] > 0)
            .map((k) => `${add[k]}×${k === "video360" ? "cam360" : k === "flycam" ? "flycam" : k === "redFlag" ? "cờ đỏ" : k === "sunset" ? "hoàng hôn" : "kéo cờ"}`)
            .join(" ")} (${session.name || session.username})`,
          input.note?.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
      },
    },
    { new: true },
  ).lean<any>();
  const pendingBase = await markBookingChanged(booking, updated);
  updated.notifyPendingBase = pendingBase;
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);

  /** Khách trả ngay tại chỗ thì ghi luôn lệnh thu — khỏi bấm sang thẻ khác. */
  const pay = input.pay;
  const payTotal = (pay?.cash ?? 0) + (pay?.transfers ?? []).reduce((t, b) => t + (b.amount || 0), 0);
  let result = toBookingDTO(updated);
  let collectIds: mongoose.Types.ObjectId[] = [];
  if (payTotal > 0) {
    const t0 = new Date();
    const res = await collectForBooking(session, spot, id, {
      cash: pay?.cash ?? 0,
      transfers: pay?.transfers ?? [],
      kind: "deposit",
    });
    result = res.booking;
    // collectForBooking không trả về id, nên nhặt lại các lệnh vừa sinh ra
    const made = await BaobayCollect.find({ spot, bookingId: booking._id, createdAt: { $gte: t0 } })
      .select("_id")
      .lean<any[]>();
    collectIds = made.map((c) => c._id);
  }

  // Ghi vào sổ để sau còn sửa lại được (xem models/BaobayServiceChange.model.ts)
  await BaobayServiceChange.create({
    spot,
    date: booking.flightDate,
    bookingId: booking._id,
    bookingLabel: bookingLabelOf(booking),
    kind: "add",
    items: add,
    discount: discountAdd,
    charge,
    back: 0,
    refunded: 0,
    reason: input.note?.trim() || "",
    before,
    collectIds,
    createdByUsername: session.username,
    createdByName: session.name,
  });

  return { booking: result, added: addedCount, charge };
}

/* ================================================================== */
/* Lệnh hoàn tiền cho khách                                            */
/* ================================================================== */

export type RefundDTO = {
  id: string;
  date: string;
  guestName: string;
  bookingCode?: string;
  guests: number;
  paid: number;
  usedServices?: string;
  usedFee: number;
  amount: number;
  method: "cash" | "transfer";
  bankAccount?: string;
  status: "done" | "pending" | "paid" | "voided";
  reason?: string;
  note?: string;
  createdByName: string;
  paidBy?: string;
  transferCode?: string;
  createdAt: string;
};

function toRefundDTO(d: any): RefundDTO {
  return {
    id: String(d._id),
    date: d.date,
    guestName: d.guestName || "",
    bookingCode: d.bookingCode || undefined,
    guests: d.guests || 0,
    paid: d.paid || 0,
    usedServices: d.usedServices || undefined,
    usedFee: d.usedFee || 0,
    amount: d.amount || 0,
    method: d.method === "cash" ? "cash" : "transfer",
    bankAccount: d.bankAccount || undefined,
    status: d.status,
    reason: d.reason || undefined,
    note: d.note || undefined,
    createdByName: d.createdByName || "",
    paidBy: d.paidBy || undefined,
    transferCode: d.transferCode || undefined,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
  };
}

/**
 * Lập LỆNH HOÀN TIỀN. Tiền mặt xong ngay tại bãi; chuyển khoản thì nằm chờ kế
 * toán — xem chú thích ở models/BaobayRefund.
 */
export async function createRefund(
  session: BaobaySession,
  spotRaw: string,
  input: {
    date: string;
    bookingId?: string;
    guestName: string;
    bookingCode?: string;
    guests?: number;
    paid?: number;
    usedServices?: string;
    usedFee?: number;
    amount: number;
    method: "cash" | "transfer";
    bankAccount?: string;
    reason?: string;
  },
): Promise<RefundDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const amount = Math.max(0, Math.round(input.amount || 0));
  if (amount <= 0) throw new BaobayError("Số tiền hoàn phải lớn hơn 0", 400);

  const doc = (
    await BaobayRefund.create({
      spot,
      date: isDateKey(input.date) ? input.date : todayInVN(),
      bookingId: input.bookingId && mongoose.Types.ObjectId.isValid(input.bookingId) ? input.bookingId : undefined,
      guestName: input.guestName || "",
      bookingCode: input.bookingCode || "",
      guests: Math.max(0, Math.round(input.guests ?? 0)),
      paid: Math.max(0, Math.round(input.paid ?? 0)),
      usedServices: (input.usedServices ?? "").trim(),
      usedFee: Math.max(0, Math.round(input.usedFee ?? 0)),
      amount,
      method: input.method === "cash" ? "cash" : "transfer",
      bankAccount: (input.bankAccount ?? "").trim(),
      /** Tiền mặt là xong ngay; chuyển khoản phải qua tay kế toán. */
      status: input.method === "cash" ? "done" : "pending",
      reason: (input.reason ?? "").trim(),
      createdByUsername: session.username,
      createdByName: session.name,
    })
  ).toObject();

  /**
   * Cộng vào TỔNG ĐÃ HOÀN của booking — dòng tóm tắt cần con số này để kể đúng
   * "đã thanh toán X · hoàn Y · còn thu Z". Trước đây tiền hoàn chỉ trừ vào ô
   * "đã cọc", nên trên màn hiện "cọc 2.890k" — một con số không có thật, khách
   * đã trả 3.290k rồi được hoàn 400k chứ chưa từng cọc đồng nào.
   */
  if (doc.bookingId) {
    await BaobayBooking.updateOne({ _id: doc.bookingId }, { $inc: { refundedTotal: amount } });
  }
  return toRefundDTO(doc);
}

/** Kế toán xác nhận đã chuyển tiền hoàn — sửa được số và ghi chú trước khi chốt. */
export async function payRefund(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: { amount?: number; transferCode: string; note?: string },
): Promise<RefundDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const code = (input.transferCode ?? "").trim();
  if (!code) throw new BaobayError("Ghi mã giao dịch đã chuyển cho khách", 400);

  const set: Record<string, unknown> = {
    status: "paid",
    paidAt: new Date(),
    paidBy: session.name || session.username,
    transferCode: code,
  };
  if (input.amount !== undefined) {
    const amount = Math.max(0, Math.round(input.amount));
    if (amount <= 0) throw new BaobayError("Số tiền hoàn phải lớn hơn 0", 400);
    set.amount = amount;
  }
  if (input.note !== undefined) set.note = String(input.note).trim();

  const before = await BaobayRefund.findOne({ _id: id, spot, status: "pending" }).select("amount bookingId").lean<any>();
  const doc = await BaobayRefund.findOneAndUpdate({ _id: id, spot, status: "pending" }, { $set: set }, { new: true }).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy lệnh hoàn đang chờ", 404);
  // Kế toán sửa số tiền lúc chuyển: tổng đã hoàn của booking phải chạy theo
  const diff = (doc.amount ?? 0) - (before?.amount ?? 0);
  if (diff !== 0 && doc.bookingId) {
    await BaobayBooking.updateOne({ _id: doc.bookingId }, { $inc: { refundedTotal: diff } });
  }
  return toRefundDTO(doc);
}

export async function listRefunds(spotRaw: string, date: string): Promise<RefundDTO[]> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  /** Ngày đang xem + MỌI lệnh còn chờ của ngày trước — tiền của khách không được quên. */
  const docs = await BaobayRefund.find({ spot, $or: [{ date }, { status: "pending" }] })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean<any[]>();
  return docs.map(toRefundDTO);
}

/**
 * HUỶ DỊCH VỤ TUỲ CHỌN đã đăng ký (flycam hỏng, khách đổi ý, không kịp quay).
 *
 * Bớt số lượng trong booking rồi tính lại tiền — kể cả combo: bỏ camera 360 thì
 * cặp flycam+360 tan, phần bớt 100k cũng mất theo, nếu không thì tổng tiền sai
 * mà chẳng ai soi ra.
 *
 * Số tiền lùi lại đi một trong hai đường, người xử lý chọn:
 *  - "credit": trừ vào phần khách CÒN PHẢI THU — hay gặp nhất, khách chưa trả
 *    hết thì cứ bớt vào chỗ chưa trả, không ai phải đếm tiền.
 *  - "refund": khách đã trả rồi nên phải TRẢ LẠI — lập lệnh hoàn như mọi lệnh
 *    hoàn khác (tiền mặt trừ vào người trực, chuyển khoản chờ kế toán).
 */
/**
 * HUỶ BỚT KHÁCH — đăng ký 2 huỷ 1 thì booking VẪN LÀ MỘT DÒNG: số khách đang
 * chạy giảm, ô `cancelledGuests` nhớ phần huỷ để in "2 khách (huỷ 1)" đỏ, và
 * tiền tự trừ đúng đơn giá. Trước đây không có đường này nên quầy phải tạo
 * booking trùng chỉ để ghi dấu huỷ (vụ Hà Văn Thận #2/#7 ngày 20/08).
 */
export async function cancelBookingGuests(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  count: number,
  reason: string,
  refundInput?: { amount: number; method: "cash" | "transfer"; bankAccount?: string },
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const booking = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);
  if (booking.status === "voided" || booking.status === "cancelled")
    throw new BaobayError("Booking này đã huỷ/bỏ khỏi sổ rồi", 400);

  const n = Math.max(0, Math.round(count));
  if (n < 1) throw new BaobayError("Số khách huỷ phải từ 1 trở lên", 400);
  if (n >= (booking.guestCount || 0))
    throw new BaobayError("Huỷ hết khách thì dùng nút ✕ Huỷ booking (huỷ cả booking)", 400);

  const closed = await AccountantDailyClose.findOne({ spot, date: booking.flightDate, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không sửa được nữa", 400);

  // Tiền bay của phần khách huỷ = đơn giá × số huỷ; dịch vụ muốn bớt thì dùng
  // thẻ ➕➖ DỊCH VỤ (có đường hoàn tiền riêng), đây chỉ đụng tiền BAY.
  const cut = (booking.unitPrice || 0) * n;
  const newGuests = (booking.guestCount || 0) - n;
  const newTotal = Math.max(0, (booking.totalAmount || 0) - cut);

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $inc: { cancelledGuests: n },
      $set: {
        guestCount: newGuests,
        // PPG không được nhiều hơn tổng khách còn lại
        ppgGuests: Math.min(booking.ppgGuests || 0, newGuests),
        totalAmount: newTotal,
        remaining: Math.max(0, newTotal - (booking.deposit || 0) - (booking.agencyPaidAmount || 0)),
        note: [
          booking.note,
          `huỷ ${n} khách (−${cut.toLocaleString("vi-VN")} đ${reason ? `, ${reason}` : ""}) by ${
            session.name || session.username
          }`,
        ]
          .filter(Boolean)
          .join(" — "),
      },
    },
    { new: true },
  ).lean<any>();

  /**
   * Khách đã trả tiền cho phần huỷ thì lập LỆNH HOÀN đúng đường hoàn tiền
   * chuẩn (TM xong ngay, CK chờ kế toán) — tiền hoàn hiện trong khay hoàn và
   * money board như mọi khoản hoàn khác.
   */
  if (refundInput && refundInput.amount > 0) {
    await createRefund(session, spot, {
      date: todayInVN(),
      bookingId: id,
      guestName: booking.contactName || "",
      bookingCode: booking.bookingCode || "",
      guests: n,
      amount: refundInput.amount,
      method: refundInput.method,
      bankAccount: refundInput.bankAccount ?? "",
      reason: `huỷ ${n}/${booking.guestCount} khách${reason ? ` — ${reason}` : ""}`,
    } as any);
  }

  /**
   * Huỷ bớt người thì hồ sơ bảo hiểm cũng phải bớt theo — đánh dấu `n` dòng
   * cuối là huỷ rồi đẩy lại bảng. Nạp động vì tệp kia có nạp ngược lại tệp này.
   */
  {
    const ins = await import("@/services/baobay-insurance.service");
    await ins.cancelInsuredGuests(spot, id, n, `huỷ ${n} khách${reason ? ` — ${reason}` : ""}`);
  }

  updated.notifyPendingBase = await markBookingChanged(booking, updated);
  return toBookingDTO(updated);
}

export async function removeBookingServices(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    remove: { flycam?: number; video360?: number; redFlag?: number; sunset?: number; flagFlight?: number };
    mode: "credit" | "refund";
    refundMethod?: "cash" | "transfer";
    bankAccount?: string;
    reason?: string;
    /**
     * Số tiền hoàn THẬT — người huỷ sửa được. Bỏ trống thì lấy đúng số máy tính
     * ra. Có sửa vì thực tế hay khác bảng giá: khách bay rồi mới hỏng flycam
     * nên bù thêm, hoặc hai bên thoả thuận hoàn một phần.
     */
    refundAmount?: number;
    /**
     * Số LÙI LẠI cho khách (trước khi chọn trừ vào còn thu hay trả tiền) —
     * cũng sửa tay được. Bỏ trống thì lấy số theo bảng giá.
     */
    backAmount?: number;
  },
): Promise<{ booking: BookingDTO; back: number; refunded: number }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const booking = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);

  const closed = await AccountantDailyClose.findOne({ spot, date: booking.flightDate, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không sửa dịch vụ được nữa", 400);

  assertCameramanServiceLimits(session, input.remove, String(booking.flightDate ?? ""));

  const before = serviceSnapshot(booking);
  const keys = ["flycam", "video360", "redFlag", "sunset", "flagFlight"] as const;
  const label: Record<(typeof keys)[number], string> = {
    flycam: "Flycam",
    video360: "Camera 360",
    redFlag: "Dù cờ đỏ",
    sunset: "Bay hoàng hôn/săn mây",
    flagFlight: "Bay kéo cờ/bánh",
  };
  const next: Record<string, number> = {};
  let removedCount = 0;
  for (const k of keys) {
    const cut = Math.max(0, Math.round(input.remove[k] ?? 0));
    if (cut > (booking[k] ?? 0)) {
      throw new BaobayError(`${label[k]}: booking chỉ đăng ký ${booking[k] ?? 0}, không huỷ được ${cut}`, 400);
    }
    next[k] = (booking[k] ?? 0) - cut;
    removedCount += cut;
  }
  if (removedCount <= 0) throw new BaobayError("Chưa chọn dịch vụ nào để huỷ", 400);

  const newCombo = comboDiscount(next.flycam, next.video360);
  /**
   * BỎ MỘT NỬA CẶP thì ưu đãi combo tan rã. Nhưng huỷ dịch vụ hầu như luôn là
   * lỗi bên mình (máy hỏng, người quay bận), nên KHÔNG bắt khách gánh trọn phần
   * ưu đãi mất đi: công ty chịu một nửa.
   *
   * Ví dụ khách mua combo flycam + 360, huỷ 1 camera 360 (400k):
   *   combo mất 100k → khách chịu 50k, công ty chịu 50k → khách nhận lại 350k.
   *
   * Phần công ty chịu ghi thành GIẢM TRỪ trên booking, để tổng tiền tụt đúng
   * bằng số trả lại khách — không thì sổ lệch 50k mà chẳng ai lần ra.
   */
  const comboLost = Math.max(0, (booking.comboDiscount ?? 0) - newCombo);
  const courtesy = Math.round(comboLost / 2);
  const merged = {
    ...booking,
    ...next,
    comboDiscount: newCombo,
    discount: (booking.discount ?? 0) + courtesy,
    ppgGuests: booking.flightKind === "ppg" ? 0 : (booking.ppgGuests ?? 0),
    ppgUnitPrice: flightUnitPrice("ppg", booking.flightDate),
  };
  const naturalTotal = bookingTotal(merged as never);
  const oldTotal = booking.totalAmount ?? 0;
  /** Tiền lùi lại theo BẢNG GIÁ = tổng cũ − tổng mới (đã gồm phần công ty chịu). */
  const autoBack = Math.max(0, oldTotal - naturalTotal);
  /**
   * Người huỷ sửa được số lùi lại. Trần là TỔNG TIỀN của booking — lùi nhiều
   * hơn cả đơn hàng thì thành âm, vô nghĩa.
   */
  const back = Number.isFinite(input.backAmount as number)
    ? Math.min(oldTotal, Math.max(0, Math.round(input.backAmount as number)))
    : autoBack;
  /**
   * Chốt tổng mới theo đúng số lùi lại đã chọn. Lùi NHIỀU hơn bảng giá thì phần
   * chênh ghi thành giảm trừ (để công thức đơn giá × khách − giảm trừ vẫn ra
   * đúng con số này); lùi ÍT hơn thì giữ nguyên giảm trừ, tổng cao hơn mức
   * bảng giá và ghi rõ trong ghi chú là sửa tay.
   */
  const newTotal = Math.max(0, oldTotal - back);
  merged.discount = (merged.discount ?? 0) + Math.max(0, naturalTotal - newTotal);

  const deposit = booking.deposit ?? 0;
  /**
   * Số hoàn mặc định là số máy tính ra, nhưng người huỷ SỬA ĐƯỢC — chỉ chặn
   * đúng một điều: không hoàn quá số khách đã trả, vì phần đó công ty chưa hề
   * cầm. Hoàn ít hơn thì phần dôi trừ vào tiền còn thu; hoàn nhiều hơn số lùi
   * lại thì khách hoá ra còn nợ, và số "còn thu" tự tăng đúng bằng chênh lệch.
   */
  const wanted = Number.isFinite(input.refundAmount as number)
    ? Math.max(0, Math.round(input.refundAmount as number))
    : back;
  const refunded = input.mode === "refund" ? Math.min(wanted, deposit) : 0;
  if (input.mode === "refund" && wanted > deposit) {
    throw new BaobayError(
      `Khách mới trả ${deposit.toLocaleString("vi-VN")} đ — không hoàn được ${wanted.toLocaleString("vi-VN")} đ`,
      400,
    );
  }
  const newDeposit = deposit - refunded;

  const cutText = keys
    .filter((k) => (input.remove[k] ?? 0) > 0)
    .map((k) => `${input.remove[k]}×${label[k]}`)
    .join(", ");

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      // Phần huỷ được NHỚ LẠI — dòng booking in "2×360 (huỷ 1)" đỏ thay vì
      // số cứ teo đi không dấu vết
      $inc: {
        cancelledFlycam: input.remove.flycam ?? 0,
        cancelledVideo360: input.remove.video360 ?? 0,
        cancelledRedFlag: input.remove.redFlag ?? 0,
        cancelledSunset: input.remove.sunset ?? 0,
        cancelledFlagFlight: input.remove.flagFlight ?? 0,
      },
      $set: {
        ...next,
        comboDiscount: merged.comboDiscount,
        discount: merged.discount,
        totalAmount: newTotal,
        deposit: newDeposit,
        remaining: Math.max(0, newTotal - newDeposit - (booking.agencyPaidAmount ?? 0)),
        note: [
          booking.note,
          `huỷ dịch vụ: ${cutText} (−${back.toLocaleString("vi-VN")} đ${
            back !== autoBack ? ` (bảng giá ${autoBack.toLocaleString("vi-VN")} đ, sửa tay)` : ""
          }, ${
            input.mode === "refund"
              ? `hoàn khách ${refunded.toLocaleString("vi-VN")} đ${
                  refunded !== back ? " (sửa tay)" : ""
                }`
              : "trừ vào tiền còn thu"
          }${courtesy > 0 ? `, công ty chịu ${courtesy.toLocaleString("vi-VN")} đ ưu đãi combo` : ""}) — ${
            session.name || session.username
          }`,
          input.reason?.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
      },
    },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);

  let refundId: mongoose.Types.ObjectId | undefined;
  if (refunded > 0) {
    const made = await createRefund(session, spot, {
      date: booking.flightDate,
      bookingId: String(booking._id),
      guestName: booking.contactName || booking.phone || "khách",
      bookingCode: booking.bookingCode || "",
      guests: booking.guestCount || 0,
      paid: deposit,
      usedServices: "",
      usedFee: 0,
      amount: refunded,
      method: input.refundMethod === "cash" ? "cash" : "transfer",
      bankAccount: input.bankAccount ?? "",
      reason: `huỷ dịch vụ: ${cutText}`,
    });
    refundId = new mongoose.Types.ObjectId(made.id);
  }

  // Ghi vào sổ để sau còn sửa lại được (xem models/BaobayServiceChange.model.ts)
  await BaobayServiceChange.create({
    spot,
    date: booking.flightDate,
    bookingId: booking._id,
    bookingLabel: bookingLabelOf(booking),
    kind: "remove",
    items: Object.fromEntries(keys.map((k) => [k, Math.max(0, Math.round(input.remove[k] ?? 0))])),
    discount: 0,
    charge: 0,
    back,
    refunded,
    mode: input.mode,
    refundMethod: input.refundMethod === "cash" ? "cash" : "transfer",
    reason: input.reason?.trim() || "",
    before,
    collectIds: [],
    refundId,
    createdByUsername: session.username,
    createdByName: session.name,
  });

  updated.notifyPendingBase = await markBookingChanged(booking, updated);
  return { booking: toBookingDTO(updated), back, refunded };
}



/* ================================================================== */
/* Booking tự động từ web Sa Pa (paraglidingsapa.com)                  */
/* ================================================================== */

/**
 * Ghi một booking từ web Sa Pa vào sổ điểm bay SAPA.
 *
 * Sa Pa CHƯA quản tiền nên chỉ nhận 9 thông tin cơ bản; mọi ô tiền để 0 để số
 * của điểm này không lẫn vào các phép cộng tiền của Hà Nội và Khau Phạ.
 *
 * KHOÁ THEO MÃ BOOKING của web bên đó (`ref`): gửi lại cùng một mã thì SỬA bản
 * đã có, không tạo bản thứ hai. Nhờ vậy bên web cứ gửi lại thoải mái khi khách
 * đổi giờ hay đổi số người, và lần gửi lỗi mạng thử lại cũng không sinh trùng.
 *
 * KHÔNG tự huỷ booking: khách bỏ bay là việc người trực xác nhận trên sổ, máy
 * không tự tay đóng dấu huỷ theo một cú POST.
 */
export async function ingestSapaWebBooking(input: {
  ref: string;
  flightDate: string;
  pickupTime: string;
  pickupPoint: string;
  name: string;
  phone: string;
  guests: number;
  source: string;
  note: string;
}): Promise<{ action: "created" | "updated"; id: string; ref: string }> {
  await connectDB();
  const spot = "sapa";
  const rawRef = input.ref.trim();
  if (!rawRef) throw new BaobayError("Thiếu mã booking (ref)", 400);
  /**
   * MÃ BOOKING NÓI RÕ TỪ WEB NÀO — điểm Sa Pa bán trên cả hai web:
   *    WebMBL…   đơn từ mebayluon.com   (xem mapWebBooking trong baobay-web-sync)
   *    WebSapa…  đơn từ paraglidingsapa.com
   *
   * Mã gốc bên web Sa Pa là "DDMM + số điện thoại đủ mã nước" (vd
   * 250884912345678) — dán nguyên vào sổ thì dòng khách dài ngoằng. Nên mã hiện
   * trên sổ chỉ lấy 6 ký tự cuối, còn mã GỐC lưu ở `otaRef` để tra ngược.
   *
   * CHỐNG TRÙNG thì khoá theo mã GỐC (`otaRef`), không theo mã ngắn: hai khách
   * khác nhau vẫn có thể trùng 6 số cuối, mà khoá theo mã ngắn thì đơn sau ghi
   * đè đơn trước — mất hẳn một khách.
   */
  const digits = rawRef.replace(/\D/g, "") || rawRef.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!isDateKey(input.flightDate)) throw new BaobayError("Ngày bay không hợp lệ (cần YYYY-MM-DD)", 400);

  const guests = Math.max(0, Math.round(input.guests || 0));
  if (guests <= 0) throw new BaobayError("Số lượng khách phải lớn hơn 0", 400);

  /** Điểm đón là chữ tự do bên web nên xếp vào kiểu đón "other" (xem form Sa Pa). */
  const fields = {
    flightDate: input.flightDate,
    source: input.source.trim() || "Web Sa Pa",
    contactName: input.name.trim() || "khách web Sa Pa",
    phone: input.phone.trim(),
    guestCount: guests,
    pickup: "other" as const,
    pickupNote: input.pickupPoint.trim(),
    expectedTime: input.pickupTime.trim(),
    note: input.note.trim(),
  };

  /**
   * Tìm đơn cũ CHỈ theo mã GỐC. Trước có thử tìm cả theo mã ngắn — sai ngay:
   * hai khách khác nhau trùng 6 số cuối là đơn sau ghi đè đơn trước, mất hẳn
   * một khách (đã bắt được bằng phép thử).
   */
  const existing = await BaobayBooking.findOne({ spot, otaRef: rawRef }).lean<any>();

  /**
   * Mã hiện trên sổ: "WebSapa" + 6 số cuối cho ngắn gọn. Nếu 6 số cuối đó đã
   * thuộc về một đơn KHÁC thì nới dần (8 số, rồi cả mã) — thà mã dài hơn chứ
   * không để hai khách mang chung một mã.
   */
  let ref = `WebSapa${digits.slice(-6)}`;
  if (!existing) {
    for (const candidate of [digits.slice(-6), digits.slice(-8), digits]) {
      const code = `WebSapa${candidate}`;
      const taken = await BaobayBooking.exists({ spot, bookingCode: code, otaRef: { $ne: rawRef } });
      if (!taken) {
        ref = code;
        break;
      }
      ref = `WebSapa${digits}`;
    }
  } else {
    ref = existing.bookingCode || ref;
  }
  if (existing) {
    /** Đã huỷ hoặc đã bỏ khỏi sổ thì để yên — người trực đã quyết, máy không lật lại. */
    if (existing.status === "cancelled" || existing.status === "voided") {
      return { action: "updated", id: String(existing._id), ref };
    }
    const updated = await BaobayBooking.findOneAndUpdate(
      { _id: existing._id },
      { $set: { ...fields, bookingCode: ref, otaRef: rawRef } },
      { new: true },
    ).lean<any>();
    pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
    return { action: "updated", id: String(updated._id), ref };
  }

  const created = (
    await BaobayBooking.create({
      spot,
      ...fields,
      daySeq: await nextDaySeq(spot, input.flightDate),
      createdByUsername: "web:sapa",
      createdByName: "Web Sa Pa (tự động)",
      bookingCode: ref,
      // Mã GỐC bên web Sa Pa — để tra ngược đúng đơn trên trang đó
      otaRef: rawRef,
      otaName: "sapaweb",
      flightKind: "pg",
      ppgGuests: 0,
      flycam: 0,
      video360: 0,
      redFlag: 0,
      sunset: 0,
      flagFlight: 0,
      mountainCar: 0,
      // Sa Pa chưa quản tiền — mọi ô tiền để 0
      unitPrice: 0,
      discount: 0,
      comboDiscount: 0,
      pickupFee: 0,
      totalAmount: 0,
      deposit: 0,
      remaining: 0,
      depositToCompany: false,
      transferCode: "",
      status: "open",
    })
  ).toObject();
  pushSheetInBackground(() => pushBookingRow(created), BaobayBooking, created._id);
  return { action: "created", id: String(created._id), ref };
}

/* ================================================================== */
/* Sổ THÊM / HUỶ dịch vụ — liệt kê và hoàn tác để nhập lại              */
/* ================================================================== */

export type ServiceChangeDTO = {
  id: string;
  date: string;
  bookingId: string;
  bookingLabel: string;
  kind: "add" | "remove";
  items: { flycam: number; video360: number; redFlag: number; sunset: number; flagFlight: number };
  discount: number;
  charge: number;
  back: number;
  refunded: number;
  mode?: "credit" | "refund";
  refundMethod?: "cash" | "transfer";
  reason: string;
  by: string;
  at: string;
  undone: boolean;
};

function toServiceChangeDTO(doc: any): ServiceChangeDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    bookingId: String(doc.bookingId),
    bookingLabel: doc.bookingLabel || "",
    kind: doc.kind,
    items: {
      flycam: doc.items?.flycam ?? 0,
      video360: doc.items?.video360 ?? 0,
      redFlag: doc.items?.redFlag ?? 0,
      sunset: doc.items?.sunset ?? 0,
      flagFlight: doc.items?.flagFlight ?? 0,
    },
    discount: doc.discount ?? 0,
    charge: doc.charge ?? 0,
    back: doc.back ?? 0,
    refunded: doc.refunded ?? 0,
    mode: doc.mode,
    refundMethod: doc.refundMethod,
    reason: doc.reason || "",
    by: doc.createdByName || doc.createdByUsername || "",
    at: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    undone: Boolean(doc.undoneAt),
  };
}

/** Các lần thêm/huỷ dịch vụ của một ngày bay — mới nhất lên đầu. */
export async function listServiceChanges(
  spotRaw: string,
  date: string,
  /** Chỉ trả các lần do ĐÚNG người này thao tác — camera man không được xem sổ của người khác. */
  onlyByUsername?: string,
): Promise<ServiceChangeDTO[]> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const docs = await BaobayServiceChange.find({
    spot,
    date,
    ...(onlyByUsername ? { createdByUsername: onlyByUsername } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<any[]>();
  return docs.map(toServiceChangeDTO);
}

/**
 * HOÀN TÁC một lần thêm/huỷ dịch vụ — dùng cho nút "Sửa" (hoàn tác rồi nhập lại).
 *
 * Khôi phục đúng ẢNH CHỤP trước khi sửa thay vì cộng trừ ngược: sau lần sửa đó
 * booking có thể đã thu thêm tiền, đổi giảm trừ… cộng ngược là sai. Ảnh chụp chỉ
 * trả lại đúng các số của phần dịch vụ và tiền của lần đó.
 *
 * Chặn hai trường hợp không lùi được: ngày đã chốt, và lệnh hoàn tiền đã được
 * kế toán chuyển đi (tiền ra khỏi tài khoản rồi thì phải lập lệnh thu lại, chứ
 * không xoá lịch sử).
 */
/** Tên dịch vụ tiếng Việt cho dòng vết ghi vào booking. */
const SERVICE_KEYS = ["flycam", "video360", "redFlag", "sunset", "flagFlight"] as const;
const SERVICE_LABEL_VI: Record<(typeof SERVICE_KEYS)[number], string> = {
  flycam: "flycam",
  video360: "cam360",
  redFlag: "cờ đỏ",
  sunset: "hoàng hôn",
  flagFlight: "kéo cờ",
};

export async function undoServiceChange(
  session: BaobaySession,
  spotRaw: string,
  id: string,
): Promise<{ ok: true }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const change = await BaobayServiceChange.findOne({ _id: id, spot }).lean<any>();
  if (!change) throw new BaobayError("Không tìm thấy thao tác này", 404);
  if (change.undoneAt) throw new BaobayError("Thao tác này đã được hoàn tác rồi", 400);

  const closed = await AccountantDailyClose.findOne({ spot, date: change.date, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không sửa được nữa", 400);

  if (change.refundId) {
    const refund = await BaobayRefund.findOne({ _id: change.refundId }).select("status amount").lean<any>();
    if (refund && (refund.status === "paid" || refund.status === "done")) {
      throw new BaobayError(
        "Tiền hoàn đã trả cho khách rồi — không bỏ lệnh này được, phải lập lệnh thu lại nếu thu về",
        400,
      );
    }
    if (refund?.amount) {
      await BaobayBooking.updateOne({ _id: change.bookingId }, { $inc: { refundedTotal: -refund.amount } });
    }
    await BaobayRefund.deleteOne({ _id: change.refundId });
  }

  /**
   * TIỀN ĐÃ THU THÌ Ở NGUYÊN — KHÔNG xoá theo lệnh.
   *
   * Bản cũ xoá luôn các lệnh thu sinh kèm và trả `deposit`/`collectedLog` về
   * ảnh chụp trước đó: thu 400k của khách rồi bỏ lệnh là 400k biến mất khỏi
   * sổ, không để lại vết nào — đúng cái kẽ hở gian lận chủ lo. Nay chỉ trả
   * lại DỊCH VỤ và TỔNG TIỀN; tiền khách đã đưa vẫn nằm trong sổ, và booking
   * lập tức lệch (thu thừa) để kế toán nhìn thấy mà xử lý bù/hoàn.
   *
   * Muốn sửa TIỀN thì có đường riêng: sổ khoản thu của booking (sửa/xoá từng
   * khoản, có vết người sửa).
   */
  const b = change.before ?? {};
  const money = await BaobayCollect.find({ spot, bookingId: change.bookingId })
    .select("amount")
    .lean<any[]>();
  const collectedSum = money.reduce((t, c) => t + (c.amount || 0), 0);
  const bookingNow = await BaobayBooking.findOne({ _id: change.bookingId, spot })
    .select("deposit note agencyPaidAmount")
    .lean<any>();
  const depositNow = bookingNow?.deposit ?? 0;
  const newTotal = b.totalAmount ?? 0;

  const items = SERVICE_KEYS.filter((k) => (change.items?.[k] ?? 0) > 0)
    .map((k) => `${change.items[k]}×${SERVICE_LABEL_VI[k]}`)
    .join(", ");
  const trace =
    `BỎ LỆNH ${change.kind === "add" ? "thêm" : "huỷ"} dịch vụ (${items || "—"}) ` +
    `by ${session.name || session.username} lúc ${nowStampVN()}` +
    (collectedSum > 0 ? ` — tiền đã thu ${collectedSum.toLocaleString("vi-VN")} đ GIỮ NGUYÊN trong sổ` : "");

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: change.bookingId, spot },
    {
      $set: {
        flycam: b.flycam ?? 0,
        video360: b.video360 ?? 0,
        redFlag: b.redFlag ?? 0,
        sunset: b.sunset ?? 0,
        flagFlight: b.flagFlight ?? 0,
        comboDiscount: b.comboDiscount ?? 0,
        discount: b.discount ?? 0,
        totalAmount: newTotal,
        // Tiền giữ nguyên ⇒ còn thu tính lại theo tổng mới
        remaining: Math.max(0, newTotal - depositNow - (bookingNow?.agencyPaidAmount ?? 0)),
        // KHÔNG khôi phục note cũ — làm thế là xoá sạch vết; nối thêm dòng bỏ lệnh
        note: [bookingNow?.note, trace].filter(Boolean).join(" — "),
      },
    },
    { new: true },
  ).lean<any>();
  if (!updated) throw new BaobayError("Không tìm thấy booking của thao tác này", 404);

  await BaobayServiceChange.updateOne(
    { _id: id },
    { $set: { undoneAt: new Date(), undoneBy: session.username } },
  );
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return { ok: true };
}

/** Các khoản đã thu của một booking — để điều phối/kế toán soát và sửa. */
export async function listBookingCollects(spotRaw: string, bookingId: string): Promise<CollectDTO[]> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  if (!mongoose.Types.ObjectId.isValid(bookingId)) return [];
  const docs = await BaobayCollect.find({ spot, bookingId }).sort({ createdAt: 1 }).lean<any[]>();
  return docs.map(toCollectDTO);
}

/**
 * SỬA hoặc XOÁ một khoản đã thu (gõ nhầm số, nhầm TM/CK, nhầm mã giao dịch).
 *
 * Sửa xong dựng LẠI toàn bộ vệt thu và số "đã cọc / còn thu" của booking từ
 * chính các lệnh thu — không cộng trừ chắp vá, nên sửa bao nhiêu lần sổ vẫn
 * khớp. Phần cọc gõ tay lúc tạo booking (không có lệnh thu kèm) được giữ
 * nguyên: lấy hiệu giữa "đã cọc" và tổng lệnh thu trước khi sửa.
 */
/**
 * TÍNH LẠI TIỀN CỦA MỘT BOOKING theo đúng các lệnh thu đang gắn với nó.
 *
 * `deposit` = cọc gõ tay lúc nhập booking + tổng các lệnh thu. Tách ra dùng
 * chung cho sửa/xoá/CHUYỂN khoản thu, để ba đường đi cùng một công thức —
 * mỗi nơi tự cộng một kiểu là sổ lệch (đúng ca #16 Thu Huyền ngày 20/08).
 */
async function recomputeBookingMoney(spot: string, bookingId: string, manualBaseHint?: number) {
  const booking = await BaobayBooking.findOne({ _id: bookingId, spot }).lean<any>();
  if (!booking) return null;
  const collects = await BaobayCollect.find({ spot, bookingId }).sort({ createdAt: 1 }).lean<any[]>();
  const sum = collects.reduce((t, c) => t + (c.amount || 0), 0);
  const manualBase =
    manualBaseHint !== undefined ? Math.max(0, manualBaseHint) : Math.max(0, (booking.deposit ?? 0) - sum);
  const deposit = manualBase + sum;
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: bookingId, spot },
    {
      $set: {
        deposit,
        remaining: Math.max(0, (booking.totalAmount ?? 0) - deposit - (booking.agencyPaidAmount ?? 0)),
        depositToCompany: collects.some((c) => c.method === "transfer"),
        transferCode: collects.find((c) => c.method === "transfer")?.transferCode || "",
        collectedLog: collects.map((c) => ({
          amount: c.amount || 0,
          method: c.method === "transfer" ? "transfer" : "cash",
          byName: c.collectorName || c.createdByName || "",
          at: c.createdAt ?? new Date(),
          kind: "deposit",
        })),
      },
    },
    { new: true },
  ).lean<any>();
  if (updated) pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return { booking: updated, collects };
}

/**
 * CHUYỂN MỘT KHOẢN THU SANG BOOKING KHÁC — ghi nhầm tiền của khách này sang
 * khách kia thì sửa bằng đúng một thao tác.
 *
 * Trước đây phải xoá bên nhầm rồi thu lại bên đúng: mất dấu ai thu, thu lúc
 * nào, và giữa hai bước đó sổ đang sai. Nay khoản tiền giữ nguyên bản ghi (mã
 * giao dịch, người thu, giờ thu), chỉ đổi chủ; cả hai booking đều được ghi vết.
 *
 * Chỉ KẾ TOÁN (và admin) làm được: đây là việc sửa sổ tiền của người khác.
 */
export async function moveBookingCollect(
  session: BaobaySession & { viaAdmin?: boolean },
  spotRaw: string,
  collectId: string,
  toBookingId: string,
): Promise<{ from: BookingDTO | null; to: BookingDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!(session.viaAdmin || wearsRole(session, "accountant") || wearsRole(session, "admin"))) {
    throw new BaobayError("Chỉ kế toán mới chuyển khoản thu sang booking khác", 403);
  }
  const collect = await BaobayCollect.findOne({ _id: collectId, spot }).lean<any>();
  if (!collect) throw new BaobayError("Không tìm thấy khoản thu", 404);
  const target = await BaobayBooking.findOne({ _id: toBookingId, spot }).lean<any>();
  if (!target) throw new BaobayError("Không tìm thấy booking muốn chuyển sang", 404);
  if (String(collect.bookingId ?? "") === String(toBookingId)) {
    throw new BaobayError("Khoản này vốn đã thuộc booking đó rồi", 400);
  }

  const fromId = collect.bookingId ? String(collect.bookingId) : "";
  const fromBooking = fromId ? await BaobayBooking.findOne({ _id: fromId, spot }).lean<any>() : null;
  for (const b of [fromBooking, target]) {
    if (!b) continue;
    const closed = await AccountantDailyClose.findOne({ spot, date: b.flightDate, status: "closed" })
      .select("_id")
      .lean<any>();
    if (closed) {
      throw new BaobayError(
        `Ngày ${formatDateKeyVN(b.flightDate)} kế toán đã chốt — gỡ khoá ngày rồi mới chuyển được`,
        400,
      );
    }
  }

  /** Đo cọc GÕ TAY của hai bên TRƯỚC khi khoản tiền đổi chủ. */
  const sumOf = async (bookingId: string) =>
    (await BaobayCollect.find({ spot, bookingId }).select("amount").lean<any[]>()).reduce(
      (t, c) => t + (c.amount || 0),
      0,
    );
  const manualBaseFrom = fromBooking ? Math.max(0, (fromBooking.deposit ?? 0) - (await sumOf(fromId))) : 0;
  const manualBaseTo = Math.max(0, (target.deposit ?? 0) - (await sumOf(toBookingId)));

  const money = `${(collect.amount || 0).toLocaleString("vi-VN")} đ ${collect.method === "transfer" ? "CK" : "TM"}${
    collect.transferCode ? ` mã ${collect.transferCode}` : ""
  }`;
  const who = session.name || session.username;
  const stamp = nowStampVN();

  await BaobayCollect.updateOne(
    { _id: collectId },
    {
      $set: {
        bookingId: toBookingId,
        bookingCode: target.bookingCode || "",
        guestName: target.contactName || "",
        spot,
        note: [collect.note, `chuyển từ ${bookingLabelShort(fromBooking)} sang ${bookingLabelShort(target)} by ${who}`]
          .filter(Boolean)
          .join(" · "),
      },
    },
  );

  // Ghi vết hai đầu: bên mất tiền và bên nhận tiền đều phải đọc ra được
  if (fromBooking) {
    await BaobayBooking.updateOne(
      { _id: fromId },
      {
        $set: {
          note: [fromBooking.note, `CHUYỂN ĐI ${money} sang ${bookingLabelShort(target)} (ghi nhầm) by ${who} lúc ${stamp}`]
            .filter(Boolean)
            .join(" — "),
        },
      },
    );
  }
  await BaobayBooking.updateOne(
    { _id: toBookingId },
    {
      $set: {
        note: [target.note, `NHẬN ${money} chuyển từ ${bookingLabelShort(fromBooking)} by ${who} lúc ${stamp}`]
          .filter(Boolean)
          .join(" — "),
      },
    },
  );

  /**
   * Tính lại tiền hai bên bằng CỌC GÕ TAY đo TRƯỚC khi chuyển.
   *
   * `deposit` = cọc gõ tay + tổng lệnh thu. Nếu đo cọc gõ tay SAU khi chuyển
   * thì phần tiền vừa rời đi bị hiểu nhầm thành cọc gõ tay, và cả hai booking
   * đứng im như chưa có gì xảy ra — đúng lỗi bắt được lúc thử.
   */
  const fromRes = fromId ? await recomputeBookingMoney(spot, fromId, manualBaseFrom) : null;
  const toRes = await recomputeBookingMoney(spot, toBookingId, manualBaseTo);
  if (!toRes?.booking) throw new BaobayError("Không cập nhật được booking nhận", 500);
  return {
    from: fromRes?.booking ? toBookingDTO(fromRes.booking) : null,
    to: toBookingDTO(toRes.booking),
  };
}

/** "#4 Triệu Ngọc Vi" — nhãn ngắn dùng trong ghi chú chuyển khoản thu. */
function bookingLabelShort(b: any): string {
  if (!b) return "khoản lẻ";
  return `#${b.daySeq || "?"} ${b.contactName || b.phone || "khách"}`;
}

export async function editBookingCollect(
  session: BaobaySession,
  spotRaw: string,
  collectId: string,
  input: { amount?: number; method?: "cash" | "transfer"; transferCode?: string; remove?: boolean },
): Promise<{ booking: BookingDTO; collects: CollectDTO[] }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const collect = await BaobayCollect.findOne({ _id: collectId, spot }).lean<any>();
  if (!collect) throw new BaobayError("Không tìm thấy khoản thu", 404);
  if (!collect.bookingId) throw new BaobayError("Khoản này không gắn với booking nào — sửa trong sổ lệnh thu", 400);
  await assertBookingUnlocked(spot, String(collect.bookingId), session);

  const booking = await BaobayBooking.findOne({ _id: collect.bookingId, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);

  const closed = await AccountantDailyClose.findOne({ spot, date: booking.flightDate, status: "closed" })
    .select("_id")
    .lean<any>();
  if (closed) throw new BaobayError("Ngày này kế toán đã chốt — không sửa khoản thu được nữa", 400);

  const before = await BaobayCollect.find({ spot, bookingId: booking._id }).lean<any[]>();
  const sumBefore = before.reduce((t, c) => t + (c.amount || 0), 0);
  /** Cọc gõ tay lúc tạo booking, không có lệnh thu kèm — phải giữ lại. */
  const manualBase = Math.max(0, (booking.deposit ?? 0) - sumBefore);

  if (input.remove) {
    await BaobayCollect.deleteOne({ _id: collectId, spot });
  } else {
    const amount = Math.max(0, Math.round(input.amount ?? collect.amount ?? 0));
    if (amount <= 0) throw new BaobayError("Số tiền phải lớn hơn 0", 400);
    const method = input.method === "transfer" ? "transfer" : input.method === "cash" ? "cash" : collect.method;
    const code = (input.transferCode ?? collect.transferCode ?? "").trim();
    if (method === "transfer" && !code) throw new BaobayError("Chuyển khoản phải ghi mã giao dịch", 400);
    await BaobayCollect.updateOne(
      { _id: collectId, spot },
      {
        $set: {
          amount,
          method,
          transferCode: method === "transfer" ? code : "",
          toCompanyAccount: method === "transfer",
          /** Đổi sang tiền mặt thì người thu là người đang cầm tiền — chính người vừa sửa. */
          collectorUsername: method === "cash" ? collect.collectorUsername || session.username : undefined,
          collectorName: method === "cash" ? collect.collectorName || session.name : undefined,
          status: method === "cash" ? "collected" : "company",
          note: [collect.note, `sửa bởi ${session.name || session.username}`].filter(Boolean).join(" · "),
        },
      },
    );
  }

  const after = await BaobayCollect.find({ spot, bookingId: booking._id }).sort({ createdAt: 1 }).lean<any[]>();
  const sumAfter = after.reduce((t, c) => t + (c.amount || 0), 0);
  const deposit = manualBase + sumAfter;
  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: booking._id, spot },
    {
      $set: {
        deposit,
        remaining: Math.max(0, (booking.totalAmount ?? 0) - deposit - (booking.agencyPaidAmount ?? 0)),
        depositToCompany: after.some((c) => c.method === "transfer"),
        transferCode: after.find((c) => c.method === "transfer")?.transferCode || "",
        collectedLog: after.map((c) => ({
          amount: c.amount || 0,
          method: c.method === "transfer" ? "transfer" : "cash",
          byName: c.collectorName || c.createdByName || "",
          at: c.createdAt ?? new Date(),
          kind: "deposit",
        })),
      },
    },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  for (const c of after) pushSheetInBackground(() => pushCollectRow(c), BaobayCollect, c._id);

  return { booking: toBookingDTO(updated), collects: after.map(toCollectDTO) };
}

/**
 * GHI CHÚ GỌI KHÁCH + đánh dấu ĐÃ LIÊN HỆ.
 *
 * Khách đặt qua web hay OTA chỉ có mấy dòng máy gửi về; điều phối phải gọi xác
 * nhận, hẹn giờ, đôi khi đổi luôn lịch. Những gì nói qua điện thoại mà không
 * ghi lại thì hôm sau không ai biết đã hẹn khách mấy giờ — nên có tờ giấy nhớ
 * riêng, luôn hiện màu vàng trên dòng booking.
 */
export async function noteBookingContact(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: { contactNote?: string; contacted?: boolean },
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);

  const set: Record<string, unknown> = {};
  const unset: Record<string, string> = {};
  if (input.contactNote !== undefined) set.contactNote = String(input.contactNote).trim();
  if (input.contacted === true) {
    set.contactedAt = new Date();
    set.contactedBy = session.name || session.username;
  } else if (input.contacted === false) {
    // Bấm lại lần nữa = bỏ dấu, phòng khi tích nhầm booking
    unset.contactedAt = "";
    unset.contactedBy = "";
  }

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return toBookingDTO(updated);
}

/**
 * HOÀN TÁC trạng thái booking về "đang chờ bay".
 *
 * Bấm nhầm "đã bay" hay "huỷ" là chuyện xảy ra thật giữa lúc đông khách. Không
 * có đường lui thì người ta tạo booking mới để chữa, thành ra sổ đếm hai lần.
 * Hoàn tác XOÁ luôn dấu huỷ/hoàn tiền cũ để lần sau khai lại từ đầu, nhưng
 * KHÔNG đụng tiền đã thu (lệnh thu vẫn nguyên — tiền có thật trong két).
 */
export async function restoreBooking(session: BaobaySession, spotRaw: string, id: string): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  // Kéo dòng đã khoá về "chờ bay" là mở đường sửa lại mọi thứ — chặn luôn
  await assertBookingUnlocked(spot, id, session);
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);
  if (current.status === "open") throw new BaobayError("Booking này đang ở trạng thái chờ bay", 400);

  const was = current.status === "done" ? "đã bay" : current.status === "voided" ? "đã bỏ khỏi sổ" : "đã huỷ";

  /**
   * LỆNH HOÀN CÒN CHỜ của booking này phải CHẾT theo lần bay lại: tiền chưa
   * rời két mà lệnh vẫn nằm trang kế toán thì (1) kế toán có thể chuyển nhầm,
   * (2) huỷ lần sau lập thêm lệnh nữa là hoàn ĐÔI. Vô hiệu lệnh chờ và trả
   * refundedTotal + cọc về như trước khi huỷ. Lệnh đã chuyển/đã chi (done,
   * paid) thì giữ nguyên — tiền đã đi thật, sổ phải nhớ.
   */
  const pendingRefunds = await BaobayRefund.find({ bookingId: id, status: "pending" })
    .select("amount")
    .lean<any[]>();
  const pendingSum = pendingRefunds.reduce((t, r) => t + (r.amount || 0), 0);
  if (pendingSum > 0) {
    await BaobayRefund.updateMany(
      { bookingId: id, status: "pending" },
      { $set: { status: "voided", note: `bị vô hiệu vì booking bay lại — ${session.name || session.username}` } },
    );
  }

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: {
        status: "open",
        note: [current.note, `hoàn tác “${was}” — ${session.name || session.username}`].filter(Boolean).join(" · "),
      },
      // Lệnh hoàn chờ đã vô hiệu → cọc quay về, tổng đã hoàn rút xuống
      ...(pendingSum > 0 ? { $inc: { refundedTotal: -pendingSum, deposit: pendingSum } } : {}),
      $unset: {
        doneAt: "",
        doneBy: "",
        voidedAt: "",
        voidedBy: "",
        voidReason: "",
        voidKind: "",
        mergedInto: "",
        cancelledAt: "",
        cancelledBy: "",
        cancelTicketIssued: "",
        cancelTicketCodes: "",
        refundAmount: "",
        refundMethod: "",
      },
    },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return toBookingDTO(updated);
}

/**
 * TÁCH MỘT PHẦN nhóm khách: đoàn 10 người bay được 6, còn 4 huỷ hoặc dời sang
 * ngày khác.
 *
 * Cách làm: bớt số khách ở booking gốc rồi dựng một booking CON cho phần tách
 * ra — huỷ thì con mang trạng thái đã huỷ kèm tiền hoàn, dời thì con là booking
 * chờ bay của ngày mới. Giữ hai bản ghi thay vì sửa đè một bản: sổ ngày cũ vẫn
 * thấy "4 khách huỷ", sổ ngày mới vẫn thấy "4 khách tới" — cộng số ngày nào ra
 * số ngày ấy.
 *
 * Tiền của phần tách ra để 0: chỉ người xử lý mới biết khách trả trước bao
 * nhiêu, chia ra sao. Máy đề xuất tiền hoàn, còn lại nhân sự gõ.
 */
export async function splitBooking(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    mode: "cancel" | "move";
    guests: number;
    toDate?: string;
    ticketIssued?: boolean;
    ticketCodesText?: string;
    refund?: number;
    refundMethod?: "cash" | "transfer";
    usedServices?: string;
    usedFee?: number;
    bankAccount?: string;
  },
): Promise<{ origin: BookingDTO; part: BookingDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  /**
   * Tách được cả booking ĐÃ BAY — chuyện thật 31/08/2026: đoàn 5 khách PPG,
   * quầy tích "đã bay" cả đoàn rồi mới vỡ ra chỉ 3 người bay, 2 người dời mai.
   * Chặn ở "open" thì tình huống ấy hết đường chốt sổ: gốc giữ nguyên trạng
   * thái (đã bay 3 người là thật), phần tách ra luôn là booking CHỜ ở ngày mới.
   */
  const current = await BaobayBooking.findOne({ _id: id, spot, status: { $in: ["open", "done"] } }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking này (đã huỷ/bỏ thì không tách được)", 404);

  const guests = Math.max(0, Math.round(input.guests || 0));
  if (guests <= 0) throw new BaobayError("Chưa chọn số khách tách ra", 400);
  if (guests >= (current.guestCount || 0)) {
    throw new BaobayError("Tách cả nhóm thì dùng huỷ/dời toàn bộ cho gọn", 400);
  }
  if (input.mode === "move") {
    if (!isDateKey(input.toDate ?? "")) throw new BaobayError("Dời lịch phải chọn ngày mới", 400);
    if (input.toDate === current.flightDate) throw new BaobayError("Ngày dời trùng ngày bay hiện tại", 400);
    await assertMoveDatesOpen(spot, current.flightDate, String(input.toDate));
  }

  /** Số khách còn lại ở booking gốc — dịch vụ bám đầu khách nên phải kẹp xuống. */
  const left = (current.guestCount || 0) - guests;
  const clamp = (n: number) => Math.min(Number(n) || 0, left);
  const originSet: Record<string, unknown> = {
    guestCount: left,
    ppgGuests: Math.min(Number(current.ppgGuests) || 0, left),
    flycam: clamp(current.flycam),
    video360: clamp(current.video360),
    redFlag: clamp(current.redFlag),
    sunset: clamp(current.sunset),
    flagFlight: clamp(current.flagFlight),
    mountainCar: clamp(current.mountainCar),
  };
  const originTotal = bookingTotal({
    ...current,
    ...originSet,
    ppgGuests: current.flightKind === "ppg" ? 0 : (originSet.ppgGuests as number),
    ppgUnitPrice: flightUnitPrice("ppg", current.flightDate),
  } as any);
  originSet.totalAmount = originTotal;
  /**
   * NỢ CỦA CẢ ĐOÀN KHÔNG ĐƯỢC ĐẺ THÊM khi tách. `remaining` là số nợ SỐNG —
   * đã trừ cọc, tiền đại lý và MỌI khoản thu trong ngày — nên khi dời một
   * phần đoàn sang ngày khác, đúng số đó đi theo MỘT bên (người xử lý chọn),
   * bên kia về 0. Trước đây gốc bị TÍNH LẠI từ đơn giá (quên các khoản đã
   * thu) còn phần dời bị gán "đơn giá × số khách" — đoàn 5 PPG nợ 3,2tr tách
   * 2 khách là hoá ra "còn thu 5tr": sai cả hai đầu (chuyện thật 01/09/2026).
   */
  /**
   * QUY TẮC TIỀN KHI TÁCH DỜI (luật chủ chốt 02/09/2026 — quy tắc chung, không
   * vá từng ca): GIÁ CẢ ĐOÀN GIỮ NGUYÊN THEO GIÁ GỘP — chiết khấu/giảm giá đã
   * tính trên cả nhóm, tách ra tính lại từng người là mất ưu đãi, sai giá.
   * Phần ở lại giữ đúng giá trị của nó (originTotal) và được "trả" TRƯỚC bằng
   * tiền đoàn đã đưa; toàn bộ phần còn lại NỐI NGUYÊN sang nhóm của ngày dời:
   *   - đoàn đã trả đủ/dư  → phần dời mang theo "đã trả" tương ứng, khỏi thu lại;
   *   - đoàn còn thiếu     → phần dời mang nợ, khách đến ngày mới thì thu thêm.
   * (Chuyện thật cùng ngày, hai chiều: đoàn Gia Bảo nợ 3,2tr — nợ phải theo 2
   * khách dời; đoàn Nhã Uyên trả đủ 6,58tr — 3,39tr trả trước phải theo khách.)
   */
  const groupTotal = Math.max(0, Number(current.totalAmount) || 0);
  const paidPool = (current.deposit || 0) + (current.agencyPaidAmount || 0);
  const originPaid = Math.min(paidPool, originTotal);
  const movedDeposit =
    input.mode === "move" ? Math.min(current.deposit || 0, Math.max(0, paidPool - originPaid)) : 0;
  const partTotal = input.mode === "move" ? Math.max(0, groupTotal - originPaid) : 0;
  const partRemaining = Math.max(0, partTotal - movedDeposit);
  if (input.mode === "move") {
    originSet.deposit = (current.deposit || 0) - movedDeposit;
    // Nợ (nếu có) đã nối hết sang phần dời — gốc chốt sạch
    originSet.remaining = 0;
    /**
     * Ghi nhớ số tiền đã nối đi: lệnh thu/mã CK vẫn ở gốc nên tổng lệnh thu >
     * "đã trả" của gốc là CHUYỆN ĐÚNG — phép soát LỆCH SỔ cộng số này vào để
     * không kêu oan (bản chất hai booking vẫn là MỘT đoàn).
     */
    originSet.movedPaidOut = (Number(current.movedPaidOut) || 0) + movedDeposit;
  } else {
    originSet.remaining = Math.max(0, originTotal - (current.deposit || 0) - (current.agencyPaidAmount || 0));
  }
  const debtNote = [
    // Đoàn trả đủ: nói thẳng "đã thanh toán đủ" chứ đừng nói kiểu kế toán — người đọc là quầy
    input.mode === "move" && movedDeposit > 0 && partRemaining <= 0
      ? `đã thanh toán đủ ${paidPool.toLocaleString("vi-VN")}đ — ${movedDeposit.toLocaleString("vi-VN")}đ tính theo ${guests} khách dời`
      : movedDeposit > 0
        ? `tiền trả trước ${movedDeposit.toLocaleString("vi-VN")}đ nối theo phần dời`
        : "",
    input.mode === "move" && partRemaining > 0
      ? `nợ đoàn ${partRemaining.toLocaleString("vi-VN")}đ nối theo phần dời`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  originSet.note = [
    current.note,
    input.mode === "cancel"
      ? `${guests} khách huỷ (tách nhóm) — ${session.name || session.username}`
      : `${guests} khách dời sang ${formatDateKeyVN(String(input.toDate))} — ${session.name || session.username}`,
    debtNote,
  ]
    .filter(Boolean)
    .join(" · ");

  const codes = input.ticketIssued ? parseTicketCodeList(input.ticketCodesText ?? "").codes : [];
  const refund = Math.max(0, Math.round(input.refund || 0));
  const partDate = input.mode === "move" ? String(input.toDate) : current.flightDate;

  const part = await BaobayBooking.create({
    spot,
    flightDate: partDate,
    daySeq: await nextDaySeq(spot, partDate),
    createdByUsername: session.username,
    createdByName: session.name,
    source: current.source,
    contactName: current.contactName,
    phone: current.phone,
    bookingCode: current.bookingCode,
    otaRef: undefined,
    otaName: current.otaName,
    guestCount: guests,
    flycam: 0,
    video360: 0,
    redFlag: 0,
    sunset: 0,
    flagFlight: 0,
    mountainCar: 0,
    flightKind: current.flightKind,
    ppgGuests: 0,
    pickup: current.pickup,
    pickupNote: current.pickupNote,
    expectedTime: input.mode === "move" ? "" : current.expectedTime,
    unitPrice: current.unitPrice,
    discount: 0,
    comboDiscount: 0,
    pickupFee: 0,
    /**
     * Dời: phần dời mang phần tiền còn lại của GIÁ GỘP cả đoàn — gồm tiền đã
     * trả trước nối theo (deposit) lẫn nợ chưa trả (remaining). Không tính
     * lại giá từng người kẻo mất chiết khấu/giảm giá của nhóm.
     * Huỷ: không còn gì phải thu.
     */
    totalAmount: partTotal,
    deposit: movedDeposit,
    remaining: input.mode === "move" ? partRemaining : 0,
    depositToCompany: false,
    transferCode: "",
    assignedToUsername: current.assignedToUsername,
    assignedToName: current.assignedToName,
    assignedBy: current.assignedBy,
    note: [
      `${guests}/${current.guestCount} khách dời từ ${formatDateKeyVN(current.flightDate)} (booking ${current.bookingCode || current.contactName || ""})`,
      input.mode === "move" && movedDeposit > 0 && partRemaining <= 0
        ? `đoàn đã thu đủ ${paidPool.toLocaleString("vi-VN")}đ (lệnh thu ở booking gốc) — phần này ${movedDeposit.toLocaleString("vi-VN")}đ đã trả, khỏi thu lại`
        : movedDeposit > 0
          ? `mang theo ${movedDeposit.toLocaleString("vi-VN")}đ đoàn đã trả trước — khỏi thu lại phần này`
          : "",
      input.mode === "move" && partRemaining > 0
        ? `mang theo nợ cả đoàn ${partRemaining.toLocaleString("vi-VN")}đ — thu khi khách đến`
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    status: input.mode === "cancel" ? "cancelled" : "open",
    ...(input.mode === "cancel"
      ? {
          cancelledAt: new Date(),
          cancelledBy: session.username,
          cancelTicketIssued: Boolean(input.ticketIssued),
          cancelTicketCodes: codes,
          refundAmount: refund,
          refundMethod: input.refundMethod === "cash" ? "cash" : "transfer",
        }
      : {}),
    rescheduledFrom: input.mode === "move" ? [current.flightDate] : [],
  });

  if (input.mode === "cancel" && refund > 0) {
    await createRefund(session, spot, {
      date: current.flightDate,
      bookingId: String(current._id),
      guestName: current.contactName || current.phone || "khách",
      bookingCode: current.bookingCode || "",
      guests,
      paid: current.deposit || 0,
      usedServices: (input as any).usedServices ?? "",
      usedFee: (input as any).usedFee ?? 0,
      amount: refund,
      method: input.refundMethod === "cash" ? "cash" : "transfer",
      bankAccount: (input as any).bankAccount ?? "",
      reason: `huỷ ${guests} khách trong đoàn`,
    });
  }

  const origin = await BaobayBooking.findOneAndUpdate({ _id: id, spot }, { $set: originSet }, { new: true }).lean<any>();
  pushSheetInBackground(() => pushBookingRow(origin), BaobayBooking, origin._id);
  pushSheetInBackground(() => pushBookingRow(part.toObject()), BaobayBooking, part._id);
  return { origin: toBookingDTO(origin), part: toBookingDTO(part.toObject()) };
}

/**
 * CHI CHIẾT KHẤU cho đại lý / hướng dẫn viên dẫn đoàn.
 *
 * Khoản này KHÔNG đụng vào tiền khách trả (tổng, còn thu đều giữ nguyên) và
 * KHÔNG lên phiếu gửi khách — trả ngoài, chỉ nội bộ thấy. Hai đường tiền:
 *  - TIỀN MẶT: người bấm rút từ tiền mình đang giữ ⇒ trừ vào phần họ phải nộp.
 *  - CHUYỂN KHOẢN: công ty chi từ TK ⇒ vào mục "chi từ TK công ty" của kế toán.
 *
 * Ghi đè được (đại lý đòi thêm, gõ nhầm số) — lần ghi sau thay lần trước, luôn
 * lưu ai bấm và lúc nào.
 */
/**
 * TÀI KHOẢN NHẬN CHIẾT KHẤU đã dùng gần nhất của một đại lý.
 *
 * Chi cho cùng một đại lý mỗi tuần mấy lần mà lần nào cũng gõ lại số tài khoản
 * thì vừa mất công vừa dễ gõ nhầm một chữ số. Lấy lần chi gần nhất làm gợi ý,
 * người chi vẫn sửa được.
 */
export async function lastAgencyBank(
  spotRaw: string,
  agencyName: string,
): Promise<{ bankAccount: string; bankAccountName: string } | null> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const name = agencyName.trim();
  if (!name) return null;
  const doc = await BaobayBooking.findOne({
    spot,
    "commission.agencyName": new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    "commission.bankAccount": { $nin: [null, ""] },
  })
    .sort({ "commission.at": -1 })
    .select("commission.bankAccount commission.bankAccountName")
    .lean<any>();
  if (!doc?.commission?.bankAccount) return null;
  return {
    bankAccount: doc.commission.bankAccount,
    bankAccountName: doc.commission.bankAccountName || "",
  };
}

export async function payCommission(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    amount: number;
    method: "cash" | "transfer" | "agency";
    transferCode?: string;
    note?: string;
    /** Tên đại lý nhận chiết khấu + số tài khoản để chuyển tiền + ghi chú riêng. */
    agencyName?: string;
    bankAccount?: string;
    bankAccountName?: string;
    note2?: string;
  },
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  // Booking đã khoá thì chỉ kế toán đụng được (xem assertBookingUnlocked)
  await assertBookingUnlocked(spot, id, session);
  const booking = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!booking) throw new BaobayError("Không tìm thấy booking", 404);

  // Phi công / camera man: chỉ chi cho đoàn trong ngày mình bay
  if (session.role === "pilot" || session.role === "cameraman") {
    if (!(await inCrewOfDay(spot, booking.flightDate, session.username))) {
      throw new BaobayError("Bạn không có lịch bay ngày này", 403);
    }
  }

  const amount = Math.max(0, Math.round(input.amount || 0));
  if (amount <= 0) throw new BaobayError("Chưa nhập số tiền chiết khấu", 400);
  const method =
    input.method === "transfer" ? "transfer" : input.method === "agency" ? "agency" : "cash";
  const transferCode = (input.transferCode ?? "").trim();
  if (method === "transfer" && !transferCode) {
    throw new BaobayError("Chuyển khoản phải ghi mã giao dịch", 400);
  }
  /**
   * TRỪ VÀO TIỀN ĐẠI LÝ ĐANG CẦM: chỉ có nghĩa khi đại lý THẬT SỰ đang cầm tiền
   * của booking này. Không có khoản "đại lý đã thu" thì chẳng có gì mà trừ —
   * chặn ngay, đừng để sổ mọc ra khoản chiết khấu không ai trả.
   */
  const agencyHolding = Math.max(0, Number(booking.agencyPaidAmount) || 0);
  if (method === "agency") {
    if (agencyHolding <= 0) {
      throw new BaobayError(
        "Booking này đại lý không cầm tiền nào — không trừ vào tiền đại lý được",
        400,
      );
    }
    if (amount > agencyHolding) {
      throw new BaobayError(
        `Đại lý chỉ đang cầm ${agencyHolding.toLocaleString("vi-VN")} đ, không trừ được ${amount.toLocaleString("vi-VN")} đ`,
        400,
      );
    }
  }

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: {
        commission: {
          amount,
          method,
          transferCode,
          // Bỏ trống tên đại lý thì lấy luôn đại lý khách đã đặt qua
          agencyName: (input.agencyName ?? "").trim() || (booking.agencyName ?? ""),
          bankAccount: (input.bankAccount ?? "").trim(),
          bankAccountName: (input.bankAccountName ?? "").trim(),
          note2: (input.note2 ?? "").trim(),
          byUsername: normalizeUsername(session.username),
          byName: session.name || session.username,
          at: new Date(),
          note: (input.note ?? "").trim(),
        },
      },
    },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return toBookingDTO(updated);
}

/**
 * PHI CÔNG / CAMERA MAN bấm XÁC NHẬN nhận khách được giao.
 *
 * Chỉ đúng người được giao mới xác nhận được: điều phối cần biết chắc người bay
 * đã đọc lịch, chứ không phải ai đó bấm hộ rồi cả hai cùng tưởng đã xong.
 */
/**
 * Người có mặt trong NHÓM BAY của ngày đó — dùng để cho phép chuyển khách cho
 * nhau và thu tiền hộ nhau.
 *
 * Hai nguồn, vì mỗi nguồn hụt một kiểu:
 *  - LỊCH CHẤM CA (nguồn chính): ai đi làm hôm đó, kể cả chưa được giao khách nào.
 *  - ĐANG ĐƯỢC GIAO khách hôm đó: phòng khi hôm ấy chưa chấm lịch mà vẫn phải bay.
 *
 * Nếu chỉ xét "đang được giao" thì người vừa chuyển đi khách CUỐI CÙNG sẽ mất
 * quyền ngay giữa ngày — đứng cạnh nhau ở bãi mà hết thu hộ được. Đã gặp thật
 * lúc kiểm thử.
 */
async function inCrewOfDay(spot: string, flightDate: string, username: string): Promise<boolean> {
  const me = normalizeUsername(username);
  if (await BaobayBooking.exists({ spot, flightDate, assignedToUsername: me })) return true;

  const month = flightDate.slice(0, 7);
  const day = Number(flightDate.slice(8, 10));
  const shift = await BaobayShift.findOne({ spot, month }).select("assignments").lean<any>();
  return (shift?.assignments ?? []).some(
    (a: any) => normalizeUsername(a.username) === me && (a.days ?? []).includes(day),
  );
}

export async function acceptAssignedBooking(session: BaobaySession, spotRaw: string, id: string): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);
  if (normalizeUsername(current.assignedToUsername || "") !== normalizeUsername(session.username)) {
    throw new BaobayError("Booking này không giao cho bạn", 403);
  }

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    { $set: { acceptedAt: new Date(), acceptedBy: session.name || session.username } },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);
  return toBookingDTO(updated);
}

/**
 * Đánh dấu BAY KHÔNG VÉ — chuyến có thật nhưng không xé vé giấy.
 *
 * Vẫn xảy ra: khách ngoại giao, bay bù chuyến hỏng, quầy hết vé lúc cao điểm.
 * Đánh dấu để đối chiếu cuối ngày không đòi mã vé cho chuyến này, nhưng BẮT
 * GHI LÝ DO và lưu tên người đánh dấu — bay không vé mà không ai giải thích
 * được thì đó đúng là chỗ tiền chảy ra ngoài.
 */
export async function markNoTicketFlight(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: { on: boolean; reason?: string },
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);

  const reason = (input.reason ?? "").trim();
  if (input.on && !reason) throw new BaobayError("Ghi giúp lý do bay không vé", 400);

  const updated = await BaobayBooking.findOneAndUpdate(
    { _id: id, spot },
    input.on
      ? {
          $set: {
            noTicketFlight: true,
            noTicketReason: reason,
            noTicketBy: session.name || session.username,
            noTicketAt: new Date(),
          },
        }
      : { $set: { noTicketFlight: false }, $unset: { noTicketReason: "", noTicketBy: "", noTicketAt: "" } },
    { new: true },
  ).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);

  /**
   * CHUYẾN KHÔNG XÉ VÉ vẫn là chuyến bay thật, nên nút này thay vé làm mốc gửi
   * bảo hiểm. Bỏ đánh dấu thì chỉ thu hồi nếu chính nó là thứ đã gửi đi — bỏ
   * "không vé" vì quầy xé vé bù thì bảo hiểm phải giữ nguyên.
   */
  {
    const ins = await import("@/services/baobay-insurance.service");
    const by = session.name || session.username;
    if (input.on) await ins.sendInsurance(spot, String(updated._id), "bay không vé", by, true);
    else if (current.insuranceSentReason === "bay không vé" && !updated.ticketIssuedAt) {
      await ins.recallInsurance(spot, String(updated._id), "bỏ đánh dấu bay không vé", by, true);
    }
  }
  return toBookingDTO(updated);
}

/**
 * Quầy tích "ĐÃ XUẤT VÉ" cho booking (khách đã đến lấy vé) — bấm lại lần nữa
 * để bỏ tích khi lỡ tay. Không đụng tiền, không đụng trạng thái bay.
 */
export async function toggleBookingTicket(session: BaobaySession, spotRaw: string, id: string): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);
  const current = await BaobayBooking.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking", 404);

  const set = current.ticketIssuedAt
    ? { $unset: { ticketIssuedAt: "", ticketIssuedBy: "" } }
    : { $set: { ticketIssuedAt: new Date(), ticketIssuedBy: session.name || session.username } };
  const updated = await BaobayBooking.findOneAndUpdate({ _id: id, spot }, set, { new: true }).lean<any>();
  pushSheetInBackground(() => pushBookingRow(updated), BaobayBooking, updated._id);

  /**
   * XUẤT VÉ LÀ MỐC GỬI BẢO HIỂM. Xuất vé nghĩa là 99% sẽ bay, nên đây là lúc
   * đúng: sớm hơn thì trời xấu không bay được là mất phí, muộn hơn (đợi tích
   * "đã bay", thường cuối ngày) thì sự cố trước lúc gửi là hồ sơ vô nghĩa.
   * Bỏ tích vé = bấm nhầm hoặc thu hồi vé, nên thu hồi luôn bảo hiểm.
   */
  {
    const ins = await import("@/services/baobay-insurance.service");
    const by = session.name || session.username;
    if (updated.ticketIssuedAt) await ins.sendInsurance(spot, String(updated._id), "xuất vé", by, true);
    else await ins.recallInsurance(spot, String(updated._id), "bỏ tích xuất vé", by, true);
  }
  return toBookingDTO(updated);
}

/**
 * DỜI LỊCH ĐƯỢC CẢ VỀ NGÀY CŨ HƠN.
 *
 * Book ngày 25 nhưng 25 dự báo mưa thì dời xuống 23 là chuyện thường; trước đây
 * ô chọn ngày chặn cứng "phải sau ngày hiện tại" nên điều phối phải huỷ rồi lập
 * lại booking mới — mất sạch dấu vết tiền đã cọc.
 *
 * Cửa duy nhất là KẾ TOÁN ĐÃ CHỐT NGÀY, và phải soát CẢ HAI đầu: ngày cũ mất
 * một booking, ngày mới nhận thêm một booking, nên bảng tính của cả hai ngày
 * đều đổi theo. Chốt rồi mà vẫn cho dời là số đã lên sổ bị rút ruột sau lưng
 * bản chốt.
 *
 * Còn một chặn nữa: KHÔNG cho dời lùi quá `MOVE_BACK_LIMIT_DAYS` ngày. Ngày cũ
 * lâu rồi thường chưa ai chốt (không có bản chốt để chặn), nên nếu bỏ trống thì
 * gõ nhầm năm — "2025-08-23" thay vì "2026-08-23" — sẽ lẳng lặng ném booking về
 * quá khứ xa, không ai nhìn thấy nữa.
 */
const MOVE_BACK_LIMIT_DAYS = 30;

async function assertMoveDatesOpen(spot: string, fromDate: string, toDate: string): Promise<void> {
  const floor = shiftDateKey(todayInVN(), -MOVE_BACK_LIMIT_DAYS);
  if (toDate < floor) {
    throw new BaobayError(
      `Ngày dời ${formatDateKeyVN(toDate)} lùi quá ${MOVE_BACK_LIMIT_DAYS} ngày so với hôm nay — kiểm lại xem có gõ nhầm tháng/năm không`,
      400,
    );
  }
  const closed = await AccountantDailyClose.find({
    spot,
    date: { $in: [...new Set([fromDate, toDate])] },
    status: "closed",
  })
    .select("date")
    .lean<any[]>();
  if (closed.length) {
    const which = closed.map((c) => formatDateKeyVN(c.date)).join(" và ");
    throw new BaobayError(
      `Ngày ${which} kế toán đã chốt — dời lịch làm đổi bảng tính của cả ngày cũ lẫn ngày mới, nên phải nhờ kế toán gỡ khoá ngày rồi mới dời được.`,
      400,
    );
  }
}

export async function updateBookingStatus(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  action: BookingAction,
  toDate?: string,
  /**
   * HUỶ BAY khai thêm: đã xuất vé chưa (mã vé nào phải thu hồi) và hoàn cho khách
   * bao nhiêu, hoàn bằng gì. Booking chưa phát sinh tiền thì bỏ trống hết — huỷ
   * là xong, khỏi hỏi tiền.
   */
  cancel?: {
    ticketIssued?: boolean;
    ticketCodesText?: string;
    refund?: number;
    refundMethod?: "cash" | "transfer";
    /** Khách đã dùng dịch vụ gì và bị thu lại bao nhiêu — ghi để sau còn tra. */
    usedServices?: string;
    usedFee?: number;
    bankAccount?: string;
    note?: string;
  },
): Promise<BookingDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  await assertBookingUnlocked(spot, id, session);

  const current = await BaobayBooking.findOne({ _id: id, spot, status: "open" }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy booking đang chờ này", 404);

  /**
   * KHAU PHẠ bán VÉ GIẤY: khách phải qua quầy lấy vé rồi mới ra bãi bay. Tích
   * "đã bay" cho người chưa lấy vé nghĩa là hoặc quầy quên tích, hoặc khách bay
   * chui — cả hai đều phải chặn tại chỗ, vì cuối ngày đối chiếu vé xuất với
   * chuyến bay mới phát hiện thì không lần ra nổi khách nào.
   */
  if (action === "flown" && spot === "khau-pha" && !current.ticketIssuedAt && !current.noTicketFlight) {
    throw new BaobayError(
      "Chưa xuất vé, không thể tích đã bay — bấm 🎫 Xuất vé, hoặc đánh dấu “Bay không vé” kèm lý do",
      400,
    );
  }

  let update: Record<string, unknown>;
  if (action === "move") {
    if (!toDate) throw new BaobayError("Dời lịch phải chọn ngày mới", 400);
    if (toDate === current.flightDate) throw new BaobayError("Ngày dời trùng ngày bay hiện tại", 400);
    await assertMoveDatesOpen(spot, current.flightDate, toDate);
    update = {
      // Sang ngày mới thì nhận SỐ THỨ TỰ MỚI của ngày đó — số cũ bỏ lại ngày cũ
      $set: { flightDate: toDate, daySeq: await nextDaySeq(spot, toDate), movedBy: session.username, movedAt: new Date() },
      $push: { rescheduledFrom: current.flightDate },
    };
  } else if (action === "cancel") {
    const codes = cancel?.ticketIssued ? parseTicketCodeList(cancel.ticketCodesText ?? "").codes : [];
    const refund = Math.max(0, Math.round(cancel?.refund || 0));
    update = {
      $set: {
        status: "cancelled",
        doneAt: new Date(),
        doneBy: session.username,
        cancelledAt: new Date(),
        cancelledBy: session.username,
        cancelTicketIssued: Boolean(cancel?.ticketIssued),
        cancelTicketCodes: codes,
        refundAmount: refund,
        // Không hoàn đồng nào thì đừng ghi hình thức hoàn — đọc lại đỡ tưởng có tiền
        refundMethod: refund > 0 ? (cancel?.refundMethod === "cash" ? "cash" : "transfer") : undefined,
        /**
         * HOÀN thì TRỪ THẲNG VÀO CỌC. Dòng tóm tắt tính "cọc gốc = deposit −
         * đã thu + đã hoàn", nên hoàn mà chỉ cộng refundedTotal (createRefund
         * làm) mà không trừ deposit là mỗi vòng huỷ→bay lại→huỷ cọc hiển thị
         * phồng thêm đúng số hoàn — lỗi "cọc 500k thành 1.500k".
         */
        deposit: Math.max(0, (current.deposit ?? 0) - refund),
        // Huỷ rồi thì không còn gì phải thu nữa
        remaining: 0,
        note: [
          current.note,
          cancel?.usedServices?.trim() ? `đã dùng: ${cancel.usedServices.trim()}` : "",
          (cancel?.usedFee ?? 0) > 0 ? `thu lại phí đã dùng ${(cancel!.usedFee as number).toLocaleString("vi-VN")} đ` : "",
          cancel?.note?.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
      },
    };
  } else {
    update = {
      $set: {
        status: "done",
        doneAt: new Date(),
        doneBy: session.username,
      },
    };
  }

  const refundNow = action === "cancel" ? Math.max(0, Math.round(cancel?.refund || 0)) : 0;
  const doc = await BaobayBooking.findOneAndUpdate({ _id: id, spot, status: "open" }, update, {
    new: true,
  }).lean<any>();
  if (!doc) throw new BaobayError("Booking vừa được người khác cập nhật", 409);

  /**
   * Đơn đặt trên web thì SỐ THỨ TỰ hiện cả bên trang khách — dời lịch là số
   * đổi, huỷ là không còn số. Không cập nhật thì khách vẫn thấy số cũ của một
   * chỗ đã trả cho người khác.
   */
  if (doc.webBookingId) {
    if (action === "move") await pushQueueNoToWeb(doc.webBookingId, doc.daySeq, doc.flightDate);
    else if (action === "cancel") await clearQueueNoOnWeb(doc.webBookingId);
  }

  /**
   * HỒ SƠ BẢO HIỂM ĐI THEO BOOKING. Dời ngày thì đẩy lại (dòng trên bảng bảo
   * hiểm mang khoá cũ nên chỉ ghi đè ngày bay mới); huỷ cả booking thì đánh dấu
   * toàn bộ người bay là huỷ để bên bảo hiểm rút tên — để nguyên là họ vẫn tính
   * phí cho chuyến không hề bay.
   *
   * Nạp động: services/baobay-insurance.service.ts có nạp ngược lại tệp này,
   * khai import thẳng ở đầu tệp là vòng tròn.
   */
  {
    const ins = await import("@/services/baobay-insurance.service");
    const by = session.name || session.username;
    if (action === "move") {
      /**
       * DỜI LỊCH: hồ sơ đi theo booking. Vẫn ĐÚNG MỘT DÒNG trên bảng (khoá là
       * mã booking + thứ tự người), chỉ đổi ngày bay và ghi thêm "dời từ …" —
       * thu hồi rồi gửi lại sẽ ghi đè lên chính dòng đó, bên bảo hiểm chẳng
       * thấy động tác thu hồi mà mình lại tốn hai lượt gọi.
       */
      await ins.resyncInsuranceAfterMove(spot, String(doc._id));
    } else if (action === "cancel") {
      await ins.cancelInsuredGuests(spot, String(doc._id), (doc.insured ?? []).length, "huỷ cả booking");
      await ins.recallInsurance(spot, String(doc._id), "khách huỷ bay", by, true);
    } else if (action === "flown" && !doc.insuranceSentAt) {
      /** Lưới an toàn: đã bay mà chưa gửi thì gửi ngay — muộn còn hơn không có. */
      await ins.sendInsurance(spot, String(doc._id), "đã bay", by, true);
    }
  }

  /**
   * Có hoàn tiền thì LẬP LỆNH HOÀN luôn: chuyển khoản sẽ nằm chờ ở trang kế
   * toán cho tới khi chuyển xong, tiền mặt thì trừ ngay vào phần người trực
   * đang giữ. Ghi số vào booking thôi là không đủ — không ai biết ai phải làm.
   */
  if (refundNow > 0) {
    await createRefund(session, spot, {
      date: doc.flightDate,
      bookingId: String(doc._id),
      guestName: doc.contactName || doc.phone || "khách",
      bookingCode: doc.bookingCode || "",
      guests: doc.guestCount || 0,
      paid: doc.deposit || 0,
      usedServices: cancel?.usedServices ?? "",
      usedFee: cancel?.usedFee ?? 0,
      amount: refundNow,
      method: cancel?.refundMethod === "cash" ? "cash" : "transfer",
      bankAccount: cancel?.bankAccount ?? "",
      reason: "huỷ bay",
    });
  }

  /**
   * "Đã bay" KHÔNG tính là thay đổi cần báo: khách vừa bay xong, đang đứng
   * ngay đó. Dời lịch và huỷ thì có — đó đúng là hai việc khách cần biết.
   */
  const pendingBase = action !== "flown" ? await markBookingChanged(current, doc) : null;
  pushSheetInBackground(() => pushBookingRow(doc), BaobayBooking, doc._id);
  return toBookingDTO({ ...doc, notifyPendingBase: pendingBase, sheetSynced: false });
}

const BOOKING_PICKUP_LABEL: Record<string, string> = { self: "Tự đến", bigc: "Đón BigC", hotel: "Đón khách sạn", other: "Đón" };

async function pushBookingRow(doc: any) {
  return pushBaobayRow(
    "booking",
    {
      key: String(doc._id),
      flightDate: formatDateKeyVN(doc.flightDate),
      daySeq: doc.daySeq ?? "",
      spot: doc.spot || "",
      createdAt: doc.createdAt ? new Date(doc.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "",
      createdBy: doc.createdByName || doc.createdByUsername || "",
      source: doc.source || "",
      bookingCode: doc.bookingCode || "",
      contactName: doc.contactName || "",
      phone: doc.phone || "",
      guestCount: doc.guestCount ?? 0,
      flycam: doc.flycam ?? 0,
      video360: doc.video360 ?? 0,
      redFlag: doc.redFlag ?? 0,
      sunset: doc.sunset ?? 0,
      flagFlight: doc.flagFlight ?? 0,
      pickup:
        doc.pickup === "other"
          ? `Đón: ${doc.pickupNote || "?"}`
          : BOOKING_PICKUP_LABEL[doc.pickup] || "Tự đến",
      expectedTime: doc.expectedTime || "",
      flightKind:
        (doc.ppgGuests ?? 0) > 0 && (doc.guestCount ?? 0) > (doc.ppgGuests ?? 0)
          ? `PG×${(doc.guestCount ?? 0) - doc.ppgGuests} + PPG×${doc.ppgGuests}`
          : FLIGHT_KIND_SHORT[(doc.flightKind ?? "pg") as FlightKind] ?? "PG",
      pickupFee: doc.pickupFee ?? 0,
      mountainCar: doc.mountainCar ?? 0,
      unitPrice: doc.unitPrice ?? 0,
      discount: doc.discount ?? 0,
      totalAmount: doc.totalAmount ?? 0,
      deposit: doc.deposit ?? 0,
      remaining: doc.remaining ?? 0,
      transferCode: doc.transferCode || "",
      depositToCompany: doc.depositToCompany ? "x" : "",
      ticketIssued: doc.ticketIssuedAt ? "x" : "",
      collectedLog: (doc.collectedLog || [])
        .map((c: any) => `${Math.round((c.amount || 0) / 1000)}k ${c.method === "cash" ? "TM" : "CK"} - ${c.byName || "?"}`)
        .join(" · "),
      status:
        doc.status === "done"
          ? "ĐÃ BAY"
          : doc.status === "cancelled"
            ? "ĐÃ HUỶ"
            : doc.status === "deleted"
              ? "ĐÃ XOÁ"
              : "CHỜ BAY",
      rescheduledFrom: (doc.rescheduledFrom || []).map((d: string) => formatDateKeyVN(d)).join(", "),
      assignedTo: doc.assignedToName || "",
      accepted: doc.acceptedAt ? `x (${doc.acceptedBy || ""})` : "",
      contacted: doc.contactedAt ? `x (${doc.contactedBy || ""})` : "",
      noTicketFlight: doc.noTicketFlight ? `x — ${doc.noTicketReason || ""} (${doc.noTicketBy || ""})` : "",
      contactNote: doc.contactNote || "",
      commission: doc.commission?.amount
        ? `${doc.commission.amount} ${commissionWayLabel(doc.commission.method)}${doc.commission.transferCode ? ` #${doc.commission.transferCode}` : ""} - ${doc.commission.byName || ""}`
        : "",
      note: doc.note || "",
      updatedAt: nowStampVN(),
    },
    undefined,
    await sheetTargetForSpot(doc.spot),
  );
}

/** Bản rút gọn cho phi công/camera man — xem chú thích ở listBookings. */
/**
 * Mức tiền tổ bay được thấy trên MỘT booking:
 *  - "none"      : Khau Phạ mặc định — cả "còn phải thu" cũng ẩn.
 *  - "remaining" : như các điểm khác — chỉ thấy CÒN PHẢI THU (họ thu tại bãi),
 *                  cũng là mức của phi công KP có LỆNH THU được chỉ định.
 *  - "full"      : kế toán tích "hiện tiền cho phi công" — thấy tổng/cọc/còn
 *                  thu/các lần thu của đúng booking đó (vẫn giấu nguồn khách,
 *                  đại lý, email, dấu đối soát).
 */
export function maskForCrew(doc: any, money: "none" | "remaining" | "full" = "remaining"): BookingDTO {
  const b = toBookingDTO(doc);
  const weight = /c[âa]n n[ặa]ng[^·]*/i.exec(String(doc.note ?? ""))?.[0]?.trim() ?? "";
  /**
   * SỰ CỐ THẬT (30/08/2026): hàm che này viết trước, các trường mới thêm sau
   * (dấu ✓CK "kế toán đã nhận đủ khoản chuyển khoản", đường tiền cọc, email
   * khách, tiền đại lý thu hộ…) lọt qua nguyên vẹn — phi công mở trang của
   * mình đọc được luôn danh sách khách nào CK vào tài khoản công ty.
   *
   * Bài học ghi vào đây cho người thêm trường sau: DTO booking mọc thêm trường
   * nào dính TIỀN / ĐỐI TÁC / LIÊN LẠC là phải ghé qua hàm này cắt. Phi công
   * chỉ cần: khách là ai, mấy người, dịch vụ gì, đón ở đâu, cân nặng, và CÒN
   * PHẢI THU bao nhiêu.
   */
  return {
    ...b,
    source: "",
    bookingCode: "",
    otaName: undefined,
    otaRef: undefined,
    otaGuests: undefined,
    unitPrice: 0,
    discount: 0,
    comboDiscount: 0,
    totalAmount: 0,
    deposit: 0,
    transferCode: "",
    depositToCompany: false,
    commission: undefined,
    collected: [],
    note: weight,
    // Đường tiền cọc + dấu đối soát của kế toán — chính là chỗ lộ "khách CK về TK công ty"
    depositMethod: "",
    depositDate: "",
    depositDateBy: "",
    depositVerified: undefined,
    ckChecked: undefined,
    tmChecked: undefined,
    // Tiền đại lý thu hộ / hoàn / thu thừa / tiền nối theo tách-dời — chuyện giá cả
    agencyPaidAmount: 0,
    agencyName: "",
    refunded: 0,
    overpaid: 0,
    movedPaidOut: undefined,
    // Liên lạc và nhật ký thư gửi khách — không phải việc của bãi
    email: "",
    lastNotify: "",
    pendingNotify: [],
    // Khau Phạ mặc định: đến cả "còn phải thu" cũng không phải việc của phi công
    ...(money === "none" ? { remaining: 0 } : {}),
    // Kế toán đã tích "hiện cho phi công": trả lại phần tiền của ĐÚNG booking này
    ...(money === "full"
      ? { totalAmount: b.totalAmount, deposit: b.deposit, remaining: b.remaining, collected: b.collected }
      : {}),
  };
}

function toBookingDTO(doc: any): BookingDTO {
  return {
    daySeq: Number(doc.daySeq) || 0,
    locked: Boolean(doc.lockedAt),
    lockedBy: doc.lockedBy || undefined,
    ckChecked: Boolean(doc.ckCheckedAt) || undefined,
    tmChecked: Boolean(doc.tmCheckedAt) || undefined,
    ticketIssued: Boolean(doc.ticketIssuedAt),
    ticketIssuedBy: doc.ticketIssuedBy || undefined,
    noTicketFlight: Boolean(doc.noTicketFlight) || undefined,
    noTicketReason: doc.noTicketReason || undefined,
    noTicketBy: doc.noTicketBy || undefined,
    collected: Array.isArray(doc.collectedLog)
      ? doc.collectedLog.map((c: any) => ({
          amount: Number(c.amount) || 0,
          method: c.method === "transfer" ? ("transfer" as const) : ("cash" as const),
          byName: String(c.byName ?? ""),
          code: c.code ? String(c.code) : undefined,
          at: c.at ? new Date(c.at).toISOString() : undefined,
          kind: c.kind ? String(c.kind) : undefined,
        }))
      : [],
    id: String(doc._id),
    spot: doc.spot,
    flightDate: doc.flightDate,
    createdByUsername: doc.createdByUsername,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    source: doc.source || "",
    contactName: doc.contactName || "",
    phone: doc.phone || "",
    bookingCode: doc.bookingCode || "",
    guestCount: doc.guestCount ?? 0,
    flycam: doc.flycam ?? 0,
    video360: doc.video360 ?? 0,
    redFlag: doc.redFlag ?? 0,
    sunset: doc.sunset ?? 0,
    flagFlight: doc.flagFlight ?? 0,
    flightKind: (doc.flightKind ?? "pg") as FlightKind,
    ppgGuests: Number(doc.ppgGuests) || 0,
    comboDiscount: Number(doc.comboDiscount) || 0,
    acceptedAt: doc.acceptedAt ? new Date(doc.acceptedAt).toISOString() : undefined,
    acceptedBy: doc.acceptedBy || undefined,
    contactNote: doc.contactNote || undefined,
    contactedAt: doc.contactedAt ? new Date(doc.contactedAt).toISOString() : undefined,
    contactedBy: doc.contactedBy || undefined,
    commission: doc.commission?.amount
      ? {
          amount: Number(doc.commission.amount) || 0,
          method:
            doc.commission.method === "transfer"
              ? "transfer"
              : doc.commission.method === "agency"
                ? "agency"
                : "cash",
          transferCode: doc.commission.transferCode || undefined,
          agencyName: doc.commission.agencyName || undefined,
          bankAccount: doc.commission.bankAccount || undefined,
          bankAccountName: doc.commission.bankAccountName || undefined,
          note2: doc.commission.note2 || undefined,
          byName: doc.commission.byName || "",
          at: doc.commission.at ? new Date(doc.commission.at).toISOString() : "",
        }
      : undefined,
    pickupFee: doc.pickupFee ?? 0,
    mountainCar: doc.mountainCar ?? 0,
    otaName: doc.otaName || "",
    otaRef: doc.otaRef || "",
    otaGuests: doc.otaGuests ?? [],
    insured: doc.insured ?? [],
    insuranceApprovedAt: doc.insuranceApprovedAt ? new Date(doc.insuranceApprovedAt).toISOString() : undefined,
    insuranceSentAt: doc.insuranceSentAt ? new Date(doc.insuranceSentAt).toISOString() : undefined,
    insuranceRecalledAt: doc.insuranceRecalledAt ? new Date(doc.insuranceRecalledAt).toISOString() : undefined,
    cancelTicketIssued: doc.cancelTicketIssued,
    cancelTicketCodes: doc.cancelTicketCodes ?? [],
    refundAmount: doc.refundAmount ?? 0,
    refunded: doc.refundedTotal ?? 0,
    refundMethod: doc.refundMethod,
    cancelledBy: doc.cancelledBy || "",
    movedBy: doc.movedBy || undefined,
    movedPaidOut: doc.movedPaidOut > 0 ? doc.movedPaidOut : undefined,
    unitPrice: doc.unitPrice ?? 0,
    discount: doc.discount ?? 0,
    totalAmount: doc.totalAmount ?? 0,
    pickup:
      doc.pickup === "bigc" ? "bigc" : doc.pickup === "hotel" ? "hotel" : doc.pickup === "other" ? "other" : "self",
    pickupNote: doc.pickupNote || "",
    expectedTime: doc.expectedTime || "",
    deposit: doc.deposit ?? 0,
    remaining: doc.remaining ?? 0,
    agencyPaidAmount: doc.agencyPaidAmount ?? 0,
    agencyName: doc.agencyName || "",
    /**
     * Đã trả (tiền khách + phần đại lý thu hộ) trừ đi tổng phải trả. Dương
     * nghĩa là THU THỪA — dấu hiệu ai đó sửa/bỏ lệnh dịch vụ sau khi đã thu
     * tiền, kế toán phải xử lý bù hoặc hoàn.
     */
    overpaid: Math.max(
      0,
      (doc.deposit ?? 0) + (doc.agencyPaidAmount ?? 0) - (doc.totalAmount ?? 0) - (doc.refundedTotal ?? 0),
    ),
    cancelledGuests: doc.cancelledGuests ?? 0,
    cancelledFlycam: doc.cancelledFlycam ?? 0,
    cancelledVideo360: doc.cancelledVideo360 ?? 0,
    cancelledRedFlag: doc.cancelledRedFlag ?? 0,
    cancelledSunset: doc.cancelledSunset ?? 0,
    cancelledFlagFlight: doc.cancelledFlagFlight ?? 0,
    transferCode: doc.transferCode || "",
    depositToCompany: Boolean(doc.depositToCompany),
    depositMethod: doc.depositMethod === "cash" || doc.depositMethod === "transfer" ? doc.depositMethod : "",
    depositDate: doc.depositDate || "",
    depositDateBy: doc.depositDateBy || "",
    depositVerified: Boolean(doc.depositVerifiedAt),
    pilotMoney: Boolean(doc.pilotMoneyAt) || undefined,
    pilotMoneyBy: doc.pilotMoneyBy || undefined,
    email: doc.email || "",
    lastNotify: lastNotifyLabel(doc.notifyLog),
    /** Thay đổi CHƯA báo khách — nút "Gửi mail báo khách" hiện khi mảng này có. */
    pendingNotify: pendingChangesOf(doc).map((c) => c.vi),
    note: doc.note || "",
    status:
      doc.status === "done"
        ? "done"
        : doc.status === "cancelled"
          ? "cancelled"
          : doc.status === "voided"
            ? "voided"
            : "open",
    voidedBy: doc.voidedBy || undefined,
    voidReason: doc.voidReason || undefined,
    voidKind: doc.voidKind || undefined,
    mergedInto: doc.mergedInto ? String(doc.mergedInto) : undefined,
    doneAt: doc.doneAt ? new Date(doc.doneAt).toISOString() : undefined,
    doneBy: doc.doneBy || undefined,
    rescheduledFrom: doc.rescheduledFrom ?? [],
    assignedToUsername: doc.assignedToUsername || undefined,
    assignedToName: doc.assignedToName || undefined,
    assignedBy: doc.assignedBy || undefined,
  };
}

/* ================================================================== */
/* Lệnh THU TIỀN — kế toán/điều phối chỉ định người thu hoặc ghi CK cty */
/* ================================================================== */

export type CollectSaveInput = {
  spot: string;
  guestName: string;
  bookingCode: string;
  agency: string;
  guests: number;
  amount: number;
  method: "cash" | "transfer";
  collectorUsername: string;
  toCompanyAccount: boolean;
  transferCode: string;
  note: string;
};

/**
 * Lập lệnh thu: TM phải chỉ định người thu (lệnh chạy về trang người đó chờ
 * "Đã thu tiền"); CK tích TK công ty là ghi nhận xong ngay — tiền về thẳng
 * tài khoản công ty, không ai cầm.
 */
export async function createCollect(session: BaobaySession, input: CollectSaveInput): Promise<CollectDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  if (!input.guestName.trim() && !input.bookingCode.trim()) {
    throw new BaobayError("Lệnh thu phải có tên khách hoặc mã booking", 400);
  }

  let collector: { username: string; displayName: string } | null = null;
  let selfCollect = false;
  if (input.method === "cash") {
    // Không chỉ định ai = CHÍNH MÌNH thu — tiền vào thẳng "tiền giữ hộ công ty" của mình, khỏi xác nhận
    const target = input.collectorUsername.trim() || session.username;
    selfCollect = normalizeUsername(target) === session.username;
    const doc = await BaobayAccount.findOne({ username: normalizeUsername(target) })
      .select("username displayName isActive spots")
      .lean<any>();
    if (!doc || !doc.isActive) throw new BaobayError("Không tìm thấy người thu", 404);
    if (!(doc.spots ?? []).includes(spot)) throw new BaobayError(`“${doc.displayName}” không làm ở điểm này`, 400);
    collector = doc;
  } else if (!input.toCompanyAccount) {
    throw new BaobayError("Chuyển khoản phải tích 'TK công ty'", 400);
  }

  const saved = (
    await BaobayCollect.create({
      spot,
      date: todayInVN(),
      guestName: input.guestName.trim(),
      bookingCode: input.bookingCode.trim(),
      agency: input.agency.trim(),
      guests: input.guests,
      amount: input.amount,
      method: input.method,
      toCompanyAccount: input.method === "transfer" && input.toCompanyAccount,
      transferCode: input.transferCode.trim(),
      note: input.note.trim(),
      collectorUsername: collector?.username,
      collectorName: collector?.displayName,
      // Chính mình thu thì hoàn tất luôn — không ai phải xác nhận với chính mình
      status: input.method !== "cash" ? "company" : selfCollect ? "collected" : "pending",
      resolvedAt: selfCollect ? new Date() : undefined,
      resolvedBy: selfCollect ? session.username : undefined,
      createdByUsername: session.username,
      createdByName: session.name,
    })
  ).toObject();

  pushSheetInBackground(() => pushCollectRow(saved), BaobayCollect, saved._id);
  return toCollectDTO({ ...saved, sheetSynced: false });
}

/** Lệnh CHỜ MÌNH thu + lệnh mình đã lập gần đây. */
export async function listCollects(
  session: BaobaySession,
  spotRaw: string,
): Promise<{ assigned: CollectDTO[]; created: CollectDTO[] }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const [assigned, created] = await Promise.all([
    BaobayCollect.find({ spot, collectorUsername: session.username, status: "pending" })
      .sort({ createdAt: -1 })
      .lean<any[]>(),
    BaobayCollect.find({ spot, createdByUsername: session.username }).sort({ createdAt: -1 }).limit(20).lean<any[]>(),
  ]);
  return { assigned: assigned.map(toCollectDTO), created: created.map(toCollectDTO) };
}

/** Người được chỉ định bấm "Đã thu tiền" / "Từ chối" — quản trị/kế toán bấm hộ được. */
export async function resolveCollect(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  collected: boolean,
  reason?: string,
): Promise<CollectDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const current = await BaobayCollect.findOne({ _id: id, spot, status: "pending" }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy lệnh thu đang chờ", 404);
  const manager = session.role === "accountant" || session.role === "admin";
  if (current.collectorUsername !== session.username && !manager) {
    throw new BaobayError("Chỉ người được chỉ định (hoặc kế toán/quản trị) mới xác nhận được", 403);
  }
  if (!collected && !(reason ?? "").trim()) throw new BaobayError("Từ chối phải ghi lý do", 400);

  const doc = await BaobayCollect.findOneAndUpdate(
    { _id: id, spot, status: "pending" },
    {
      $set: {
        status: collected ? "collected" : "rejected",
        rejectedReason: collected ? "" : (reason ?? "").trim(),
        resolvedAt: new Date(),
        resolvedBy: session.username,
      },
    },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Lệnh vừa được người khác xử lý", 409);

  pushSheetInBackground(() => pushCollectRow(doc), BaobayCollect, doc._id);
  return toCollectDTO({ ...doc, sheetSynced: false });
}

/**
 * KẾ TOÁN SỬA MỘT KHOẢN THU — chia bill nhầm (TM/CK lộn số), gán nhầm người
 * thu, gõ sai mã CK. Chỉ kế toán/quản trị (route chặn vai).
 *
 * Sửa xong máy tự:
 *  - đắp lại tiền booking: còn thu/đã trả xê dịch đúng bằng chênh lệch số tiền;
 *  - sửa bản chụp trong `collectedLog` cho khớp (bảng chi tiết đọc từ đây);
 *  - XOÁ dấu "đã nhận" của khoản đó và tích ✓CK/✓TM của booking — số đã đổi
 *    thì phải soát lại, không được thừa kế cái tích cũ;
 *  - ghi vệt sửa vào note của lệnh (ai sửa, từ gì thành gì).
 */
export async function editCollect(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  input: {
    amount?: number;
    method?: "cash" | "transfer";
    transferCode?: string;
    collectorUsername?: string;
  },
): Promise<CollectDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const current = await BaobayCollect.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy lệnh thu", 404);
  if (current.status === "rejected") throw new BaobayError("Lệnh đã từ chối — lập lệnh mới thay vì sửa", 400);

  const oldAmount = Number(current.amount) || 0;
  const newAmount = input.amount == null ? oldAmount : Math.max(0, Math.round(Number(input.amount) || 0));
  if (newAmount <= 0) throw new BaobayError("Số tiền phải lớn hơn 0", 400);
  const newMethod: "cash" | "transfer" = input.method === "cash" || input.method === "transfer" ? input.method : current.method;
  const newCode = newMethod === "transfer" ? String(input.transferCode ?? current.transferCode ?? "").trim() : "";

  /** Đổi người thu (chỉ nghĩa với TM): tiền chuyển sổ sang người mới giữ. */
  let collector: { username?: string; displayName?: string } = {
    username: current.collectorUsername,
    displayName: current.collectorName,
  };
  if (newMethod === "cash") {
    const target = normalizeUsername(String(input.collectorUsername ?? current.collectorUsername ?? "").trim() || session.username);
    if (target !== normalizeUsername(current.collectorUsername ?? "")) {
      const doc = await BaobayAccount.findOne({ username: target }).select("username displayName isActive spots").lean<any>();
      if (!doc || !doc.isActive) throw new BaobayError("Không tìm thấy người thu mới", 404);
      if (!(doc.spots ?? []).includes(spot)) throw new BaobayError(`“${doc.displayName}” không làm ở điểm này`, 400);
      collector = doc;
    }
  } else {
    collector = {};
  }

  const label = (m: string, a: number, c?: string) =>
    `${a.toLocaleString("vi-VN")}đ ${m === "transfer" ? `CK${c ? ` (${c})` : ""}` : "TM"}`;
  const trail = `sửa bởi ${session.name || session.username} ${formatDateKeyVN(todayInVN())}: ${label(current.method, oldAmount, current.transferCode)} → ${label(newMethod, newAmount, newCode)}${
    newMethod === "cash" && collector.username !== current.collectorUsername ? `, người thu → ${collector.displayName}` : ""
  }`;

  const doc = await BaobayCollect.findOneAndUpdate(
    { _id: id, spot },
    {
      $set: {
        amount: newAmount,
        method: newMethod,
        toCompanyAccount: newMethod === "transfer",
        transferCode: newCode,
        collectorUsername: collector.username ?? "",
        collectorName: collector.displayName ?? "",
        /**
         * TM đổi từ CK (hoặc đổi người thu trên lệnh đã xong): coi là ĐÃ THU
         * — kế toán đang nắn lại sổ của tiền đã cầm, không phải giao việc mới.
         * Lệnh còn "chờ thu" thì giữ nguyên chờ, chỉ đổi đích.
         */
        status: newMethod === "transfer" ? "company" : current.status === "pending" ? "pending" : "collected",
        verifiedAt: null,
        verifiedBy: "",
        note: [current.note, trail].filter(Boolean).join(" · "),
      },
    },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Lệnh vừa bị thay đổi, tải lại rồi sửa tiếp", 409);

  if (current.bookingId) {
    const booking = await BaobayBooking.findById(current.bookingId)
      .select("remaining deposit collectedLog")
      .lean<any>();
    if (booking) {
      const log = Array.isArray(booking.collectedLog) ? [...booking.collectedLog] : [];
      const i = log.findIndex(
        (e: any) =>
          (Number(e.amount) || 0) === oldAmount &&
          (e.method === "transfer" ? "transfer" : "cash") === current.method &&
          String(e.code ?? "") === String(current.transferCode ?? ""),
      );
      if (i >= 0) {
        log[i] = {
          ...log[i],
          amount: newAmount,
          method: newMethod,
          byName: newMethod === "cash" ? collector.displayName || log[i].byName : session.name || session.username,
          code: newCode || undefined,
        };
      }
      await BaobayBooking.updateOne(
        { _id: current.bookingId },
        {
          $set: {
            collectedLog: log,
            remaining: Math.max(0, (booking.remaining ?? 0) + oldAmount - newAmount),
            deposit: Math.max(0, (booking.deposit ?? 0) - oldAmount + newAmount),
            // Số đã đổi — tích "nhận đủ" cũ hết giá trị, kế toán soát lại
            ckCheckedAt: null,
            tmCheckedAt: null,
          },
        },
      );
    }
  }

  pushSheetInBackground(() => pushCollectRow(doc), BaobayCollect, doc._id);
  return toCollectDTO({ ...doc, sheetSynced: false });
}

/**
 * KẾ TOÁN XOÁ MỘT KHOẢN THU — nhân viên lỡ ghi thu HAI LẦN cho cùng một món
 * (chuyện thật 02/09/2026). Xoá MỀM: lệnh chuyển sang "rejected" kèm lý do —
 * mọi sổ (tiền cá nhân, soát CK, bảng ngày) vốn đã loại rejected, và vết còn
 * nguyên để sau truy. Tiền booking được trả về như chưa từng thu khoản đó:
 * "còn thu" cộng lại, "đã trả" trừ đi, dòng trong bản chụp thanh toán gỡ ra,
 * tích ✓CK/✓TM rụng để kế toán soát lại.
 */
export async function removeCollect(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  reason?: string,
): Promise<CollectDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const current = await BaobayCollect.findOne({ _id: id, spot }).lean<any>();
  if (!current) throw new BaobayError("Không tìm thấy lệnh thu", 404);
  if (current.status === "rejected") throw new BaobayError("Lệnh này đã bị loại rồi", 400);

  const amount = Number(current.amount) || 0;
  const why = (reason ?? "").trim() || "thu trùng/ghi nhầm";
  const doc = await BaobayCollect.findOneAndUpdate(
    { _id: id, spot, status: current.status },
    {
      $set: {
        status: "rejected",
        rejectedReason: `kế toán xoá: ${why}`,
        verifiedAt: null,
        verifiedBy: "",
        resolvedAt: new Date(),
        resolvedBy: session.username,
        note: [current.note, `XOÁ bởi ${session.name || session.username} ${formatDateKeyVN(todayInVN())}: ${why}`]
          .filter(Boolean)
          .join(" · "),
      },
    },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Lệnh vừa bị thay đổi, tải lại rồi xoá tiếp", 409);

  if (current.bookingId) {
    const booking = await BaobayBooking.findById(current.bookingId)
      .select("remaining deposit collectedLog")
      .lean<any>();
    if (booking) {
      const log = Array.isArray(booking.collectedLog) ? [...booking.collectedLog] : [];
      const i = log.findIndex(
        (e: any) =>
          (Number(e.amount) || 0) === amount &&
          (e.method === "transfer" ? "transfer" : "cash") === current.method &&
          String(e.code ?? "") === String(current.transferCode ?? ""),
      );
      if (i >= 0) log.splice(i, 1);
      await BaobayBooking.updateOne(
        { _id: current.bookingId },
        {
          $set: {
            collectedLog: log,
            remaining: Math.max(0, (booking.remaining ?? 0) + amount),
            deposit: Math.max(0, (booking.deposit ?? 0) - amount),
            ckCheckedAt: null,
            tmCheckedAt: null,
          },
        },
      );
    }
  }

  pushSheetInBackground(() => pushCollectRow(doc), BaobayCollect, doc._id);
  return toCollectDTO({ ...doc, sheetSynced: false });
}

async function pushCollectRow(doc: any) {
  return pushBaobayRow(
    "collect",
    {
      key: String(doc._id),
      date: formatDateKeyVN(doc.date),
      spot: doc.spot || "",
      guestName: doc.guestName || "",
      bookingCode: doc.bookingCode || "",
      agency: doc.agency || "",
      guests: doc.guests ?? 0,
      amount: doc.amount ?? 0,
      method: doc.method === "transfer" ? "Chuyển khoản" : "Tiền mặt",
      toCompanyAccount: doc.toCompanyAccount ? "x" : "",
      transferCode: doc.transferCode || "",
      collector: doc.collectorName || "",
      status:
        doc.status === "collected"
          ? "ĐÃ THU"
          : doc.status === "rejected"
            ? `TỪ CHỐI${doc.rejectedReason ? `: ${doc.rejectedReason}` : ""}`
            : doc.status === "company"
              ? "VỀ TK CÔNG TY"
              : "chờ thu",
      createdBy: doc.createdByName || "",
      note: doc.note || "",
      updatedAt: nowStampVN(),
    },
    undefined,
    await sheetTargetForSpot(doc.spot),
  );
}

function toCollectDTO(doc: any): CollectDTO {
  return {
    id: String(doc._id),
    spot: doc.spot,
    date: doc.date,
    guestName: doc.guestName || "",
    bookingCode: doc.bookingCode || "",
    agency: doc.agency || "",
    guests: doc.guests ?? 0,
    amount: doc.amount ?? 0,
    method: doc.method === "transfer" ? "transfer" : "cash",
    toCompanyAccount: Boolean(doc.toCompanyAccount),
    transferCode: doc.transferCode || "",
    note: doc.note || "",
    collectorUsername: doc.collectorUsername || undefined,
    collectorName: doc.collectorName || undefined,
    status: doc.status,
    rejectedReason: doc.rejectedReason || undefined,
    resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : undefined,
    createdByUsername: doc.createdByUsername,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Thu chi CÁ NHÂN theo ngày — hiện trong thẻ Tiền bạc                  */
/* ================================================================== */

export type MyMoneyDayDTO = {
  date: string;
  rows: Array<{ content: string; amount: number; kind: "thu" | "chi"; method?: "cash" | "transfer"; note?: string }>;
};

/**
 * Danh sách thu chi CỦA CHÍNH MÌNH gom theo ngày (mới nhất trước) — nguồn cho
 * khối "Thu chi của tôi" trong thẻ Tiền bạc. Tối đa 45 ngày gần nhất, khớp
 * hạn tự tra cứu của nhân sự.
 */
export async function getMyMoneyDays(session: BaobaySession, spotRaw: string, days = 45): Promise<MyMoneyDayDTO[]> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const from = shiftDateKey(todayInVN(), -(Math.min(Math.max(days, 1), 45) - 1));
  const range = { $gte: from };
  const byDay = new Map<string, MyMoneyDayDTO["rows"]>();
  const push = (date: string, row: MyMoneyDayDTO["rows"][number]) => {
    if (!row.amount && !row.content) return;
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date)!.push(row);
  };
  const entryRows = (date: string, expenses: ExpenseDTO[] = []) => {
    for (const e of expenses) {
      push(date, {
        content: e.content,
        amount: e.amount || 0,
        kind: e.kind === "thu" ? "thu" : "chi",
        method: e.method,
        note: e.note,
      });
    }
  };

  if (session.role === "pilot") {
    const docs = await PilotDailyReport.find({ spot, username: session.username, date: range })
      .select("date waterCost guestCarCost expenses")
      .lean<any[]>();
    for (const d of docs) {
      if (d.waterCost > 0) push(d.date, { content: "Nước cho khách", amount: d.waterCost, kind: "chi" });
      if (d.guestCarCost > 0) push(d.date, { content: "Xe cho khách", amount: d.guestCarCost, kind: "chi" });
      entryRows(d.date, d.expenses);
    }
  } else if (isDispatcherLike(session.role)) {
    const docs = await DispatcherDailyReport.find({ spot, username: session.username, date: range })
      .select("date cashReceived transferReceived revenueEntries guestWaterCost mountainCarCost shuttleCarCost expenses")
      .lean<any[]>();
    for (const d of docs) {
      for (const e of d.revenueEntries ?? []) {
        push(d.date, { content: e.content || "Tiền thu", amount: e.amount || 0, kind: "thu", method: e.method });
      }
      const cashRest =
        (d.cashReceived || 0) -
        (d.revenueEntries ?? []).filter((e: any) => e.method === "cash").reduce((a: number, e: any) => a + (e.amount || 0), 0);
      const transferRest =
        (d.transferReceived || 0) -
        (d.revenueEntries ?? []).filter((e: any) => e.method === "transfer").reduce((a: number, e: any) => a + (e.amount || 0), 0);
      if (cashRest > 0) push(d.date, { content: "Tiền thu trong ngày", amount: cashRest, kind: "thu", method: "cash" });
      if (transferRest > 0) push(d.date, { content: "Khách chuyển khoản", amount: transferRest, kind: "thu", method: "transfer" });
      if (d.guestWaterCost > 0) push(d.date, { content: "Nước cho khách", amount: d.guestWaterCost, kind: "chi" });
      if (d.mountainCarCost > 0) push(d.date, { content: "Xe lên núi", amount: d.mountainCarCost, kind: "chi" });
      if (d.shuttleCarCost > 0) push(d.date, { content: "Xe đưa đón", amount: d.shuttleCarCost, kind: "chi" });
      entryRows(d.date, d.expenses);
    }
  } else if (session.role === "cameraman") {
    const docs = await CameramanDailyReport.find({ spot, username: session.username, date: range })
      .select("date expenses")
      .lean<any[]>();
    for (const d of docs) entryRows(d.date, d.expenses);
  } else {
    // Kế toán / quản trị: sổ "Tiền trong ngày" của chính mình
    const docs = await AccountantDailyClose.find({ spot, date: range, accountantId: new mongoose.Types.ObjectId(session.id) })
      .select("date ledger")
      .lean<any[]>();
    for (const d of docs) entryRows(d.date, d.ledger);
  }

  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, rows]) => ({ date, rows }));
}

/* ================================================================== */
/* Bảng kê của một phi công theo chu kỳ                                 */
/* ================================================================== */

export type StaffStatementDTO = {
  spot: string;
  from: string;
  to: string;
  username: string;
  /** Tên hiển thị + vai trò — bảng kê dựng theo đúng vai trò của người này. */
  pilotName: string;
  role: BaobayRole;
  reports: PilotReportDTO[];
  dispatcherReports: DispatcherReportDTO[];
  cameramanReports: CameramanReportDTO[];
  /** Ngày đã được kế toán chốt — số của ngày đó mới là số trả tiền. */
  closedDates: string[];
  /** Lệnh tiền của chính người này trong kỳ: ứng tiền và giao tiền. */
  money: HandoverDTO[];
};

/**
 * Toàn bộ số liệu của MỘT nhân sự trong một khoảng ngày — nguồn cho bảng kê
 * Excel. Không riêng phi công: điều phối và camera man cũng có bảng kê của
 * mình (mỗi vai trò một bộ cột riêng, dựng ở route).
 */
export async function getStaffStatement(
  spotRaw: string,
  usernameRaw: string,
  from: string,
  to: string,
): Promise<StaffStatementDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const username = normalizeUsername(usernameRaw);
  const range = { $gte: from, $lte: to };

  const account = await BaobayAccount.findOne({ username }).select("displayName role").lean<any>();
  if (!account) throw new BaobayError(`Không tìm thấy tài khoản “${usernameRaw}”`, 404);

  const [pilotDocs, dispatcherDocs, cameramanDocs, closes, money] = await Promise.all([
    account.role === "pilot"
      ? PilotDailyReport.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>()
      : Promise.resolve([]),
    isDispatcherLike(account.role)
      ? DispatcherDailyReport.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>()
      : Promise.resolve([]),
    account.role === "cameraman"
      ? CameramanDailyReport.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>()
      : Promise.resolve([]),
    AccountantDailyClose.find({ spot, date: range, status: "closed" }).select("date").lean<any[]>(),
    /**
     * Cả hai chiều: lệnh MÌNH gửi (nộp tiền, xin ứng) và lệnh GỬI CHO MÌNH do
     * kế toán/quản trị lập (chuyển lương, trả phí) — bảng kê phải thấy lương
     * đã nhận, không chỉ tiền đã nộp.
     */
    BaobayHandover.find({
      spot,
      date: range,
      $or: [{ username }, { recipientUsername: username, createdBy: { $exists: true, $ne: "" } }],
    })
      .sort({ date: 1 })
      .lean<any[]>(),
  ]);

  return {
    spot,
    from,
    to,
    username,
    pilotName: account.displayName,
    role: account.role as BaobayRole,
    reports: pilotDocs.map(toPilotDTO),
    dispatcherReports: dispatcherDocs.map(toDispatcherDTO),
    cameramanReports: cameramanDocs.map(toCameramanDTO),
    closedDates: closes.map((c) => c.date),
    money: money.map(toHandoverDTO),
  };
}

/* ================================================================== */
/* Lịch bay theo tháng                                                 */
/* ================================================================== */

export type ShiftRowDTO = {
  username: string;
  pilotName: string;
  email: string;
  /** Ngày ĐI LÀM trong tháng. Không có trong đây = nghỉ. */
  days: number[];
};

export type ShiftBoardDTO = {
  spot: string;
  month: string;
  daysInMonth: number;
  neededPerDay: number;
  rows: ShiftRowDTO[];
  /** Số phi công đi làm từng ngày (chỉ số 0 = ngày 1). */
  perDay: number[];
  version: number;
  updatedBy: string;
  updatedAt?: string;
  notifiedAt?: string;
  /** Đã sửa lịch nhưng chưa gửi email báo lại. */
  needsNotify: boolean;
};

function daysInMonthOfKey(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Bảng lịch của một tháng: hàng là phi công ĐANG LÀM VIỆC ở điểm đó, cột là
 * ngày trong tháng.
 *
 * Danh sách hàng luôn dựng lại từ danh sách nhân sự hiện tại, không lấy cứng
 * theo bản đã lưu: thêm phi công mới là tháng này có ngay một hàng trống để
 * chấm, còn người đã nghỉ việc thì biến khỏi bảng nhưng lịch cũ vẫn nguyên.
 */
export async function getShiftBoard(spotRaw: string, month: string): Promise<ShiftBoardDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const [doc, roster] = await Promise.all([
    BaobayShift.findOne({ spot, month }).lean<any>(),
    BaobayAccount.find({ role: "pilot", isActive: true, spots: spot })
      .select("username displayName email")
      .sort({ displayName: 1 })
      .lean<any[]>(),
  ]);

  const total = daysInMonthOfKey(month);
  const saved = new Map<string, number[]>(
    (doc?.assignments ?? []).map((a: any) => [a.username, (a.days ?? []).filter((d: number) => d >= 1 && d <= total)]),
  );

  const rows: ShiftRowDTO[] = roster.map((p) => ({
    username: p.username,
    pilotName: p.displayName,
    email: p.email || "",
    days: (saved.get(p.username) ?? []).slice().sort((a, b) => a - b),
  }));

  const perDay = Array.from({ length: total }, (_, i) => rows.filter((r) => r.days.includes(i + 1)).length);

  return {
    spot,
    month,
    daysInMonth: total,
    neededPerDay: doc?.neededPerDay ?? 0,
    rows,
    perDay,
    version: doc?.version ?? 0,
    updatedBy: doc?.updatedBy ?? "",
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    notifiedAt: doc?.notifiedAt ? new Date(doc.notifiedAt).toISOString() : undefined,
    needsNotify: Boolean(doc) && (doc.notifiedVersion ?? 0) < (doc.version ?? 1),
  };
}

/**
 * Lưu cả bảng một lần.
 *
 * Chỉ nhận username của phi công ĐANG LÀM ở đúng điểm bay này — bảng gửi lên từ
 * trình duyệt không được phép chấm lịch cho người ở điểm khác. Mỗi lần lưu tăng
 * `version` để email sau đó ghi rõ là bản cập nhật lần mấy.
 */
export async function saveShiftBoard(
  spotRaw: string,
  month: string,
  input: { rows: Array<{ username: string; days: number[] }>; neededPerDay?: number },
  by: string,
): Promise<{ board: ShiftBoardDTO; mail: ShiftMailReport }> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const total = daysInMonthOfKey(month);

  const roster = await BaobayAccount.find({ role: "pilot", isActive: true, spots: spot })
    .select("username displayName")
    .lean<any[]>();
  const known = new Map(roster.map((p) => [p.username, p.displayName]));

  const assignments = input.rows
    .filter((r) => known.has(r.username))
    .map((r) => ({
      username: r.username,
      pilotName: known.get(r.username) as string,
      days: [...new Set(r.days.filter((d) => Number.isInteger(d) && d >= 1 && d <= total))].sort((a, b) => a - b),
    }));

  /**
   * So với bản CŨ để biết lịch của AI thực sự đổi — email chỉ bay tới đúng
   * những người đó. Điểm bay 15 phi công mà admin sửa một ô cũng dội thư cho
   * cả đội thì chỉ vài tuần là không ai thèm mở "Lịch bay" nữa.
   */
  const before = await BaobayShift.findOne({ spot, month }).select("assignments").lean<any>();
  const oldDays = new Map<string, string>(
    (before?.assignments ?? []).map((a: any) => [a.username, [...(a.days ?? [])].sort((x, y) => x - y).join(",")]),
  );
  const changed = assignments
    .filter((a) => a.days.join(",") !== (oldDays.get(a.username) ?? ""))
    .map((a) => a.username);

  await BaobayShift.updateOne(
    { spot, month },
    {
      $set: {
        assignments,
        updatedBy: by,
        ...(input.neededPerDay !== undefined ? { neededPerDay: Math.max(0, Math.floor(input.neededPerDay)) } : {}),
      },
      $inc: { version: 1 },
      $setOnInsert: { spot, month, notifiedVersion: 0 },
    },
    { upsert: true },
  );

  /**
   * Gửi email NGAY trong lần lưu, cho đúng những người có lịch đổi — "mỗi lần
   * bấm lịch là phi công nhận được thư", không phải nhớ bấm thêm nút. Nút "Gửi
   * email" riêng vẫn còn để gửi lại cho CẢ ĐỘI khi cần (ví dụ đầu kỳ mới).
   */
  const mail: ShiftMailReport = changed.length
    ? await sendShiftEmails(spot, month, changed)
    : { sent: [], skipped: [], failed: [] };

  return { board: await getShiftBoard(spot, month), mail };
}

export type ShiftMailReport = {
  sent: Array<{ pilotName: string; email: string }>;
  skipped: Array<{ pilotName: string; reason: string }>;
  failed: Array<{ pilotName: string; email: string; error: string }>;
};

/**
 * Gửi email lịch bay cho từng phi công.
 *
 * Gửi TUẦN TỰ chứ không song song: Gmail SMTP chặn khi bị dội nhiều kết nối một
 * lúc, mà danh sách chỉ khoảng chục người nên chậm vài giây không sao. Một
 * người hỏng không làm hỏng cả lượt — trả về danh sách ai gửi được, ai không.
 */
export async function sendShiftEmails(
  spotRaw: string,
  month: string,
  onlyUsernames?: string[],
): Promise<ShiftMailReport> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const board = await getShiftBoard(spot, month);
  const filter = onlyUsernames?.length ? new Set(onlyUsernames) : null;

  const report: ShiftMailReport = { sent: [], skipped: [], failed: [] };

  for (const row of board.rows) {
    if (filter && !filter.has(row.username)) continue;

    if (!row.email) {
      report.skipped.push({ pilotName: row.pilotName, reason: "chưa khai email" });
      continue;
    }
    if (!row.days.length) {
      report.skipped.push({ pilotName: row.pilotName, reason: "chưa chấm ngày làm nào" });
      continue;
    }

    const mail = buildShiftEmail({
      pilotName: row.pilotName,
      month,
      spotName: spotName(spot),
      workDays: row.days,
      version: board.version,
    });

    try {
      await sendSmtpMail({ to: row.email, subject: mail.subject, html: mail.html, text: mail.text });
      report.sent.push({ pilotName: row.pilotName, email: row.email });
    } catch (e: any) {
      report.failed.push({ pilotName: row.pilotName, email: row.email, error: e?.message || "không gửi được" });
    }
  }

  if (report.sent.length) {
    await BaobayShift.updateOne({ spot, month }, { $set: { notifiedAt: new Date(), notifiedVersion: board.version } });
  }

  return report;
}

/** Lịch của CHÍNH mình — phi công xem trên trang báo cáo, khỏi phải lục email. */
export async function getMyShifts(
  session: BaobaySession,
  spotRaw: string,
  month: string,
): Promise<{ month: string; daysInMonth: number; workDays: number[]; updatedAt?: string }> {
  await connectDB();

  const spot = assertSpotAllowed(session, spotRaw);
  const doc = await BaobayShift.findOne({ spot, month }).lean<any>();
  const mine = (doc?.assignments ?? []).find((a: any) => a.username === session.username);

  return {
    month,
    daysInMonth: daysInMonthOfKey(month),
    workDays: (mine?.days ?? []).slice().sort((a: number, b: number) => a - b),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/* ================================================================== */
/* Phạt nộp muộn: báo tạm tính và huỷ lệnh phạt                        */
/* ================================================================== */

export type PenaltyRowDTO = {
  username: string;
  pilotName: string;
  flightCount: number;
  /** "recorded" = đã chốt muộn nên đã ghi phạt. "pending" = tạm tính, chưa biết có bay hay không. */
  kind: "recorded" | "pending";
  amount: number;
  waived: boolean;
  waivedBy?: string;
  waiveReason?: string;
  submittedAt?: string;
};

export type PenaltyStatusDTO = {
  spot: string;
  date: string;
  deadline: string;
  pastDeadline: boolean;
  dayClosed: boolean;
  rows: PenaltyRowDTO[];
  /** Tổng tiền phạt sẽ thu của ngày (không tính phần tạm tính). */
  total: number;
};

/**
 * Bảng phạt nộp muộn của một ngày.
 *
 * Hai loại, cố ý tách bạch:
 *
 *  - **Đã ghi phạt** (`recorded`): phi công CÓ chuyến bay và bấm chốt lần đầu sau
 *    giờ quy định. Đây là tiền thật, đã nằm trong bảng lương.
 *  - **Tạm tính** (`pending`): quá giờ mà chưa thấy báo cáo. Lúc này hệ thống
 *    CHƯA biết người đó có bay hay không, nên chỉ báo tạm. Ai không bay thì hôm
 *    đó không phải báo cáo, và khoản tạm tính này TỰ HUỶ khi kế toán chốt ngày —
 *    không sinh ra bản ghi phạt nào. Ai có bay thì lúc chốt (tự chốt hoặc kế
 *    toán chốt hộ) sẽ thành phạt thật.
 *
 * Ngày đã chốt thì không còn dòng tạm tính nào: chốt xong là mọi việc đã rõ.
 */
export async function getLatePenaltyStatus(spotRaw: string, date: string): Promise<PenaltyStatusDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const [deadline, dayClosed, reports, roster] = await Promise.all([
    getSubmitDeadline(spot),
    isDayClosed(spot, date),
    PilotDailyReport.find({ spot, date }).lean<any[]>(),
    BaobayAccount.find({ role: "pilot", isActive: true, spots: spot })
      .select("username displayName")
      .lean<any[]>(),
  ]);

  const pastDeadline = isPastSubmitDeadline(date, deadline);
  const inGrace = date <= LATE_PENALTY_GRACE_UNTIL;
  const rows: PenaltyRowDTO[] = [];

  for (const r of reports) {
    if (!r.lateSubmit) continue;
    rows.push({
      username: r.username,
      pilotName: r.pilotName,
      flightCount: r.flightCount ?? 0,
      kind: "recorded",
      amount: r.latePenalty ?? 0,
      waived: Boolean(r.latePenaltyWaived),
      waivedBy: r.latePenaltyWaivedBy || undefined,
      waiveReason: r.latePenaltyWaiveReason || undefined,
      submittedAt: r.firstSubmittedAt ? new Date(r.firstSubmittedAt).toISOString() : undefined,
    });
  }

  if (pastDeadline && !dayClosed && !inGrace) {
    const reported = new Set(reports.filter((r) => r.submitted).map((r) => r.username));
    for (const acc of roster) {
      if (reported.has(acc.username)) continue;
      rows.push({
        username: acc.username,
        pilotName: acc.displayName,
        flightCount: reports.find((r) => r.username === acc.username)?.flightCount ?? 0,
        kind: "pending",
        amount: LATE_PENALTY_VND,
        waived: false,
      });
    }
  }

  rows.sort((a, b) => (a.kind === b.kind ? a.pilotName.localeCompare(b.pilotName, "vi") : a.kind === "recorded" ? -1 : 1));

  return {
    spot,
    date,
    deadline,
    pastDeadline,
    dayClosed,
    rows,
    total: rows.filter((r) => r.kind === "recorded").reduce((sum, r) => sum + r.amount, 0),
  };
}

/**
 * Kế toán huỷ (hoặc khôi phục) lệnh phạt nộp muộn của một phi công.
 *
 * Quy tắc chủ điểm bay đặt: nộp muộn là bị phạt, KỂ CẢ khi kế toán chốt hộ —
 * trừ khi chính kế toán huỷ lệnh phạt. Nên đường này luôn mở, cả khi ngày đã
 * chốt: đó là quyết định về tiền lương, không phải sửa số liệu của ngày.
 * Không xoá `lateSubmit` để sổ vẫn còn dấu vết hôm đó nộp muộn.
 */
export async function waiveLatePenalty(
  session: BaobaySession,
  spotRaw: string,
  date: string,
  username: string,
  waive: boolean,
  reason: string,
): Promise<{ ok: true; report: PilotReportDTO } | { ok: false; error: string }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const doc = await PilotDailyReport.findOne({ spot, date, username: normalizeUsername(username) }).lean<any>();
  if (!doc) return { ok: false, error: "Không tìm thấy báo cáo của phi công này trong ngày đó" };
  if (!doc.lateSubmit) return { ok: false, error: "Báo cáo này không bị ghi phạt nộp muộn" };

  const set = waive
    ? {
        latePenaltyWaived: true,
        latePenalty: 0,
        latePenaltyWaivedBy: session.username,
        latePenaltyWaivedAt: new Date(),
        latePenaltyWaiveReason: reason.trim(),
      }
    : {
        latePenaltyWaived: false,
        latePenalty: LATE_PENALTY_VND,
        latePenaltyWaivedBy: "",
        latePenaltyWaiveReason: "",
      };

  const updated = await PilotDailyReport.findOneAndUpdate({ _id: doc._id }, { $set: set }, { new: true }).lean<any>();

  // Bảng lương trên bảng tính đổi theo — chạy nền
  pushSheetInBackground(() => pushPilotRow(updated), PilotDailyReport, doc._id);

  return { ok: true, report: toPilotDTO(updated) };
}

/* ================================================================== */
/* Yêu cầu soát lại — kế toán gửi lệnh xuống nhân sự                   */
/* ================================================================== */

export type ReviewRequestDTO = {
  id: string;
  spot: string;
  date: string;
  topic: ReviewTopic;
  topicLabel: string;
  note: string;
  requestedBy: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

function toReviewDTO(doc: any): ReviewRequestDTO {
  return {
    id: String(doc._id),
    spot: doc.spot,
    date: doc.date,
    topic: doc.topic,
    topicLabel: REVIEW_TOPIC_LABEL[doc.topic as ReviewTopic] ?? doc.topic,
    note: doc.note || "",
    requestedBy: doc.requestedBy,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : undefined,
    resolvedBy: doc.resolvedBy || undefined,
  };
}

/** Kế toán bấm "yêu cầu soát lại" — một lệnh cho một chủ đề của một ngày. */
export async function createReviewRequest(
  session: BaobaySession,
  spotRaw: string,
  date: string,
  topic: ReviewTopic,
  note: string,
): Promise<ReviewRequestDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  // Cùng chủ đề cùng ngày đang còn treo thì cập nhật lời nhắn thay vì xếp chồng lệnh
  const doc = await BaobayReviewRequest.findOneAndUpdate(
    { spot, date, topic, resolvedAt: { $exists: false } },
    { $set: { note: note.trim(), requestedBy: session.username } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean<any>();

  return toReviewDTO(doc);
}

/**
 * Các lệnh của một ngày. `forRole` để trang nhân sự chỉ thấy lệnh NHẮM VÀO
 * vai trò mình (flycam không phải việc của phi công); bỏ trống = trang kế toán
 * xem tất, kèm cả lệnh đã xử lý để còn đối chiếu.
 */
export async function listReviewRequests(
  spotRaw: string,
  date: string,
  forRole?: BaobayRole,
): Promise<ReviewRequestDTO[]> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);

  const filter: Record<string, unknown> = { spot, date };
  if (forRole) filter.resolvedAt = { $exists: false };

  const docs = await BaobayReviewRequest.find(filter).sort({ createdAt: -1 }).lean<any[]>();
  const list = docs.map(toReviewDTO);
  if (!forRole) return list;
  return list.filter((r) => (REVIEW_TARGET_ROLES[r.topic] ?? []).includes(forRole));
}

/** Kế toán đánh dấu một lệnh là đã xử lý. */
export async function resolveReviewRequest(
  session: BaobaySession,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, error: "Mã lệnh không hợp lệ" };

  const r = await BaobayReviewRequest.updateOne(
    { _id: id, resolvedAt: { $exists: false } },
    { $set: { resolvedAt: new Date(), resolvedBy: session.username } },
  );
  return r.matchedCount ? { ok: true } : { ok: false, error: "Lệnh này đã được xử lý rồi" };
}

/* ================================================================== */
/* Số nhân viên báo — cho kế toán XÁC NHẬN thay vì gõ lại              */
/* ================================================================== */

/**
 * Dựng DẢI MÃ liên tục từ danh sách mã rời phi công báo về: "MBL0001, MBL0002,
 * MBL0003, MBL0007" → [0001–0003, 0007–0007]. Kế toán khỏi dò tay từng mã.
 */
function rangesFromCodes(codes: string[]): Array<{ from: string; to: string }> {
  const parsed = codes
    .map((c) => parseTicketCode(c))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  // Gom theo tiền tố (MBL, KP-…) rồi xếp số tăng dần, bỏ mã trùng
  const byPrefix = new Map<string, { num: number; width: number }[]>();
  for (const p of parsed) {
    const list = byPrefix.get(p.prefix) ?? [];
    if (!list.some((x) => x.num === p.num)) list.push({ num: p.num, width: p.width });
    byPrefix.set(p.prefix, list);
  }
  const ranges: Array<{ from: string; to: string }> = [];
  for (const [prefix, list] of byPrefix) {
    list.sort((a, b) => a.num - b.num);
    let start = list[0];
    let prev = list[0];
    for (const cur of list.slice(1)) {
      if (cur.num === prev.num + 1) {
        prev = cur;
        continue;
      }
      ranges.push({ from: formatTicketCode(prefix, start.num, start.width), to: formatTicketCode(prefix, prev.num, prev.width) });
      start = prev = cur;
    }
    ranges.push({ from: formatTicketCode(prefix, start.num, start.width), to: formatTicketCode(prefix, prev.num, prev.width) });
  }
  return ranges;
}

export type CloseSuggestionDTO = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  /** KHÁCH huỷ ĐÃ trả tiền (có lệnh hoàn) — đếm từ sổ booking + báo cáo điều phối. */
  cancelledRefundCount: number;
  /** KHÁCH huỷ chưa thanh toán (không có hoàn) — đếm từ sổ booking + báo cáo điều phối. */
  cancelledNoRefundCount: number;
  /**
   * SỐ KHÁCH dời lịch — gom cả quầy khai lẫn sổ booking, đếm theo ĐẦU KHÁCH.
   *
   * Đứng RIÊNG với `rescheduledCount`: cái kia đếm theo VÉ và bị ràng vào phép
   * tính "vé thu hồi = huỷ + dời", mà nhóm dời trên sổ booking thường chưa
   * xuất vé nên không có mã nào để thu hồi. Nhét chung là báo đỏ oan mỗi ngày.
   */
  rescheduledGuestCount: number;
  /** Trong số khách dời, bao nhiêu người ĐÃ cầm vé — vé của họ phải được thu hồi. */
  rescheduledTicketGuests: number;
  rescheduledCount: number;
issuedRanges: Array<{ from: string; to: string }>;
  /** Dải mã dựng TỰ ĐỘNG từ mã phi công báo đã bay (+PPG) — dùng khi quầy chưa nhập dải. */
  pilotRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  rescheduled: Array<{ code: string; toDate: string; note: string }>;
  cashTotal: number;
  transferTotal: number;
  /** ĐẠI LÝ THU HỘ tiền bay của khách ngày này — đại lý đang cầm, phải đòi về (KHÔNG phải chiết khấu). */
  agencyHeld: Array<{ name: string; amount: number; bookings: string[] }>;
  agencyHeldTotal: number;
  /**
   * BOOKING LỆCH TIỀN: khách trả nhiều hơn tổng phải trả — gần như luôn do ai
   * đó sửa/bỏ lệnh thêm-bớt dịch vụ SAU KHI đã thu tiền. Kế toán phải bù hoặc
   * hoàn trước khi chốt ngày.
   */
  overpaidBookings: Array<{ label: string; amount: number; undoneChanges: number }>;
  /**
   * AI BÁO BAO NHIÊU theo báo cáo nhân viên — "Dũng 5 + Sơm 7 = 12".
   *
   * Khác `byPerson` của sổ booking (ai NHẬP dịch vụ): đây là ai LÀM và tự khai.
   * Kế toán cần cả hai: số booking là tiền, số nhân viên là việc đã làm.
   * flycam ← camera man · 360/cờ đỏ/hoàng hôn/kéo cờ ← phi công.
   */
  reportedBy: Record<string, Array<{ name: string; qty: number }>>;
  /** Tiền ghi dưới tên từng người trong sổ booking — xem moneyByPerson. */
  moneyByPerson: Array<{ name: string; cash: number; transfer: number; income: number; spend: number }>;
  /** Dịch vụ đếm theo SỔ BOOKING (gồm mọi lệnh thêm/bớt tại bãi) — nguồn chuẩn cho tiền. */
  booking: {
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
    hasData: boolean;
  };
  /** Tổng CHI của điều phối (nước, xe núi, xe đưa đón, chi khác) — để kế toán nhận vào sổ. */
  dispatcherSpend: number;
  /**
   * BẢO HIỂM CỦA NGÀY, đếm theo ĐẦU NGƯỜI chứ không theo booking.
   *
   *   đã đẩy  = mọi người từng được gửi sang bên bảo hiểm hôm nay
   *   thu hồi = trong số đó đã bị rút (booking thu hồi, hoặc khách huỷ sau khi gửi)
   *   còn lại = đang có hiệu lực = đã đẩy − thu hồi
   *
   * `chuaGui` không nằm trong phép trừ: đó là người ĐÃ XUẤT VÉ hoặc ĐÃ BAY mà
   * hồ sơ vẫn chưa sang được bên bảo hiểm — số này phải bằng 0 khi chốt ngày.
   */
  insurance: {
    sent: number;
    recalled: number;
    active: number;
    notSent: number;
    notSentBookings: Array<{ label: string; guests: number; reason: string }>;
  };
  /** Tổng khách ĐĂNG KÝ trước trong sổ booking của ngày (trừ nhóm đã huỷ) — cho ô Hà Nội. */
  registeredGuests: number;
  /** Khách đã xác nhận bay (booking tích "đã bay") — đăng ký trừ huỷ/dời. */
  flownGuests: number;
  /**
   * Chuyến PPG PHI CÔNG KHAI THÊM ngoài sổ booking.
   *
   * PPG hay bay ngoài sổ: khách tới bãi hỏi bay luôn, phi công chở đi mà quầy
   * và điều phối không kịp lập booking — sổ booking không có dòng nào để tích
   * "đã bay". Trước đây "số khách đã bay" điền theo sổ booking nên NHỮNG
   * CHUYẾN ẤY MẤT TÍCH khỏi số tổng trong ngày dù phi công đã khai đàng hoàng.
   *
   * = max(0, tổng ppgFlights phi công khai − khách PPG đã bay theo sổ booking).
   * Lấy hiệu chứ không cộng thẳng để chuyến PPG CÓ trong sổ không bị đếm hai
   * lần (một lần ở flownGuests, một lần ở đây).
   */
  pilotExtraPpg: number;
  /** HÀ NỘI: nhóm khách huỷ/dời ĐIỀU PHỐI đã nhập — kế toán bấm một nút là nhận nguyên bộ. */
  cancelledGuestEntries: Array<{ name: string; bookingCode: string; guests: number; source: string; refund: number; note?: string }>;
  rescheduledGuestEntries: Array<{ name: string; guests: number; toDate: string; note?: string }>;
  /**
   * Sổ "Tiền trong ngày" dựng sẵn từ báo cáo điều phối: từng dòng thu đúng
   * tiền mặt/CK + từng khoản chi hộ — kế toán bấm một nút là nhận cả cụm.
   */
  dispatcherLedger: Array<{ content: string; amount: number; kind: "thu" | "chi"; method?: "cash" | "transfer" }>;
  /** Flycam lấy theo CAMERA MAN — nguồn chuẩn của dịch vụ này. */
  flycam: number;
  /** Camera 360 lấy theo PHI CÔNG — nguồn chuẩn của dịch vụ này. */
  video360: number;
  /** Cờ đỏ lấy theo PHI CÔNG — nguồn chuẩn của dịch vụ này. */
  redFlag: number;
  /** Bay hoàng hôn/săn mây lấy theo PHI CÔNG — như cờ đỏ. */
  sunset: number;
  flagFlight: number;
  /** Tổng theo TỪNG PHÍA — cho hai nút "lấy số phi công" / "lấy số điều phối". */
  pilot: {
    flights: number;
    /** Chuyến PPG — khách PPG cũng là khách bay, phải cộng vào "số khách" phía phi công. */
    ppg: number;
    /** Trong số PPG trên, bao nhiêu chuyến KHÔNG xé vé (phi công tự khai). */
    ppgNoTicket: number;
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
    hasData: boolean;
  };
  dispatcher: { flycam: number; video360: number; redFlag: number; sunset: number; flagFlight: number; hasData: boolean };
  /** Tên những điều phối/trực quầy đã báo — nút chấp nhận ghi rõ nhận số từ ai. */
  dispatcherNames: string[];
  /** Có báo cáo nào của nhân viên chưa — chưa có thì khỏi hiện nút chép. */
  hasData: boolean;
};

/**
 * Gom số NHÂN VIÊN ĐÃ BÁO của một ngày thành đúng hình dạng form kế toán.
 *
 * Quy trình thật: phi công/điều phối nhập, kế toán chỉ ĐỐI SOÁT — đúng thì bấm
 * chép sang trường của mình (xác nhận), sai thì không chép và truy ngược người
 * nhập. Số chốt vẫn là con số kế toán TỰ CHỊU TRÁCH NHIỆM: chép xong sửa tay
 * được, và không chép gì cả cũng được.
 *
 * Mỗi dịch vụ lấy theo NGUỒN CHUẨN của nó: flycam theo camera man, Camera 360
 * theo phi công, còn lại theo điều phối — trùng với quy tắc của bộ đối chiếu.
 */
/**
 * ĐẾM BẢO HIỂM CỦA MỘT NGÀY theo ĐẦU NGƯỜI.
 *
 * Ba con số phải luôn khớp phép trừ "đã đẩy − thu hồi = còn lại", nên chúng được
 * tính từ CÙNG một danh sách chứ không đếm rời:
 *   - booking đã gửi (`insuranceSentAt`): người còn hiệu lực đếm vào `active`,
 *     người đã huỷ trong đó đếm vào `recalled` (trên bảng họ mang trạng thái HUỶ);
 *   - booking đã thu hồi (`insuranceRecalledAt` mà không còn `insuranceSentAt`):
 *     cả nhóm vào `recalled`.
 * `sent` là tổng hai phần — mọi người TỪNG được đẩy sang bên bảo hiểm hôm đó.
 *
 * `notSent` đứng riêng, KHÔNG nằm trong phép trừ: đó là khách đã xuất vé / đã
 * bay / bay không vé mà hồ sơ vẫn chưa sang được. Chốt ngày mà số này khác 0 là
 * có người đã bay không bảo hiểm — phải xử lý trước khi chốt.
 */
/**
 * MỐC BẮT ĐẦU đòi hỏi hồ sơ bảo hiểm: 0h ngày 23/08/2026 (giờ Việt Nam).
 *
 * So theo LÚC XUẤT VÉ chứ không theo ngày bay, và lấy mốc là sáng hôm sau ngày
 * tính năng lên: vé xuất trước đó thuộc thời kỳ bảo hiểm còn nhập tay ngoài app,
 * booking nào cũng trống hồ sơ. Không chặn thì mở ngày cũ nào cũng thấy một dòng
 * đỏ vu oan — mà cảnh báo kêu oan vài lần thì lần thứ ba người ta hết nhìn, đúng
 * lúc nó kêu thật.
 */
const INSURANCE_START = new Date("2026-08-23T00:00:00+07:00");

function insuranceTally(docs: any[]): CloseSuggestionDTO["insurance"] {
  let active = 0;
  let recalled = 0;
  let notSent = 0;
  const notSentBookings: CloseSuggestionDTO["insurance"]["notSentBookings"] = [];

  for (const b of docs) {
    const rows: any[] = Array.isArray(b.insured) ? b.insured : [];
    if (b.insuranceSentAt) {
      active += rows.filter((g) => !g.cancelled).length;
      recalled += rows.filter((g) => g.cancelled).length;
      continue;
    }
    if (b.insuranceRecalledAt) {
      recalled += rows.length;
      continue;
    }

    /**
     * Chưa gửi: chỉ tính là THIẾU khi khách thật sự đã đi vào guồng bay, tức
     * đã xuất vé hoặc đã đánh dấu bay không vé — hai việc đó đều có dấu thời
     * gian, nên vừa biết "đã vào guồng" vừa biết "lúc nào".
     */
    if (b.status === "cancelled" || b.status === "voided") continue;
    const at = b.ticketIssuedAt ?? (b.noTicketFlight ? b.noTicketAt : null);
    if (!at || new Date(at) < INSURANCE_START) continue;
    const guests = Number(b.guestCount) || 0;
    if (guests <= 0) continue;
    notSent += guests;
    notSentBookings.push({
      label: `#${b.daySeq || "?"} ${b.contactName || b.bookingCode || "khách"}`,
      guests,
      reason: b.ticketIssuedAt ? "đã xuất vé" : b.noTicketFlight ? "bay không vé" : "đã bay",
    });
  }

  return { sent: active + recalled, recalled, active, notSent, notSentBookings };
}

export async function getCloseSuggestion(spotRaw: string, date: string): Promise<CloseSuggestionDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const filter = { spot, date };
  const [dispatchers, pilots, cameramen, bookings, insuranceBookings] = await Promise.all([
    DispatcherDailyReport.find(filter).lean<any[]>(),
    PilotDailyReport.find(filter).lean<any[]>(),
    CameramanDailyReport.find(filter).lean<any[]>(),
    /**
     * Khách ĐĂNG KÝ trước của ngày (sổ booking) — bỏ nhóm đã huỷ và nhóm bị bỏ
     * khỏi sổ. Kèm trạng thái để tách riêng số khách ĐÃ XÁC NHẬN BAY.
     */
    BaobayBooking.find({ spot, flightDate: date, status: { $nin: ["cancelled", "voided"] } })
      .select("guestCount status flycam video360 redFlag sunset flagFlight")
      .lean<any[]>(),
    /**
     * Bảo hiểm đếm trên MỌI booking của ngày, KHÔNG lọc trạng thái: booking đã
     * huỷ mới chính là nguồn của số "thu hồi" — lọc nó ra thì số thu hồi luôn
     * bằng 0 và phép trừ không bao giờ khớp.
     */
    BaobayBooking.find({ spot, flightDate: date })
      .select(
        "guestCount status contactName bookingCode daySeq insured " +
          "insuranceSentAt insuranceRecalledAt ticketIssuedAt noTicketFlight noTicketAt",
      )
      .lean<any[]>(),
  ]);

  /**
   * KHÁCH HUỶ ghi ngay trên SỔ BOOKING (nút ✕ Huỷ booking) — nguồn thứ hai bên
   * cạnh báo cáo điều phối.
   *
   * Huỷ trên dòng booking là đường nhanh nhất nên nhân viên hay dùng, mà kế
   * toán lại không thấy gì: gợi ý chốt ngày chỉ đọc báo cáo điều phối nên vé
   * huỷ và TIỀN HOÀN không hiện ra để chấp nhận. Đã bị bỏ sót đúng như vậy với
   * vé MBL0356 ngày 16/08 (hoàn 2.990.000 đ CK).
   */
  const cancelledBookings = await BaobayBooking.find({ spot, flightDate: date, status: "cancelled" })
    .select("contactName phone bookingCode source guestCount cancelTicketCodes refundAmount refundMethod")
    .lean<any[]>();

  /** HUỶ MỘT PHẦN: booking vẫn chạy nhưng đã huỷ bớt N khách — kế toán phải thấy N này trong mục huỷ. */
  const partialCancelled = await BaobayBooking.find({
    spot,
    flightDate: date,
    status: { $nin: ["cancelled", "voided"] },
    cancelledGuests: { $gt: 0 },
  })
    .select("contactName phone bookingCode source cancelledGuests")
    .lean<any[]>();

  /** LỆNH THU của ngày — đường tiền chính từ 13/08 (thu ngay trên booking). */
  const dayCollects = await BaobayCollect.find({
    spot,
    date,
    status: { $in: ["collected", "company"] },
  })
    .select("method amount status collectorName createdByName")
    .lean<any[]>();
  const collectCashOfDay = dayCollects
    .filter((c) => c.method === "cash" && c.status === "collected")
    .reduce((a, c) => a + (c.amount || 0), 0);
  const collectTransferOfDay = dayCollects
    .filter((c) => c.method === "transfer" && c.status === "company")
    .reduce((a, c) => a + (c.amount || 0), 0);

  /**
   * TIỀN GHI DƯỚI TÊN TỪNG NGƯỜI trong sổ booking.
   *
   * Khác hẳn hai ô tiền người ta tự gõ vào báo cáo của mình: ô ấy hay để
   * trống (ngày 25/08 Ms Duyên bỏ trống cả hai, màn hình hiện "TM 0đ · CK 0đ"
   * trong khi ngày đó thu thật 5,48tr tiền mặt và 8,96tr chuyển khoản). Con số
   * ở đây cộng từ LỆNH THU nên bám theo tiền thật, không phụ thuộc ai chịu gõ.
   *
   * TIỀN MẶT tính cho NGƯỜI THU (họ đang cầm tiền); CHUYỂN KHOẢN tính cho
   * NGƯỜI GHI NHẬN (tiền vào thẳng tài khoản công ty, không ai cầm) — đó là
   * hai câu hỏi khác nhau: "ai đang giữ tiền" và "ai đã ghi khoản này".
   */
  /** Hoa hồng đại lý đã CHI trong ngày, kèm tên người chi — xem moneyByPerson. */
  const commissionDocs = await BaobayBooking.find({
    spot,
    flightDate: date,
    "commission.amount": { $gt: 0 },
    status: { $nin: ["voided"] },
  })
    .select("commission")
    .lean<any[]>();

  const moneyByPerson = (() => {
    type Row = { name: string; cash: number; transfer: number; income: number; spend: number };
    const m = new Map<string, Row>();
    const row = (rawName: string): Row => {
      const name = String(rawName || "").trim() || "không rõ";
      const cur = m.get(name) ?? { name, cash: 0, transfer: 0, income: 0, spend: 0 };
      m.set(name, cur);
      return cur;
    };

    /* --- Tiền KHÁCH TRẢ, cộng từ lệnh thu --- */
    for (const c of dayCollects) {
      if (c.method === "cash" && c.status === "collected") row(c.collectorName || c.createdByName).cash += c.amount || 0;
      else if (c.method === "transfer" && c.status === "company") row(c.createdByName).transfer += c.amount || 0;
    }

    /* --- THU / CHI ghi trong sổ thu chi của chính người đó --- */
    for (const d of dispatchers) {
      const r = row((d as any).staffName);
      r.income += thuTotal((d as any).expenses);
      r.spend += dispatcherExpenseTotal(d as any);
    }

    /**
     * CHI HOA HỒNG ĐẠI LÝ tính vào người đứng ra chi.
     *
     * Khoản này KHÔNG nằm trong sổ thu chi của điều phối (nó ghi thẳng trên
     * booking), nhưng tiền vẫn ra khỏi tay người ấy — bỏ sót là dòng "Chi"
     * thiếu đúng phần to nhất trong ngày.
     *
     * Chỉ tính hoa hồng trả bằng TIỀN MẶT: trả bằng chuyển khoản thì tiền đi
     * từ tài khoản công ty, còn "agency" là trừ vào tiền đại lý đang giữ —
     * cả hai đều không phải tiền người này bỏ ra.
     */
    for (const b of commissionDocs) {
      const c = b.commission || {};
      if (c.method === "cash" && (c.amount || 0) > 0) row(c.byName).spend += c.amount;
    }

    return [...m.values()]
      .filter((x) => x.cash > 0 || x.transfer > 0 || x.income > 0 || x.spend > 0)
      .sort((a, b) => b.cash + b.transfer - (a.cash + a.transfer));
  })();

  /** ĐẠI LÝ THU HỘ: khách bay hôm nay đã trả bên đại lý — tiền nằm ở đại lý, kế toán phải đòi. */
  const agencyHeldBookings = await BaobayBooking.find({
    spot,
    flightDate: date,
    agencyPaidAmount: { $gt: 0 },
    status: { $nin: ["cancelled", "voided"] },
  })
    .select("agencyPaidAmount agencyName contactName daySeq commission")
    .lean<any[]>();
  const heldBy = new Map<string, { name: string; amount: number; bookings: string[] }>();
  for (const b of agencyHeldBookings) {
    const name = (b.agencyName || "").trim() || "(chưa ghi tên đại lý)";
    // Phần chiết khấu đại lý tự giữ lại thì công ty không đòi nữa — xem agencyKeptCommission
    const conNo = Math.max(0, (b.agencyPaidAmount || 0) - agencyKeptCommission(b));
    const cur = heldBy.get(name) ?? { name, amount: 0, bookings: [] as string[] };
    cur.amount += conNo;
    cur.bookings.push(`#${b.daySeq || "?"} ${b.contactName || ""}`);
    heldBy.set(name, cur);
  }
  const agencyHeld = [...heldBy.values()].filter((a) => a.amount > 0).sort((a, b) => b.amount - a.amount);

  /** Booking của ngày đang THU THỪA (trả > tổng) + số lệnh dịch vụ đã bị bỏ. */
  const overpaidDocs = await BaobayBooking.find({
    spot,
    flightDate: date,
    status: { $nin: ["voided"] },
  })
    .select("daySeq contactName phone deposit agencyPaidAmount totalAmount refundedTotal")
    .lean<any[]>();
  const overpaidRaw = overpaidDocs
    .map((b) => ({
      id: String(b._id),
      label: `#${b.daySeq || "?"} ${b.contactName || b.phone || "khách"}`,
      amount:
        (b.deposit || 0) + (b.agencyPaidAmount || 0) - (b.totalAmount || 0) - (b.refundedTotal || 0),
    }))
    .filter((x) => x.amount > 0);
  const undoneCounts = overpaidRaw.length
    ? await BaobayServiceChange.aggregate([
        {
          $match: {
            bookingId: { $in: overpaidRaw.map((x) => new mongoose.Types.ObjectId(x.id)) },
            undoneAt: { $ne: null },
          },
        },
        { $group: { _id: "$bookingId", n: { $sum: 1 } } },
      ])
    : [];
  const undoneMap = new Map<string, number>(
    undoneCounts.map((r: any) => [String(r._id), Number(r.n) || 0]),
  );
  const overpaidBookings = overpaidRaw
    .map((x) => ({ label: x.label, amount: x.amount, undoneChanges: undoneMap.get(x.id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  const sum = <T>(list: T[], pick: (x: T) => number) => list.reduce((a, x) => a + (pick(x) || 0), 0);

  const dispatcherCancelledCodes = dispatchers.flatMap((d) => (d.cancelledCodes ?? []) as string[]);
  const bookingCancelledCodes = cancelledBookings.flatMap((b) => (b.cancelTicketCodes ?? []) as string[]);
  const cancelledCodes = [...new Set([...dispatcherCancelledCodes, ...bookingCancelledCodes])];

  /**
   * Nhóm khách huỷ lấy từ sổ booking — BỎ QUA nhóm điều phối đã khai rồi (trùng
   * mã vé, hoặc trùng tên + số khách), để kế toán không nhận hai lần một khách.
   */
  const declaredCodes = new Set(dispatcherCancelledCodes.map((c) => String(c).toUpperCase()));
  const declaredNames = new Set(
    dispatchers
      .flatMap((d) => (d.cancelledGuestEntries ?? []) as any[])
      .map((e) => `${(e.name || "").trim().toLowerCase()}|${e.guests || 0}`),
  );
  const partialCancelEntries = partialCancelled.map((b) => ({
    name: b.contactName || b.phone || "khách",
    bookingCode: b.bookingCode || "",
    guests: b.cancelledGuests || 0,
    source: b.source || "",
    refund: 0,
    note: "huỷ MỘT PHẦN trên sổ booking (booking vẫn bay phần còn lại; hoàn tiền xem khay hoàn)",
  }));

  /**
   * BOOKING ĐÃ DỜI KHỎI NGÀY NÀY — đọc thẳng sổ booking.
   *
   * Trước đây khối gợi ý chỉ cộng số quầy TỰ KHAI, nên dời lịch làm trên sổ
   * booking (điều phối bấm "⇢ Dời lịch") không được đếm: ngày 24/08 có nhóm
   * Lê Thị Trang 2 khách sang 23/08 mà màn hình vẫn báo "dời 0".
   *
   * Cùng khoá tìm với danh sách "dời đi" ở listBookings: `rescheduledFrom`
   * còn ghi ngày cũ, còn `flightDate` đã sang ngày mới.
   */
  const movedAwayBookings = await BaobayBooking.find({
    spot,
    rescheduledFrom: date,
    flightDate: { $ne: date },
    status: { $nin: ["voided"] },
  })
    .select("contactName phone bookingCode guestCount flightDate ticketIssuedAt")
    .lean<any[]>();

  const bookingCancelEntries = cancelledBookings
    .filter((b) => {
      const codes = (b.cancelTicketCodes ?? []).map((c: string) => String(c).toUpperCase());
      if (codes.some((c: string) => declaredCodes.has(c))) return false;
      return !declaredNames.has(`${(b.contactName || "").trim().toLowerCase()}|${b.guestCount || 0}`);
    })
    .map((b) => ({
      name: b.contactName || b.phone || "khách",
      bookingCode: b.bookingCode || "",
      guests: b.guestCount || 0,
      source: b.source || "",
      refund: b.refundAmount || 0,
      note: [
        (b.cancelTicketCodes ?? []).length ? `thu hồi ${(b.cancelTicketCodes ?? []).join(" ")}` : "",
        b.refundAmount ? `hoàn ${b.refundMethod === "cash" ? "TM" : "CK"}` : "",
        "huỷ trên sổ booking",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  /** Ai LÀM bao nhiêu theo báo cáo nhân viên — flycam của camera man, còn lại của phi công. */
  const reportedBy: Record<string, Array<{ name: string; qty: number }>> = {};
  const pushReport = (key: string, name: string, qty: number) => {
    if (!qty) return;
    (reportedBy[key] ??= []).push({ name: name || "không rõ", qty });
  };
  for (const c of cameramen) pushReport("flycam", c.cameramanName, c.flycamFlights || 0);
  for (const p of pilots) {
    pushReport("video360", p.pilotName, p.video360 || 0);
    pushReport("redFlag", p.pilotName, p.redFlag || 0);
    pushReport("sunset", p.pilotName, p.sunset || 0);
    pushReport("flagFlight", p.pilotName, p.flagFlight || 0);
    pushReport("pilotFlycam", p.pilotName, p.flycam || 0);
  }
  for (const key of Object.keys(reportedBy)) reportedBy[key].sort((a, b) => b.qty - a.qty);

  /** Cộng dịch vụ trên SỔ BOOKING của ngày — đã gồm mọi lệnh thêm/bớt/bỏ. */
  const bookingServices = {
    flycam: bookings.reduce((t, b) => t + (b.flycam || 0), 0),
    video360: bookings.reduce((t, b) => t + (b.video360 || 0), 0),
    redFlag: bookings.reduce((t, b) => t + (b.redFlag || 0), 0),
    sunset: bookings.reduce((t, b) => t + (b.sunset || 0), 0),
    flagFlight: bookings.reduce((t, b) => t + (b.flagFlight || 0), 0),
  };

  const rescheduled = dispatchers.flatMap((d) =>
    (d.rescheduled ?? []).map((r: any) => ({
      code: r.code || "",
      toDate: r.toDate || "",
      note: r.note || "",
    })),
  );

  /**
   * Nhóm dời lịch = quầy khai + sổ booking, BỎ TRÙNG theo tên + số khách
   * (cùng cách chống trùng với nhóm huỷ ở trên).
   */
  const mergedRescheduleEntries = (() => {
    const declared = dispatchers.flatMap(
      (d) => (d.rescheduledGuestEntries ?? []) as CloseSuggestionDTO["rescheduledGuestEntries"],
    );
    const seen = new Set(declared.map((e) => `${(e.name || "").trim().toLowerCase()}|${e.guests || 0}`));
    const fromBook = movedAwayBookings
      .filter((b) => !seen.has(`${(b.contactName || "").trim().toLowerCase()}|${b.guestCount || 0}`))
      .map((b) => ({
        name: b.contactName || b.phone || "khách",
        guests: b.guestCount || 0,
        toDate: b.flightDate || "",
        note: "dời trên sổ booking",
        /**
         * Nhóm dời ĐÃ XUẤT VÉ hay chưa — quyết định nó có phải nằm trong "vé
         * thu hồi" không. Chưa xuất vé thì không có tờ vé nào để thu, nên ô
         * "Vé dời lịch" đứng im ở 0 là ĐÚNG; màn hình phải nói ra điều đó kẻo
         * kế toán tưởng máy bỏ sót.
         */
        ticketIssued: Boolean(b.ticketIssuedAt),
      }));
    return [...declared, ...fromBook];
  })();

  const pilotRanges = rangesFromCodes(
    pilots.flatMap((p) => [...((p.ticketCodes ?? []) as string[]), ...((p.ppgCodes ?? []) as string[])]),
  );

  return {
    guestCount: sum(dispatchers, (d) => d.guestCount),
    ticketsIssued: sum(dispatchers, (d) => d.ticketsIssued),
    ticketsReturned: sum(dispatchers, (d) => d.ticketsReturned),
    // Số đã lưu của điều phối: điểm vé đếm theo mã, Hà Nội đếm theo đầu khách
    /** Điều phối khai + nhóm huỷ trên sổ booking mà điều phối chưa khai. */
    cancelledCount:
      sum(dispatchers, (d) => d.cancelledCount) +
      bookingCancelEntries.reduce((t, e) => t + (spot === "ha-noi" ? e.guests : (e.note.match(/thu hồi ([^·]+)/)?.[1] ?? "").trim().split(/\s+/).filter(Boolean).length), 0),
    /**
     * HUỶ KHÔNG CẦN HOÀN: khách huỷ mà chưa trả đồng nào — đếm theo ĐẦU KHÁCH
     * (nhóm này thường chưa xuất vé nên không dính phép đếm vé thu hồi).
     * Gom cả hai nguồn: điều phối khai nhóm huỷ với tiền hoàn 0, và booking
     * huỷ trên sổ (đã lọc trùng) không ghi tiền hoàn.
     */
    /**
     * HUỶ CẦN HOÀN: khách huỷ ĐÃ trả tiền — đếm theo ĐẦU KHÁCH, cùng cách gom
     * với `cancelledNoRefundCount` ngay dưới, chỉ khác điều kiện tiền hoàn.
     * Hai số cộng lại đúng bằng tổng khách huỷ trong ngày.
     *
     * Nhóm huỷ MỘT PHẦN (`partialCancelEntries`) không có ở đây: tách bớt vài
     * khách khỏi đoàn thì phần bị bớt chưa trả tiền riêng, nên nó nằm trọn ở
     * vế "không cần hoàn".
     */
    cancelledRefundCount:
      dispatchers
        .flatMap((d) => (d.cancelledGuestEntries ?? []) as any[])
        .filter((e) => e.refund > 0)
        .reduce((t, e) => t + (e.guests || 0), 0) +
      bookingCancelEntries.filter((e) => e.refund > 0).reduce((t, e) => t + (e.guests || 0), 0),
    cancelledNoRefundCount:
      dispatchers
        .flatMap((d) => (d.cancelledGuestEntries ?? []) as any[])
        .filter((e) => !(e.refund > 0))
        .reduce((t, e) => t + (e.guests || 0), 0) +
      bookingCancelEntries.filter((e) => !(e.refund > 0)).reduce((t, e) => t + (e.guests || 0), 0) +
      partialCancelEntries.reduce((t, e) => t + (e.guests || 0), 0),
    rescheduledCount: sum(dispatchers, (d) => d.rescheduledCount),
    rescheduledGuestCount: mergedRescheduleEntries.reduce((t, e) => t + (e.guests || 0), 0),
    rescheduledTicketGuests: mergedRescheduleEntries.reduce(
      (t, e) => t + ((e as { ticketIssued?: boolean }).ticketIssued ? e.guests || 0 : 0),
      0,
    ),
    // Quầy chưa nhập dải thì tự dựng từ mã phi công báo — kế toán khỏi dò tay
    issuedRanges: (() => {
      const fromDispatcher = dispatchers.flatMap((d) =>
        (d.issuedRanges ?? []).map((r: any) => ({ from: r.from || "", to: r.to || "" })),
      );
      return fromDispatcher.length ? fromDispatcher : pilotRanges;
    })(),
    pilotRanges,
    cancelledCodesText: cancelledCodes.join(", "),
    rescheduled,
    /**
     * Tiền của ngày = số điều phối gõ trong báo cáo (luồng cũ) + LỆNH THU trên
     * booking (luồng mới, từ 13/08 là đường chính). Thiếu vế sau là cả kỳ báo
     * doanh thu 0đ dù lệnh thu ghi hàng trăm triệu — chính là lỗi chủ đã bắt.
     * (Hiện quầy không còn gõ tay nên không cộng trùng; nếu mai kia có người
     * gõ cả hai nơi, bộ soát reconcile sẽ báo lệch cho kế toán thấy.)
     */
    cashTotal: sum(dispatchers, (d) => d.cashReceived) + collectCashOfDay,
    transferTotal: sum(dispatchers, (d) => d.transferReceived) + collectTransferOfDay,
    agencyHeld,
    agencyHeldTotal: agencyHeld.reduce((t, a) => t + a.amount, 0),
    overpaidBookings,
    dispatcherSpend: sum(dispatchers, (d) => dispatcherExpenseTotal(d)),
    insurance: insuranceTally(insuranceBookings),
    registeredGuests: sum(bookings, (b) => b.guestCount),
    /**
     * Khách ĐÃ BAY THẬT: chỉ tính nhóm quầy đã tích "đã bay" — khách huỷ và
     * khách dời sang ngày khác tự khắc không nằm trong đây, nên con số này
     * chính là "đăng ký − huỷ − dời" mà kế toán cần.
     */
    flownGuests: sum(
      bookings.filter((b) => b.status === "done"),
      (b) => b.guestCount,
    ),
    /** Xem chú thích ở kiểu dữ liệu: chuyến PPG phi công khai mà sổ booking không có. */
    pilotExtraPpg: (() => {
      const bookingPpg = sum(
        bookings.filter((b) => b.status === "done"),
        (b) => (b.flightKind === "ppg" ? b.guestCount || 0 : b.ppgGuests || 0),
      );
      return Math.max(0, sum(pilots, (p) => p.ppgFlights ?? 0) - bookingPpg);
    })(),
    cancelledGuestEntries: [
      ...dispatchers.flatMap((d) => (d.cancelledGuestEntries ?? []) as CloseSuggestionDTO["cancelledGuestEntries"]),
      ...bookingCancelEntries,
      ...partialCancelEntries,
    ],
    rescheduledGuestEntries: mergedRescheduleEntries,
    dispatcherLedger: dispatchers.flatMap((d) => {
      /** Nhiều điều phối cùng ngày thì mỗi dòng ghi rõ của ai. */
      const tag = dispatchers.length > 1 ? `${d.staffName}: ` : "";
      const rows: CloseSuggestionDTO["dispatcherLedger"] = [];
      // THU — ưu tiên từng dòng chi tiết; không có thì gom theo hai ô tổng
      const entries = (d.revenueEntries ?? []) as Array<{ content?: string; amount?: number; method?: string }>;
      if (entries.length) {
        for (const e of entries) {
          if (!(e.amount || 0) && !e.content) continue;
          rows.push({
            content: `${tag}${e.content || "Tiền thu"}`,
            amount: e.amount || 0,
            kind: "thu",
            method: e.method === "transfer" ? "transfer" : "cash",
          });
        }
      } else {
        if (d.cashReceived > 0) rows.push({ content: `${tag}Tiền mặt thu trong ngày`, amount: d.cashReceived, kind: "thu", method: "cash" });
        if (d.transferReceived > 0) rows.push({ content: `${tag}Khách chuyển khoản`, amount: d.transferReceived, kind: "thu", method: "transfer" });
      }
      // CHI hộ khách — ba khoản có tên + các khoản tự thêm (mặc định tiền mặt)
      if (d.guestWaterCost > 0) rows.push({ content: `${tag}Nước cho khách`, amount: d.guestWaterCost, kind: "chi", method: "cash" });
      if (d.mountainCarCost > 0) rows.push({ content: `${tag}Xe lên núi`, amount: d.mountainCarCost, kind: "chi", method: "cash" });
      if (d.shuttleCarCost > 0) rows.push({ content: `${tag}Xe đưa đón khách`, amount: d.shuttleCarCost, kind: "chi", method: "cash" });
      for (const e of (d.expenses ?? []) as ExpenseDTO[]) {
        if (!e.content && !(e.amount || 0)) continue;
        rows.push({ content: `${tag}${e.content}`, amount: e.amount || 0, kind: e.kind === "thu" ? "thu" : "chi", method: e.method === "transfer" ? "transfer" : "cash" });
      }
      return rows;
    }).concat(
      /**
       * TIỀN HOÀN cho khách huỷ ghi trên sổ booking — cũng là tiền RA của ngày.
       * Không đưa vào đây thì sổ "Tiền trong ngày" của kế toán thiếu đúng khoản
       * chi to nhất hôm đó (vé MBL0356 hoàn 2.990.000 đ CK bị bỏ sót).
       */
      bookingCancelEntries
        .filter((e) => e.refund > 0)
        .map((e) => ({
          content: `Hoàn tiền khách huỷ — ${e.name}${e.bookingCode ? ` (${e.bookingCode})` : ""}`,
          amount: e.refund,
          kind: "chi" as const,
          method: /hoàn TM/.test(e.note) ? ("cash" as const) : ("transfer" as const),
        })),
    ),
    /**
     * DỊCH VỤ ĐẾM THEO SỔ BOOKING — không theo báo cáo nhân viên nữa.
     *
     * Mọi lệnh thêm/bớt dịch vụ tại bãi (và cả lệnh bị BỎ) đều ghi thẳng vào
     * booking, còn báo cáo nhân viên thì khai một lần đầu ngày rồi đứng yên.
     * Lấy theo báo cáo là kế toán chốt bằng con số đã cũ, tiền không khớp
     * dịch vụ. Số của phi công/quầy/camera vẫn trả về ở các khối bên dưới để
     * đối chiếu, nhưng con số ĐI VÀO SỔ là số của booking.
     */
    flycam: bookingServices.flycam,
    video360: bookingServices.video360,
    redFlag: bookingServices.redFlag,
    sunset: bookingServices.sunset,
    flagFlight: bookingServices.flagFlight,
    reportedBy,
    moneyByPerson,
    /** Số dịch vụ theo sổ booking — để giao diện nói rõ nguồn và so với nhân viên. */
    booking: { ...bookingServices, hasData: bookings.length > 0 },
    pilot: {
      flights: sum(pilots, (p) => p.flightCount),
      ppg: sum(pilots, (p) => p.ppgFlights ?? 0),
      ppgNoTicket: sum(pilots, (p) => p.ppgNoTicket ?? 0),
      flycam: sum(pilots, (p) => p.flycam),
      video360: sum(pilots, (p) => p.video360),
      redFlag: sum(pilots, (p) => p.redFlag),
      sunset: sum(pilots, (p) => p.sunset),
      flagFlight: sum(pilots, (p) => p.flagFlight),
      hasData: pilots.length > 0,
    },
    dispatcher: {
      flycam: sum(dispatchers, (d) => d.flycam),
      video360: sum(dispatchers, (d) => d.video360),
      redFlag: sum(dispatchers, (d) => d.redFlag),
      sunset: sum(dispatchers, (d) => d.sunset),
      flagFlight: sum(dispatchers, (d) => d.flagFlight),
      hasData: dispatchers.length > 0,
    },
    dispatcherNames: dispatchers.map((d) => d.staffName),
    hasData: dispatchers.length + pilots.length + cameramen.length > 0,
  };
}

/* ================================================================== */
/* Chốt ngày của kế toán                                               */
/* ================================================================== */

export type DailyCloseSaveInput = {
  /** Sổ "Tiền trong ngày" của kế toán: nội dung – số tiền – tiền mặt/CK – thu/chi. */
  ledger?: Array<{ content: string; amount: number; kind?: "thu" | "chi"; method?: "cash" | "transfer"; note?: string }>;
  /** Dấu duyệt/từ chối từng khoản nhân viên khai — khoá theo expenseLines.key. */
  expenseReviews?: Array<{ key: string; status: "ok" | "no"; reason?: string }>;
  /** Điểm bay của báo cáo — mỗi điểm là một hệ thống riêng. */
  spot: string;
  date: string;
  /** Khách bay KHÔNG VÉ (theo sổ booking) — vẫn tính là chuyến bay. */
  noTicketGuests?: number;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  cancelledRefundCount?: number;
  cancelledNoRefundCount?: number;
  rescheduledCount: number;
  issuedRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  cancelledNote: string;
  rescheduled: Array<{ code: string; toDate: string; note?: string }>;
  registeredGuests?: number;
  cancelledGuestEntries?: Array<{ name: string; bookingCode: string; guests: number; source: string; refund: number; note?: string; codesText?: string }>;
  rescheduledGuestEntries?: Array<{ name: string; guests: number; toDate: string; note: string; phone?: string; pickup?: "self" | "other"; pickupNote?: string; expectedTime?: string; bookedId?: string }>;
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  expensesApproved: boolean;
  expensesApprovedNote: string;
  varianceApproved: boolean;
  varianceNote: string;
  note: string;
};

export async function upsertDailyClose(
  session: BaobaySession,
  input: DailyCloseSaveInput,
): Promise<SaveResult<DailyCloseDTO>> {
  await connectDB();
  const spot = assertSpotAllowed(session, input.spot);
  await assertDayOpen(spot, input.date);

  const warnings: string[] = [];

  const { ranges, warnings: rangeWarnings } = normalizeRanges(input.issuedRanges);
  warnings.push(...rangeWarnings);

  const cancelled = parseTicketCodeList(input.cancelledCodesText);
  if (cancelled.invalid.length) {
    warnings.push(`Mã vé huỷ bỏ qua ${cancelled.invalid.length} cụm không đọc được.`);
  }
  if (cancelled.malformed.length) {
    warnings.push(`Mã vé huỷ sai dạng: ${cancelled.malformed.slice(0, 5).join(", ")}. ${TICKET_CODE_HINT}`);
  }

  const { list: rescheduled, warnings: reWarnings } = normalizeRescheduled(input.rescheduled);
  warnings.push(...reWarnings);

  /** Sổ THU/CHI riêng của kế toán: nội dung – số tiền – tick thu/chi. */
  const { list: ledger, warnings: ledgerWarnings } = normalizeExpenses(input.ledger ?? []);
  warnings.push(...ledgerWarnings);

  /**
   * KHÁCH NHIỀU HƠN VÉ thì phần chênh phải là khách BAY KHÔNG VÉ — không thì
   * hoặc quên xuất vé, hoặc quên tích "bay không vé" trên booking. 30 khách mà
   * xuất 26 vé thì phải có đúng 4 chuyến không vé; lệch là kêu.
   */
  if (spot !== "ha-noi") {
    const gap = Math.max(0, (input.guestCount || 0) - (input.ticketsIssued || 0));
    const declared = Math.max(0, Math.round(input.noTicketGuests ?? 0));
    const bookingNoTicket = (
      await BaobayBooking.find({ spot, flightDate: input.date, status: "done", noTicketFlight: true })
        .select("guestCount")
        .lean<any[]>()
    ).reduce((t, b) => t + (b.guestCount || 0), 0);
    if (gap !== declared) {
      warnings.push(
        `⚠ Khách đã bay (${input.guestCount}) trừ vé xuất (${input.ticketsIssued}) = ${gap}, nhưng ô "khách bay KHÔNG VÉ" đang là ${declared}. Sổ booking có ${bookingNoTicket} khách tích không vé — kiểm lại.`,
      );
    } else if (declared !== bookingNoTicket) {
      warnings.push(
        `⚠ Ô "khách bay KHÔNG VÉ" là ${declared} nhưng sổ booking chỉ có ${bookingNoTicket} khách được tích "bay không vé" — nhắc quầy tích cho đủ.`,
      );
    }
  }

  const doc = await AccountantDailyClose.findOneAndUpdate(
    { spot, date: input.date },
    {
      $set: {
        accountantId: new mongoose.Types.ObjectId(session.id),
        accountantName: session.name,
        spot,
        guestCount: input.guestCount,
        noTicketGuests: Math.max(0, Math.round(input.noTicketGuests ?? 0)),
        // Hà Nội không xuất vé giấy — trường vé ép 0/rỗng, thay bằng khách đăng ký + nhóm khách huỷ/dời
        ticketsIssued: spot === "ha-noi" ? 0 : input.ticketsIssued,
        ticketsReturned: spot === "ha-noi" ? 0 : input.ticketsReturned,
        cancelledCount: input.cancelledCount,
        cancelledRefundCount: Math.max(0, Math.round(input.cancelledRefundCount ?? 0)),
        cancelledNoRefundCount: Math.max(0, Math.round(input.cancelledNoRefundCount ?? 0)),
        rescheduledCount: input.rescheduledCount,
        issuedRanges: spot === "ha-noi" ? [] : ranges,
        cancelledCodes: spot === "ha-noi" ? [] : cancelled.codes,
        cancelledNote: input.cancelledNote ?? "",
        registeredGuests: spot === "ha-noi" ? (input.registeredGuests ?? 0) : 0,
        cancelledGuestEntries:
          spot === "ha-noi"
            ? (input.cancelledGuestEntries ?? []).filter((e) => e.name.trim() || e.guests || e.bookingCode.trim())
            : [],
        rescheduledGuestEntries:
          spot === "ha-noi"
            ? (input.rescheduledGuestEntries ?? []).filter((e) => e.name.trim() || e.guests || e.toDate)
            : [],
        rescheduled,
        cashTotal: input.cashTotal,
        transferTotal: input.transferTotal,
        flycam: input.flycam,
        video360: input.video360,
        redFlag: input.redFlag,
        sunset: input.sunset,
        flagFlight: input.flagFlight,
        ledger,
        expenseReviews: (input.expenseReviews ?? []).filter((r) => r.key && (r.status === "ok" || r.status === "no")),
        expensesApproved: input.expensesApproved,
        expensesApprovedNote: input.expensesApprovedNote,
        varianceApproved: input.varianceApproved,
        varianceNote: input.varianceNote,
        note: input.note,
        status: "draft",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<any>();

  pushSheetInBackground(() => pushCloseRow(doc), AccountantDailyClose, doc._id);
  // Kế toán vừa đổi số của ngày -> dòng tổng hợp theo kịp, cũng chạy nền
  runInBackground(() => pushDaySummaryRow(spot, input.date));

  return { report: toCloseDTO({ ...doc, sheetSynced: false, sheetError: "đang gửi sang bảng tính…" }), warnings };
}

/**
 * Đẩy bản chốt ngày sang tab "Chốt ngày" của bảng tính.
 *
 * Số chốt là con số cuối cùng dùng để trả tiền — phải có bản sao ngoài cơ sở dữ
 * liệu. Gọi cả lúc lưu nháp lẫn lúc chốt/gỡ khoá để trạng thái trên bảng luôn
 * đúng với thực tế.
 */
async function pushCloseRow(doc: any) {
  return pushBaobayRow("close", {
    key: doc.date,
    date: formatDateKeyVN(doc.date),
    spot: doc.spot || "",
    accountantName: doc.accountantName || "",
    guestCount: doc.guestCount ?? 0,
    ticketsIssued: doc.ticketsIssued ?? 0,
    ticketsReturned: doc.ticketsReturned ?? 0,
    cancelledCount: doc.cancelledCount ?? 0,
    cancelledRefundCount: doc.cancelledRefundCount ?? 0,
    cancelledNoRefundCount: doc.cancelledNoRefundCount ?? 0,
    cancelledCodes:
      (doc.cancelledCodes || []).join(", ") ||
      (doc.cancelledGuestEntries || [])
        .map(
          (e: any) =>
            `${e.name || "khách"}${e.bookingCode ? ` (${e.bookingCode})` : ""} ×${e.guests}${e.source ? ` — ${e.source}` : ""}${e.refund ? ` — hoàn ${(e.refund || 0).toLocaleString("vi-VN")}đ` : ""}`,
        )
        .join(" | "),
    cancelledNote: doc.cancelledNote || "",
    registeredGuests: doc.registeredGuests ?? 0,
    rescheduledCount: doc.rescheduledCount ?? 0,
    rescheduledCodes:
      formatRescheduled(doc.rescheduled) ||
      (doc.rescheduledGuestEntries || [])
        .map((e: any) => `${e.name || "khách"} ×${e.guests} → ${e.toDate ? formatDateKeyVN(e.toDate) : "?"}${e.note ? ` — ${e.note}` : ""}`)
        .join(" | "),
    issuedRanges: formatRanges(doc.issuedRanges),
    cashTotal: doc.cashTotal ?? 0,
    transferTotal: doc.transferTotal ?? 0,
    revenueTotal: (doc.cashTotal ?? 0) + (doc.transferTotal ?? 0),
    flycam: doc.flycam ?? 0,
    video360: doc.video360 ?? 0,
    redFlag: doc.redFlag ?? 0,
    sunset: doc.sunset ?? 0,
    flagFlight: doc.flagFlight ?? 0,
    ledgerDetail: formatExpenses(doc.ledger ?? []),
    expensesApproved: doc.expensesApproved ? "x" : "",
    varianceApproved: doc.varianceApproved ? "x" : "",
    status: doc.status === "closed" ? "ĐÃ CHỐT" : "chưa chốt",
    closedAt: doc.closedAt ? new Date(doc.closedAt).toLocaleString("vi-VN") : "",
    closedBy: doc.closedBy || "",
    note: doc.note || "",
    updatedAt: nowStampVN(),
  },
  undefined,
  await sheetTargetForSpot(doc.spot),
  );
}

/**
 * Nhân sự ĐANG LÀM VIỆC của một điểm bay theo vai trò — cho kế toán chọn thêm
 * người CHƯA báo cáo vào danh sách ngày rồi nhập hộ (người ốm, người quên app).
 */
export async function listSpotStaffByRole(
  spotRaw: string,
  role: BaobayRole | readonly BaobayRole[],
): Promise<Array<{ username: string; name: string }>> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const roleQuery = Array.isArray(role) ? { $in: [...role] } : role;
  const docs = await BaobayAccount.find({ role: roleQuery, isActive: true, spots: spot })
    .select("username displayName")
    .sort({ displayName: 1 })
    .lean<any[]>();
  return docs.map((d) => ({ username: d.username, name: d.displayName }));
}

/**
 * MỌI nhân sự đang làm việc tại điểm — đủ mọi vai trò. Dùng cho "nhân sự tiếp
 * nhận" khi điều phối chuyển booking: phi công, camera man, kế toán… ai cũng
 * nhận lịch được, không như giao tiền (chỉ người giữ quỹ).
 */
export async function listSpotStaffAll(
  spotRaw: string,
): Promise<Array<{ username: string; name: string; role: BaobayRole; roleLabel: string }>> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const docs = await BaobayAccount.find({ isActive: true, spots: spot })
    .select("username displayName role")
    .sort({ role: 1, displayName: 1 })
    .lean<any[]>();
  return docs.map((d) => ({
    username: d.username,
    name: d.displayName,
    role: d.role as BaobayRole,
    roleLabel: ROLE_LABEL[d.role as BaobayRole] ?? d.role,
  }));
}

/* ================================================================== */
/* Huỷ flycam vì lỗi vận hành                                          */
/* ================================================================== */

export type TicketLookup = {
  code: string;
  /** Ngày tìm thấy mã trong báo cáo phi công (nếu có). */
  date?: string;
  pilotUsername?: string;
  pilotName?: string;
  /** Mã nằm trong dải vé điều phối đã xuất ngày nào. */
  issuedOn?: string;
  /** Booking khả dĩ của ngày đó có đăng ký dịch vụ gia tăng — người dùng chọn tay. */
  candidates: Array<{
    id: string;
    label: string;
    daySeq: number;
    flycam: number;
    video360: number;
    redFlag: number;
    sunset: number;
    flagFlight: number;
    guestCount: number;
  }>;
};

/**
 * TRA MỘT MÃ VÉ xem thuộc chuyến nào.
 *
 * Vì sao phải dò nhiều nguồn: mã vé KHÔNG được ghi vào booking lúc đặt (khách
 * đặt trước cả tuần, vé chỉ xé lúc khách tới quầy), nên không có đường nối
 * thẳng mã ↔ booking. Ba manh mối lần ngược lại được:
 *   1. Báo cáo phi công: ai khai đã bay mã này ⇒ ra NGÀY BAY và PHI CÔNG.
 *   2. Dải mã điều phối xuất trong ngày ⇒ xác nhận mã có thật, thuộc ngày nào.
 *   3. Booking của ngày đó CÓ ĐĂNG KÝ FLYCAM ⇒ danh sách ngắn để người dùng
 *      chọn đúng đoàn (thường chỉ vài dòng, nhìn tên khách là biết).
 *
 * Trả về manh mối chứ không đoán bừa: gán nhầm đoàn còn tệ hơn để trống.
 */
export async function lookupTicketCode(spotRaw: string, codeRaw: string): Promise<TicketLookup> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const code = String(codeRaw ?? "").trim().toUpperCase();
  const out: TicketLookup = { code, candidates: [] };
  if (!code) return out;

  /** Phi công khai mã này ở ô mã đã bay, mã flycam, mã 360 hay mã PPG đều tính. */
  const pilot = await PilotDailyReport.findOne({
    spot,
    $or: [
      { ticketCodes: code },
      { flycamCodes: code },
      { video360Codes: code },
      { ppgCodes: code },
    ],
  })
    .sort({ date: -1 })
    .select("date username pilotName")
    .lean<any>();
  if (pilot) {
    out.date = pilot.date;
    out.pilotUsername = pilot.username;
    out.pilotName = pilot.pilotName;
  }

  if (!out.date) {
    /** Chưa ai khai bay: dò trong dải mã điều phối đã xuất 60 ngày gần đây. */
    const from = shiftDateKey(todayInVN(), -60);
    const rows = await DispatcherDailyReport.find({ spot, date: { $gte: from } })
      .select("date issuedRanges")
      .lean<any[]>();
    const num = Number(code.replace(/\D/g, ""));
    for (const r of rows) {
      const hit = (r.issuedRanges ?? []).some((g: any) => {
        const a = Number(String(g.from ?? "").replace(/\D/g, ""));
        const b = Number(String(g.to ?? "").replace(/\D/g, ""));
        return a && b && num >= Math.min(a, b) && num <= Math.max(a, b);
      });
      if (hit) {
        out.issuedOn = r.date;
        break;
      }
    }
  }

  const day = out.date || out.issuedOn;
  if (day) {
    /**
     * Lấy các đoàn CÓ ĐĂNG KÝ ÍT NHẤT MỘT dịch vụ gia tăng — thẻ huỷ dịch vụ
     * chọn loại nào thì lọc tiếp phía giao diện theo số của loại đó.
     */
    const bookings = await BaobayBooking.find({
      spot,
      flightDate: day,
      $or: [
        { flycam: { $gt: 0 } },
        { video360: { $gt: 0 } },
        { redFlag: { $gt: 0 } },
        { sunset: { $gt: 0 } },
        { flagFlight: { $gt: 0 } },
      ],
    })
      .select("contactName bookingCode daySeq flycam video360 redFlag sunset flagFlight guestCount status")
      .sort({ daySeq: 1 })
      .lean<any[]>();
    out.candidates = bookings.map((b) => ({
      id: String(b._id),
      label: `${b.contactName || b.bookingCode || "khách"}${b.status === "cancelled" ? " (đã huỷ)" : ""}`,
      daySeq: Number(b.daySeq) || 0,
      flycam: b.flycam || 0,
      video360: b.video360 || 0,
      redFlag: b.redFlag || 0,
      sunset: b.sunset || 0,
      flagFlight: b.flagFlight || 0,
      guestCount: b.guestCount || 0,
    }));
  }
  return out;
}

export type FlycamCancelDTO = {
  id: string;
  service: string;
  date: string;
  ticketCode: string;
  pilotName: string;
  reason: string;
  refundMode: "self" | "company";
  amount: number;
  bankAccount?: string;
  status: "done" | "pending" | "paid" | "voided";
  bookingLabel?: string;
  createdByName: string;
  transferCode?: string;
  paidBy?: string;
  createdAt: string;
};

function toFlycamCancelDTO(d: any): FlycamCancelDTO {
  return {
    id: String(d._id),
    service: d.service || "flycam",
    date: d.date,
    ticketCode: d.ticketCode || "",
    pilotName: d.pilotName || "",
    reason: d.reason || "",
    refundMode: d.refundMode === "self" ? "self" : "company",
    amount: Number(d.amount) || 0,
    bankAccount: d.bankAccount || undefined,
    status: d.status,
    bookingLabel: d.bookingLabel || undefined,
    createdByName: d.createdByName || "",
    transferCode: d.transferCode || undefined,
    paidBy: d.paidBy || undefined,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : "",
  };
}

/** Đẩy một lệnh huỷ flycam sang bảng tính — tab "Huỷ flycam". */
async function pushFlycamCancelRow(doc: any) {
  return pushBaobayRow(
    "flycamcancel",
    {
      key: String(doc._id),
      date: formatDateKeyVN(doc.date),
      spot: doc.spot || "",
      ticketCode: doc.ticketCode || "",
      booking: doc.bookingLabel || "",
      pilotName: doc.pilotName || "",
      reason: doc.reason || "",
      refundMode: doc.refundMode === "self" ? "Tự hoàn tại bãi" : "Công ty chuyển khoản",
      amount: doc.amount ?? 0,
      bankAccount: doc.bankAccount || "",
      status: doc.status === "done" ? "ĐÃ HOÀN TẠI BÃI" : doc.status === "paid" ? "CÔNG TY ĐÃ CHUYỂN" : "CHỜ KẾ TOÁN",
      transferCode: doc.transferCode || "",
      paidBy: doc.paidBy || "",
      createdBy: doc.createdByName || "",
      updatedAt: nowStampVN(),
    },
    doc.spot,
  );
}

export async function createFlycamCancel(
  session: BaobaySession,
  spotRaw: string,
  input: {
    date: string;
    ticketCode: string;
    pilotUsername: string;
    reason: string;
    refundMode: "self" | "company";
    amount: number;
    bankAccount?: string;
    bookingId?: string;
    /** Dịch vụ bị huỷ — thiếu thì là flycam như thời chỉ có flycam. */
    service?: string;
  },
): Promise<FlycamCancelDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  if (!isDateKey(input.date)) throw new BaobayError("Ngày không hợp lệ", 400);
  const amount = Math.max(0, Math.round(input.amount || 0));
  if (amount <= 0) throw new BaobayError("Chưa nhập số tiền hoàn khách", 400);
  if (!input.reason.trim()) throw new BaobayError("Ghi giúp lý do huỷ flycam", 400);

  const pilot = input.pilotUsername
    ? await BaobayAccount.findOne({ username: normalizeUsername(input.pilotUsername) })
        .select("username displayName")
        .lean<any>()
    : null;
  if (!pilot) throw new BaobayError("Chọn phi công bay kèm chuyến này", 400);
  if (input.refundMode === "company" && !(input.bankAccount ?? "").trim()) {
    throw new BaobayError("Công ty hoàn thì phải có số tài khoản của khách", 400);
  }

  let bookingLabel = "";
  if (input.bookingId && mongoose.Types.ObjectId.isValid(input.bookingId)) {
    const b = await BaobayBooking.findById(input.bookingId).select("contactName bookingCode daySeq").lean<any>();
    if (b) bookingLabel = `${b.daySeq ? `#${b.daySeq} ` : ""}${b.contactName || b.bookingCode || ""}`.trim();
  }

  const doc = (
    await BaobayFlycamCancel.create({
      spot,
      service: ["flycam", "video360", "redFlag", "sunset", "flagFlight"].includes(String(input.service))
        ? input.service
        : "flycam",
      date: input.date,
      ticketCode: String(input.ticketCode ?? "").trim().toUpperCase(),
      pilotUsername: pilot.username,
      pilotName: pilot.displayName,
      bookingId: bookingLabel ? input.bookingId : undefined,
      bookingLabel,
      reason: input.reason.trim(),
      refundMode: input.refundMode,
      amount,
      bankAccount: (input.bankAccount ?? "").trim(),
      /** Tự hoàn là xong ngay tại bãi; nhờ công ty thì còn phải chờ kế toán chuyển. */
      status: input.refundMode === "self" ? "done" : "pending",
      createdByUsername: session.username,
      createdByName: session.name,
    })
  ).toObject();
  pushSheetInBackground(() => pushFlycamCancelRow(doc), BaobayFlycamCancel, doc._id);
  return toFlycamCancelDTO(doc);
}

/** Kế toán bấm "đã chuyển" cho lệnh hoàn — ghi mã giao dịch để đối soát. */
export async function payFlycamRefund(
  session: BaobaySession,
  spotRaw: string,
  id: string,
  transferCode: string,
): Promise<FlycamCancelDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);
  const code = String(transferCode ?? "").trim();
  if (!code) throw new BaobayError("Ghi mã giao dịch đã chuyển cho khách", 400);
  const doc = await BaobayFlycamCancel.findOneAndUpdate(
    { _id: id, spot, status: "pending" },
    { $set: { status: "paid", paidAt: new Date(), paidBy: session.name || session.username, transferCode: code } },
    { new: true },
  ).lean<any>();
  if (!doc) throw new BaobayError("Không tìm thấy lệnh hoàn đang chờ", 404);
  pushSheetInBackground(() => pushFlycamCancelRow(doc), BaobayFlycamCancel, doc._id);
  return toFlycamCancelDTO(doc);
}

export async function listFlycamCancels(spotRaw: string, date: string): Promise<FlycamCancelDTO[]> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  /** Ngày đang xem + mọi lệnh CÒN CHỜ của các ngày trước — chờ mãi không ai thấy là mất tiền của khách. */
  const docs = await BaobayFlycamCancel.find({ spot, $or: [{ date }, { status: "pending" }] })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<any[]>();
  return docs.map(toFlycamCancelDTO);
}

/**
 * ĐẾM BOOKING ĐÃ BỎ theo từng người trong khoảng ngày.
 *
 * Đây là lớp chống lạm dụng thật sự: không cấm ai bỏ booking, nhưng ai bỏ nhiều
 * bất thường thì con số tự nói. Một người bỏ 1-2 cái/tháng là bình thường; bỏ
 * mười mấy cái thì có chuyện phải hỏi.
 */
export async function voidStats(
  spotRaw: string,
  from: string,
  to: string,
): Promise<Array<{ name: string; mistake: number; duplicate: number; total: number; guests: number }>> {
  await connectDB();
  const spot = normalizeSpot(spotRaw);
  const rows = await BaobayBooking.find({ spot, status: "voided", flightDate: { $gte: from, $lte: to } })
    .select("voidedBy voidKind guestCount")
    .lean<any[]>();

  const by = new Map<string, { name: string; mistake: number; duplicate: number; total: number; guests: number }>();
  for (const r of rows) {
    const name = r.voidedBy || "(không rõ)";
    const p = by.get(name) ?? { name, mistake: 0, duplicate: 0, total: 0, guests: 0 };
    if (r.voidKind === "duplicate") p.duplicate += 1;
    else p.mistake += 1;
    p.total += 1;
    p.guests += r.guestCount || 0;
    by.set(name, p);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

export async function getDailyClose(spot: string, date: string): Promise<DailyCloseDTO | null> {
  await connectDB();
  const doc = await AccountantDailyClose.findOne({ spot: normalizeSpot(spot), date }).lean<any>();
  return doc ? toCloseDTO(doc) : null;
}

/**
 * Đẩy lại MỌI dòng của một ngày sang bảng tính.
 *
 * Gọi sau khi CHỐT và sau khi GỠ KHOÁ: cột trạng thái trên bảng phải lật theo
 * ngay, nếu không kế toán mở bảng ra vẫn thấy "chưa chốt" ở ngày đã khoá. Ghi
 * đè đúng dòng cũ (khoá là ngày|tài khoản) nên không sinh dòng trùng.
 */
/**
 * Một dòng TỔNG HỢP cho cả ngày, đẩy sang tab "Tổng hợp ngày".
 *
 * Kế toán cần một bảng dàn ngang theo ngày để lấy số nhanh, không phải mở từng
 * thẻ phi công rồi cộng tay. Dòng này gộp mọi phía: số kế toán chốt, số nhân
 * viên báo, tiền, dịch vụ, chi tiêu, tiền ứng, phạt — và cột "Chốt/Treo" để
 * biết số đã dùng được chưa.
 *
 * Ghi đè theo khoá = ngày, nên gọi lại bao nhiêu lần cũng chỉ một dòng.
 */
async function pushDaySummaryRow(spot: string, date: string): Promise<{ ok: boolean; error?: string }> {
  const filter = { spot, date };
  const [close, pilots, dispatchers, cameramen, money] = await Promise.all([
    AccountantDailyClose.findOne(filter).lean<any>(),
    PilotDailyReport.find(filter).lean<any[]>(),
    DispatcherDailyReport.find(filter).lean<any[]>(),
    CameramanDailyReport.find(filter).lean<any[]>(),
    BaobayHandover.find(filter).lean<any[]>(),
  ]);

  const sum = <T>(list: T[], pick: (x: T) => number) => list.reduce((a, x) => a + (pick(x) || 0), 0);
  const flownCodes = new Set<string>();
  for (const p of pilots) for (const c of p.ticketCodes ?? []) flownCodes.add(c);

  const reconcile = await getReconcile(spot, date);
  const reds = reconcile.issues.filter((i) => i.severity === "red").length;

  const advances = money.filter((m) => m.kind === "advance" && m.confirmed);
  const handovers = money.filter((m) => m.kind !== "advance");

  return pushBaobayRow(
    "daysummary",
    {
      key: date,
      date: formatDateKeyVN(date),
      spot: spotName(spot),
      status: close?.status === "closed" ? "ĐÃ CHỐT" : reds ? `TREO (${reds} lỗi)` : "chưa chốt",
      issues: reds,

      guestCount: close?.guestCount ?? sum(dispatchers, (d) => d.guestCount),
      ticketsIssued: close?.ticketsIssued ?? sum(dispatchers, (d) => d.ticketsIssued),
      ticketsReturned: close?.ticketsReturned ?? sum(dispatchers, (d) => d.ticketsReturned),
      cancelledCount: close?.cancelledCount ?? 0,
      rescheduledCount: close?.rescheduledCount ?? 0,

      pilotFlights: sum(pilots, (p) => p.flightCount),
      flownCodes: flownCodes.size,
      pilotCount: pilots.length,
      pilotSubmitted: pilots.filter((p) => p.submitted).length,

      cashTotal: close?.cashTotal ?? sum(dispatchers, (d) => d.cashReceived),
      transferTotal: close?.transferTotal ?? sum(dispatchers, (d) => d.transferReceived),
      revenueTotal:
        (close?.cashTotal ?? sum(dispatchers, (d) => d.cashReceived)) +
        (close?.transferTotal ?? sum(dispatchers, (d) => d.transferReceived)),

      flycamDispatcher: sum(dispatchers, (d) => d.flycam),
      flycamCameraman: sum(cameramen, (c) => c.flycamFlights),
      video360Dispatcher: sum(dispatchers, (d) => d.video360),
      video360Pilot: sum(pilots, (p) => p.video360),
      redFlag: sum(dispatchers, (d) => d.redFlag),
      sunset: sum(dispatchers, (d) => d.sunset),
      flagFlight: sum(dispatchers, (d) => d.flagFlight),

      diplomaticTickets: sum(dispatchers, (d) => (d.diplomaticCodes?.length ?? 0) || (d.diplomaticGuests ?? 0)),
      diplomaticAmount: sum(dispatchers, (d) => d.diplomaticAmount),

      expenseTotal:
        sum(pilots, (p) => pilotExpenseTotal(p)) +
        sum(dispatchers, (d) => dispatcherExpenseTotal(d)) +
        sum(cameramen, (c) => expenseTotal(c.expenses)),
      thuTotal:
        sum(pilots, (p) => thuTotal(p.expenses)) + sum(cameramen, (c) => thuTotal(c.expenses)),
      latePenalty: sum(pilots, (p) => p.latePenalty),
      advanceTotal: sum(advances, (a) => a.amount),
      handoverConfirmed: sum(handovers.filter((h) => h.confirmed), (h) => h.amount),
      handoverPending: sum(handovers.filter((h) => !h.confirmed && !h.rejected), (h) => h.amount),

      accountantName: close?.accountantName || "",
      closedAt: close?.closedAt ? new Date(close.closedAt).toLocaleString("vi-VN") : "",
      updatedAt: nowStampVN(),
    },
    undefined,
    await sheetTargetForSpot(spot),
  );
}

async function pushDayToSheet(spot: string, date: string): Promise<void> {
  const filter = { spot, date };
  const [pilots, dispatchers, cameramen] = await Promise.all([
    PilotDailyReport.find(filter).lean<any[]>(),
    DispatcherDailyReport.find(filter).lean<any[]>(),
    CameramanDailyReport.find(filter).lean<any[]>(),
  ]);

  const jobs: Array<{ model: any; id: any; push: () => Promise<{ ok: boolean; error?: string }> }> = [
    ...pilots.map((d) => ({ model: PilotDailyReport, id: d._id, push: () => pushPilotRow(d) })),
    ...dispatchers.map((d) => ({ model: DispatcherDailyReport, id: d._id, push: () => pushDispatcherRow(d) })),
    ...cameramen.map((d) => ({ model: CameramanDailyReport, id: d._id, push: () => pushCameramanRow(d) })),
  ];

  for (const job of jobs) {
    const sync = await job.push();
    await job.model.updateOne(
      { _id: job.id },
      { $set: { sheetSynced: sync.ok, sheetError: sync.ok ? "" : sync.error || "" } },
    );
  }

  // Dòng tổng hợp đi cuối cùng: lúc này mọi dòng chi tiết của ngày đã sang bảng
  await pushDaySummaryRow(spot, date);
}

/**
 * Chốt ngày: chỉ được khi bộ đối chiếu sạch lỗi đỏ.
 * Chốt xong là khoá — mọi hàm ghi số liệu của ngày đó sẽ bị assertDayOpen chặn.
 */
export async function closeDay(
  session: BaobaySession,
  spotRaw: string,
  date: string,
): Promise<{ close: DailyCloseDTO; reconcile: ReconcileDTO }> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const existing = await AccountantDailyClose.findOne({ spot, date }).lean<any>();
  if (!existing) throw new BaobayError("Chưa nhập số chốt ngày thì chưa chốt được", 400);
  if (existing.status === "closed") throw new BaobayError(`Ngày ${date} đã chốt trước đó`, 409);

  const reconcile = await getReconcile(spot, date);
  if (!reconcile.canClose) {
    const reds = reconcile.issues.filter((i) => i.severity === "red");
    throw new BaobayError(`Còn ${reds.length} lỗi đỏ, chưa chốt được: ${reds[0]?.message ?? ""}`, 409);
  }

  const doc = await AccountantDailyClose.findOneAndUpdate(
    { spot, date, status: "draft" },
    { $set: { status: "closed", closedAt: new Date(), closedBy: session.username } },
    { new: true },
  ).lean<any>();

  if (!doc) throw new BaobayError("Ngày này vừa được người khác chốt", 409);

  /**
   * Chốt xong là đã biết chắc ai bay ai không: mọi khoản phạt "tạm tính" của
   * người KHÔNG báo cáo tự tan (không có bản ghi nào để mà phạt), còn báo cáo
   * nào có phạt mà số chuyến bằng 0 thì xoá tiền phạt tại đây — đúng quy tắc
   * "0 chuyến thì không phải báo cáo, không phạt".
   */
  await PilotDailyReport.updateMany(
    { spot, date, flightCount: 0, ppgFlights: { $not: { $gt: 0 } }, latePenalty: { $gt: 0 } },
    {
      $set: {
        latePenalty: 0,
        latePenaltyWaived: true,
        latePenaltyWaivedBy: session.username,
        latePenaltyWaivedAt: new Date(),
        latePenaltyWaiveReason: "0 chuyến — tự huỷ khi chốt ngày",
      },
    },
  );

  /**
   * Trạng thái "đã chốt" phải sang bảng tính ngay — cả dòng chốt ngày lẫn mọi
   * dòng nhân viên của ngày đó, để cột trạng thái trên bảng lật theo.
   */
  /** Chốt được nghĩa là đã soát xong — lệnh "soát lại" còn treo của ngày tự tan. */
  await BaobayReviewRequest.updateMany(
    { spot, date, resolvedAt: { $exists: false } },
    { $set: { resolvedAt: new Date(), resolvedBy: session.username } },
  );

  /**
   * Nặng nhất cả hệ: lật nhãn "ĐÃ CHỐT" cho MỌI dòng của ngày (15 phi công là
   * 15+ lượt gọi Apps Script, mỗi lượt vài giây). Chạy nền hết — kế toán thấy
   * "đã chốt" ngay, bảng tính lật nhãn dần trong một hai phút.
   */
  pushSheetInBackground(() => pushCloseRow(doc), AccountantDailyClose, doc._id);
  runInBackground(() => pushDayToSheet(spot, date));
  // Báo số chuyến (CHỈ số chuyến) của nhóm phi công Nha Trang cho đối tác chủ quản
  runInBackground(() => sendPartnerFlightMail(spot, date));

  return { close: toCloseDTO({ ...doc, sheetSynced: false }), reconcile };
}

/**
 * Gỡ khoá ngày đã chốt để nhân viên sửa số.
 *
 * Không xoá dấu vết: lần chốt trước được ghi vào ghi chú để sau này còn biết
 * ngày này từng chốt rồi bị mở lại, ai mở và vì sao.
 */
export async function reopenDay(
  session: BaobaySession,
  spotRaw: string,
  date: string,
  reason: string,
): Promise<DailyCloseDTO> {
  await connectDB();
  const spot = assertSpotAllowed(session, spotRaw);

  const existing = await AccountantDailyClose.findOne({ spot, date }).lean<any>();
  if (!existing) throw new BaobayError("Ngày này chưa có số chốt", 404);
  if (existing.status !== "closed") throw new BaobayError("Ngày này đang mở, không cần gỡ khoá", 400);

  const trail =
    `[${nowStampVN()}] ${session.name} gỡ khoá ngày đã chốt lúc ` +
    `${existing.closedAt ? new Date(existing.closedAt).toLocaleString("vi-VN") : "?"}` +
    (reason ? ` — lý do: ${reason}` : "");

  const doc = await AccountantDailyClose.findOneAndUpdate(
    { spot, date },
    {
      $set: { status: "draft", note: [existing.note, trail].filter(Boolean).join("\n") },
      $unset: { closedAt: "", closedBy: "" },
    },
    { new: true },
  ).lean<any>();

  pushSheetInBackground(() => pushCloseRow(doc), AccountantDailyClose, doc._id);
  // Gỡ khoá xong, mọi dòng của ngày quay lại nhãn "chưa chốt" trên bảng tính.
  runInBackground(() => pushDayToSheet(spot, date));

  return toCloseDTO(doc);
}

function toCloseDTO(doc: any): DailyCloseDTO {
  return {
    id: String(doc._id),
    date: doc.date,
    accountantName: doc.accountantName ?? "",
    guestCount: doc.guestCount ?? 0,
    noTicketGuests: doc.noTicketGuests ?? 0,
    ticketsIssued: doc.ticketsIssued ?? 0,
    ticketsReturned: doc.ticketsReturned ?? 0,
    cancelledCount: doc.cancelledCount ?? 0,
    cancelledRefundCount: doc.cancelledRefundCount ?? 0,
    cancelledNoRefundCount: doc.cancelledNoRefundCount ?? 0,
    rescheduledCount: doc.rescheduledCount ?? 0,
    issuedRanges: doc.issuedRanges ?? [],
    cancelledCodes: doc.cancelledCodes ?? [],
    cancelledNote: doc.cancelledNote ?? "",
    rescheduled: doc.rescheduled ?? [],
    registeredGuests: doc.registeredGuests ?? 0,
    cancelledGuestEntries: doc.cancelledGuestEntries ?? [],
    rescheduledGuestEntries: doc.rescheduledGuestEntries ?? [],
    cashTotal: doc.cashTotal ?? 0,
    transferTotal: doc.transferTotal ?? 0,
    flycam: doc.flycam ?? 0,
    video360: doc.video360 ?? 0,
    redFlag: doc.redFlag ?? 0,
    sunset: doc.sunset ?? 0,
    flagFlight: doc.flagFlight ?? 0,
    ledger: doc.ledger ?? [],
    expenseReviews: doc.expenseReviews ?? [],
    expensesApproved: Boolean(doc.expensesApproved),
    expensesApprovedNote: doc.expensesApprovedNote ?? "",
    varianceApproved: Boolean(doc.varianceApproved),
    varianceNote: doc.varianceNote ?? "",
    status: doc.status === "closed" ? "closed" : "draft",
    closedAt: doc.closedAt ? new Date(doc.closedAt).toISOString() : undefined,
    closedBy: doc.closedBy || undefined,
    note: doc.note ?? "",
    sheetSynced: Boolean(doc.sheetSynced),
    sheetError: doc.sheetError || undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

/* ================================================================== */
/* Đẩy lại bản ghi chưa sang được bảng tính                            */
/* ================================================================== */

export type ResyncResult = {
  scanned: number;
  pushed: number;
  failed: Array<{ kind: string; date: string; who: string; error: string }>;
};

/**
 * Quét khoảng ngày, tìm mọi bản ghi mang `sheetSynced: false` và đẩy lại sang
 * Google Sheets.
 *
 * Vì sao cần: mỗi lần lưu đều đẩy sang bảng tính ngay, nhưng Apps Script có lúc
 * chậm quá ngưỡng chờ hoặc Google trả lỗi — lúc đó bản ghi vẫn nằm an toàn
 * trong MongoDB nhưng bảng tính thiếu một dòng. Nút này là đường vá thủ công để
 * cuối kỳ không có dòng nào rơi rớt.
 */
export async function resyncSheets(
  spotRaw: string,
  from: string,
  to: string,
  /**
   * force = đẩy lại TẤT CẢ bản ghi trong khoảng ngày, kể cả dòng đã sang bảng —
   * dùng khi bộ cột trên bảng đổi (thêm cột mới) và cần đổ lại toàn bộ dữ liệu.
   * Bình thường chỉ đẩy dòng chưa sang được.
   */
  force = false,
): Promise<ResyncResult> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const range = { $gte: from, $lte: to };
  const result: ResyncResult = { scanned: 0, pushed: 0, failed: [] };
  const pending = force ? {} : { sheetSynced: { $ne: true } };

  const [pilots, dispatchers, cameramen, closes, handovers, bookings, collects] = await Promise.all([
    PilotDailyReport.find({ spot, date: range, ...pending }).lean<any[]>(),
    DispatcherDailyReport.find({ spot, date: range, ...pending }).lean<any[]>(),
    CameramanDailyReport.find({ spot, date: range, ...pending }).lean<any[]>(),
    AccountantDailyClose.find({ spot, date: range, ...pending }).lean<any[]>(),
    BaobayHandover.find({ spot, date: range, ...pending }).lean<any[]>(),
    BaobayBooking.find({ spot, flightDate: range, ...pending }).lean<any[]>(),
    BaobayCollect.find({ spot, date: range, ...pending }).lean<any[]>(),
  ]);

  result.scanned =
    pilots.length + dispatchers.length + cameramen.length + closes.length + handovers.length +
    bookings.length + collects.length;

  const record = async (
    kind: string,
    date: string,
    who: string,
    model: { updateOne: (f: any, u: any) => any },
    id: any,
    push: () => Promise<{ ok: boolean; error?: string }>,
  ) => {
    const sync = await push();
    await model.updateOne({ _id: id }, { $set: { sheetSynced: sync.ok, sheetError: sync.ok ? "" : sync.error || "" } });
    if (sync.ok) result.pushed += 1;
    else result.failed.push({ kind, date, who, error: sync.error || "không rõ" });
  };

  for (const doc of pilots) {
    await record("Phi công", doc.date, doc.pilotName, PilotDailyReport, doc._id, () =>
      pushPilotRow(doc),
    );
  }
  for (const doc of dispatchers) {
    await record("Điều phối", doc.date, doc.staffName, DispatcherDailyReport, doc._id, () =>
      pushDispatcherRow(doc),
    );
  }
  for (const doc of cameramen) {
    await record("Camera man", doc.date, doc.cameramanName, CameramanDailyReport, doc._id, () =>
      pushCameramanRow(doc),
    );
  }
  for (const doc of closes) {
    await record("Chốt ngày", doc.date, doc.accountantName, AccountantDailyClose, doc._id, () =>
      pushCloseRow(doc),
    );
  }
  for (const doc of handovers) {
    await record("Giao tiền", doc.date, doc.staffName, BaobayHandover, doc._id, () =>
      pushHandoverRow(doc),
    );
  }
  for (const doc of bookings) {
    await record("Booking", doc.flightDate, doc.contactName || doc.bookingCode || "", BaobayBooking, doc._id, () =>
      pushBookingRow(doc),
    );
  }
  for (const doc of collects) {
    await record("Lệnh thu", doc.date, doc.guestName || "", BaobayCollect, doc._id, () =>
      pushCollectRow(doc),
    );
  }

  /**
   * Tab "Tổng hợp ngày" (daysummary): tính lại và đẩy cho từng ngày có chốt sổ —
   * chỉ khi force, vì bản tổng hợp vốn được đẩy lại mỗi lần chốt.
   */
  if (force) {
    const closedDates = [...new Set(closes.map((d) => d.date as string))].sort();
    for (const d of closedDates) {
      const sync = await pushDaySummaryRow(spot, d);
      if (sync.ok) result.pushed += 1;
      else result.failed.push({ kind: "Tổng hợp ngày", date: d, who: "", error: sync.error || "không rõ" });
      result.scanned += 1;
    }
  }

  return result;
}

/* ================================================================== */
/* Đối chiếu                                                           */
/* ================================================================== */

async function loadDay(spot: string, date: string) {
  const filter = { spot, date };
  const [close, dispatchers, pilots, cameramen] = await Promise.all([
    AccountantDailyClose.findOne(filter).lean<any>(),
    DispatcherDailyReport.find(filter).lean<any[]>(),
    PilotDailyReport.find(filter).lean<any[]>(),
    CameramanDailyReport.find(filter).lean<any[]>(),
  ]);
  return { close, dispatchers, pilots, cameramen };
}

/** Dựng dữ liệu vào cho bộ đối chiếu thuần rồi chạy nó. */
export async function getReconcile(
  spotRaw: string,
  date: string,
  username?: string,
): Promise<ReconcileDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const { close, dispatchers, pilots, cameramen } = await loadDay(spot, date);

  /**
   * Mã vé thu hồi ghi ngay trên SỔ BOOKING (nút ✕ Huỷ booking hỏi "đã xuất vé —
   * mã nào"). Không đọc chỗ này thì bộ soát báo đỏ "mã đã xuất mà không ai khai"
   * dù trong sổ đã ghi rõ thu hồi — đã bị báo lỗi oan đúng như vậy.
   */
  const cancelledBookings = await BaobayBooking.find({
    spot,
    flightDate: date,
    cancelTicketCodes: { $exists: true, $ne: [] },
  })
    .select("cancelTicketCodes")
    .lean<any[]>();
  const bookingCancelledCodes = cancelledBookings.flatMap((b) => b.cancelTicketCodes ?? []);

  /**
   * VÉ MANG SANG giữa hai ngày kề (chỉ điểm bắt mã vé): nạp thêm ngày hôm
   * trước và hôm sau để bộ soát tự khớp — khách dời lịch cầm nguyên vé cũ đi
   * bay là chuyện thật (30/08/2026 quá đông), nhân viên chỉ ghi được số lượng.
   * Xem luật ở lib/baobay/reconcile.ts (prevDay / nextDayCarried).
   */
  let prevDays: ReconcileInput["prevDays"];
  let nextDayCarried: string[] = [];
  if (spot === "khau-pha") {
    /**
     * TRUY VẾT THEO ĐƯỜNG DỜI (02/09/2026): khách có thể giữ vé 2-3 ngày mới
     * bay, nhưng KHÔNG được khớp mã bừa vào ngày bất kỳ — phi công gõ nhầm mã
     * mà cũng "tự khớp" thì bộ soát mù. Luật của chủ: chỉ liên kết mã vé giữa
     * ngày gốc và ngày đích khi CÓ VẾT DỜI THẬT nối hai ngày đó:
     *  - booking của ngày đích có `rescheduledFrom` chứa ngày gốc (dời qua
     *    app; dời nhiều chặng vẫn dính vì mảng giữ đủ các ngày đã qua);
     *  - hoặc báo cáo ngày gốc (kế toán/quầy/phi công) ghi "dời sang <ngày đích>".
     * Cửa sổ nhìn tối đa 6 ngày mỗi chiều; ngày nào không có vết dời nối tới
     * thì mã của ngày đó vẫn là MÃ LẠ / MÃ THIẾU như thường.
     */
    const WINDOW = 6;
    const pastDates = Array.from({ length: WINDOW }, (_, i) => shiftDateKey(date, -(i + 1)));
    const futureDates = Array.from({ length: WINDOW }, (_, i) => shiftDateKey(date, i + 1));
    const [
      pastCloses,
      pastDispatchers,
      pastPilots,
      pastCancelBookings,
      futPilots,
      futCloses,
      futDispatchers,
      futCancelBookings,
      arrivedToday,
      futArrivals,
    ] = await Promise.all([
      AccountantDailyClose.find({ spot, date: { $in: pastDates } }).lean<any[]>(),
      DispatcherDailyReport.find({ spot, date: { $in: pastDates } }).lean<any[]>(),
      PilotDailyReport.find({ spot, date: { $in: pastDates } })
        .select("date ticketCodes ppgCodes rescheduledGuestEntries")
        .lean<any[]>(),
      BaobayBooking.find({ spot, flightDate: { $in: pastDates }, cancelTicketCodes: { $exists: true, $ne: [] } })
        .select("flightDate cancelTicketCodes")
        .lean<any[]>(),
      PilotDailyReport.find({ spot, date: { $in: futureDates } })
        .select("date ticketCodes ppgCodes")
        .lean<any[]>(),
      AccountantDailyClose.find({ spot, date: { $in: futureDates } })
        .select("date cancelledCodes rescheduled")
        .lean<any[]>(),
      DispatcherDailyReport.find({ spot, date: { $in: futureDates } })
        .select("date cancelledCodes rescheduled")
        .lean<any[]>(),
      BaobayBooking.find({ spot, flightDate: { $in: futureDates }, cancelTicketCodes: { $exists: true, $ne: [] } })
        .select("flightDate cancelTicketCodes rescheduledFrom")
        .lean<any[]>(),
      // Khách DỜI TỚI hôm nay — vết nối các ngày gốc → hôm nay
      BaobayBooking.find({ spot, flightDate: date, rescheduledFrom: { $exists: true, $ne: [] } })
        .select("rescheduledFrom")
        .lean<any[]>(),
      // Khách của các ngày sau mang vết dời — để nối hôm nay → ngày sau
      BaobayBooking.find({ spot, flightDate: { $in: futureDates }, rescheduledFrom: { $exists: true, $ne: [] } })
        .select("flightDate rescheduledFrom")
        .lean<any[]>(),
    ]);

    /** Ngày gốc nào có khách dời TỚI hôm nay (booking hoặc báo cáo ngày gốc ghi). */
    const linkedPast = new Set<string>(arrivedToday.flatMap((b: any) => b.rescheduledFrom ?? []));
    const movesOf = (dayClose: any, dayDisp: any[], dayPilots: any[]) => [
      ...((dayClose?.rescheduled ?? []) as any[]),
      ...dayDisp.flatMap((x: any) => x.rescheduled ?? []),
      ...dayPilots.flatMap((p: any) => (p.rescheduledGuestEntries ?? []).map((e: any) => ({ code: "", toDate: e.toDate }))),
    ];
    for (const d of pastDates) {
      const ms = movesOf(
        pastCloses.find((c: any) => c.date === d),
        pastDispatchers.filter((x: any) => x.date === d),
        pastPilots.filter((p: any) => p.date === d),
      );
      if (ms.some((m: any) => m.toDate === date)) linkedPast.add(d);
    }

    prevDays = pastDates
      .filter((d) => linkedPast.has(d))
      .map((d) => {
        const dayClose = pastCloses.find((c: any) => c.date === d);
        const dayDisp = pastDispatchers.filter((x: any) => x.date === d);
        const ranges = dayClose?.issuedRanges?.length
          ? dayClose.issuedRanges
          : dayDisp.flatMap((x: any) => x.issuedRanges ?? []);
        if (!ranges.length) return null;
        /**
         * Mã "dời CÓ ghi mã" tách hai ngả: dời sang ĐÚNG hôm nay → chính là vé
         * đang truy vết, phải cho bay (không tính đã-có-chủ); dời sang ngày
         * KHÁC → bay hôm nay là sai chỗ, giữ nguyên đã-có-chủ để báo đỏ.
         */
        const moved = [...((dayClose?.rescheduled ?? []) as any[]), ...dayDisp.flatMap((x: any) => x.rescheduled ?? [])];
        return {
          date: d,
          issuedRanges: ranges,
          // Mã ngày đó ĐÃ CÓ CHỦ: đã bay (PG lẫn PPG), đã huỷ, đã dời đi ngày khác
          usedCodes: [
            ...pastPilots.filter((p: any) => p.date === d).flatMap((p: any) => [...(p.ticketCodes ?? []), ...(p.ppgCodes ?? [])]),
            ...(dayClose?.cancelledCodes ?? []),
            ...dayDisp.flatMap((x: any) => x.cancelledCodes ?? []),
            ...moved.filter((r: any) => r.toDate !== date).map((r: any) => r.code),
            ...pastCancelBookings.filter((b: any) => b.flightDate === d).flatMap((b: any) => b.cancelTicketCodes ?? []),
          ],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    /** Ngày sau nào có vết dời TỪ hôm nay tới (booking ngày sau, hoặc báo cáo hôm nay ghi). */
    const linkedFuture = new Set<string>(
      futArrivals.filter((b: any) => (b.rescheduledFrom ?? []).includes(date)).map((b: any) => String(b.flightDate)),
    );
    for (const m of movesOf(close, dispatchers as any[], pilots as any[])) {
      if (m.toDate && futureDates.includes(String(m.toDate))) linkedFuture.add(String(m.toDate));
    }

    // Mã CỦA NGÀY NÀY đã có chủ ở NGÀY ĐƯỢC DỜI TỚI — soát lại ngày cũ hết "mã thiếu"
    const ownRanges = close?.issuedRanges?.length
      ? close.issuedRanges
      : dispatchers.flatMap((d: any) => d.issuedRanges ?? []);
    if (ownRanges.length && linkedFuture.size) {
      const ownSet = new Set(expandTicketRanges(ownRanges).codes);
      const linked = (x: any) => linkedFuture.has(String(x.date ?? x.flightDate ?? ""));
      nextDayCarried = [
        ...futPilots.filter(linked).flatMap((p: any) => [...(p.ticketCodes ?? []), ...(p.ppgCodes ?? [])]),
        ...futCloses.filter(linked).flatMap((c: any) => [...(c.cancelledCodes ?? []), ...(c.rescheduled ?? []).map((r: any) => r.code)]),
        ...futDispatchers.filter(linked).flatMap((x: any) => [...(x.cancelledCodes ?? []), ...(x.rescheduled ?? []).map((r: any) => r.code)]),
        ...futCancelBookings.filter(linked).flatMap((b: any) => b.cancelTicketCodes ?? []),
      ]
        .map((c: any) => String(c ?? "").trim().toUpperCase())
        .filter((c: string) => ownSet.has(c));
    }
  }

  const input: ReconcileInput = {
    date,
    spot,
    bookingCancelledCodes,
    prevDays,
    nextDayCarried,
    // Chỉ Khau Phạ vận hành vé 3 liên có mã in sẵn — nơi khác không bắt mã
    requireCodes: spot === "khau-pha",
    close: close
      ? {
          guestCount: close.guestCount ?? 0,
          ticketsIssued: close.ticketsIssued ?? 0,
          ticketsReturned: close.ticketsReturned ?? 0,
          cancelledCount: close.cancelledCount ?? 0,
          rescheduledCount: close.rescheduledCount ?? 0,
          issuedRanges: close.issuedRanges ?? [],
          cancelledCodes: close.cancelledCodes ?? [],
          rescheduled: close.rescheduled ?? [],
          cashTotal: close.cashTotal ?? 0,
          transferTotal: close.transferTotal ?? 0,
          flycam: close.flycam ?? 0,
          video360: close.video360 ?? 0,
          redFlag: close.redFlag ?? 0,
          sunset: close.sunset ?? 0,
          flagFlight: close.flagFlight ?? 0,
          expensesApproved: Boolean(close.expensesApproved),
          varianceApproved: Boolean(close.varianceApproved),
        }
      : null,
    dispatchers: dispatchers.map((d) => ({
      username: d.username,
      staffName: d.staffName,
      guestCount: d.guestCount ?? 0,
      ticketsIssued: d.ticketsIssued ?? 0,
      ticketsReturned: d.ticketsReturned ?? 0,
      issuedRanges: d.issuedRanges ?? [],
      cancelledCodes: d.cancelledCodes ?? [],
      rescheduled: d.rescheduled ?? [],
      flycam: d.flycam ?? 0,
      flycamCodes: d.flycamCodes ?? [],
      video360: d.video360 ?? 0,
      video360ServiceCodes: d.video360ServiceCodes ?? [],
      redFlag: d.redFlag ?? 0,
      redFlagCodes: d.redFlagCodes ?? [],
      sunset: d.sunset ?? 0,
      sunsetCodes: d.sunsetCodes ?? [],
      flagFlight: d.flagFlight ?? 0,
      flagFlightCodes: d.flagFlightCodes ?? [],
      diplomaticGuests: d.diplomaticGuests ?? 0,
      cashReceived: d.cashReceived ?? 0,
      transferReceived: d.transferReceived ?? 0,
      expenseTotal: dispatcherExpenseTotal(d),
    })),
    pilots: pilots.map((p) => ({
      username: p.username,
      pilotName: p.pilotName,
      flightCount: p.flightCount ?? 0,
      ticketCodes: p.ticketCodes ?? [],
      flycam: p.flycam ?? 0,
      flycamCodes: p.flycamCodes ?? [],
      video360: p.video360 ?? 0,
      video360Codes: p.video360Codes ?? [],
      redFlag: p.redFlag ?? 0,
      redFlagCodes: p.redFlagCodes ?? [],
      sunset: p.sunset ?? 0,
      sunsetCodes: p.sunsetCodes ?? [],
      flagFlight: p.flagFlight ?? 0,
      flagFlightCodes: p.flagFlightCodes ?? [],
      diplomaticGuests: p.diplomaticGuests ?? 0,
      ppgCodes: p.ppgCodes ?? [],
      ppgFlights: p.ppgFlights ?? 0,
      expenseTotal: pilotExpenseTotal(p),
      submitted: Boolean(p.submitted),
    })),
    cameramen: cameramen.map((c) => ({
      username: c.username,
      cameramanName: c.cameramanName,
      flycamFlights: c.flycamFlights ?? 0,
      flycamCodes: c.flycamCodes ?? [],
      expenseTotal: expenseTotal(c.expenses),
      submitted: Boolean(c.submitted),
    })),
  };

  const result = reconcileDay(input);

  /** Danh sách từng khoản chi trong ngày để kế toán đọc rồi DUYỆT/TỪ CHỐI từng dòng. */
  const expenseLines: ReconcileDTO["expenseLines"] = [];
  const lineKey = (role: BaobayRole, uname: string, content: string, amount: number, kind: string) =>
    `${role}|${uname}|${content}|${amount}|${kind}`;
  const pushNamed = (who: string, uname: string, role: BaobayRole, content: string, amount: number) => {
    if (amount > 0)
      expenseLines.push({
        who,
        username: uname,
        role,
        content,
        amount,
        kind: "chi",
        key: lineKey(role, uname, content, amount, "chi"),
      });
  };
  /** kind đi kèm từng dòng để giao diện tô màu thu xanh / chi đỏ, khỏi dán nhãn chữ. */
  const pushEntry = (who: string, uname: string, role: BaobayRole, e: ExpenseDTO) => {
    const kind = e.kind === "thu" ? "thu" : "chi";
    expenseLines.push({
      who,
      username: uname,
      role,
      content: e.content,
      amount: e.amount,
      kind,
      note: e.note,
      key: lineKey(role, uname, e.content, e.amount, kind),
    });
  };

  for (const p of pilots) {
    pushNamed(p.pilotName, p.username, "pilot", "Nước cho khách", p.waterCost ?? 0);
    pushNamed(p.pilotName, p.username, "pilot", "Xe cho khách", p.guestCarCost ?? 0);
    // Phi công thi thoảng cầm hộ tiền khách — dòng thu là tiền PHẢI THU VỀ
    for (const e of p.expenses ?? []) pushEntry(p.pilotName, p.username, "pilot", e);
  }
  for (const d of dispatchers) {
    pushNamed(d.staffName, d.username, "dispatcher", "Nước cho khách", d.guestWaterCost ?? 0);
    pushNamed(d.staffName, d.username, "dispatcher", "Xe lên núi", d.mountainCarCost ?? 0);
    pushNamed(d.staffName, d.username, "dispatcher", "Xe đưa đón", d.shuttleCarCost ?? 0);
    for (const e of d.expenses ?? []) pushEntry(d.staffName, d.username, "dispatcher", e);
  }
  // Sổ THU/CHI riêng của kế toán — cũng phải nằm trong bảng chi tiết
  if (close?.ledger?.length) {
    for (const e of close.ledger)
      pushEntry(close.accountantName || "Kế toán", close.accountantName || "ketoan", "accountant", e);
  }

  for (const c of cameramen) {
    for (const e of c.expenses ?? []) pushEntry(c.cameramanName, c.username, "cameraman", e);
  }

  /**
   * Khoản bị kế toán TỪ CHỐI mà nhân viên chưa sửa (khoá vẫn khớp) → lỗi ĐỎ
   * chặn chốt, trỏ đúng người phải sửa. Nhân viên sửa khoản là khoá đổi, dấu
   * từ chối tự rơi và lỗi tan.
   */
  const rejected = (close?.expenseReviews ?? []).filter(
    (r: { key: string; status: string }) => r.status === "no" && expenseLines.some((l) => l.key === r.key),
  );
  if (rejected.length) {
    const names = [
      ...new Set(
        rejected.map((r: { key: string }) => expenseLines.find((l) => l.key === r.key)?.who).filter(Boolean),
      ),
    ];
    const whoUsers = rejected
      .map((r: { key: string }) => expenseLines.find((l) => l.key === r.key)?.username)
      .filter((x: string | undefined): x is string => Boolean(x));
    const issue = {
      code: "CHUA_DUYET_CHI" as const,
      severity: "red" as const,
      message: `${rejected.length} khoản thu chi bị kế toán TỪ CHỐI — chờ ${names.join(", ")} sửa lại số liệu`,
      who: whoUsers,
    };
    result.issues.push(issue);
    for (const u of whoUsers) {
      if (!result.byUser[u]) result.byUser[u] = [];
      result.byUser[u].push(issue);
    }
    result.canClose = false;
  }

  return toReconcileDTO(result, expenseLines, username);
}

function toReconcileDTO(
  result: ReconcileResult,
  expenseLines: ReconcileDTO["expenseLines"],
  username?: string,
): ReconcileDTO {
  return {
    date: result.date,
    empty: result.empty,
    canClose: result.canClose,
    issues: result.issues,
    totals: result.totals,
    missingCodes: result.missingCodes,
    duplicateCodes: result.duplicateCodes,
    expenseTotal: result.totals.expenseTotal,
    expenseLines,
    myIssues: username ? result.byUser[username] ?? [] : undefined,
  };
}

/**
 * Đối chiếu nhưng chỉ trả về phần liên quan tới một người.
 *
 * Phi công / camera man cần thấy "chỗ nào của tôi có vấn đề" mà KHÔNG cần thấy
 * số tiền của điều phối hay số chuyến của người khác.
 */
export async function getReconcileForUser(
  spot: string,
  date: string,
  username: string,
): Promise<{ date: string; dayBlocked: boolean; myIssues: ReconcileDTO["issues"]; otherIssueCount: number }> {
  const full = await getReconcile(spot, date, username);
  const mine = full.myIssues ?? [];
  const reds = full.issues.filter((i) => i.severity === "red").length;
  const myReds = mine.filter((i) => i.severity === "red").length;

  return { date, dayBlocked: !full.canClose, myIssues: mine, otherIssueCount: reds - myReds };
}

/* ================================================================== */
/* Bảng tổng hợp theo kỳ                                               */
/* ================================================================== */

/**
 * Tổng tiền ỨNG ĐÃ ĐƯỢC DUYỆT của từng người trong khoảng ngày.
 *
 * Chỉ cộng khoản đã duyệt: đang chờ hoặc bị từ chối thì công ty chưa chi đồng
 * nào. KHÔNG lọc theo "ngày đã chốt" như số chuyến bay — tiền ứng là việc của
 * quỹ, không phụ thuộc vào ngày bay đã soát xong hay chưa.
 */
async function advanceTotalsByUser(spot: string, from: string, to: string): Promise<Map<string, number>> {
  const rows = await BaobayHandover.aggregate<{ _id: string; total: number }>([
    { $match: { spot, kind: "advance", confirmed: true, date: { $gte: from, $lte: to } } },
    { $group: { _id: "$username", total: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.total]));
}

/** Tiền ứng ĐÃ DUYỆT theo từng ngày của từng người — để ghi vào đúng ô ngày. */
async function advanceByUserDay(spot: string, from: string, to: string): Promise<Map<string, number>> {
  const rows = await BaobayHandover.aggregate<{ _id: { u: string; d: string }; total: number }>([
    { $match: { spot, kind: "advance", confirmed: true, date: { $gte: from, $lte: to } } },
    { $group: { _id: { u: "$username", d: "$date" }, total: { $sum: "$amount" } } },
  ]);
  return new Map(rows.map((r) => [`${r._id.u}|${r._id.d}`, r.total]));
}


const EMPTY_ROLLUP: Omit<DailyRollupDTO, "date" | "status" | "blocked" | "closedBy"> = {
  issueCount: 0,
  guestCount: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  cancelledCount: 0,
  rescheduledCount: 0,
  cashTotal: 0,
  transferTotal: 0,
  revenueTotal: 0,
  refundTotal: 0,
  agencySpendTotal: 0,
  collectCash: 0,
  collectTransfer: 0,
  flycam: 0,
  video360: 0,
  flagFlight: 0,
  pilotFlights: 0,
  pilotCodes: 0,
  pilot360: 0,
  dispatcherIssued: 0,
  dispatcherCash: 0,
  dispatcherTransfer: 0,
  dispatcherFlycam: 0,
  cameramanFlycam: 0,
  diplomaticGuests: 0,
  diplomaticTickets: 0,
  diplomaticAmount: 0,
  redFlag: 0,
  sunset: 0,
  expenseTotal: 0,
  pilotCount: 0,
  pilotSubmitted: 0,
  dispatcherCount: 0,
  cameramanCount: 0,
};

/**
 * Dữ liệu cho bảng tổng hợp: báo cáo thô + số cộng theo ngày + tổng kỳ.
 *
 * TỔNG KỲ CHỈ CỘNG NGÀY ĐÃ CHỐT. Ngày còn treo hoặc chưa chốt nằm trong
 * `pendingDays` để kế toán biết tổng đang thiếu những ngày nào — đúng quy tắc
 * "chưa chốt thì chưa tính vào tổng".
 */
export async function getSummary(spotRaw: string, from: string, to: string): Promise<BaobaySummaryDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const range = { $gte: from, $lte: to };
  const filter = { spot, date: range };
  const [pilotDocs, dispatcherDocs, cameramanDocs, closeDocs] = await Promise.all([
    PilotDailyReport.find(filter).sort({ date: -1, pilotName: 1 }).lean<any[]>(),
    DispatcherDailyReport.find(filter).sort({ date: -1, staffName: 1 }).lean<any[]>(),
    CameramanDailyReport.find(filter).sort({ date: -1 }).lean<any[]>(),
    AccountantDailyClose.find(filter).sort({ date: -1 }).lean<any[]>(),
  ]);

  const pilotReports = pilotDocs.map(toPilotDTO);
  const dispatcherReports = dispatcherDocs.map(toDispatcherDTO);
  const cameramanReports = cameramanDocs.map(toCameramanDTO);
  const closes = closeDocs.map(toCloseDTO);

  const byDate = new Map<string, DailyRollupDTO>();
  const rowFor = (date: string): DailyRollupDTO => {
    const found = byDate.get(date);
    if (found) return found;
    const fresh: DailyRollupDTO = { date, status: "none", blocked: false, ...EMPTY_ROLLUP };
    byDate.set(date, fresh);
    return fresh;
  };

  /**
   * HOÀN TIỀN + HUỶ FLYCAM + CHIẾT KHẤU ĐẠI LÝ — trước đây chỉ money board của
   * MỘT ngày thấy, tổng kỳ mù tịt (16-18/08 hoàn 14,8tr mà kỳ báo chi 0đ).
   */
  const [periodRefunds, periodFlycamCancels, periodCommissions] = await Promise.all([
    BaobayRefund.find({ spot, date: { $gte: from, $lte: to }, status: { $in: ["done", "paid"] } })
      .select("date amount")
      .lean<any[]>(),
    BaobayFlycamCancel.find({ spot, date: { $gte: from, $lte: to }, status: { $in: ["done", "paid"] } })
      .select("date amount")
      .lean<any[]>(),
    BaobayBooking.find({ spot, flightDate: { $gte: from, $lte: to }, "commission.amount": { $gt: 0 } })
      .select("flightDate commission.amount")
      .lean<any[]>(),
  ]);
  for (const r of periodRefunds) rowFor(r.date).refundTotal += r.amount || 0;
  for (const f of periodFlycamCancels) rowFor(f.date).refundTotal += f.amount || 0;
  for (const b of periodCommissions) rowFor(b.flightDate).agencySpendTotal += b.commission?.amount || 0;

  /** LỆNH THU theo ngày — để tổng CẢ KỲ tính được cả ngày chưa chốt. */
  const periodCollects = await BaobayCollect.find({
    spot,
    date: { $gte: from, $lte: to },
    status: { $in: ["collected", "company"] },
  })
    .select("date method amount status")
    .lean<any[]>();
  for (const c of periodCollects) {
    const row = rowFor(c.date);
    if (c.method === "cash" && c.status === "collected") row.collectCash += c.amount || 0;
    else if (c.method === "transfer" && c.status === "company") row.collectTransfer += c.amount || 0;
  }

  for (const r of pilotReports) {
    const row = rowFor(r.date);
    // Cộng cả PPG — trang phi công tính "Tổng chuyến" gồm PPG, bảng kế toán
    // mà bỏ thì hai bên vênh nhau (129 vs 115 đúng kỳ chủ soi ra).
    row.pilotFlights += r.flightCount + (r.ppgFlights || 0);
    row.pilotCodes += r.ticketCodes.length;
    row.pilot360 += r.video360;
    row.diplomaticGuests += r.diplomaticGuests;
    row.expenseTotal += pilotExpenseTotal(r);
    row.pilotCount += 1;
    if (r.submitted) row.pilotSubmitted += 1;
  }

  for (const r of dispatcherReports) {
    const row = rowFor(r.date);
    row.dispatcherIssued += r.ticketsIssued;
    row.dispatcherCash += r.cashReceived;
    row.dispatcherTransfer += r.transferReceived;
    row.dispatcherFlycam += r.flycam;
    /**
     * Khách ngoại giao đếm theo SỐ VÉ quầy xuất và TIỀN thu được từ chính những
     * vé đó — hai con số kế toán cần tách riêng khỏi doanh thu vé thường.
     */
    row.diplomaticTickets += r.diplomaticCodes.length || r.diplomaticGuests;
    row.diplomaticAmount += r.diplomaticAmount;
    row.redFlag += r.redFlag;
    row.sunset += r.sunset;
    row.expenseTotal += dispatcherExpenseTotal(r);
    row.dispatcherCount += 1;
  }

  for (const r of cameramanReports) {
    const row = rowFor(r.date);
    row.cameramanFlycam += r.flycamFlights;
    row.expenseTotal += expenseTotal(r.expenses);
    row.cameramanCount += 1;
  }

  for (const c of closes) {
    const row = rowFor(c.date);
    row.status = c.status;
    row.closedBy = c.status === "closed" ? c.closedBy || undefined : undefined;
    row.guestCount = c.guestCount;
    row.ticketsIssued = c.ticketsIssued;
    row.ticketsReturned = c.ticketsReturned;
    row.cancelledCount = c.cancelledCount;
    row.rescheduledCount = c.rescheduledCount;
    row.cashTotal = c.cashTotal;
    row.transferTotal = c.transferTotal;
    row.revenueTotal = c.cashTotal + c.transferTotal;
    row.flycam = c.flycam;
    row.video360 = c.video360;
    row.flagFlight = c.flagFlight;
  }

  const days = [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

  /**
   * Chạy đối chiếu cho từng ngày CHƯA chốt để biết ngày nào đang treo.
   * Ngày đã chốt thì khỏi chạy: đã chốt nghĩa là lúc chốt không còn lỗi đỏ, và
   * số liệu bị khoá nên không thể lệch trở lại.
   */
  await Promise.all(
    days
      .filter((d) => d.status !== "closed")
      .map(async (d) => {
        const rec = await getReconcile(spot, d.date);
        d.blocked = !rec.canClose;
        d.issueCount = rec.issues.filter((i) => i.severity === "red").length;
      }),
  );

  const closedDays = days.filter((d) => d.status === "closed");
  /** Chỉ cộng các khoá SỐ trong EMPTY_ROLLUP — closedBy là chuỗi, không nằm trong đây. */
  const totals = closedDays.reduce<typeof EMPTY_ROLLUP>(
    (acc, row) => {
      for (const key of Object.keys(EMPTY_ROLLUP) as Array<keyof typeof EMPTY_ROLLUP>) {
        if (key === "issueCount") continue; // số LỖI đỏ của từng ngày, không phải chỉ tiêu để cộng
        acc[key] += (row[key] as number) || 0;
      }
      return acc;
    },
    { ...EMPTY_ROLLUP },
  );

  /* -------- Tổng theo từng phi công (chỉ ngày đã chốt) -------- */

  const closedSet = new Set(closedDays.map((d) => d.date));
  const pilotMap = new Map<string, PilotPeriodTotalDTO>();

  for (const r of pilotReports) {
    if (!closedSet.has(r.date)) continue;
    const entry =
      pilotMap.get(r.username) ??
      {
        username: r.username,
        pilotName: r.pilotName,
        days: 0,
        flights: 0,
        flycam: 0,
        video360: 0,
        redFlag: 0,
        sunset: 0,
        flagFlight: 0,
        diplomaticGuests: 0,
        expenseTotal: 0,
        latePenalty: 0,
        advanceTotal: 0,
        pickupBigC: 0,
        pickupHotel: 0,
        mountainTrips: 0,
        mealBreakfast: 0,
        mealLunch: 0,
        mealDinner: 0,
        motorbikeRides: 0,
        carRides: 0,
      };
    entry.days += 1;
    entry.flights += r.flightCount + (r.ppgFlights || 0);
    entry.flycam += r.flycam;
    entry.video360 += r.video360;
    entry.redFlag += r.redFlag;
    entry.sunset += r.sunset;
    entry.flagFlight += r.flagFlight;
    entry.diplomaticGuests += r.diplomaticGuests;
    entry.expenseTotal += pilotExpenseTotal(r);
    entry.latePenalty += r.latePenalty;
    entry.pickupBigC += r.pickupBigC;
    entry.pickupHotel += r.pickupHotel;
    entry.mountainTrips += r.mountainTrips;
    entry.mealBreakfast += r.mealBreakfast ?? 0;
    entry.mealLunch += r.mealLunch ?? 0;
    entry.mealDinner += r.mealDinner ?? 0;
    entry.motorbikeRides += r.motorbikeRides ?? 0;
    entry.carRides += r.carRides ?? 0;
    pilotMap.set(r.username, entry);
  }

  /**
   * Tiền ứng gắn với CON NGƯỜI, không gắn với ngày bay đã chốt — nên cộng riêng,
   * và vẫn phải hiện cả khi trong kỳ người đó chưa có ngày bay nào được chốt
   * (ứng tiền rồi nghỉ ốm thì kế toán vẫn phải thấy khoản phải trừ lương).
   */
  const advances = await advanceTotalsByUser(spot, from, to);
  for (const [username, total] of advances) {
    const entry = pilotMap.get(username);
    if (entry) {
      entry.advanceTotal = total;
      continue;
    }
    const known = pilotReports.find((r) => r.username === username);
    pilotMap.set(username, {
      username,
      pilotName: known?.pilotName || username,
      days: 0,
      flights: 0,
      flycam: 0,
      video360: 0,
      redFlag: 0,
      sunset: 0,
      flagFlight: 0,
      diplomaticGuests: 0,
      expenseTotal: 0,
      latePenalty: 0,
      advanceTotal: total,
      pickupBigC: 0,
      pickupHotel: 0,
      mountainTrips: 0,
      mealBreakfast: 0,
      mealLunch: 0,
      mealDinner: 0,
      motorbikeRides: 0,
      carRides: 0,
    });
  }

  /**
   * TỔNG CẢ KỲ (tạm tính) — chủ nhìn "Tổng đã chốt" 135tr trong khi lệnh thu
   * cả kỳ 245tr và kêu sai là phải: 19/25 ngày chưa chốt bị giấu sạch. Khối
   * này cộng MỌI ngày: ngày đã chốt lấy số kế toán chốt, ngày chưa chốt lấy
   * báo cáo nhân viên + lệnh thu (đúng nguồn mà gợi ý chốt sẽ dùng).
   */
  const allTotals = { ...EMPTY_ROLLUP };
  for (const row of days) {
    const closed = row.status === "closed";
    for (const key of Object.keys(EMPTY_ROLLUP) as Array<keyof typeof EMPTY_ROLLUP>) {
      if (key === "issueCount") continue;
      allTotals[key] += (row[key] as number) || 0;
    }
    if (!closed) {
      // Ngày chưa chốt: các ô "kế toán khai" đang bằng 0 — thế tạm bằng nguồn thật
      allTotals.cashTotal += row.dispatcherCash + row.collectCash;
      allTotals.transferTotal += row.dispatcherTransfer + row.collectTransfer;
      allTotals.flycam += row.cameramanFlycam;
      allTotals.video360 += row.pilot360;
    }
  }
  allTotals.revenueTotal = allTotals.cashTotal + allTotals.transferTotal;

  return {
    spot,
    from,
    to,
    pilotReports,
    dispatcherReports,
    cameramanReports,
    closes,
    days,
    totals,
    allTotals,
    pendingDays: days.filter((d) => d.status !== "closed").map((d) => d.date),
    byPilot: [...pilotMap.values()].sort((a, b) => b.flights - a.flights),
  };
}

/* ================================================================== */
/* Tổng theo chu kỳ của MỘT người                                      */
/* ================================================================== */

export type PeriodLine = { label: string; value: number; money?: boolean };

/**
 * Tổng các chỉ tiêu của CHÍNH người đang đăng nhập trong một khoảng ngày —
 * phi công / điều phối / camera man xem "kỳ này mình bay bao nhiêu, chi bao
 * nhiêu" mà không thấy số của người khác.
 *
 * Nhãn dựng sẵn ở máy chủ theo vai trò (trang phi công song ngữ) để ba trang
 * dùng chung một khung hiển thị, khỏi mỗi trang tự dịch một kiểu.
 *
 * Cộng CẢ ngày chưa chốt — người lao động cần biết số mình đã nhập tới đâu —
 * nhưng trả kèm `unclosedDays` để khung hiển thị ghi rõ "trong đó N ngày chưa
 * được kế toán chốt, số có thể còn đổi".
 */
export async function getMyPeriodSummary(
  session: BaobaySession,
  spotRaw: string,
  from: string,
  to: string,
): Promise<{ from: string; to: string; days: number; unclosedDays: number; lines: PeriodLine[] }> {
  await connectDB();

  const spot = assertSpotAllowed(session, spotRaw);

  /** Phi công chỉ tự tra 45 ngày gần nhất — kế toán khoá phần cũ hơn. */
  if (session.role === "pilot") {
    const limit = shiftDateKey(todayInVN(), -PILOT_VIEW_LIMIT_DAYS);
    if (from < limit) from = limit;
    if (to < from) to = from;
  }
  const range = { $gte: from, $lte: to };
  const closedDates = new Set(
    (
      await AccountantDailyClose.find({ spot, date: range, status: "closed" })
        .select("date")
        .lean<any[]>()
    ).map((c) => c.date),
  );

  const accountId = new mongoose.Types.ObjectId(session.id);

  /**
   * Ba dòng tiền chung cho mọi vai trò: thu hộ trong kỳ, đã đưa quản lý trong
   * kỳ, và số ĐANG GIỮ tính trên TOÀN BỘ lịch sử — số đang giữ mà cắt theo kỳ
   * thì sai, tiền thu tháng trước chưa nộp vẫn là tiền đang cầm.
   */
  const [inPeriod, allTime] = await Promise.all([
    getCashOnHand(session, spot, from, to),
    getCashOnHand(session, spot),
  ]);
  const cashLines: PeriodLine[] = [
    { label: "Tổng thu hộ cty", value: inPeriod.collected, money: true },
    {
      label: "Tổng đã nộp tiền về cty",
      value: inPeriod.handedConfirmed + inPeriod.handedPending,
      money: true,
    },
    { label: "Đang giữ", value: allTime.holding, money: true },
  ];

  if (session.role === "pilot") {
    const docs = await PilotDailyReport.find({ accountId, spot, date: range }).lean<any[]>();
    const sumOf = (pick: (d: any) => number) => docs.reduce((s, d) => s + (pick(d) || 0), 0);
    return {
      from,
      to,
      days: docs.length,
      unclosedDays: docs.filter((d) => !closedDates.has(d.date)).length,
      lines: [
        { label: "Số ngày bay (days flown)", value: docs.length },
        // Cộng cả PPG — dòng "Chuyến PPG" bên dưới là số tách riêng để đối chiếu
        { label: "Tổng chuyến (flights)", value: sumOf((d) => (d.flightCount || 0) + (d.ppgFlights || 0)) },
        { label: "Flycam", value: sumOf((d) => d.flycam) },
        { label: "Camera 360", value: sumOf((d) => d.video360) },
        { label: "Dù cờ đỏ (red flag)", value: sumOf((d) => d.redFlag) },
        ...(spot !== "sapa" ? [{ label: "Bay hoàng hôn/săn mây (sunset)", value: sumOf((d) => d.sunset) }] : []),
        { label: "Bay kéo cờ/bánh (flag flight)", value: sumOf((d) => d.flagFlight) },
        { label: "Khách ngoại giao (complimentary)", value: sumOf((d) => d.diplomaticGuests) },
        // Phí bãi + nước chỉ có ở Hà Nội; PPG chỉ có ở Khau Phạ
        ...(spot === "ha-noi"
          ? [{ label: "Phí bãi — khách (site fee, guests)", value: sumOf((d) => d.siteFeeGuests) }]
          : []),
        ...(spot === "ha-noi"
          ? [{ label: "Nước cho khách (water)", value: sumOf((d) => d.waterCost), money: true }]
          : []),
        { label: "Xe cho khách (car)", value: sumOf((d) => d.guestCarCost), money: true },
        ...(spot === "khau-pha" ? [{ label: "Chuyến PPG (PPG flights)", value: sumOf((d) => d.ppgFlights) }] : []),
        // Đưa đón tự trả là đặc thù điểm Hà Nội — điểm khác không hiện cho đỡ rối
        ...(spot === "ha-noi"
          ? [
              { label: "Đón BigC (lượt)", value: sumOf((d) => d.pickupBigC) },
              { label: "Đón khách sạn (lượt)", value: sumOf((d) => d.pickupHotel) },
              { label: "Xe lên núi (lượt)", value: sumOf((d) => d.mountainTrips) },
            ]
          : []),
        { label: "Chi khác (other)", value: sumOf((d) => expenseTotal(d.expenses)), money: true },
        { label: "Tổng chi (total expenses)", value: sumOf((d) => pilotExpenseTotal(d)), money: true },
        ...cashLines,
      ],
    };
  }

  if (isDispatcherLike(session.role)) {
    const docs = await DispatcherDailyReport.find({ accountId, spot, date: range }).lean<any[]>();
    const sumOf = (pick: (d: any) => number) => docs.reduce((s, d) => s + (pick(d) || 0), 0);

    /**
     * Từ 13/08 quầy thu tiền qua NÚT TRÊN BOOKING (lệnh thu) chứ không gõ vào
     * báo cáo ngày nữa — hai ô cashReceived/transferReceived trong báo cáo
     * toàn 0. Không cộng lệnh thu vào đây thì "Tiền mặt/Chuyển khoản" của kỳ
     * báo 0đ trong khi người ta thu cả trăm triệu.
     *  - TM: lệnh mình là NGƯỜI THU và đã bấm "đã thu".
     *  - CK: lệnh mình LẬP, tiền vào thẳng TK công ty (status "company").
     */
    const collects = await BaobayCollect.find({
      spot,
      date: range,
      $or: [
        { method: "cash", collectorUsername: session.username, status: "collected" },
        { method: "transfer", createdByUsername: session.username, status: "company" },
      ],
    })
      .select("method amount")
      .lean<any[]>();
    const collectCash = collects.filter((c) => c.method === "cash").reduce((a, c) => a + (c.amount || 0), 0);
    const collectTransfer = collects
      .filter((c) => c.method === "transfer")
      .reduce((a, c) => a + (c.amount || 0), 0);
    return {
      from,
      to,
      days: docs.length,
      unclosedDays: docs.filter((d) => !closedDates.has(d.date)).length,
      lines: [
        { label: "Số ngày làm", value: docs.length },
        { label: "Số khách", value: sumOf((d) => d.guestCount) },
        { label: "Vé xuất ra", value: sumOf((d) => d.ticketsIssued) },
        { label: "Vé thu về", value: sumOf((d) => d.ticketsReturned) },
        { label: "Vé huỷ", value: sumOf((d) => d.cancelledCount) },
        { label: "Vé dời lịch", value: sumOf((d) => d.rescheduledCount) },
        { label: "Flycam", value: sumOf((d) => d.flycam) },
        { label: "Camera 360", value: sumOf((d) => d.video360) },
        { label: "Cờ đỏ", value: sumOf((d) => d.redFlag) },
        ...(spot !== "sapa" ? [{ label: "Bay hoàng hôn/săn mây", value: sumOf((d) => d.sunset) }] : []),
        { label: "Bay kéo cờ/bánh", value: sumOf((d) => d.flagFlight) },
        { label: "Khách ngoại giao", value: sumOf((d) => d.diplomaticGuests) },
        { label: "Tiền mặt", value: sumOf((d) => d.cashReceived) + collectCash, money: true },
        { label: "Chuyển khoản", value: sumOf((d) => d.transferReceived) + collectTransfer, money: true },
        {
          label: "Tổng thu",
          value:
            sumOf((d) => (d.cashReceived || 0) + (d.transferReceived || 0)) + collectCash + collectTransfer,
          money: true,
        },
        { label: "Tổng chi cho khách", value: sumOf((d) => dispatcherExpenseTotal(d)), money: true },
        ...cashLines,
      ],
    };
  }

  // cameraman
  const docs = await CameramanDailyReport.find({ accountId, spot, date: range }).lean<any[]>();
  const sumOf = (pick: (d: any) => number) => docs.reduce((s, d) => s + (pick(d) || 0), 0);
  return {
    from,
    to,
    days: docs.length,
    unclosedDays: docs.filter((d) => !closedDates.has(d.date)).length,
    lines: [
      { label: "Số ngày quay", value: docs.length },
      { label: "Tổng chuyến flycam", value: sumOf((d) => d.flycamFlights) },
      { label: "Tổng chi tiêu", value: sumOf((d) => expenseTotal(d.expenses)), money: true },
      ...cashLines,
    ],
  };
}

/* ================================================================== */
/* Báo cáo tháng theo từng phi công                                    */
/* ================================================================== */

const EMPTY_MONTHLY: MonthlyTotalsDTO = {
  days: 0,
  flights: 0,
  flycam: 0,
  video360: 0,
  redFlag: 0,
  sunset: 0,
  flagFlight: 0,
  diplomaticGuests: 0,
  siteFeeGuests: 0,
  waterCost: 0,
  guestCarCost: 0,
  otherExpense: 0,
  expenseTotal: 0,
  latePenalty: 0,
  advanceTotal: 0,
  pickupBigC: 0,
  pickupHotel: 0,
  mountainTrips: 0,
  ppgFlights: 0,
  thuTotal: 0,
  chiTotal: 0,
};

function addMonthly(acc: MonthlyTotalsDTO, r: PilotReportDTO): void {
  acc.days += 1;
  acc.flights += r.flightCount;
  acc.flycam += r.flycam;
  acc.video360 += r.video360;
  acc.redFlag += r.redFlag;
  acc.sunset += r.sunset;
  acc.flagFlight += r.flagFlight;
  acc.diplomaticGuests += r.diplomaticGuests;
  acc.siteFeeGuests += r.siteFeeGuests;
  acc.waterCost += r.waterCost;
  acc.guestCarCost += r.guestCarCost;
  acc.otherExpense += expenseTotal(r.expenses);
  // Phí bãi nay là SỐ KHÁCH, không cộng vào tổng tiền chi
  acc.expenseTotal = acc.waterCost + acc.guestCarCost + acc.otherExpense;
  acc.latePenalty += r.latePenalty;
  acc.pickupBigC += r.pickupBigC;
  acc.pickupHotel += r.pickupHotel;
  acc.mountainTrips += r.mountainTrips;
  acc.ppgFlights += r.ppgFlights;
  // Tiền thu/chi ghi vào ĐÚNG NGÀY phát sinh — cộng ở đây là cộng theo từng ô ngày
  acc.thuTotal += r.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);
  acc.chiTotal +=
    r.waterCost + r.guestCarCost + r.expenses.reduce((a, e) => a + (e.kind !== "thu" ? e.amount : 0), 0);
}

function daysInMonthOf(month: string): number {
  const [y, m] = month.split("-").map(Number);
  // Ngày 0 của tháng sau = ngày cuối tháng này.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Báo cáo tháng: mỗi phi công một khối, mỗi chỉ tiêu một dòng, cột là ngày 1…31
 * kèm hai cột tổng "đến hôm nay" và "cả tháng".
 *
 * `month` dạng "YYYY-MM". Tháng đã qua thì hai cột tổng bằng nhau; tháng đang
 * chạy thì "đến hôm nay" là con số dùng để tạm tính, còn "cả tháng" mới là số
 * chốt cuối kỳ.
 *
 * Ô của ngày kế toán CHƯA chốt vẫn hiện (phi công cần thấy số mình đã nhập)
 * nhưng được đánh dấu `closed: false` để trang tô khác màu — số chưa chốt còn có
 * thể đổi nên chưa dùng để trả tiền được.
 */
export async function getMonthlyReport(
  spotRaw: string,
  month: string,
  onlyUsername?: string,
): Promise<MonthlyReportDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const daysInMonth = daysInMonthOf(month);
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const today = todayInVN();
  const isCurrentMonth = today.slice(0, 7) === month;

  const filter: Record<string, unknown> = { spot, date: { $gte: from, $lte: to } };
  if (onlyUsername) filter.username = onlyUsername;

  const [pilotDocs, closeDocs, advancesMonth, advancesToDate, advancesDay] = await Promise.all([
    PilotDailyReport.find(filter).sort({ date: 1, pilotName: 1 }).lean<any[]>(),
    AccountantDailyClose.find({ spot, date: { $gte: from, $lte: to } })
      .select("date status")
      .lean<any[]>(),
    advanceTotalsByUser(spot, from, to),
    advanceTotalsByUser(spot, from, isCurrentMonth ? today : to),
    advanceByUserDay(spot, from, to),
  ]);

  const closedDates = new Set(closeDocs.filter((c) => c.status === "closed").map((c) => c.date));
  const reports = pilotDocs.map(toPilotDTO);

  /** username -> ngày (1–31) -> báo cáo. */
  const byPilotDay = new Map<string, Map<number, PilotReportDTO>>();
  const names = new Map<string, string>();

  for (const r of reports) {
    names.set(r.username, r.pilotName);
    const day = Number(r.date.slice(8, 10));
    const inner = byPilotDay.get(r.username) ?? new Map<number, PilotReportDTO>();
    inner.set(day, r);
    byPilotDay.set(r.username, inner);
  }

  const todayDay = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth;

  const pilots: MonthlyPilotDTO[] = [...byPilotDay.entries()]
    .map(([username, dayMap]) => {
      const daily: MonthlyDayCellDTO[] = [];
      const toDate: MonthlyTotalsDTO = { ...EMPTY_MONTHLY };
      const monthTotals: MonthlyTotalsDTO = { ...EMPTY_MONTHLY };
      const expenses: Array<ExpenseDTO & { date: string }> = [];

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const r = dayMap.get(day);
        const cell: MonthlyDayCellDTO = {
          day,
          closed: closedDates.has(date),
          hasReport: Boolean(r),
          ...EMPTY_MONTHLY,
        };

        // Tiền ứng ghi vào ĐÚNG NGÀY xin ứng, kể cả hôm đó không bay
        cell.advanceTotal = advancesDay.get(`${username}|${date}`) ?? 0;

        if (r) {
          addMonthly(cell, r);
          addMonthly(monthTotals, r);
          if (day <= todayDay) addMonthly(toDate, r);

          // Ba khoản có tên cũng đưa vào danh sách chi tiết cho kế toán soát
    
          if (r.waterCost) expenses.push({ date, content: "Nước cho khách", amount: r.waterCost, kind: "chi" });
          if (r.guestCarCost) expenses.push({ date, content: "Xe cho khách", amount: r.guestCarCost, kind: "chi" });
          for (const e of r.expenses) expenses.push({ ...e, date });
        }

        daily.push(cell);
      }

      // Tiền ứng không rơi vào ô ngày nào cả — chỉ vào hai cột tổng
      monthTotals.advanceTotal = advancesMonth.get(username) ?? 0;
      toDate.advanceTotal = advancesToDate.get(username) ?? 0;

      return { username, pilotName: names.get(username) || username, daily, toDate, month: monthTotals, expenses };
    })
    .sort((a, b) => b.month.flights - a.month.flights);

  const grandToDate: MonthlyTotalsDTO = { ...EMPTY_MONTHLY };
  const grandMonth: MonthlyTotalsDTO = { ...EMPTY_MONTHLY };
  for (const p of pilots) {
    for (const key of Object.keys(EMPTY_MONTHLY) as Array<keyof MonthlyTotalsDTO>) {
      grandToDate[key] += p.toDate[key];
      grandMonth[key] += p.month[key];
    }
  }

  const datesWithData = new Set(reports.map((r) => r.date));

  return {
    spot,
    month,
    daysInMonth,
    today,
    isCurrentMonth,
    pilots,
    unclosedDays: [...datesWithData].filter((d) => !closedDates.has(d)).sort(),
    grandToDate,
    grandMonth,
  };
}
