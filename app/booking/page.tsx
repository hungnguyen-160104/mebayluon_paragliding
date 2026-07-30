import type { Metadata } from "next";

import { buildMetadata } from "@/lib/metadata-builder";
import { getUrlLocale } from "@/lib/locale";

/**
 * Vỏ server cho trang đặt bay.
 *
 * Trang gốc là client component nên không khai báo được metadata —
 * hậu quả là /booking dùng chung title + canonical với trang chủ và
 * tự loại mình khỏi Google. Tách vỏ server để trang sinh tiền này
 * có danh tính SEO riêng.
 */
type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

/** Tiêu đề + mô tả hiện trên kết quả Google, dịch theo ngôn ngữ của URL. */
const META: Record<Lang, { title: string; description: string }> = {
  vi: {
    title: "Đặt Tour Bay Dù Lượn — Giữ Chỗ Online | Mebayluon",
    description:
      "Đặt tour bay dù lượn online tại Mù Cang Chải, Sapa, Hà Nội, Đà Lạt và khắp Việt Nam. Chọn điểm bay, chọn gói, xác nhận trong 2 phút. Phi công chuyên nghiệp, bảo hiểm đầy đủ.",
  },
  en: {
    title: "Book a Paragliding Flight in Vietnam — Online | Mebayluon",
    description:
      "Book your paragliding flight online in Mu Cang Chai, Sapa, Hanoi, Da Nang and across Vietnam. Pick a site, pick a package, confirm in 2 minutes. Certified pilots, full insurance.",
  },
  fr: {
    title: "Réserver un vol en parapente au Vietnam — En ligne | Mebayluon",
    description:
      "Réservez votre vol en parapente en ligne à Mu Cang Chai, Sapa, Hanoï, Da Nang et partout au Vietnam. Choisissez un site et une formule, confirmez en 2 minutes. Pilotes certifiés, assurance incluse.",
  },
  ru: {
    title: "Забронировать полёт на параплане во Вьетнаме | Mebayluon",
    description:
      "Онлайн-бронирование полётов на параплане в Мукангчай, Сапе, Ханое, Дананге и по всему Вьетнаму. Выберите место и пакет, подтвердите за 2 минуты. Сертифицированные пилоты, полная страховка.",
  },
  zh: {
    title: "越南滑翔伞飞行预订 — 在线预订 | Mebayluon",
    description:
      "在线预订木江界、沙坝、河内、岘港及越南各地的滑翔伞飞行。选择飞行点与套餐，2 分钟完成确认。专业持证飞行员，保险齐全。",
  },
  hi: {
    title: "वियतनाम में पैराग्लाइडिंग उड़ान बुक करें — ऑनलाइन | Mebayluon",
    description:
      "मु कांग चाई, सापा, हनोई, दा नांग और पूरे वियतनाम में ऑनलाइन पैराग्लाइडिंग उड़ान बुक करें। स्थल और पैकेज चुनें, 2 मिनट में पुष्टि करें। प्रमाणित पायलट, पूर्ण बीमा।",
  },
};

function toLang(v: string | undefined | null): Lang {
  const code = String(v ?? "vi").slice(0, 2).toLowerCase() as Lang;
  return (["vi", "en", "fr", "ru", "zh", "hi"] as const).includes(code)
    ? code
    : "vi";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUrlLocale();
  const m = META[toLang(locale)];

  return buildMetadata({
    title: m.title,
    description: m.description,
    keywords: [
      "đặt tour bay dù lượn",
      "đặt bay dù lượn online",
      "giá bay dù lượn",
      "booking paragliding vietnam",
      "đặt chỗ dù lượn",
    ],
    url: "/booking",
    type: "website",
    locale,
  });
}

export { default } from "./BookingClient";
