// services/bao-bay.service.ts
/**
 * Nghiệp vụ BÁO BAY (/baobay) phía máy chủ: tra hội viên HNAA, tra vé
 * tháng/năm còn hạn, báo giá và lưu báo bay.
 *
 * Mọi hàm nhận `now` từ ngoài vào thay vì tự gọi new Date(): route truyền giờ
 * thật của máy chủ, còn phép thử truyền giờ cố định để kiểm được mốc 9h00 mà
 * không phải chờ tới sáng.
 */

import { connectDB } from "@/lib/mongodb";
import {
  canCancelDate,
  ALLOW_MEMBER_WITHOUT_PHONE,
  BAO_BAY_SPOT_CONFIG,
  buildNoticeCode,
  buildPaymentNote,
  computeBaoBayFee,
  isBaoBaySpot,
  maskTail,
  memberCodeKey,
  nationalityFromExtra,
  normalizeNationality,
  normalizeIdNumber,
  normalizeMemberCode,
  normalizePhone,
  shortPilotName,
  vnParts,
  VN_NATIONALITY,
  type BaoBayFee,
  type BaoBaySpot,
  type ExistingPass,
  type PurchaseMode,
} from "@/lib/bao-bay";
import { WING_CLASSES, type WingClass } from "@/lib/pilot-event";
import { ensureFlightNoticeIndexes, FlightNotice, type IFlightNotice } from "@/models/FlightNotice.model";
import { ensureHnaaMemberIndexes, HnaaMember, type IHnaaMember } from "@/models/HnaaMember.model";
import { makeCancelToken, readCancelToken } from "@/lib/bao-bay-token";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** Mã lỗi trả về trang — trang tra theo mã để hiện đúng ngôn ngữ. */
export type BaoBayErrorCode =
  | "spot"
  | "dates"
  | "datesPast"
  | "memberInvalid"
  | "name"
  | "id"
  | "phone"
  | "emergencyPhone"
  | "nationality"
  | "payConfirm"
  | "amountChanged"
  | "memberPhone"
  | "phoneMismatch"
  | "phoneLocked"
  | "rules"
  | "email"
  | "cancelNotFound"
  | "server";

