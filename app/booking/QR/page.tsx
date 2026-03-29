"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";

export default function BookingQRPage() {
  const { language } = useLanguage();

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    const header = document.querySelector("header") as HTMLElement | null;
    const prevHeaderDisplay = header?.style.display ?? "";

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    if (header) {
      header.style.display = "none";
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;

      if (header) {
        header.style.display = prevHeaderDisplay;
      }
    };
  }, []);

  const content =
    {
      vi: {
        title: "Cảm ơn bạn đã lựa chọn đặt bay cùng Mebayluon Paragliding",
        subtitle:
          "Chúng tôi có lịch bay hằng ngày tại các điểm bay: Hà Nội, Sapa, Mù Cang Chải",
        cta: "Tiếp tục đặt chỗ",
        infoPrefix: "Xem thông tin về các điểm bay, các gói bay và dịch vụ",
        here: "Tại đây",
        support: "Hoặc chat với nhân viên tư vấn để được hỗ trợ trực tiếp (24/7)",
      },
      en: {
        title: "Thank you for choosing to fly with Mebayluon Paragliding",
        subtitle:
          "We have daily flights at these flying sites: Hanoi, Sapa, Mu Cang Chai",
        cta: "Continue Booking",
        infoPrefix:
          "View information about flying sites, flight packages and services",
        here: "Here",
        support: "Or chat with our staff for direct support (24/7)",
      },
      fr: {
        title: "Merci d’avoir choisi Mebayluon Paragliding",
        subtitle: "Nous avons des vols quotidiens à Hanoï, Sapa, Mu Cang Chai",
        cta: "Continuer la réservation",
        infoPrefix:
          "Voir les informations sur les sites de vol, les offres et les services",
        here: "Ici",
        support:
          "Ou discutez avec notre équipe pour une assistance directe (24/7)",
      },
      ru: {
        title: "Спасибо, что выбрали Mebayluon Paragliding",
        subtitle: "Ежедневные полеты доступны в Ханое, Сапе, Му Канг Чай",
        cta: "Продолжить бронирование",
        infoPrefix: "Посмотреть информацию о местах полетов, пакетах и услугах",
        here: "Здесь",
        support:
          "Или свяжитесь с нашим консультантом для прямой поддержки (24/7)",
      },
      zh: {
        title: "感谢您选择 Mebayluon Paragliding",
        subtitle: "我们每天在这些地点安排飞行：河内、沙坝、木江界",
        cta: "继续预订",
        infoPrefix: "查看飞行地点、套餐和服务信息",
        here: "这里",
        support: "或联系工作人员获取直接支持（24/7）",
      },
      hi: {
        title: "Mebayluon Paragliding चुनने के लिए धन्यवाद",
        subtitle:
          "हम रोज़ाना इन स्थानों पर उड़ान भरते हैं: हनोई, सापा, म्यू कांग चाई",
        cta: "बुकिंग जारी रखें",
        infoPrefix: "फ्लाइंग स्पॉट, पैकेज और सेवाओं की जानकारी देखें",
        here: "यहाँ",
        support: "या सीधे सहायता के लिए हमारे स्टाफ से चैट करें (24/7)",
      },
    }[language] ?? {
      title: "Cảm ơn bạn đã lựa chọn đặt bay cùng Mebayluon Paragliding",
      subtitle:
        "Chúng tôi có lịch bay hằng ngày tại các điểm bay: Hà Nội, Sapa, Mù Cang Chải",
      cta: "Tiếp tục đặt chỗ",
      infoPrefix: "Xem thông tin về các điểm bay, các gói bay và dịch vụ",
      here: "Tại đây",
      support: "Hoặc chat với nhân viên tư vấn để được hỗ trợ trực tiếp (24/7)",
    };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#071A33] via-[#0B4B73] to-[#08213D]">
      <section className="mx-auto flex min-h-screen w-full max-w-[1320px] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative w-full max-w-[980px] rounded-[30px] border border-white/15 bg-white/95 shadow-[0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur">
          <div className="px-6 py-6 text-center sm:px-10 sm:py-8 md:px-14 md:py-10">
            <h1 className="mx-auto max-w-[780px] text-[24px] font-extrabold uppercase leading-[1.08] text-slate-900 sm:text-[34px] md:text-[42px]">
              {content.title}
            </h1>

            <p className="mx-auto mt-3 max-w-[760px] text-[14px] font-medium italic leading-relaxed text-sky-800 sm:text-[17px]">
              {content.subtitle}
            </p>

            <div className="mt-5">
              <Link
                href="/booking"
                className="inline-flex min-h-[52px] items-center justify-center rounded-[16px] bg-red-600 px-8 text-[16px] font-extrabold uppercase text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)] transition hover:bg-red-700"
              >
                {content.cta}
              </Link>
            </div>

            <div className="mx-auto mt-5 max-w-[800px] rounded-[18px] border border-sky-100 bg-sky-50/70 px-4 py-4">
              <p className="text-[15px] leading-relaxed text-slate-800 sm:text-[17px]">
                {content.infoPrefix}
              </p>

              <div className="mt-3">
                <Link
                  href="/"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-sky-700 px-6 text-[14px] font-bold uppercase text-white shadow-sm transition hover:bg-sky-800"
                >
                  {content.here}
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-5 max-w-[760px]">
              <p className="text-[14px] text-slate-600 sm:text-[15px]">
                {content.support}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://zalo.me/0964073555"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-sky-200 bg-white px-5 text-[14px] font-bold uppercase text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  Zalo
                </a>

                <a
                  href="https://api.whatsapp.com/send/?phone=84964073555"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-sky-200 bg-white px-5 text-[14px] font-bold uppercase text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  WhatsApp
                </a>

                <a
                  href="https://www.facebook.com/mebayluon"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-sky-200 bg-white px-5 text-[14px] font-bold uppercase text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}