// lib/baobay/booking-change-mail.ts
/**
 * THƯ BÁO KHÁCH KHI BOOKING THAY ĐỔI.
 *
 * Nhân viên sửa booking ngay trên app (đổi giờ hẹn, thêm cờ bánh, dời lịch,
 * huỷ, hoàn tiền…). Trước đây khách chỉ biết nếu có ai đó nhớ nhắn tay — mà
 * đúng những hôm đông khách thì không ai nhớ, và khách vẫn đến theo giờ cũ.
 *
 * VÌ SAO SONG NGỮ VIỆT–ANH: sổ nội bộ không lưu ngôn ngữ của khách. Đoán sai
 * ngôn ngữ còn tệ hơn không đoán — khách Tây nhận thư toàn tiếng Việt là coi
 * như chưa được báo. Hai thứ tiếng trong một thư thì ai cũng đọc được phần của
 * mình, đổi lại thư dài hơn một chút.
 *
 * Toàn bộ tệp này là hàm THUẦN: dựng chuỗi, không chạm cơ sở dữ liệu, không
 * gửi thư. Nhờ vậy bộ phép thử soi được từng dòng chữ mà không cần Mongo lẫn
 * SMTP.
 */

/** Một thay đổi, kể bằng hai thứ tiếng. */
export type BookingChange = { vi: string; en: string };

