// lib/contact-channels.ts
/**
 * Các kênh nhắn tin trực tiếp: điện thoại, Zalo, WhatsApp, Messenger.
 *
 * Trước đây mỗi trang tự viết lấy đường dẫn, và số WhatsApp trôi thành hai
 * kiểu: `phone=84964073555` (đúng) ở footer/trang chủ/trang liên hệ, nhưng
 * `phone=840964073555` (thừa số 0) ở nút nổi và màn hình đặt bay thành công.
 * WhatsApp hiểu số theo chuẩn quốc tế — mã nước rồi bỏ số 0 đứng đầu — nên
 * bản thừa số 0 mở ra màn hình "số không hợp lệ". Gom về một chỗ để không
 * lệch lại được.
 */

/** Số hiển thị cho người đọc. */
export const CONTACT_PHONE_DISPLAY = "0964 073 555";

/** Số bấm gọi. */
export const CONTACT_PHONE_TEL = "+84964073555";

/**
 * Số theo chuẩn quốc tế, không dấu cộng, không số 0 đứng đầu.
 * WhatsApp và Zalo đều nhận dạng này.
 */
const PHONE_INTL = "84964073555";

export const CONTACT_ZALO = "https://zalo.me/0964073555";
export const CONTACT_WHATSAPP = `https://api.whatsapp.com/send/?phone=${PHONE_INTL}`;

/**
 * Messenger của trang Clubhouse — hỏi phòng thì nhắn thẳng trang homestay
 * chứ không nhắn trang công ty dù lượn, để đúng người trực trả lời.
 */
export const CONTACT_MESSENGER_CLUBHOUSE = "https://m.me/mebayluonclubhouse";

/** Messenger của trang công ty, dùng cho mọi việc liên quan tới bay. */
export const CONTACT_MESSENGER = "https://m.me/mebayluon";

export type ContactChannel = {
  key: "zalo" | "whatsapp" | "messenger" | "phone";
  label: string;
  url: string;
  /** Màu nền nút, theo nhận diện của từng ứng dụng. */
  className: string;
};

/**
 * Bộ kênh dùng cho nút "Liên hệ đặt phòng" ở trang /homestay.
 *
 * Khách bấm cái nào thì mở thẳng ứng dụng tương ứng: trên điện thoại là mở
 * app, trên máy tính là mở bản web. Không cần hỏi thêm bước nào.
 */
export function bookingContactChannels(labels: {
  zalo: string;
  whatsapp: string;
  messenger: string;
  phone: string;
}): ContactChannel[] {
  return [
    {
      key: "zalo",
      label: labels.zalo,
      url: CONTACT_ZALO,
      className: "bg-[#0068FF] text-white hover:bg-[#2b83ff]",
    },
    {
      key: "whatsapp",
      label: labels.whatsapp,
      url: CONTACT_WHATSAPP,
      className: "bg-[#25D366] text-[#04310f] hover:bg-[#4ade80]",
    },
    {
      key: "messenger",
      label: labels.messenger,
      url: CONTACT_MESSENGER_CLUBHOUSE,
      className: "bg-[#A033FF] text-white hover:bg-[#b45cff]",
    },
    {
      key: "phone",
      label: labels.phone,
      url: `tel:${CONTACT_PHONE_TEL}`,
      className: "bg-white text-[#0B2239] hover:bg-slate-100",
    },
  ];
}
