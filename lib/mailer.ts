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
}) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || requiredEnv("EMAIL_USER");

  return transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}