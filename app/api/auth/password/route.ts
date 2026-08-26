// app/api/auth/password/route.ts
import { NextResponse } from "next/server";

import { randomInt } from "crypto";

import bcrypt from "bcryptjs";

import { sendSmtpMail } from "@/lib/mailer";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/middlewares/requireAuth";
import { AdminCredential } from "@/models/AdminCredential.model";
import { validateAdmin } from "@/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ĐỔI MẬT KHẨU khu quản trị website, XÁC NHẬN QUA THƯ.
 *
 * Hai bước, cố ý không gộp làm một:
 *
 *   POST {action:"request", currentPassword, newPassword}
 *        -> kiểm mật khẩu hiện tại, băm sẵn mật khẩu mới rồi TREO lại, gửi mã
 *           6 số về hộp thư chủ.
 *   POST {action:"confirm", code}
 *        -> đúng mã thì mật khẩu mới mới thật sự có hiệu lực.
 *
 * Vì sao phải qua thư: mật khẩu hiện tại có thể đã bị lộ (đó thường là LÝ DO
 * người ta đi đổi). Nếu chỉ cần mật khẩu cũ là đổi được thì kẻ chiếm được tài
 * khoản sẽ đổi mật khẩu và khoá chính chủ ra ngoài. Bắt qua hộp thư chủ nghĩa
 * là muốn chiếm tài khoản phải chiếm được cả hộp thư.
 *
 * Mã gửi tới HỘP THƯ CHỦ dù người đổi là tài khoản nào — kể cả tài khoản biên
 * tập. Đó là chốt để chủ biết có người đang đổi mật khẩu khu quản trị.
 */

/** Hộp thư nhận mã xác nhận. Đổi được bằng biến môi trường, mặc định là hộp chủ. */
const CODE_MAILBOX = process.env.ADMIN_PASSWORD_EMAIL || "mebayluon@gmail.com";

/** Mã sống 10 phút — đủ để mở hộp thư, không đủ để quên rồi ai đó nhặt lại. */
const CODE_TTL_MINUTES = 10;
/** Sai quá số lần này thì huỷ cả yêu cầu, bắt làm lại từ đầu (chống dò mã). */
const MAX_TRIES = 5;
const MIN_PASSWORD = 8;