export class BaoBayError extends Error {
  constructor(
    public code: BaoBayErrorCode,
    message: string,
    public status = 400,
    /** Dữ liệu kèm lỗi để trang tự sửa (vd. số tiền mới khi phí vừa đổi). */
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ *
 * Hội viên HNAA
 * ------------------------------------------------------------------ */

type MemberDoc = IHnaaMember & { _id: unknown };

/**
 * Hội viên còn hiệu lực theo mã; mã sai hoặc đã tắt đều trả null như nhau.
 *
 * Tra theo KHOÁ (memberCodeKey) để gõ "hnaa 1", "01", "HNAA-01" đều ra một
 * người (chủ 01/10). Bản ghi cũ chưa có codeKey thì còn đường tra theo `code`.
 */
export async function findActiveMember(rawCode: unknown): Promise<MemberDoc | null> {
  const code = normalizeMemberCode(rawCode);
  const key = memberCodeKey(rawCode);
  if (!code || !key || code.length > 40) return null;
  await connectDB();
  return (await HnaaMember.findOne({ active: true, $or: [{ codeKey: key }, { code }] }).lean()) as MemberDoc | null;
}

/**
 * BƯỚC 1 — chỉ hỏi "mã có không" (chủ 01/10): KHÔNG trả tên hay bất cứ thông
 * tin cá nhân nào, để không ai dò lần lượt HNAA-01, 02… mà gom được danh sách
 * tên. Chỉ nói mã có thật, dạng hiển thị chuẩn, và hội viên có SĐT trong danh
 * sách để đối chiếu hay chưa.
 */
export async function checkMemberCode(rawCode: unknown): Promise<{ code: string; hasPhone: boolean } | null> {
  const m = await findActiveMember(rawCode);
  if (!m) return null;
  return { code: m.code, hasPhone: normalizePhone(m.phone).length >= 8 };
}

export type MemberConfirm =
  | { ok: true; member: MemberDoc; phone: string; phoneUnverified: boolean }
  | { ok: false; reason: "invalid" | "phoneMissing" | "phoneMismatch" | "locked" };

/** Sai SĐT tối đa bao nhiêu lần trong một cửa sổ trước khi khoá mã. */
export const MEMBER_PHONE_MAX_FAILS = 5;
const MEMBER_PHONE_LOCK_MS = 15 * 60_000;

function phoneLocked(m: MemberDoc, now = new Date()): boolean {
  return (m.phoneFailCount ?? 0) >= MEMBER_PHONE_MAX_FAILS && !!m.phoneFailUntil && new Date(m.phoneFailUntil) > now;
}

/**
 * Ghi một lần SAI SĐT lên CHÍNH bản ghi hội viên: cửa sổ 15 phút, đủ 5 lần là
 * khoá mã tới hết cửa sổ. Hai bước cập nhật có điều kiện để hai lượt gọi cùng
 * lúc không đếm lệch.
 */
async function recordPhoneFailureDb(m: MemberDoc, now = new Date()): Promise<void> {
  const until = new Date(now.getTime() + MEMBER_PHONE_LOCK_MS);
  const res = await HnaaMember.updateOne(
    { _id: m._id, phoneFailUntil: { $gt: now } },
    { $inc: { phoneFailCount: 1 } },
  );
  if (!res.modifiedCount) {
    await HnaaMember.updateOne({ _id: m._id }, { $set: { phoneFailCount: 1, phoneFailUntil: until } });
  }
}

/**
 * BƯỚC 2 — mã + SĐT. Hội viên có SĐT trong danh sách: SĐT gõ vào phải KHỚP
 * TRỌN (đã chuẩn hoá: chỉ chữ số, +84 → 0). Chưa có SĐT: nếu
 * ALLOW_MEMBER_WITHOUT_PHONE thì nhận, SĐT tự khai được giữ lại và gắn cờ
 * chưa đối chiếu; không thì từ chối như sai SĐT.
 *
 * Máy chủ gọi lại hàm này ở CẢ báo giá lẫn lúc gửi — không tin việc trang đã
 * xác nhận trước đó.
 */
export async function confirmMember(rawCode: unknown, rawPhone: unknown): Promise<MemberConfirm> {
  const m = await findActiveMember(rawCode);
  if (!m) return { ok: false, reason: "invalid" };
  // Mã đang bị khoá vì sai SĐT nhiều lần — kể cả SĐT đúng cũng phải chờ hết giờ
  if (phoneLocked(m)) return { ok: false, reason: "locked" };
  const typed = normalizePhone(rawPhone);
  if (typed.length < 8) return { ok: false, reason: "phoneMissing" };
  const onFile = normalizePhone(m.phone);
  if (onFile.length >= 8) {
    if (onFile === typed) return { ok: true, member: m, phone: String(m.phone), phoneUnverified: false };
    await recordPhoneFailureDb(m);
    return { ok: false, reason: "phoneMismatch" };
  }
  if (!ALLOW_MEMBER_WITHOUT_PHONE) return { ok: false, reason: "phoneMismatch" };
  return { ok: true, member: m, phone: clean(rawPhone, 30), phoneUnverified: true };
}

/** Quốc tịch của hội viên: cột "Quốc tịch" của bảng hội, bản ghi cũ thì tìm trong cột phụ. */
function memberNationality(m: MemberDoc): { foreigner: boolean; nationality: string } {
  return normalizeNationality(m.nationality || nationalityFromExtra(m.extra));
}

/**
 * Phần được phép gửi xuống trình duyệt khi mã đúng: họ tên và vài số cuối.
 * Thiếu trường nào trong danh sách hội thì báo để trang hỏi thêm đúng trường đó.
 */
export function publicMemberView(m: MemberDoc) {
  const nat = memberNationality(m);
  return {
    code: m.code,
    fullName: m.fullName,
    idMasked: maskTail(m.idNumber),
    phoneMasked: maskTail(m.phone),
    /**
     * HỘI VIÊN CHỈ CẦN MÃ (chủ 01/10: "chỉ cần điền mã là được"): danh sách
     * HNAA không có CCCD/SĐT, và không bắt hội viên khai lại gì — ba cờ này
     * luôn false, trang ẩn hẳn các ô đó. Email KHÔNG có mặt ở đây.
     */
    needId: false,
    needPhone: false,
    needEmergencyPhone: false,
    nationality: nat.nationality,
    foreigner: nat.foreigner,
  };
}

/* ------------------------------------------------------------------ *
 * Vé tháng / năm
 * ------------------------------------------------------------------ */

/**
 * Vé tháng/năm phi công đang có ở ĐÚNG điểm bay, nhận ra bằng CCCD HOẶC số
 * điện thoại (một trong hai khớp là đủ — phi công hay đổi số, ít khi đổi CCCD).
 *
 * Khoá quá ngắn thì bỏ: ô CCCD gõ "1" mà đem đi tra là khớp bừa với người khác.
 */
export async function findPasses(input: {
  spot: BaoBaySpot;
  idNorm: string;
  phoneNorm: string;
  /**
   * Hội viên HNAA không có CCCD/SĐT trong danh sách → nhận ra vé tháng/năm của
   * họ bằng MÃ HỘI VIÊN đã lưu trên báo bay mua vé.
   */
  memberCode?: string;
  /** Chỉ lấy vé còn hạn tới ít nhất ngày này. */
  fromDate: string;
}): Promise<ExistingPass[]> {
  const or: Array<Record<string, string>> = [];
  if (input.idNorm.length >= 6) or.push({ idNorm: input.idNorm });
  if (input.phoneNorm.length >= 8) or.push({ phoneNorm: input.phoneNorm });
  if (input.memberCode) or.push({ memberCode: input.memberCode });
  if (!or.length) return [];

  await connectDB();
  const docs = await FlightNotice.find({
    spot: input.spot,
    passValidUntil: { $gte: input.fromDate },
    passFrom: { $exists: true, $ne: null },
    $or: or,
  })
    .select("noticeCode passFrom passValidUntil feeMode purchase")
    .lean();

  return docs
    .filter((d) => d.passFrom && d.passValidUntil)
    .map((d) => ({
      from: d.passFrom as string,
      until: d.passValidUntil as string,
      mode: (d.purchase === "year" || d.feeMode === "year" ? "year" : "month") as "month" | "year",
      noticeCode: d.noticeCode,
    }));
}

/* ------------------------------------------------------------------ *
 * Báo giá và lưu
 * ------------------------------------------------------------------ */

export type BaoBayInput = {
  spot?: unknown;
  dates?: unknown;
  purchase?: unknown;
  memberCode?: unknown;
  /** SĐT đăng ký hội viên — bắt buộc khi có memberCode (bước xác nhận thứ hai). */
  memberPhone?: unknown;
  /** Đã tích "chấp nhận tuân thủ Nội quy" — bắt buộc ở Viên Nam. */
  rulesAccepted?: unknown;
  /** Email (không bắt buộc) — có thì kiểm định dạng, gửi thư xác nhận. */
  email?: unknown;
  fullName?: unknown;
  idNumber?: unknown;
  phone?: unknown;
  emergencyPhone?: unknown;
  nationality?: unknown;
  wingClass?: unknown;
  licence?: unknown;
  note?: unknown;
  /** Chọn "Người nước ngoài" — bắt buộc khai quốc tịch. */
  foreigner?: unknown;
  /** Phi công đã tích "Tôi đã thanh toán phí báo bay". */
  paidConfirmed?: unknown;
  /** Số tiền trang đang hiện (và phi công đã chuyển) — máy chủ so với số tính lại. */
  expectedAmount?: unknown;
};

function parseSpot(v: unknown): BaoBaySpot {
  if (!isBaoBaySpot(v)) throw new BaoBayError("spot", "Chưa chọn điểm bay");
  return v;
}

/**
 * Ngày bay hợp lệ: đúng dạng, không ở quá khứ (theo giờ Việt Nam của máy chủ),
 * không quá xa và không quá nhiều — chặn gửi bừa hàng nghìn ngày.
 */
function parseDates(v: unknown, now: Date): string[] {
  const list = Array.isArray(v)
    ? [...new Set(v.map((d) => clean(d, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
    : [];
  if (!list.length) throw new BaoBayError("dates", "Chưa chọn ngày bay");
  if (list.length > 62) throw new BaoBayError("dates", "Chọn quá nhiều ngày một lần");

  const today = vnParts(now).date;
  if (list[0] < today) throw new BaoBayError("datesPast", "Không báo bay cho ngày đã qua");

  const limit = new Date(now.getTime() + 400 * 86_400_000);
  if (list[list.length - 1] > vnParts(limit).date) {
    throw new BaoBayError("dates", "Ngày bay quá xa");
  }
  return list;
}

function parsePurchase(v: unknown): PurchaseMode {
  return v === "month" || v === "year" ? v : "day";
}

/** Thông tin phi công sau khi ghép dữ liệu hội viên (nếu có) với phần tự khai. */
type ResolvedPilot = {
  fullName: string;
  idNumber: string;
  phone: string;
  emergencyPhone: string;
  member: MemberDoc | null;
  /** Hội viên chưa có SĐT trong danh sách — SĐT là tự khai, chưa đối chiếu. */
  memberPhoneUnverified: boolean;
};

/**
 * Hội viên: họ tên/CCCD/SĐT lấy từ danh sách hội, trang chỉ gửi bù trường nào
 * danh sách còn thiếu. Người thường: lấy nguyên phần tự khai.
 *
 * `memberCode` gửi lên mà sai thì BÁO LỖI chứ không lặng lẽ bỏ qua — nếu không,
 * phi công tưởng mình được miễn rồi mới thấy bị tính tiền.
 */
async function resolvePilot(input: BaoBayInput): Promise<ResolvedPilot> {
  const typed = {
    fullName: clean(input.fullName, 120),
    idNumber: clean(input.idNumber, 40),
    phone: clean(input.phone, 30),
    emergencyPhone: clean(input.emergencyPhone, 30),
  };

  const rawCode = normalizeMemberCode(input.memberCode);
  if (!rawCode) return { ...typed, member: null, memberPhoneUnverified: false };

  /**
   * Hội viên: MÃ + SĐT đăng ký (chủ 01/10). Sai mã / thiếu SĐT / SĐT không
   * khớp đều BÁO LỖI chứ không lặng lẽ tính như người thường — nếu không, phi
   * công tưởng mình được miễn rồi mới thấy bị tính tiền.
   */
  const c = await confirmMember(rawCode, input.memberPhone);
  if (!c.ok) {
    if (c.reason === "invalid") throw new BaoBayError("memberInvalid", "Mã hội viên không đúng");
    if (c.reason === "phoneMissing") throw new BaoBayError("memberPhone", "Nhập số điện thoại đăng ký hội viên để xác nhận");
    if (c.reason === "locked") {
      throw new BaoBayError("phoneLocked", "Nhập sai số điện thoại quá nhiều lần, mã hội viên này tạm khoá 15 phút", 429);
    }
    throw new BaoBayError("phoneMismatch", "Số điện thoại không khớp với hội viên này");
  }
  const member = c.member;

  return {
    fullName: member.fullName || typed.fullName,
    idNumber: normalizeIdNumber(member.idNumber) ? String(member.idNumber) : typed.idNumber,
    // SĐT ĐÃ XÁC NHẬN (hoặc tự khai nếu danh sách chưa có số) — lưu lên báo bay
    phone: c.phone,
    emergencyPhone:
      normalizePhone(member.emergencyPhone).length >= 8
        ? String(member.emergencyPhone)
        : typed.emergencyPhone,
    member,
    memberPhoneUnverified: c.phoneUnverified,
  };
}

export type BaoBayQuote = {
  fee: BaoBayFee;
  /**
   * Nội dung chuyển khoản — biết TRƯỚC khi gửi để phi công trả tiền rồi mới
   * gửi (chủ 30/09). Rỗng khi chưa đủ thông tin (người thường chưa nhập SĐT)
   * hoặc không phải trả đồng nào.
   */
  paymentNote: string;
  member: ReturnType<typeof publicMemberView> | null;
  /** Hôm nay và phút hiện tại theo giờ VN của máy chủ — trang dùng để nhắc mốc 8h. */
  serverToday: string;
  serverMinutes: number;
};

/**
 * Báo giá trước khi gửi — cùng đường tính với lúc lưu, nên con số trang hiện
 * chính là con số sẽ ghi (trừ khi phi công để trang qua mốc 9h00 rồi mới bấm
 * gửi: lúc đó máy chủ tính lại và màn hình kết quả hiện số mới).
 */
export async function quoteBaoBay(input: BaoBayInput, now: Date): Promise<BaoBayQuote> {
  const spot = parseSpot(input.spot);
  const dates = parseDates(input.dates, now);
  const purchase = parsePurchase(input.purchase);
  const pilot = await resolvePilot(input);

  const passes = await findPasses({
    spot,
    idNorm: normalizeIdNumber(pilot.idNumber),
    phoneNorm: normalizePhone(pilot.phone),
    memberCode: pilot.member?.code,
    fromDate: dates[0],
  });

  const fee = computeBaoBayFee({
    spot,
    dates,
    purchase,
    // Thoả thuận HNAA chỉ có ở Viên Nam — mã đúng ở điểm khác cũng không miễn
    hnaaMember: Boolean(pilot.member) && BAO_BAY_SPOT_CONFIG[spot].hnaa,
    passes,
    now,
  });

  const { date, minutes } = vnParts(now);
  const phoneReady = Boolean(pilot.member) || normalizePhone(pilot.phone).length >= 8;
  return {
    paymentNote:
      fee.total > 0 && phoneReady
        ? buildPaymentNote({
            dates,
            phone: pilot.phone,
            memberCode: pilot.member?.code,
            fullName: pilot.fullName,
            spot,
            feeMode: fee.feeMode,
          })
        : "",
    // Báo giá ai gõ số nào cũng gọi được — chỉ nói "còn hạn tới", không lộ mã báo bay của người ta
    fee: fee.coveredByPass ? { ...fee, coveredByPass: { ...fee.coveredByPass, noticeCode: undefined } } : fee,
    member: pilot.member ? publicMemberView(pilot.member) : null,
    serverToday: date,
    serverMinutes: minutes,
  };
}

/**
 * Ghi báo bay mới, tự né mã trùng (cùng ngày bay + cùng 4 số đuôi điện thoại)
 * bằng hậu tố -2, -3… — cùng cách làm với đăng ký /muavang.
 */
async function createWithUniqueCode(baseCode: string, doc: Partial<IFlightNotice>) {
  await ensureFlightNoticeIndexes();
  for (let attempt = 0; attempt < 30; attempt++) {
    const noticeCode = attempt === 0 ? baseCode : `${baseCode}-${attempt + 1}`;
    try {
      return await FlightNotice.create({ ...doc, noticeCode });
    } catch (e: unknown) {
      const dup = typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
      if (!dup) throw e;
    }
  }
  throw new Error("Không sinh được mã báo bay duy nhất");
}

export async function createBaoBayNotice(input: BaoBayInput, now: Date) {
  const spot = parseSpot(input.spot);
  const dates = parseDates(input.dates, now);
  const purchase = parsePurchase(input.purchase);
  const pilot = await resolvePilot(input);

  /**
   * HỘI VIÊN HNAA CHỈ CẦN MÃ (chủ 01/10): tên và quốc tịch lấy từ danh sách
   * hội, không đòi CCCD/SĐT/SĐT khẩn cấp/quốc tịch — dù ngày đó miễn phí hay
   * phải trả (nội dung CK dùng mã hội viên nên cũng không cần SĐT).
   * Người thường: kiểm đủ như trước.
   */
  /**
   * NỘI QUY VIÊN NAM (chủ 01/10): phi công phải tích "chấp nhận tuân thủ" —
   * trang có ô bắt buộc, máy chủ kiểm lại và lưu lúc chấp nhận.
   */
  /** EMAIL không bắt buộc; có điền thì phải đúng dạng cơ bản a@b.c. */
  const email = clean(input.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new BaoBayError("email", "Email chưa đúng định dạng");
  }

  if (spot === "vien-nam" && input.rulesAccepted !== true) {
    throw new BaoBayError("rules", "Vui lòng đọc và chấp nhận Nội quy điểm bay Núi Viên Nam");
  }

  let foreigner: boolean;
  let nationality: string;
  if (pilot.member) {
    if (!pilot.fullName) throw new BaoBayError("name", "Chưa nhập họ tên");
    ({ foreigner, nationality } = memberNationality(pilot.member));
  } else {
    if (!pilot.fullName) throw new BaoBayError("name", "Chưa nhập họ tên");
    if (!normalizeIdNumber(pilot.idNumber)) throw new BaoBayError("id", "Chưa nhập số CCCD/hộ chiếu");
    if (normalizePhone(pilot.phone).length < 8) throw new BaoBayError("phone", "Số điện thoại chưa đúng");
    if (normalizePhone(pilot.emergencyPhone).length < 8) {
      throw new BaoBayError("emergencyPhone", "Số điện thoại khẩn cấp chưa đúng");
    }

    /** QUỐC TỊCH: người nước ngoài BẮT BUỘC khai (chủ 30/09) — "Việt Nam" hay để trống đều không nhận. */
    foreigner = input.foreigner === true || input.foreigner === "true";
    nationality = clean(input.nationality, 60);
    if (foreigner) {
      if (!nationality || /^vi[eệ]t ?nam$/i.test(nationality)) {
        throw new BaoBayError("nationality", "Người nước ngoài phải khai quốc tịch");
      }
    } else {
      nationality = VN_NATIONALITY;
    }
  }

  const idNorm = normalizeIdNumber(pilot.idNumber);
  const phoneNorm = normalizePhone(pilot.phone);

  await connectDB();
  const passes = await findPasses({ spot, idNorm, phoneNorm, memberCode: pilot.member?.code, fromDate: dates[0] });

  const fee = computeBaoBayFee({
    spot,
    dates,
    purchase,
    hnaaMember: Boolean(pilot.member) && BAO_BAY_SPOT_CONFIG[spot].hnaa,
    passes,
    now,
  });

  /**
   * TRẢ TIỀN RỒI MỚI GỬI (chủ 30/09). Tổng 0 đ thì không hỏi gì. Có tiền thì:
   *  - số máy chủ tính lại phải KHỚP số trang đang hiện (phi công đã chuyển theo
   *    số đó) — lệch (vd. vừa qua 9h00) thì báo số mới cho trang vẽ lại QR,
   *    KHÔNG lặng lẽ lưu một số khác với số đã chuyển;
   *  - phải có tích "đã thanh toán" — lưu thành lời khai paidClaimedAt, còn
   *    `paid` vẫn chờ admin đối chiếu sao kê.
   */
  const paymentNote =
    fee.total > 0
      ? buildPaymentNote({
          dates,
          phone: pilot.phone,
          memberCode: pilot.member?.code,
          fullName: pilot.fullName,
          spot,
          feeMode: fee.feeMode,
        })
      : "";
  if (fee.total > 0) {
    const expected = Number(input.expectedAmount);
    if (!Number.isFinite(expected) || expected !== fee.total) {
      throw new BaoBayError(
        "amountChanged",
        `Phí báo bay đã đổi thành ${fee.total.toLocaleString("vi-VN")} đ — vui lòng thanh toán theo mã QR mới`,
        409,
        { amount: fee.total, fee, paymentNote },
      );
    }
    if (input.paidConfirmed !== true) {
      throw new BaoBayError("payConfirm", "Vui lòng thanh toán và tích ô xác nhận trước khi gửi");
    }
  }

  const wingRaw = clean(input.wingClass, 10) as WingClass;
  /**
   * Mã báo bay: BB + ngày + 4 số cuối SĐT. Hội viên không có SĐT trong danh sách
   * thì đuôi là MÃ HỘI VIÊN ("BB261001.HNAA-01") — cùng đuôi với nội dung CK.
   */
  const baseCode =
    normalizePhone(pilot.phone).length >= 4 || !pilot.member
      ? buildNoticeCode(dates, pilot.phone)
      : `${buildNoticeCode(dates, "").split(".")[0]}.${pilot.member.code}`;

  const saved = await createWithUniqueCode(baseCode, {
    spot,
    dates,
    fullName: pilot.fullName,
    idNumber: pilot.idNumber,
    phone: pilot.phone,
    emergencyPhone: pilot.emergencyPhone,
    nationality,
    email: email || undefined,
    foreigner,
    wingClass: WING_CLASSES.includes(wingRaw) ? wingRaw : undefined,
    licence: clean(input.licence, 60) || undefined,
    idNorm,
    phoneNorm,
    memberCode: pilot.member?.code,
    memberId: pilot.member?._id as IFlightNotice["memberId"],
    memberPhoneUnverified: pilot.member ? pilot.memberPhoneUnverified : undefined,
    rulesAcceptedAt: spot === "vien-nam" ? now : undefined,
    feeMode: fee.feeMode,
    purchase,
    feeLines: fee.lines.map((l) => ({ key: l.key, label: l.label, dates: l.dates, amount: l.amount })),
    amount: fee.total,
    passFrom: fee.passFrom,
    passValidUntil: fee.passValidUntil,
    coveredByNotice: fee.coveredByPass?.noticeCode,
    submittedAt: now,
    paidClaimedAt: fee.total > 0 ? now : undefined,
    transferNote: paymentNote || undefined,
    // Không mất đồng nào thì coi như đã xong phần tiền — admin khỏi phải bấm
    paid: fee.total === 0,
    paidAt: fee.total === 0 ? now : undefined,
    note: clean(input.note, 500) || undefined,
  });

  return { saved, fee, transferNote: paymentNote, member: pilot.member };
}

/**
 * DANH SÁCH BÁO BAY HÔM NAY của một điểm — cho trang công khai (chủ 30/09).
 *
 * CHỈ trả số người và tên viết gọn ("N.G. Ngọc"): không SĐT, CCCD, mã hội
 * viên, tiền hay ngày nào khác. Một người báo hai lần trong ngày chỉ tính một.
 */
export async function listTodayPilots(spotRaw: unknown, now: Date): Promise<{ count: number; names: string[] }> {
  const spot = parseSpot(spotRaw);
  const today = vnParts(now).date;
  await connectDB();
  // Ngày đã huỷ thì người đó không còn trong danh sách hôm nay
  const docs = await FlightNotice.find({ spot, dates: today, "cancelledDates.date": { $ne: today } })
    .sort({ submittedAt: 1 })
    .select("fullName idNorm phoneNorm memberCode")
    .limit(500)
    .lean();

  const seen = new Set<string>();
  const names: string[] = [];
  for (const d of docs) {
    // Hội viên không có CCCD/SĐT → nhận ra người trùng bằng mã hội viên
    const key = d.memberCode || d.idNorm || d.phoneNorm || d.fullName;
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(shortPilotName(d.fullName));
  }
  return { count: names.length, names };
}

/* ------------------------------------------------------------------ *
 * NHẬP DANH SÁCH HỘI VIÊN — dùng chung cho trang /admin/baobay và script
 * ------------------------------------------------------------------ */

export type ImportMemberRow = {
  code: string;
  fullName?: string;
  idNumber?: string;
  phone?: string;
  emergencyPhone?: string;
  nationality?: string;
  email?: string;
  extra?: Record<string, unknown>;
};

export type ImportMembersResult = {
  inserted: number;
  updated: number;
  matched: number;
  skipped: string[];
};

/**
 * Ghi đè danh sách hội viên theo KHOÁ MÃ (memberCodeKey): "HNAA-01" và
 * "HNAA-1" là cùng một người. Mã hiển thị lấy đúng như dòng nhập.
 *
 * - Ô TRỐNG không xoá dữ liệu đang có (bảng hội hay thiếu cột).
 * - Nhập lại hội viên đã tắt thì bật lại — có tên trong bảng mới là còn hội viên.
 * - `source` ghi vào importSource để biết bản ghi lấy từ bảng nào.
 *
 * Gọi từ script: `await importMembers(rows, { source: "Danh sach HNAA cap nhat 01/10/26" })`
 * (tự nối DB qua connectDB — nhớ trỏ MONGODB_URI đúng cơ sở dữ liệu).
 */
export async function importMembers(
  rows: ImportMemberRow[],
  opts: { source?: string } = {},
): Promise<ImportMembersResult> {
  const ops: Parameters<typeof HnaaMember.bulkWrite>[0] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const code = normalizeMemberCode(r.code);
    const codeKey = memberCodeKey(r.code);
    const fullName = clean(r.fullName, 120);
    if (!code || !codeKey || code.length > 40) {
      skipped.push(`(thiếu mã) ${fullName}`.trim());
      continue;
    }
    if (seen.has(codeKey)) {
      skipped.push(`${code} (trùng mã trong bảng — lấy dòng đầu)`);
      continue;
    }
    seen.add(codeKey);

    const set: Record<string, unknown> = { active: true, code, codeKey };
    if (fullName) set.fullName = fullName;
    for (const k of ["idNumber", "phone", "emergencyPhone", "nationality"] as const) {
      const v = clean(r[k], 60);
      if (v) set[k] = v;
    }
    const email = clean(r.email, 120).toLowerCase();
    if (email) set.email = email;
    if (opts.source) set.importSource = clean(opts.source, 120);

    // Cột phụ: chỉ nhận cặp chữ–chữ, bỏ dấu chấm/$ ở tên cột (MongoDB không cho)
    if (r.extra && typeof r.extra === "object") {
      const extra: Record<string, string> = {};
      for (const [k, v] of Object.entries(r.extra)) {
        const key = clean(k, 60).replace(/[.$]/g, " ").trim();
        const val = clean(v, 300);
        if (key && val) extra[key] = val;
      }
      if (Object.keys(extra).length) set.extra = extra;
    }

    ops.push({
      updateOne: {
        /**
         * Khớp theo codeKey, HOẶC bản ghi cũ cùng `code` chưa có khoá — để lần
         * nhập đầu sau khi thêm khoá không đẻ ra bản trùng.
         */
        filter: { $or: [{ codeKey }, { code, codeKey: { $exists: false } }] },
        update: {
          $set: set,
          // Hội viên mới mà bảng không có tên thì tạm lấy mã làm tên, sửa sau được
          ...(fullName ? {} : { $setOnInsert: { fullName: code } }),
        },
        upsert: true,
      },
    });
  }

  if (!ops.length) return { inserted: 0, updated: 0, matched: 0, skipped };

  await connectDB();
  await ensureHnaaMemberIndexes();
  const res = await HnaaMember.bulkWrite(ops, { ordered: false });
  return { inserted: res.upsertedCount, updated: res.modifiedCount, matched: res.matchedCount, skipped };
}

/* ------------------------------------------------------------------ *
 * HUỶ BÁO BAY (chủ 01/10) — trước 9h00 ngày bay, từng ngày hoặc cả loạt
 * ------------------------------------------------------------------ */

export type CancelDateView = {
  date: string;
  /** active = còn huỷ được · cancelled = đã huỷ · closed = đã chốt danh sách (qua 9h00) */
  status: "active" | "cancelled" | "closed";
  cancelledAt?: string;
};

export type CancelNoticeView = {
  /** Vé ký HMAC để huỷ báo bay này mà không phải gửi lại SĐT. */
  token: string;
  noticeCode: string;
  spot: BaoBaySpot;
  dates: CancelDateView[];
  amount: number;
  feeMode: string;
  /** Có vé tháng/năm mua trong báo bay này — huỷ ngày KHÔNG huỷ vé. */
  passValidUntil?: string;
  /** Đã trả tiền theo ngày — huỷ không tự hoàn tiền, phải gọi hotline. */
  paidPerDay: boolean;
};

type NoticeDoc = IFlightNotice & { _id: unknown };

/** Ngày đã trả tiền theo ngày (không phải vé tháng/năm) — huỷ thì phải liên hệ hotline. */
function paidPerDay(n: NoticeDoc): boolean {
  return (n.amount ?? 0) > 0 && n.feeMode === "day" && (Boolean(n.paid) || Boolean(n.paidClaimedAt));
}

export function cancelView(n: NoticeDoc, now: Date): CancelNoticeView {
  const huy = new Map((n.cancelledDates ?? []).map((c) => [c.date, c.at]));
  return {
    token: makeCancelToken(n.noticeCode),
    noticeCode: n.noticeCode,
    spot: n.spot,
    dates: [...n.dates].sort().map((date) =>
      huy.has(date)
        ? { date, status: "cancelled" as const, cancelledAt: new Date(huy.get(date) as Date).toISOString() }
        : { date, status: canCancelDate(date, now) ? ("active" as const) : ("closed" as const) },
    ),
    amount: n.amount ?? 0,
    feeMode: n.feeMode,
    passValidUntil: n.passValidUntil,
    paidPerDay: paidPerDay(n),
  };
}

/**
 * TÌM BÁO BAY ĐỂ HUỶ — ba cách nhận ra người huỷ:
 *  - vé ký (link trong thư / đã xác minh trước đó);
 *  - mã báo bay (BB…) + SĐT đã báo bay (so số đã chuẩn hoá);
 *  - mã hội viên HNAA + SĐT đăng ký (cùng luật xác nhận như lúc báo bay) →
 *    mọi báo bay còn ngày chưa tới của hội viên đó.
 * Sai thì trả mảng rỗng + lý do, không nói "mã có nhưng sai SĐT" để khỏi dò.
 */
export async function findNoticesForCancel(
  input: { token?: unknown; code?: unknown; phone?: unknown },
  now: Date,
): Promise<{ notices: CancelNoticeView[]; reason?: "notFound" | "phoneLocked" }> {
  await connectDB();
  const today = vnParts(now).date;

  const byToken = readCancelToken(input.token);
  if (byToken) {
    const n = (await FlightNotice.findOne({ noticeCode: byToken }).lean()) as NoticeDoc | null;
    return { notices: n ? [cancelView(n, now)] : [], ...(n ? {} : { reason: "notFound" as const }) };
  }

  const code = clean(input.code, 60).toUpperCase().replace(/\s+/g, "");
  const phone = normalizePhone(input.phone);
  if (!code || phone.length < 8) return { notices: [], reason: "notFound" };

  if (code.startsWith("BB")) {
    const n = (await FlightNotice.findOne({ noticeCode: code }).lean()) as NoticeDoc | null;
    if (!n || n.phoneNorm !== phone) return { notices: [], reason: "notFound" };
    return { notices: [cancelView(n, now)] };
  }

  // Mã hội viên HNAA + SĐT đăng ký
  const c = await confirmMember(code, input.phone);
  if (!c.ok) return { notices: [], reason: c.reason === "locked" ? "phoneLocked" : "notFound" };
  const docs = (await FlightNotice.find({ memberCode: c.member.code, dates: { $gte: today } })
    .sort({ submittedAt: -1 })
    .limit(30)
    .lean()) as NoticeDoc[];
  return { notices: docs.map((d) => cancelView(d, now)) };
}

export type CancelResult = {
  notice: CancelNoticeView;
  cancelled: string[];
  closed: string[];
  paidPerDay: boolean;
  email: string;
  noticeDoc: NoticeDoc;
};

/**
 * HUỶ NGÀY: chỉ nhận vé ký (lấy từ bước tìm, hoặc link trong thư). Ngày nào
 * còn trước 9h00 (giờ máy chủ) thì ghi vào cancelledDates kèm giờ; ngày đã chốt
 * thì trả về `closed`. KHÔNG xoá báo bay, KHÔNG động tới vé tháng/năm.
 */
export async function cancelNoticeDates(token: unknown, datesRaw: unknown, now: Date): Promise<CancelResult> {
  const code = readCancelToken(token);
  if (!code) throw new BaoBayError("cancelNotFound", "Không tìm thấy báo bay để huỷ", 404);
  await connectDB();
  const n = (await FlightNotice.findOne({ noticeCode: code }).lean()) as NoticeDoc | null;
  if (!n) throw new BaoBayError("cancelNotFound", "Không tìm thấy báo bay để huỷ", 404);

  const want = Array.isArray(datesRaw) ? datesRaw.map((d) => clean(d, 10)) : [];
  const daHuy = new Set((n.cancelledDates ?? []).map((c) => c.date));
  const cancelled: string[] = [];
  const closed: string[] = [];
  for (const d of [...new Set(want)].filter((d) => n.dates.includes(d) && !daHuy.has(d)).sort()) {
    if (canCancelDate(d, now)) cancelled.push(d);
    else closed.push(d);
  }
  if (cancelled.length) {
    await FlightNotice.updateOne(
      { _id: n._id },
      { $push: { cancelledDates: { $each: cancelled.map((date) => ({ date, at: now })) } } },
    );
  }
  const fresh = (await FlightNotice.findById(n._id).lean()) as NoticeDoc;
  let email = fresh.email || "";
  if (!email && fresh.memberCode) {
    const m = await HnaaMember.findOne({ code: fresh.memberCode }).select("email").lean();
    email = m?.email || "";
  }
  return { notice: cancelView(fresh, now), cancelled, closed, paidPerDay: paidPerDay(fresh), email, noticeDoc: fresh };
}

/** Đếm "báo ảo" (không đến bay) và số ngày tự huỷ theo mã hội viên — cho thẻ Hội viên ở admin. */
export async function memberNoShowCounts(): Promise<Record<string, { noShow: number; cancelled: number }>> {
  await connectDB();
  const rows = await FlightNotice.aggregate([
    { $match: { memberCode: { $exists: true, $nin: [null, ""] } } },
    {
      $group: {
        _id: "$memberCode",
        noShow: { $sum: { $size: { $ifNull: ["$noShowDates", []] } } },
        cancelled: { $sum: { $size: { $ifNull: ["$cancelledDates", []] } } },
      },
    },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), { noShow: r.noShow, cancelled: r.cancelled }]));
}
