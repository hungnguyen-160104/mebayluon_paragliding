// services/gmail.service.ts
import { parseAdminEmails, sendSmtpMail } from "@/lib/mailer";
import {
  formatAdminEmailHtml,
  formatCustomerEmailHtml,
  type TelegramBookingPayload,
} from "@/lib/templates";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function postNotifyGmail(payload: TelegramBookingPayload) {
  // validate tối thiểu theo yêu cầu: bookingId/contactName/email
  // payload telegram của bạn đang có contact.email, nên mình validate theo đó.
  const bookingId = String(payload?.bookingId ?? "").trim(); // nếu bạn có
  const contactEmail = String(payload?.contact?.email ?? "").trim();
  const contactName = String((payload as any)?.contactName ?? payload?.contact?.email ?? "").trim(); 
  // ^ Nếu bạn có contactName riêng thì thay dòng này cho đúng.

  if (!payload || typeof payload !== "object") {
    return { ok: false, results: { message: "Invalid payload" } };
  }

  // bookingId có thể chưa có trong payload telegram cũ -> nếu bắt buộc thì check
  // theo yêu cầu của bạn "validate bookingId/contactName/email"
  if (!bookingId) {
    return { ok: false, results: { message: "Missing bookingId" } };
  }
  if (!contactName) {
    return { ok: false, results: { message: "Missing contactName" } };
  }
  if (!contactEmail || !isValidEmail(contactEmail)) {
    return { ok: false, results: { message: "Invalid email" } };
  }

  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

  const results: any = {
    customer: { ok: false, to: contactEmail },
    admin: { ok: false, to: adminEmails },
  };

  // 1) Email cho khách
  try {
    await sendSmtpMail({
      to: contactEmail,
      subject: `Xác nhận đặt bay - ${bookingId}`,
      html: formatCustomerEmailHtml(payload),
      text: `Xác nhận đặt bay - ${bookingId}`,
    });
    results.customer.ok = true;
  } catch (e: any) {
    console.error("[gmail] send customer failed:", e);
    results.customer.error = e?.message ?? "unknown";
  }

  // 2) Email admin (gửi 1 lần cho nhiều admin)
  try {
    if (adminEmails.length > 0) {
      await sendSmtpMail({
        to: adminEmails,
        subject: `NEW BOOKING - ${bookingId} - ${contactName}`,
        html: formatAdminEmailHtml(payload),
        text: `NEW BOOKING ${bookingId} | ${contactName} | ${contactEmail}`,
      });
      results.admin.ok = true;
    } else {
      results.admin.error = "ADMIN_EMAILS empty";
    }
  } catch (e: any) {
    console.error("[gmail] send admin failed:", e);
    results.admin.error = e?.message ?? "unknown";
  }

  // quan trọng: ok=true dù mail fail (để không fail booking)
  return { ok: true, results };
}