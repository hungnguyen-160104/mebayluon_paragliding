// lib/homestay-confirm-mail.ts
/**
 * THƯ XÁC NHẬN ĐẶT PHÒNG HOMESTAY.
 *
 * Khách đặt xong trên /homestay/dat-phong thì màn hình hiện mã đơn — nhưng
 * khách đóng tab là mất, và không có gì để tra lại vào hôm lên đường. Thư này
 * là bản khách giữ: mã đơn, ngày nhận/trả, phòng, tiền, đường tới nhà.
 *
 * Viết theo ĐÚNG NGÔN NGỮ khách đang xem trang — khác thư báo sửa booking bay
 * (sổ nội bộ không lưu ngôn ngữ nên phải song ngữ), ở đây trình duyệt biết rõ
 * khách đang đọc thứ tiếng nào nên gửi thẳng thứ tiếng đó.
 *
 * Hàm THUẦN: dựng chuỗi, không chạm cơ sở dữ liệu, không gửi thư.
 */
import type { HomestayLang } from "@/lib/homestay-data";
import { roomNameOf } from "@/lib/homestay-room-names";

export type HomestayConfirmInput = {
  lang: HomestayLang;
  ref: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  lines: Array<{ roomTypeId: string; qty: number }>;
  amount: number;
  /** Giờ nhận / trả phòng cố định. */
  checkInTime: string;
  checkOutTime: string;
  address: string;
  phone: string;
};

type Words = {
  subject: (ref: string) => string;
  hello: (name: string) => string;
  intro: string;
  ref: string;
  dates: string;
  nights: (n: number) => string;
  rooms: string;
  guests: (a: number, c: number) => string;
  total: string;
  payAtCheckIn: string;
  address: string;
  contact: string;
  changeNote: string;
  bye: string;
};

const W: Record<HomestayLang, Words> = {
  vi: {
    subject: (r) => `Xác nhận đặt phòng ${r} — Mebayluon Homestay`,
    hello: (n) => `Kính gửi ${n || "quý khách"},`,
    intro: "Cảm ơn quý khách đã đặt phòng. Đơn của quý khách đã được xác nhận:",
    ref: "Mã đơn",
    dates: "Nhận – trả phòng",
    nights: (n) => `${n} đêm`,
    rooms: "Phòng đã đặt",
    guests: (a, c) => `${a} người lớn${c ? ` · ${c} trẻ em` : ""}`,
    total: "Tổng tiền",
    payAtCheckIn: "Thanh toán khi nhận phòng.",
    address: "Địa chỉ",
    contact: "Liên hệ",
    changeNote: "Cần đổi ngày hoặc huỷ, xin nhắn giúp trước một ngày.",
    bye: "Hẹn gặp quý khách dưới chân đèo Khau Phạ!",
  },
  en: {
    subject: (r) => `Booking confirmed ${r} — Mebayluon Homestay`,
    hello: (n) => `Dear ${n || "guest"},`,
    intro: "Thank you for your booking. It is confirmed:",
    ref: "Booking ref",
    dates: "Check-in – check-out",
    nights: (n) => `${n} night${n > 1 ? "s" : ""}`,
    rooms: "Rooms booked",
    guests: (a, c) => `${a} adult${a > 1 ? "s" : ""}${c ? ` · ${c} child${c > 1 ? "ren" : ""}` : ""}`,
    total: "Total",
    payAtCheckIn: "Payment on arrival.",
    address: "Address",
    contact: "Contact",
    changeNote: "To change dates or cancel, please let us know a day ahead.",
    bye: "See you at the foot of Khau Pha pass!",
  },
  fr: {
    subject: (r) => `Réservation confirmée ${r} — Mebayluon Homestay`,
    hello: (n) => `Bonjour ${n || ""},`.trim(),
    intro: "Merci pour votre réservation. Elle est confirmée :",
    ref: "Référence",
    dates: "Arrivée – départ",
    nights: (n) => `${n} nuit${n > 1 ? "s" : ""}`,
    rooms: "Chambres réservées",
    guests: (a, c) => `${a} adulte${a > 1 ? "s" : ""}${c ? ` · ${c} enfant${c > 1 ? "s" : ""}` : ""}`,
    total: "Total",
    payAtCheckIn: "Paiement à l’arrivée.",
    address: "Adresse",
    contact: "Contact",
    changeNote: "Pour modifier ou annuler, prévenez-nous un jour à l’avance.",
    bye: "À bientôt au pied du col de Khau Pha !",
  },
  ru: {
    subject: (r) => `Бронь подтверждена ${r} — Mebayluon Homestay`,
    hello: (n) => `Здравствуйте, ${n || "гость"}!`,
    intro: "Спасибо за бронирование. Ваша бронь подтверждена:",
    ref: "Номер брони",
    dates: "Заезд – выезд",
    nights: (n) => `${n} ноч.`,
    rooms: "Забронировано",
    guests: (a, c) => `${a} взрослых${c ? ` · ${c} детей` : ""}`,
    total: "Итого",
    payAtCheckIn: "Оплата при заселении.",
    address: "Адрес",
    contact: "Контакт",
    changeNote: "Изменить даты или отменить — сообщите за день.",
    bye: "Ждём вас у перевала Кхау Фа!",
  },
  zh: {
    subject: (r) => `预订确认 ${r} — Mebayluon Homestay`,
    hello: (n) => `${n || "贵宾"} 您好，`,
    intro: "感谢您的预订，订单已确认：",
    ref: "订单号",
    dates: "入住 – 退房",
    nights: (n) => `${n} 晚`,
    rooms: "已订房型",
    guests: (a, c) => `${a} 位成人${c ? ` · ${c} 位儿童` : ""}`,
    total: "总计",
    payAtCheckIn: "入住时付款。",
    address: "地址",
    contact: "联系方式",
    changeNote: "如需改期或取消，请提前一天告知。",
    bye: "期待在克豪帕山口下与您相见！",
  },
  hi: {
    subject: (r) => `बुकिंग पुष्ट ${r} — Mebayluon Homestay`,
    hello: (n) => `प्रिय ${n || "अतिथि"},`,
    intro: "बुकिंग के लिए धन्यवाद। आपकी बुकिंग पुष्ट हो गई है:",
    ref: "बुकिंग संख्या",
    dates: "चेक-इन – चेक-आउट",
    nights: (n) => `${n} रात`,
    rooms: "बुक किए गए कमरे",
    guests: (a, c) => `${a} वयस्क${c ? ` · ${c} बच्चे` : ""}`,
    total: "कुल",
    payAtCheckIn: "पहुँचने पर भुगतान।",
    address: "पता",
    contact: "संपर्क",
    changeNote: "तारीख बदलने या रद्द करने के लिए एक दिन पहले बताएँ।",
    bye: "खाउ फा दर्रे के नीचे मिलते हैं!",
  },
};

