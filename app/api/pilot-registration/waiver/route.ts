// app/api/pilot-registration/waiver/route.ts
/**
 * BIÊN BẢN MIỄN TRỪ TRÁCH NHIỆM — cửa API cho trang ký /muavang/mien-tru.
 *
 * POST {action:"lookup", code, phone} -> thông tin đăng ký của đúng phi công
 *   đó (xác thực bằng CẶP mã đăng ký + số điện thoại đã khai — thiếu một
 *   trong hai là không mở được, tránh người khác tò mò tra hồ sơ).
 * POST {action:"sign", code, phone, email, signature, pdf} -> lưu chữ ký vào
 *   bản ghi đăng ký, gửi PDF đã ký về email phi công và hộp thư BTC.
 *
 * PDF do TRÌNH DUYỆT của phi công dựng (html2canvas + jspdf — đúng cách vé
 * bay đang làm) rồi gửi lên: máy chủ không có font tiếng Việt để tự vẽ PDF,
 * còn ảnh chụp trang thì chữ nào cũng đúng. Giới hạn 3.5MB vì Vercel chặn
 * thân request ở 4.5MB.
 */

import { NextResponse } from "next/server";

import { dataUrlToAttachment, sendSmtpMail } from "@/lib/mailer";
import { connectDB } from "@/lib/mongodb";
import { KIND_LABEL, MOTOR_LABEL, PERIODS, formatVnDate, formatVnd } from "@/lib/pilot-event";
import { WAIVER_VERSION } from "@/lib/pilot-waiver";
import { pilotAdminRecipients } from "@/lib/pilot-sheet";
import { PilotRegistration } from "@/models/PilotRegistration.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Dựng + gửi 2 email kèm PDF có thể quá 10s mặc định. */
export const maxDuration = 30;

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Quy số điện thoại về lõi để so: bỏ hết ký tự thừa, bỏ mã nước 84 hoặc số 0
 * đầu — "+84 912 345 678" và "0912345678" phải được coi là một.
 */
function canonicalPhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.replace(/^(84|0+)/, "");
}

async function findRegistration(code: string, phone: string) {
  const cleanCode = String(code ?? "").trim().toUpperCase();
  const phoneCore = canonicalPhone(phone);
  if (!cleanCode || phoneCore.length < 6) return null;

  const reg = await PilotRegistration.findOne({ code: cleanCode });
  if (!reg || reg.status === "cancelled") return null;
  if (canonicalPhone(reg.phone) !== phoneCore) return null;
  return reg;
}

/** Phần hồ sơ trả cho trang ký — đủ để dựng biên bản, không kèm gì thừa. */
function regDto(reg: InstanceType<typeof PilotRegistration>) {
  return {
    code: reg.code,
    fullName: reg.fullName,
    idNumber: reg.idNumber,
    nationality: reg.nationality,
    phone: reg.phone,
    emergencyPhone: reg.emergencyPhone || "",
    supportPilotName: reg.supportPilotName || "",
    supportPilotPhone: reg.supportPilotPhone || "",
    email: reg.email || "",
    club: reg.club || "",
    flyingKindLabel:
      (KIND_LABEL as Record<string, string>)[reg.flyingKind] ?? reg.flyingKind,
    motorTypeLabel: reg.motorType
      ? ((MOTOR_LABEL as Record<string, string>)[reg.motorType] ?? reg.motorType)
      : "",
    period: reg.period,
    periodName:
      (PERIODS as Record<string, { name: string }>)[reg.period]?.name ?? reg.period,
    dates: (reg.dates ?? []).map((d: string) => formatVnDate(d)),
    shirtSize: reg.shirtSize || "",
    feeTotal: reg.feeTotal ?? 0,
    transferNote: reg.transferNote || "",
    paymentDeclaredAt: reg.paymentDeclaredAt ?? null,
    waiverSignedAt: reg.waiverSignedAt ?? null,
    waiverEmail: reg.waiverEmail || "",
  };
}

