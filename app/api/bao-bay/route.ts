// app/api/bao-bay/route.ts
/**
 * Nhận BÁO BAY của phi công bay đơn (trang /baobay).
 *
 * Lưu cơ sở dữ liệu TRƯỚC, thư báo về hộp ban tổ chức gửi SAU khi đã trả lời
 * phi công (after()) — hộp thư chậm hay hỏng thì báo bay vẫn nằm trong sổ và
 * phi công không phải ngồi chờ. Không đẩy Google Sheets (chủ chốt).
 *
 * Phí luôn tính lại ở đây với giờ Việt Nam của MÁY CHỦ — mốc 8h00 của hội viên
 * HNAA không tin đồng hồ trên điện thoại phi công.
 */
import { after, NextResponse } from "next/server";

import {
  baoBayRateLimit,
  memberLookupBlocked,
  memberPhoneBlocked,
  recordMemberFailure,
  recordMemberPhoneFailure,
} from "@/lib/bao-bay-rate";
import {
  BAO_BAY_SPOT_CONFIG,
  FEE_MODE_LABEL,
  memberCodeKey,
  normalizeMemberCode,
  type BaoBayFee,
} from "@/lib/bao-bay";
import { baoBayPilotMail } from "@/lib/email/bao-bay-pilot";
import { makeCancelToken } from "@/lib/bao-bay-token";
import { sendSmtpMail } from "@/lib/mailer";
import { formatVnDate, formatVnd, wingClassLabel, type WingClass } from "@/lib/pilot-event";
import { pilotAdminRecipients } from "@/lib/pilot-sheet";
import type { IFlightNotice } from "@/models/FlightNotice.model";
import { BaoBayError, createBaoBayNotice } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function vnDateTime(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** Thư nội bộ: đủ thông tin để gọi lại phi công và đối chiếu tiền. */
function adminMailHtml(n: IFlightNotice, fee: BaoBayFee): string {
  const rows: Array<[string, string]> = [
    ["Điểm bay", BAO_BAY_SPOT_CONFIG[n.spot].name],
    ["Ngày bay", n.dates.map(formatVnDate).join(", ")],
    ["Họ tên", n.fullName],
    ["CCCD/Hộ chiếu", n.idNumber],
    ["Điện thoại", n.phone],
    ["SĐT khẩn cấp", n.emergencyPhone],
    ["Quốc tịch", `${n.nationality || ""}${n.foreigner ? " (người nước ngoài)" : ""}`],
    ["Email", n.email || ""],
    ["Cánh dù", n.wingClass ? wingClassLabel(n.wingClass as WingClass) : ""],
    ["Bằng / cấp bay", n.licence || ""],
    ["Mã hội viên HNAA", n.memberCode ? `${n.memberCode}${n.memberPhoneUnverified ? " (chưa đối chiếu SĐT — danh sách hội chưa có số)" : ""}` : ""],
    ["Nội quy", n.rulesAcceptedAt ? "Đã chấp nhận Nội quy điểm bay" : ""],
    ["Loại phí", FEE_MODE_LABEL[n.feeMode]],
    ["Vé mua", n.passFrom && n.passValidUntil ? `${formatVnDate(n.passFrom)} – ${formatVnDate(n.passValidUntil)}` : ""],
    ["Nội dung CK", n.transferNote || ""],
    [
      "Thanh toán",
      n.amount > 0
        ? n.paidClaimedAt
          ? "Phi công báo ĐÃ chuyển khoản — cần đối chiếu sao kê rồi bấm \"đã thu\""
          : "Chưa báo chuyển khoản"
        : "",
    ],
    ["Ghi chú", n.note || ""],
  ];

  const infoRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 10px 4px 0;color:#6B7280;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111827;">${esc(v)}</td></tr>`,
    )
    .join("");

  const feeRows = fee.lines
    .map(
      (l) =>
        `<tr><td style="padding:3px 0;font-size:13px;color:#111827;">${esc(l.label)}</td><td align="right" style="padding:3px 0;font-size:13px;font-weight:700;color:${l.amount ? "#111827" : "#15803D"};">${l.amount ? esc(formatVnd(l.amount)) : "Miễn phí"}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:0;background:#F9FAFB;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB;padding:18px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <tr><td style="background:#0F766E;padding:16px 20px;color:#ffffff;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.9;">Báo bay · ${esc(BAO_BAY_SPOT_CONFIG[n.spot].name)}</div>
    <div style="margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:21px;font-weight:800;">${esc(n.noticeCode)}</div>
    <div style="margin-top:5px;font-size:14px;">${esc(n.fullName)} · ${esc(fee.total ? formatVnd(fee.total) : "Miễn phí")}</div>
  </td></tr>
  <tr><td style="padding:16px 20px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${infoRows}</table>
    <div style="margin-top:14px;border-top:2px solid #E5E7EB;padding-top:8px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${feeRows}
        <tr><td style="padding-top:6px;border-top:1px solid #E5E7EB;font-size:14px;font-weight:800;">Tổng</td><td align="right" style="padding-top:6px;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;color:#B45309;">${esc(fee.total ? formatVnd(fee.total) : "Miễn phí")}</td></tr>
      </table>
    </div>
    <div style="margin-top:14px;font-size:12px;color:#6B7280;">Gửi lúc ${esc(vnDateTime(n.submittedAt))} (giờ Việt Nam) · Quản lý tại /admin/baobay</div>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

export async function POST(req: Request) {
  const limited = baoBayRateLimit(req, "submit", 20, 10 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, code: "server", message: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
  }

  if (normalizeMemberCode(body.memberCode)) {
    const blocked = memberLookupBlocked(req) || memberPhoneBlocked(req, memberCodeKey(body.memberCode));
    if (blocked) return blocked;
  }

  let result: Awaited<ReturnType<typeof createBaoBayNotice>>;
  try {
    result = await createBaoBayNotice(body, new Date());
  } catch (e) {
    if (e instanceof BaoBayError) {
      if (e.code === "memberInvalid") recordMemberFailure(req);
      if (e.code === "phoneMismatch") recordMemberPhoneFailure(req, memberCodeKey(body.memberCode));
      return NextResponse.json({ ok: false, code: e.code, message: e.message, ...(e.data ?? {}) }, { status: e.status });
    }
    console.error("[BaoBay] save failed:", e);
    return NextResponse.json(
      { ok: false, code: "server", message: "Không lưu được báo bay, vui lòng thử lại" },
      { status: 500 },
    );
  }

  const { saved, fee, transferNote, member } = result;
  const notice = { ...(saved.toObject() as IFlightNotice), transferNote };

  /**
   * Thư XÁC NHẬN cho phi công: email tự điền, bỏ trống thì hội viên HNAA dùng
   * email trong danh sách hội (không bao giờ hiện ra trang). Không có email nào
   * thì thôi. Ngôn ngữ theo trang phi công đang xem.
   */
  const pilotEmail = notice.email || (member?.email ? String(member.email) : "");
  const lang = String(body.lang ?? "vi").slice(0, 2);
  /** Vé huỷ (ký HMAC) — cho link huỷ một chạm trong thư và ở màn hình gửi xong. */
  const cancelToken = makeCancelToken(saved.noticeCode);

  // Thư báo về ban tổ chức: chạy sau khi đã trả lời, hỏng cũng chỉ ghi log
  after(async () => {
    try {
      await sendSmtpMail({
        to: pilotAdminRecipients(),
        subject: `BÁO BAY ${BAO_BAY_SPOT_CONFIG[notice.spot].name} - ${notice.noticeCode} - ${notice.fullName} - ${fee.total ? formatVnd(fee.total) : "miễn phí"}`,
        html: adminMailHtml(notice, fee),
      });
    } catch (e) {
      console.warn("[BaoBay] admin mail failed:", e);
    }
  });

  if (pilotEmail) {
    after(async () => {
      try {
        const mail = baoBayPilotMail({ notice, fee, transferNote, lang, cancelToken });
        // Gửi từ hộp dangky.mebayluon (chưa có mật khẩu thì hộp mặc định + Reply-To dangky)
        await sendSmtpMail({ to: pilotEmail, subject: mail.subject, html: mail.html, sender: "dangky" });
      } catch (e) {
        console.warn("[BaoBay] pilot confirmation mail failed:", e);
      }
    });
  }

  return NextResponse.json({
    ok: true,
    code: saved.noticeCode,
    spot: saved.spot,
    dates: saved.dates,
    fee,
    transferNote,
    cancelToken,
    submittedAt: saved.submittedAt,
  });
}
