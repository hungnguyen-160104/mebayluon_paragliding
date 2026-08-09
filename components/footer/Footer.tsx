"use client";

// /components/footer/Footer.tsx
import Link from "next/link";
import {
  PARAGLIDING_PARTNERS,
  HOMESTAY_PARTNERS,
  BRAND_BUTTON_CLASS,
} from "@/lib/partner-links";
import {
  TOUR_PARTNER_LINKS,
  COURSE_PARTNER_LINKS,
} from "@/lib/spot-partner-links";
import { Dancing_Script } from "next/font/google";
import { usePathname } from "next/navigation";

/**
 * Font viết tay cho slogan — tự host qua next/font (không gọi CDN ngoài),
 * có subset tiếng Việt nên đủ dấu.
 */
const dancingScript = Dancing_Script({
  weight: ["600"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});
import {
  Facebook,
  Youtube,
  Phone,
  Mail,
  MapPin,
  Lock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage, type Language } from "@/contexts/language-context";

/**
 * Link điểm bay ở footer — trỏ thẳng vào trang điểm bay chuẩn.
 *
 * Trước đây phần lớn trỏ sang bài blog tương ứng. Bài blog thì đã được index
 * từ lâu, còn chính các trang /spots/... lại nằm trong nhóm "đã phát hiện
 * nhưng chưa lập chỉ mục" của Search Console — tức Google biết URL mà chưa
 * thấy đủ tín hiệu để bò vào. Footer có mặt ở mọi trang nên đây là chỗ rẻ
 * nhất để cấp tín hiệu đó. Slug phải khớp lib/spots-slugs.ts.
 */
export const FOOTER_SPOTS = [
  {
    name: "Đèo Khau Phạ (Mù Cang Chải)",
    href: "/spots/khau-pha",
  },
  {
    name: "Đồi Bù | Viên Nam (Hà Nội)",
    href: "/spots/doi-bu",
  },
  {
    name: "Mường Hoa (Sapa)",
    href: "/spots/muong-hoa-sapa",
  },
  {
    name: "Sơn Trà (Đà Nẵng)",
    href: "/spots/son-tra",
  },
  {
    name: "Phình Hồ (Trạm Tấu)",
    href: "/spots/tram-tau",
  },
  {
    name: "Đồng Văn (Hà Giang)",
    href: "/spots/ha-giang",
  },
  {
    name: "Đà Lạt (Lâm Đồng)",
    href: "/spots/dalat",
  },
];

/**
 * Các nhóm link đối tác ở dải ngang cuối footer.
 *
 * Nhóm "tour dù lượn" gồm hồ sơ doanh nghiệp (Tripadvisor, Seek Sophie) cộng
 * với trang bán tour của từng điểm bay — lấy tự động từ lib/spot-partner-links
 * nên thêm link cho một điểm bay là footer có luôn.
 */
const PARTNER_GROUPS = [
  {
    labelKey: "partnersFlights" as const,
    links: [...PARAGLIDING_PARTNERS, ...TOUR_PARTNER_LINKS],
  },
  { labelKey: "partnersCourses" as const, links: COURSE_PARTNER_LINKS },
  { labelKey: "partnersStay" as const, links: HOMESTAY_PARTNERS },
];

type FooterDict = {
  slogan: string;
  quickLinks: string;
  pilots: string;
  bookTour: string;
  preNotice: string;
  /** Nhãn các link nội bộ bổ sung ở cột "Liên kết nhanh". */
  spots: string;
  store: string;
  knowledge: string;
  blog: string;
  contact: string;
  followUs: string;
  /** Link tới trang đăng ký bay dành cho phi công (sự kiện Mùa Vàng). */
  pilotEvent: string;
  bookOnPartners: string;
  /** Nhãn nhóm link đối tác bán tour dù lượn. */
  partnersFlights: string;
  /** Nhãn nhóm link bán khoá học bay. */
  partnersCourses: string;
  /** Nhãn nhóm link đặt phòng Clubhouse. */
  partnersStay: string;
  spotsInfo: string;
  /** Nhãn link trang Điều khoản & Điều kiện ở dòng bản quyền. */
  terms: string;
  license: string;
  rightsReserved: string;
};

const DICT: Record<Language, FooterDict> = {
  vi: {
    slogan: "Trải nghiệm bay tự do khắp Việt Nam",
    quickLinks: "Liên kết nhanh",
    pilots: "Phi công",
    bookTour: "Đặt tour",
    preNotice: "Lưu ý trước khi bay",
    spots: "Điểm bay",
    store: "Cửa hàng",
    knowledge: "Kiến thức dù lượn",
    blog: "Tin tức & Blog",
    contact: "Liên hệ",
    followUs: "Theo dõi chúng tôi",
    pilotEvent: "Đăng ký sự kiện dành cho phi công",
    bookOnPartners: "Đặt qua đối tác",
    partnersFlights: "Tour dù lượn",
    partnersCourses: "Học bay dù lượn",
    partnersStay: "Đặt phòng Clubhouse",
    spotsInfo: "Thông tin điểm bay",
    terms: "Điều khoản & Điều kiện",
    license:
      "Đơn vị được cấp phép bay bởi Cục Tác chiến – Bộ Tổng Tham Mưu, Bộ Quốc Phòng Việt Nam.",
    rightsReserved: "Đã đăng ký bản quyền.",
  },
  en: {
    slogan: "Experience the best paragliding in Vietnam",
    quickLinks: "Quick Links",
    pilots: "Pilots",
    bookTour: "Book Tour",
    preNotice: "Pre-Notice",
    spots: "Flying spots",
    store: "Store",
    knowledge: "Paragliding knowledge",
    blog: "News & Blog",
    contact: "Contact",
    followUs: "Follow Us",
    pilotEvent: "Pilot event registration",
    bookOnPartners: "Book via partners",
    partnersFlights: "Paragliding tours",
    partnersCourses: "Paragliding courses",
    partnersStay: "Clubhouse stays",
    spotsInfo: "Flying Spots Info",
    terms: "Terms & Conditions",
    license:
      "Flight operations are licensed by the Combat Operations Department – General Staff, Ministry of National Defense of Vietnam.",
    rightsReserved: "All rights reserved.",
  },
  fr: {
    slogan: "Découvrez la meilleure expérience de parapente au Vietnam",
    quickLinks: "Liens rapides",
    pilots: "Pilotes",
    bookTour: "Réserver",
    preNotice: "Préavis",
    spots: "Sites de vol",
    store: "Boutique",
    knowledge: "Savoir parapente",
    blog: "Actualités & Blog",
    contact: "Contact",
    followUs: "Suivez-nous",
    pilotEvent: "Inscription pilotes à l'événement",
    bookOnPartners: "Réserver via nos partenaires",
    partnersFlights: "Vols en parapente",
    partnersCourses: "Stages de parapente",
    partnersStay: "Séjours au Clubhouse",
    spotsInfo: "Infos sites de vol",
    terms: "Conditions générales",
    license:
      "Les opérations de vol sont autorisées par le Département des opérations de combat – État-major général, Ministère de la Défense nationale du Vietnam.",
    rightsReserved: "Tous droits réservés.",
  },
  ru: {
    slogan: "Лучший парапланеризм во Вьетнаме",
    quickLinks: "Быстрые ссылки",
    pilots: "Пилоты",
    bookTour: "Забронировать",
    preNotice: "Предуведомление",
    spots: "Места полётов",
    store: "Магазин",
    knowledge: "О парапланеризме",
    blog: "Новости и блог",
    contact: "Контакты",
    followUs: "Подписывайтесь",
    pilotEvent: "Регистрация пилотов на фестиваль",
    bookOnPartners: "Бронирование у партнёров",
    partnersFlights: "Полёты на параплане",
    partnersCourses: "Курсы парапланеризма",
    partnersStay: "Проживание в Clubhouse",
    spotsInfo: "О местах полётов",
    terms: "Условия обслуживания",
    license:
      "Полёты лицензированы Управлением боевых операций Генерального штаба Министерства национальной обороны Вьетнама.",
    rightsReserved: "Все права защищены.",
  },
  zh: {
    slogan: "体验越南最佳滑翔伞飞行",
    quickLinks: "快速链接",
    pilots: "飞行员",
    bookTour: "预订",
    preNotice: "预先通知",
    spots: "飞行点",
    store: "商店",
    knowledge: "滑翔伞知识",
    blog: "新闻与博客",
    contact: "联系方式",
    followUs: "关注我们",
    pilotEvent: "飞行员活动报名",
    bookOnPartners: "通过合作平台预订",
    partnersFlights: "滑翔伞行程",
    partnersCourses: "滑翔伞课程",
    partnersStay: "Clubhouse 住宿",
    spotsInfo: "飞行点信息",
    terms: "服务条款",
    license: "飞行运营已获越南国防部总参谋部作战局许可。",
    rightsReserved: "保留所有权利。",
  },
  hi: {
    slogan: "वियतनाम में सर्वश्रेष्ठ पैराग्लाइडिंग का अनुभव करें",
    quickLinks: "त्वरित लिंक",
    pilots: "पायलट",
    bookTour: "बुकिंग",
    preNotice: "पूर्व सूचना",
    spots: "उड़ान स्थल",
    store: "स्टोर",
    knowledge: "पैराग्लाइडिंग ज्ञान",
    blog: "समाचार और ब्लॉग",
    contact: "संपर्क",
    followUs: "हमें फ़ॉलो करें",
    pilotEvent: "पायलट इवेंट पंजीकरण",
    bookOnPartners: "पार्टनर के ज़रिए बुक करें",
    partnersFlights: "पैराग्लाइडिंग टूर",
    partnersCourses: "पैराग्लाइडिंग कोर्स",
    partnersStay: "Clubhouse ठहरने",
    spotsInfo: "उड़ान स्थल जानकारी",
    terms: "नियम और शर्तें",
    license:
      "उड़ान संचालन को वियतनाम के राष्ट्रीय रक्षा मंत्रालय के जनरल स्टाफ के कॉम्बैट ऑपरेशंस विभाग द्वारा लाइसेंस प्राप्त है।",
    rightsReserved: "सर्वाधिकार सुरक्षित।",
  },
};

function TikTokIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.35V2h-3.2v13.02a2.89 2.89 0 1 1-2.88-2.89c.23 0 .45.03.66.08V8.96a6.09 6.09 0 1 0 6.62 6.06V8.41a8.02 8.02 0 0 0 4.57 1.42V6.69Z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.52 3.48A11.82 11.82 0 0 0 12.09 0C5.5 0 .14 5.36.14 11.95c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.64a11.9 11.9 0 0 0 5.84 1.49h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.18-3.53-8.42ZM12.1 21.83h-.01a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.71.97.99-3.62-.24-.37a9.84 9.84 0 0 1-1.53-5.28c0-5.45 4.43-9.88 9.89-9.88 2.64 0 5.11 1.02 6.97 2.89a9.8 9.8 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.88 9.88Zm5.42-7.41c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.20-.3.30-.5.10-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.53.08-.81.38-.28.3-1.07 1.05-1.07 2.56 0 1.5 1.1 2.96 1.25 3.16.15.2 2.15 3.29 5.21 4.61.73.31 1.3.5 1.75.64.73.23 1.39.2 1.91.12.58-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.17-1.44-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function ZaloIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <div
      className={`${className} inline-flex items-center justify-center rounded-md border border-current text-[10px] font-bold leading-none`}
      aria-hidden="true"
    >
      Z
    </div>
  );
}

