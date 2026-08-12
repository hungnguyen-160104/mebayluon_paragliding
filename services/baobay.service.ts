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
import { formatDateKeyVN, isPastSubmitDeadline, nowStampVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { reconcileDay, type ReconcileInput, type ReconcileResult } from "@/lib/baobay/reconcile";
import { ROLE_LABEL, type BaobayRole } from "@/lib/baobay/roles";
import { DEFAULT_SPOT, normalizeSpot, normalizeSpotList, spotName, type SpotId } from "@/lib/baobay/spots";
import { pushBaobayRow, sheetTargetFromSetting, type SheetTarget } from "@/lib/baobay/sheet";
import { buildShiftEmail } from "@/lib/baobay/shift-email";
import { sendSmtpMail } from "@/lib/mailer";
import {
  countTicketRange,
  expandTicketRanges,
  normalizeTicketCode,
  parseTicketCodeList,
  TICKET_CODE_HINT,
  TICKET_CODE_PATTERN,
} from "@/lib/baobay/ticket-code";
import { PILOT_VIEW_LIMIT_DAYS } from "@/lib/baobay/validation";
import type { BaobaySession } from "@/lib/baobay/token";
import type {
  BaobayAccountDTO,
  BaobaySummaryDTO,
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
import { BaobayHandover } from "@/models/BaobayHandover.model";
import { BaobayReviewRequest, REVIEW_TARGET_ROLES, REVIEW_TOPIC_LABEL, type ReviewTopic } from "@/models/BaobayReviewRequest.model";
import { BaobayShift } from "@/models/BaobayShift.model";
import { BaobaySetting, DEFAULT_SUBMIT_DEADLINE } from "@/models/BaobaySetting.model";
import { CameramanDailyReport } from "@/models/CameramanDailyReport.model";
import { DispatcherDailyReport } from "@/models/DispatcherDailyReport.model";
import { PilotDailyReport } from "@/models/PilotDailyReport.model";
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
  if (patch.spots !== undefined) {
    const spots = normalizeSpotList(patch.spots);
    if (!spots.length) return { ok: false, error: "Phải chỉ định ít nhất một điểm bay" };
    set.spots = spots;
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
  input: Array<{ content: string; amount: number; kind?: "thu" | "chi"; note?: string }>,
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

function formatExpenses(list: ExpenseDTO[] = []): string {
  return (list || [])
    .map(
      (e) =>
        `${e.kind === "thu" ? "[THU] " : ""}${e.content}: ${(e.amount || 0).toLocaleString("vi-VN")}đ${e.note ? ` (${e.note})` : ""}`,
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
  flagFlight: number;
  flagFlightCodesText: string;
  diplomaticGuests: number;
  diplomaticCodesText: string;
  /** Phí bãi theo ĐẦU KHÁCH — số khách, kế toán nhân đơn giá ngoài app. */
  siteFeeGuests: number;
  waterCost: number;
  guestCarCost: number;
  /** Số LƯỢT đưa đón phi công tự trả tiền — kế toán hoàn theo đơn giá ngoài app. */
  pickupBigC: number;
  pickupHotel: number;
  mountainTrips: number;
  /** Chuyến PPG: có vé thì khai mã, không vé thì đếm vào ppgNoTicket. */
  ppgFlights: number;
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
  if (ppg.malformed.length) {
    if (input.submit) {
      throw new BaobayError(
        `Chưa chốt được: mã vé PPG sai dạng — ${ppg.malformed.slice(0, 5).join(", ")}. ${TICKET_CODE_HINT}`,
      );
    }
    warnings.push(`Mã vé PPG sai dạng: ${ppg.malformed.slice(0, 5).join(", ")}`);
  }
  if (input.ppgFlights > 0 && ppg.codes.length + input.ppgNoTicket !== input.ppgFlights) {
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
    const late =
      input.flightCount > 0 &&
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
     * Sửa lại báo cáo đã ghi phạt: số chuyến về 0 thì tiền phạt cũng về 0 (không
     * bay thì không phải báo cáo, lấy gì mà muộn); khai lại có chuyến thì phạt
     * quay lại. Giờ chốt lần đầu vẫn giữ nguyên, không tính lại theo giờ sửa.
     */
    penaltySet.latePenalty = input.flightCount > 0 ? LATE_PENALTY_VND : 0;
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
        flagFlight: input.flagFlight,
        flagFlightCodes: codesFlagFlight.codes,
        diplomaticGuests: input.diplomaticGuests,
        diplomaticCodes: diplomatic.codes,
        siteFeeGuests: input.siteFeeGuests,
        waterCost: input.waterCost,
        guestCarCost: input.guestCarCost,
        /**
         * Ba khoản đưa đón (BigC / khách sạn / xe lên núi) là đặc thù RIÊNG
         * của điểm Hà Nội — điểm khác gửi gì cũng ghi 0 để số liệu không lẫn.
         */
        pickupBigC: spot === "ha-noi" ? input.pickupBigC : 0,
        pickupHotel: spot === "ha-noi" ? input.pickupHotel : 0,
        mountainTrips: spot === "ha-noi" ? input.mountainTrips : 0,
        ppgFlights: input.ppgFlights,
        ppgCodes: ppg.codes,
        ppgNoTicket: input.ppgNoTicket,
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
async function pushPilotRow(doc: any) {
  return pushBaobayRow(
    "pilot",
    {
      key: `${doc.date}|${doc.username}`,
      date: doc.date,
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
      flagFlight: doc.flagFlight || 0,
      flagFlightCodes: (doc.flagFlightCodes || []).join(", "),
      diplomaticGuests: doc.diplomaticGuests || 0,
      diplomaticCodes: (doc.diplomaticCodes || []).join(", "),
      siteFeeGuests: doc.siteFeeGuests || 0,
      waterCost: doc.waterCost || 0,
      guestCarCost: doc.guestCarCost || 0,
      thuTotal: thuTotal(doc.expenses),
      otherExpense: expenseTotal(doc.expenses),
      expenseDetail: formatExpenses(doc.expenses),
      expenseTotal: pilotExpenseTotal(doc),
      note: doc.note || "",
      submitted: doc.submitted ? "ĐÃ CHỐT" : "còn nháp",
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
    flagFlight: doc.flagFlight ?? 0,
    flagFlightCodes: doc.flagFlightCodes ?? [],
    diplomaticGuests: doc.diplomaticGuests ?? 0,
    diplomaticCodes: doc.diplomaticCodes ?? [],
    siteFeeGuests: doc.siteFeeGuests ?? 0,
    waterCost: doc.waterCost ?? 0,
    guestCarCost: doc.guestCarCost ?? 0,
    pickupBigC: doc.pickupBigC ?? 0,
    pickupHotel: doc.pickupHotel ?? 0,
    mountainTrips: doc.mountainTrips ?? 0,
    ppgFlights: doc.ppgFlights ?? 0,
    ppgCodes: doc.ppgCodes ?? [],
    ppgNoTicket: doc.ppgNoTicket ?? 0,
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
  if (target.role !== "dispatcher") {
    throw new BaobayError(`“${target.displayName}” không phải điều phối`, 400);
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
  cancelledEntries: Array<{ codesText: string; reason: string; contactName: string }>;
  /** Dời lịch theo nhóm: nhiều mã một ô + ngày + lý do + liên hệ + sđt. */
  rescheduledEntries: Array<{
    codesText: string;
    toDate: string;
    reason: string;
    contactName: string;
    phone: string;
  }>;
  /** Khách ngoại giao: mã vé + tiền thu (nếu có). */
  diplomaticEntries: Array<{ codesText: string; amount: number }>;
  flycam: number;
  flycamCodesText: string;
  video360: number;
  video360CodesText: string;
  redFlag: number;
  redFlagCodesText: string;
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
};

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

  /**
   * Vé huỷ / dời lịch nhập theo NHÓM ĐOÀN (nhiều mã một ô, chung lý do + liên
   * hệ). Máy chủ bung từng nhóm thành mã, giữ cả hai bản: bản nhóm để đọc lại
   * đúng như đã nhập, bản phẳng cho bộ đối chiếu và Sheets.
   */
  const cancelledEntries: CancelEntryDTO[] = [];
  const cancelledFlat: string[] = [];
  for (const raw of input.cancelledEntries) {
    const parsedCodes = parseTicketCodeList(raw.codesText);
    if (!parsedCodes.codes.length && !raw.reason.trim() && !raw.contactName.trim()) continue;
    if (parsedCodes.invalid.length) {
      warnings.push(`Vé huỷ: bỏ qua cụm không đọc được "${parsedCodes.invalid.slice(0, 3).join(", ")}"`);
    }
    cancelledEntries.push({
      codes: parsedCodes.codes,
      reason: raw.reason.trim(),
      contactName: raw.contactName.trim(),
    });
    cancelledFlat.push(...parsedCodes.codes);
  }
  const cancelledCodesUnique = [...new Set(cancelledFlat)];
  if (cancelledCodesUnique.length !== cancelledFlat.length) {
    warnings.push("Có mã vé huỷ xuất hiện ở hai nhóm — chỉ tính một lần.");
  }
  const cancelledCount = cancelledCodesUnique.length;

  const rescheduledEntries: RescheduleEntryDTO[] = [];
  const rescheduled: RescheduledDTO[] = [];
  for (const raw of input.rescheduledEntries) {
    const parsedCodes = parseTicketCodeList(raw.codesText);
    if (!parsedCodes.codes.length && !raw.toDate && !raw.contactName.trim()) continue;
    if (!raw.toDate) warnings.push(`Nhóm dời lịch "${raw.codesText.slice(0, 30)}" chưa ghi dời sang ngày nào`);
    rescheduledEntries.push({
      codes: parsedCodes.codes,
      toDate: raw.toDate,
      reason: raw.reason.trim(),
      contactName: raw.contactName.trim(),
      phone: raw.phone.trim(),
    });
    for (const code of parsedCodes.codes) {
      rescheduled.push({ code, toDate: raw.toDate, note: raw.reason.trim() || undefined });
    }
  }

  const diplomaticEntries: DiploEntryDTO[] = [];
  const diplomaticFlat: string[] = [];
  let diplomaticAmount = 0;
  for (const raw of input.diplomaticEntries) {
    const parsedCodes = parseTicketCodeList(raw.codesText);
    if (!parsedCodes.codes.length && !raw.amount) continue;
    diplomaticEntries.push({ codes: parsedCodes.codes, amount: raw.amount });
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
  if (input.ticketsReturned && input.ticketsReturned !== returned) {
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
        ticketsIssued: input.ticketsIssued,
        ticketsReturned: input.ticketsReturned,
        issuedRanges: ranges,
        cancelledCount,
        cancelledCodes: cancelledCodesUnique,
        cancelledEntries,
        rescheduledCount: rescheduled.length,
        rescheduled,
        rescheduledEntries,
        diplomaticEntries,
        diplomaticAmount,
        flycam: input.flycam,
        flycamCodes: parseTicketCodeList(input.flycamCodesText).codes,
        video360: input.video360,
        video360ServiceCodes: parseTicketCodeList(input.video360CodesText).codes,
        redFlag: input.redFlag,
        redFlagCodes: parseTicketCodeList(input.redFlagCodesText).codes,
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
    date: doc.date,
    staffName: doc.staffName,
    username: doc.username,
    spot: doc.spot || "",
    guestCount: doc.guestCount,
    ticketsIssued: doc.ticketsIssued,
    ticketsReturned: doc.ticketsReturned,
    issuedRanges: formatRanges(doc.issuedRanges),
    cancelledCount: doc.cancelledCount,
    cancelledCodes: (doc.cancelledCodes || []).join(", "),
    cancelledDetail: (doc.cancelledEntries || [])
      .map((e: CancelEntryDTO) => `${e.codes.join(" ")} — ${e.reason || "?"}${e.contactName ? ` — ${e.contactName}` : ""}`)
      .join(" | "),
    rescheduledCount: doc.rescheduledCount,
    rescheduledCodes: formatRescheduled(doc.rescheduled),
    rescheduledDetail: (doc.rescheduledEntries || [])
      .map(
        (e: RescheduleEntryDTO) =>
          `${e.codes.join(" ")} → ${e.toDate || "?"} — ${e.reason || "?"}${e.contactName ? ` — ${e.contactName}` : ""}${e.phone ? ` (${e.phone})` : ""}`,
      )
      .join(" | "),
    diplomaticAmount: doc.diplomaticAmount || 0,
    flycam: doc.flycam,
    video360: doc.video360,
    redFlag: doc.redFlag,
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
    date: doc.date,
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
        ? ["admin", "accountant", "dispatcher", "pilot", "cameraman"]
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
      ? ["admin", "accountant", "dispatcher", "pilot", "cameraman"]
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
      date: doc.date,
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
      collected += thuTotal(d.expenses);
      spent += pilotExpenseTotal(d);
    }
  } else if (session.role === "dispatcher") {
    const docs = await DispatcherDailyReport.find(where).lean<any[]>();
    for (const d of docs) {
      // Chỉ TIỀN MẶT: khoản chuyển khoản vào thẳng tài khoản công ty, điều phối không cầm
      collected += (d.cashReceived || 0) + thuTotal(d.expenses);
      spent += dispatcherExpenseTotal(d);
    }
  } else if (session.role === "cameraman") {
    const docs = await CameramanDailyReport.find(where).lean<any[]>();
    for (const d of docs) {
      collected += thuTotal(d.expenses);
      spent += expenseTotal(d.expenses);
    }
  }
  // Kế toán và quản trị không có báo cáo ngày nên không có tiền thu hộ; họ vẫn
  // khai được khoản đưa tiền, số đang giữ khi đó chỉ là phần đã đưa (số âm).

  /**
   * Chỉ tính lệnh GIAO TIỀN. Tiền ứng là công ty chi ra cho cá nhân, trừ vào
   * lương cuối tháng — không liên quan tới số tiền đang cầm hộ công ty.
   */
  const handovers = await BaobayHandover.find({
    accountId,
    spot,
    kind: { $ne: "advance" },
    ...dateFilter,
  })
    .select("amount confirmed rejected")
    .lean<any[]>();

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
    collected,
    spent,
    handedConfirmed,
    handedPending,
    handedRejected,
    holding: collected - spent - handedConfirmed - handedPending,
  };
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
    account.role === "dispatcher"
      ? DispatcherDailyReport.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>()
      : Promise.resolve([]),
    account.role === "cameraman"
      ? CameramanDailyReport.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>()
      : Promise.resolve([]),
    AccountantDailyClose.find({ spot, date: range, status: "closed" }).select("date").lean<any[]>(),
    BaobayHandover.find({ spot, username, date: range }).sort({ date: 1 }).lean<any[]>(),
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

export type CloseSuggestionDTO = {
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  rescheduled: Array<{ code: string; toDate: string; note: string }>;
  cashTotal: number;
  transferTotal: number;
  /** Flycam lấy theo CAMERA MAN — nguồn chuẩn của dịch vụ này. */
  flycam: number;
  /** Camera 360 lấy theo PHI CÔNG — nguồn chuẩn của dịch vụ này. */
  video360: number;
  flagFlight: number;
  /** Tổng theo TỪNG PHÍA — cho hai nút "lấy số phi công" / "lấy số điều phối". */
  pilot: { flights: number; flycam: number; video360: number; flagFlight: number; hasData: boolean };
  dispatcher: { flycam: number; video360: number; flagFlight: number; hasData: boolean };
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
export async function getCloseSuggestion(spotRaw: string, date: string): Promise<CloseSuggestionDTO> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const filter = { spot, date };
  const [dispatchers, pilots, cameramen] = await Promise.all([
    DispatcherDailyReport.find(filter).lean<any[]>(),
    PilotDailyReport.find(filter).lean<any[]>(),
    CameramanDailyReport.find(filter).lean<any[]>(),
  ]);

  const sum = <T>(list: T[], pick: (x: T) => number) => list.reduce((a, x) => a + (pick(x) || 0), 0);

  const cancelledCodes = [...new Set(dispatchers.flatMap((d) => d.cancelledCodes ?? []))];
  const rescheduled = dispatchers.flatMap((d) =>
    (d.rescheduled ?? []).map((r: any) => ({
      code: r.code || "",
      toDate: r.toDate || "",
      note: r.note || "",
    })),
  );

  return {
    guestCount: sum(dispatchers, (d) => d.guestCount),
    ticketsIssued: sum(dispatchers, (d) => d.ticketsIssued),
    ticketsReturned: sum(dispatchers, (d) => d.ticketsReturned),
    cancelledCount: cancelledCodes.length,
    rescheduledCount: rescheduled.length,
    issuedRanges: dispatchers.flatMap((d) =>
      (d.issuedRanges ?? []).map((r: any) => ({ from: r.from || "", to: r.to || "" })),
    ),
    cancelledCodesText: cancelledCodes.join(", "),
    rescheduled,
    cashTotal: sum(dispatchers, (d) => d.cashReceived),
    transferTotal: sum(dispatchers, (d) => d.transferReceived),
    flycam: sum(cameramen, (c) => c.flycamFlights),
    video360: sum(pilots, (p) => p.video360),
    flagFlight: sum(dispatchers, (d) => d.flagFlight),
    pilot: {
      flights: sum(pilots, (p) => p.flightCount),
      flycam: sum(pilots, (p) => p.flycam),
      video360: sum(pilots, (p) => p.video360),
      flagFlight: sum(pilots, (p) => p.flagFlight),
      hasData: pilots.length > 0,
    },
    dispatcher: {
      flycam: sum(dispatchers, (d) => d.flycam),
      video360: sum(dispatchers, (d) => d.video360),
      flagFlight: sum(dispatchers, (d) => d.flagFlight),
      hasData: dispatchers.length > 0,
    },
    hasData: dispatchers.length + pilots.length + cameramen.length > 0,
  };
}

/* ================================================================== */
/* Chốt ngày của kế toán                                               */
/* ================================================================== */

export type DailyCloseSaveInput = {
  /** Sổ THU/CHI riêng của kế toán: nội dung – số tiền – tick thu/chi. */
  ledger?: Array<{ content: string; amount: number; kind?: "thu" | "chi"; note?: string }>;
  /** Điểm bay của báo cáo — mỗi điểm là một hệ thống riêng. */
  spot: string;
  date: string;
  guestCount: number;
  ticketsIssued: number;
  ticketsReturned: number;
  cancelledCount: number;
  rescheduledCount: number;
  issuedRanges: Array<{ from: string; to: string }>;
  cancelledCodesText: string;
  rescheduled: Array<{ code: string; toDate: string; note?: string }>;
  cashTotal: number;
  transferTotal: number;
  flycam: number;
  video360: number;
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

  const doc = await AccountantDailyClose.findOneAndUpdate(
    { spot, date: input.date },
    {
      $set: {
        accountantId: new mongoose.Types.ObjectId(session.id),
        accountantName: session.name,
        spot,
        guestCount: input.guestCount,
        ticketsIssued: input.ticketsIssued,
        ticketsReturned: input.ticketsReturned,
        cancelledCount: input.cancelledCount,
        rescheduledCount: input.rescheduledCount,
        issuedRanges: ranges,
        cancelledCodes: cancelled.codes,
        rescheduled,
        cashTotal: input.cashTotal,
        transferTotal: input.transferTotal,
        flycam: input.flycam,
        video360: input.video360,
        flagFlight: input.flagFlight,
        ledger,
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
    date: doc.date,
    spot: doc.spot || "",
    accountantName: doc.accountantName || "",
    guestCount: doc.guestCount ?? 0,
    ticketsIssued: doc.ticketsIssued ?? 0,
    ticketsReturned: doc.ticketsReturned ?? 0,
    cancelledCount: doc.cancelledCount ?? 0,
    cancelledCodes: (doc.cancelledCodes || []).join(", "),
    rescheduledCount: doc.rescheduledCount ?? 0,
    rescheduledCodes: formatRescheduled(doc.rescheduled),
    issuedRanges: formatRanges(doc.issuedRanges),
    cashTotal: doc.cashTotal ?? 0,
    transferTotal: doc.transferTotal ?? 0,
    revenueTotal: (doc.cashTotal ?? 0) + (doc.transferTotal ?? 0),
    flycam: doc.flycam ?? 0,
    video360: doc.video360 ?? 0,
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
      date,
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
    { spot, date, flightCount: 0, latePenalty: { $gt: 0 } },
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
    ticketsIssued: doc.ticketsIssued ?? 0,
    ticketsReturned: doc.ticketsReturned ?? 0,
    cancelledCount: doc.cancelledCount ?? 0,
    rescheduledCount: doc.rescheduledCount ?? 0,
    issuedRanges: doc.issuedRanges ?? [],
    cancelledCodes: doc.cancelledCodes ?? [],
    rescheduled: doc.rescheduled ?? [],
    cashTotal: doc.cashTotal ?? 0,
    transferTotal: doc.transferTotal ?? 0,
    flycam: doc.flycam ?? 0,
    video360: doc.video360 ?? 0,
    flagFlight: doc.flagFlight ?? 0,
    ledger: doc.ledger ?? [],
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
export async function resyncSheets(spotRaw: string, from: string, to: string): Promise<ResyncResult> {
  await connectDB();

  const spot = normalizeSpot(spotRaw);
  const range = { $gte: from, $lte: to };
  const result: ResyncResult = { scanned: 0, pushed: 0, failed: [] };

  const [pilots, dispatchers, cameramen, closes, handovers] = await Promise.all([
    PilotDailyReport.find({ spot, date: range, sheetSynced: { $ne: true } }).lean<any[]>(),
    DispatcherDailyReport.find({ spot, date: range, sheetSynced: { $ne: true } }).lean<any[]>(),
    CameramanDailyReport.find({ spot, date: range, sheetSynced: { $ne: true } }).lean<any[]>(),
    AccountantDailyClose.find({ spot, date: range, sheetSynced: { $ne: true } }).lean<any[]>(),
    BaobayHandover.find({ spot, date: range, sheetSynced: { $ne: true } }).lean<any[]>(),
  ]);

  result.scanned =
    pilots.length + dispatchers.length + cameramen.length + closes.length + handovers.length;

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

  const input: ReconcileInput = {
    date,
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
      flagFlight: p.flagFlight ?? 0,
      flagFlightCodes: p.flagFlightCodes ?? [],
      diplomaticGuests: p.diplomaticGuests ?? 0,
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

  /** Danh sách từng khoản chi trong ngày để kế toán đọc rồi xác nhận. */
  const expenseLines: ReconcileDTO["expenseLines"] = [];
  const pushNamed = (who: string, role: BaobayRole, content: string, amount: number) => {
    if (amount > 0) expenseLines.push({ who, role, content, amount });
  };

  for (const p of pilots) {
    pushNamed(p.pilotName, "pilot", "Nước cho khách", p.waterCost ?? 0);
    pushNamed(p.pilotName, "pilot", "Xe cho khách", p.guestCarCost ?? 0);
    for (const e of p.expenses ?? []) {
      expenseLines.push({
        who: p.pilotName,
        role: "pilot",
        // Phi công thi thoảng cầm hộ tiền khách — dán nhãn để kế toán biết đây là tiền PHẢI THU VỀ
        content: e.kind === "thu" ? `[THU tại bãi] ${e.content}` : e.content,
        amount: e.amount,
        note: e.note,
      });
    }
  }
  for (const d of dispatchers) {
    pushNamed(d.staffName, "dispatcher", "Nước cho khách", d.guestWaterCost ?? 0);
    pushNamed(d.staffName, "dispatcher", "Xe lên núi", d.mountainCarCost ?? 0);
    pushNamed(d.staffName, "dispatcher", "Xe đưa đón", d.shuttleCarCost ?? 0);
    for (const e of d.expenses ?? []) {
      expenseLines.push({ who: d.staffName, role: "dispatcher", content: e.content, amount: e.amount, note: e.note });
    }
  }
  // Sổ THU/CHI riêng của kế toán — cũng phải nằm trong bảng chi tiết
  if (close?.ledger?.length) {
    for (const e of close.ledger) {
      expenseLines.push({
        who: close.accountantName || "Kế toán",
        role: "accountant",
        content: e.kind === "thu" ? `[THU] ${e.content}` : e.content,
        amount: e.amount,
        note: e.note,
      });
    }
  }

  for (const c of cameramen) {
    for (const e of c.expenses ?? []) {
      expenseLines.push({
        who: c.cameramanName,
        role: "cameraman",
        content: e.kind === "thu" ? `[THU tại bãi] ${e.content}` : e.content,
        amount: e.amount,
        note: e.note,
      });
    }
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


const EMPTY_ROLLUP: Omit<DailyRollupDTO, "date" | "status" | "blocked"> = {
  issueCount: 0,
  guestCount: 0,
  ticketsIssued: 0,
  ticketsReturned: 0,
  cancelledCount: 0,
  rescheduledCount: 0,
  cashTotal: 0,
  transferTotal: 0,
  revenueTotal: 0,
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

  for (const r of pilotReports) {
    const row = rowFor(r.date);
    row.pilotFlights += r.flightCount;
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
  const totals = closedDays.reduce<Omit<DailyRollupDTO, "date" | "status" | "blocked">>(
    (acc, row) => {
      for (const key of Object.keys(EMPTY_ROLLUP) as Array<keyof typeof EMPTY_ROLLUP>) {
        acc[key] += row[key];
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
        flagFlight: 0,
        diplomaticGuests: 0,
        expenseTotal: 0,
        latePenalty: 0,
        advanceTotal: 0,
        pickupBigC: 0,
        pickupHotel: 0,
        mountainTrips: 0,
      };
    entry.days += 1;
    entry.flights += r.flightCount;
    entry.flycam += r.flycam;
    entry.video360 += r.video360;
    entry.redFlag += r.redFlag;
    entry.flagFlight += r.flagFlight;
    entry.diplomaticGuests += r.diplomaticGuests;
    entry.expenseTotal += pilotExpenseTotal(r);
    entry.latePenalty += r.latePenalty;
    entry.pickupBigC += r.pickupBigC;
    entry.pickupHotel += r.pickupHotel;
    entry.mountainTrips += r.mountainTrips;
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
      flagFlight: 0,
      diplomaticGuests: 0,
      expenseTotal: 0,
      latePenalty: 0,
      advanceTotal: total,
      pickupBigC: 0,
      pickupHotel: 0,
      mountainTrips: 0,
    });
  }

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
    { label: "Thu hộ trong kỳ (collected)", value: inPeriod.collected, money: true },
    {
      label: "Đã đưa quản lý trong kỳ (handed over)",
      value: inPeriod.handedConfirmed + inPeriod.handedPending,
      money: true,
    },
    { label: "Đang giữ tới hôm nay (holding)", value: allTime.holding, money: true },
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
        { label: "Tổng chuyến (flights)", value: sumOf((d) => d.flightCount) },
        { label: "Flycam", value: sumOf((d) => d.flycam) },
        { label: "Camera 360", value: sumOf((d) => d.video360) },
        { label: "Dù cờ đỏ (red flag)", value: sumOf((d) => d.redFlag) },
        { label: "Bay kéo cờ (flag flight)", value: sumOf((d) => d.flagFlight) },
        { label: "Khách ngoại giao (complimentary)", value: sumOf((d) => d.diplomaticGuests) },
        { label: "Phí bãi — khách (site fee, guests)", value: sumOf((d) => d.siteFeeGuests) },
        { label: "Nước cho khách (water)", value: sumOf((d) => d.waterCost), money: true },
        { label: "Xe cho khách (car)", value: sumOf((d) => d.guestCarCost), money: true },
        { label: "Chuyến PPG (PPG flights)", value: sumOf((d) => d.ppgFlights) },
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

  if (session.role === "dispatcher") {
    const docs = await DispatcherDailyReport.find({ accountId, spot, date: range }).lean<any[]>();
    const sumOf = (pick: (d: any) => number) => docs.reduce((s, d) => s + (pick(d) || 0), 0);
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
        { label: "Bay kéo cờ", value: sumOf((d) => d.flagFlight) },
        { label: "Khách ngoại giao", value: sumOf((d) => d.diplomaticGuests) },
        { label: "Tiền mặt", value: sumOf((d) => d.cashReceived), money: true },
        { label: "Chuyển khoản", value: sumOf((d) => d.transferReceived), money: true },
        { label: "Tổng thu", value: sumOf((d) => (d.cashReceived || 0) + (d.transferReceived || 0)), money: true },
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
