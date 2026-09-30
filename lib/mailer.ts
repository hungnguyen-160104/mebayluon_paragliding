// lib/mailer.ts
import nodemailer from "nodemailer";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function parseAdminEmails(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getTransporter() {
  const user = requiredEnv("EMAIL_USER");
  const pass = requiredEnv("EMAIL_PASS");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

/**
 * HỘP GỬI RIÊNG "dangky" — thư xác nhận báo bay gửi cho phi công (chủ 01/10)
 * đi từ dangky.mebayluon@gmail.com, không từ hộp chung mebayluon@gmail.com.
 *
 * Biến môi trường (đặt trên Vercel):
 *   DANGKY_EMAIL_USER = dangky.mebayluon@gmail.com
 *   DANGKY_EMAIL_PASS = mật khẩu ỨNG DỤNG (App Password) của hộp Gmail đó
 * Chưa đặt đủ hai biến thì thư vẫn gửi qua hộp mặc định (EMAIL_USER/EMAIL_PASS,
 * MAIL_FROM) nhưng kèm Reply-To dangky.mebayluon@gmail.com để phi công trả lời
 * vẫn về đúng hộp đăng ký.
 */
export const DANGKY_MAILBOX = "dangky.mebayluon@gmail.com";

function getDangkyTransporter(): { transporter: ReturnType<typeof nodemailer.createTransport>; user: string } | null {
  const user = process.env.DANGKY_EMAIL_USER;
  const pass = process.env.DANGKY_EMAIL_PASS;
  if (!user || !pass) return null;
  return {
    user,
    transporter: nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    }),
  };
}

export async function sendSmtpMail(args: {
  to: string | string[];
  /** Gửi kèm một bản cho người khác — thư về cùng một nội dung, ai cũng thấy. */
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Tệp đính kèm, ví dụ ảnh vé bay dạng base64. */
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
    cid?: string;
  }>;
  /** Địa chỉ nhận thư trả lời. Bỏ trống = như cũ (không đặt Reply-To). */
  replyTo?: string;
  /**
   * Hộp gửi. "default" (mặc định, như mọi chỗ gọi cũ) hoặc "dangky" — xem
   * getDangkyTransporter ở trên.
   */
  sender?: "default" | "dangky";
}) {
  const content = {
    to: args.to,
    cc: args.cc,
    subject: args.subject,
    html: args.html,
    text: args.text,
    attachments: args.attachments,
  };

  if (args.sender === "dangky") {
    const dk = getDangkyTransporter();
    if (dk) {
      return dk.transporter.sendMail({
        ...content,
        from: `"Mebayluon – Báo bay" <${dk.user}>`,
        replyTo: args.replyTo ?? dk.user,
      });
    }
    // Chưa có mật khẩu hộp dangky → gửi qua hộp mặc định, trả lời về dangky
    return getTransporter().sendMail({
      ...content,
      from: process.env.MAIL_FROM || requiredEnv("EMAIL_USER"),
      replyTo: args.replyTo ?? DANGKY_MAILBOX,
    });
  }

  // Đường cũ: y hệt trước đây (replyTo chỉ có khi người gọi truyền vào)
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || requiredEnv("EMAIL_USER");

  return transporter.sendMail({
    from,
    ...content,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  });
}

/**
 * Đổi data URL ("data:image/png;base64,....") thành tệp đính kèm.
 * Trả null nếu chuỗi rỗng hoặc sai định dạng, để việc gửi mail không vỡ chỉ
 * vì trình duyệt khách không vẽ được ảnh vé.
 */
export function dataUrlToAttachment(
  dataUrl: unknown,
  filename: string,
): { filename: string; content: Buffer; contentType: string } | null {
  const raw = String(dataUrl ?? "");
  const m = raw.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;

  try {
    return {
      filename,
      content: Buffer.from(m[2], "base64"),
      contentType: m[1],
    };
  } catch {
    return null;
  }
}