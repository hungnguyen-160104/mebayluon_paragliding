// app/api/pilot-registration/route.ts
/**
 * Nhận đăng ký bay của phi công.
 *
 * Thứ tự có chủ đích: lưu cơ sở dữ liệu TRƯỚC, rồi mới đẩy Google Sheets và
 * gửi thư. Bảng tính hay hộp thư hỏng thì đăng ký vẫn còn; ngược lại thì mất
 * hẳn. Vì thế hai bước sau không bao giờ làm hỏng phản hồi trả về cho phi công.
 */

import { NextResponse } from "next/server";

import {
  pilotAdminEmailHtml,
  pilotAdminEmailSubject,
  pilotEmailHtml,
  pilotEmailSubject,
  type PilotEmailInput,
} from "@/lib/email/pilot-registration";
import { sendSmtpMail } from "@/lib/mailer";
import { connectDB } from "@/lib/mongodb";
import {
  KIND_LABEL,
  MOTOR_LABEL,
  PAYMENT_ACCOUNT,
  MUA_VANG_MAX_COMPANIONS,
  PERIODS,
  SITE_FEE_LABEL,
  buildTransferNote,
  WING_CLASSES,
  computePilotFee,
  formatVnDate,
  hasMotor,
  wingClassLabel,
  SHIRT_SIZES,
  type ShirtSize,
  type FlyingKind,
  type MotorType,
  type PeriodKey,
  type SiteFeeMode,
  type WingClass,
} from "@/lib/pilot-event";
import { pilotAdminRecipients, pushPilotRowToSheet } from "@/lib/pilot-sheet";
import { buildVietQrPayload } from "@/lib/vietqr";
import { PilotRegistration } from "@/models/PilotRegistration.model";

const KINDS: FlyingKind[] = ["paragliding", "paramotor", "both"];
const PERIOD_KEYS: PeriodKey[] = ["mua_vang", "le_hoi_com", "ngay_thuong"];
const MOTORS: MotorType[] = ["trike", "foot"];
const WINGS: WingClass[] = WING_CLASSES;

const clean = (v: unknown) => String(v ?? "").trim();

/**
 * Mã đăng ký: MV + ngày bay đầu tiên + 4 số cuối điện thoại.
 * Cùng lối đặt mã với vé khách bay, để ban tổ chức đọc là đoán ngay được ngày.
 */
function buildCode(dates: string[], phone: string): string {
  const first = dates[0] || "";
  const [, m, d] = first.split("-");
  const ddmm = d && m ? `${d}${m}` : "0000";
  const tail = phone.replace(/\D/g, "").slice(-4) || "0000";
  return `MV${ddmm}.${tail}`;
}

/**
 * Ghi bản ghi mới, tự né mã trùng.
 *
 * Mã dựng từ ngày bay + 4 số cuối điện thoại nên hai phi công khác nhau vẫn
 * có thể ra cùng một mã (cùng ngày bay, số đuôi giống nhau), và chính một
 * người đăng ký hai đợt cùng ngày cũng vậy. Trước đây gặp trùng là cả lượt
 * đăng ký hỏng với thông báo chung chung "không lưu được" — phi công không
 * hiểu vì sao và thử lại bao nhiêu lần cũng thế.
 */
async function createWithUniqueCode(
  baseCode: string,
  doc: Record<string, unknown>,
) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = attempt === 0 ? baseCode : `${baseCode}-${attempt + 1}`;
    try {
      return await PilotRegistration.create({ ...doc, code });
    } catch (e: unknown) {
      const dup =
        typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
      if (!dup) throw e;
    }
  }

  throw new Error("Không sinh được mã đăng ký duy nhất");
}

