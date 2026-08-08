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

export async function sendSmtpMail(args: {
  to: string | string[];
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
}) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || requiredEnv("EMAIL_USER");

  return transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    attachments: args.attachments,
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