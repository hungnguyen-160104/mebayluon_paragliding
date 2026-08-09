// app/api/pilot-registration/paid/route.ts
/**
 * Phi công tự báo "Tôi đã chuyển khoản cọc".
 *
 * Đây chỉ là LỜI KHAI, không phải xác nhận từ ngân hàng — ban tổ chức vẫn phải
 * đối chiếu sao kê. Vì thế chỉ đóng dấu thời điểm khai vào bản ghi và báo cho
 * ban tổ chức đi kiểm, không đổi trạng thái đơn thành "đã thanh toán".
 */

import { NextResponse } from "next/server";

import { sendSmtpMail } from "@/lib/mailer";
import { connectDB } from "@/lib/mongodb";
import { formatVnd } from "@/lib/pilot-event";
import { pilotAdminRecipients } from "@/lib/pilot-sheet";
import { PilotRegistration } from "@/models/PilotRegistration.model";

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function POST(req: Request) {
  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, message: "Thiếu mã đăng ký" }, { status: 400 });
  }

  let reg;
  try {
    await connectDB();
    reg = await PilotRegistration.findOne({ code });
    if (!reg) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy đăng ký" },
        { status: 404 },
      );
    }

    // Bấm lại lần nữa thì giữ nguyên mốc đầu tiên, tránh ghi đè thời điểm thật.
    if (!reg.paymentDeclaredAt) {
      reg.paymentDeclaredAt = new Date();
      await reg.save();
    }
  } catch (e) {
    console.error("[PilotRegistration] mark paid failed:", e);
    return NextResponse.json(
      { ok: false, message: "Không ghi nhận được, vui lòng thử lại" },
      { status: 500 },
    );
  }

  const admins = pilotAdminRecipients();
  if (admins.length) {
    try {
      await sendSmtpMail({
        to: admins,
        subject: `PHI CÔNG BÁO ĐÃ CỌC - ${reg.code} - ${reg.fullName}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#111827;line-height:1.8;">
          <p style="margin:0 0 10px;"><b>${esc(reg.fullName)}</b> vừa báo đã chuyển khoản cọc.</p>
          <p style="margin:0 0 4px;">Mã đăng ký: <b>${esc(reg.code)}</b></p>
          <p style="margin:0 0 4px;">Số tiền cần nhận: <b style="color:#DC2626;">${formatVnd(reg.feeTotal)}</b></p>
          <p style="margin:0 0 4px;">Nội dung chuyển khoản: <b>${esc(reg.transferNote || "—")}</b></p>
          <p style="margin:0 0 4px;">Điện thoại: <b>${esc(reg.phone)}</b></p>
          <p style="margin:14px 0 0;color:#B45309;">Đây là lời khai của phi công — vui lòng đối chiếu sao kê trước khi xác nhận.</p>
        </div>`,
      });
    } catch (e) {
      console.warn("[PilotRegistration] paid mail failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
