// services/yeu-cau-huy.service.ts
/**
 * KHÁCH YÊU CẦU HUỶ TRÊN WEB — phần nhân viên xử lý (30/09/2026).
 *
 * Khách bấm "Yêu cầu huỷ" ở /booking/sua → sổ nội bộ có `yeuCauHuyWeb` chờ xử
 * lý, app hiện cảnh báo đỏ. Nhân viên:
 *  - XÁC NHẬN: bấm "✕ Huỷ booking" ngay trong cảnh báo — đi đúng đường huỷ bay
 *    của app (nhập hoàn tiền, mã vé thu hồi…). Huỷ xong, `sauKhiHuy` đánh dấu
 *    yêu cầu đã xác nhận, đổi booking web sang "cancelled", email khách.
 *  - TỪ CHỐI: `tuChoiYeuCauHuy` — bắt ghi lý do, booking giữ nguyên, khách được
 *    sửa lại trên web, email khách lý do.
 *
 * Tách file riêng, KHÔNG import services/baobay.service để baobay.service gọi
 * được `sauKhiHuy` mà không vòng import.
 */
import { Booking } from "@/models/Booking.model";
import { BaobayBooking } from "@/models/BaobayBooking.model";
import { BaobayBookingLog } from "@/models/BaobayBookingLog.model";
import { parseAdminEmails, sendSmtpMail } from "@/lib/mailer";
import { customerEmailHtml, customerEmailSubject } from "@/lib/email/customer-booking";
import { maSoCu } from "@/lib/booking/ma-booking";

const ngayVN = (d: string) => (d?.length === 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || "");

/** Thư cho khách về kết quả yêu cầu huỷ — dùng mẫu thư cập nhật sẵn có. */
async function thuKhach(web: any, dong: string[], huy: boolean) {
  const to = String(web?.contact?.email || "").trim();
  if (!to) return;
  const input = {
    lang: "vi",
    bookingId: web.maBooking || maSoCu(String(web._id)),
    location: web.location,
    locationName: web.locationName,
    dateISO: web.dateISO,
    timeSlot: web.timeSlot,
    guestsCount: web.guestsCount,
    packageLabel: web.packageLabel,
    flightTypeLabel: web.flightTypeLabel,
    contact: web.contact,
    guests: web.guests,
    price: { total: web.price?.total },
    update: { changes: dong, cancelled: huy },
  };
  try {
    await sendSmtpMail({ to, subject: customerEmailSubject(input as any), html: customerEmailHtml(input as any) });
  } catch (e) {
    console.error("yeu-cau-huy: gửi thư khách lỗi", e);
  }
}

/** Thư báo NHÂN VIÊN (ADMIN_EMAILS) — Telegram chập chờn nên thư là kênh chính. */
export async function thuNhanVien(tieuDe: string, dong: string[]) {
  const to = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (!to.length) return;
  const html =
    `<div style="font:14px/1.6 system-ui,sans-serif;color:#0f172a;max-width:640px">` +
    `<h2 style="margin:0 0 8px;font-size:17px">${tieuDe.replace(/</g, "&lt;")}</h2>` +
    dong.map((d) => `<div>${d.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`).join("") +
    `<p style="margin-top:12px;color:#64748b;font-size:12px">Mở app /baocao để xử lý.</p></div>`;
  try {
    await sendSmtpMail({ to: to.join(","), subject: tieuDe, html, text: [tieuDe, ...dong].join("\n") });
  } catch (e) {
    console.error("yeu-cau-huy: gửi thư nhân viên lỗi", e);
  }
}

/**
 * Gọi SAU KHI app huỷ bay xong một booking (updateBookingStatus "cancel"):
 * booking có yêu cầu huỷ đang chờ thì đánh dấu đã xác nhận; booking từ web thì
 * đổi trạng thái web sang huỷ và email khách. Lỗi ở đây không được làm hỏng
 * lệnh huỷ — nơi gọi bọc try.
 */