/** "2026-09-25" -> "25/09/2026". Chuỗi lạ thì trả nguyên, không đoán. */
function dmy(key: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(key ?? "");
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHomestayConfirmMail(input: HomestayConfirmInput): {
  subject: string;
  html: string;
  text: string;
} {
  const w = W[input.lang] ?? W.vi;
  const tien = `${Math.round(input.amount).toLocaleString("vi-VN")} đ`;
  const phong = input.lines
    .map((l) => `${roomNameOf(l.roomTypeId, input.lang)} × ${l.qty}`)
    .join("\n");
  const ngay = `${dmy(input.checkIn)} ${input.checkInTime} → ${dmy(input.checkOut)} ${input.checkOutTime} (${w.nights(
    input.nights,
  )})`;

  const text = [
    w.hello(input.guestName),
    "",
    w.intro,
    "",
    `${w.ref}: ${input.ref}`,
    `${w.dates}: ${ngay}`,
    `${w.rooms}:`,
    phong,
    `${w.guests(input.adults, input.children)}`,
    `${w.total}: ${tien} — ${w.payAtCheckIn}`,
    "",
    `${w.address}: ${input.address}`,
    `${w.contact}: ${input.phone}`,
    "",
    w.changeNote,
    w.bye,
    "",
    "mebayluon.com",
  ].join("\n");

  const row = (k: string, v: string) =>
    `<tr><td style="padding:3px 14px 3px 0;color:#475569;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${v}</td></tr>`;

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
  <p style="margin:0 0 12px">${esc(w.hello(input.guestName))}</p>
  <p style="margin:0 0 14px">${esc(w.intro)}</p>
  <table style="border-collapse:collapse;font-size:14px;margin:0 0 16px">
    ${row(w.ref, `<strong style="font-size:16px">${esc(input.ref)}</strong>`)}
    ${row(w.dates, `<strong>${esc(ngay)}</strong>`)}
    ${row(w.rooms, input.lines.map((l) => `${esc(roomNameOf(l.roomTypeId, input.lang))} × ${l.qty}`).join("<br>"))}
    ${row("", esc(w.guests(input.adults, input.children)))}
    ${row(w.total, `<strong style="color:#b45309">${esc(tien)}</strong> — ${esc(w.payAtCheckIn)}`)}
    ${row(w.address, esc(input.address))}
    ${row(w.contact, `<a href="tel:${esc(input.phone)}" style="color:#0369a1">${esc(input.phone)}</a>`)}
  </table>
  <p style="margin:0 0 6px;color:#475569">${esc(w.changeNote)}</p>
  <p style="margin:0 0 16px;font-weight:600">${esc(w.bye)}</p>
  <p style="margin:0;color:#94a3b8;font-size:12px">mebayluon.com</p>
</div>`;

  return { subject: w.subject(input.ref), html, text };
}