/** Che địa chỉ khi trả về màn hình: "mebayluon@gmail.com" -> "meb•••@gmail.com". */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 3)}•••@${domain}`;
}

/**
 * Mã 6 chữ số, sinh bằng nguồn ngẫu nhiên của HỆ ĐIỀU HÀNH (không dùng
 * Math.random — nó đoán được, mà đây là mã chặn người chiếm tài khoản).
 */
function makeCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    await connectDB();

    /* ---------------- BƯỚC 1: xin mã ---------------- */
    if (action === "request") {
      const currentPassword = String(body?.currentPassword ?? "");
      const newPassword = String(body?.newPassword ?? "");

      if (newPassword.length < MIN_PASSWORD) {
        return NextResponse.json(
          { message: `Mật khẩu mới phải từ ${MIN_PASSWORD} ký tự trở lên` },
          { status: 400 },
        );
      }
      if (newPassword === currentPassword) {
        return NextResponse.json({ message: "Mật khẩu mới trùng mật khẩu cũ" }, { status: 400 });
      }

      /**
       * Kiểm mật khẩu hiện tại bằng CHÍNH đường đăng nhập — nó tự biết đọc mật
       * khẩu đã đổi trong CSDL hay mật khẩu gốc trong biến môi trường, khỏi
       * chép lại logic ra đây rồi hai bên lệch nhau.
       */
      const level = await validateAdmin(auth.username, currentPassword);
      if (!level) {
        return NextResponse.json({ message: "Mật khẩu hiện tại không đúng" }, { status: 401 });
      }

      const code = makeCode();
      await AdminCredential.updateOne(
        { username: auth.username },
        {
          $set: {
            pendingHash: await bcrypt.hash(newPassword, 10),
            codeHash: await bcrypt.hash(code, 10),
            codeExpiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
            codeTries: 0,
            codeSentTo: CODE_MAILBOX,
            codeRequestedAt: new Date(),
          },
          /**
           * Chỉ ghi TÊN. Cố ý KHÔNG đặt `passwordHash` ở bước này: yêu cầu bỏ
           * dở (không nhập mã) phải không để lại dấu vết nào ảnh hưởng đăng
           * nhập — mật khẩu trong biến môi trường vẫn là nguồn sự thật cho tới
           * khi đổi xong thật sự. Xem chú thích ở models/AdminCredential.model.ts.
           */
          $setOnInsert: { username: auth.username },
        },
        { upsert: true },
      );

      const when = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      await sendSmtpMail({
        to: CODE_MAILBOX,
        subject: `[mebayluon.com] Mã xác nhận đổi mật khẩu quản trị: ${code}`,
        text: `Mã xác nhận: ${code}\n\nCó người vừa yêu cầu đổi mật khẩu tài khoản quản trị "${auth.username}" lúc ${when} (giờ Việt Nam).\nMã sống ${CODE_TTL_MINUTES} phút.\n\nKHÔNG PHẢI BẠN? Đừng nhập mã này. Mật khẩu vẫn giữ nguyên, và nên đổi ngay mật khẩu tài khoản đó vì người kia đang biết mật khẩu hiện tại.`,
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a">
            <p style="margin:0 0 12px">Có người vừa yêu cầu <strong>đổi mật khẩu</strong> tài khoản quản trị
              <strong>${auth.username}</strong> lúc ${when} (giờ Việt Nam).</p>
            <p style="margin:0 0 6px">Mã xác nhận:</p>
            <p style="margin:0 0 16px;font-size:32px;font-weight:800;letter-spacing:6px;font-family:ui-monospace,Menlo,monospace">${code}</p>
            <p style="margin:0 0 12px;color:#475569">Mã sống ${CODE_TTL_MINUTES} phút.</p>
            <p style="margin:0;padding:12px;border-radius:8px;background:#fef2f2;color:#991b1b">
              <strong>Không phải bạn?</strong> Đừng nhập mã này — mật khẩu sẽ giữ nguyên. Nhưng người kia đang
              biết mật khẩu hiện tại, nên hãy đổi mật khẩu tài khoản đó ngay.
            </p>
          </div>`,
      });

      return NextResponse.json({
        ok: true,
        sentTo: maskEmail(CODE_MAILBOX),
        expiresInMinutes: CODE_TTL_MINUTES,
      });
    }

    /* ---------------- BƯỚC 2: xác nhận mã ---------------- */
    if (action === "confirm") {
      const code = String(body?.code ?? "").replace(/\D/g, "");
      const doc = await AdminCredential.findOne({ username: auth.username });
      if (!doc?.pendingHash || !doc?.codeHash) {
        return NextResponse.json(
          { message: "Không có yêu cầu đổi mật khẩu nào đang chờ — bấm Đổi mật khẩu lại từ đầu" },
          { status: 400 },
        );
      }
      if (!doc.codeExpiresAt || doc.codeExpiresAt.getTime() < Date.now()) {
        await clearPending(auth.username);
        return NextResponse.json({ message: "Mã đã hết hạn — làm lại từ đầu" }, { status: 400 });
      }

      if (!(await bcrypt.compare(code, doc.codeHash).catch(() => false))) {
        const tries = (doc.codeTries ?? 0) + 1;
        if (tries >= MAX_TRIES) {
          await clearPending(auth.username);
          return NextResponse.json(
            { message: `Sai mã ${MAX_TRIES} lần — đã huỷ yêu cầu, làm lại từ đầu` },
            { status: 429 },
          );
        }
        await AdminCredential.updateOne({ username: auth.username }, { $set: { codeTries: tries } });
        return NextResponse.json(
          { message: `Mã không đúng — còn ${MAX_TRIES - tries} lần thử` },
          { status: 400 },
        );
      }

      // Đúng mã: mật khẩu mới CHÍNH THỨC có hiệu lực, xoá sạch phần treo
      await AdminCredential.updateOne(
        { username: auth.username },
        {
          $set: { passwordHash: doc.pendingHash, lastChangedAt: new Date() },
          $unset: { pendingHash: "", codeHash: "", codeExpiresAt: "", codeTries: "", codeRequestedAt: "" },
        },
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/auth/password error:", err);
    /**
     * Gửi thư hỏng là lỗi hay gặp nhất ở đây (Gmail đổi mật khẩu ứng dụng, hết
     * hạn…). Nói thẳng ra để người dùng biết đường sửa, đừng để họ ngồi đợi
     * một cái mã không bao giờ tới.
     */
    const msg = err instanceof Error ? err.message : "";
    if (/mail|smtp|EAUTH|ECONN/i.test(msg)) {
      return NextResponse.json(
        { message: `Không gửi được thư chứa mã (${msg}). Mật khẩu chưa đổi — kiểm lại EMAIL_USER / EMAIL_PASS.` },
        { status: 502 },
      );
    }
    return NextResponse.json({ message: "Không xử lý được yêu cầu đổi mật khẩu" }, { status: 500 });
  }
}

/** Bỏ yêu cầu đang treo — mật khẩu đang dùng giữ nguyên. */
async function clearPending(username: string) {
  await AdminCredential.updateOne(
    { username },
    { $unset: { pendingHash: "", codeHash: "", codeExpiresAt: "", codeTries: "", codeRequestedAt: "" } },
  );
}
