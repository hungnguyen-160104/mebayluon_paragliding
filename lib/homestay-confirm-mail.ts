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
  /**
   * Câu chốt cuối bảng: đơn đã nhận nhưng PHÒNG CHƯA GIỮ CHẮC cho tới khi có
   * cọc. Nói thẳng ra ngay trong thư xác nhận, đừng để khách yên trí là xong
   * rồi tới nơi mới biết phòng đã bán cho người đặt cọc trước.
   */
  holdNote: string;
  address: string;
  contact: string;
  changeNote: string;
  bye: string;
  /** "Lưu ý chuẩn bị" — dặn trước khi khách lên đường, đỡ một cuộc gọi hỏi lại. */
  prepTitle: string;
  /** Dặn chung mọi đơn: bàn chải tự mang, nhà có sẵn gì, giá giặt đồ. */
  prepItems: string[];
  /**
   * Dặn RIÊNG khách ở NHÀ SÀN (mọi hạng trừ phòng gia đình khép kín): sàn gỗ
   * vọng tiếng, vệ sinh chung, không hút thuốc trong nhà.
   */
  stiltItems: string[];
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
    holdNote: "Nhân viên của chúng tôi sẽ liên hệ với quý khách — vui lòng đặt cọc để giữ phòng.",
    address: "Địa chỉ",
    contact: "Liên hệ",
    changeNote: "Cần đổi ngày hoặc huỷ, xin nhắn giúp trước một ngày.",
    prepTitle: "Lưu ý chuẩn bị",
    prepItems: [
      "Homestay KHÔNG có sẵn bàn chải đánh răng — đồ cá nhân vui lòng tự chuẩn bị (nhà hạn chế đồ nhựa dùng một lần).",
      "Có sẵn: khăn tắm, dầu gội, sữa tắm, máy sấy tóc.",
      "Dịch vụ giặt đồ: 30.000đ/kg.",
    ],
    stiltItems: [
      "Nhà sàn gỗ rất nhạy tiếng ồn — vui lòng đi lại nhẹ nhàng, đi nhón chân, không chạy mạnh.",
      "Nhà vệ sinh dùng chung.",
      "Không hút thuốc trong nhà sàn; xin giữ gìn vệ sinh chung.",
    ],
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
    holdNote: "Our staff will contact you shortly — please leave a deposit to hold your room.",
    address: "Address",
    contact: "Contact",
    changeNote: "To change dates or cancel, please let us know a day ahead.",
    prepTitle: "Before you arrive",
    prepItems: [
      "Toothbrushes are NOT provided — please bring your own toiletries (we avoid single-use plastics).",
      "Provided: towels, shampoo, shower gel, hairdryer.",
      "Laundry service: 30,000₫/kg.",
    ],
    stiltItems: [
      "The wooden stilt house carries sound easily — please walk gently, no running.",
      "Bathrooms are shared.",
      "No smoking inside the house; please help keep shared spaces clean.",
    ],
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
    holdNote: "Notre équipe vous contactera — merci de verser un acompte pour garder la chambre.",
    address: "Adresse",
    contact: "Contact",
    changeNote: "Pour modifier ou annuler, prévenez-nous un jour à l’avance.",
    prepTitle: "Avant votre arrivée",
    prepItems: [
      "Les brosses à dents ne sont PAS fournies — merci d’apporter vos affaires de toilette (nous évitons le plastique à usage unique).",
      "Fournis : serviettes, shampoing, gel douche, sèche-cheveux.",
      "Laverie : 30 000₫/kg.",
    ],
    stiltItems: [
      "La maison sur pilotis en bois transmet les sons — merci de marcher doucement, sans courir.",
      "Salles de bain partagées.",
      "Interdiction de fumer à l’intérieur ; merci de garder les lieux propres.",
    ],
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
    holdNote: "Наш сотрудник свяжется с вами — внесите, пожалуйста, задаток, чтобы номер остался за вами.",
    address: "Адрес",
    contact: "Контакт",
    changeNote: "Изменить даты или отменить — сообщите за день.",
    prepTitle: "Перед приездом",
    prepItems: [
      "Зубные щётки НЕ предоставляются — возьмите свои принадлежности (мы избегаем одноразового пластика).",
      "Есть: полотенца, шампунь, гель для душа, фен.",
      "Стирка: 30 000₫/кг.",
    ],
    stiltItems: [
      "Деревянный дом на сваях хорошо проводит звук — ходите, пожалуйста, тихо, не бегайте.",
      "Санузлы общие.",
      "Внутри дома не курят; поддерживайте, пожалуйста, чистоту.",
    ],
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
    holdNote: "我们的工作人员会尽快与您联系 — 请支付订金以保留房间。",
    address: "地址",
    contact: "联系方式",
    changeNote: "如需改期或取消，请提前一天告知。",
    prepTitle: "入住前请注意",
    prepItems: [
      "民宿不提供牙刷——个人洗漱用品请自备（我们不使用一次性塑料用品）。",
      "备有：浴巾、洗发水、沐浴露、吹风机。",
      "洗衣服务：30,000₫/公斤。",
    ],
    stiltItems: [
      "木质高脚屋隔音较差——请轻声走动，勿奔跑。",
      "卫生间为公用。",
      "屋内禁烟；请保持公共卫生。",
    ],
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
    holdNote: "हमारा स्टाफ़ जल्द ही आपसे संपर्क करेगा — कमरा सुरक्षित रखने के लिए कृपया अग्रिम राशि जमा करें।",
    address: "पता",
    contact: "संपर्क",
    changeNote: "तारीख बदलने या रद्द करने के लिए एक दिन पहले बताएँ।",
    prepTitle: "आने से पहले ध्यान दें",
    prepItems: [
      "टूथब्रश उपलब्ध नहीं है — कृपया निजी सामान साथ लाएँ (हम सिंगल-यूज़ प्लास्टिक से बचते हैं)।",
      "उपलब्ध: तौलिया, शैम्पू, बॉडी वॉश, हेयर ड्रायर।",
      "लॉन्ड्री: 30,000₫/किग्रा।",
    ],
    stiltItems: [
      "लकड़ी का स्टिल्ट हाउस आवाज़ जल्दी फैलाता है — कृपया धीरे चलें, दौड़ें नहीं।",
      "बाथरूम साझा हैं।",
      "घर के अंदर धूम्रपान वर्जित; कृपया सफ़ाई बनाए रखें।",
    ],
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
  /**
   * Đơn có phòng NHÀ SÀN không — mọi hạng trừ "phòng gia đình" (whole-home-small,
   * phòng khép kín duy nhất, có vệ sinh riêng). Chỉ đơn thuần phòng gia đình
   * mới khỏi nghe dặn về sàn gỗ vọng tiếng và vệ sinh chung — dặn thừa với
   * khách khép kín thì họ lại tưởng nhầm phòng mình cũng vệ sinh chung.
   */
  const coNhaSan = input.lines.some((l) => l.roomTypeId !== "whole-home-small");
  const luuY = [...w.prepItems, ...(coNhaSan ? w.stiltItems : [])];
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
    `${w.total}: ${tien}`,
    "",
    w.holdNote,
    "",
    `${w.prepTitle.toUpperCase()}:`,
    ...luuY.map((x) => `- ${x}`),
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
    ${row(w.total, `<strong style="color:#b45309">${esc(tien)}</strong>`)}
    ${row(w.address, esc(input.address))}
    ${row(w.contact, `<a href="tel:${esc(input.phone)}" style="color:#0369a1">${esc(input.phone)}</a>`)}
  </table>
  <p style="margin:0 0 12px;padding:10px 12px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;color:#78350f;font-weight:600">${esc(
    w.holdNote,
  )}</p>
  <div style="margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd">
    <p style="margin:0 0 6px;font-weight:700;color:#0c4a6e">${esc(w.prepTitle)}</p>
    <ul style="margin:0;padding-left:18px;color:#0f172a;font-size:14px;line-height:1.6">
      ${luuY.map((x) => `<li>${esc(x)}</li>`).join("")}
    </ul>
  </div>
  <p style="margin:0 0 6px;color:#475569">${esc(w.changeNote)}</p>
  <p style="margin:0 0 16px;font-weight:600">${esc(w.bye)}</p>
  <p style="margin:0;color:#94a3b8;font-size:12px">mebayluon.com</p>
</div>`;

  return { subject: w.subject(input.ref), html, text };
}
