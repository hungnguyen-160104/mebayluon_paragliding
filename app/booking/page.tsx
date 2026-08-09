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
    title: "Đặt Bay Dù Lượn Online: Giữ Chỗ & Huỷ Miễn Phí | Mebayluon",
    description:
      "Đặt bay dù lượn online tại Hà Nội, Mù Cang Chải, Sapa và các điểm bay trên khắp Việt Nam. Chọn điểm bay, chọn gói, xác nhận trong 2 phút. Phi công chuyên nghiệp, bảo hiểm đầy đủ, dịch vụ tận tình.",
  },
  en: {
    title: "Book Paragliding Online in Vietnam: Free Cancellation | Mebayluon",
    description:
      "Book your paragliding flight online in Hanoi, Mu Cang Chai, Sapa and flying sites across Vietnam. Pick a site, pick a package, confirm in 2 minutes. Certified pilots, full insurance, attentive service.",
  },
  fr: {
    title: "Réserver un vol en parapente : annulation gratuite | Mebayluon",
    description:
      "Réservez votre vol en parapente en ligne à Hanoï, Mu Cang Chai, Sapa et sur les sites de vol partout au Vietnam. Choisissez un site et une formule, confirmez en 2 minutes. Pilotes certifiés, assurance complète, service attentionné.",
  },
  ru: {
    title: "Онлайн-бронь полёта на параплане: отмена бесплатно | Mebayluon",
    description:
      "Онлайн-бронирование полётов на параплане в Ханое, Мукангчае, Сапе и на площадках по всему Вьетнаму. Выберите место и пакет, подтвердите за 2 минуты. Сертифицированные пилоты, полная страховка, внимательный сервис.",
  },
  zh: {
    title: "越南滑翔伞飞行预订 — 在线预订 | Mebayluon",
    description:
      "在线预订河内、木江界、沙坝及越南各地飞行点的滑翔伞飞行。选择飞行点与套餐，2 分钟完成确认。专业持证飞行员，保险齐全，服务贴心。",
  },
  hi: {
    title: "वियतनाम में पैराग्लाइडिंग उड़ान बुक करें — ऑनलाइन | Mebayluon",
    description:
      "हनोई, मु कांग चाई, सापा और पूरे वियतनाम के उड़ान स्थलों पर ऑनलाइन पैराग्लाइडिंग उड़ान बुक करें। स्थल और पैकेज चुनें, 2 मिनट में पुष्टि करें। प्रमाणित पायलट, पूर्ण बीमा, चौकस सेवा।",
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