/** Ảnh chụp booking ở một thời điểm — chỉ những trường khách quan tâm. */
export type BookingSnapshot = {
  flightDate?: string;
  expectedTime?: string;
  guestCount?: number;
  ppgGuests?: number;
  flycam?: number;
  video360?: number;
  redFlag?: number;
  sunset?: number;
  flagFlight?: number;
  mountainCar?: number;
  pickup?: string;
  pickupNote?: string;
  totalAmount?: number;
  deposit?: number;
  remaining?: number;
  refundedTotal?: number;
  status?: string;
};

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} đ`;
const usdish = (n: number) => `${Math.round(n).toLocaleString("en-US")} VND`;

/** "2026-08-25" -> "25/08/2026". Chuỗi lạ thì trả nguyên, không đoán. */
export function dmy(key?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(key ?? "");
}

/** Tên dịch vụ trên thư — đúng chữ khách thấy lúc đặt. */
const SERVICE_LABEL: Record<string, { vi: string; en: string }> = {
  flycam: { vi: "Quay flycam", en: "Drone video" },
  video360: { vi: "Camera 360", en: "360° camera" },
  redFlag: { vi: "Dù cờ đỏ sao vàng", en: "Vietnam flag wing" },
  sunset: { vi: "Bay hoàng hôn", en: "Sunset flight" },
  flagFlight: { vi: "Bay kéo cờ/bánh", en: "Banner/cake flight" },
  mountainCar: { vi: "Xe lên núi", en: "Mountain transfer" },
};

const PICKUP_LABEL: Record<string, { vi: string; en: string }> = {
  self: { vi: "Khách tự đến", en: "Guest arrives on their own" },
  bigc: { vi: "Đón tại BigC", en: "Pick-up at BigC" },
  hotel: { vi: "Đón tại khách sạn", en: "Hotel pick-up" },
  other: { vi: "Đón tại điểm hẹn", en: "Pick-up at agreed spot" },
};

/**
 * SO HAI ẢNH CHỤP, kể ra những gì khách cần biết.
 *
 * Chỉ kể thứ KHÁCH thấy được: ngày giờ, số khách, dịch vụ, đón đưa, tiền. Sửa
 * ghi chú nội bộ hay đổi người phụ trách thì không phải việc của khách, kể ra
 * chỉ làm thư nhiễu và khách hoang mang.
 */
export function diffBooking(before: BookingSnapshot, after: BookingSnapshot): BookingChange[] {
  const out: BookingChange[] = [];
  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

  if ((before.flightDate || "") !== (after.flightDate || "")) {
    out.push({
      vi: `Ngày bay: ${dmy(before.flightDate)} → ${dmy(after.flightDate)}`,
      en: `Flight date: ${dmy(before.flightDate)} → ${dmy(after.flightDate)}`,
    });
  }
  if ((before.expectedTime || "") !== (after.expectedTime || "")) {
    const b = before.expectedTime || "chưa hẹn";
    const a = after.expectedTime || "chưa hẹn";
    out.push({
      vi: `Giờ hẹn: ${b} → ${a}`,
      en: `Meeting time: ${before.expectedTime || "not set"} → ${after.expectedTime || "not set"}`,
    });
  }
  if (n(before.guestCount) !== n(after.guestCount)) {
    out.push({
      vi: `Số khách bay: ${n(before.guestCount)} → ${n(after.guestCount)}`,
      en: `Number of guests: ${n(before.guestCount)} → ${n(after.guestCount)}`,
    });
  }
  if (n(before.ppgGuests) !== n(after.ppgGuests)) {
    out.push({
      vi: `Khách bay dù máy (PPG): ${n(before.ppgGuests)} → ${n(after.ppgGuests)}`,
      en: `Powered paraglider guests: ${n(before.ppgGuests)} → ${n(after.ppgGuests)}`,
    });
  }

  for (const key of Object.keys(SERVICE_LABEL)) {
    const b = n((before as Record<string, unknown>)[key]);
    const a = n((after as Record<string, unknown>)[key]);
    if (b === a) continue;
    const label = SERVICE_LABEL[key];
    if (a === 0) {
      out.push({ vi: `Bỏ dịch vụ: ${label.vi} (${b})`, en: `Removed: ${label.en} (${b})` });
    } else if (b === 0) {
      out.push({ vi: `Thêm dịch vụ: ${label.vi} × ${a}`, en: `Added: ${label.en} × ${a}` });
    } else {
      out.push({ vi: `${label.vi}: ${b} → ${a}`, en: `${label.en}: ${b} → ${a}` });
    }
  }

  if ((before.pickup || "") !== (after.pickup || "") || (before.pickupNote || "") !== (after.pickupNote || "")) {
    const bl = PICKUP_LABEL[before.pickup || "self"] ?? PICKUP_LABEL.self;
    const al = PICKUP_LABEL[after.pickup || "self"] ?? PICKUP_LABEL.self;
    const bn = before.pickupNote ? ` (${before.pickupNote})` : "";
    const an = after.pickupNote ? ` (${after.pickupNote})` : "";
    out.push({ vi: `Đón đưa: ${bl.vi}${bn} → ${al.vi}${an}`, en: `Transfer: ${bl.en}${bn} → ${al.en}${an}` });
  }

  if ((before.status || "") !== (after.status || "") && after.status === "cancelled") {
    out.push({ vi: "Chuyến bay đã được HUỶ", en: "This flight has been CANCELLED" });
  }

  if (n(before.totalAmount) !== n(after.totalAmount)) {
    out.push({
      vi: `Tổng tiền: ${vnd(n(before.totalAmount))} → ${vnd(n(after.totalAmount))}`,
      en: `Total: ${usdish(n(before.totalAmount))} → ${usdish(n(after.totalAmount))}`,
    });
  }
  if (n(before.refundedTotal) !== n(after.refundedTotal)) {
    const back = n(after.refundedTotal) - n(before.refundedTotal);
    if (back > 0) {
      out.push({ vi: `Hoàn lại quý khách: ${vnd(back)}`, en: `Refunded to you: ${usdish(back)}` });
    }
  }

  return out;
}

/** Dòng "hiện trạng" cuối thư — khách nhìn một chỗ là biết còn phải làm gì. */
export type BookingMailInfo = {
  guestName: string;
  bookingCode: string;
  spotName: string;
  /** Số điện thoại/đường liên hệ in cuối thư. */
  hotline: string;
};

export type BuiltMail = { subject: string; html: string; text: string };

/**
 * DỰNG THƯ. Không có thay đổi nào thì trả `null` — chỗ gọi đừng gửi thư rỗng,
 * khách nhận thư "booking của bạn vừa thay đổi" mà bên trong trống là mất
 * lòng tin vào mọi thư sau đó.
 */
export function buildBookingChangeMail(
  info: BookingMailInfo,
  changes: BookingChange[],
  now: BookingSnapshot,
): BuiltMail | null {
  if (changes.length === 0) return null;

  const huy = now.status === "cancelled";
  const ngay = dmy(now.flightDate);
  const subject = huy
    ? `Huỷ chuyến bay ${ngay}${info.bookingCode ? ` · ${info.bookingCode}` : ""} / Flight cancelled`
    : `Cập nhật đặt chỗ ${ngay}${info.bookingCode ? ` · ${info.bookingCode}` : ""} / Booking updated`;

  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  const conLai = n(now.remaining);

  const dongThayDoiVi = changes.map((c) => `• ${c.vi}`).join("\n");
  const dongThayDoiEn = changes.map((c) => `• ${c.en}`).join("\n");

  /** Bảng hiện trạng — chỉ in dòng có nội dung, tránh một rừng "0". */
  const dichVu = (["flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"] as const)
    .filter((k) => n((now as Record<string, unknown>)[k]) > 0)
    .map((k) => `${SERVICE_LABEL[k].vi} × ${n((now as Record<string, unknown>)[k])}`)
    .join(", ");

  /** `null` = dòng không có nội dung, bỏ hẳn. Chuỗi rỗng vẫn giữ vì đó là dòng trắng ngăn đoạn. */
  const text = ([
    `Kính gửi ${info.guestName || "quý khách"},`,
    ``,
    huy
      ? `Chuyến bay của quý khách tại ${info.spotName} đã được huỷ. Chi tiết:`
      : `Đặt chỗ của quý khách tại ${info.spotName} vừa được cập nhật. Những thay đổi:`,
    dongThayDoiVi,
    ``,
    `HIỆN TRẠNG ĐẶT CHỖ`,
    `Ngày bay: ${ngay}${now.expectedTime ? ` · giờ hẹn ${now.expectedTime}` : ""}`,
    `Số khách: ${n(now.guestCount)}`,
    dichVu ? `Dịch vụ kèm: ${dichVu}` : null,
    `Tổng tiền: ${vnd(n(now.totalAmount))}`,
    `Đã thanh toán: ${vnd(n(now.deposit))}`,
    conLai > 0 ? `Còn lại phải trả: ${vnd(conLai)}` : `Đã thanh toán đủ.`,
    ``,
    `Nếu có chỗ nào chưa đúng, xin liên hệ ngay ${info.hotline}.`,
    ``,
    `— — — — —`,
    ``,
    `Dear ${info.guestName || "guest"},`,
    ``,
    huy
      ? `Your flight at ${info.spotName} has been cancelled. Details:`
      : `Your booking at ${info.spotName} has just been updated. What changed:`,
    dongThayDoiEn,
    ``,
    `CURRENT BOOKING`,
    `Date: ${ngay}${now.expectedTime ? ` · meeting at ${now.expectedTime}` : ""}`,
    `Guests: ${n(now.guestCount)}`,
    `Total: ${usdish(n(now.totalAmount))}`,
    `Paid: ${usdish(n(now.deposit))}`,
    conLai > 0 ? `Balance due: ${usdish(conLai)}` : `Fully paid.`,
    ``,
    `If anything looks wrong, please contact us at ${info.hotline}.`,
    ``,
    `mebayluon.com`,
  ] as Array<string | null>)
    .filter((line): line is string => line !== null)
    .join("\n");

  const li = (items: string[]) => items.map((x) => `<li style="margin:2px 0">${esc(x)}</li>`).join("");

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
  <p style="margin:0 0 12px">Kính gửi <strong>${esc(info.guestName || "quý khách")}</strong>,</p>
  <p style="margin:0 0 8px">${
    huy
      ? `Chuyến bay của quý khách tại <strong>${esc(info.spotName)}</strong> đã được huỷ.`
      : `Đặt chỗ của quý khách tại <strong>${esc(info.spotName)}</strong> vừa được cập nhật.`
  }</p>
  <ul style="margin:0 0 14px;padding-left:20px">${li(changes.map((c) => c.vi))}</ul>

  <table style="border-collapse:collapse;font-size:14px;margin:0 0 14px">
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Ngày bay</td><td style="padding:2px 0"><strong>${esc(ngay)}</strong>${
      now.expectedTime ? ` · giờ hẹn <strong>${esc(now.expectedTime)}</strong>` : ""
    }</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Số khách</td><td style="padding:2px 0">${n(now.guestCount)}</td></tr>
    ${dichVu ? `<tr><td style="padding:2px 12px 2px 0;color:#475569">Dịch vụ kèm</td><td style="padding:2px 0">${esc(dichVu)}</td></tr>` : ""}
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Tổng tiền</td><td style="padding:2px 0"><strong>${esc(vnd(n(now.totalAmount)))}</strong></td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Đã thanh toán</td><td style="padding:2px 0">${esc(vnd(n(now.deposit)))}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Còn lại</td><td style="padding:2px 0">${
      conLai > 0 ? `<strong style="color:#b91c1c">${esc(vnd(conLai))}</strong>` : "đã thanh toán đủ"
    }</td></tr>
  </table>

  <p style="margin:0 0 16px;color:#475569">Nếu có chỗ nào chưa đúng, xin liên hệ ngay <strong>${esc(info.hotline)}</strong>.</p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">

  <p style="margin:0 0 12px">Dear <strong>${esc(info.guestName || "guest")}</strong>,</p>
  <p style="margin:0 0 8px">${
    huy
      ? `Your flight at <strong>${esc(info.spotName)}</strong> has been cancelled.`
      : `Your booking at <strong>${esc(info.spotName)}</strong> has just been updated.`
  }</p>
  <ul style="margin:0 0 14px;padding-left:20px">${li(changes.map((c) => c.en))}</ul>
  <p style="margin:0 0 4px;font-size:14px;color:#475569">Date <strong>${esc(ngay)}</strong>${
    now.expectedTime ? ` · meeting at <strong>${esc(now.expectedTime)}</strong>` : ""
  } · Guests <strong>${n(now.guestCount)}</strong></p>
  <p style="margin:0 0 14px;font-size:14px;color:#475569">Total <strong>${esc(usdish(n(now.totalAmount)))}</strong> · Paid ${esc(
    usdish(n(now.deposit)),
  )} · ${conLai > 0 ? `Balance due <strong style="color:#b91c1c">${esc(usdish(conLai))}</strong>` : "fully paid"}</p>
  <p style="margin:0 0 16px;color:#475569">If anything looks wrong, please contact us at <strong>${esc(info.hotline)}</strong>.</p>
  <p style="margin:0;color:#94a3b8;font-size:12px">mebayluon.com</p>
</div>`;

  return { subject, html, text };
}