export async function sauKhiHuy(doc: any, nguoi: { username: string; name?: string }, hoan?: number) {
  const coYeuCau = doc?.yeuCauHuyWeb?.at && !doc.yeuCauHuyWeb.xuLy;
  if (coYeuCau) {
    await BaobayBooking.updateOne(
      { _id: doc._id },
      { $set: { "yeuCauHuyWeb.xuLy": "xac-nhan", "yeuCauHuyWeb.xuLyLuc": new Date(), "yeuCauHuyWeb.xuLyBoi": nguoi.name || nguoi.username } },
    );
  }
  if (!doc?.webBookingId) return;
  const web = await Booking.findById(doc.webBookingId).lean<any>();
  if (!web || web.status === "cancelled") return;
  await Booking.updateOne({ _id: web._id }, { $set: { status: "cancelled" } });
  if (coYeuCau) {
    await thuKhach(
      web,
      [
        "Booking của bạn đã được huỷ theo yêu cầu.",
        hoan && hoan > 0 ? `Số tiền hoàn: ${hoan.toLocaleString("vi-VN")} đ — nhân viên sẽ chuyển trong thời gian sớm nhất.` : "",
      ].filter(Boolean),
      true,
    );
  }
}

/** Nhân viên TỪ CHỐI yêu cầu huỷ — bắt buộc có lý do. */
export async function tuChoiYeuCauHuy(opts: { spot: string; id: string; lyDo: string; nguoi: { username: string; name?: string } }) {
  const lyDo = String(opts.lyDo || "").trim().slice(0, 500);
  if (!lyDo) throw Object.assign(new Error("Ghi lý do từ chối để gửi cho khách"), { status: 400 });
  const doc = await BaobayBooking.findOne({ _id: opts.id, spot: opts.spot }).lean<any>();
  if (!doc) throw Object.assign(new Error("Không tìm thấy booking"), { status: 404 });
  if (!doc.yeuCauHuyWeb?.at || doc.yeuCauHuyWeb.xuLy) throw Object.assign(new Error("Booking này không có yêu cầu huỷ đang chờ"), { status: 409 });
  const ai = opts.nguoi.name || opts.nguoi.username;
  const dong = `[${ai} TỪ CHỐI yêu cầu huỷ của khách] ${lyDo}`;
  await BaobayBooking.updateOne(
    { _id: doc._id },
    {
      $set: {
        "yeuCauHuyWeb.xuLy": "tu-choi",
        "yeuCauHuyWeb.xuLyLuc": new Date(),
        "yeuCauHuyWeb.xuLyBoi": ai,
        "yeuCauHuyWeb.ghiChu": lyDo,
        note: [String(doc.note || "").trim(), dong].filter(Boolean).join("\n"),
      },
    },
  );
  await BaobayBookingLog.create({
    bookingId: doc._id,
    spot: doc.spot,
    op: "api",
    action: "tu-choi-yeu-cau-huy",
    byUsername: opts.nguoi.username,
    byName: opts.nguoi.name,
    update: JSON.stringify({ lyDo }),
    snap: { contactName: doc.contactName, flightDate: doc.flightDate, daySeq: doc.daySeq, status: doc.status, guestCount: doc.guestCount },
    at: new Date(),
  });
  if (doc.webBookingId) {
    /** Gỡ yêu cầu bên web để khách sửa / dời lịch tiếp được. */
    await Booking.updateOne({ _id: doc.webBookingId }, { $unset: { yeuCauHuy: 1 } });
    const web = await Booking.findById(doc.webBookingId).lean<any>();
    if (web) {
      await thuKhach(
        web,
        [
          `Yêu cầu huỷ của bạn chưa được chấp nhận: ${lyDo}`,
          `Booking vẫn giữ nguyên ngày ${ngayVN(web.dateISO)}. Bạn có thể dời lịch tại mebayluon.com/booking/sua hoặc gọi hotline 0964 073 555.`,
        ],
        false,
      );
    }
  }
  const moi = await BaobayBooking.findById(doc._id).lean<any>();
  return moi;
}
