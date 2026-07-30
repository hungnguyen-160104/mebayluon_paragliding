"use client";

// /components/footer/Footer.tsx
import Link from "next/link";
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
 * Link điểm bay ở footer.
 *
 * Lưu ý: slug bài viết luôn là chữ thường (hệ thống không cho tạo slug
 * viết hoa), nên href phải khớp đúng slug thật trong DB. Hai điểm chưa
 * có bài viết riêng thì trỏ về trang điểm bay /spots/... tương ứng.
 */
export const FOOTER_SPOTS = [
  {
    name: "Viên Nam (Hà Nội)",
    href: "/blog/du-luon-vien-nam",
  },
  {
    name: "Đồi Bù (Hà Nội)",
    href: "/blog/diem-bay-du-luon-doi-bu",
  },
  {
    name: "Đèo Khau Phạ (Mù Cang Chải)",
    href: "/blog/deokhaupha",
  },
  {
    name: "Phình Hồ (Trạm Tấu)",
    href: "/spots/tram-tau",
  },
  {
    name: "Sapa (Lào Cai)",
    href: "/blog/bay-du-luon-sa-pa-muong-hoa",
  },
  {
    name: "Đồng Văn (Hà Giang)",
    href: "/spots/ha-giang",
  },
];

type FooterDict = {
  slogan: string;
  quickLinks: string;
  pilots: string;
  bookTour: string;
  preNotice: string;
  contact: string;
  followUs: string;
  spotsInfo: string;
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
    contact: "Liên hệ",
    followUs: "Theo dõi chúng tôi",
    spotsInfo: "Thông tin điểm bay",
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
    contact: "Contact",
    followUs: "Follow Us",
    spotsInfo: "Flying Spots Info",
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
    contact: "Contact",
    followUs: "Suivez-nous",
    spotsInfo: "Infos sites de vol",
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
    contact: "Контакты",
    followUs: "Подписывайтесь",
    spotsInfo: "О местах полётов",
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
    contact: "联系方式",
    followUs: "关注我们",
    spotsInfo: "飞行点信息",
    license: "飞行运营已获越南国防部总参谋部作战局许可。",
    rightsReserved: "保留所有权利。",
  },
  hi: {
    slogan: "वियतनाम में सर्वश्रेष्ठ पैराग्लाइडिंग का अनुभव करें",
    quickLinks: "त्वरित लिंक",
    pilots: "पायलट",
    bookTour: "बुकिंग",
    preNotice: "पूर्व सूचना",
    contact: "संपर्क",
    followUs: "हमें फ़ॉलो करें",
    spotsInfo: "उड़ान स्थल जानकारी",
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
        href: "https://www.youtube.com/@dangvm",
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
              lg:grid-cols-[minmax(340px,1.45fr)_minmax(150px,0.6fr)_minmax(210px,0.85fr)_minmax(280px,0.85fr)]
              xl:grid-cols-[minmax(390px,1.5fr)_minmax(160px,0.6fr)_minmax(230px,0.85fr)_minmax(300px,0.85fr)]
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
            <div className="min-w-0">
              <h3 className="mb-3 text-lg font-semibold text-white">
                {t.quickLinks}
              </h3>

              <ul className="space-y-2">
                <li>
                  <Link
                    href={makeLocalizedHref("/pilots", pathname)}
                    className="text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.pilots}
                  </Link>
                </li>

                <li>
                  <Link
                    href={makeLocalizedHref("/booking", pathname)}
                    className="text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.bookTour}
                  </Link>
                </li>

                <li>
                  <Link
                    href={makeLocalizedHref("/pre-notice", pathname)}
                    className="text-[15px] text-slate-300 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    {t.preNotice}
                  </Link>
                </li>
              </ul>
            </div>

            {/* THÔNG TIN ĐIỂM BAY */}
            <div className="min-w-0">
              <h3 className="mb-3 text-lg font-semibold text-white">
                {t.spotsInfo}
              </h3>

              <ul className="space-y-2 text-[14px] text-slate-300">
                {FOOTER_SPOTS.map((spot) => (
                  <li key={spot.href} className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0" />

                    <Link
                      href={spot.href}
                      className="transition-colors hover:text-white hover:underline underline-offset-4"
                    >
                      {spot.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* SOCIAL */}
            <div className="min-w-0">
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
                  </a>
                ))}
              </div>
            </div>
          </div>

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