/**
 * THƯ XÁC NHẬN ĐẶT CHỖ — gửi khi booking KHÔNG có thay đổi nào đang chờ báo.
 *
 * Nút "✉ Gửi email" đứng cạnh nút Lưu ở form booking: booking vừa nhập xong
 * thì chưa có gì "thay đổi" để kể, nhưng khách vẫn cần một bản xác nhận cầm
 * tay (nhất là khách đặt qua điện thoại — họ chưa nhận được gì bằng chữ).
 * Cùng bảng hiện trạng với thư báo thay đổi, chỉ khác lời mở đầu và tiêu đề.
 */
export function buildBookingConfirmMail(info: BookingMailInfo, now: BookingSnapshot): BuiltMail {
  const ngay = dmy(now.flightDate);
  const subject = `Xác nhận đặt chỗ ${ngay}${info.bookingCode ? ` · ${info.bookingCode}` : ""} / Booking confirmation`;

  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  const vnd = (x: number) => `${Math.round(x).toLocaleString("vi-VN")} đ`;
  const usdish = (x: number) => `${Math.round(x).toLocaleString("en-US")} VND`;
  const conLai = n(now.remaining);
  const dichVu = (["flycam", "video360", "redFlag", "sunset", "flagFlight", "mountainCar"] as const)
    .filter((k) => n((now as Record<string, unknown>)[k]) > 0)
    .map((k) => `${SERVICE_LABEL[k].vi} × ${n((now as Record<string, unknown>)[k])}`)
    .join(", ");

  const text = ([
    `Kính gửi ${info.guestName || "quý khách"},`,
    ``,
    `Đặt chỗ bay dù lượn của quý khách tại ${info.spotName} đã được ghi nhận:`,
    ``,
    `Ngày bay: ${ngay}${now.expectedTime ? ` · giờ hẹn ${now.expectedTime}` : ""}`,
    `Số khách: ${n(now.guestCount)}`,
    dichVu ? `Dịch vụ kèm: ${dichVu}` : null,
    `Tổng tiền: ${vnd(n(now.totalAmount))}`,
    `Đã thanh toán: ${vnd(n(now.deposit))}`,
    conLai > 0 ? `Còn lại phải trả: ${vnd(conLai)}` : `Đã thanh toán đủ.`,
    ``,
    `Nếu có chỗ nào chưa đúng, xin liên hệ ngay ${info.hotline}.`,
    ``,
    `— — — — —`,
    ``,
    `Dear ${info.guestName || "guest"},`,
    ``,
    `Your paragliding booking at ${info.spotName} is confirmed:`,
    ``,
    `Date: ${ngay}${now.expectedTime ? ` · meeting at ${now.expectedTime}` : ""}`,
    `Guests: ${n(now.guestCount)}`,
    `Total: ${usdish(n(now.totalAmount))}`,
    `Paid: ${usdish(n(now.deposit))}`,
    conLai > 0 ? `Balance due: ${usdish(conLai)}` : `Fully paid.`,
    ``,
    `If anything looks wrong, please contact us at ${info.hotline}.`,
    ``,
    `mebayluon.com`,
  ] as Array<string | null>)
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
  <p style="margin:0 0 12px">Kính gửi <strong>${esc(info.guestName || "quý khách")}</strong>,</p>
  <p style="margin:0 0 12px">Đặt chỗ bay dù lượn của quý khách tại <strong>${esc(info.spotName)}</strong> đã được ghi nhận.</p>
  <table style="border-collapse:collapse;font-size:14px;margin:0 0 14px">
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Ngày bay</td><td style="padding:2px 0"><strong>${esc(ngay)}</strong>${
      now.expectedTime ? ` · giờ hẹn <strong>${esc(now.expectedTime)}</strong>` : ""
    }</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Số khách</td><td style="padding:2px 0">${n(now.guestCount)}</td></tr>
    ${dichVu ? `<tr><td style="padding:2px 12px 2px 0;color:#475569">Dịch vụ kèm</td><td style="padding:2px 0">${esc(dichVu)}</td></tr>` : ""}
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Tổng tiền</td><td style="padding:2px 0"><strong>${esc(vnd(n(now.totalAmount)))}</strong></td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Đã thanh toán</td><td style="padding:2px 0">${esc(vnd(n(now.deposit)))}</td></tr>
    <tr><td style="padding:2px 12px 2px 0;color:#475569">Còn lại</td><td style="padding:2px 0">${
      conLai > 0 ? `<strong style="color:#b91c1c">${esc(vnd(conLai))}</strong>` : "đã thanh toán đủ"
    }</td></tr>
  </table>
  <p style="margin:0 0 16px;color:#475569">Nếu có chỗ nào chưa đúng, xin liên hệ ngay <strong>${esc(info.hotline)}</strong>.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
  <p style="margin:0 0 12px">Dear <strong>${esc(info.guestName || "guest")}</strong>,</p>
  <p style="margin:0 0 8px">Your paragliding booking at <strong>${esc(info.spotName)}</strong> is confirmed.</p>
  <p style="margin:0 0 4px;font-size:14px;color:#475569">Date <strong>${esc(ngay)}</strong>${
    now.expectedTime ? ` · meeting at <strong>${esc(now.expectedTime)}</strong>` : ""
  } · Guests <strong>${n(now.guestCount)}</strong></p>
  <p style="margin:0 0 14px;font-size:14px;color:#475569">Total <strong>${esc(usdish(n(now.totalAmount)))}</strong> · Paid ${esc(
    usdish(n(now.deposit)),
  )} · ${conLai > 0 ? `Balance due <strong style="color:#b91c1c">${esc(usdish(conLai))}</strong>` : "fully paid"}</p>
  <p style="margin:0 0 16px;color:#475569">If anything looks wrong, please contact us at <strong>${esc(info.hotline)}</strong>.</p>
  <p style="margin:0;color:#94a3b8;font-size:12px">mebayluon.com</p>
</div>`;

  return { subject, html, text };
}

/** Chèn chữ của khách vào HTML thì phải rào — tên khách có thể chứa &, <, >. */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