function getLocaleFromPathname(pathname?: string | null): Language | null {
  const firstSegment =
    (pathname || "")
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .filter(Boolean)[0] || "";

  const value = firstSegment.toLowerCase();

  if (value === "vn" || value.startsWith("vi")) return "vi";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("zh") || value.startsWith("cn")) return "zh";
  if (value.startsWith("hi")) return "hi";

  return null;
}

function makeLocalizedHref(path: string, pathname?: string | null) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const pathLocale = getLocaleFromPathname(pathname);

  if (!pathLocale) return cleanPath;

  return `/${pathLocale}${cleanPath}`;
}

export default function Footer() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const [showAdmin, setShowAdmin] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const t = DICT[language];

  const socialLinks = useMemo(
    () => [
      {
        href: "https://www.facebook.com/mebayluon",
        label: "Facebook",
        icon: <Facebook size={18} />,
      },
      {
        href: "https://www.youtube.com/@mebayluon",
        label: "YouTube",
        icon: <Youtube size={18} />,
      },
      {
        href: "https://www.tiktok.com/@mebayluon_paragliding",
        label: "TikTok",
        icon: <TikTokIcon className="h-[18px] w-[18px]" />,
      },
      {
        href: "https://api.whatsapp.com/send/?phone=84964073555",
        label: "WhatsApp",
        icon: <WhatsAppIcon className="h-[18px] w-[18px]" />,
      },
      {
        href: "https://zalo.me/0964073555",
        label: "Zalo",
        icon: <ZaloIcon className="h-[18px] w-[18px]" />,
      },
    ],
    []
  );

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = null;
  };

  const scheduleHide = (ms = 500) => {
    clearHideTimer();

    hideTimerRef.current = window.setTimeout(() => {
      setShowAdmin(false);
    }, ms);
  };

  const startHold = () => {
    holdTimerRef.current = window.setTimeout(() => {
      setShowAdmin(true);
    }, 700);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = null;
  };

  useEffect(() => {
    if (!showAdmin) return;

    const timer = window.setTimeout(() => {
      setShowAdmin(false);
    }, 10_000);

    return () => window.clearTimeout(timer);
  }, [showAdmin]);

  return (
    <div className="w-full px-3 pb-4 md:px-4">
      <footer
        className="
          mx-auto w-full max-w-[95rem] rounded-[32px]
          border border-white/20 bg-slate-800/50 backdrop-blur-xl
        "
      >
        <div className="relative px-5 py-5 md:px-8 lg:px-10 xl:px-12">
          <div
            className="
              grid grid-cols-1 gap-5
              lg:grid-cols-[minmax(340px,1.4fr)_minmax(170px,0.65fr)_minmax(250px,0.95fr)_minmax(250px,0.75fr)]
              xl:grid-cols-[minmax(390px,1.45fr)_minmax(180px,0.65fr)_minmax(268px,0.95fr)_minmax(265px,0.75fr)]
              xl:gap-6
            "
          >
            {/* BRAND */}
            <div className="min-w-0 space-y-2">
              <h2 className="whitespace-nowrap text-xl font-bold leading-tight bg-linear-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent sm:text-2xl">
                Mebayluon Paragliding
              </h2>

              <p
                className={`${dancingScript.className} text-lg leading-6 text-[#0194F3] sm:text-xl`}
              >
                {t.slogan}
              </p>

              <p className="max-w-[30rem] text-[14px] leading-6 text-slate-300">
                {t.license}
              </p>

              {/* LIÊN HỆ — ghép vào cột thương hiệu */}
              <h3 className="pt-1 text-lg font-semibold text-white">
                {t.contact}
              </h3>

              <ul className="space-y-2 text-[14px] text-slate-300">
                <li className="flex items-center gap-3">
                  <Phone size={18} className="shrink-0" />

                  <span className="flex flex-wrap items-center gap-x-1.5">
                    <a
                      href="tel:+84964073555"
                      className="transition-colors hover:text-white"
                    >
                      +84 964 073 555
                    </a>
                    <span aria-hidden className="text-slate-500">|</span>
                    <a
                      href="tel:+84385907789"
                      className="transition-colors hover:text-white"
                    >
                      +84 385 907 789
                    </a>
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0" />

                  <a
                    href="mailto:mebayluon@gmail.com"
                    className="break-all transition-colors hover:text-white sm:break-normal"
                  >
                    mebayluon@gmail.com
                  </a>
                </li>
              </ul>
            </div>

            {/* QUICK LINKS */}
            <div className="min-w-0 lg:pl-6">
              <h3 className="mb-3 text-lg font-semibold text-white">
                {t.quickLinks}
              </h3>

              <ul className="space-y-2">
                <li>
                  <Link
                    href={makeLocalizedHref("/pilots", pathname)}
                    className="whitespace-nowrap text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.pilots}
                  </Link>
                </li>

                <li>
                  <Link
                    href={makeLocalizedHref("/booking", pathname)}
                    className="whitespace-nowrap text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.bookTour}
                  </Link>
                </li>

                <li>
                  <Link
                    href={makeLocalizedHref("/pre-notice", pathname)}
                    className="whitespace-nowrap text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.preNotice}
                  </Link>
                </li>

                {/* /spots và /store là hai trang danh mục quan trọng nhưng
                    trước đây chỉ được link từ thanh menu; menu lại nằm trong
                    phần tử cuộn ngang trên di động nên tín hiệu yếu. */}
                {[
                  { href: "/spots", label: t.spots },
                  { href: "/store", label: t.store },
                  { href: "/knowledge", label: t.knowledge },
                  { href: "/blog", label: t.blog },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={makeLocalizedHref(item.href, pathname)}
                      className="whitespace-nowrap text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* THÔNG TIN ĐIỂM BAY */}
            <div className="min-w-0 lg:pl-10">
              <h3 className="mb-3 text-lg font-semibold text-white">
                {t.spotsInfo}
              </h3>

              <ul className="space-y-2 text-[14px] text-slate-300">
                {FOOTER_SPOTS.map((spot) => (
                  <li key={spot.href} className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0" />

                    <Link
                      href={makeLocalizedHref(spot.href, pathname)}
                      className="whitespace-nowrap transition-colors hover:text-white hover:underline underline-offset-4"
                    >
                      {spot.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* SOCIAL */}
            <div className="min-w-0 lg:pl-10">
              <h3 className="mb-3 text-lg font-semibold text-white">
                {t.followUs}
              </h3>

              <div className="flex flex-wrap gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="
                      flex h-10 w-10 items-center justify-center
                      rounded-xl border border-white/15 bg-white/5
                      text-slate-300 transition-all
                      hover:-translate-y-0.5 hover:border-white/30 hover:text-white
                    "
                  >
                    {item.icon}
                    {/* Link chỉ có icon thì công cụ SEO lấy nguyên URL làm
                        anchor. Thêm nhãn ẩn để anchor là tên nền tảng. */}
                    <span className="sr-only">
                      {t.followUs} — {item.label}
                    </span>
                  </a>
                ))}
              </div>

              {/* Trang nghiệp vụ cho phi công, không phải cho khách du lịch —
                  để ở footer cho anh em tìm được mà không cần gửi link tay. */}
              <Link
                href={makeLocalizedHref("/muavang", pathname)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-[14px] font-semibold text-amber-300 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20 hover:text-amber-200"
              >
                🪂 {t.pilotEvent}
              </Link>
            </div>
          </div>

          {/* Trang đặt tour / đặt phòng trên nền tảng đối tác. Danh sách lấy từ
              lib/partner-links.ts — cùng nguồn với sameAs trong JSON-LD nên hai
              nơi không bao giờ lệch nhau.

              Khối này trước nằm trong cột "Theo dõi chúng tôi" (rộng ~265px)
              nên 7 nút màu phải xuống 4 hàng và kéo footer dài ra. Giờ tách
              thành một dải ngang chiếm hết bề rộng, chia hai nhóm rõ ràng: tour
              dù lượn và đặt phòng Clubhouse. */}
          {PARTNER_GROUPS.some((g) => g.links.length > 0) && (
            <div className="mt-5 border-t border-white/15 pt-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-8">
                <h3 className="shrink-0 text-lg font-semibold text-white lg:pt-1">
                  {t.bookOnPartners}
                </h3>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
                  {PARTNER_GROUPS.map(({ labelKey, links }) =>
                    links.length === 0 ? null : (
                      <div key={labelKey} className="min-w-0">
                        <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-400">
                          {t[labelKey]}
                        </p>

                        <ul className="flex flex-wrap gap-2">
                          {links.map((p) => (
                            <li key={p.url}>
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`
                                  inline-flex items-center rounded-lg px-2.5 py-1
                                  text-[12px] font-semibold shadow-md ring-1 ring-black/10
                                  transition-all hover:-translate-y-0.5 hover:shadow-lg
                                  ${BRAND_BUTTON_CLASS[p.brand]}
                                `}
                              >
                                {p.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* COPYRIGHT */}
          <div className="mt-4 border-t border-white/15 pt-3 text-center text-[13px] text-slate-400">
            <p className="inline-flex flex-wrap items-center justify-center gap-2 select-none">
              <span
                className="inline-flex flex-wrap items-center justify-center gap-2"
                onMouseEnter={() => {
                  clearHideTimer();
                  setShowAdmin(true);
                }}
                onMouseLeave={() => scheduleHide(400)}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                title="(Admin) Hold"
              >
                <span>&copy; {new Date().getFullYear()}</span>

                <span className="font-medium text-slate-200">
                  Mebayluon Paragliding
                </span>

                <span>{t.rightsReserved}</span>
              </span>

              {/* ẨN link Điều khoản & Điều kiện theo yêu cầu. Trang /terms và
                  ô đồng ý ở bước 4 của luồng đặt bay VẪN hoạt động bình
                  thường — chỉ ẩn lối vào từ footer. Bỏ comment khối dưới là
                  hiện lại.
              <span aria-hidden className="text-slate-600">|</span>
              <Link
                href={makeLocalizedHref("/terms", pathname)}
                className="font-medium text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
              >
                {t.terms}
              </Link>
              */}
            </p>
          </div>

          {/* ADMIN BUTTON */}
          {showAdmin && (
            <div
              className="fixed bottom-4 left-4 z-[9999]"
              onMouseEnter={() => clearHideTimer()}
              onMouseLeave={() => scheduleHide(400)}
            >
              <Link
                href={makeLocalizedHref("/admin/login", pathname)}
                rel="nofollow"
                className="
                  inline-flex items-center gap-2 rounded-full
                  border border-white/20 bg-black/60 px-3 py-2
                  text-white/90 shadow-lg backdrop-blur-md transition-colors hover:text-white
                "
                aria-label="Admin login"
              >
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Admin</span>
              </Link>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}