// app/api/bao-bay/cancel/route.ts
/**
 * HUỶ BÁO BAY (chủ 01/10) — hai việc, cùng một cửa:
 *
 *  { action: "lookup", token }              → mở đúng báo bay trong link thư
 *  { action: "lookup", code, phone }        → mã báo bay (BB…) + SĐT đã báo bay,
 *                                             hoặc mã hội viên HNAA + SĐT đăng ký
 *  { action: "cancel", token, dates: [...] } → huỷ các ngày (vé lấy từ bước tìm)
 *
 * Mở link KHÔNG tự huỷ gì: trang chỉ tìm và hiện ngày, phi công phải bấm nút
 * huỷ. Hạn huỷ = 9h00 ngày bay theo giờ MÁY CHỦ (LIST_CLOSE_HOUR). Không xoá
 * báo bay, không động vé tháng/năm; đã trả tiền theo ngày thì không tự hoàn —
 * trang và thư nhắc gọi hotline, admin thấy "huỷ – đã thu tiền".
 */
import { after, NextResponse } from "next/server";

import { baoBayRateLimit, memberLookupBlocked, recordMemberFailure } from "@/lib/bao-bay-rate";
import { baoBayCancelMail } from "@/lib/email/bao-bay-pilot";
import { sendSmtpMail } from "@/lib/mailer";
import { BaoBayError, cancelNoticeDates, findNoticesForCancel } from "@/services/bao-bay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = baoBayRateLimit(req, "cancel", 40, 10 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  try {
    if (body?.action === "cancel") {
      const r = await cancelNoticeDates(body.token, body.dates, now);

      // Thư xác nhận đã huỷ — cùng hộp gửi "dangky" với thư xác nhận báo bay
      if (r.cancelled.length && r.email) {
        const lang = String(body.lang ?? "vi").slice(0, 2);
        after(async () => {
          try {
            const mail = baoBayCancelMail({ notice: r.noticeDoc, cancelled: r.cancelled, paidPerDay: r.paidPerDay, lang });
            await sendSmtpMail({ to: r.email, subject: mail.subject, html: mail.html, sender: "dangky" });
          } catch (e) {
            console.warn("[BaoBay] cancel mail failed:", e);
          }
        });
      }
      return NextResponse.json({
        ok: true,
        cancelled: r.cancelled,
        closed: r.closed,
        paidPerDay: r.paidPerDay,
        notice: r.notice,
      });
    }

    // ---- tìm ----
    const byToken = typeof body?.token === "string" && body.token !== "";
    if (!byToken) {
      // Dò mã + SĐT cũng tính vào giới hạn nhập sai như tra mã hội viên
      const blocked = memberLookupBlocked(req);
      if (blocked) return blocked;
    }
    const r = await findNoticesForCancel({ token: body?.token, code: body?.code, phone: body?.phone }, now);
    if (!r.notices.length) {
      if (!byToken && r.reason !== "phoneLocked") recordMemberFailure(req);
      return NextResponse.json(
        {
          ok: false,
          code: r.reason === "phoneLocked" ? "phoneLocked" : "cancelNotFound",
          message: "Không tìm thấy báo bay khớp mã và số điện thoại",
        },
        { status: r.reason === "phoneLocked" ? 429 : 404 },
      );
    }
    return NextResponse.json({ ok: true, notices: r.notices });
  } catch (e) {
    if (e instanceof BaoBayError) {
      return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status });
    }
    console.error("[BaoBay] cancel failed:", e);
    return NextResponse.json({ ok: false, code: "server", message: "Không huỷ được, vui lòng thử lại" }, { status: 500 });
  }
}