export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Dữ liệu gửi lên không hợp lệ" },
      { status: 400 },
    );
  }

  const fullName = clean(raw.fullName);
  const idNumber = clean(raw.idNumber);
  const nationality = clean(raw.nationality) || "Việt Nam";
  const phone = clean(raw.phone);
  const email = clean(raw.email);
  const address = clean(raw.address);
  const club = clean(raw.club);
  const specialRequest = clean(raw.specialRequest).slice(0, 500);

  // Áo nằm trong combo Mùa Vàng, nhưng ô vẫn hỏi mọi phi công (xem chú
  // thích ở PilotEventClient) nên cứ có gì lưu nấy.
  const shirtRaw = clean(raw.shirtSize) as ShirtSize;
  const shirtSize = SHIRT_SIZES.includes(shirtRaw) ? shirtRaw : undefined;

  const flyingKind = clean(raw.flyingKind) as FlyingKind;
  const period = clean(raw.period) as PeriodKey;
  const motorType = clean(raw.motorType) as MotorType;
  const siteFeeMode = (clean(raw.siteFeeMode) || "day") as SiteFeeMode;

  const companionCount = Math.min(
    MUA_VANG_MAX_COMPANIONS,
    Math.max(0, Math.floor(Number(raw.companionCount) || 0)),
  );

  const dates = Array.isArray(raw.dates)
    ? raw.dates.map(clean).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];
  const wingRaw = clean(raw.wingClass) as WingClass;
  const wingClass = WINGS.includes(wingRaw) ? wingRaw : undefined;

  // ---- kiểm tra bắt buộc ----
  const errors: string[] = [];
  if (!fullName) errors.push("Chưa nhập họ tên");
  if (!idNumber) errors.push("Chưa nhập số CCCD/Passport");
  if (!phone) errors.push("Chưa nhập số điện thoại");
  if (!KINDS.includes(flyingKind)) errors.push("Chưa chọn loại hình bay");
  if (!PERIOD_KEYS.includes(period)) errors.push("Chưa chọn đợt bay");
  if (!dates.length) errors.push("Chưa chọn ngày bay");
  if (hasMotor(flyingKind) && !MOTORS.includes(motorType)) {
    errors.push("Chưa chọn loại máy (trike hoặc foot)");
  }

  if (errors.length) {
    return NextResponse.json(
      { ok: false, message: errors[0], errors },
      { status: 400 },
    );
  }

  const muaVangRegistered = Boolean(raw.muaVangRegistered);
  // Chỉ phi công bay máy mới nhận kéo cờ được — người khác tích cũng bỏ qua.
  const openingFlagFlight =
    hasMotor(flyingKind) && period === "mua_vang" && Boolean(raw.openingFlagFlight);
  const editCode = clean(raw.editCode);

  const fee = computePilotFee({
    openingFlagFlight,
    period,
    kind: flyingKind,
    dates,
    siteFeeMode,
    companionCount,
    muaVangRegistered,
    /**
     * Chọn cỡ áo = muốn lấy áo. Máy chủ TỰ tính lại khoản áo muộn theo ngày hôm
     * nay, không tin số máy khách gửi — nếu không thì sửa vài dòng trên trình
     * duyệt là lấy áo mà không phải đóng thêm.
     */
    wantShirt: Boolean(shirtSize),
  });

  const code = buildCode(dates, phone);
  const createdAt = new Date().toISOString();
  const transferNote = buildTransferNote({
    fullName,
    phone,
    period,
    dates,
    siteFeeMode,
  });

  const emailInput: PilotEmailInput = {
    code,
    fullName,
    idNumber,
    nationality,
    phone,
    email: email || undefined,
    address: address || undefined,
    club: club || undefined,
    specialRequest: specialRequest || undefined,
    shirtSize,
    openingFlagFlight,
    flyingKind,
    motorType: hasMotor(flyingKind) ? motorType : undefined,
    wingClass,
    period,
    dates,
    // Đợt Mùa Vàng thu trọn gói nên không có khái niệm phí điểm bay.
    siteFeeMode: period === "mua_vang" ? undefined : siteFeeMode,
    companionCount: period === "mua_vang" ? companionCount : 0,
    transferNote,
    feeLines: fee.lines,
    feeTotal: fee.total,
    createdAt,
  };

  // ---- 1. lưu cơ sở dữ liệu ----
  let saved;
  try {
    await connectDB();

    /**
     * Con số 50 chỉ là mức ban tổ chức công bố, KHÔNG chặn đăng ký: quá 50 thì
     * trang báo "đã hơn 50 phi công đăng ký" và vẫn nhận, để ban tổ chức tự
     * quyết mở thêm hay xếp danh sách chờ.
     */

    /**
     * Sửa lại đăng ký đã gửi: cập nhật đúng bản ghi cũ thay vì tạo bản mới.
     * Giữ nguyên mã đăng ký kể cả khi khách đổi ngày hay số điện thoại — mã đó
     * phi công đã nhìn thấy và có thể đã ghi vào nội dung chuyển khoản.
     */
    if (editCode) {
      const existing = await PilotRegistration.findOne({ code: editCode });

      if (existing) {
        Object.assign(existing, {
          fullName,
          idNumber,
          nationality,
          phone,
          email: email || undefined,
          address: address || undefined,
          club: club || undefined,
          specialRequest: specialRequest || undefined,
          shirtSize,
          openingFlagFlight,
          flyingKind,
          motorType: emailInput.motorType,
          wingClass,
          period,
          dates,
          siteFeeMode: emailInput.siteFeeMode,
          companionCount: period === "mua_vang" ? companionCount : 0,
          transferNote,
          feeLines: fee.lines,
          feeTotal: fee.total,
        });
        await existing.save();

        return NextResponse.json({
          ok: true,
          code: existing.code,
          feeTotal: fee.total,
          transferNote,
          updated: true,
          emailSent: false,
          sheetSynced: false,
        });
      }
    }

    saved = await createWithUniqueCode(code, {
      fullName,
      idNumber,
      nationality,
      phone,
      email: email || undefined,
      address: address || undefined,
      club: club || undefined,
      specialRequest: specialRequest || undefined,
      shirtSize,
      openingFlagFlight,
      flyingKind,
      motorType: emailInput.motorType,
      wingClass,
      period,
      dates,
      siteFeeMode: emailInput.siteFeeMode,
      companionCount: period === "mua_vang" ? companionCount : 0,
      transferNote,
      feeLines: fee.lines,
      feeTotal: fee.total,
      sheetSynced: false,
      status: "pending",
    });
  } catch (e: unknown) {
    console.error("[PilotRegistration] save failed:", e);
    return NextResponse.json(
      { ok: false, message: "Không lưu được đăng ký, vui lòng thử lại" },
      { status: 500 },
    );
  }

  // Mã có thể khác mã dự kiến nếu vừa né trùng — thư và bảng tính phải ghi
  // đúng mã đã lưu, nếu không phi công cầm một mã mà sổ sách ghi mã khác.
  emailInput.code = saved.code;

  // ---- 2. đẩy sang bảng Google Sheets ----
  const sheet = await pushPilotRowToSheet({
    code: saved.code,
    createdAt,
    fullName,
    idNumber,
    nationality,
    phone,
    email,
    address,
    club,
    specialRequest,
    shirtSize: shirtSize ?? "",
    flagFlight: openingFlagFlight ? "CÓ" : "",
    flyingKind: KIND_LABEL[flyingKind],
    motorType: emailInput.motorType ? MOTOR_LABEL[emailInput.motorType] : "",
    wingClass: wingClass ? wingClassLabel(wingClass) : "",
    period: PERIODS[period].name,
    dates: dates.map(formatVnDate).join(", "),
    dayCount: dates.length,
    companionCount: period === "mua_vang" ? companionCount : 0,
    siteFeeMode: emailInput.siteFeeMode
      ? SITE_FEE_LABEL[emailInput.siteFeeMode]
      : "",
    feeDetail: fee.lines
      .map((l) => `${l.label}: ${l.free ? "miễn phí" : l.amount}`)
      .join(" | "),
    feeTotal: fee.total,
  });

  if (!sheet.ok) {
    console.warn("[PilotRegistration] sheet sync failed:", sheet.error);
  }

  try {
    await PilotRegistration.updateOne(
      { _id: saved._id },
      { sheetSynced: sheet.ok, sheetError: sheet.ok ? undefined : sheet.error },
    );
  } catch {
    // Chỉ là cờ theo dõi, hỏng cũng không ảnh hưởng đăng ký.
  }

  // ---- 3. gửi thư ----
  const mails: Array<Promise<unknown>> = [];

  /**
   * Mã QR chuyển khoản, đính kèm ngay trong thư theo kiểu CID.
   *
   * Vẽ ở máy chủ chứ không nhúng ảnh từ dịch vụ ngoài: hộp thư nào cũng hiện
   * được, kể cả khi khách chặn tải ảnh từ Internet. Vẽ hỏng thì thư vẫn gửi,
   * chỉ thiếu ảnh — số tài khoản và nội dung vẫn nằm dạng chữ bên dưới.
   */
  let qrAttachment: { filename: string; content: Buffer; contentType: string; cid: string } | null =
    null;

  if (email && fee.total > 0) {
    try {
      const QRCode = (await import("qrcode")).default;
      const payload = buildVietQrPayload({
        bankBin: PAYMENT_ACCOUNT.bankBin,
        accountNumber: PAYMENT_ACCOUNT.accountNumber,
        amount: fee.total,
        note: transferNote,
      });

      qrAttachment = {
        filename: "qr-chuyen-khoan.png",
        content: await QRCode.toBuffer(payload, {
          width: 600,
          margin: 1,
          errorCorrectionLevel: "M",
        }),
        contentType: "image/png",
        cid: "pilot-qr",
      };
      emailInput.hasQr = true;
    } catch (e) {
      console.warn("[PilotRegistration] QR render failed:", e);
    }
  }

  if (email) {
    mails.push(
      sendSmtpMail({
        to: email,
        subject: pilotEmailSubject(emailInput),
        html: pilotEmailHtml(emailInput),
        attachments: qrAttachment ? [qrAttachment] : undefined,
      }),
    );
  }

  const admins = pilotAdminRecipients();
  if (admins.length) {
    mails.push(
      sendSmtpMail({
        to: admins,
        subject: pilotAdminEmailSubject(emailInput),
        html: pilotAdminEmailHtml(emailInput),
      }),
    );
  }

  const results = await Promise.allSettled(mails);
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) =>
      console.warn("[PilotRegistration] mail failed:", (r as PromiseRejectedResult).reason),
    );

  return NextResponse.json({
    ok: true,
    code: saved.code,
    feeTotal: fee.total,
    transferNote,
    emailSent: Boolean(email),
    sheetSynced: sheet.ok,
  });
}