function waiverEmailHtml(reg: InstanceType<typeof PilotRegistration>, forAdmin: boolean) {
  const intro = forAdmin
    ? `Phi công <b>${esc(reg.fullName)}</b> (mã <b>${esc(reg.code)}</b>, SĐT ${esc(reg.phone)}) vừa ký biên bản miễn trừ trách nhiệm.`
    : `Chào <b>${esc(reg.fullName)}</b>,<br/>Bạn đã ký thành công biên bản cam kết &amp; miễn trừ trách nhiệm cho sự kiện. Bản PDF đính kèm email này — vui lòng giữ lại và xuất trình khi check-in nếu được yêu cầu.`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C2930;line-height:1.6">
    <p>${intro}</p>
    <table style="border-collapse:collapse;font-size:13px">
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Mã đăng ký</td><td><b>${esc(reg.code)}</b></td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Đợt bay</td><td>${esc((PERIODS as Record<string, { name: string }>)[reg.period]?.name ?? reg.period)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Ngày bay</td><td>${esc((reg.dates ?? []).map((d: string) => formatVnDate(d)).join(", "))}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Tổng phí</td><td>${esc(formatVnd(reg.feeTotal ?? 0))}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Ký lúc</td><td>${esc(
        new Date(reg.waiverSignedAt ?? Date.now()).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      )}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5B6B7A">Bản điều khoản</td><td>${esc(reg.waiverVersion ?? WAIVER_VERSION)}</td></tr>
    </table>
    ${forAdmin ? "" : "<p>Hẹn gặp bạn tại Mebayluon Clubhouse. Chúc bạn bay an toàn và thật đẹp!</p>"}
  </div>`;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const action = String(body?.action ?? "lookup");

  try {
    await connectDB();
    const reg = await findRegistration(String(body?.code ?? ""), String(body?.phone ?? ""));
    if (!reg) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy đăng ký khớp mã và số điện thoại này" },
        { status: 404 },
      );
    }

    if (action === "lookup") {
      return NextResponse.json({ ok: true, registration: regDto(reg) });
    }

    if (action === "sign") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const signature = String(body?.signature ?? "");
      const pdf = String(body?.pdf ?? "");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { ok: false, message: "Email chưa đúng, vui lòng kiểm tra lại" },
          { status: 400 },
        );
      }
      if (!signature.startsWith("data:image/png;base64,") || signature.length > 400_000) {
        return NextResponse.json(
          { ok: false, message: "Chữ ký chưa hợp lệ, vui lòng ký lại" },
          { status: 400 },
        );
      }
      const pdfBase64 = pdf.slice(pdf.lastIndexOf(",") + 1);
      if (!pdf.startsWith("data:application/pdf") || !pdfBase64) {
        return NextResponse.json(
          { ok: false, message: "Không nhận được bản PDF, vui lòng thử lại" },
          { status: 400 },
        );
      }
      if (pdfBase64.length > 3_500_000) {
        return NextResponse.json(
          { ok: false, message: "Bản PDF quá nặng, vui lòng tải lại trang và thử lại" },
          { status: 413 },
        );
      }

      // Ký lại thì thay bản cũ (vẫn là chính chủ — đã xác thực mã + SĐT),
      // email cũng gửi lại: hồ sơ cuối cùng luôn là bản mới nhất.
      reg.waiverSignedAt = new Date();
      reg.waiverEmail = email;
      reg.waiverSignature = signature;
      reg.waiverVersion = WAIVER_VERSION;
      if (!reg.email) reg.email = email;
      await reg.save();

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = Buffer.from(pdfBase64, "base64");
      } catch {
        return NextResponse.json(
          { ok: false, message: "Bản PDF bị lỗi, vui lòng thử lại" },
          { status: 400 },
        );
      }
      const attachment = {
        filename: `bien-ban-mien-tru-${reg.code}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      };
      // Đính kèm luôn ảnh chữ ký rời cho BTC — soi nhanh không cần mở PDF
      const sigAttachment = dataUrlToAttachment(signature, `chu-ky-${reg.code}.png`);

      const results = await Promise.allSettled([
        sendSmtpMail({
          to: email,
          subject: `Biên bản miễn trừ đã ký — ${reg.fullName} (${reg.code})`,
          html: waiverEmailHtml(reg, false),
          attachments: [attachment],
        }),
        (() => {
          const admins = pilotAdminRecipients();
          return admins.length
            ? sendSmtpMail({
                to: admins,
                subject: `[BTC] Phi công ký miễn trừ: ${reg.fullName} (${reg.code})`,
                html: waiverEmailHtml(reg, true),
                attachments: sigAttachment ? [attachment, sigAttachment] : [attachment],
              })
            : Promise.resolve();
        })(),
      ]);
      results.forEach((r, i) => {
        if (r.status === "rejected") console.error("[waiver] gửi mail lỗi", i === 0 ? "(phi công)" : "(BTC)", r.reason);
      });

      return NextResponse.json({
        ok: true,
        registration: regDto(reg),
        emailSent: results[0].status === "fulfilled",
        adminEmailSent: results[1].status === "fulfilled",
      });
    }

    return NextResponse.json({ ok: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err) {
    console.error("[waiver]", err);
    return NextResponse.json(
      { ok: false, message: "Có lỗi máy chủ, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
