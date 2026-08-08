// services/gmail.service.ts
import fs from "node:fs";
import { spotPageForBooking } from "@/lib/booking/spot-to-location";
import { SITE_URL } from "@/lib/site-config";
import path from "node:path";
import {
  dataUrlToAttachment,
  parseAdminEmails,
  sendSmtpMail,
} from "@/lib/mailer";
import {
  formatAdminEmailHtml,
  formatAdminEmailSubject,
  formatCustomerEmailHtml,
  formatCustomerEmailSubject,
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

  /**
   * Logo đính kèm dạng inline (cid) thay vì trỏ URL ngoài: Gmail và Outlook
   * hay chặn ảnh từ máy chủ lạ cho tới khi người nhận bấm "hiển thị ảnh",
   * còn ảnh đính kèm thì hiện ngay.
   */
  const logo = (() => {
    try {
      const file = path.join(process.cwd(), "public", "logo-mbl.png");
      return {
        filename: "logo-mbl.png",
        content: fs.readFileSync(file),
        contentType: "image/png",
        cid: "mbl-logo",
      };
    } catch {
      return null;
    }
  })();

  // 1) Email cho khách — kèm ảnh vé nếu trình duyệt khách vẽ được ở bước 4
  const ticket = dataUrlToAttachment(
    (payload as any)?.ticketImageBase64,
    `ve-bay-${bookingId}.png`,
  );

  try {
    await sendSmtpMail({
      to: contactEmail,
      subject: formatCustomerEmailSubject(payload),
      html: formatCustomerEmailHtml({
        ...(payload as any),
        hasTicketAttachment: !!ticket,
        spotPageUrl: (() => {
          const path = spotPageForBooking(
            (payload as any)?.location,
            (payload as any)?.flightTypeKey,
          );
          return path ? `${SITE_URL}${path}` : "";
        })(),
        // Không đọc được tệp logo thì quay về ảnh trên web.
        logoSrc: logo ? "cid:mbl-logo" : "https://www.mebayluon.com/logo-mbl.png",
      }),
      text: formatCustomerEmailSubject(payload),
      attachments: [logo, ticket].filter(Boolean) as NonNullable<
        typeof ticket
      >[],
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
        subject: formatAdminEmailSubject(payload),
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