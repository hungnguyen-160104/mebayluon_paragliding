// lib/templates.ts

type Addons = { pickup?: boolean; flycam?: boolean; camera360?: boolean };
type Contact = { phone?: string; email?: string; pickupLocation?: string; specialRequest?: string };
type Guest = {
  fullName?: string;
  dob?: string;
  gender?: string;
  idNumber?: string;
  weightKg?: number;
  nationality?: string;
};
type AddonsPriceMap = { pickup?: number; flycam?: number; camera360?: number };
type AddonsQtyMap = { pickup?: number; flycam?: number; camera360?: number };
type ServiceMap = Record<
  string,
  {
    selected?: boolean;
    qty?: number;
    inputText?: string;
  }
>;
type SelectedServiceLine = {
  key?: string;
  label?: string;
  detail?: string;
  amountText?: string;
  lineTotal?: number;
};
type Price = {
  currency?: string;
  perPerson?: number;
  basePerPerson?: number;
  discountPerPerson?: number;
  addonsUnitPrice?: AddonsPriceMap;
  addonsQty?: AddonsQtyMap;
  addonsTotal?: AddonsPriceMap;
  servicesBreakdown?: SelectedServiceLine[];
  servicesTotal?: number;
  total?: number;
};

import {
  customerEmailHtml,
  customerEmailSubject,
} from "@/lib/email/customer-booking";
import {
  adminEmailHtml,
  adminEmailSubject,
} from "@/lib/email/admin-booking";


export type TelegramBookingPayload = {
  location?: string;
  locationName?: string;
  guestsCount?: number;
  dateISO?: string;
  timeSlot?: string;
  contact?: Contact;
  guests?: Guest[];
  addons?: Addons;
  price?: Price;
  createdAt?: string;
  bookingId?: string;
  serviceName?: string;
  services?: ServiceMap;
  selectedServices?: SelectedServiceLine[];
};








// ===== ADMIN: luôn tiếng Việt, đủ mọi chi tiết của vé, trình bày tối giản =====








/**
 * Nội dung email báo đơn mới cho đội bay.
 *
 * Khác email khách ở ba điểm: luôn tiếng Việt dù khách đặt bằng ngôn ngữ nào,
 * có đủ mọi trường của vé (kể cả loại ngày, ngôn ngữ khách dùng, giờ đặt), và
 * trình bày dạng text thuần cho dễ đọc nhanh trên điện thoại — người trong
 * nhà không cần email đẹp, cần đọc được trong 5 giây.
 */



/**
 * Email cho khách: chuyển sang lib/email/customer-booking.ts — bản mới dịch
 * theo ngôn ngữ khách đặt, lấy danh sách "đã bao gồm" từ đúng điểm bay và có
 * thêm điểm hẹn / yêu cầu đặc biệt.
 */
export function formatCustomerEmailHtml(payload: TelegramBookingPayload) {
  return customerEmailHtml(payload as any);
}

export function formatCustomerEmailSubject(payload: TelegramBookingPayload) {
  return customerEmailSubject(payload as any);
}

/**
 * Email nội bộ: chuyển sang lib/email/admin-booking.ts — bố cục theo đúng
 * email nội bộ của paraglidingsapa.com để đội vận hành quen một kiểu đọc.
 */
export function formatAdminEmailHtml(payload: TelegramBookingPayload) {
  return adminEmailHtml(payload as any);
}

export function formatAdminEmailSubject(payload: TelegramBookingPayload) {
  return adminEmailSubject(payload as any);
}